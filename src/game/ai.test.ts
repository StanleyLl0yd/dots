import { describe, expect, it } from "vitest";
import { chooseAiMove, getAiSearchProfile, type AiDifficulty } from "./ai";
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
  it("defines four increasingly deep search profiles", () => {
    const difficulties: AiDifficulty[] = ["easy", "normal", "hard", "expert"];
    const profiles = difficulties.map((difficulty) => getAiSearchProfile(difficulty, 20));

    expect(profiles[0]).toEqual({ primaryLimit: 4, replyLimit: 0, continuationLimit: 0, finalReplyLimit: 0 });
    expect(profiles[1].replyLimit).toBeGreaterThan(0);
    expect(profiles[2].continuationLimit).toBeGreaterThan(0);
    expect(profiles[3].finalReplyLimit).toBeGreaterThan(0);
    expect(profiles[3].primaryLimit).toBeGreaterThan(profiles[0].primaryLimit);
  });

  it("reduces every expensive profile on large positions", () => {
    for (const difficulty of ["normal", "hard", "expert"] as const) {
      const small = getAiSearchProfile(difficulty, 20);
      const large = getAiSearchProfile(difficulty, 300);
      expect(large.primaryLimit).toBeLessThanOrEqual(small.primaryLimit);
      expect(large.replyLimit).toBeLessThanOrEqual(small.replyLimit);
      expect(large.continuationLimit).toBeLessThanOrEqual(small.continuationLimit);
      expect(large.finalReplyLimit).toBeLessThanOrEqual(small.finalReplyLimit);
    }
  });

  it("chooses deterministic legal moves at every difficulty without mutating the supplied state", () => {
    const state = stateWith("blue", [
      stone(0, 0, "red"),
      stone(4, 4, "blue"),
      stone(1, 0, "red")
    ]);

    for (const difficulty of ["easy", "normal", "hard", "expert"] as const) {
      const first = chooseAiMove(state, { player: "blue", focus: { x: 1, y: 0 }, difficulty });
      const second = chooseAiMove(state, { player: "blue", focus: { x: 1, y: 0 }, difficulty });
      expect(first).toEqual(second);
      expect(first).toBeDefined();
      expect(placeStone(state, first!)).not.toBe(state);
    }

    expect(state.stones.size).toBe(3);
  });

  it("takes an immediate capture at every difficulty", () => {
    const state = stateWith("blue", [
      stone(0, -1, "blue"),
      stone(1, 0, "blue"),
      stone(0, 1, "blue"),
      stone(0, 0, "red")
    ]);

    for (const difficulty of ["easy", "normal", "hard", "expert"] as const) {
      const move = chooseAiMove(state, { player: "blue", focus: { x: 0, y: 0 }, difficulty });
      expect(move).toEqual({ x: -1, y: 0 });
      expect(placeStone(state, move!).score).toEqual({ red: 0, blue: 1 });
    }
  });

  it("blocks an opponent's immediate closing point from normal difficulty upward", () => {
    const state = stateWith("blue", [
      stone(0, -1, "red"),
      stone(1, 0, "red"),
      stone(0, 1, "red"),
      stone(0, 0, "blue")
    ]);

    for (const difficulty of ["normal", "hard", "expert"] as const) {
      expect(chooseAiMove(state, { player: "blue", focus: { x: 0, y: 1 }, difficulty })).toEqual({ x: -1, y: 0 });
    }
  });

  it("keeps expert search bounded on a large sparse position and still returns a legal move", () => {
    const stones: Stone[] = [];
    for (let index = 0; index < 300; index += 1) {
      stones.push(stone(index * 3, (index % 7) * 3, index % 2 === 0 ? "red" : "blue"));
    }
    const state = stateWith("blue", stones);

    const move = chooseAiMove(state, { player: "blue", focus: stones.at(-1), difficulty: "expert" });

    expect(move).toBeDefined();
    expect(placeStone(state, move!)).not.toBe(state);
  });

  it("does not choose a move for a player who is not to move", () => {
    const state = stateWith("red", [stone(0, 0, "red")]);
    expect(chooseAiMove(state, { player: "blue", difficulty: "expert" })).toBeUndefined();
  });
});
