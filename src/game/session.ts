import { createGameState, placeStone, pointKey } from "./board";
import { scoreCaptures } from "./capture";
import type { Capture, GameState, Player, Point } from "./types";

export interface HistoryEntry {
  placed: Point;
  previousCaptures: Capture[];
  previousPlayer: Player;
}

export interface GameSession {
  state: GameState;
  history: HistoryEntry[];
}

export const createSession = (state: GameState = createGameState()): GameSession => ({ state, history: [] });

export const playMove = (session: GameSession, point: Point): GameSession => {
  const nextState = placeStone(session.state, point);
  if (nextState === session.state) return session;

  return {
    state: nextState,
    history: [
      ...session.history,
      {
        placed: { ...point },
        previousCaptures: session.state.captures,
        previousPlayer: session.state.currentPlayer
      }
    ]
  };
};

export const undoMove = (session: GameSession): GameSession => {
  const previous = session.history.at(-1);
  if (!previous) return session;

  const stones = new Map(session.state.stones);
  stones.delete(pointKey(previous.placed));

  return {
    state: {
      currentPlayer: previous.previousPlayer,
      stones,
      captures: previous.previousCaptures,
      score: scoreCaptures(previous.previousCaptures)
    },
    history: session.history.slice(0, -1)
  };
};

export const resetSession = (): GameSession => createSession();
