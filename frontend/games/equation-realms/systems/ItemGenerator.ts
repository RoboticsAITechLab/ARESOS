import { Item } from "./Item";
import { ItemDatabase, BaseItemTemplate } from "./ItemDatabase";
import { RaritySystem } from "./RaritySystem";

export class ItemGenerator {
  // Generates a fully random item
  public static generateRandomItem(): Item {
    const rarity = RaritySystem.rollRarity();
    // Choose random template
    const templates = ItemDatabase.Templates;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return this.createItemFromTemplate(template, rarity);
  }

  // Generates a specific item type
  public static generateItemByType(type: "weapon" | "armor" | "consumable" | "material" | "quest"): Item {
    const rarity = RaritySystem.rollRarity();
    const filtered = ItemDatabase.Templates.filter((t) => t.type === type);
    const template = filtered[Math.floor(Math.random() * filtered.length)] || ItemDatabase.Templates[0];

    return this.createItemFromTemplate(template, rarity);
  }

  private static createItemFromTemplate(template: BaseItemTemplate, rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"): Item {
    const rarityConfig = RaritySystem.getConfig(rarity);
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    let name = template.name;
    let value = Math.round(template.baseValue * rarityConfig.valueMultiplier);
    let stats: Record<string, number> = {};

    // Only weapons and armors roll prefixes/suffixes and complex stats
    if (template.type === "weapon" || template.type === "armor") {
      const prefix = ItemDatabase.Prefixes[Math.floor(Math.random() * ItemDatabase.Prefixes.length)];
      
      // Roll suffix (50% chance for uncommon, 75% rare, 100% epic/legendary)
      let suffix: typeof ItemDatabase.Suffixes[0] | null = null;
      const rollSuffix = Math.random() < (rarity === "common" ? 0.1 : rarity === "uncommon" ? 0.4 : rarity === "rare" ? 0.75 : 1.0);
      if (rollSuffix) {
        suffix = ItemDatabase.Suffixes[Math.floor(Math.random() * ItemDatabase.Suffixes.length)];
      }

      // Format name: Prefix + Base + Suffix
      name = `${prefix.text} ${template.name}${suffix ? " " + suffix.text : ""}`;

      // Calculate stats based on baseStats, prefix, suffix, and rarity
      if (template.baseStats) {
        const statsList = ["attack", "defense", "health", "speed", "criticalChance"];
        for (const stat of statsList) {
          const baseVal = (template.baseStats as any)[stat] || 0;
          if (baseVal !== 0) {
            // Apply rarity and prefix modifiers
            let finalVal = baseVal * rarityConfig.statMultiplier * prefix.statMod;

            // Add flat suffix modifier if it matches the stat type
            if (suffix && suffix.stat === stat) {
              finalVal += suffix.bonus * rarityConfig.statMultiplier;
            }

            stats[stat] = Math.round(finalVal);
          }
        }
      }

      // Add a bonus stats roll for Legendary/Epic items if base stats were sparse
      if ((rarity === "epic" || rarity === "legendary") && Object.keys(stats).length < 2) {
        const extraStat = template.type === "weapon" ? "criticalChance" : "health";
        stats[extraStat] = Math.round((stats[extraStat] || 5) + 5 * rarityConfig.statMultiplier);
      }
    } else {
      // Consumables have fixed values
      if (template.baseStats) {
        for (const [k, v] of Object.entries(template.baseStats)) {
          stats[k] = v;
        }
      }
    }

    return {
      id,
      name,
      type: template.type,
      rarity,
      value,
      stats: Object.keys(stats).length > 0 ? stats : undefined,
      quantity: (template.type === "material" || template.type === "consumable") ? 1 : undefined,
    };
  }
}
