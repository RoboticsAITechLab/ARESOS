export class ScoreSystem {
  private currentScore = 0;
  private coinValue = 10;
  private distanceMultiplier = 1;

  public getScore(): number {
    return Math.floor(this.currentScore);
  }

  public reset(): void {
    this.currentScore = 0;
  }

  public addCoinScore(): void {
    this.currentScore += this.coinValue;
  }

  public deductObstaclePenalty(): void {
    this.currentScore = Math.max(0, this.currentScore - 25);
  }

  public deductOffRoadPenalty(): void {
    this.currentScore = Math.max(0, this.currentScore - 100);
  }

  public updateDistanceScore(distanceDelta: number): void {
    this.currentScore += distanceDelta * this.distanceMultiplier;
  }

  public addDriftBonus(driftDuration: number): void {
    this.currentScore += driftDuration * 10;
  }

  public addSpeedBonus(speed: number, dt: number): void {
    this.currentScore += (speed / 10) * dt;
  }
}
