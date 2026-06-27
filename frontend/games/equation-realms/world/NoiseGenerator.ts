import { WorldSeed } from "./WorldSeed";

export class NoiseGenerator {
  private p: number[] = new Array(512);

  constructor(seed: number) {
    const rng = new WorldSeed(seed);
    // Initialize permutation table
    const permutation = Array.from({ length: 256 }, (_, i) => i);
    
    // Shuffle permutation using seeded RNG
    for (let i = 255; i > 0; i--) {
      const j = rng.randomRange(0, i + 1);
      const temp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = temp;
    }

    // Duplicate the permutation array
    for (let i = 0; i < 512; i++) {
      this.p[i] = permutation[i & 255];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? 2.0 * v : -2.0 * v);
  }

  // Returns noise value between -1.0 and 1.0 (approximately)
  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.p[this.p[X] + Y];
    const ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X] + 1 + Y];
    const bb = this.p[this.p[X] + 1 + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return this.lerp(v, x1, x2);
  }

  // Fractal Brownian Motion (FBM) with multiple octaves
  public fbm2D(x: number, y: number, octaves: number = 4, lacunarity: number = 2.0, gain: number = 0.5): number {
    let total = 0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
