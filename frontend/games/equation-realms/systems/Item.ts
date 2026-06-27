export interface Item {
  id: string;
  name: string;
  type: "weapon" | "armor" | "consumable" | "material" | "quest";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  value: number;
  stats?: {
    attack?: number;
    defense?: number;
    health?: number;
    speed?: number;
    criticalChance?: number;
  };
  quantity?: number; // Stack count (for consumable/material)
}
