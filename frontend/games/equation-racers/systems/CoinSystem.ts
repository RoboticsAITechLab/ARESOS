import { Vector2D } from "../types/GameTypes";
import { TrackGenerator } from "../track/TrackGenerator";
import { TrackSeed } from "../track/TrackSeed";

export interface Coin {
  id: string;
  position: Vector2D;
  isCollected: boolean;
}

export class CoinSystem {
  private coins: Coin[] = [];

  constructor(private seed: TrackSeed) {}

  public spawnCoins(track: TrackGenerator): void {
    this.coins = [];
    const segments = track.getSegments();
    
    let coinCounter = 0;
    for (const seg of segments) {
      const coinCount = this.seed.integerRange(3, 6);
      const step = seg.length / (coinCount + 1);

      for (let i = 1; i <= coinCount; i++) {
        const coinY = seg.yStart - (i * step);
        const centerX = track.getCenterXAt(coinY);
        const offset = this.seed.range(-40, 40);

        this.coins.push({
          id: `coin-${coinCounter++}`,
          position: { x: centerX + offset, y: coinY },
          isCollected: false
        });
      }
    }
  }

  public getCoins(): Coin[] {
    return this.coins;
  }

  public update(carPos: Vector2D, magnetRadius: number, dt: number): number {
    let collectedCount = 0;
    const pullSpeed = 400;

    for (const coin of this.coins) {
      if (coin.isCollected) continue;

      const dx = coin.position.x - carPos.x;
      const dy = coin.position.y - carPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 15) {
        coin.isCollected = true;
        collectedCount++;
      } else if (dist < magnetRadius) {
        const moveDist = pullSpeed * dt;
        const ratio = Math.min(1, moveDist / dist);
        coin.position.x -= dx * ratio;
        coin.position.y -= dy * ratio;
      }
    }

    return collectedCount;
  }

  public getClosestCoin(carPos: Vector2D): Coin | null {
    let closestCoin: Coin | null = null;
    let minDist = Infinity;

    for (const coin of this.coins) {
      if (coin.isCollected) continue;
      const dx = coin.position.x - carPos.x;
      const dy = coin.position.y - carPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closestCoin = coin;
      }
    }

    return closestCoin;
  }
}
