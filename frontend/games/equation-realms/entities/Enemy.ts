import { Entity } from "./Entity";
import { EventBus } from "../systems/EventBus";
import { AssetRegistry } from "../systems/AssetRegistry";
import { SimpleEllipseShadow } from "./SimpleEllipseShadow";

export interface EnemyConfig {
  type: string;
  hp: number;
  attack: number;
  speed: number;
  xp: number;
  assetKey: string;
}

export const EnemyConfigs: Record<string, EnemyConfig> = {
  // Map all enemies to different characters atlas zombie frames to avoid procedural fallback green dots
  slime: { type: "slime", hp: 25, attack: 4, speed: 45, xp: 15, assetKey: "zoimbie1_stand.png" },
  wolf: { type: "wolf", hp: 50, attack: 10, speed: 110, xp: 40, assetKey: "zoimbie1_hold.png" },
  goblin: { type: "goblin", hp: 40, attack: 16, speed: 85, xp: 65, assetKey: "zoimbie1_gun.png" },
};

export type AIState = "IDLE" | "CHASE" | "ATTACK" | "RETURN" | "DEAD";

export class Enemy extends Entity {
  public config!: EnemyConfig;
  public currentHp = 0;
  public maxHp = 0;
  public aiState: AIState = "IDLE";
  
  private spawnX = 0;
  private spawnY = 0;
  private targetPlayer!: Phaser.GameObjects.Sprite;
  
  // Attack cooldown parameters
  private attackCooldown = 1200; // ms
  private lastAttackTime = 0;

  // AI sensing distances
  private aggroRange = 220;
  private attackRange = 36;
  private deaggroRange = 380;

  // Shadow Graphic
  private shadow!: SimpleEllipseShadow;

  constructor(scene: Phaser.Scene) {
    // Start with default characters frame key
    super(scene, 0, 0, "characters", "zoimbie1_stand.png");

    // Create lightweight shadow ellipse below the feet (increased size for 1.5x scale)
    this.shadow = new SimpleEllipseShadow(scene, 24, 8, 20);
  }

  // Spawns/re-initializes the enemy (supports ObjectPool recycling)
  public spawn(x: number, y: number, config: EnemyConfig, player: Phaser.GameObjects.Sprite): void {
    this.spawnX = x;
    this.spawnY = y;
    this.config = config;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.targetPlayer = player;
    this.aiState = "IDLE";
    this.lastAttackTime = 0;

    this.setPosition(x, y);

    const hasAtlas = this.scene.textures.exists("characters");

    if (hasAtlas) {
      this.setTexture("characters", config.assetKey);
      // Give them distinctive color tints depending on type so they are visually unique and readable
      if (config.type === "slime") {
        this.setTint(0x55ff55); // Green Zombie Slime
      } else if (config.type === "wolf") {
        this.setTint(0x55aaff); // Blue/Cyan Zombie Hunter
      } else if (config.type === "goblin") {
        this.setTint(0xff5555); // Red Zombie Brute
      }
    } else {
      // Fallback
      if (config.type === "wolf") {
        this.setTexture(AssetRegistry.WOLF);
      } else if (config.type === "goblin") {
        this.setTexture(AssetRegistry.GOBLIN);
      } else {
        this.setTexture(AssetRegistry.SLIME);
      }
      this.clearTint();
    }

    this.setActive(true);
    this.setVisible(true);
    this.alpha = 1;
    this.setAngle(0);
    this.setScale(1.5); // Scaled to 1.5x enemy size

    // Show shadow
    if (this.shadow) {
      this.shadow.setVisible(true);
      this.shadow.updatePosition(x, y);
    }

    // Enable physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setSize(22, 22);
    body.setOffset(5, 5);
    
    // Clear velocities
    this.setVelocity(0, 0);
  }

