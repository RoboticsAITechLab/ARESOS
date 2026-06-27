import { NoiseGenerator } from "./NoiseGenerator";
import { Tile } from "./Tile";

export class TerrainGenerator {
  private noise: NoiseGenerator;
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);
  }

  // Pure deterministic hash function for cell zoning
  private hash(x: number, y: number, offset: number): number {
    let h = this.seed ^ (x * 23153) ^ (y * 71807) ^ (offset * 94291);
    h = Math.sin(h) * 10000;
    return Math.floor((h - Math.floor(h)) * 1000000);
  }

  public getZoneAt(x: number, y: number): "forest" | "village" | "landmark" | "plains" {
    const cellX = Math.floor(x / 128);
    const cellY = Math.floor(y / 128);
    
    // Player start cell (0, 0) should be Plains for safety and visibility
    if (cellX === 0 && cellY === 0) {
      return "plains";
    }

    const seedHash = this.hash(cellX, cellY, 1);
    const rand = Math.abs(seedHash) % 10;
    
    if (rand < 3) {
      return "forest"; // 30%
    } else if (rand < 6) {
      return "village"; // 30%
    } else if (rand < 8) {
      return "landmark"; // 20%
    } else {
      return "plains"; // 20%
    }
  }

  // Generates tile data for a specific global grid coordinate
  public getTileAt(x: number, y: number): Tile {
    const zone = this.getZoneAt(x, y);
    let biome = "grass";
    let walkable = true;

    return {
      x,
      y,
      biome,
      walkable,
      resourceType: "none", // Default to none; resources will be generated via clusters/structures in ChunkManager
      zone,
    };
  }
}
