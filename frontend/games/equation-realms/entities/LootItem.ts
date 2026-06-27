import { AssetRegistry } from "../systems/AssetRegistry";
import { Item } from "../systems/Item";

export type LootType = "coin" | "health_orb" | "item_bag";

export class LootItem extends Phaser.Physics.Arcade.Sprite {
  public lootType!: LootType;
  public itemData?: Item;
  
  private targetPlayer!: Phaser.GameObjects.Sprite;
  private magnetRadius = 130;
  private magnetSpeed = 260;
  private isCollected = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, AssetRegistry.COIN);
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  // Spawns a loot item
  public spawn(x: number, y: number, lootType: LootType, player: Phaser.GameObjects.Sprite, itemData?: Item): void {
    this.lootType = lootType;
    this.itemData = itemData;
    this.targetPlayer = player;
    this.isCollected = false;

    this.setPosition(x, y);

    let textureKey = AssetRegistry.COIN;
    if (lootType === "health_orb") {
      textureKey = AssetRegistry.HEALTH_ORB;
    } else if (lootType === "item_bag") {
      textureKey = AssetRegistry.ITEM_BAG;
    }
    this.setTexture(textureKey);
    
    this.setActive(true);
    this.setVisible(true);
    this.alpha = 1;

    // Configure body size
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setSize(16, 16);
    body.setVelocity(0, 0);
  }

  public preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.isCollected || !this.active) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.targetPlayer.x, this.targetPlayer.y);

    if (distToPlayer <= this.magnetRadius && this.targetPlayer.active) {
      // Accelerate towards player (magnet effect)
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetPlayer.x, this.targetPlayer.y);
      const body = this.body as Phaser.Physics.Arcade.Body;
      
      body.setVelocity(
        Math.cos(angle) * this.magnetSpeed,
        Math.sin(angle) * this.magnetSpeed
      );
    } else {
      // Stand still if outside magnet range
      this.setVelocity(0, 0);
    }
  }

  public collect(): void {
    if (this.isCollected) return;
    this.isCollected = true;
    
    // Disable physics
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;

    // Small scale down animation and disable
    this.scene.tweens.add({
      targets: this,
      scale: 0.1,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.setVisible(false);
        this.setActive(false);
        this.scale = 1; // Reset scale for next pool use
      },
    });
  }
}
