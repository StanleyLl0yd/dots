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
  it("restores the legal move log, game state, and undo history", async () => {
    const storage = new MemoryStorage();
    let session = await createSession();
    session = await playMove(session, { x: 0, y: 0 });
    session = await playMove(session, { x: 4, y: 4 });
    session = await playMove(session, { x: 1, y: 0 });
    saveSession(storage, session);

    const restored = await loadSession(storage);

    expect(restored?.history).toHaveLength(3);
    expect(restored?.state.stones.size).toBe(3);
    expect(restored?.state.currentPlayer).toBe("blue");
    expect(restored?.state.stones.get("1:0")?.player).toBe("red");
  });

  it("rebuilds captures and score from persisted moves instead of stored derived state", async () => {
    const storage = new MemoryStorage();
    let session = await createSession();
    for (const point of [
      { x: 0, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 10, y: 10 },
      { x: -1, y: 0 },
      { x: 11, y: 10 },
      { x: 0, y: 1 }
    ]) {
      session = await playMove(session, point);
    }
    saveSession(storage, session);

    const restored = await loadSession(storage);

    expect(restored?.state.captures).toHaveLength(1);
    expect(restored?.state.score).toEqual({ red: 1, blue: 0 });
  });

  it("rejects an unsupported save version", async () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, moves: [] }));

    expect(await loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("rejects a move log containing an illegal repeated move", async () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({
      version: SAVE_VERSION,
      moves: [{ x: 0, y: 0 }, { x: 0, y: 0 }]
    }));

    expect(await loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("rejects malformed saved coordinates", async () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, moves: [{ x: 1.5, y: 0 }] }));

    expect(await loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("rejects unsafe saved coordinates", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, moves: [{ x: Number.MAX_SAFE_INTEGER + 1, y: 0 }] })
    );

    expect(await loadSession(storage)).toBeUndefined();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("clears a saved game", async () => {
    const storage = new MemoryStorage();
    const initial = await createSession();
    const moved = await playMove(initial, { x: 0, y: 0 });
    saveSession(storage, moved);
    clearSavedGame(storage);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});
