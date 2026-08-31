import { describe, expect, it } from "vitest";
import type { StorageLike } from "./persistence";
import { MAX_VIEWPORT_CENTER } from "./ui/viewport";
import { VIEWPORT_SAVE_KEY, loadViewport, saveViewport } from "./viewport-persistence";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("viewport persistence", () => {
  it("round-trips a valid viewport independently from game state", () => {
    const storage = new MemoryStorage();
    const viewport = { centerX: 123.5, centerY: -88.25, zoom: 1.6 };

    saveViewport(storage, viewport);

    expect(loadViewport(storage)).toEqual(viewport);
  });

  it("removes malformed viewport data", () => {
    const storage = new MemoryStorage();
    storage.setItem(VIEWPORT_SAVE_KEY, "not-json");

    expect(loadViewport(storage)).toBeUndefined();
    expect(storage.getItem(VIEWPORT_SAVE_KEY)).toBeNull();
  });

  it("rejects unsupported versions and unsafe numeric ranges", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      VIEWPORT_SAVE_KEY,
      JSON.stringify({ version: 2, centerX: 0, centerY: 0, zoom: 1 })
    );
    expect(loadViewport(storage)).toBeUndefined();

    storage.setItem(
      VIEWPORT_SAVE_KEY,
      JSON.stringify({ version: 1, centerX: MAX_VIEWPORT_CENTER + 1, centerY: 0, zoom: 1 })
    );
    expect(loadViewport(storage)).toBeUndefined();
  });
});
