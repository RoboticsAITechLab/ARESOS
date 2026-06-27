import { Item } from "./Item";
import { EventBus } from "./EventBus";
import { StatsSystem } from "./StatsSystem";

export type EquipSlot = "weapon" | "helmet" | "chest" | "legs" | "boots" | "ring" | "amulet";

export class EquipmentSystem {
  private equipped: Record<EquipSlot, Item | null> = {
    weapon: null,
    helmet: null,
    chest: null,
    legs: null,
    boots: null,
    ring: null,
    amulet: null,
  };
  
  private statsSystem: StatsSystem;

  constructor(statsSystem: StatsSystem, initialEquipped?: Record<string, Item | null>) {
    this.statsSystem = statsSystem;

    if (initialEquipped) {
      const slots: EquipSlot[] = ["weapon", "helmet", "chest", "legs", "boots", "ring", "amulet"];
      for (const slot of slots) {
        if (initialEquipped[slot]) {
          this.equipped[slot] = initialEquipped[slot];
        }
      }
    }
    
    // Recalculate base stats
    this.statsSystem.recalculate(this.equipped as any);
  }

  public getEquipped(): Record<EquipSlot, Item | null> {
    return this.equipped;
  }

  // Equips an item to its designated slot, returning any previously equipped item
  public equip(item: Item): Item | null {
    if (item.type !== "weapon" && item.type !== "armor") return null;

    const slot = item.stats?.attack ? "weapon" : (item.stats as any).defense ? "chest" : "ring"; // fallback estimation if slot missing
    const finalSlot = (item as any).slot || slot;

    if (!this.isValidSlot(finalSlot)) return null;

    const prevItem = this.equipped[finalSlot as EquipSlot];
    this.equipped[finalSlot as EquipSlot] = item;

    // Trigger stat updates
    this.statsSystem.recalculate(this.equipped as any);
    EventBus.emit("equipment_changed", this.equipped);

    return prevItem;
  }

  // Unequips a slot and returns the item
  public unequip(slot: EquipSlot): Item | null {
    if (!this.equipped[slot]) return null;

    const item = this.equipped[slot];
    this.equipped[slot] = null;

    // Trigger stat updates
    this.statsSystem.recalculate(this.equipped as any);
    EventBus.emit("equipment_changed", this.equipped);

    return item;
  }

  private isValidSlot(slot: string): boolean {
    return ["weapon", "helmet", "chest", "legs", "boots", "ring", "amulet"].includes(slot);
  }
}
