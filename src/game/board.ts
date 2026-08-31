import { findNewCaptures, pointInsideAnyCapture, scoreCaptures } from "./capture";
import type { GameState, Player, Point, Stone } from "./types";

export const pointKey = ({ x, y }: Point): string => `${x}:${y}`;

export const createGameState = (): GameState => ({
  currentPlayer: "red",
  stones: new Map<string, Stone>(),
  captures: [],
  score: { red: 0, blue: 0 }
});

export const otherPlayer = (player: Player): Player => (player === "red" ? "blue" : "red");

export const placeStone = (state: GameState, point: Point): GameState => {
  const key = pointKey(point);
  if (state.stones.has(key) || pointInsideAnyCapture(point, state.captures)) return state;

  const player = state.currentPlayer;
  const stones = new Map(state.stones);
  stones.set(key, { ...point, player });

  const captures = [...state.captures, ...findNewCaptures(stones, state.captures, player, point)];

  return {
    ...state,
    stones,
    captures,
    score: scoreCaptures(captures),
    currentPlayer: otherPlayer(player)
  };
};
