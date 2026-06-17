const DB_NAME = "ARESOS_DB";
const DB_VERSION = 1;

export interface DBNode {
  path: string; // absolute path as key, e.g. "/" or "/home/user/Welcome.txt"
  name: string;
  type: "file" | "directory";
  createdAt: number;
  updatedAt: number;
  content: string;
  size: number;
  extension?: string;
  binaryData?: Uint8Array;
  childrenKeys?: string[]; // list of absolute paths of children (for directory nodes)
}

function getIDB(): IDBFactory | undefined {
  if (typeof window !== "undefined" && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).indexedDB) {
    return (globalThis as any).indexedDB;
  }
  return undefined;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = getIDB();
    if (!idb) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("filesystem")) {
        db.createObjectStore("filesystem", { keyPath: "path" });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
      if (!db.objectStoreNames.contains("archives")) {
        db.createObjectStore("archives");
      }
    };
  });
}

export async function putNode(node: DBNode): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("filesystem", "readwrite");
    const store = tx.objectStore("filesystem");
    const req = store.put(node);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNodeFromDB(path: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("filesystem", "readwrite");
    const store = tx.objectStore("filesystem");
    const req = store.delete(path);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllNodes(): Promise<DBNode[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("filesystem", "readonly");
    const store = tx.objectStore("filesystem");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putMetadata(key: string, value: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readwrite");
    const store = tx.objectStore("metadata");
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMetadata(key: string): Promise<any> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readonly");
    const store = tx.objectStore("metadata");
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["filesystem", "metadata", "settings", "archives"], "readwrite");
    tx.objectStore("filesystem").clear();
    tx.objectStore("metadata").clear();
    tx.objectStore("settings").clear();
    tx.objectStore("archives").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface StorageStats {
  backend: string;
  quota: number;
  used: number;
  available: number;
}

export async function getStorageStats(): Promise<StorageStats> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    const quota = est.quota || 0;
    const used = est.usage || 0;
    const available = Math.max(0, quota - used);
    return {
      backend: "IndexedDB",
      quota,
      used,
      available
    };
  }
  return {
    backend: "IndexedDB (Fallback)",
    quota: 2 * 1024 * 1024 * 1024, // 2 GB
    used: 0,
    available: 2 * 1024 * 1024 * 1024
  };
}
