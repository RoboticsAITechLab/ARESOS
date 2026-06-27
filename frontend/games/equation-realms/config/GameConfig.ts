import { BootScene } from "../scenes/BootScene";
import { LoadingScene } from "../scenes/LoadingScene";
import { MainWorldScene } from "../scenes/MainWorldScene";

export const createGameConfig = (parent: string): Phaser.Types.Core.GameConfig => {
  return {
    type: Phaser.AUTO,
    backgroundColor: "#0f0f13",
    scale: {
      parent,
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, LoadingScene, MainWorldScene],
  };
};
