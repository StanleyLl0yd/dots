import { describe, expect, it } from "vitest";
import type { Capture, Player, Stone } from "./types";
import { findNewCaptures, pointInPolygon, scoreCaptures } from "./capture";

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });
const key = ({ x, y }: { x: number; y: number }): string => `${x}:${y}`;

describe("capture topology", () => {
  it("treats polygon boundaries as boundaries rather than interior", () => {
    const polygon = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];

    expect(pointInPolygon({ x: 0, y: 0 }, polygon)).toBe(true);
    expect(pointInPolygon({ x: 1, y: 0 }, polygon)).toBe(false);
    expect(pointInPolygon({ x: 2, y: 0 }, polygon)).toBe(false);
  });

  it("selects the minimum valid face when several boundaries can contain the same dot", () => {
    const red = [
      stone(1, 1, "red"),
      stone(0, 2, "red"),
      stone(-1, 1, "red"),
      stone(2, 2, "red"),
      stone(1, 3, "red"),
      stone(0, 4, "red"),
      stone(-1, 3, "red"),
      stone(-2, 2, "red"),
      stone(0, 0, "red")
    ];
    const blue = stone(0, 1, "blue");
    const stones = new Map([...red, blue].map((item) => [key(item), item]));

    const captures = findNewCaptures(stones, [], "red", { x: 0, y: 0 });

    expect(captures).toHaveLength(1);
    expect(captures[0].boundary).toHaveLength(4);
    expect(captures[0].captured.map(key)).toEqual(["0:1"]);
  });

  it("counts each captured dot only once in the derived score", () => {
    const blue = stone(0, 0, "blue");
    const captures: Capture[] = [
      {
        owner: "red",
        boundary: [
          { x: 0, y: -1 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 }
        ],
        captured: [blue]
      },
      {
        owner: "red",
        boundary: [
          { x: 0, y: -2 },
          { x: 2, y: 0 },
          { x: 0, y: 2 },
          { x: -2, y: 0 }
        ],
        captured: [blue]
      }
    ];

    expect(scoreCaptures(captures)).toEqual({ red: 1, blue: 0 });
  });
});
