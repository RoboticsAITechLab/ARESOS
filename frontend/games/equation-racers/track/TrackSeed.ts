export class TrackSeed {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 1;
  }

  public next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public integerRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public choice<T>(arr: T[]): T {
    const idx = this.integerRange(0, arr.length - 1);
    return arr[idx];
  }
}
