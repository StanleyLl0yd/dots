import type { AiDifficulty } from "./game/ai";
import { readStoredJson, removeStoredValue, writeStoredJson, type StorageLike } from "./storage";

export type GameMode = "local" | "computer";

export interface GamePreferences {
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
}

export const PREFERENCES_VERSION = 2;
export const PREFERENCES_KEY = "dots.preferences";
export const DEFAULT_PREFERENCES: GamePreferences = { gameMode: "local", aiDifficulty: "normal" };

interface StoredPreferencesV2 extends GamePreferences {
  version: 2;
}

const isGameMode = (value: unknown): value is GameMode => value === "local" || value === "computer";
const isAiDifficulty = (value: unknown): value is AiDifficulty =>
  value === "easy" || value === "normal" || value === "hard" || value === "expert";

const copyDefaults = (): GamePreferences => ({ ...DEFAULT_PREFERENCES });

export const loadPreferences = (storage: StorageLike): GamePreferences => {
  const parsed = readStoredJson(storage, PREFERENCES_KEY);
  if (parsed === undefined) return copyDefaults();
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || !("version" in parsed)) {
    removeStoredValue(storage, PREFERENCES_KEY);
    return copyDefaults();
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.version === 1 && isGameMode(candidate.gameMode)) {
    const migrated: GamePreferences = { gameMode: candidate.gameMode, aiDifficulty: "normal" };
    savePreferences(storage, migrated);
    return migrated;
  }

  if (
    candidate.version !== PREFERENCES_VERSION ||
    !isGameMode(candidate.gameMode) ||
    !isAiDifficulty(candidate.aiDifficulty)
  ) {
    removeStoredValue(storage, PREFERENCES_KEY);
    return copyDefaults();
  }

  return { gameMode: candidate.gameMode, aiDifficulty: candidate.aiDifficulty };
};

export const savePreferences = (storage: StorageLike, preferences: GamePreferences): void => {
  const payload: StoredPreferencesV2 = { version: PREFERENCES_VERSION, ...preferences };
  writeStoredJson(storage, PREFERENCES_KEY, payload);
};
