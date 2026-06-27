export interface RarityConfig {
  key: "common" | "uncommon" | "rare" | "epic" | "legendary";
  name: string;
  weight: number;      // Drop weight chance out of 100
  statMultiplier: number;
  valueMultiplier: number;
  color: string;       // HEX color
  rgbColor: string;    // CSS RGB string
}

export class RaritySystem {
  private static rarities: Record<string, RarityConfig> = {
    common: {
      key: "common",
      name: "Common",
      weight: 60,
      statMultiplier: 1.0,
      valueMultiplier: 1.0,
      color: "#9ca3af",
      rgbColor: "rgb(156, 163, 175)",
    },
    uncommon: {
      key: "uncommon",
      name: "Uncommon",
      weight: 24,
      statMultiplier: 1.3,
      valueMultiplier: 1.6,
      color: "#22c55e",
      rgbColor: "rgb(34, 197, 94)",
    },
    rare: {
      key: "rare",
      name: "Rare",
      weight: 11,
      statMultiplier: 1.8,
      valueMultiplier: 2.8,
      color: "#3b82f6",
      rgbColor: "rgb(59, 130, 246)",
    },
    epic: {
      key: "epic",
      name: "Epic",
      weight: 4,
      statMultiplier: 2.6,
      valueMultiplier: 5.5,
      color: "#a855f7",
      rgbColor: "rgb(168, 85, 247)",
    },
    legendary: {
      key: "legendary",
      name: "Legendary",
      weight: 1,
      statMultiplier: 4.0,
      valueMultiplier: 12.0,
      color: "#eab308",
      rgbColor: "rgb(234, 179, 8)",
    },
  };

  public static getConfig(rarityKey: string): RarityConfig {
    return this.rarities[rarityKey] || this.rarities.common;
  }

  // Chooses a random rarity based on weighted probabilities
  public static rollRarity(): "common" | "uncommon" | "rare" | "epic" | "legendary" {
    const roll = Math.random() * 100;
    let accum = 0;

    // Ordered lists for deterministic checks
    const keys: ("common" | "uncommon" | "rare" | "epic" | "legendary")[] = [
      "legendary",
      "epic",
      "rare",
      "uncommon",
      "common",
    ];

    for (const key of keys) {
      accum += this.rarities[key].weight;
      if (roll <= accum) {
        return key;
      }
    }

    return "common";
  }
}
