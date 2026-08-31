import type { Point } from "../game/types";

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number;
}

export const BASE_CELL_SIZE = 32;
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 3.5;
export const MAX_VIEWPORT_CENTER = 1_000_000_000;
export const DEFAULT_VIEWPORT: Viewport = { centerX: 0, centerY: 0, zoom: 1 };

export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
const clampCenter = (value: number): number => Math.min(MAX_VIEWPORT_CENTER, Math.max(-MAX_VIEWPORT_CENTER, value));

export const gameToScreen = (
  point: Point,
  viewport: Viewport,
  size: ViewportSize,
  baseCell = BASE_CELL_SIZE
): ScreenPoint => {
  const scale = baseCell * viewport.zoom;
  return {
    x: size.width / 2 + (point.x - viewport.centerX) * scale,
    y: size.height / 2 + (point.y - viewport.centerY) * scale
  };
};

export const screenToGame = (
  point: ScreenPoint,
  viewport: Viewport,
  size: ViewportSize,
  baseCell = BASE_CELL_SIZE
): ScreenPoint => {
  const scale = baseCell * viewport.zoom;
  return {
    x: viewport.centerX + (point.x - size.width / 2) / scale,
    y: viewport.centerY + (point.y - size.height / 2) / scale
  };
};

export const screenToGrid = (
  point: ScreenPoint,
  viewport: Viewport,
  size: ViewportSize,
  baseCell = BASE_CELL_SIZE
): Point => {
  const game = screenToGame(point, viewport, size, baseCell);
  return { x: Math.round(game.x), y: Math.round(game.y) };
};

export const panViewport = (
  viewport: Viewport,
  deltaX: number,
  deltaY: number,
  baseCell = BASE_CELL_SIZE
): Viewport => {
  const scale = baseCell * viewport.zoom;
  return {
    ...viewport,
    centerX: clampCenter(viewport.centerX - deltaX / scale),
    centerY: clampCenter(viewport.centerY - deltaY / scale)
  };
};

export const viewportForAnchor = (
  anchorGame: ScreenPoint,
  anchorScreen: ScreenPoint,
  size: ViewportSize,
  zoom: number,
  baseCell = BASE_CELL_SIZE
): Viewport => {
  const nextZoom = clampZoom(zoom);
  const scale = baseCell * nextZoom;
  return {
    centerX: clampCenter(anchorGame.x - (anchorScreen.x - size.width / 2) / scale),
    centerY: clampCenter(anchorGame.y - (anchorScreen.y - size.height / 2) / scale),
    zoom: nextZoom
  };
};

export const zoomViewportAt = (
  viewport: Viewport,
  anchorScreen: ScreenPoint,
  size: ViewportSize,
  factor: number,
  baseCell = BASE_CELL_SIZE
): Viewport => {
  const anchorGame = screenToGame(anchorScreen, viewport, size, baseCell);
  return viewportForAnchor(anchorGame, anchorScreen, size, viewport.zoom * factor, baseCell);
};
