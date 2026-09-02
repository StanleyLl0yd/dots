import { applyCoreMove, createCoreState, replayCoreMoves } from "./core";
import type { GameState, Point } from "./types";

export interface HistoryEntry {
  placed: Point;
}

export interface GameSession {
  state: GameState;
  history: HistoryEntry[];
}

export const createSession = async (): Promise<GameSession> => ({
  state: await createCoreState(),
  history: []
});

export const restoreSession = async (moves: Point[]): Promise<GameSession | undefined> => {
  const state = await replayCoreMoves(moves);
  if (!state) return undefined;
  return {
    state,
    history: moves.map((placed) => ({ placed: { ...placed } }))
  };
};

export const playMove = async (session: GameSession, point: Point): Promise<GameSession> => {
  const nextState = await applyCoreMove(session.state, point);
  if (!nextState) return session;
  return {
    state: nextState,
    history: [...session.history, { placed: { ...point } }]
  };
};

export const undoMove = async (session: GameSession): Promise<GameSession> => {
  if (session.history.length === 0) return session;
  const moves = session.history.slice(0, -1).map(({ placed }) => placed);
  return (await restoreSession(moves)) ?? session;
};

export const resetSession = (): Promise<GameSession> => createSession();
