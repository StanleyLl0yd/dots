import { isRecord, readStoredJson, removeStoredValue, writeStoredJson, type StorageLike } from "./storage";
import { MAX_VIEWPORT_CENTER, MAX_ZOOM, MIN_ZOOM, type Viewport } from "./ui/viewport";

export const VIEWPORT_SAVE_VERSION = 1;
export const VIEWPORT_SAVE_KEY = "dots.viewport";

interface StoredViewport {
  version: number;
  centerX: number;
  centerY: number;
  zoom: number;
}

const validNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const loadViewport = (storage: StorageLike): Viewport | undefined => {
  const parsed = readStoredJson(storage, VIEWPORT_SAVE_KEY);
  if (parsed === undefined) return undefined;
  if (
    !isRecord(parsed) ||
    parsed.version !== VIEWPORT_SAVE_VERSION ||
    !validNumber(parsed.centerX) ||
    !validNumber(parsed.centerY) ||
    !validNumber(parsed.zoom) ||
    Math.abs(parsed.centerX) > MAX_VIEWPORT_CENTER ||
    Math.abs(parsed.centerY) > MAX_VIEWPORT_CENTER ||
    parsed.zoom < MIN_ZOOM ||
    parsed.zoom > MAX_ZOOM
  ) {
    removeStoredValue(storage, VIEWPORT_SAVE_KEY);
    return undefined;
  }

  return {
    centerX: parsed.centerX,
    centerY: parsed.centerY,
    zoom: parsed.zoom
  };
};

export const saveViewport = (storage: StorageLike, viewport: Viewport): void => {
  const payload: StoredViewport = { version: VIEWPORT_SAVE_VERSION, ...viewport };
  writeStoredJson(storage, VIEWPORT_SAVE_KEY, payload);
};
