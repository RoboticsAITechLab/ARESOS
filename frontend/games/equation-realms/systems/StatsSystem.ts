import { Item } from "./Item";
import { EventBus } from "./EventBus";

export interface CombatStats {
  attack: number;
  defense: number;
  health: number;
  speed: number;
  criticalChance: number;
}

export class StatsSystem {
  private baseStats: CombatStats = {
    attack: 16,
    defense: 5,
    health: 100,
    speed: 180,
    criticalChance: 5,
  };

  private equipmentStats: CombatStats = {
    attack: 0,
    defense: 0,
    health: 0,
    speed: 0,
    criticalChance: 0,
  };

  private finalStats: CombatStats = { ...this.baseStats };

  constructor() {
    this.recalculate({});
  }

  // Recalculates final totals by combining base stats and equipped items
  public recalculate(equippedItems: Record<string, Item | null>): void {
    // Reset equipment modifiers
    this.equipmentStats = {
      attack: 0,
      defense: 0,
      health: 0,
      speed: 0,
      criticalChance: 0,
    };

    // Sum all equipped items stats
    for (const item of Object.values(equippedItems)) {
      if (item && item.stats) {
        if (item.stats.attack) this.equipmentStats.attack += item.stats.attack;
        if (item.stats.defense) this.equipmentStats.defense += item.stats.defense;
        if (item.stats.health) this.equipmentStats.health += item.stats.health;
        if (item.stats.speed) this.equipmentStats.speed += item.stats.speed;
        if (item.stats.criticalChance) this.equipmentStats.criticalChance += item.stats.criticalChance;
      }
    }

    // Calculate final stats: Base + Equipment + Future Equation bonuses
    this.finalStats.attack = this.baseStats.attack + this.equipmentStats.attack;
    this.finalStats.defense = this.baseStats.defense + this.equipmentStats.defense;
    this.finalStats.health = this.baseStats.health + this.equipmentStats.health;
    this.finalStats.speed = this.baseStats.speed + this.equipmentStats.speed;
    this.finalStats.criticalChance = this.baseStats.criticalChance + this.equipmentStats.criticalChance;

    // Trigger update notification
    EventBus.emit("player_stats_recalculated", this.finalStats);
  }

  public getFinalStats(): CombatStats {
    return this.finalStats;
  }

  public getBaseStats(): CombatStats {
    return this.baseStats;
  }

  public getEquipmentStats(): CombatStats {
    return this.equipmentStats;
  }
}
