export interface OfflineScope {
  tenantId: string;
  userId: string;
}

export function scopeKeyOf(scope: OfflineScope): string {
  return `${scope.tenantId}:${scope.userId}`;
}

export type OfflineStoreName =
  | "kv_cache"
  | "sync_queue"
  | "offline_auth"
  | "clock_state"
  | "fired_notifs"
  | "meta";

export interface OfflineStorageBackend {
  get<T = any>(store: OfflineStoreName, key: string): Promise<T | null>;
  put<T = any>(store: OfflineStoreName, key: string, value: T): Promise<void>;
  delete(store: OfflineStoreName, key: string): Promise<void>;
  getAll<T = any>(store: OfflineStoreName): Promise<Array<{ key: string; value: T }>>;
  clearStore(store: OfflineStoreName): Promise<void>;
}

const DB_NAME = "melktak_offline_v1";
const DB_VERSION = 1;
const STORES: OfflineStoreName[] = [
  "kv_cache",
  "sync_queue",
  "offline_auth",
  "clock_state",
  "fired_notifs",
  "meta",
];

export class MemoryOfflineBackend implements OfflineStorageBackend {
  private tables = new Map<OfflineStoreName, Map<string, any>>();

  constructor() {
    for (const name of STORES) {
      this.tables.set(name, new Map());
    }
  }

  async get<T = any>(store: OfflineStoreName, key: string): Promise<T | null> {
    const val = this.tables.get(store)?.get(key);
    return val === undefined ? null : structuredClone(val);
  }

  async put<T = any>(store: OfflineStoreName, key: string, value: T): Promise<void> {
    this.tables.get(store)?.set(key, structuredClone(value));
  }

  async delete(store: OfflineStoreName, key: string): Promise<void> {
    this.tables.get(store)?.delete(key);
  }

  async getAll<T = any>(store: OfflineStoreName): Promise<Array<{ key: string; value: T }>> {
    const entries: Array<{ key: string; value: T }> = [];
    for (const [k, v] of this.tables.get(store)?.entries() || []) {
      entries.push({ key: k, value: structuredClone(v) });
    }
    return entries;
  }

  async clearStore(store: OfflineStoreName): Promise<void> {
    this.tables.get(store)?.clear();
  }
}

class IndexedDbOfflineBackend implements OfflineStorageBackend {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallback = new MemoryOfflineBackend();

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("IndexedDB unavailable"));
    }
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name);
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open error"));
    });
    return this.dbPromise;
  }

  async get<T = any>(store: OfflineStoreName, key: string): Promise<T | null> {
    try {
      const db = await this.openDb();
      return await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const os = tx.objectStore(store);
        const req = os.get(key);
        req.onsuccess = () => resolve(req.result === undefined ? null : (req.result as T));
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.fallback.get<T>(store, key);
    }
  }

  async put<T = any>(store: OfflineStoreName, key: string, value: T): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const os = tx.objectStore(store);
        const req = os.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      await this.fallback.put(store, key, value);
    }
  }

  async delete(store: OfflineStoreName, key: string): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const os = tx.objectStore(store);
        const req = os.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      await this.fallback.delete(store, key);
    }
  }

  async getAll<T = any>(store: OfflineStoreName): Promise<Array<{ key: string; value: T }>> {
    try {
      const db = await this.openDb();
      return await new Promise<Array<{ key: string; value: T }>>((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const os = tx.objectStore(store);
        const results: Array<{ key: string; value: T }> = [];
        const req = os.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve(results);
            return;
          }
          results.push({ key: String(cursor.key), value: cursor.value as T });
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.fallback.getAll<T>(store);
    }
  }

  async clearStore(store: OfflineStoreName): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const os = tx.objectStore(store);
        const req = os.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      await this.fallback.clearStore(store);
    }
  }
}

export class OfflineStoreManager {
  private backend: OfflineStorageBackend;

  constructor(backend?: OfflineStorageBackend) {
    this.backend =
      backend ||
      (typeof indexedDB !== "undefined"
        ? new IndexedDbOfflineBackend()
        : new MemoryOfflineBackend());
  }

  setBackend(backend: OfflineStorageBackend) {
    this.backend = backend;
  }

  async getScopedValue<T = any>(
    store: OfflineStoreName,
    scope: OfflineScope,
    subKey: string,
  ): Promise<T | null> {
    const fullKey = `${scopeKeyOf(scope)}::${subKey}`;
    return this.backend.get<T>(store, fullKey);
  }

  async setScopedValue<T = any>(
    store: OfflineStoreName,
    scope: OfflineScope,
    subKey: string,
    value: T,
  ): Promise<void> {
    const fullKey = `${scopeKeyOf(scope)}::${subKey}`;
    await this.backend.put<T>(store, fullKey, value);
  }

  async deleteScopedValue(
    store: OfflineStoreName,
    scope: OfflineScope,
    subKey: string,
  ): Promise<void> {
    const fullKey = `${scopeKeyOf(scope)}::${subKey}`;
    await this.backend.delete(store, fullKey);
  }

  async listScopedValues<T = any>(
    store: OfflineStoreName,
    scope: OfflineScope,
    subPrefix = "",
  ): Promise<Array<{ subKey: string; value: T }>> {
    const prefix = `${scopeKeyOf(scope)}::${subPrefix}`;
    const basePrefix = `${scopeKeyOf(scope)}::`;
    const all = await this.backend.getAll<T>(store);
    return all
      .filter((entry) => entry.key.startsWith(prefix))
      .map((entry) => ({
        subKey: entry.key.slice(basePrefix.length),
        value: entry.value,
      }));
  }

  async getMeta<T = any>(key: string): Promise<T | null> {
    return this.backend.get<T>("meta", key);
  }

  async setMeta<T = any>(key: string, value: T): Promise<void> {
    await this.backend.put<T>("meta", key, value);
  }

  async deleteMeta(key: string): Promise<void> {
    await this.backend.delete("meta", key);
  }

  async getAllFromStore<T = any>(store: OfflineStoreName): Promise<Array<{ key: string; value: T }>> {
    return this.backend.getAll<T>(store);
  }

  async putRaw<T = any>(store: OfflineStoreName, key: string, value: T): Promise<void> {
    await this.backend.put<T>(store, key, value);
  }

  async getRaw<T = any>(store: OfflineStoreName, key: string): Promise<T | null> {
    return this.backend.get<T>(store, key);
  }

  async deleteRaw(store: OfflineStoreName, key: string): Promise<void> {
    await this.backend.delete(store, key);
  }

  async clearScopeData(scope: OfflineScope, includeAuth = false): Promise<void> {
    const prefix = `${scopeKeyOf(scope)}::`;
    const stores: OfflineStoreName[] = includeAuth
      ? ["kv_cache", "sync_queue", "fired_notifs", "offline_auth"]
      : ["kv_cache", "sync_queue", "fired_notifs"];
    for (const storeName of stores) {
      const all = await this.backend.getAll(storeName);
      for (const item of all) {
        if (item.key.startsWith(prefix) || item.key === scopeKeyOf(scope)) {
          await this.backend.delete(storeName, item.key);
        }
      }
    }
  }
}

export const offlineStore = new OfflineStoreManager();
