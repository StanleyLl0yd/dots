import { describe, expect, it } from "vitest";
import { createGameState, placeStone } from "./board";
import type { AiWorkerRequest } from "./ai-worker-protocol";

const clone = <T>(value: T): T => structuredClone(value);

describe("AI worker protocol", () => {
  it("preserves Map-based game state across structured cloning", () => {
    const state = placeStone(createGameState(), { x: 3, y: -2 });
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
