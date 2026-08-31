import { describe, expect, it } from "vitest";
import type { GameState, Player, Point, Stone } from "./types";
import { createGameState, placeStone, pointKey } from "./board";

const stateWith = (stones: Array<Stone>, currentPlayer: Player = "red"): GameState => ({
  currentPlayer,
  stones: new Map(stones.map((stone) => [pointKey(stone), stone])),
  captures: [],
  score: { red: 0, blue: 0 }
});

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });

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

  it("captures only after the neighboring-dot boundary is really closed", () => {
    const initial = stateWith([
      stone(0, -1, "red"),
      stone(1, 0, "red"),
      stone(-1, 0, "red"),
      stone(0, 0, "blue")
    ]);

    const captured = placeStone(initial, { x: 0, y: 1 });

    expect(captured.captures).toHaveLength(1);
    expect(captured.captures[0].boundary).toHaveLength(4);
    expect(captured.captures[0].captured.map(pointKey)).toEqual(["0:0"]);
    expect(captured.score.red).toBe(1);
  });

  it("does not capture while the enclosure still has a gap", () => {
    const initial = stateWith([
      stone(0, -1, "red"),
      stone(1, 0, "red"),
      stone(0, 0, "blue")
    ]);

    const stillOpen = placeStone(initial, { x: 0, y: 1 });

    expect(stillOpen.captures).toHaveLength(0);
    expect(stillOpen.score.red).toBe(0);
  });

  it("does not score an empty closed house", () => {
    const initial = stateWith([
      stone(0, -1, "red"),
      stone(1, 0, "red"),
      stone(-1, 0, "red")
    ]);

    const house = placeStone(initial, { x: 0, y: 1 });

    expect(house.captures).toHaveLength(0);
    expect(house.score.red).toBe(0);
  });

  it("blocks new moves inside an already captured area", () => {
    const boundary: Point[] = [
      { x: 0, y: -2 },
      { x: 1, y: -1 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: -1, y: 1 },
      { x: -2, y: 0 },
      { x: -1, y: -1 }
    ];
    const initial = stateWith([
      ...boundary.slice(0, -1).map((point) => stone(point.x, point.y, "red")),
      stone(0, 0, "blue")
    ]);
    const captured = placeStone(initial, boundary.at(-1)!);
    const blocked = placeStone(captured, { x: 0, y: 1 });

    expect(blocked).toBe(captured);
  });
});
