import { EventBus } from "./EventBus";
import { DamageSystem } from "./DamageSystem";
import { Enemy } from "../entities/Enemy";
import { AssetRegistry } from "./AssetRegistry";

export class CombatSystem {
  private scene: Phaser.Scene;
  private damageSystem: DamageSystem;
  private player!: Phaser.Physics.Arcade.Sprite;
  private activeEnemies: Enemy[] = [];

  private attackCooldown = 380; // ms
  private lastAttackTime = 0;
  private attackRange = 58; // Melee range pixels
  private baseDamage = 16;

  constructor(scene: Phaser.Scene, damageSystem: DamageSystem) {
    this.scene = scene;
    this.damageSystem = damageSystem;

    // Listen to mouse pointer click events
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.triggerPlayerAttack();
      }
    });
  }

  public setPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.player = player;
  }

  public setActiveEnemies(enemies: Enemy[]): void {
    this.activeEnemies = enemies;
  }

  public setBaseDamage(damage: number): void {
    this.baseDamage = damage;
  }

  private triggerPlayerAttack(): void {
    if (!this.player || !this.player.active) return;

    const time = this.scene.time.now;
    if (time - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = time;

    // Get pointer coordinates to direct the swipe
    const pointer = this.scene.input.activePointer;
    // convert screen pointer to world position
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldX, worldY);

    // 1. Render Swipe Visual Effect & Trigger Player Thrust animation
    this.renderSwipeEffect(angle);
    if (this.player && typeof (this.player as any).playAttackThrust === "function") {
      (this.player as any).playAttackThrust(angle);
    }

    // 2. Perform Melee Hit Check
    let hitCount = 0;
    for (const enemy of this.activeEnemies) {
      if (!enemy.active || enemy.aiState === "DEAD") continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= this.attackRange) {
        // Calculate attack direction vector
        this.damageSystem.damageEnemy(enemy, this.baseDamage, this.player.x, this.player.y);
        hitCount++;
      }
    }

    if (hitCount > 0) {
      EventBus.emit("player_attacked", hitCount);
    }
  }

  private renderSwipeEffect(angle: number): void {
    // Offset swipe visually in front of player
    const offsetDistance = 20;
    const sx = this.player.x + Math.cos(angle) * offsetDistance;
    const sy = this.player.y + Math.sin(angle) * offsetDistance;

    const sweep = this.scene.add.sprite(sx, sy, AssetRegistry.ATTACK_SWEEP);
    sweep.setOrigin(0.5);
    sweep.setRotation(angle);
    sweep.setDepth(400); // Renders above players and enemies

    // Quick scale up, rotation swing, and fade out
    this.scene.tweens.add({
      targets: sweep,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.1,
      angle: sweep.angle + 30,
      duration: 120,
      onComplete: () => {
        sweep.destroy();
      },
    });
  }
}
