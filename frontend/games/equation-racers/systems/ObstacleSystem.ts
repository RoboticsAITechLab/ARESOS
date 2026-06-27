import { Vector2D } from "../types/GameTypes";
import { TrackGenerator } from "../track/TrackGenerator";
import { TrackSeed } from "../track/TrackSeed";

export interface Obstacle {
  id: string;
  position: Vector2D;
  radius: number;
  damageValue: number;
}

export class ObstacleSystem {
  private obstacles: Obstacle[] = [];

  constructor(private seed: TrackSeed) {}

  public spawnObstacles(track: TrackGenerator): void {
    this.obstacles = [];
    const segments = track.getSegments();

    let obsCounter = 0;
    for (let s = 1; s < segments.length; s++) {
      const seg = segments[s];
      const count = this.seed.integerRange(1, 3);
      const step = seg.length / (count + 1);

      for (let i = 1; i <= count; i++) {
        const obsY = seg.yStart - (i * step);
        const centerX = track.getCenterXAt(obsY);
        const roadWidth = track.getWidthAt(obsY);
        const offset = this.seed.range(-roadWidth / 3, roadWidth / 3);

        this.obstacles.push({
          id: `obs-${obsCounter++}`,
          position: { x: centerX + offset, y: obsY },
          radius: this.seed.range(15, 25),
          damageValue: this.seed.range(10, 25)
        });
      }
    }
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public checkCollisions(carPos: Vector2D, carRadius = 16): number {
    let totalDamageInflicted = 0;

    for (const obs of this.obstacles) {
      if (obs.position.y === 999999) continue;
      const dx = obs.position.x - carPos.x;
      const dy = obs.position.y - carPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minCollideDist = obs.radius + carRadius;

      if (dist < minCollideDist) {
        totalDamageInflicted += obs.damageValue;
        obs.position.y = 999999; // Move obstacle off world to prevent double collision
      }
    }

    return totalDamageInflicted;
  }

  public getClosestObstacle(carPos: Vector2D): Obstacle | null {
    let closestObs: Obstacle | null = null;
    let minDist = Infinity;

    for (const obs of this.obstacles) {
      if (obs.position.y === 999999) continue;
      const dx = obs.position.x - carPos.x;
      const dy = obs.position.y - carPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closestObs = obs;
      }
    }

    return closestObs;
  }
}
