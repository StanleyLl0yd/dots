import type { AiDifficulty } from "./game/core";
import { isRecord, readStoredJson, removeStoredValue, writeStoredJson, type StorageLike } from "./storage";

export type GameMode = "local" | "computer";

export interface GamePreferences {
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
  soundEnabled: boolean;
}

export const PREFERENCES_VERSION = 3;
export const PREFERENCES_KEY = "dots.preferences";
export const DEFAULT_PREFERENCES: GamePreferences = {
  gameMode: "local",
  aiDifficulty: "normal",
  soundEnabled: true
};

interface StoredPreferencesV3 extends GamePreferences {
  version: 3;
}

const isGameMode = (value: unknown): value is GameMode => value === "local" || value === "computer";
const isAiDifficulty = (value: unknown): value is AiDifficulty =>
  value === "easy" || value === "normal" || value === "hard" || value === "expert";

const copyDefaults = (): GamePreferences => ({ ...DEFAULT_PREFERENCES });

export const loadPreferences = (storage: StorageLike): GamePreferences => {
  const parsed = readStoredJson(storage, PREFERENCES_KEY);
  if (parsed === undefined) return copyDefaults();
  if (!isRecord(parsed)) {
    removeStoredValue(storage, PREFERENCES_KEY);
    return copyDefaults();
  }

  if (parsed.version === 1 && isGameMode(parsed.gameMode)) {
    const migrated: GamePreferences = {
      gameMode: parsed.gameMode,
      aiDifficulty: "normal",
      soundEnabled: true
    };
    savePreferences(storage, migrated);
    return migrated;
  }

  if (
    parsed.version === 2 &&
    isGameMode(parsed.gameMode) &&
    isAiDifficulty(parsed.aiDifficulty)
  ) {
    const migrated: GamePreferences = {
      gameMode: parsed.gameMode,
      aiDifficulty: parsed.aiDifficulty,
      soundEnabled: true
    };
    savePreferences(storage, migrated);
    return migrated;
  }

  if (
    parsed.version !== PREFERENCES_VERSION ||
    !isGameMode(parsed.gameMode) ||
    !isAiDifficulty(parsed.aiDifficulty) ||
    typeof parsed.soundEnabled !== "boolean"
  ) {
    removeStoredValue(storage, PREFERENCES_KEY);
    return copyDefaults();
  }

  return {
    gameMode: parsed.gameMode,
    aiDifficulty: parsed.aiDifficulty,
    soundEnabled: parsed.soundEnabled
  };
};

export const savePreferences = (storage: StorageLike, preferences: GamePreferences): void => {
  const payload: StoredPreferencesV3 = { version: PREFERENCES_VERSION, ...preferences };
  writeStoredJson(storage, PREFERENCES_KEY, payload);
};
