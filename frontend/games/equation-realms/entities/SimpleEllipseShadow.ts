export class SimpleEllipseShadow extends Phaser.GameObjects.Graphics {
  private offsetVertical: number;

  constructor(scene: Phaser.Scene, width = 20, height = 8, offsetVertical = 16) {
    super(scene);
    this.offsetVertical = offsetVertical;

    // Draw the ellipse shadow filled with black at 30% opacity
    this.fillStyle(0x000000, 0.3);
    this.fillEllipse(0, 0, width, height);
    
    // Set depth low so it displays below characters but above tiles
    this.setDepth(5);

    scene.add.existing(this);
  }

  public updatePosition(x: number, y: number): void {
    this.setPosition(x, y + this.offsetVertical);
  }
}
