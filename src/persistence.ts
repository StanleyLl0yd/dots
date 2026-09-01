import { createSession, playMove, type GameSession } from "./game/session";
import type { Point } from "./game/types";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "dots.game";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredGame {
  version: number;
  moves: Point[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePoint = (value: unknown): Point | undefined => {
  if (!isRecord(value) || !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.y)) return undefined;
  return { x: value.x as number, y: value.y as number };
};

export const loadSession = (storage: StorageLike): GameSession | undefined => {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return undefined;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !Array.isArray(parsed.moves)) {
      storage.removeItem(SAVE_KEY);
      return undefined;
    }

    let session = createSession();
    for (const rawMove of parsed.moves) {
      const point = parsePoint(rawMove);
      if (!point) {
        storage.removeItem(SAVE_KEY);
        return undefined;
      }

      const next = playMove(session, point);
      if (next === session) {
        storage.removeItem(SAVE_KEY);
        return undefined;
      }
      session = next;
    }

    return session;
  } catch {
    try {
      storage.removeItem(SAVE_KEY);
    } catch {}
    return undefined;
  }
};

export const saveSession = (storage: StorageLike, session: GameSession): void => {
  try {
    const payload: StoredGame = {
      version: SAVE_VERSION,
      moves: session.history.map(({ placed }) => ({ ...placed }))
    };
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {}
};

export const clearSavedGame = (storage: StorageLike): void => {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {}
};
