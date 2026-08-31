import { otherPlayer, placeStone, pointKey } from "./board";
import type { GameState, Player, Point, Stone } from "./types";

export type AiDifficulty = "easy" | "normal" | "hard" | "expert";

export interface AiMoveOptions {
  player?: Player;
  focus?: Point;
  difficulty?: AiDifficulty;
  primaryLimit?: number;
  replyLimit?: number;
  continuationLimit?: number;
  finalReplyLimit?: number;
}

export interface AiSearchProfile {
  primaryLimit: number;
  replyLimit: number;
  continuationLimit: number;
  finalReplyLimit: number;
}

interface CandidateSeed {
  point: Point;
  score: number;
  ownCyclePairs: number;
  blockedCyclePairs: number;
}

interface RankedMove extends CandidateSeed {
  state: GameState;
  tacticalScore: number;
}

interface CaptureThreat {
  bestGain: number;
  moves: number;
  targets: Set<string>;
}

interface SearchContext {
  difficulty: AiDifficulty;
  evaluationCache: Map<string, number>;
  searchCache: Map<string, number>;
  signatureCache: WeakMap<GameState, string>;
  componentCache: WeakMap<GameState, Record<Player, Map<string, number>>>;
  closureCache: Map<string, number>;
  threatCache: Map<string, CaptureThreat>;
  setupCache: Map<string, number>;
}

const OFFSETS: Point[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 }
];

const LINK_OFFSETS: Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 }
];

const inactiveStoneKeys = (state: GameState): Set<string> =>
  new Set(state.captures.flatMap((capture) => capture.captured.map(pointKey)));

const activeStoneAt = (state: GameState, inactive: Set<string>, point: Point): Stone | undefined => {
  const stone = state.stones.get(pointKey(point));
  return stone && !inactive.has(pointKey(stone)) ? stone : undefined;
};

const buildComponents = (state: GameState, player: Player): Map<string, number> => {
  const inactive = inactiveStoneKeys(state);
  const active = new Map(
    [...state.stones.values()]
      .filter((stone) => stone.player === player && !inactive.has(pointKey(stone)))
      .map((stone) => [pointKey(stone), stone])
  );
  const components = new Map<string, number>();
  let nextComponent = 0;

  for (const stone of active.values()) {
    const start = pointKey(stone);
    if (components.has(start)) continue;
    const component = nextComponent++;
    const queue: Stone[] = [stone];
    components.set(start, component);

    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const offset of OFFSETS) {
        const neighbor = active.get(`${current.x + offset.x}:${current.y + offset.y}`);
        if (!neighbor) continue;
        const key = pointKey(neighbor);
        if (components.has(key)) continue;
        components.set(key, component);
        queue.push(neighbor);
      }
    }
  }

  return components;
};

const componentsFor = (state: GameState, player: Player, context: SearchContext): Map<string, number> => {
  let cached = context.componentCache.get(state);
  if (!cached) {
    cached = {
      red: buildComponents(state, "red"),
      blue: buildComponents(state, "blue")
    };
    context.componentCache.set(state, cached);
  }
  return cached[player];
};

const neighborCounts = (
  state: GameState,
  inactive: Set<string>,
  point: Point,
  player: Player
): { own: number; opponent: number; empty: number } => {
  let own = 0;
  let opponent = 0;
  let empty = 0;
  for (const offset of OFFSETS) {
    const target = { x: point.x + offset.x, y: point.y + offset.y };
    const stone = activeStoneAt(state, inactive, target);
    if (!stone) {
      if (!state.stones.has(pointKey(target))) empty += 1;
      continue;
    }
    if (stone.player === player) own += 1;
    else opponent += 1;
  }
  return { own, opponent, empty };
};

const cyclePairCount = (state: GameState, point: Point, player: Player, context: SearchContext): number => {
  if (state.stones.has(pointKey(point))) return 0;
  const inactive = inactiveStoneKeys(state);
  const components = componentsFor(state, player, context);
  const adjacentComponents: number[] = [];

  for (const offset of OFFSETS) {
    const neighbor = activeStoneAt(state, inactive, { x: point.x + offset.x, y: point.y + offset.y });
    if (!neighbor || neighbor.player !== player) continue;
    const component = components.get(pointKey(neighbor));
    if (component !== undefined) adjacentComponents.push(component);
  }

  let pairs = 0;
  for (let first = 0; first < adjacentComponents.length; first += 1) {
    for (let second = first + 1; second < adjacentComponents.length; second += 1) {
      if (adjacentComponents[first] === adjacentComponents[second]) pairs += 1;
    }
  }
  return pairs;
};

