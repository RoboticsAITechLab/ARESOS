export class LoadingScene extends Phaser.Scene {
  constructor() {
    super("LoadingScene");
  }

  public create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw dark atmospheric background
    const bg = this.add.graphics();
    bg.fillStyle(0x0f0f13, 1);
    bg.fillRect(0, 0, width, height);

    // Title Text
    const titleText = this.add.text(width / 2, height / 2 - 40, "EQUATION REALMS", {
      fontFamily: "Outfit, Inter, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Subtitle Text
    const subtitleText = this.add.text(width / 2, height / 2 - 10, "Initializing Procedural Matrix...", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#818cf8",
    }).setOrigin(0.5);

    // Progress Bar Visual Container
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e1b4b, 0.8);
    progressBox.fillRoundedRect(width / 2 - 150, height / 2 + 20, 300, 16, 8);

    // Simulate loader transition for visual feedback
    let progress = 0;
    const timer = this.time.addEvent({
      delay: 20,
      callback: () => {
        progress += 0.04;
        if (progress > 1) {
          progress = 1;
          timer.destroy();
          // Transition to MainWorldScene
          this.scene.start("MainWorldScene");
        }

        progressBar.clear();
        progressBar.fillStyle(0x6366f1, 1);
        progressBar.fillRoundedRect(
          width / 2 - 146,
          height / 2 + 24,
          292 * progress,
          8,
          4
        );
      },
      callbackScope: this,
      loop: true,
    });
  }
}
