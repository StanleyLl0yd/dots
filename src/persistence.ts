import { createSession, playMove, type GameSession } from "./game/session";
import type { Point } from "./game/types";
import { isRecord, readStoredJson, removeStoredValue, writeStoredJson, type StorageLike } from "./storage";

export type { StorageLike } from "./storage";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "dots.game";

interface StoredGame {
  version: number;
  moves: Point[];
}

const parsePoint = (value: unknown): Point | undefined => {
  if (!isRecord(value) || !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.y)) return undefined;
  return { x: value.x as number, y: value.y as number };
};

export const loadSession = (storage: StorageLike): GameSession | undefined => {
  const parsed = readStoredJson(storage, SAVE_KEY);
  if (parsed === undefined) return undefined;
  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !Array.isArray(parsed.moves)) {
    removeStoredValue(storage, SAVE_KEY);
    return undefined;
  }

  let session = createSession();
  for (const rawMove of parsed.moves) {
    const point = parsePoint(rawMove);
    if (!point) {
      removeStoredValue(storage, SAVE_KEY);
      return undefined;
    }

    const next = playMove(session, point);
    if (next === session) {
      removeStoredValue(storage, SAVE_KEY);
      return undefined;
    }
    session = next;
  }

  return session;
};

export const saveSession = (storage: StorageLike, session: GameSession): void => {
  const payload: StoredGame = {
    version: SAVE_VERSION,
    moves: session.history.map(({ placed }) => ({ ...placed }))
  };
  writeStoredJson(storage, SAVE_KEY, payload);
};

export const clearSavedGame = (storage: StorageLike): void => {
  removeStoredValue(storage, SAVE_KEY);
};
