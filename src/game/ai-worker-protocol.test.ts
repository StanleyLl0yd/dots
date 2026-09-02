import { describe, expect, it } from "vitest";
import type { AiWorkerRequest } from "./ai-worker-protocol";
import type { GameState } from "./types";

const clone = <T>(value: T): T => structuredClone(value);

describe("AI worker protocol", () => {
  it("preserves Map-based game state across structured cloning", () => {
    const state: GameState = {
      currentPlayer: "blue",
      stones: new Map([["3:-2", { x: 3, y: -2, player: "red" }]]),
      captures: [],
      score: { red: 0, blue: 0 }
    };
    const request: AiWorkerRequest = {
      requestId: 7,
      state,
      options: { player: "blue", difficulty: "expert", focus: { x: 3, y: -2 } }
    };

    const restored = clone(request);

    expect(restored.requestId).toBe(7);
    expect(restored.state.stones).toBeInstanceOf(Map);
    expect([...restored.state.stones.values()]).toEqual([...state.stones.values()]);
    expect(restored.options).toEqual(request.options);
  });
});
