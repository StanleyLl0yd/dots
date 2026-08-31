import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWPORT,
  MAX_VIEWPORT_CENTER,
  MAX_ZOOM,
  MIN_ZOOM,
  gameToScreen,
  panViewport,
  screenToGame,
  screenToGrid,
  zoomViewportAt,
  type ViewportSize
} from "./viewport";

const size: ViewportSize = { width: 1000, height: 700 };

describe("viewport", () => {
  it("round-trips game and screen coordinates under pan and zoom", () => {
    const viewport = { centerX: 12.25, centerY: -4.5, zoom: 1.75 };
    const game = { x: 17, y: -2 };
    const screen = gameToScreen(game, viewport, size);
    const restored = screenToGame(screen, viewport, size);

    expect(restored.x).toBeCloseTo(game.x, 10);
    expect(restored.y).toBeCloseTo(game.y, 10);
  });

  it("snaps pointer input to integer game intersections after viewport transforms", () => {
    const viewport = { centerX: -8.25, centerY: 3.5, zoom: 0.8 };
    const screen = gameToScreen({ x: 4.36, y: -6.61 }, viewport, size);

    expect(screenToGrid(screen, viewport, size)).toEqual({ x: 4, y: -7 });
  });

  it("pans in screen direction without changing game coordinates", () => {
    const next = panViewport(DEFAULT_VIEWPORT, 64, -32);

    expect(next).toEqual({ centerX: -2, centerY: 1, zoom: 1 });
    expect(gameToScreen({ x: 0, y: 0 }, next, size)).toEqual({ x: 564, y: 318 });
  });

  it("keeps the game point under the zoom anchor fixed on screen", () => {
    const viewport = { centerX: 4, centerY: -3, zoom: 1 };
    const anchor = { x: 170, y: 240 };
    const before = screenToGame(anchor, viewport, size);
    const next = zoomViewportAt(viewport, anchor, size, 2);
    const after = screenToGame(anchor, next, size);

    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
    expect(next.zoom).toBe(2);
  });

  it("clamps zoom and extreme viewport centers", () => {
    expect(zoomViewportAt(DEFAULT_VIEWPORT, { x: 500, y: 350 }, size, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomViewportAt(DEFAULT_VIEWPORT, { x: 500, y: 350 }, size, 0.0001).zoom).toBe(MIN_ZOOM);

    const far = panViewport(DEFAULT_VIEWPORT, -1e20, 1e20);
    expect(far.centerX).toBe(MAX_VIEWPORT_CENTER);
    expect(far.centerY).toBe(-MAX_VIEWPORT_CENTER);
  });
});
