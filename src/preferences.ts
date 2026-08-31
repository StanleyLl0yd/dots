import type { AiDifficulty } from "./game/ai";
import type { StorageLike } from "./persistence";

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
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (!raw) return copyDefaults();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || !("version" in parsed)) {
      storage.removeItem(PREFERENCES_KEY);
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
      storage.removeItem(PREFERENCES_KEY);
      return copyDefaults();
    }

    return { gameMode: candidate.gameMode, aiDifficulty: candidate.aiDifficulty };
  } catch {
    try {
      storage.removeItem(PREFERENCES_KEY);
    } catch {}
    return copyDefaults();
  }
};

export const savePreferences = (storage: StorageLike, preferences: GamePreferences): void => {
  try {
    const payload: StoredPreferencesV2 = { version: PREFERENCES_VERSION, ...preferences };
    storage.setItem(PREFERENCES_KEY, JSON.stringify(payload));
  } catch {}
};
