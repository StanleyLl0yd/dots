import { describe, expect, it } from "vitest";
import type { StorageLike } from "./persistence";
import {
  DEFAULT_GAME_MODE,
  loadGameMode,
  PREFERENCES_KEY,
  PREFERENCES_VERSION,
  saveGameMode
} from "./preferences";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

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

describe("game preferences", () => {
  it("defaults to local play and round-trips computer mode", () => {
    const storage = new MemoryStorage();
    expect(loadGameMode(storage)).toBe(DEFAULT_GAME_MODE);

    saveGameMode(storage, "computer");
    expect(loadGameMode(storage)).toBe("computer");
  });

  it("rejects unsupported or malformed preference data without touching game persistence", () => {
    const storage = new MemoryStorage();
    storage.setItem("dots.game", "keep-me");
    storage.setItem(PREFERENCES_KEY, JSON.stringify({ version: PREFERENCES_VERSION + 1, gameMode: "computer" }));

    expect(loadGameMode(storage)).toBe(DEFAULT_GAME_MODE);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
    expect(storage.getItem("dots.game")).toBe("keep-me");

    storage.setItem(PREFERENCES_KEY, JSON.stringify({ version: PREFERENCES_VERSION, gameMode: "unknown" }));
    expect(loadGameMode(storage)).toBe(DEFAULT_GAME_MODE);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
  });
});
