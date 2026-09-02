import * as backend from "#game-core-backend";
import type { Capture, GameState, Player, Point, Stone } from "./types";

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

interface WireGameState {
  currentPlayer: Player;
  stones: Stone[];
  captures: Capture[];
  score: Record<Player, number>;
}

interface WireApplyMoveResult {
  changed: boolean;
  state: WireGameState;
}

interface WireReplayMovesResult {
  valid: boolean;
  state?: WireGameState | null;
}

const pointKey = (point: Point): string => `${point.x}:${point.y}`;

const encodeState = (state: GameState): string =>
  JSON.stringify({
    currentPlayer: state.currentPlayer,
    stones: [...state.stones.values()],
    captures: state.captures,
    score: state.score
  } satisfies WireGameState);

const decodeState = (state: WireGameState): GameState => ({
  currentPlayer: state.currentPlayer,
  stones: new Map(state.stones.map((stone) => [pointKey(stone), stone])),
  captures: state.captures,
  score: state.score
});

export const isNativeGameCore = backend.backendKind === "native";

export const createCoreState = async (): Promise<GameState> =>
  decodeState(JSON.parse(await backend.coreCreate()) as WireGameState);

export const applyCoreMove = async (state: GameState, point: Point): Promise<GameState | undefined> => {
  const result = JSON.parse(await backend.coreMove(encodeState(state), point.x, point.y)) as WireApplyMoveResult;
  return result.changed ? decodeState(result.state) : undefined;
};

export const replayCoreMoves = async (moves: Point[]): Promise<GameState | undefined> => {
  const result = JSON.parse(await backend.coreReplay(JSON.stringify(moves))) as WireReplayMovesResult;
  return result.valid && result.state ? decodeState(result.state) : undefined;
};

export const requestAiMove = async (state: GameState, options: AiMoveOptions = {}): Promise<Point | undefined> => {
  const move = JSON.parse(await backend.coreAi(encodeState(state), JSON.stringify(options))) as Point | null;
  return move ?? undefined;
};
