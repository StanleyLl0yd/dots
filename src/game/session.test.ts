import { describe, expect, it } from "vitest";
import { createSession, playMove, resetSession, restoreSession, undoMove } from "./session";

describe("game session", () => {
  it("records a legal move and restores the previous state on undo", async () => {
    const initial = await createSession();
    const moved = await playMove(initial, { x: 4, y: -3 });
    const undone = await undoMove(moved);

    expect(moved.history).toHaveLength(1);
    expect(moved.state.stones.has("4:-3")).toBe(true);
    expect(undone.state.stones.size).toBe(0);
    expect(undone.state.currentPlayer).toBe("red");
    expect(undone.history).toHaveLength(0);
  });

  it("does not create history for an illegal move", async () => {
    const initial = await createSession();
    const once = await playMove(initial, { x: 0, y: 0 });
    const repeated = await playMove(once, { x: 0, y: 0 });

    expect(repeated).toBe(once);
    expect(repeated.history).toHaveLength(1);
  });

  it("undoes a capture together with its score and active capture state", async () => {
    const captured = await restoreSession([
      { x: 0, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: 10 },
      { x: -1, y: 0 },
      { x: 11, y: 10 },
      { x: 0, y: 1 }
    ]);
    expect(captured).toBeDefined();

    const undone = await undoMove(captured!);

    expect(captured!.state.score.red).toBe(1);
    expect(undone.state.captures).toHaveLength(0);
    expect(undone.state.score).toEqual({ red: 0, blue: 0 });
    expect(undone.state.stones.has("0:1")).toBe(false);
    expect(undone.state.currentPlayer).toBe("red");
  });

  it("resets state and history", async () => {
    const initial = await createSession();
    const moved = await playMove(initial, { x: 1, y: 1 });
    const reset = await resetSession();

    expect(moved.history).toHaveLength(1);
    expect(reset.state.stones.size).toBe(0);
    expect(reset.history).toHaveLength(0);
  });
});
