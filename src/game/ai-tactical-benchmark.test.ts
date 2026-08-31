import { describe, expect, it } from "vitest";
import { chooseAiMove } from "./ai";
import { placeStone, pointKey } from "./board";
import { scoreCaptures } from "./capture";
import type { Capture, GameState, Player, Point, Stone } from "./types";

const OFFSETS: Point[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 }
];

const stone = (x: number, y: number, player: Player): Stone => ({ x, y, player });

const stateWith = (
  stones: Stone[],
  currentPlayer: Player,
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

const expertMove = (state: GameState, focus?: Point): Point => {
  const move = chooseAiMove(state, {
    player: state.currentPlayer,
    difficulty: "expert",
    focus
  });
  expect(move).toBeDefined();
  return move!;
};

const maxImmediateGain = (state: GameState, player: Player): number => {
  if (state.currentPlayer !== player) return 0;
  const candidates = new Map<string, Point>();
  for (const item of state.stones.values()) {
    for (const offset of OFFSETS) {
      const point = { x: item.x + offset.x, y: item.y + offset.y };
      if (!state.stones.has(pointKey(point))) candidates.set(pointKey(point), point);
    }
  }

  const opponent = player === "red" ? "blue" : "red";
  let best = 0;
  for (const point of candidates.values()) {
    const next = placeStone(state, point);
    if (next === state) continue;
    const gain =
      next.score[player] - state.score[player] +
      state.score[opponent] - next.score[opponent];
    best = Math.max(best, gain);
  }
  return best;
};

describe("Expert tactical benchmark suite", () => {
  it.skip("TB01 known gap: converts a two-target capture opportunity", () => {
    const state = stateWith(
      [
        stone(-1, -1, "blue"),
        stone(-2, 0, "blue"),
        stone(-1, 1, "blue"),
        stone(1, -1, "blue"),
        stone(2, 0, "blue"),
        stone(1, 1, "blue"),
        stone(-1, 0, "red"),
        stone(1, 0, "red")
      ],
      "blue"
    );

    const move = expertMove(state, { x: 1, y: 0 });
    const result = placeStone(state, move);

    expect(result.score).toEqual({ red: 0, blue: 2 });
  });

  it("TB02 blocks the only immediate opponent closing point", () => {
    const state = stateWith(
      [
        stone(0, -1, "red"),
        stone(1, 0, "red"),
        stone(0, 1, "red"),
        stone(0, 0, "blue")
      ],
      "blue"
    );

    const move = expertMove(state, { x: 0, y: 1 });
    const result = placeStone(state, move);

    expect(move).toEqual({ x: -1, y: 0 });
    expect(maxImmediateGain(result, "red")).toBe(0);
  });

  it("TB03 ignores an empty false closure when an opponent capture must be blocked", () => {
    const state = stateWith(
      [
        stone(0, -1, "red"),
        stone(1, 0, "red"),
        stone(0, 1, "red"),
        stone(0, 0, "blue"),
        stone(10, -1, "blue"),
        stone(11, 0, "blue"),
        stone(10, 1, "blue")
      ],
      "blue"
    );

    const move = expertMove(state, { x: 10, y: 1 });
    const result = placeStone(state, move);

    expect(move).toEqual({ x: -1, y: 0 });
    expect(result.score).toEqual({ red: 0, blue: 0 });
    expect(maxImmediateGain(result, "red")).toBe(0);
  });

  it.skip("TB04 known gap: avoids entering a hostile empty house when safe frontier moves exist", () => {
    const state = stateWith([...diamond(0, 0, 2, "red"), stone(5, 0, "blue")], "blue");

    const move = expertMove(state, { x: 0, y: 0 });
    const result = placeStone(state, move);

    expect(move).not.toEqual({ x: 0, y: 0 });
    expect(result.score.red).toBe(0);
  });

  it.skip("TB05 known gap: counter-captures when two separate opponent threats cannot both be blocked", () => {
    const state = stateWith(
      [
        stone(0, -1, "blue"),
        stone(1, 0, "blue"),
        stone(0, 1, "blue"),
        stone(0, 0, "red"),
        stone(-10, -1, "red"),
        stone(-9, 0, "red"),
        stone(-10, 1, "red"),
        stone(-10, 0, "blue"),
        stone(10, -1, "red"),
        stone(11, 0, "red"),
        stone(10, 1, "red"),
        stone(10, 0, "blue")
      ],
      "blue"
    );

    const move = expertMove(state, { x: 10, y: 1 });
    const result = placeStone(state, move);

    expect(move).toEqual({ x: -1, y: 0 });
    expect(result.score.blue).toBe(1);
    expect(maxImmediateGain(result, "red")).toBeGreaterThan(0);
  });

  it("TB06 surrounds an active opponent capture and releases the held own stone", () => {
    const blueBoundary = diamond(0, 0, 1, "blue");
    const redCenter = stone(0, 0, "red");
    const blueCapture: Capture = {
      owner: "blue",
      boundary: blueBoundary.map(({ x, y }) => ({ x, y })),
      captured: [redCenter]
    };
    const redOuter = diamond(0, 0, 2, "red");
    const closing = redOuter.at(-1)!;
    const state = stateWith(
      [...blueBoundary, redCenter, ...redOuter.slice(0, -1)],
      "red",
      [blueCapture]
    );

    const move = expertMove(state, closing);
    const result = placeStone(state, move);

    expect(move).toEqual({ x: closing.x, y: closing.y });
    expect(result.score).toEqual({ red: 4, blue: 0 });
    expect(result.captures).toHaveLength(1);
    expect(result.captures[0].owner).toBe("red");
  });
});
