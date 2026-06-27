export interface ActiveObstacle {
  id: string;
  type: "cone" | "barrier";
  lane: number;
  y: number; // absolute Y coordinate on track
  isHit: boolean;
}

export class ObstacleManager {
  private activeObstacles: ActiveObstacle[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.activeObstacles = [];
  }

  public getObstacles(): ActiveObstacle[] {
    return this.activeObstacles;
  }

  /**
   * Spawns/registers active obstacles in absolute coordinates
   */
  public registerObstacle(id: string, type: "cone" | "barrier", lane: number, y: number): void {
    if (this.activeObstacles.some(o => o.id === id)) return;
    this.activeObstacles.push({
      id,
      type,
      lane,
      y,
      isHit: false
    });
  }

  /**
   * Checks collision between the player car and active obstacles.
   * Returns an array of obstacles hit in the current frame.
   */
  public updateCollisions(
    carX: number,
    carY: number,
    roadCenterXAtY: (y: number) => number,
    roadWidthAtY: (y: number) => number,
    numLanes: number
  ): ActiveObstacle[] {
    const newlyHit: ActiveObstacle[] = [];

    for (const obs of this.activeObstacles) {
      if (obs.isHit) continue;

      // Calculate base horizontal placement of the obstacle
      const cx = roadCenterXAtY(obs.y);
      const w = roadWidthAtY(obs.y);
      const laneWidth = w / numLanes;
      const obsX = cx + (obs.lane - (numLanes - 1) / 2) * laneWidth;

      const dx = carX - obsX;
      const dy = carY - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hitboxes: Cones are small, barriers block the lane more widely
      const hitRadius = obs.type === "cone" ? 18 : 26;

      if (dist < hitRadius) {
        obs.isHit = true;
        newlyHit.push(obs);
      }
    }

    return newlyHit;
  }

  /**
   * Delete obstacles far behind the car to save memory
   */
  public cleanUp(carY: number): void {
    this.activeObstacles = this.activeObstacles.filter(o => !o.isHit && o.y <= carY + 1200);
  }
}