const focusDistance = (point: Point, focus?: Point): number =>
  focus ? Math.max(Math.abs(point.x - focus.x), Math.abs(point.y - focus.y)) : 0;

const seedScore = (
  state: GameState,
  inactive: Set<string>,
  point: Point,
  player: Player,
  focus: Point | undefined,
  context: SearchContext
): CandidateSeed => {
  const { own, opponent } = neighborCounts(state, inactive, point, player);
  const ownCyclePairs = cyclePairCount(state, point, player, context);
  const blockedCyclePairs = cyclePairCount(state, point, otherPlayer(player), context);
  const distancePenalty = Math.min(16, focusDistance(point, focus)) * 0.55;
  const score =
    own * 18 +
    opponent * 13 +
    (own >= 2 ? 44 : 0) +
    (opponent >= 2 ? 38 : 0) +
    (own >= 3 ? 18 : 0) +
    (opponent >= 3 ? 18 : 0) +
    Math.min(3, ownCyclePairs) * 52 +
    Math.min(3, blockedCyclePairs) * 46 -
    distancePenalty;
  return { point, score, ownCyclePairs, blockedCyclePairs };
};

const generateSeeds = (
  state: GameState,
  player: Player,
  focus: Point | undefined,
  context: SearchContext
): CandidateSeed[] => {
  const inactive = inactiveStoneKeys(state);
  const points = new Map<string, Point>();

  for (const stone of state.stones.values()) {
    if (inactive.has(pointKey(stone))) continue;
    for (const offset of OFFSETS) {
      const point = { x: stone.x + offset.x, y: stone.y + offset.y };
      if (!Number.isSafeInteger(point.x) || !Number.isSafeInteger(point.y)) continue;
      const key = pointKey(point);
      if (!state.stones.has(key)) points.set(key, point);
    }
  }

  if (points.size === 0) points.set("0:0", { x: 0, y: 0 });

  return [...points.values()]
    .map((point) => seedScore(state, inactive, point, player, focus, context))
    .sort(
      (a, b) =>
        b.score - a.score ||
        focusDistance(a.point, focus) - focusDistance(b.point, focus) ||
        a.point.y - b.point.y ||
        a.point.x - b.point.x
    );
};

const structureScore = (state: GameState, player: Player): number => {
  const inactive = inactiveStoneKeys(state);
  const opponent = otherPlayer(player);
  let ownLinks = 0;
  let opponentLinks = 0;
  let ownActive = 0;
  let opponentActive = 0;

  for (const stone of state.stones.values()) {
    if (inactive.has(pointKey(stone))) continue;
    if (stone.player === player) ownActive += 1;
    else opponentActive += 1;

    for (const offset of LINK_OFFSETS) {
      const neighbor = activeStoneAt(state, inactive, { x: stone.x + offset.x, y: stone.y + offset.y });
      if (!neighbor || neighbor.player !== stone.player) continue;
      if (stone.player === player) ownLinks += 1;
      else if (stone.player === opponent) opponentLinks += 1;
    }
  }

  return (ownLinks - opponentLinks) * 3 + (ownActive - opponentActive) * 0.2;
};

const dangerFor = (state: GameState, player: Player): number => {
  const inactive = inactiveStoneKeys(state);
  let total = 0;

  for (const stone of state.stones.values()) {
    if (stone.player !== player || inactive.has(pointKey(stone))) continue;
    const { own, opponent, empty } = neighborCounts(state, inactive, stone, player);
    total +=
      opponent * 7 +
      Math.max(0, 4 - empty) * 2.5 +
      (opponent >= 2 ? 13 : 0) +
      (opponent >= 3 ? 18 : 0) -
      own * 1.5;
  }

  return total;
};

