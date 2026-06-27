import { ObjectPool } from "./ObjectPool";
import { HealthSystem } from "./HealthSystem";
import { Enemy } from "../entities/Enemy";
import { AssetRegistry } from "./AssetRegistry";

export class DamageSystem {
  private scene: Phaser.Scene;
  private healthSystem: HealthSystem;
  private floatTextPool: ObjectPool<Phaser.GameObjects.Text>;

  constructor(scene: Phaser.Scene, healthSystem: HealthSystem) {
    this.scene = scene;
    this.healthSystem = healthSystem;

    // Initialize high-performance floating text pool
    this.floatTextPool = new ObjectPool<Phaser.GameObjects.Text>(
      () => {
        const textObj = this.scene.add.text(0, 0, "", {
          fontFamily: "monospace, Courier",
          fontSize: "14px",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
        });
        textObj.setDepth(500); // Renders above entities
        return textObj;
      },
      (text) => {
        text.setVisible(false);
        text.setActive(false);
      }
    );
  }

  // Deals damage to Player from an Enemy
  public damagePlayer(enemy: Enemy): void {
    const damage = enemy.config.attack;
    
    // Reduce health
    this.healthSystem.takeDamage(damage);

    // Get hit direction for player knockback
    const playerSprite = enemy.scene.children.getByName("player") as any;
    if (playerSprite && playerSprite.active) {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, playerSprite.x, playerSprite.y);
      const knockbackForce = 150;
      
      const body = playerSprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(Math.cos(angle) * knockbackForce, Math.sin(angle) * knockbackForce);

      // Trigger player hit reaction animations
      if (typeof playerSprite.playHitReaction === "function") {
        playerSprite.playHitReaction();
      }

      // Spawn red floating text at player position
      this.spawnFloatingText(playerSprite.x, playerSprite.y - 10, `${damage}`, "#ef4444");
    }
  }

  // Deals damage to Enemy from Player
  public damageEnemy(enemy: Enemy, damage: number, playerX: number, playerY: number): void {
    const angle = Phaser.Math.Angle.Between(playerX, playerY, enemy.x, enemy.y);
    const knockbackForce = 160;
    
    const kx = Math.cos(angle) * knockbackForce;
    const ky = Math.sin(angle) * knockbackForce;

    // Apply damage and knockback to enemy
    enemy.takeDamage(damage, kx, ky);

    // Spawn cyber code-leak splatter particles
    this.spawnSplatterParticles(enemy.x, enemy.y);

    // Spawn yellow floating text at enemy position
    this.spawnFloatingText(enemy.x, enemy.y - 12, `${damage}`, "#facc15");
  }

  /**
   * Spawns a burst of recolored neon cyan and green data splatters on damage
   */
  private spawnSplatterParticles(x: number, y: number): void {
    const particleCount = 3;
    const textures = [AssetRegistry.Effects.CYAN_SPLATTER, AssetRegistry.Effects.GREEN_SPLATTER];

    for (let i = 0; i < particleCount; i++) {
      const tex = textures[Math.floor(Math.random() * textures.length)];
      const px = x + (Math.random() - 0.5) * 16;
      const py = y + (Math.random() - 0.5) * 16;

      const splatter = this.scene.add.sprite(px, py, tex);
      splatter.setOrigin(0.5);
      splatter.setDepth(300); // Above background/characters
      splatter.setAngle(Math.random() * 360);
      
      const scale = 0.5 + Math.random() * 0.4;
      splatter.setScale(scale);

      // Animate splatter drifting and fading
      this.scene.tweens.add({
        targets: splatter,
        scale: scale * 0.2,
        alpha: 0,
        x: px + (Math.random() - 0.5) * 40,
        y: py + (Math.random() - 0.5) * 40,
        duration: 350 + Math.random() * 200,
        ease: "Quad.easeOut",
        onComplete: () => {
          splatter.destroy();
        }
      });
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string): void {
    const textObj = this.floatTextPool.get();
    textObj.setText(text);
    textObj.setColor(color);
    textObj.setPosition(x, y);
    textObj.setVisible(true);
    textObj.setActive(true);
    textObj.alpha = 1;
    textObj.setScale(1);

    // Animate up and fade out
    this.scene.tweens.add({
      targets: textObj,
      y: y - 30,
      alpha: 0,
      scale: 0.8,
      duration: 650,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.floatTextPool.release(textObj);
      },
    });
  }

  public clear(): void {
    this.floatTextPool.clear();
  }
}
