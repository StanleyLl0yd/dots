import { describe, expect, it } from "vitest";
import { createSession, playMove } from "./game/session";
import { clearSavedGame, loadSession, SAVE_KEY, SAVE_VERSION, saveSession, type StorageLike } from "./persistence";

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

describe("game persistence", () => {
  it("restores the legal move log, game state, and undo history", () => {
    const storage = new MemoryStorage();
    let session = createSession();
    session = playMove(session, { x: 0, y: 0 });
    session = playMove(session, { x: 4, y: 4 });
    session = playMove(session, { x: 1, y: 0 });
    saveSession(storage, session);

    const restored = loadSession(storage);

    expect(restored?.history).toHaveLength(3);
    expect(restored?.state.stones.size).toBe(3);
    expect(restored?.state.currentPlayer).toBe("blue");
    expect(restored?.state.stones.get("1:0")?.player).toBe("red");
  });

  it("rebuilds captures and score from persisted moves instead of stored derived state", () => {
    const storage = new MemoryStorage();
    let session = createSession();
    for (const point of [
      { x: 0, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: 10 },
      { x: -1, y: 0 },
      { x: 11, y: 10 },
      { x: 0, y: 1 }
    ]) {
      session = playMove(session, point);
    }
    saveSession(storage, session);

    const restored = loadSession(storage);

    expect(restored?.state.captures).toHaveLength(1);
    expect(restored?.state.score).toEqual({ red: 1, blue: 0 });
  });

  it("rejects an unsupported save version", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, moves: [] }));

    expect(loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("rejects a move log containing an illegal repeated move", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: SAVE_VERSION,
      moves: [{ x: 0, y: 0 }, { x: 0, y: 0 }]
    }));

    expect(loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("rejects malformed saved coordinates", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, moves: [{ x: 1.5, y: 0 }] }));

    expect(loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("clears a saved game", () => {
    const storage = new MemoryStorage();
    saveSession(storage, playMove(createSession(), { x: 0, y: 0 }));
    clearSavedGame(storage);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});
