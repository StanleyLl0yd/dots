import type { StorageLike } from "./persistence";
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
  try {
    const raw = storage.getItem(VIEWPORT_SAVE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !("version" in parsed) ||
      !("centerX" in parsed) ||
      !("centerY" in parsed) ||
      !("zoom" in parsed)
    ) {
      storage.removeItem(VIEWPORT_SAVE_KEY);
      return undefined;
    }

    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== VIEWPORT_SAVE_VERSION ||
      !validNumber(candidate.centerX) ||
      !validNumber(candidate.centerY) ||
      !validNumber(candidate.zoom) ||
      Math.abs(candidate.centerX) > MAX_VIEWPORT_CENTER ||
      Math.abs(candidate.centerY) > MAX_VIEWPORT_CENTER ||
      candidate.zoom < MIN_ZOOM ||
      candidate.zoom > MAX_ZOOM
    ) {
      storage.removeItem(VIEWPORT_SAVE_KEY);
      return undefined;
    }

    return {
      centerX: candidate.centerX,
      centerY: candidate.centerY,
      zoom: candidate.zoom
    };
  } catch {
    try {
      storage.removeItem(VIEWPORT_SAVE_KEY);
    } catch {}
    return undefined;
  }
};

export const saveViewport = (storage: StorageLike, viewport: Viewport): void => {
  try {
    const payload: StoredViewport = { version: VIEWPORT_SAVE_VERSION, ...viewport };
    storage.setItem(VIEWPORT_SAVE_KEY, JSON.stringify(payload));
  } catch {}
};
