import { otherPlayer, placeStone, pointKey } from "./board";
import type { GameState, Player, Point, Stone } from "./types";

export interface AiMoveOptions {
  player?: Player;
  focus?: Point;
  primaryLimit?: number;
  replyLimit?: number;
}

interface CandidateSeed {
  point: Point;
  score: number;
}

interface RankedMove extends CandidateSeed {
  state: GameState;
  tacticalScore: number;
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

const evaluateState = (state: GameState, player: Player): number => {
  const opponent = otherPlayer(player);
  const scoreDifference = state.score[player] - state.score[opponent];
  return scoreDifference * 100_000 + structureScore(state, player);
};

const rankedMoves = (
  state: GameState,
  player: Player,
  focus: Point | undefined,
  limit: number
): RankedMove[] => {
  if (state.currentPlayer !== player || limit <= 0) return [];
  const before = evaluateState(state, player);
  const ranked: RankedMove[] = [];

  for (const seed of generateSeeds(state, player, focus)) {
    const next = placeStone(state, seed.point);
    if (next === state) continue;
    const tacticalScore = evaluateState(next, player) - before + seed.score * 4;
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

const defaultBudgets = (stoneCount: number): { primary: number; replies: number } => {
  if (stoneCount < 80) return { primary: 12, replies: 6 };
  if (stoneCount < 250) return { primary: 9, replies: 4 };
  return { primary: 6, replies: 3 };
};

export const chooseAiMove = (state: GameState, options: AiMoveOptions = {}): Point | undefined => {
  const player = options.player ?? state.currentPlayer;
  if (state.currentPlayer !== player) return undefined;

  const budgets = defaultBudgets(state.stones.size);
  const primaryLimit = options.primaryLimit ?? budgets.primary;
  const replyLimit = options.replyLimit ?? budgets.replies;
  const candidates = rankedMoves(state, player, options.focus, primaryLimit);
  if (candidates.length === 0) return undefined;

  const opponent = otherPlayer(player);
  let best: { point: Point; value: number; tacticalScore: number } | undefined;

  for (const candidate of candidates) {
    const replies = rankedMoves(candidate.state, opponent, candidate.point, replyLimit);
    let worstReply = evaluateState(candidate.state, player);
    if (replies.length > 0) {
      worstReply = Math.min(...replies.map((reply) => evaluateState(reply.state, player)));
    }

    const value = worstReply + candidate.tacticalScore * 0.04 + candidate.score * 0.1;
    if (
      !best ||
      value > best.value ||
      (value === best.value && candidate.tacticalScore > best.tacticalScore) ||
      (value === best.value && candidate.tacticalScore === best.tacticalScore &&
        (candidate.point.y < best.point.y ||
          (candidate.point.y === best.point.y && candidate.point.x < best.point.x)))
    ) {
      best = { point: candidate.point, value, tacticalScore: candidate.tacticalScore };
    }
  }

  return best ? { ...best.point } : undefined;
};
