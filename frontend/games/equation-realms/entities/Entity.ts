export class Entity extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame);

    // Add to scene rendering and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure basic physics behavior
    this.setCollideWorldBounds(false);
  }
}
