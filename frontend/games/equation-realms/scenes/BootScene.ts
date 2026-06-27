import { TextureRegistry } from "../systems/TextureRegistry";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  public preload(): void {
    // 1. Load Character Spritesheet XML Atlas
    this.load.atlasXML(
      "characters",
      "/assets/kenney_top-down-shooter/Spritesheet/spritesheet_characters.png",
      "/assets/kenney_top-down-shooter/Spritesheet/spritesheet_characters.xml"
    );

    // 2. Load Grass & Dirt Path Tiles
    for (let i = 1; i <= 9; i++) {
      const tileName = `tile_0${i}`;
      this.load.image(tileName, `/assets/kenney_top-down-shooter/PNG/Tiles/${tileName}.png`);
    }

    // 3. Load Rocks
    for (let i = 100; i <= 107; i++) {
      const tileName = `tile_${i}`;
      this.load.image(tileName, `/assets/kenney_top-down-shooter/PNG/Tiles/${tileName}.png`);
    }

    // 4. Load Trees
    this.load.image("tile_131", "/assets/kenney_top-down-shooter/PNG/Tiles/tile_131.png");
    this.load.image("tile_132", "/assets/kenney_top-down-shooter/PNG/Tiles/tile_132.png");

    // 5. Load Blood Splatters (to be recolored into data leaks)
    this.load.image("tile_197", "/assets/kenney_top-down-shooter/PNG/Tiles/tile_197.png");
    this.load.image("tile_198", "/assets/kenney_top-down-shooter/PNG/Tiles/tile_198.png");
  }

  public create(): void {
    // Generate/recolor assets using HTML5 canvas inside Phaser
    TextureRegistry.generateAll(this);

    // Transition to the loading screen
    this.scene.start("LoadingScene");
  }
}

