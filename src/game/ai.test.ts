import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { placeStone, pointKey } from "./board";
import type { GameState, Player, Stone } from "./types";

const stateWith = (currentPlayer: Player, stones: Stone[]): GameState => ({
  currentPlayer,
  stones: new Map(stones.map((stone) => [pointKey(stone), stone])),
  captures: [],
  score: { red: 0, blue: 0 }
});

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });

describe("computer opponent", () => {
  it("chooses a deterministic legal move without mutating the supplied state", () => {
    const state = stateWith("blue", [
      stone(0, 0, "red"),
      stone(4, 4, "blue"),
      stone(1, 0, "red")
    ]);

    const first = chooseAiMove(state, { player: "blue", focus: { x: 1, y: 0 } });
    const second = chooseAiMove(state, { player: "blue", focus: { x: 1, y: 0 } });

    expect(first).toEqual(second);
    expect(first).toBeDefined();
    expect(state.stones.size).toBe(3);

    const next = placeStone(state, first!);
    expect(next).not.toBe(state);
    expect(next.stones.get(pointKey(first!))?.player).toBe("blue");
  });

  it("takes an immediate capture when one move closes a valid neighboring-dot boundary", () => {
    const state = stateWith("blue", [
      stone(0, -1, "blue"),
      stone(1, 0, "blue"),
      stone(0, 1, "blue"),
      stone(0, 0, "red")
    ]);

    const move = chooseAiMove(state, { player: "blue", focus: { x: 0, y: 0 } });

    expect(move).toEqual({ x: -1, y: 0 });
    const next = placeStone(state, move!);
    expect(next.score).toEqual({ red: 0, blue: 1 });
  });

  it("blocks an opponent's immediate closing point when no stronger tactic exists", () => {
    const state = stateWith("blue", [
      stone(0, -1, "red"),
      stone(1, 0, "red"),
      stone(0, 1, "red"),
      stone(0, 0, "blue")
    ]);

    expect(chooseAiMove(state, { player: "blue", focus: { x: 0, y: 1 } })).toEqual({ x: -1, y: 0 });
  });

  it("keeps its search bounded on a large sparse position and still returns a legal move", () => {
    const stones: Stone[] = [];
    for (let index = 0; index < 300; index += 1) {
      stones.push(stone(index * 3, (index % 7) * 3, index % 2 === 0 ? "red" : "blue"));
    }
    const state = stateWith("blue", stones);

    const move = chooseAiMove(state, { player: "blue", focus: stones.at(-1) });

    expect(move).toBeDefined();
    expect(placeStone(state, move!)).not.toBe(state);
  });

  it("does not choose a move for a player who is not to move", () => {
    const state = stateWith("red", [stone(0, 0, "red")]);
    expect(chooseAiMove(state, { player: "blue" })).toBeUndefined();
  });
});
