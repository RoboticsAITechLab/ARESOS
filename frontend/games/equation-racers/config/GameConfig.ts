import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { MainScene } from "../scenes/MainScene";

export function createGameConfig(parentElementId: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parentElementId,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, MainScene],
  };
}
