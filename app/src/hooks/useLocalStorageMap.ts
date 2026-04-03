import { useState, useCallback } from 'react';

type StorageMap<T> = Record<string, T>;

function loadFromStorage<T>(key: string): StorageMap<T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage<T>(key: string, data: StorageMap<T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // silently ignore if localStorage unavailable
  }
}

/**
 * Generic hook for managing a keyed map persisted in localStorage.
 * Used by favorites, pinned messages, reactions, etc.
 */
export function useLocalStorageMap<T>(storageKey: string) {
  const [data, setData] = useState<StorageMap<T>>(() => loadFromStorage<T>(storageKey));

  const get = useCallback((key: string): T | undefined => data[key], [data]);

  const set = useCallback(
    (key: string, value: T) => {
      setData((prev) => {
        const next = { ...prev, [key]: value };
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const remove = useCallback(
    (key: string) => {
      setData((prev) => {
        const next = { ...prev };
        delete next[key];
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const update = useCallback(
    (key: string, updater: (prev: T | undefined) => T) => {
      setData((prev) => {
        const next = { ...prev, [key]: updater(prev[key]) };
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  return { data, get, set, remove, update };
}
