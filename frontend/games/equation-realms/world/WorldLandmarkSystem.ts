import { WorldConfig } from "./WorldConfig";

export interface Landmark {
  id: string;
  type: "prime_pillar" | "crystal_cluster" | "ancient_obelisk" | "broken_gateway";
  name: string;
  worldX: number; // Center grid X
  worldY: number; // Center grid Y
  radius: number;
}

export class WorldLandmarkSystem {
  private seed: number;
  private static CELL_SIZE = 128; // 4 chunks = 128 tiles
  private discoveredLandmarks: Set<string> = new Set();

  constructor(seed: number, initialDiscovered: string[] = []) {
    this.seed = seed;
    initialDiscovered.forEach((id) => this.discoveredLandmarks.add(id));
  }

  // Pure deterministic hash function
  private hash(x: number, y: number, offset: number): number {
    let h = this.seed ^ (x * 13247) ^ (y * 68311) ^ (offset * 93503);
    h = Math.sin(h) * 10000;
    return Math.floor((h - Math.floor(h)) * 1000000);
  }

  // Get the zone of a cell deterministically
  private getZoneAtCell(cellX: number, cellY: number): "forest" | "village" | "landmark" | "plains" {
    if (cellX === 0 && cellY === 0) {
      return "plains";
    }
    // Match the hashing logic in TerrainGenerator
    let h = this.seed ^ (cellX * 23153) ^ (cellY * 71807) ^ (1 * 94291);
    h = Math.sin(h) * 10000;
    const rand = Math.abs(Math.floor((h - Math.floor(h)) * 100)) % 10;
    
    if (rand < 3) {
      return "forest";
    } else if (rand < 6) {
      return "village";
    } else if (rand < 8) {
      return "landmark";
    } else {
      return "plains";
    }
  }

  // Get the landmark in a specific macro-cell coordinate if zoned as a village
  public getLandmarkInCell(cellX: number, cellY: number): Landmark | null {
    // Only place landmarks in cells zoned as "village"
    if (this.getZoneAtCell(cellX, cellY) !== "village") {
      return null;
    }

    const seedHash = this.hash(cellX, cellY, 1);
    
    // Landmark types
    const types: Landmark["type"][] = ["prime_pillar", "crystal_cluster", "ancient_obelisk", "broken_gateway"];
    const type = types[seedHash % types.length];

    // Names
    const names = {
      prime_pillar: "Prime Pillar",
      crystal_cluster: "Crystal Cluster",
      ancient_obelisk: "Ancient Obelisk",
      broken_gateway: "Broken Gateway",
    };

    // Place in the bottom-right quadrant of the 128x128 cell to guarantee no overlap with top-left village
    // Quadrant: X in [70, 110], Y in [70, 110]
    const localX = 70 + (this.hash(cellX, cellY, 2) % 40);
    const localY = 70 + (this.hash(cellX, cellY, 3) % 40);

    const worldX = cellX * WorldLandmarkSystem.CELL_SIZE + localX;
    const worldY = cellY * WorldLandmarkSystem.CELL_SIZE + localY;

    return {
      id: `landmark_${cellX}_${cellY}`,
      type,
      name: names[type],
      worldX,
      worldY,
      radius: 4, // 9x9 footprint
    };
  }

  // Finds if a given tile is within a landmark's footprint and returns its rendering info
  public getLandmarkTile(wx: number, wy: number): { landmark: Landmark; role: string; walkable: boolean } | null {
    const cellX = Math.floor(wx / WorldLandmarkSystem.CELL_SIZE);
    const cellY = Math.floor(wy / WorldLandmarkSystem.CELL_SIZE);

    // Check containing cell and adjacent cells just in case
    for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
      for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
        const landmark = this.getLandmarkInCell(cx, cy);
        if (!landmark) continue;

        const dx = wx - landmark.worldX;
        const dy = wy - landmark.worldY;

        // Landmark footprint is a 5x5 or 3x3 area
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
          // Identify tile roles within the landmark structure
          let role = "floor"; // Default stone flooring
          let walkable = true;

          if (landmark.type === "prime_pillar") {
            if (dx === 0 && dy === 0) {
              role = "pillar_core";
              walkable = false;
            } else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
              role = "pedestal";
              walkable = false;
            }
          } else if (landmark.type === "crystal_cluster") {
            // Scatter individual crystals
            const scatterIndex = Math.abs((dx * 7 + dy * 13) % 5);
            if (scatterIndex === 1 && (dx !== 0 || dy !== 0)) {
              role = "crystal";
              walkable = false;
            } else if (dx === 0 && dy === 0) {
              role = "crystal_core";
              walkable = false;
            }
          } else if (landmark.type === "ancient_obelisk") {
            if (dx === 0 && dy === 0) {
              role = "obelisk";
              walkable = false;
            } else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
              role = "base";
              walkable = false;
            }
          } else if (landmark.type === "broken_gateway") {
            // Pillars at left (-1, 0) and right (+1, 0)
            if (dy === 0 && (dx === -1 || dx === 1)) {
              role = "gateway_pillar";
              walkable = false;
            } else if (dy === 0 && dx === 0) {
              role = "gateway_arch";
              walkable = true; // Walk through the gate
            }
          }

          return { landmark, role, walkable };
        }
      }
    }

    return null;
  }

  // Returns array of discovered landmark ids
  public getDiscoveredLandmarks(): string[] {
    return Array.from(this.discoveredLandmarks);
  }

  // Discover a landmark
  public discoverLandmark(id: string): boolean {
    if (this.discoveredLandmarks.has(id)) return false;
    this.discoveredLandmarks.add(id);
    return true;
  }
}
