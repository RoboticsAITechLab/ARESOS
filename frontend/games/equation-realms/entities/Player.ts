import { Entity } from "./Entity";
import { AssetRegistry } from "../systems/AssetRegistry";
import { SimpleEllipseShadow } from "./SimpleEllipseShadow";

export class Player extends Entity {
  private speed = 180;
  private shadow!: SimpleEllipseShadow;
  private glow!: Phaser.GameObjects.Graphics;
  private isAttacking = false;
  
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const hasAtlas = scene.textures.exists("characters");
    // If characters atlas exists, use it natively, else use legacy placeholder key
    super(
      scene,
      x,
      y,
      hasAtlas ? "characters" : AssetRegistry.Player.WALKER_STAND,
      hasAtlas ? "robot1_stand.png" : undefined
    );

    // Apply cyan tint to the robot to remove modern military look and fit cyber theme
    if (hasAtlas) {
      this.setTint(0x00ffff);
    }

    // Scale player to 1.75x for readability
    this.setScale(1.75);

    // Create the lightweight shadow ellipse below the feet (resized to 28x9, offset 22)
    this.shadow = new SimpleEllipseShadow(scene, 28, 9, 22);

    // Create the cyan outline/glow behind the player
    this.glow = scene.add.graphics();
    this.glow.lineStyle(2, 0x00ffff, 0.6);
    this.glow.fillStyle(0x00ffff, 0.15);
    this.glow.strokeCircle(0, 0, 24);
    this.glow.fillCircle(0, 0, 24);
    this.glow.setDepth(6);

    // Setup WASD controls
    if (scene.input && scene.input.keyboard) {
      this.keys = scene.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as any;
    }

    // Set custom collision size (smaller box at feet for 2D depth feel)
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 14);
    body.setOffset(7, 16);
  }

  public update(): void {
    if (!this.keys) return;

    let vx = 0;
    let vy = 0;

    if (this.keys.A.isDown) {
      vx = -1;
    } else if (this.keys.D.isDown) {
      vx = 1;
    }

    if (this.keys.W.isDown) {
      vy = -1;
    } else if (this.keys.S.isDown) {
      vy = 1;
    }

    // Normalize diagonal movement speed
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.setVelocity(vx * this.speed, vy * this.speed);

    // 1. Dynamic Texture / Frame Swap: hold weapon if equipped
    const mainScene = this.scene as any;
    const hasWeapon = mainScene.equipmentSystem && mainScene.equipmentSystem.getEquipped().weapon !== null;

    if (this.texture.key === "characters") {
      const targetFrame = hasWeapon ? "robot1_hold.png" : "robot1_stand.png";
      if (this.frame.name !== targetFrame) {
        this.setFrame(targetFrame);
      }
    } else {
      const targetTexture = hasWeapon ? AssetRegistry.Player.WALKER_HOLD : AssetRegistry.Player.WALKER_STAND;
      if (this.texture.key !== targetTexture) {
        this.setTexture(targetTexture);
      }
    }

    // 2. Directional Snapping (UP, DOWN, LEFT, RIGHT - No free rotation)
    if (vx < 0) {
      this.setFlipX(true); // Face Left
    } else if (vx > 0) {
      this.setFlipX(false); // Face Right
    }

    // 3. Micro Animations (scaled by 1.75x player size)
    if (vx === 0 && vy === 0) {
      // Idle state: vertical bobbing
      const bob = Math.sin(this.scene.time.now * 0.008) * 0.04;
      this.setScale(1.75 * (1 + bob), 1.75 * (1 - bob));
      this.setAngle(0); // clear wobble
    } else {
      // Walking state: rotational wobble
      const wobble = Math.sin(this.scene.time.now * 0.015) * 8; // 8 degrees wobble
      this.setAngle(wobble);
      
      const bounce = Math.abs(Math.sin(this.scene.time.now * 0.015)) * 0.06;
      this.setScale(1.75 * (1 - bounce), 1.75 * (1 + bounce));
    }

    // 4. Update Shadow & Glow Position & Depth
    if (this.shadow) {
      this.shadow.updatePosition(this.x, this.y);
      this.shadow.setDepth(this.depth - 2);
    }
    if (this.glow) {
      this.glow.setPosition(this.x, this.y);
      this.glow.setDepth(this.depth - 1);
    }
  }

  /**
   * Attack thrust micro-animation: Shakes/thrusts rendering origin forward briefly
   */
  public playAttackThrust(angle: number): void {
    if (this.isAttacking) return;
    this.isAttacking = true;

    const tx = Math.cos(angle) * 12;
    const ty = Math.sin(angle) * 12;

    this.scene.tweens.add({
      targets: this,
      displayOriginX: this.displayOriginX - tx,
      displayOriginY: this.displayOriginY - ty,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.updateDisplayOrigin();
        this.isAttacking = false;
      }
    });
  }

  /**
   * Hit reaction animation: Shakes and tints the character red briefly
   */
  public playHitReaction(): void {
    const originalTint = this.isTinted ? this.tintTopLeft : 0xffffff;
    this.setTint(0xff5555);
    
    // Quick shake translation
    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 3, to: this.x + 3 },
      duration: 40,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (originalTint !== 0xffffff) {
          this.setTint(originalTint);
        } else {
          this.clearTint();
        }
      }
    });
  }

  public destroy(fromScene?: boolean): void {
    if (this.shadow) {
      this.shadow.destroy();
    }
    if (this.glow) {
      this.glow.destroy();
    }
    super.destroy(fromScene);
  }
}
