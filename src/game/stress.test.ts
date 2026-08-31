import { describe, expect, it } from "vitest";
import { createSession, playMove, undoMove } from "./session";

describe("game stress coverage", () => {
  it("keeps a long sparse move history deterministic and reversible", () => {
    let session = createSession();

    for (let index = 0; index < 500; index += 1) {
      const next = playMove(session, { x: index * 3, y: (index % 13) * 3 });
      expect(next).not.toBe(session);
      session = next;
    }

    expect(session.state.stones.size).toBe(500);
    expect(session.state.captures).toEqual([]);
    expect(session.state.score).toEqual({ red: 0, blue: 0 });
    expect(session.history).toHaveLength(500);
    expect(session.state.currentPlayer).toBe("red");

    for (let index = 0; index < 125; index += 1) session = undoMove(session);

    expect(session.state.stones.size).toBe(375);
    expect(session.history).toHaveLength(375);
    expect(session.state.captures).toEqual([]);
    expect(session.state.score).toEqual({ red: 0, blue: 0 });
    expect(session.state.currentPlayer).toBe("blue");
  });
});
