import { Entity } from "./Entity";
import { AssetRegistry } from "../systems/AssetRegistry";

export class NPC extends Entity {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, AssetRegistry.NPC);
  }
}
