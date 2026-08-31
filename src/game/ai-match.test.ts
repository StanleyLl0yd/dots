import { describe, expect, it } from "vitest";
import { pairedMatchMargin, runAiMatch } from "./ai-match";

describe("AI strength regression matches", () => {
  it("replays a deterministic legal AI-vs-AI game", () => {
    const options = { red: "expert", blue: "hard", maxMoves: 8 } as const;
    const first = runAiMatch(options);
    const second = runAiMatch(options);

    expect(first.stopped).toBe("move-limit");
    expect(first.moves).toEqual(second.moves);
    expect(first.state.score).toEqual(second.state.score);
    expect(first.state.stones.size).toBe(8);
  });

  it("keeps Expert ahead in the paired short-horizon strength suite", () => {
    expect(pairedMatchMargin("expert", "normal", 12)).toBeGreaterThan(0);
    expect(pairedMatchMargin("expert", "hard", 12)).toBeGreaterThan(0);
  });
});
