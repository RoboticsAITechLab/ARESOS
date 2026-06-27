import { Settlement } from "./Settlement";
import { SettlementConfigs } from "./SettlementTypes";

export class SettlementGenerator {
  private seed: number;
  private static CELL_SIZE = 128; // 4 chunks = 128 tiles

  // House offsets list from village center to avoid overlaps and form a clean grid layout
  private static HOUSE_OFFSETS = [
    { x: -4, y: -4 },
    { x: 4, y: -4 },
    { x: -4, y: 1 },
    { x: 4, y: 1 },
    { x: 0, y: -7 },
    { x: -4, y: -7 },
    { x: 4, y: -7 },
  ];

  constructor(seed: number) {
    this.seed = seed;
  }

  // Pure deterministic hash function
  private hash(x: number, y: number, offset: number): number {
    let h = this.seed ^ (x * 14813) ^ (y * 69221) ^ (offset * 94291);
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

  // Generates settlement for a cell deterministically if zoned as a village
  public getSettlementInCell(cellX: number, cellY: number): Settlement | null {
    // Check if this cell is zoned as a village
    if (this.getZoneAtCell(cellX, cellY) !== "village") {
      return null;
    }

    const seedHash = this.hash(cellX, cellY, 1);
    
    // Choose type
    const types: ("small" | "medium" | "large")[] = ["small", "medium", "large"];
    const type = types[seedHash % types.length];
    const config = SettlementConfigs[type];

    // Place in the top-left quadrant of the cell: X in [15, 55], Y in [15, 55]
    const localX = 15 + (this.hash(cellX, cellY, 2) % 40);
    const localY = 15 + (this.hash(cellX, cellY, 3) % 40);

    const worldX = cellX * SettlementGenerator.CELL_SIZE + localX;
    const worldY = cellY * SettlementGenerator.CELL_SIZE + localY;

    return {
      id: `settlement_${cellX}_${cellY}`,
      type,
      name: `Village (${type})`,
      worldX,
      worldY,
      config,
    };
  }

  // Check if a tile coordinate falls inside a settlement footprint and return its role
  public getSettlementTile(wx: number, wy: number): { settlement: Settlement; role: string; walkable: boolean } | null {
    const cellX = Math.floor(wx / SettlementGenerator.CELL_SIZE);
    const cellY = Math.floor(wy / SettlementGenerator.CELL_SIZE);

    // Check surrounding cells
    for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
      for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
        const settlement = this.getSettlementInCell(cx, cy);
        if (!settlement) continue;

        const dx = wx - settlement.worldX;
        const dy = wy - settlement.worldY;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));

        // Check if inside village boundaries
        if (dist <= settlement.config.radius) {
          // 1. Town Center footprint: 3x3 at offset (0, -2)
          if (Math.abs(dx) <= 1 && Math.abs(dy + 2) <= 1) {
            const role = (dx === 0 && dy === -2) ? "town_center_core" : "town_center_base";
            return { settlement, role, walkable: false };
          }

          // 2. Market Area: 3x3 footprint at offset (0, 4)
          if (Math.abs(dx) <= 1 && Math.abs(dy - 4) <= 1) {
            return { settlement, role: "market_ground", walkable: true };
          }

          // 3. Houses footprints: 3x3 at offsets based on config limits
          const houseCount = settlement.config.houses;
          let isHouse = false;
          let houseRole = "";
          for (let i = 0; i < houseCount; i++) {
            const offset = SettlementGenerator.HOUSE_OFFSETS[i];
            const hx = dx - offset.x;
            const hy = dy - offset.y;

            if (Math.abs(hx) <= 1 && Math.abs(hy) <= 1) {
              isHouse = true;
              houseRole = (hx === 0 && hy === 0) ? "house_center" : "house_wall";
              break;
            }
          }

          if (isHouse) {
            return { settlement, role: houseRole, walkable: false };
          }

          // 4. Vertical Road: dx === 0 inside the village
          if (dx === 0) {
            return { settlement, role: "road", walkable: true };
          }

          // 5. Just standard village clearance zone (clears trees/rocks)
          return { settlement, role: "clearance", walkable: true };
        }
      }
    }

    return null;
  }
}
