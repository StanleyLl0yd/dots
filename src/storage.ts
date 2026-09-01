export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const removeStoredValue = (storage: StorageLike, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {}
};

export const readStoredJson = (storage: StorageLike, key: string): unknown | undefined => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    removeStoredValue(storage, key);
    return undefined;
  }
};

export const writeStoredJson = (storage: StorageLike, key: string, value: unknown): void => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
};
