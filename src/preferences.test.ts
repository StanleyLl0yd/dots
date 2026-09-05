import { describe, expect, it } from "vitest";
import type { StorageLike } from "./persistence";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  PREFERENCES_KEY,
  PREFERENCES_VERSION,
  savePreferences
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
  it("defaults to local play with sound enabled and round-trips all settings", () => {
    const storage = new MemoryStorage();
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);

    savePreferences(storage, { gameMode: "computer", aiDifficulty: "expert", soundEnabled: false });
    expect(loadPreferences(storage)).toEqual({
      gameMode: "computer",
      aiDifficulty: "expert",
      soundEnabled: false
    });
  });

  it("migrates version 1 computer-mode preferences to normal difficulty", () => {
    const storage = new MemoryStorage();
    storage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, gameMode: "computer" }));

    expect(loadPreferences(storage)).toEqual({
      gameMode: "computer",
      aiDifficulty: "normal",
      soundEnabled: true
    });
    expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!)).toEqual({
      version: PREFERENCES_VERSION,
      gameMode: "computer",
      aiDifficulty: "normal",
      soundEnabled: true
    });
  });

  it("migrates version 2 preferences with sound enabled by default", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ version: 2, gameMode: "computer", aiDifficulty: "hard" })
    );

    expect(loadPreferences(storage)).toEqual({
      gameMode: "computer",
      aiDifficulty: "hard",
      soundEnabled: true
    });
    expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!)).toEqual({
      version: PREFERENCES_VERSION,
      gameMode: "computer",
      aiDifficulty: "hard",
      soundEnabled: true
    });
  });

  it("rejects unsupported or malformed preference data without touching game persistence", () => {
    const storage = new MemoryStorage();
    storage.setItem("dots.game", "keep-me");
    storage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: PREFERENCES_VERSION + 1,
        gameMode: "computer",
        aiDifficulty: "expert",
        soundEnabled: true
      })
    );

    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
    expect(storage.getItem("dots.game")).toBe("keep-me");

    storage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: PREFERENCES_VERSION,
        gameMode: "computer",
        aiDifficulty: "impossible",
        soundEnabled: true
      })
    );
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();

    storage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: PREFERENCES_VERSION,
        gameMode: "computer",
        aiDifficulty: "expert",
        soundEnabled: "yes"
      })
    );
    expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
    expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
  });
});
