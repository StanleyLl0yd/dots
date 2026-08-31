import { describe, expect, it } from "vitest";
import { createGameState, placeStone } from "./board";

describe("board", () => {
  it("places one stone and alternates the player", () => {
    const initial = createGameState();
    const next = placeStone(initial, { x: 2, y: 3 });

    expect(next.stones.get("2:3")?.player).toBe("red");
    expect(next.currentPlayer).toBe("blue");
  });

  it("does not overwrite an occupied point", () => {
    const once = placeStone(createGameState(), { x: 0, y: 0 });
    const twice = placeStone(once, { x: 0, y: 0 });

    expect(twice).toBe(once);
  });
});