const stateSignature = (state: GameState, context: SearchContext): string => {
  const cached = context.signatureCache.get(state);
  if (cached) return cached;

  const stones = [...state.stones.values()]
    .map((stone) => `${stone.x},${stone.y},${stone.player === "red" ? "r" : "b"}`)
    .sort()
    .join(";");
  const captures = state.captures
    .map((capture) => {
      const boundary = capture.boundary.map((point) => `${point.x},${point.y}`).join(";");
      const captured = capture.captured.map(pointKey).sort().join(";");
      return `${capture.owner}|${boundary}|${captured}`;
    })
    .sort()
    .join("/");
  const signature = `${state.currentPlayer}|${state.score.red},${state.score.blue}|${stones}|${captures}`;
  context.signatureCache.set(state, signature);
  return signature;
};

const closurePressure = (state: GameState, player: Player, context: SearchContext): number => {
  const key = `${player}|${stateSignature(state, context)}`;
  const cached = context.closureCache.get(key);
  if (cached !== undefined) return cached;

  let pressure = 0;
  for (const seed of generateSeeds(state, player, undefined, context).slice(0, 24)) {
    if (seed.ownCyclePairs <= 0) continue;
    pressure += Math.min(3, seed.ownCyclePairs) * 2 + 1;
  }
  const value = Math.min(30, pressure);
  context.closureCache.set(key, value);
  return value;
};

const evaluateState = (state: GameState, player: Player, context: SearchContext): number => {
  const key = `${context.difficulty}|${player}|${stateSignature(state, context)}`;
  const cached = context.evaluationCache.get(key);
  if (cached !== undefined) return cached;

  const opponent = otherPlayer(player);
  const scoreDifference = state.score[player] - state.score[opponent];
  let value = scoreDifference * 100_000 + structureScore(state, player);

  if (context.difficulty !== "easy") {
    value += (dangerFor(state, opponent) - dangerFor(state, player)) * 1.4;
  }
  if (context.difficulty === "hard" || context.difficulty === "expert") {
    value += (closurePressure(state, player, context) - closurePressure(state, opponent, context)) * 10;
  }
  if (context.difficulty === "expert") {
    value += (dangerFor(state, opponent) - dangerFor(state, player)) * 0.9;
  }

  context.evaluationCache.set(key, value);
  return value;
};

const forceTurn = (state: GameState, player: Player): GameState =>
  state.currentPlayer === player ? state : { ...state, currentPlayer: player };

const capturedBy = (state: GameState, owner: Player): Set<string> =>
  new Set(
    state.captures
      .filter((capture) => capture.owner === owner)
      .flatMap((capture) => capture.captured.map(pointKey))
  );

const immediateCaptureThreat = (
  state: GameState,
  attacker: Player,
  limit: number,
  context: SearchContext
): CaptureThreat => {
  if (limit <= 0) return { bestGain: 0, moves: 0, targets: new Set() };
  const key = `${attacker}|${limit}|${stateSignature(state, context)}`;
  const cached = context.threatCache.get(key);
  if (cached) return cached;

  const forced = forceTurn(state, attacker);
  const beforeCaptured = capturedBy(state, attacker);
  const threat: CaptureThreat = { bestGain: 0, moves: 0, targets: new Set() };
  let considered = 0;

  for (const seed of generateSeeds(forced, attacker, undefined, context)) {
    const next = placeStone(forced, seed.point);
    if (next === forced) continue;
    considered += 1;
    const opponent = otherPlayer(attacker);
    const gain =
      next.score[attacker] - state.score[attacker] +
      state.score[opponent] - next.score[opponent];
    if (gain > 0) {
      threat.moves += 1;
      threat.bestGain = Math.max(threat.bestGain, gain);
      for (const captured of capturedBy(next, attacker)) {
        if (!beforeCaptured.has(captured)) threat.targets.add(captured);
      }
    }
    if (considered >= limit) break;
  }

  context.threatCache.set(key, threat);
  return threat;
};

const setupPotential = (
  state: GameState,
  attacker: Player,
  setupLimit: number,
  closureLimit: number,
  context: SearchContext
): number => {
  if (setupLimit <= 0 || closureLimit <= 0) return 0;
  const key = `${attacker}|${setupLimit},${closureLimit}|${stateSignature(state, context)}`;
  const cached = context.setupCache.get(key);
  if (cached !== undefined) return cached;

  const forced = forceTurn(state, attacker);
  const beforePressure = closurePressure(state, attacker, context);
  let best = 0;
  let considered = 0;

  for (const seed of generateSeeds(forced, attacker, undefined, context)) {
    const next = placeStone(forced, seed.point);
    if (next === forced) continue;
    considered += 1;

    const immediateGain = next.score[attacker] - state.score[attacker];
    if (immediateGain <= 0) {
      const followUp = immediateCaptureThreat(next, attacker, closureLimit, context);
      const pressureGain = Math.max(0, closurePressure(next, attacker, context) - beforePressure);
      best = Math.max(
        best,
        followUp.bestGain * 700 +
          followUp.moves * 55 +
          pressureGain * 16 +
          seed.ownCyclePairs * 12
      );
    }
    if (considered >= setupLimit) break;
  }

  context.setupCache.set(key, best);
  return best;
};

