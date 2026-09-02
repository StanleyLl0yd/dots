import { describe, expect, it } from "vitest";
import { readStoredJson, removeStoredValue, writeStoredJson, type StorageLike } from "./storage";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  throwOnGet = false;
  throwOnSet = false;
  throwOnRemove = false;

  getItem(key: string): string | null {
    if (this.throwOnGet) throw new Error("get failed");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error("set failed");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.throwOnRemove) throw new Error("remove failed");
    this.values.delete(key);
  }
}

describe("storage helpers", () => {
  it("reads missing and valid JSON values", () => {
    const storage = new MemoryStorage();
    expect(readStoredJson(storage, "key")).toBeUndefined();

    storage.values.set("key", JSON.stringify({ value: 1 }));
    expect(readStoredJson(storage, "key")).toEqual({ value: 1 });
  });

  it("removes malformed data and tolerates storage read failures", () => {
    const storage = new MemoryStorage();
    storage.values.set("key", "not-json");
    expect(readStoredJson(storage, "key")).toBeUndefined();
    expect(storage.values.has("key")).toBe(false);

    storage.throwOnGet = true;
    expect(readStoredJson(storage, "key")).toBeUndefined();
  });

  it("writes JSON and tolerates write failures", () => {
    const storage = new MemoryStorage();
    writeStoredJson(storage, "key", { value: 1 });
    expect(storage.values.get("key")).toBe('{"value":1}');

    storage.throwOnSet = true;
    expect(() => writeStoredJson(storage, "key", { value: 2 })).not.toThrow();
  });

  it("removes values and tolerates remove failures", () => {
    const storage = new MemoryStorage();
    storage.values.set("key", "value");
    removeStoredValue(storage, "key");
    expect(storage.values.has("key")).toBe(false);

    storage.throwOnRemove = true;
    expect(() => removeStoredValue(storage, "key")).not.toThrow();
  });
});
