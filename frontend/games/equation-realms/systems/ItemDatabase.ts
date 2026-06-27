export interface BaseItemTemplate {
  name: string;
  type: "weapon" | "armor" | "consumable" | "material" | "quest";
  slot?: "weapon" | "helmet" | "chest" | "legs" | "boots" | "ring" | "amulet";
  baseValue: number;
  baseStats?: {
    attack?: number;
    defense?: number;
    health?: number;
    speed?: number;
    criticalChance?: number;
  };
}

export class ItemDatabase {
  // Prefixes affect stats and styling
  public static Prefixes = [
    { text: "Rusty", statMod: 0.7 },
    { text: "Dull", statMod: 0.8 },
    { text: "Heavy", statMod: 1.1 },
    { text: "Sharp", statMod: 1.2 },
    { text: "Glinting", statMod: 1.3 },
    { text: "Ancient", statMod: 1.5 },
    { text: "Prime", statMod: 1.8 },
    { text: "Cosmic", statMod: 2.2 },
  ];

  // Suffixes add specific stat bonuses
  public static Suffixes = [
    { text: "of the Bear", stat: "health", bonus: 15 },
    { text: "of the Tiger", stat: "attack", bonus: 6 },
    { text: "of the Cheetah", stat: "speed", bonus: 10 },
    { text: "of the Turtle", stat: "defense", bonus: 5 },
    { text: "of the Hawk", stat: "criticalChance", bonus: 3 },
  ];

  // Base templates
  public static Templates: BaseItemTemplate[] = [
    // Weapons
    { name: "Sword", type: "weapon", slot: "weapon", baseValue: 15, baseStats: { attack: 8, criticalChance: 2 } },
    { name: "Axe", type: "weapon", slot: "weapon", baseValue: 20, baseStats: { attack: 12, speed: -5 } },
    { name: "Dagger", type: "weapon", slot: "weapon", baseValue: 12, baseStats: { attack: 4, speed: 12, criticalChance: 6 } },
    { name: "Staff", type: "weapon", slot: "weapon", baseValue: 18, baseStats: { attack: 6, health: 10 } },
    
    // Armor - Helmet
    { name: "Iron Helmet", type: "armor", slot: "helmet", baseValue: 10, baseStats: { defense: 3, health: 5 } },
    { name: "Leather Cap", type: "armor", slot: "helmet", baseValue: 6, baseStats: { defense: 1, speed: 4 } },

    // Armor - Chest
    { name: "Chainmail", type: "armor", slot: "chest", baseValue: 30, baseStats: { defense: 8, health: 20, speed: -4 } },
    { name: "Tunic", type: "armor", slot: "chest", baseValue: 10, baseStats: { defense: 2, speed: 6 } },

    // Armor - Legs
    { name: "Plate Greaves", type: "armor", slot: "legs", baseValue: 25, baseStats: { defense: 6, health: 12 } },
    { name: "Cloth Pants", type: "armor", slot: "legs", baseValue: 8, baseStats: { defense: 1, speed: 5 } },

    // Armor - Boots
    { name: "Iron Sabatons", type: "armor", slot: "boots", baseValue: 12, baseStats: { defense: 2, health: 5 } },
    { name: "Leather Boots", type: "armor", slot: "boots", baseValue: 10, baseStats: { speed: 8 } },

    // Armor - Rings & Amulets
    { name: "Ruby Ring", type: "armor", slot: "ring", baseValue: 25, baseStats: { health: 15, attack: 3 } },
    { name: "Emerald Necklace", type: "armor", slot: "amulet", baseValue: 30, baseStats: { defense: 4, speed: 5 } },

    // Consumables
    { name: "Health Potion", type: "consumable", baseValue: 5, baseStats: { health: 30 } },
    { name: "Speed Elixir", type: "consumable", baseValue: 8, baseStats: { speed: 20 } },

    // Materials
    { name: "Iron Ore", type: "material", baseValue: 3 },
    { name: "Wood Log", type: "material", baseValue: 2 },
    { name: "Wolf Pelt", type: "material", baseValue: 5 },
    { name: "Goblin Relic", type: "material", baseValue: 12 },

    // Quest Items
    { name: "Rusty Key", type: "quest", baseValue: 0 },
    { name: "Glowing Crypt Crest", type: "quest", baseValue: 0 },
  ];
}
