import { describe, expect, it } from "vitest";
import type { Capture, GameState, Player, Point, Stone } from "./types";
import { scoreCaptures } from "./capture";
import { createGameState, placeStone, pointKey } from "./board";

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });

const stateWith = (
  stones: Stone[],
  currentPlayer: Player = "red",
  captures: Capture[] = []
): GameState => ({
  currentPlayer,
  stones: new Map(stones.map((item) => [pointKey(item), item])),
  captures,
  score: scoreCaptures(captures)
});

const diamond = (centerX: number, centerY: number, radius: number, player: Player): Stone[] => {
  const points: Stone[] = [];
  for (let offset = 0; offset < radius; offset += 1) {
    points.push(stone(centerX + offset, centerY - radius + offset, player));
  }
  for (let offset = 0; offset < radius; offset += 1) {
    points.push(stone(centerX + radius - offset, centerY + offset, player));
  }
  for (let offset = 0; offset < radius; offset += 1) {
    points.push(stone(centerX - offset, centerY + radius - offset, player));
  }
  for (let offset = 0; offset < radius; offset += 1) {
    points.push(stone(centerX - radius + offset, centerY - offset, player));
  }
  return points;
};

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

  it("activates an empty house when the opponent enters it", () => {
    const initial = stateWith(diamond(0, 0, 2, "red"), "blue");
    const captured = placeStone(initial, { x: 0, y: 0 });

    expect(captured.captures).toHaveLength(1);
    expect(captured.captures[0].owner).toBe("red");
    expect(captured.captures[0].captured.map(pointKey)).toEqual(["0:0"]);
    expect(captured.score).toEqual({ red: 1, blue: 0 });
  });

  it("blocks further moves inside a house after it activates", () => {
    const initial = stateWith(diamond(0, 0, 2, "red"), "blue");
    const captured = placeStone(initial, { x: 0, y: 0 });
    const blocked = placeStone(captured, { x: 0, y: 1 });

    expect(blocked).toBe(captured);
  });

  it("resolves two independent captures completed by one move", () => {
    const initial = stateWith([
      stone(-1, -1, "red"),
      stone(-2, 0, "red"),
      stone(-1, 1, "red"),
      stone(1, -1, "red"),
      stone(2, 0, "red"),
      stone(1, 1, "red"),
      stone(-1, 0, "blue"),
      stone(1, 0, "blue")
    ]);

    const captured = placeStone(initial, { x: 0, y: 0 });

    expect(captured.captures).toHaveLength(2);
    expect(captured.score.red).toBe(2);
    expect(captured.captures.flatMap((capture) => capture.captured.map(pointKey)).sort()).toEqual([
      "-1:0",
      "1:0"
    ]);
  });

  it("does not connect dots across a two-step gap", () => {
    const initial = stateWith([
      stone(0, -2, "red"),
      stone(2, 0, "red"),
      stone(0, 2, "red"),
      stone(0, 0, "blue")
    ]);

    const result = placeStone(initial, { x: -2, y: 0 });

    expect(result.captures).toHaveLength(0);
    expect(result.score.red).toBe(0);
  });

  it("surrounds an opponent capture and releases the previously captured own stone", () => {
    const blueBoundary = diamond(0, 0, 1, "blue");
    const redCenter = stone(0, 0, "red");
    const blueCapture: Capture = {
      owner: "blue",
      boundary: blueBoundary.map(({ x, y }) => ({ x, y })),
      captured: [redCenter]
    };
    const redOuter = diamond(0, 0, 2, "red");
    const closing = redOuter.at(-1)!;
    const initial = stateWith(
      [...blueBoundary, redCenter, ...redOuter.slice(0, -1)],
      "red",
      [blueCapture]
    );

    const result = placeStone(initial, closing);

    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].owner).toBe("red");
    expect(result.captures[0].captured.map(pointKey).sort()).toEqual(["-1:0", "0:-1", "0:1", "1:0"]);
    expect(result.score).toEqual({ red: 4, blue: 0 });
  });

  it("removes several nested opponent captures when one outer capture surrounds them", () => {
    const firstBlueBoundary = diamond(-2, 0, 1, "blue");
    const secondBlueBoundary = diamond(2, 0, 1, "blue");
    const firstRed = stone(-2, 0, "red");
    const secondRed = stone(2, 0, "red");
    const captures: Capture[] = [
      {
        owner: "blue",
        boundary: firstBlueBoundary.map(({ x, y }) => ({ x, y })),
        captured: [firstRed]
      },
      {
        owner: "blue",
        boundary: secondBlueBoundary.map(({ x, y }) => ({ x, y })),
        captured: [secondRed]
      }
    ];
    const redOuter = diamond(0, 0, 5, "red");
    const closing = redOuter.at(-1)!;
    const initial = stateWith(
      [
        ...firstBlueBoundary,
        ...secondBlueBoundary,
        firstRed,
        secondRed,
        ...redOuter.slice(0, -1)
      ],
      "red",
      captures
    );

    const result = placeStone(initial, closing);

    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].owner).toBe("red");
    expect(result.score).toEqual({ red: 8, blue: 0 });
  });

  it("keeps capture logic stable at large game coordinates", () => {
    const origin = 100_000;
    const initial = stateWith([
      stone(origin, origin - 1, "red"),
      stone(origin + 1, origin, "red"),
      stone(origin - 1, origin, "red"),
      stone(origin, origin, "blue")
    ]);

    const captured = placeStone(initial, { x: origin, y: origin + 1 });

    expect(captured.score.red).toBe(1);
  });

  it("blocks new moves inside an already captured area", () => {
    const boundary: Point[] = diamond(0, 0, 2, "red").map(({ x, y }) => ({ x, y }));
    const initial = stateWith([
      ...boundary.slice(0, -1).map((point) => stone(point.x, point.y, "red")),
      stone(0, 0, "blue")
    ]);
    const captured = placeStone(initial, boundary.at(-1)!);
    const blocked = placeStone(captured, { x: 0, y: 1 });

    expect(blocked).toBe(captured);
  });
});
