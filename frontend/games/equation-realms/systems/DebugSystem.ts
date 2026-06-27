import { WorldConfig } from "../world/WorldConfig";

export class DebugSystem {
  private scene: Phaser.Scene;
  private debugText!: Phaser.GameObjects.Text;
  private bgGraphics!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createOverlay();
  }

  private createOverlay(): void {
    // Semi-transparent background panel (expanded height to 275 for settlement data)
    this.bgGraphics = this.scene.add.graphics();
    this.bgGraphics.fillStyle(0x0a0a0a, 0.75);
    this.bgGraphics.fillRect(8, 8, 245, 275);
    this.bgGraphics.setScrollFactor(0);
    this.bgGraphics.setDepth(10000); // Keep on top

    // Monospace style text
    this.debugText = this.scene.add.text(16, 16, "", {
      fontFamily: "monospace, Courier",
      fontSize: "11px",
      color: "#00ff66", // Retro terminal green
      lineSpacing: 4,
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(10001); // Above background
  }

  public update(
    seed: number,
    playerX: number,
    playerY: number,
    loadedChunksCount: number,
    activeEnemies: number,
    playerHp: number,
    playerMaxHp: number,
    playerXp: number,
    worldTime: number,
    difficulty: number,
    coins: number,
    inventoryUsed: number,
    inventorySize: number,
    equippedWeapon: string,
    settlementType: string,
    settlementSeed: string,
    settlementCount: number
  ): void {
    const fps = Math.round(this.scene.game.loop.actualFps);
    
    // Calculate current chunk
    const chunkWidth = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE;
    const chunkHeight = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE;
    const chunkX = Math.floor(playerX / chunkWidth);
    const chunkY = Math.floor(playerY / chunkHeight);

    const mins = Math.floor(worldTime / 60);
    const secs = Math.floor(worldTime % 60);
    const timeFormatted = `${mins}:${secs.toString().padStart(2, "0")}`;

    const info = [
      `=== REALM MONITOR ===`,
      `FPS:        ${fps}`,
      `Seed:       ${seed}`,
      `Player POS: X:${Math.round(playerX)} Y:${Math.round(playerY)}`,
      `Chunk:      [${chunkX}, ${chunkY}]`,
      `Loaded Chk: ${loadedChunksCount}`,
      `=== RPG PROGRESS ===`,
      `Player HP:  ${playerHp}/${playerMaxHp}`,
      `Player XP:  ${playerXp}`,
      `Coins:      ${coins}`,
      `Inventory:  ${inventoryUsed}/${inventorySize}`,
      `Weapon:     ${equippedWeapon}`,
      `=== SETTLEMENT ===`,
      `Near Type:  ${settlementType}`,
      `Village Id: ${settlementSeed}`,
      `Near Count: ${settlementCount}`,
      `=== WORLD STATE ===`,
      `Enemies:    ${activeEnemies}`,
      `Difficulty: Lvl ${difficulty}`,
      `Time:       ${timeFormatted}`,
    ].join("\n");

    this.debugText.setText(info);
  }

  public destroy(): void {
    if (this.bgGraphics) this.bgGraphics.destroy();
    if (this.debugText) this.debugText.destroy();
  }
}
