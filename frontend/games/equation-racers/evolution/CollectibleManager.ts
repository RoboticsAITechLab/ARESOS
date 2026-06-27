export interface Collectible {
  id: string;
  lane: number; // 0 = Left, 1 = Center, 2 = Right
  y: number; // Y coordinate on track
  type: "coin" | "shield" | "magnet" | "double" | "xp" | "mystery";
  isCollected: boolean;
  
  // Magnet attraction properties
  x?: number; // active visual coordinates when magnet pulls
  yOffset?: number;
}

export class CollectibleManager {
  private collectibles: Collectible[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.collectibles = [];
  }

  public getCollectibles(): Collectible[] {
    return this.collectibles;
  }

  /**
   * Spawns a collectible item in a specific lane and Y coordinate
   */
  public spawnCollectible(id: string, lane: number, y: number, type: Collectible["type"]): void {
    this.collectibles.push({
      id,
      lane,
      y,
      type,
      isCollected: false
    });
  }

  /**
   * Updates coordinates, processes Magnet pulls, and detects player collection hits.
   * Returns an array of collected items.
   */
  public update(
    dt: number,
    carX: number,
    carY: number,
    roadCenterXAtY: (y: number) => number,
    roadWidthAtY: (y: number) => number,
    magnetActive: boolean
  ): Collectible[] {
    const collected: Collectible[] = [];

    for (const item of this.collectibles) {
      if (item.isCollected) continue;

      // Calculate base world coordinate of this item on the curving track
      const cx = roadCenterXAtY(item.y);
      const w = roadWidthAtY(item.y);
      const laneWidth = w / 3;
      const baseItemX = cx + (item.lane - 1) * laneWidth;
      const baseItemY = item.y;

      // Handle custom coordinates in case magnet pull is active
      if (item.x === undefined) item.x = baseItemX;

      // Magnet pull logic: if magnet active, pull items within 250px vertical proximity
      if (magnetActive) {
        const dx = carX - item.x;
        const dy = carY - item.y; // note carY and item.y are negative coordinates
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250) {
          // Pull item towards car
          const pullSpeed = 300; // pixels per second
          item.x += (dx / dist) * pullSpeed * dt;
          item.y += (dy / dist) * pullSpeed * dt;
        }
      }

      // Check collision with the car
      const dx = carX - (item.x ?? baseItemX);
      const dy = carY - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const hitBoxSize = 25; // overlap radius
      if (dist < hitBoxSize) {
        item.isCollected = true;
        collected.push(item);
      }
    }

    return collected;
  }

  /**
   * Delete collectibles that are far behind the car to conserve memory (gate.y > carY + 800)
   */
  public cleanUp(carY: number): void {
    this.collectibles = this.collectibles.filter(item => !item.isCollected && item.y <= carY + 1200);
  }
}
