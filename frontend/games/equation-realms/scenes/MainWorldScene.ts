import { Player } from "../entities/Player";
import { ChunkManager } from "../world/ChunkManager";
import { SaveSystem } from "../systems/SaveSystem";
import { DebugSystem } from "../systems/DebugSystem";
import { HealthSystem } from "../systems/HealthSystem";
import { DamageSystem } from "../systems/DamageSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { EnemySpawnSystem } from "../systems/EnemySpawnSystem";
import { WaveDirector } from "../systems/WaveDirector";
import { LootDropSystem } from "../systems/LootDropSystem";
import { EventBus } from "../systems/EventBus";
import { Enemy } from "../entities/Enemy";
import { WorldLandmarkSystem } from "../world/WorldLandmarkSystem";
import { SettlementGenerator } from "../world/SettlementGenerator";

// RPG Systems
import { StatsSystem, CombatStats } from "../systems/StatsSystem";
import { CurrencySystem } from "../systems/CurrencySystem";
import { InventorySystem } from "../systems/InventorySystem";
import { EquipmentSystem, EquipSlot } from "../systems/EquipmentSystem";
import { Item } from "../systems/Item";

export class MainWorldScene extends Phaser.Scene {
  private player!: Player;
  private chunkManager!: ChunkManager;
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup;
  private debugSystem!: DebugSystem;
  public landmarkSystem!: WorldLandmarkSystem;
  public settlementGenerator!: SettlementGenerator;
  private seed!: number;

  // Combat systems
  private healthSystem!: HealthSystem;
  private damageSystem!: DamageSystem;
  private combatSystem!: CombatSystem;
  private enemySpawnSystem!: EnemySpawnSystem;
  private waveDirector!: WaveDirector;
  private lootDropSystem!: LootDropSystem;

  // RPG Systems
  public statsSystem!: StatsSystem;
  public currencySystem!: CurrencySystem;
  public inventorySystem!: InventorySystem;
  public equipmentSystem!: EquipmentSystem;
  
  private playerXp = 0;
  private isRespawning = false;

  constructor() {
    super("MainWorldScene");
  }

  public create(): void {
    this.isRespawning = false;
    
    // 1. Load Save State
    const savedState = SaveSystem.load();
    let startX = 0;
    let startY = 0;
    let initialHp = 100;
    let initialXp = 0;
    let initialCoins = 0;
    let initialInventory: (Item | null)[] | undefined = undefined;
    let initialEquipped: Record<string, Item | null> | undefined = undefined;
    let elapsedSeconds = 0;

    if (savedState) {
      this.seed = savedState.seed;
      startX = savedState.player.x;
      startY = savedState.player.y;
      initialHp = savedState.hp;
      initialXp = savedState.xp;
      initialCoins = savedState.coins || 0;
      initialInventory = savedState.inventory;
      initialEquipped = savedState.equipped;
      elapsedSeconds = savedState.worldTime;
      console.log(`Equation Realms: Loaded save state. Coins: ${initialCoins}, HP: ${initialHp}, XP: ${initialXp}`);
    } else {
      this.seed = SaveSystem.generateNewSeed();
      console.log(`Equation Realms: No save found. Generated new seed: ${this.seed}`);
    }

    this.playerXp = initialXp;

    // 2. Initialize RPG Infrastructure
    this.statsSystem = new StatsSystem();
    this.currencySystem = new CurrencySystem(initialCoins);
    this.inventorySystem = new InventorySystem(initialInventory);
    this.equipmentSystem = new EquipmentSystem(this.statsSystem, initialEquipped);

    // Initialize World Landmark System and Settlement Generator
    this.landmarkSystem = new WorldLandmarkSystem(this.seed, savedState?.discoveredLandmarks || []);
    this.settlementGenerator = new SettlementGenerator(this.seed);

    // 3. Initialize Health and Wave Director
    this.healthSystem = new HealthSystem(initialHp, 100);
    this.waveDirector = new WaveDirector(elapsedSeconds);

    // 4. Setup Physics Groups
    this.obstacleGroup = this.physics.add.staticGroup();

    // 5. Create Chunk Manager & Player
    this.chunkManager = new ChunkManager(this, this.seed, this.obstacleGroup);
    this.player = new Player(this, startX, startY);
    this.player.setName("player");

    // Force initial chunk load before entities update
    this.chunkManager.update(this.player.x, this.player.y);

    // Setup Collisions
    this.physics.add.collider(this.player, this.obstacleGroup);

    // 6. Instantiate Combat and Enemy Spawn Systems
    this.damageSystem = new DamageSystem(this, this.healthSystem);
    this.combatSystem = new CombatSystem(this, this.damageSystem);
    this.lootDropSystem = new LootDropSystem(this, this.player, this.healthSystem, this.inventorySystem);
    this.enemySpawnSystem = new EnemySpawnSystem(this, this.player, this.chunkManager, this.waveDirector);

    this.combatSystem.setPlayer(this.player);
    this.combatSystem.setActiveEnemies(this.enemySpawnSystem.getActiveEnemies());

    // 7. Apply current stats calculation to player speed & weapon damage
    const finalStats = this.statsSystem.getFinalStats();
    this.player.setSpeed(finalStats.speed);
    this.combatSystem.setBaseDamage(finalStats.attack);

    // 8. Camera Follow
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);

