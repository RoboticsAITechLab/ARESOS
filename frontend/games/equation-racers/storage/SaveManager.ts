export interface VersionedStorageWrapper<T> {
  version: number;
  data: T;
}

export class SaveManager {
  private static CURRENT_SAVE_VERSION = 1;

  private static getStorage(): any {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof global !== "undefined" && (global as any).localStorage) {
      return (global as any).localStorage;
    }
    return null;
  }

  public static save<T>(key: string, data: T): void {
    const storage = this.getStorage();
    if (!storage) return;
    const wrapped: VersionedStorageWrapper<T> = {
      version: this.CURRENT_SAVE_VERSION,
      data
    };
    storage.setItem(key, JSON.stringify(wrapped));
  }

  public static load<T>(key: string, migrate: (loaded: any, version: number) => T): T | null {
    const storage = this.getStorage();
    if (!storage) return null;
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      const parsed: VersionedStorageWrapper<any> = JSON.parse(raw);
      if (parsed.version < this.CURRENT_SAVE_VERSION) {
        // Run migration pipeline for outdated save formats
        return migrate(parsed.data, parsed.version);
      }
      return parsed.data as T;
    } catch {
      return null;
    }
  }

  public static remove(key: string): void {
    const storage = this.getStorage();
    if (!storage) return;
    storage.removeItem(key);
  }
}
