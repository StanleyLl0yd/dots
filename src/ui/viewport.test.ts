import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWPORT,
  MAX_FIT_ZOOM,
  MAX_VIEWPORT_CENTER,
  MAX_ZOOM,
  MIN_ZOOM,
  fitViewportToPoints,
  gameToScreen,
  panViewport,
  screenToGame,
  screenToGrid,
  visibleGridBounds,
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

  it("fits the played position inside the viewport with bounded zoom", () => {
    const points = [{ x: -10, y: -4 }, { x: 14, y: 8 }, { x: 2, y: 3 }];
    const viewport = fitViewportToPoints(points, size);

    expect(viewport.centerX).toBe(2);
    expect(viewport.centerY).toBe(2);
    expect(viewport.zoom).toBeLessThanOrEqual(MAX_FIT_ZOOM);
    for (const point of points) {
      const screen = gameToScreen(point, viewport, size);
      expect(screen.x).toBeGreaterThanOrEqual(50);
      expect(screen.x).toBeLessThanOrEqual(size.width - 50);
      expect(screen.y).toBeGreaterThanOrEqual(50);
      expect(screen.y).toBeLessThanOrEqual(size.height - 50);
    }
  });

  it("does not over-zoom a single-point position", () => {
    const viewport = fitViewportToPoints([{ x: 1_000_000, y: -1_000_000 }], size);

    expect(viewport).toEqual({ centerX: 1_000_000, centerY: -1_000_000, zoom: MAX_FIT_ZOOM });
  });

  it("clamps zoom and extreme viewport centers", () => {
    expect(zoomViewportAt(DEFAULT_VIEWPORT, { x: 500, y: 350 }, size, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomViewportAt(DEFAULT_VIEWPORT, { x: 500, y: 350 }, size, 0.0001).zoom).toBe(MIN_ZOOM);

    const far = panViewport(DEFAULT_VIEWPORT, -1e20, 1e20);
    expect(far.centerX).toBe(MAX_VIEWPORT_CENTER);
    expect(far.centerY).toBe(-MAX_VIEWPORT_CENTER);
  });

  it("bounds grid work even for an 8K viewport at minimum zoom", () => {
    const bounds = visibleGridBounds(
      { centerX: MAX_VIEWPORT_CENTER - 1000, centerY: -MAX_VIEWPORT_CENTER + 1000, zoom: MIN_ZOOM },
      { width: 7680, height: 4320 }
    );

    expect(bounds.maxX - bounds.minX + 1).toBeLessThan(610);
    expect(bounds.maxY - bounds.minY + 1).toBeLessThan(350);
  });

  it("keeps repeated pan and zoom transforms finite and reversible", () => {
    let viewport = { ...DEFAULT_VIEWPORT };
    const stressSize = { width: 2560, height: 1440 };

    for (let index = 0; index < 2000; index += 1) {
      viewport = panViewport(viewport, (index % 9) - 4, (index % 7) - 3);
      viewport = zoomViewportAt(
        viewport,
        { x: (index * 37) % stressSize.width, y: (index * 29) % stressSize.height },
        stressSize,
        index % 2 === 0 ? 1.001 : 0.999
      );
    }

    expect(Number.isFinite(viewport.centerX)).toBe(true);
    expect(Number.isFinite(viewport.centerY)).toBe(true);
    expect(viewport.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(viewport.zoom).toBeLessThanOrEqual(MAX_ZOOM);

    const game = { x: 987_654_321, y: -123_456_789 };
    const restored = screenToGame(gameToScreen(game, viewport, stressSize), viewport, stressSize);
    expect(restored.x).toBeCloseTo(game.x, 5);
    expect(restored.y).toBeCloseTo(game.y, 5);
  });
});
