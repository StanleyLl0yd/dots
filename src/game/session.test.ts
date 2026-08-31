import { describe, expect, it } from "vitest";
import type { GameState, Player, Stone } from "./types";
import { pointKey } from "./board";
import { createSession, playMove, resetSession, undoMove } from "./session";

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });

const stateWith = (stones: Stone[], currentPlayer: Player = "red"): GameState => ({
  currentPlayer,
  stones: new Map(stones.map((item) => [pointKey(item), item])),
  captures: [],
  score: { red: 0, blue: 0 }
});

describe("game session", () => {
  it("records a legal move and restores the previous state on undo", () => {
    const initial = createSession();
    const moved = playMove(initial, { x: 4, y: -3 });
    const undone = undoMove(moved);

    expect(moved.history).toHaveLength(1);
    expect(moved.state.stones.has("4:-3")).toBe(true);
    expect(undone.state.stones.size).toBe(0);
    expect(undone.state.currentPlayer).toBe("red");
    expect(undone.history).toHaveLength(0);
  });

  it("does not create history for an illegal move", () => {
    const once = playMove(createSession(), { x: 0, y: 0 });
    const repeated = playMove(once, { x: 0, y: 0 });

    expect(repeated).toBe(once);
    expect(repeated.history).toHaveLength(1);
  });

  it("undoes a capture together with its score and active capture state", () => {
    const initial = createSession(stateWith([
      stone(0, -1, "red"),
      stone(1, 0, "red"),
      stone(-1, 0, "red"),
      stone(0, 0, "blue")
    ]));
    const captured = playMove(initial, { x: 0, y: 1 });
    const undone = undoMove(captured);

    expect(captured.state.score.red).toBe(1);
    expect(undone.state.captures).toHaveLength(0);
    expect(undone.state.score).toEqual({ red: 0, blue: 0 });
    expect(undone.state.stones.has("0:1")).toBe(false);
    expect(undone.state.currentPlayer).toBe("red");
  });

  it("resets state and history", () => {
    const moved = playMove(createSession(), { x: 1, y: 1 });
    const reset = resetSession();

    expect(moved.history).toHaveLength(1);
    expect(reset.state.stones.size).toBe(0);
    expect(reset.history).toHaveLength(0);
  });
});