const forecastBonus = (state: GameState, player: Player, context: SearchContext): number => {
  if (context.difficulty === "easy" || context.difficulty === "normal") return 0;
  const opponent = otherPlayer(player);
  const large = state.stones.size >= 250;
  const threatLimit = context.difficulty === "expert" ? (large ? 2 : 5) : large ? 2 : 4;
  const ownThreat = immediateCaptureThreat(state, player, threatLimit, context);
  const opponentThreat = immediateCaptureThreat(state, opponent, threatLimit, context);
  let value =
    ownThreat.bestGain * 2_200 +
    ownThreat.moves * 90 -
    opponentThreat.bestGain * 2_700 -
    opponentThreat.moves * 110 -
    opponentThreat.targets.size * 45;

  const setupLimit = large ? 0 : context.difficulty === "expert" ? 3 : 2;
  const closureLimit = large ? 0 : context.difficulty === "expert" ? 4 : 2;
  value += setupPotential(state, player, setupLimit, closureLimit, context) * 0.65;
  value -= setupPotential(state, opponent, setupLimit, closureLimit, context) * 0.72;
  return value;
};

const rankedMoves = (
  state: GameState,
  player: Player,
  focus: Point | undefined,
  limit: number,
  context: SearchContext,
  forecast: boolean
): RankedMove[] => {
  if (state.currentPlayer !== player || limit <= 0) return [];
  const before = evaluateState(state, player, context);
  const ranked: RankedMove[] = [];

  for (const seed of generateSeeds(state, player, focus, context)) {
    const next = placeStone(state, seed.point);
    if (next === state) continue;
    const strategic = forecast ? forecastBonus(next, player, context) : 0;
    const tacticalScore =
      evaluateState(next, player, context) -
      before +
      seed.score * 4 +
      strategic +
      seed.ownCyclePairs * 30 +
      seed.blockedCyclePairs * 34;
    ranked.push({ ...seed, state: next, tacticalScore });
    if (ranked.length >= limit) break;
  }

  return ranked.sort(
    (a, b) =>
      b.tacticalScore - a.tacticalScore ||
      b.score - a.score ||
      a.point.y - b.point.y ||
      a.point.x - b.point.x
  );
};

const tier = (stoneCount: number): 0 | 1 | 2 =>
  stoneCount < 80 ? 0 : stoneCount < 250 ? 1 : 2;

