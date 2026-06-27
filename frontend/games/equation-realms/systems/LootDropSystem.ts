import { ObjectPool } from "./ObjectPool";
import { LootItem, LootType } from "../entities/LootItem";
import { Enemy } from "../entities/Enemy";
import { HealthSystem } from "./HealthSystem";
import { InventorySystem } from "./InventorySystem";
import { ItemGenerator } from "./ItemGenerator";
import { EventBus } from "./EventBus";

export class LootDropSystem {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private healthSystem: HealthSystem;
  private inventorySystem: InventorySystem;
  private lootPool: ObjectPool<LootItem>;
  private activeLootItems: LootItem[] = [];
  
  // Phaser group for physics overlap checks
  private physicsGroup: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    healthSystem: HealthSystem,
    inventorySystem: InventorySystem
  ) {
    this.scene = scene;
    this.player = player;
    this.healthSystem = healthSystem;
    this.inventorySystem = inventorySystem;

    // Create loot physics group
    this.physicsGroup = this.scene.physics.add.group();

    // Create high-performance loot pool
    this.lootPool = new ObjectPool<LootItem>(
      () => new LootItem(this.scene),
      (item) => {
        item.setActive(false);
        item.setVisible(false);
        this.physicsGroup.remove(item);
      }
    );

    // Bind overlap trigger
    this.scene.physics.add.overlap(
      this.player,
      this.physicsGroup,
      (p, item) => {
        this.collectLoot(item as LootItem);
      },
      undefined,
      this
    );

    // Listen for enemy deaths
    EventBus.on("enemy_died", this.handleEnemyDeath, this);
  }

  private handleEnemyDeath = (enemy: Enemy): void => {
    // 35% chance to drop a random item, otherwise coins/health_orbs
    const roll = Math.random();
    
    const loot = this.lootPool.get();

    if (roll < 0.35) {
      // Drop an item bag
      const generatedItem = ItemGenerator.generateRandomItem();
      loot.spawn(enemy.x, enemy.y, "item_bag", this.player, generatedItem);
    } else {
      // Drop coin or health orb
      const subRoll = Math.random();
      const type: LootType = subRoll < 0.7 ? "coin" : "health_orb";
      loot.spawn(enemy.x, enemy.y, type, this.player);
    }
    
    this.physicsGroup.add(loot);
    this.activeLootItems.push(loot);
  };

  private collectLoot(loot: LootItem): void {
    if (!loot.active) return;
    
    if (loot.lootType === "coin") {
      // Coin rewards player 15 XP
      EventBus.emit("player_xp_gained", 15);
      EventBus.emit("player_coins_gained", 5 + Math.floor(Math.random() * 5));
      loot.collect();
    } else if (loot.lootType === "health_orb") {
      // Health orb heals player 25 HP
      this.healthSystem.heal(25);
      loot.collect();
    } else if (loot.lootType === "item_bag" && loot.itemData) {
      // Try to add to inventory
      const added = this.inventorySystem.addItem(loot.itemData);
      if (added) {
        // Show item pickup message floating
        const colorMap = {
          common: "#9ca3af",
          uncommon: "#22c55e",
          rare: "#3b82f6",
          epic: "#a855f7",
          legendary: "#eab308",
        };
        const color = colorMap[loot.itemData.rarity] || "#ffffff";
        this.spawnPickupText(loot.x, loot.y - 15, `+ ${loot.itemData.name}`, color);
        loot.collect();
      } else {
        // Inventory full: show warning once every 1 second (cooldown via physics body overlap timing)
        this.spawnPickupText(loot.x, loot.y - 15, "Inventory Full!", "#ef4444");
      }
    }
  }

  private spawnPickupText(x: number, y: number, text: string, color: string): void {
    const textObj = this.scene.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize: "12px",
      fontStyle: "bold",
      color,
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: textObj,
      y: y - 25,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        textObj.destroy();
      },
    });
  }

  public update(): void {
    const maxDespawnDist = 700;

    for (let i = this.activeLootItems.length - 1; i >= 0; i--) {
      const loot = this.activeLootItems[i];

      if (!loot.active) {
        this.activeLootItems.splice(i, 1);
        continue;
      }

      // Despawn loot items that are too far away
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, loot.x, loot.y);
      if (dist > maxDespawnDist) {
        this.activeLootItems.splice(i, 1);
        this.lootPool.release(loot);
      }
    }
  }

  public clearAll(): void {
    EventBus.off("enemy_died", this.handleEnemyDeath);
    for (const item of this.activeLootItems) {
      this.lootPool.release(item);
    }
    this.activeLootItems = [];
    this.lootPool.clear();
  }
}
