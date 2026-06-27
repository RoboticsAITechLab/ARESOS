import Phaser from "phaser";
import { createGameConfig } from "./config/GameConfig";

export function initGame(parentElementId: string): Phaser.Game {
  const config = createGameConfig(parentElementId);
  return new Phaser.Game(config);
}
