import { describe, expect, it } from "vitest";
import type { Capture, GameState, Player, Stone } from "./types";
import { applyCaptures, findHouseCapture, scoreCaptures } from "./capture";
import { placeStone, pointKey } from "./board";

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });

const diamond = (centerX: number, centerY: number, radius: number, player: Player): Stone[] => {
  const points: Stone[] = [];
  for (let offset = 0; offset < radius; offset += 1) points.push(stone(centerX + offset, centerY - radius + offset, player));
  for (let offset = 0; offset < radius; offset += 1) points.push(stone(centerX + radius - offset, centerY + offset, player));
  for (let offset = 0; offset < radius; offset += 1) points.push(stone(centerX - offset, centerY + radius - offset, player));
  for (let offset = 0; offset < radius; offset += 1) points.push(stone(centerX - radius + offset, centerY - offset, player));
  return points;
};

const stateWith = (stones: Stone[], currentPlayer: Player = "red", captures: Capture[] = []): GameState => ({
  currentPlayer,
  stones: new Map(stones.map((item) => [pointKey(item), item])),
  captures,
  score: scoreCaptures(captures)
});

describe("capture topology hardening", () => {
  it("gives a direct mover capture priority over an opponent house", () => {
    const redHouse = diamond(0, 0, 3, "red");
    const initial = stateWith([
      ...redHouse,
      stone(0, -1, "blue"),
      stone(1, 0, "blue"),
      stone(-1, 0, "blue"),
      stone(0, 0, "red")
    ], "blue");

    const result = placeStone(initial, { x: 0, y: 1 });

    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].owner).toBe("blue");
    expect(result.captures[0].captured.map(pointKey)).toEqual(["0:0"]);
  });

  it("activates the smallest containing house when empty houses are nested", () => {
    const stones = [...diamond(0, 0, 2, "red"), ...diamond(0, 0, 4, "red"), stone(0, 0, "blue")];
    const map = new Map(stones.map((item) => [pointKey(item), item]));

    const capture = findHouseCapture(map, [], "red", stone(0, 0, "blue"));

    expect(capture?.boundary).toHaveLength(8);
    expect(capture?.captured.map(pointKey)).toEqual(["0:0"]);
  });

  it("does not deactivate an opponent capture that is only partially overlapped", () => {
    const existing: Capture = {
      owner: "blue",
      boundary: [
        { x: 1, y: -1 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 0 }
      ],
      captured: [stone(1, 0, "red")]
    };
    const outer: Capture = {
      owner: "red",
      boundary: [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ],
      captured: [stone(0, 0, "blue")]
    };

    const active = applyCaptures([existing], [outer]);

    expect(active).toHaveLength(2);
    expect(active.map((capture) => capture.owner).sort()).toEqual(["blue", "red"]);
  });

  it("captures through a dense ring of legal diagonal neighbors without expanding the minimum face", () => {
    const ring = [
      stone(-1, -1, "red"), stone(0, -1, "red"), stone(1, -1, "red"),
      stone(-1, 0, "red"), stone(1, 0, "red"),
      stone(-1, 1, "red"), stone(1, 1, "red")
    ];
    const initial = stateWith([...ring, stone(0, 0, "blue")]);

    const result = placeStone(initial, { x: 0, y: 1 });

    expect(result.score.red).toBe(1);
    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].boundary).toHaveLength(4);
  });
});
