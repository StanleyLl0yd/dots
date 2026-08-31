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
}

interface RankedMove extends CandidateSeed {
  state: GameState;
  tacticalScore: number;
}

interface SearchContext {
  evaluationCache: Map<string, number>;
  searchCache: Map<string, number>;
  signatureCache: WeakMap<GameState, string>;
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

const neighborCounts = (
  state: GameState,
  inactive: Set<string>,
  point: Point,
  player: Player
): { own: number; opponent: number } => {
  let own = 0;
  let opponent = 0;
  for (const offset of OFFSETS) {
    const stone = activeStoneAt(state, inactive, { x: point.x + offset.x, y: point.y + offset.y });
    if (!stone) continue;
    if (stone.player === player) own += 1;
    else opponent += 1;
  }
  return { own, opponent };
};

const focusDistance = (point: Point, focus?: Point): number =>
  focus ? Math.max(Math.abs(point.x - focus.x), Math.abs(point.y - focus.y)) : 0;

const seedScore = (
  state: GameState,
  inactive: Set<string>,
  point: Point,
  player: Player,
  focus?: Point
): number => {
  const { own, opponent } = neighborCounts(state, inactive, point, player);
  const distancePenalty = Math.min(16, focusDistance(point, focus)) * 0.55;
  return (
    own * 18 +
    opponent * 13 +
    (own >= 2 ? 44 : 0) +
    (opponent >= 2 ? 38 : 0) +
    (own >= 3 ? 18 : 0) +
    (opponent >= 3 ? 18 : 0) -
    distancePenalty
  );
};

const generateSeeds = (state: GameState, player: Player, focus?: Point): CandidateSeed[] => {
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
    .map((point) => ({ point, score: seedScore(state, inactive, point, player, focus) }))
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

const stateSignature = (state: GameState, context: SearchContext): string => {
  const cached = context.signatureCache.get(state);
  if (cached) return cached;

  const stones = [...state.stones.values()]
    .map((stone) => `${stone.x},${stone.y},${stone.player === "red" ? "r" : "b"}`)
    .sort()
    .join(";");
  const inactive = [...inactiveStoneKeys(state)].sort().join(";");
  const signature = `${state.currentPlayer}|${state.score.red},${state.score.blue}|${stones}|${inactive}`;
  context.signatureCache.set(state, signature);
  return signature;
};

const evaluateState = (state: GameState, player: Player, context: SearchContext): number => {
  const key = `${player}|${stateSignature(state, context)}`;
  const cached = context.evaluationCache.get(key);
  if (cached !== undefined) return cached;

  const opponent = otherPlayer(player);
  const scoreDifference = state.score[player] - state.score[opponent];
  const value = scoreDifference * 100_000 + structureScore(state, player);
  context.evaluationCache.set(key, value);
  return value;
};

const rankedMoves = (
  state: GameState,
  player: Player,
  focus: Point | undefined,
  limit: number,
  context: SearchContext
): RankedMove[] => {
  if (state.currentPlayer !== player || limit <= 0) return [];
  const before = evaluateState(state, player, context);
  const ranked: RankedMove[] = [];

  for (const seed of generateSeeds(state, player, focus)) {
    const next = placeStone(state, seed.point);
    if (next === state) continue;
    const tacticalScore = evaluateState(next, player, context) - before + seed.score * 4;
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

const tier = (stoneCount: number): 0 | 1 | 2 => (stoneCount < 80 ? 0 : stoneCount < 250 ? 1 : 2);

const PROFILE_LIMITS: Record<AiDifficulty, readonly [number[], number[], number[], number[]]> = {
  easy: [[4, 4, 3], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
  normal: [[7, 6, 5], [3, 3, 2], [0, 0, 0], [0, 0, 0]],
  hard: [[9, 8, 6], [4, 3, 2], [2, 2, 1], [0, 0, 0]],
  expert: [[10, 9, 7], [5, 4, 3], [3, 2, 2], [2, 1, 1]]
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

const minimaxValue = (
  state: GameState,
  perspective: Player,
  focus: Point | undefined,
  limits: readonly number[],
  ply: number,
  context: SearchContext
): number => {
  if (ply >= limits.length || limits[ply] <= 0) return evaluateState(state, perspective, context);

  const cacheKey = `${perspective}|${ply}|${limits.slice(ply).join(",")}|${stateSignature(state, context)}`;
  const cached = context.searchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const player = state.currentPlayer;
  const moves = rankedMoves(state, player, focus, limits[ply], context);
  if (moves.length === 0) {
    const value = evaluateState(state, perspective, context);
    context.searchCache.set(cacheKey, value);
    return value;
  }

  const values = moves.map((move) => minimaxValue(move.state, perspective, move.point, limits, ply + 1, context));
  const value = player === perspective ? Math.max(...values) : Math.min(...values);
  context.searchCache.set(cacheKey, value);
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
    evaluationCache: new Map(),
    searchCache: new Map(),
    signatureCache: new WeakMap()
  };
  const candidates = rankedMoves(state, player, options.focus, limits[0], context);
  if (candidates.length === 0) return undefined;

  let best: { point: Point; value: number; tacticalScore: number } | undefined;

  for (const candidate of candidates) {
    const searchedValue = minimaxValue(candidate.state, player, candidate.point, limits, 1, context);
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
