export interface WaveConfig {
  difficulty: number;
  spawnInterval: number; // ms
  allowedTypes: string[];
  maxEnemies: number;
}

export class WaveDirector {
  private worldTime = 0; // Elapsed seconds

  constructor(initialTime = 0) {
    this.worldTime = initialTime;
  }

  public updateTime(deltaSeconds: number): void {
    this.worldTime += deltaSeconds;
  }

  public setTime(seconds: number): void {
    this.worldTime = seconds;
  }

  public getTime(): number {
    return this.worldTime;
  }

  public getDifficulty(): number {
    // 0-5 Minutes (0-300s): Difficulty 1
    // 5-10 Minutes (300-600s): Difficulty 2
    // 10-20 Minutes (600-1200s): Difficulty 3
    // 20+ Minutes (1200s+): Difficulty 4
    if (this.worldTime < 300) return 1;
    if (this.worldTime < 600) return 2;
    if (this.worldTime < 1200) return 3;
    return 4;
  }

  public getWaveConfig(): WaveConfig {
    const diff = this.getDifficulty();

    switch (diff) {
      case 1:
        return {
          difficulty: 1,
          spawnInterval: 2200,
          allowedTypes: ["slime"],
          maxEnemies: 15,
        };
      case 2:
        return {
          difficulty: 2,
          spawnInterval: 1800,
          allowedTypes: ["slime", "wolf"],
          maxEnemies: 25,
        };
      case 3:
        return {
          difficulty: 3,
          spawnInterval: 1400,
          allowedTypes: ["wolf", "goblin"],
          maxEnemies: 35,
        };
      case 4:
      default:
        return {
          difficulty: 4,
          spawnInterval: 950, // Rapid spawn
          allowedTypes: ["slime", "wolf", "goblin"], // Mix all
          maxEnemies: 50, // High density
        };
    }
  }
}
