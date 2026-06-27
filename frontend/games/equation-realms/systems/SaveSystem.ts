import { Item } from "./Item";

export interface SaveData {
  version: string;
  seed: number;
  player: {
    x: number;
    y: number;
  };
  hp: number;
  xp: number;
  coins: number;
  inventory: (Item | null)[];
  equipped: Record<string, Item | null>;
  worldTime: number;
  difficulty: number;
  chunk: {
    x: number;
    y: number;
  };
  timestamp: number;
  discoveredLandmarks?: string[];
}

export class SaveSystem {
  private static STORAGE_KEY = "aresos_eqrealms_save";
  private static CURRENT_VERSION = "1.0.0";

  // Generates a random 6-digit seed
  public static generateNewSeed(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  // Saves the game state
  public static save(
    seed: number,
    playerX: number,
    playerY: number,
    hp: number,
    xp: number,
    coins: number,
    inventory: (Item | null)[],
    equipped: Record<string, Item | null>,
    worldTime: number,
    difficulty: number,
    chunkX: number,
    chunkY: number,
    discoveredLandmarks: string[]
  ): void {
    const saveData: SaveData = {
      version: this.CURRENT_VERSION,
      seed,
      player: {
        x: Math.round(playerX),
        y: Math.round(playerY),
      },
      hp,
      xp,
      coins,
      inventory,
      equipped,
      worldTime: Math.round(worldTime),
      difficulty,
      chunk: {
        x: chunkX,
        y: chunkY,
      },
      timestamp: Math.floor(Date.now() / 1000),
      discoveredLandmarks,
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error("Equation Realms: Failed to save game state to LocalStorage", e);
    }
  }

  // Loads the game state and handles migrations if necessary
  public static load(): SaveData | null {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) return null;

      const rawData = JSON.parse(dataStr);
      if (!rawData || typeof rawData !== "object") return null;

      // Handle migrations based on version
      const migratedData = this.migrate(rawData);
      return migratedData;
    } catch (e) {
      console.error("Equation Realms: Failed to load game state from LocalStorage", e);
      return null;
    }
  }

  // Migration helper
  private static migrate(data: any): SaveData {
    const dataVersion = data.version || "0.0.0";

    if (dataVersion === this.CURRENT_VERSION && typeof data.coins === "number" && Array.isArray(data.inventory)) {
      return {
        ...data,
        discoveredLandmarks: Array.isArray(data.discoveredLandmarks) ? data.discoveredLandmarks : [],
      } as SaveData;
    }

    console.log(`Equation Realms: Migrating save data from version ${dataVersion} to ${this.CURRENT_VERSION}`);
    
    return {
      version: this.CURRENT_VERSION,
      seed: typeof data.seed === "number" ? data.seed : this.generateNewSeed(),
      player: {
        x: (data.player && typeof data.player.x === "number") ? data.player.x : 0,
        y: (data.player && typeof data.player.y === "number") ? data.player.y : 0,
      },
      hp: typeof data.hp === "number" ? data.hp : 100,
      xp: typeof data.xp === "number" ? data.xp : 0,
      coins: typeof data.coins === "number" ? data.coins : 0,
      inventory: Array.isArray(data.inventory) ? data.inventory : Array(24).fill(null),
      equipped: (data.equipped && typeof data.equipped === "object") ? data.equipped : {
        weapon: null, helmet: null, chest: null, legs: null, boots: null, ring: null, amulet: null
      },
      worldTime: typeof data.worldTime === "number" ? data.worldTime : 0,
      difficulty: typeof data.difficulty === "number" ? data.difficulty : 1,
      chunk: {
        x: (data.chunk && typeof data.chunk.x === "number") ? data.chunk.x : 0,
        y: (data.chunk && typeof data.chunk.y === "number") ? data.chunk.y : 0,
      },
      timestamp: typeof data.timestamp === "number" ? data.timestamp : Math.floor(Date.now() / 1000),
      discoveredLandmarks: Array.isArray(data.discoveredLandmarks) ? data.discoveredLandmarks : [],
    };
  }

  // Clears the save file
  public static clearSave(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.error("Equation Realms: Failed to clear save data", e);
    }
  }
}
