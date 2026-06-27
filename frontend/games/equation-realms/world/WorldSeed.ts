export class WorldSeed {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a deterministic pseudo-random float between 0 and 1
  public random(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns a deterministic pseudo-random integer between min (inclusive) and max (exclusive)
  public randomRange(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  public getSeed(): number {
    return this.seed;
  }
}
