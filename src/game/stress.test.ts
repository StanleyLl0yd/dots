import { describe, expect, it } from "vitest";
import { createSession, playMove, undoMove } from "./session";

describe("game stress coverage", () => {
  it("keeps a long sparse move history deterministic and reversible", async () => {
    let session = await createSession();

    for (let index = 0; index < 100; index += 1) {
      const next = await playMove(session, { x: index * 3, y: (index % 13) * 3 });
      expect(next).not.toBe(session);
      session = next;
    }

    expect(session.state.stones.size).toBe(100);
    expect(session.state.captures).toEqual([]);
    expect(session.state.score).toEqual({ red: 0, blue: 0 });
    expect(session.history).toHaveLength(100);
    expect(session.state.currentPlayer).toBe("red");

    for (let index = 0; index < 25; index += 1) session = await undoMove(session);

    expect(session.state.stones.size).toBe(75);
    expect(session.history).toHaveLength(75);
    expect(session.state.captures).toEqual([]);
    expect(session.state.score).toEqual({ red: 0, blue: 0 });
    expect(session.state.currentPlayer).toBe("blue");
  });
});