    // 9. Start Debug HUD overlay
    this.debugSystem = new DebugSystem(this);

    // 10. Bind Combat & RPG Events
    this.bindEvents();

    // 11. Bind Keyboard inputs for Inventory & Equipment UI Toggles
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on("keydown-I", () => {
        EventBus.emit("toggle_inventory");
      });
      this.input.keyboard.on("keydown-E", () => {
        EventBus.emit("toggle_equipment");
      });
    }

    // 12. Periodic Auto-Save (Every 3 seconds)
    this.time.addEvent({
      delay: 3000,
      callback: this.autoSave,
      callbackScope: this,
      loop: true,
    });

    // Clean up EventBus listeners and resources on shutdown
    this.events.on("shutdown", this.cleanupScene, this);
    this.events.on("destroy", this.cleanupScene, this);
  }

  private bindEvents(): void {
    // Enemy attacking player
    EventBus.on("enemy_attack", (enemy: Enemy) => {
      if (this.isRespawning) return;
      
      // Calculate damage reduction based on Defense stats
      const finalStats = this.statsSystem.getFinalStats();
      const rawDamage = enemy.config.attack;
      // Formula: reducedDamage = rawDamage - (defense * 0.15), clamp to minimum 1
      const reducedDamage = Math.max(1, Math.round(rawDamage - (finalStats.defense * 0.15)));
      
      // Adjust taking damage manually in healthSystem or wrap it in damageSystem
      this.healthSystem.takeDamage(reducedDamage);
      
      // Animate floating text
      this.damageSystem.damagePlayer(enemy); // visually animates, health already reduced
    }, this);

    // Enemy dying rewards player XP
    EventBus.on("enemy_died", (enemy: Enemy) => {
      this.playerXp += enemy.config.xp;
    }, this);

    // Loot picked up rewards XP
    EventBus.on("player_xp_gained", (xpAmount: number) => {
      this.playerXp += xpAmount;
    }, this);

    // Gold pick up
    EventBus.on("player_coins_gained", (coinAmount: number) => {
      this.currencySystem.addCoins(coinAmount);
    }, this);

    // Stats updates apply speed/attack directly
    EventBus.on("player_stats_recalculated", (newStats: CombatStats) => {
      if (this.player && this.player.active) {
        this.player.setSpeed(newStats.speed);
      }
      if (this.combatSystem) {
        this.combatSystem.setBaseDamage(newStats.attack);
      }
      console.log("Equation Realms: Stats updated: ", newStats);
    }, this);

    // Bind React interface callbacks back to Phaser engine systems
    EventBus.on("react_equip_item", (item: Item, index: number) => {
      // Remove from inventory slot
      this.inventorySystem.removeItem(index, 1);
      
      // Equip item and check if previous item got swapped back
      const prevItem = this.equipmentSystem.equip(item);
      if (prevItem) {
        this.inventorySystem.addItem(prevItem);
      }
    }, this);

    EventBus.on("react_unequip_item", (slot: EquipSlot) => {
      // Unequip item
      const item = this.equipmentSystem.unequip(slot);
      if (item) {
        const added = this.inventorySystem.addItem(item);
        if (!added) {
          // If inventory is full, drop it back to the ground at player feet
          this.lootDropSystem.clearAll(); // reload drop
          this.equipmentSystem.equip(item); // re-equip since no inventory space
          console.warn("Equation Realms: Inventory full to unequip item!");
        }
      }
    }, this);

    EventBus.on("react_sort_inventory", () => {
      this.inventorySystem.sort();
    }, this);

    // Player Death Event
    EventBus.on("player_died", this.handlePlayerDeath, this);
  }

  private handlePlayerDeath = (): void => {
    if (this.isRespawning) return;
    this.isRespawning = true;

    // Freeze player input/movement
    this.player.setVelocity(0, 0);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    // Show "YOU DIED" text overlay
    const deathText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      "YOU DIED",
      {
        fontFamily: "monospace, Courier",
        fontSize: "40px",
        fontStyle: "bold",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 6,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(20000);

    const subText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 10,
      "Respawning at coordinate matrix...",
      {
        fontFamily: "monospace, Courier",
        fontSize: "14px",
        color: "#888888",
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(20001);

    // Start camera fade out
    this.cameras.main.fade(1000, 15, 15, 19);

    // Wait and respawn
    this.time.delayedCall(1600, () => {
      // Reset player position to origin (0, 0)
      this.player.setPosition(0, 0);
      
      // Clean up active enemies to prevent immediate spawn-camping
      if (this.enemySpawnSystem) this.enemySpawnSystem.clearAll();
      
      // Force reload spawn loops
      this.enemySpawnSystem = new EnemySpawnSystem(this, this.player, this.chunkManager, this.waveDirector);

      // Re-enable player body
      body.enable = true;

      // Restore health
      this.healthSystem.respawn();

      // Reset camera
      this.cameras.main.fadeIn(800, 15, 15, 19);
      
      // Clear death messages
      deathText.destroy();
      subText.destroy();
      this.isRespawning = false;
    });
  };

  public update(time: number, delta: number): void {
    const elapsedSeconds = delta / 1000;

    // 1. Update player physics
    if (this.player && this.player.active && !this.isRespawning) {
      this.player.update();

      // Check proximity and trigger landmark discovery
      if (this.landmarkSystem) {
        const cellX = Math.floor(this.player.x / (128 * 32));
        const cellY = Math.floor(this.player.y / (128 * 32));
        const landmark = this.landmarkSystem.getLandmarkInCell(cellX, cellY);
        if (landmark) {
          const lpx = landmark.worldX * 32;
          const lpy = landmark.worldY * 32;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, lpx, lpy);
          if (dist < 96) {
            const newlyDiscovered = this.landmarkSystem.discoverLandmark(landmark.id);
            if (newlyDiscovered) {
              console.log(`Exploration: Discovered Landmark - ${landmark.name}!`);
              EventBus.emit("show_dialogue", {
                name: "Exploration Log",
                role: "System Message",
                text: `You have discovered the ${landmark.name}! Landmark registered in databanks.`,
              });
              this.time.delayedCall(3000, () => {
                EventBus.emit("hide_dialogue");
              });
            }
          }
        }
      }
    }

    // 2. Update Wave Director time
    if (this.waveDirector && !this.isRespawning) {
      this.waveDirector.updateTime(elapsedSeconds);
    }

    // 3. Update chunk loader positioning
    if (this.chunkManager && this.player) {
      this.chunkManager.update(this.player.x, this.player.y);
    }

    // 4. Update Spawning and Loot
    if (this.enemySpawnSystem) {
      this.enemySpawnSystem.update();
      // Sync active enemies back to combat engine
      this.combatSystem.setActiveEnemies(this.enemySpawnSystem.getActiveEnemies());
    }
    if (this.lootDropSystem) {
      this.lootDropSystem.update();
    }

    // 5. Update HUD overlays
    if (
      this.debugSystem &&
      this.player &&
      this.chunkManager &&
      this.enemySpawnSystem &&
      this.healthSystem &&
      this.waveDirector &&
      this.currencySystem &&
      this.inventorySystem &&
      this.equipmentSystem &&
      this.settlementGenerator
    ) {
      // Calculate current macro-cell settlement details
      const cellX = Math.floor(this.player.x / (128 * 32));
      const cellY = Math.floor(this.player.y / (128 * 32));
      const nearSettlement = this.settlementGenerator.getSettlementInCell(cellX, cellY);
      const sDist = nearSettlement ? Phaser.Math.Distance.Between(this.player.x, this.player.y, nearSettlement.worldX * 32, nearSettlement.worldY * 32) : Infinity;
      
      const sType = (nearSettlement && sDist < 512) ? nearSettlement.type.toUpperCase() : "None";
      const sSeed = (nearSettlement && sDist < 512) ? nearSettlement.id : "None";

      // Count loaded villages in the 3x3 chunk region around current cell
      const currentCx = Math.floor(this.player.x / (32 * 32));
      const currentCy = Math.floor(this.player.y / (32 * 32));
      const loadedCells = new Set<string>();
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tX = (currentCx + dx) * 32;
          const tY = (currentCy + dy) * 32;
          const mcX = Math.floor(tX / 128);
          const mcY = Math.floor(tY / 128);
          loadedCells.add(`${mcX},${mcY}`);
        }
      }
      const nearCount = loadedCells.size;

      const equippedWeapon = this.equipmentSystem.getEquipped().weapon?.name || "None";
      this.debugSystem.update(
        this.seed,
        this.player.x,
        this.player.y,
        this.chunkManager.getLoadedChunksCount(),
        this.enemySpawnSystem.getActiveEnemiesCount(),
        this.healthSystem.getHp(),
        this.healthSystem.getMaxHp(),
        this.playerXp,
        this.waveDirector.getTime(),
        this.waveDirector.getDifficulty(),
        this.currencySystem.getCoins(),
        this.inventorySystem.getOccupiedSlotsCount(),
        this.inventorySystem.getSize(),
        equippedWeapon,
        sType,
        sSeed,
        nearCount
      );
    }
  }

  private autoSave = (): void => {
    if (this.player && this.player.active && !this.isRespawning) {
      const chunkWidth = 32 * 32;
      const chunkX = Math.floor(this.player.x / chunkWidth);
      const chunkY = Math.floor(this.player.y / chunkWidth);

      SaveSystem.save(
        this.seed,
        this.player.x,
        this.player.y,
        this.healthSystem.getHp(),
        this.playerXp,
        this.currencySystem.getCoins(),
        this.inventorySystem.getItems(),
        this.equipmentSystem.getEquipped() as any,
        this.waveDirector.getTime(),
        this.waveDirector.getDifficulty(),
        chunkX,
        chunkY,
        this.landmarkSystem.getDiscoveredLandmarks()
      );
    }
  };

  private cleanupScene(): void {
    this.autoSave();
    EventBus.clear();
    if (this.enemySpawnSystem) this.enemySpawnSystem.clearAll();
    if (this.lootDropSystem) this.lootDropSystem.clearAll();
    if (this.damageSystem) this.damageSystem.clear();
  }
}


