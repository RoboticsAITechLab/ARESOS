import { Item } from "./Item";
import { EventBus } from "./EventBus";

export class InventorySystem {
  private items: (Item | null)[] = [];
  private size = 24;
  private selectedIndex: number | null = null;

  constructor(initialItems?: (Item | null)[]) {
    this.size = 24;
    if (initialItems && initialItems.length === this.size) {
      this.items = [...initialItems];
    } else {
      this.items = Array(this.size).fill(null);
    }
  }

  public getItems(): (Item | null)[] {
    return this.items;
  }

  public getOccupiedSlotsCount(): number {
    return this.items.filter((item) => item !== null).length;
  }

  public getSize(): number {
    return this.size;
  }

  // Adds an item to the inventory (handles stacking for consumables & materials)
  public addItem(item: Item): boolean {
    const isStackable = item.type === "consumable" || item.type === "material";

    if (isStackable) {
      // Find matching item in inventory to stack
      const existing = this.items.find(
        (i) => i !== null && i.name === item.name && i.type === item.type && i.rarity === item.rarity
      );

      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        EventBus.emit("inventory_changed", this.items);
        return true;
      }
    }

    // Find first empty slot
    const emptyIndex = this.items.indexOf(null);
    if (emptyIndex !== -1) {
      this.items[emptyIndex] = item;
      EventBus.emit("inventory_changed", this.items);
      return true;
    }

    // Inventory full
    return false;
  }

  // Removes item by index
  public removeItem(index: number, quantity = 1): Item | null {
    if (index < 0 || index >= this.size) return null;
    const item = this.items[index];
    if (!item) return null;

    if (item.quantity && item.quantity > quantity) {
      item.quantity -= quantity;
      EventBus.emit("inventory_changed", this.items);
      return { ...item, quantity };
    } else {
      this.items[index] = null;
      if (this.selectedIndex === index) {
        this.selectedIndex = null;
        EventBus.emit("item_selected", null);
      }
      EventBus.emit("inventory_changed", this.items);
      return item;
    }
  }

  // Selects an item slot
  public selectSlot(index: number | null): void {
    if (index === null) {
      this.selectedIndex = null;
      EventBus.emit("item_selected", null);
      return;
    }

    if (index >= 0 && index < this.size) {
      this.selectedIndex = index;
      EventBus.emit("item_selected", this.items[index], index);
    }
  }

  // Swaps items between slots
  public swap(index1: number, index2: number): void {
    if (index1 < 0 || index1 >= this.size || index2 < 0 || index2 >= this.size) return;
    const temp = this.items[index1];
    this.items[index1] = this.items[index2];
    this.items[index2] = temp;
    
    // Update selection index if it was swapped
    if (this.selectedIndex === index1) {
      this.selectedIndex = index2;
    } else if (this.selectedIndex === index2) {
      this.selectedIndex = index1;
    }

    EventBus.emit("inventory_changed", this.items);
  }

  // Sorts items: filters nulls, sorts by type/rarity, and fills back to 24 slots
  public sort(): void {
    const activeItems = this.items.filter((item): item is Item => item !== null);
    
    const rarityPriority = { legendary: 4, epic: 3, rare: 2, uncommon: 1, common: 0 };
    const typePriority = { weapon: 4, armor: 3, consumable: 2, material: 1, quest: 0 };

    activeItems.sort((a, b) => {
      // Sort by rarity first
      const aRarity = rarityPriority[a.rarity] || 0;
      const bRarity = rarityPriority[b.rarity] || 0;
      if (aRarity !== bRarity) return bRarity - aRarity;

      // Sort by type next
      const aType = typePriority[a.type] || 0;
      const bType = typePriority[b.type] || 0;
      if (aType !== bType) return bType - aType;

      // Finally sort by name
      return a.name.localeCompare(b.name);
    });

    // Re-fill items grid
    this.items = Array(this.size).fill(null);
    for (let i = 0; i < activeItems.length; i++) {
      this.items[i] = activeItems[i];
    }

    this.selectedIndex = null;
    EventBus.emit("item_selected", null);
    EventBus.emit("inventory_changed", this.items);
  }

  public clear(): void {
    this.items = Array(this.size).fill(null);
    this.selectedIndex = null;
    EventBus.emit("inventory_changed", this.items);
  }
}