const PROFILE_LIMITS: Record<AiDifficulty, readonly [number[], number[], number[], number[]]> = {
  easy: [[4, 4, 3], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
  normal: [[7, 6, 5], [3, 3, 2], [0, 0, 0], [0, 0, 0]],
  hard: [[9, 8, 5], [4, 3, 2], [2, 2, 1], [0, 0, 0]],
  expert: [[10, 9, 5], [5, 4, 2], [3, 2, 1], [2, 1, 1]]
};

export const getAiSearchProfile = (difficulty: AiDifficulty, stoneCount: number): AiSearchProfile => {
  const index = tier(stoneCount);
  const profile = PROFILE_LIMITS[difficulty];
  return {
    primaryLimit: profile[0][index],
    replyLimit: profile[1][index],
    continuationLimit: profile[2][index],
    finalReplyLimit: profile[3][index]
  };
};

const forcingMoves = (
  state: GameState,
  focus: Point | undefined,
  limit: number,
  context: SearchContext
): RankedMove[] => {
  const player = state.currentPlayer;
  const opponent = otherPlayer(player);
  const beforeSwing = state.score[player] - state.score[opponent];
  return rankedMoves(state, player, focus, limit * 2, context, false)
    .filter((move) => move.state.score[player] - move.state.score[opponent] !== beforeSwing)
    .slice(0, limit);
};

const quiescenceValue = (
  state: GameState,
  perspective: Player,
  focus: Point | undefined,
  remaining: number,
  context: SearchContext,
  alpha: number,
  beta: number
): number => {
  if (remaining <= 0) return evaluateState(state, perspective, context);
  const limit = context.difficulty === "expert" ? 3 : 2;
  const moves = forcingMoves(state, focus, limit, context);
  if (moves.length === 0) return evaluateState(state, perspective, context);

  const maximizing = state.currentPlayer === perspective;
  let value = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const move of moves) {
    const child = quiescenceValue(
      move.state,
      perspective,
      move.point,
      remaining - 1,
      context,
      alpha,
      beta
    );
    if (maximizing) {
      value = Math.max(value, child);
      alpha = Math.max(alpha, value);
    } else {
      value = Math.min(value, child);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }

  return value;
};

const minimaxValue = (
  state: GameState,
  perspective: Player,
  focus: Point | undefined,
  limits: readonly number[],
  ply: number,
  extensions: number,
  context: SearchContext,
  alpha: number,
  beta: number
): number => {
  if (ply >= limits.length || limits[ply] <= 0) {
    return quiescenceValue(state, perspective, focus, extensions, context, alpha, beta);
  }

  const cacheKey = `${context.difficulty}|${perspective}|${ply}|${limits
    .slice(ply)
    .join(",")}|${stateSignature(state, context)}`;
  const cached = context.searchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const player = state.currentPlayer;
  const forecast = context.difficulty === "expert" && ply <= 1;
  const moves = rankedMoves(state, player, focus, limits[ply], context, forecast);
  if (moves.length === 0) return evaluateState(state, perspective, context);

  const maximizing = player === perspective;
  let value = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  let cutoff = false;

  for (const move of moves) {
    const child = minimaxValue(
      move.state,
      perspective,
      move.point,
      limits,
      ply + 1,
      extensions,
      context,
      alpha,
      beta
    );
    if (maximizing) {
      value = Math.max(value, child);
      alpha = Math.max(alpha, value);
    } else {
      value = Math.min(value, child);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) {
      cutoff = true;
      break;
    }
  }

  if (!cutoff) context.searchCache.set(cacheKey, value);
  return value;
};

export const chooseAiMove = (state: GameState, options: AiMoveOptions = {}): Point | undefined => {
  const player = options.player ?? state.currentPlayer;
  if (state.currentPlayer !== player) return undefined;

  const difficulty = options.difficulty ?? "normal";
  const profile = getAiSearchProfile(difficulty, state.stones.size);
  const limits = [
    options.primaryLimit ?? profile.primaryLimit,
    options.replyLimit ?? profile.replyLimit,
    options.continuationLimit ?? profile.continuationLimit,
    options.finalReplyLimit ?? profile.finalReplyLimit
  ];
  const context: SearchContext = {
    difficulty,
    evaluationCache: new Map(),
    searchCache: new Map(),
    signatureCache: new WeakMap(),
    componentCache: new WeakMap(),
    closureCache: new Map(),
    threatCache: new Map(),
    setupCache: new Map()
  };
  const candidates = rankedMoves(
    state,
    player,
    options.focus,
    limits[0],
    context,
    difficulty === "hard" || difficulty === "expert"
  );
  if (candidates.length === 0) return undefined;

  const extensions =
    state.stones.size >= 250
      ? difficulty === "expert"
        ? 1
        : 0
      : difficulty === "expert"
        ? 2
        : difficulty === "hard"
          ? 1
          : 0;
  let best: { point: Point; value: number; tacticalScore: number } | undefined;

  for (const candidate of candidates) {
    const searchedValue = minimaxValue(
      candidate.state,
      player,
      candidate.point,
      limits,
      1,
      extensions,
      context,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY
    );
    const value = searchedValue + candidate.tacticalScore * 0.04 + candidate.score * 0.1;
    if (
      !best ||
      value > best.value ||
      (value === best.value && candidate.tacticalScore > best.tacticalScore) ||
      (value === best.value &&
        candidate.tacticalScore === best.tacticalScore &&
        (candidate.point.y < best.point.y ||
          (candidate.point.y === best.point.y && candidate.point.x < best.point.x)))
    ) {
      best = { point: candidate.point, value, tacticalScore: candidate.tacticalScore };
    }
  }

  return best ? { ...best.point } : undefined;
};