  // Custom preUpdate to handle FSM AI loops
  public preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.aiState === "DEAD" || !this.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body || !body.enable) return;

    // Calculate distance to player and spawn point
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.targetPlayer.x, this.targetPlayer.y);
    const distToSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);

    // FSM State Logic
    switch (this.aiState) {
      case "IDLE":
        this.setVelocity(0, 0);
        
        // Detect player
        if (distToPlayer <= this.aggroRange && this.targetPlayer.active) {
          this.aiState = "CHASE";
        }
        break;
 
      case "CHASE":
        if (!this.targetPlayer.active) {
          this.aiState = "RETURN";
          break;
        }

        // Return if player walks beyond deaggro range
        if (distToPlayer > this.deaggroRange) {
          this.aiState = "RETURN";
          break;
        }

        // Attack if in range
        if (distToPlayer <= this.attackRange) {
          this.aiState = "ATTACK";
          break;
        }

        // Move towards player
        this.moveTowards(this.targetPlayer.x, this.targetPlayer.y, this.config.speed);
        break;

      case "ATTACK":
        this.setVelocity(0, 0);

        if (!this.targetPlayer.active || distToPlayer > this.attackRange) {
          this.aiState = "CHASE";
          break;
        }

        // Trigger attack if cooldown expired
        if (time - this.lastAttackTime >= this.attackCooldown) {
          this.lastAttackTime = time;
          EventBus.emit("enemy_attack", this);
        }
        break;

      case "RETURN":
        // Move back to spawn coordinates
        if (distToSpawn <= 16) {
          this.aiState = "IDLE";
          this.setVelocity(0, 0);
        } else {
          this.moveTowards(this.spawnX, this.spawnY, this.config.speed);
        }
        
        // Detect player again if they get close
        if (distToPlayer <= this.aggroRange && this.targetPlayer.active) {
          this.aiState = "CHASE";
        }
        break;
    }

    // --- Directional Snapping & Micro-Animations ---
    const vx = body.velocity.x;
    const vy = body.velocity.y;

    if (vx < 0) {
      this.setFlipX(true); // Face Left
    } else if (vx > 0) {
      this.setFlipX(false); // Face Right
    }

    // Micro Animations (scaled by 1.5x enemy size)
    if (vx === 0 && vy === 0) {
      // Idle state bobbing
      const bob = Math.sin(this.scene.time.now * 0.008) * 0.04;
      this.setScale(1.5 * (1 + bob), 1.5 * (1 - bob));
      this.setAngle(0);
    } else {
      // Walk wobble
      const wobble = Math.sin(this.scene.time.now * 0.015) * 8;
      this.setAngle(wobble);

      const bounce = Math.abs(Math.sin(this.scene.time.now * 0.015)) * 0.06;
      this.setScale(1.5 * (1 - bounce), 1.5 * (1 + bounce));
    }

    // Sync shadow position and sorting depth underneath the enemy
    if (this.shadow) {
      this.shadow.updatePosition(this.x, this.y);
      this.shadow.setDepth(this.depth - 1);
    }
  }

  private moveTowards(tx: number, ty: number, speed: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Smooth velocity set
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  // Receives damage and registers knockback
  public takeDamage(amount: number, knockbackX = 0, knockbackY = 0): void {
    if (this.aiState === "DEAD") return;

    this.currentHp = Math.max(0, this.currentHp - amount);

    // Apply knockback force
    this.setVelocity(knockbackX, knockbackY);
    
    // Stop behavior briefly on hit
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.blocked.none = false;

    // Flash/shake hit reaction animation
    this.playHitReaction();

    EventBus.emit("enemy_damaged", this, amount);

    if (this.currentHp <= 0) {
      this.die();
    }
  }

  private playHitReaction(): void {
    const originalTint = this.isTinted ? this.tintTopLeft : 0xffffff;
    
    // Flash solid white on taking hit
    this.setTintFill(0xffffff);

    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 2, to: this.x + 2 },
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.clearTint();
        if (originalTint !== 0xffffff) {
          this.setTint(originalTint);
        }
      }
    });
  }

  private die(): void {
    this.aiState = "DEAD";
    this.setVelocity(0, 0);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    // Hide shadow on death
    if (this.shadow) {
      this.shadow.setVisible(false);
    }

    EventBus.emit("enemy_died", this);

    // Fade out and release back to pool
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.setVisible(false);
        this.setActive(false);
        this.alpha = 1; // Reset alpha for next use
      },
    });
  }

  public destroy(fromScene?: boolean): void {
    if (this.shadow) {
      this.shadow.destroy();
    }
    super.destroy(fromScene);
  }
}
