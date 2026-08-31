import type { StorageLike } from "./persistence";

export type GameMode = "local" | "computer";

export const PREFERENCES_VERSION = 1;
export const PREFERENCES_KEY = "dots.preferences";
export const DEFAULT_GAME_MODE: GameMode = "local";

interface StoredPreferences {
  version: number;
  gameMode: GameMode;
}

const isGameMode = (value: unknown): value is GameMode => value === "local" || value === "computer";

export const loadGameMode = (storage: StorageLike): GameMode => {
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_GAME_MODE;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed) ||
      !("version" in parsed) ||
      !("gameMode" in parsed)
    ) {
      storage.removeItem(PREFERENCES_KEY);
      return DEFAULT_GAME_MODE;
    }

    const candidate = parsed as Record<string, unknown>;
    if (candidate.version !== PREFERENCES_VERSION || !isGameMode(candidate.gameMode)) {
      storage.removeItem(PREFERENCES_KEY);
      return DEFAULT_GAME_MODE;
    }

    return candidate.gameMode;
  } catch {
    try {
      storage.removeItem(PREFERENCES_KEY);
    } catch {}
    return DEFAULT_GAME_MODE;
  }
};

export const saveGameMode = (storage: StorageLike, gameMode: GameMode): void => {
  try {
    const payload: StoredPreferences = { version: PREFERENCES_VERSION, gameMode };
    storage.setItem(PREFERENCES_KEY, JSON.stringify(payload));
  } catch {}
};
