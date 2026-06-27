export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 1.0 down to 0.0
  decay: number;
  gravity?: number;
}

export interface CoinFlyEffect {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0.0 to 1.0
}

export interface TireTrail {
  id: number;
  x: number; // World X coordinate (scrolls with track)
  y: number; // World Y coordinate
  life: number; // 1.0 down to 0.0
  decay: number;
}

export interface WindStreak {
  id: number;
  x: number; // screen space X
  y: number; // screen space Y
  length: number;
  speed: number;
  opacity: number;
}

export class AnimationManager {
  public particles: Particle[] = [];
  public coinFlies: CoinFlyEffect[] = [];
  public tireTrails: TireTrail[] = [];
  public windStreaks: WindStreak[] = [];
  
  // Screen flash intensity multipliers
  public correctFlash = 0.0;
  public wrongFlash = 0.0;
  public milestoneFlash = 0.0;

  // Performance safeguards
  public lowPerformanceMode = false;
  private fpsDropFrames = 0;

  private nextParticleId = 0;
  private nextCoinFlyId = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.particles = [];
    this.coinFlies = [];
    this.tireTrails = [];
    this.windStreaks = [];
    this.correctFlash = 0.0;
    this.wrongFlash = 0.0;
    this.milestoneFlash = 0.0;
    this.lowPerformanceMode = false;
    this.fpsDropFrames = 0;
  }

  /**
   * Spawns sparkly trail sparks when collecting coins or hitting boost pads
   */
  public spawnSparks(x: number, y: number, color = "#fbbf24", count = 10): void {
    if (this.lowPerformanceMode) count = Math.max(2, Math.floor(count * 0.3));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 30;
      this.particles.push({
        id: this.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        life: 1.0,
        decay: Math.random() * 1.5 + 1.0
      });
    }
  }

  /**
   * Spawns colorful confetti falling down the screen on milestones
   */
  public spawnConfetti(x: number, y: number, count = 35): void {
    if (this.lowPerformanceMode) count = Math.max(10, Math.floor(count * 0.4));
    const colors = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#fbbf24", "#ef4444"];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI - Math.PI; // upward arc
      const speed = Math.random() * 200 + 100;
      this.particles.push({
        id: this.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 3,
        life: 1.5,
        decay: Math.random() * 0.5 + 0.4,
        gravity: 120 // gravity pull
      });
    }
  }

  /**
   * Spawns road tire marks during sharp turning or skidding
   */
  public spawnTireTrail(worldX: number, worldY: number, decay = 1.8): void {
    if (this.lowPerformanceMode) return; // skip trails in low performance
    this.tireTrails.push({
      id: this.nextParticleId++,
      x: worldX,
      y: worldY,
      life: 1.0,
      decay
    });
  }

  /**
   * Spawns tyre dust particles close to track curbs
   */
  public spawnDust(x: number, y: number, count = 2): void {
    if (this.lowPerformanceMode) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.35;
      const speed = Math.random() * 60 + 30;
      this.particles.push({
        id: this.nextParticleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 40,
        color: "rgba(120, 113, 108, 0.45)", // warm stone grey dust
        size: Math.random() * 3 + 2,
        life: 0.7,
        decay: Math.random() * 1.5 + 1.2
      });
    }
  }

  /**
   * Initiates a coin visual collection path from collection position to HUD target coordinates
   */
  public spawnCoinFly(startX: number, startY: number, targetX: number, targetY: number): void {
    this.coinFlies.push({
      id: this.nextCoinFlyId++,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      targetX,
      targetY,
      progress: 0.0
    });
  }

  /**
   * Activates full-screen color flashes
   */
  public triggerFlash(type: "correct" | "wrong" | "milestone"): void {
    if (type === "correct") this.correctFlash = 0.5;
    else if (type === "wrong") this.wrongFlash = 0.6;
    else if (type === "milestone") this.milestoneFlash = 0.7;
  }

  /**
   * Frame update of screens chimes, decay cycles, and particle vectors
   */
  public update(dt: number, speedRatio = 1.0, screenWidth = 800): void {
    // Dynamic Performance budget evaluation: check if dt exceeds 24ms (~40 FPS)
    if (dt > 0.024) {
      this.fpsDropFrames++;
      if (this.fpsDropFrames > 5) {
        this.lowPerformanceMode = true;
      }
    } else if (dt < 0.017) {
      this.fpsDropFrames = Math.max(0, this.fpsDropFrames - 1);
      if (this.fpsDropFrames === 0) {
        this.lowPerformanceMode = false;
      }
    }

    // Decays flash timers
    if (this.correctFlash > 0) this.correctFlash = Math.max(0, this.correctFlash - 3 * dt);
    if (this.wrongFlash > 0) this.wrongFlash = Math.max(0, this.wrongFlash - 2 * dt);
    if (this.milestoneFlash > 0) this.milestoneFlash = Math.max(0, this.milestoneFlash - 1.5 * dt);

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) {
        p.vy += p.gravity * dt;
      }
      p.life = Math.max(0, p.life - p.decay * dt);
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Update tire trails
    for (const t of this.tireTrails) {
      t.life = Math.max(0, t.life - t.decay * dt);
    }
    this.tireTrails = this.tireTrails.filter(t => t.life > 0);

    // Spawn wind streaks if cruising at high speeds
    if (speedRatio > 1.4 && !this.lowPerformanceMode && Math.random() < 0.28) {
      this.windStreaks.push({
        id: this.nextParticleId++,
        x: Math.random() * screenWidth,
        y: -100,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 500 + 450,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    // Update wind streaks
    for (const w of this.windStreaks) {
      w.y += w.speed * dt;
    }
    this.windStreaks = this.windStreaks.filter(w => w.y < 650);

    // Update coin HUD animations
    const flySpeed = 2.2; // complete fly in 0.45s
    for (const c of this.coinFlies) {
      c.progress = Math.min(1.0, c.progress + flySpeed * dt);
      
      // Quadratic bezier curve interpolation to give a curved fly arc
      const t = c.progress;
      const tSq = t * t;
      const oneMinusT = 1 - t;
      const oneMinusTSq = oneMinusT * oneMinusT;

      // Control point creates a loop/offset shape
      const controlX = (c.startX + c.targetX) / 2 - 120;
      const controlY = (c.startY + c.targetY) / 2 - 60;

      c.currentX = oneMinusTSq * c.startX + 2 * oneMinusT * t * controlX + tSq * c.targetX;
      c.currentY = oneMinusTSq * c.startY + 2 * oneMinusT * t * controlY + tSq * c.targetY;
    }
    this.coinFlies = this.coinFlies.filter(c => c.progress < 1.0);
  }
}
