// Neon Duel Game Engine
// High-fidelity 2D Space Duel Engine featuring a dynamic warp grid, particle physics, sound synthesis, and AI.

export type ShipType = "interceptor" | "goliath";
export type ArenaTheme = "cybergrid" | "hyperdrive" | "abyss";
export type AIDifficulty = "easy" | "normal" | "hard";
export type WeaponType = "normal" | "triple" | "railgun" | "missile";
export type PowerUpType = "shield" | "triple" | "railgun" | "missile" | "speed";

export interface GameSettings {
  mode: "solo" | "duo";
  theme: ArenaTheme;
  p1Type: ShipType;
  p2Type: ShipType;
  aiDifficulty: AIDifficulty;
  p1Color?: string;
  p2Color?: string;
}

export interface GridNode {
  x: number;
  y: number;
  ox: number; // original x
  oy: number; // original y
  vx: number;
  vy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: "spark" | "thrust" | "dust" | "ring" | "glow";
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  color: string;
  owner: 1 | 2;
  type: WeaponType;
  damage: number;
  size: number;
  life: number;
  maxLife: number;
  target?: Ship;
}

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  color: string;
  size: number;
  pulse: number;
  life: number;
}

export class Ship {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  angle: number;
  type: ShipType;
  color: string;
  id: 1 | 2;
  
  health = 3;
  maxHealth = 3;
  shield = 100;
  maxShield = 100;
  shieldRegen = 0.05;
  shieldHitCooldown = 0;
  
  cooldown = 0;
  maxCooldown = 12;
  
  activeWeapon: WeaponType = "normal";
  weaponTime = 0;
  
  speedMultiplier = 1.0;
  speedTime = 0;
  
  width = 24;
  height = 24;
  
  trail: { x: number; y: number; life: number }[] = [];

  constructor(x: number, y: number, angle: number, type: ShipType, color: string, id: 1 | 2) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.type = type;
    this.color = color;
    this.id = id;

    if (type === "goliath") {
      this.maxHealth = 4;
      this.health = 4;
      this.maxShield = 150;
      this.shield = 150;
      this.maxCooldown = 20;
      this.width = 30;
      this.height = 30;
      this.shieldRegen = 0.03;
    }
  }

  update(width: number, height: number) {
    const buffer = this.width / 2;
    if (this.x < buffer) { this.x = buffer; this.vx = -this.vx * 0.4; }
    else if (this.x > width - buffer) { this.x = width - buffer; this.vx = -this.vx * 0.4; }

    if (this.y < buffer) { this.y = buffer; this.vy = -this.vy * 0.4; }
    else if (this.y > height - buffer) { this.y = height - buffer; this.vy = -this.vy * 0.4; }

    if (this.cooldown > 0) this.cooldown--;
    if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
    if (this.weaponTime > 0) {
      this.weaponTime--;
      if (this.weaponTime === 0) this.activeWeapon = "normal";
    }
    if (this.speedTime > 0) {
      this.speedTime--;
      if (this.speedTime === 0) this.speedMultiplier = 1.0;
    }

    if (this.shieldHitCooldown === 0 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen);
    }

    this.trail.push({ x: this.x, y: this.y, life: 1.0 });
    if (this.trail.length > (this.type === "interceptor" ? 15 : 10)) {
      this.trail.shift();
    }
    this.trail.forEach(t => t.life -= 0.08);
  }
}

// Procedural Audio Synthesizer using Web Audio API
export class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmInterval: any = null;
  private isBgmPlaying = false;

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.stopBGM();
    } else if (this.isBgmPlaying) {
      this.startBGM();
    }
  }

  public playLaser(type: WeaponType) {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "railgun") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    } else if (type === "missile") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playExplosion() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(10, now + 0.45);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.55);
  }

  public playShieldHit() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playPowerup() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(450, now + 0.08);
    osc.frequency.setValueAtTime(600, now + 0.16);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public startBGM() {
    this.isBgmPlaying = true;
    if (this.muted) return;
    this.initCtx();
    this.stopBGM();

    const bpm = 110;
    const stepTime = 60 / bpm / 2;
    let step = 0;
    const bassline = [110, 110, 130, 110, 98, 98, 110, 82];

    this.bgmInterval = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = "sawtooth";
      const noteFreq = bassline[step % bassline.length] / 2;
      bassOsc.frequency.setValueAtTime(noteFreq, now);

      bassGain.gain.setValueAtTime(0.06, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 0.9);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(250, now);

      bassOsc.connect(lp);
      lp.connect(bassGain);
      bassGain.connect(ctx.destination);

      bassOsc.start(now);
      bassOsc.stop(now + stepTime);

      if (step % 2 === 1) {
        const hhOsc = ctx.createOscillator();
        const hhGain = ctx.createGain();
        hhOsc.type = "triangle";
        hhOsc.frequency.setValueAtTime(10000, now);
        hhGain.gain.setValueAtTime(0.015, now);
        hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        hhOsc.connect(hhGain);
        hhGain.connect(ctx.destination);
        hhOsc.start(now);
        hhOsc.stop(now + 0.05);
      }

      step++;
    }, stepTime * 1000);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public cleanup() {
    this.stopBGM();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Full Space Combat Engine Class (Pure 2D)
export class NeonDuelEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  settings: GameSettings;
  audio: AudioSynth;

  width = 800;
  height = 550;

  p1!: Ship;
  p2!: Ship;

  bullets: Bullet[] = [];
  particles: Particle[] = [];
  powerUps: PowerUp[] = [];

  // Warping Grid properties
  gridNodes: GridNode[][] = [];
  gridCols = 24;
  gridRows = 16;
  gridSpring = 0.04;
  gridDamp = 0.92;

  // Screen shake
  shakeAmount = 0;
  shakeTime = 0;

  scoreP1 = 0;
  scoreP2 = 0;
  timeRemaining = 120;

  onGameOver: (winner: string, s1: number, s2: number) => void;
  onTimerUpdate: (timeStr: string) => void;
  onScoreUpdate: (p1: number, p2: number) => void;
  onHpUpdate: (p1Hp: number, p2Hp: number) => void;
  onStatusMsg: (msg: string) => void;

  private activeKeys: { [key: string]: boolean } = {};
  private timerInterval: any = null;
  cleanupListeners?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    settings: GameSettings,
    audio: AudioSynth,
    callbacks: {
      onGameOver: (winner: string, s1: number, s2: number) => void;
      onTimerUpdate: (timeStr: string) => void;
      onScoreUpdate: (p1: number, p2: number) => void;
      onHpUpdate: (p1Hp: number, p2Hp: number) => void;
      onStatusMsg: (msg: string) => void;
    }
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not acquire 2D Canvas context");
    this.ctx = context;
    this.settings = settings;
    this.audio = audio;

    this.onGameOver = callbacks.onGameOver;
    this.onTimerUpdate = callbacks.onTimerUpdate;
    this.onScoreUpdate = callbacks.onScoreUpdate;
    this.onHpUpdate = callbacks.onHpUpdate;
    this.onStatusMsg = callbacks.onStatusMsg;

    this.resizeCanvas();
    this.reset();
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    this.width = rect?.width || 800;
    this.height = rect?.height || 550;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.initGrid();
  }

  reset() {
    const p1Col = this.settings.p1Color || "#06b6d4";
    const p2Col = this.settings.p2Color || "#ec4899";
    this.p1 = new Ship(this.width * 0.2, this.height * 0.5, 0, this.settings.p1Type, p1Col, 1);
    this.p2 = new Ship(this.width * 0.8, this.height * 0.5, Math.PI, this.settings.p2Type, p2Col, 2);

    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.timeRemaining = 120;
    this.shakeAmount = 0;
    this.shakeTime = 0;

    this.initGrid();
    this.startTimer();
    this.onHpUpdate(this.p1.health, this.p2.health);
    this.onScoreUpdate(0, 0);
  }

  initGrid() {
    this.gridNodes = [];
    const stepX = this.width / (this.gridCols - 1);
    const stepY = this.height / (this.gridRows - 1);

    for (let r = 0; r < this.gridRows; r++) {
      const row: GridNode[] = [];
      for (let c = 0; c < this.gridCols; c++) {
        const x = c * stepX;
        const y = r * stepY;
        row.push({
          x,
          y,
          ox: x,
          oy: y,
          vx: 0,
          vy: 0
        });
      }
      this.gridNodes.push(row);
    }
  }

  warpGrid(cx: number, cy: number, force: number, radius: number) {
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const node = this.gridNodes[r][c];
        const dx = node.x - cx;
        const dy = node.y - cy;
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius * radius;

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const forceFactor = (1 - dist / radius) * force;
          const angle = Math.atan2(dy, dx);
          node.vx += Math.cos(angle) * forceFactor;
          node.vy += Math.sin(angle) * forceFactor;
        }
      }
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      const mins = Math.floor(this.timeRemaining / 60).toString().padStart(2, "0");
      const secs = (this.timeRemaining % 60).toString().padStart(2, "0");
      this.onTimerUpdate(`${mins}:${secs}`);

      if (this.timeRemaining <= 0) {
        this.endMatch();
      }

      if (this.timeRemaining % 8 === 0 && Math.random() < 0.8) {
        this.spawnPowerUp();
      }
    }, 1000);
  }

  spawnPowerUp() {
    const types: PowerUpType[] = ["shield", "triple", "railgun", "missile", "speed"];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = {
      shield: "#22c55e",
      triple: "#eab308",
      railgun: "#a855f7",
      missile: "#ef4444",
      speed: "#3b82f6"
    };

    const x = Math.random() * (this.width - 80) + 40;
    const y = Math.random() * (this.height - 80) + 40;

    this.powerUps.push({
      x,
      y,
      type,
      color: colors[type],
      size: 10,
      pulse: 0,
      life: 600
    });

    this.onStatusMsg(`POWER-UP SPAWNED: ${type.toUpperCase()}`);
  }

  handleKeyDown(key: string) {
    this.activeKeys[key.toLowerCase()] = true;
  }

  handleKeyUp(key: string) {
    this.activeKeys[key.toLowerCase()] = false;
  }

  triggerScreenShake(strength: number) {
    this.shakeAmount = strength;
    this.shakeTime = 12;
  }

  spawnParticles(x: number, y: number, color: string, count: number, type: Particle["type"] = "spark") {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (type === "thrust" ? 2 : 5) + (type === "ring" ? 4 : 1);
      const maxLife = Math.random() * 20 + 10;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * (type === "ring" ? 6 : 3) + 1,
        alpha: 1.0,
        life: maxLife,
        maxLife,
        type
      });
    }
  }

  fireBullet(ship: Ship) {
    if (ship.cooldown > 0) return;

    this.audio.playLaser(ship.activeWeapon);

    const speed = 10;
    const angle = ship.angle;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    const muzzleX = ship.x + dirX * 18;
    const muzzleY = ship.y + dirY * 18;

    this.warpGrid(muzzleX, muzzleY, -3, 30);

    if (ship.activeWeapon === "triple") {
      const offsets = [-0.15, 0, 0.15];
      offsets.forEach(offset => {
        const ang = angle + offset;
        this.bullets.push({
          x: muzzleX,
          y: muzzleY,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          angle: ang,
          color: ship.color,
          owner: ship.id,
          type: "normal",
          damage: 1,
          size: 3,
          life: 0,
          maxLife: 60
        });
      });
      ship.cooldown = ship.maxCooldown;
    } else if (ship.activeWeapon === "railgun") {
      this.bullets.push({
        x: muzzleX,
        y: muzzleY,
        vx: dirX * 22,
        vy: dirY * 22,
        angle,
        color: "#a855f7",
        owner: ship.id,
        type: "railgun",
        damage: 2,
        size: 5,
        life: 0,
        maxLife: 40
      });
      ship.cooldown = ship.maxCooldown * 1.5;
      this.triggerScreenShake(8);
    } else if (ship.activeWeapon === "missile") {
      const target = ship.id === 1 ? this.p2 : this.p1;
      this.bullets.push({
        x: muzzleX,
        y: muzzleY,
        vx: dirX * 5,
        vy: dirY * 5,
        angle,
        color: "#ef4444",
        owner: ship.id,
        type: "missile",
        damage: 2,
        size: 5,
        life: 0,
        maxLife: 150,
        target
      });
      ship.cooldown = ship.maxCooldown * 1.2;
    } else {
      this.bullets.push({
        x: muzzleX,
        y: muzzleY,
        vx: dirX * 12,
        vy: dirY * 12,
        angle,
        color: ship.color,
        owner: ship.id,
        type: "normal",
        damage: 1,
        size: 3,
        life: 0,
        maxLife: 60
      });
      ship.cooldown = ship.maxCooldown;
    }
  }

  processAI() {
    const ai = this.p2;
    const player = this.p1;
    const diff = this.settings.aiDifficulty;

    let reactionSpeed = 0.04;
    let dodgeRange = 100;
    let shootRandomness = 0.08;

    if (diff === "easy") {
      reactionSpeed = 0.02;
      dodgeRange = 50;
      shootRandomness = 0.25;
    } else if (diff === "hard") {
      reactionSpeed = 0.09;
      dodgeRange = 150;
      shootRandomness = 0.02;
    }

    let targetX = player.x;
    let targetY = player.y;

    if (ai.shield < 40 && this.powerUps.length > 0) {
      const closestPowerUp = this.powerUps.reduce((prev, curr) => {
        const d1 = Math.hypot(prev.x - ai.x, prev.y - ai.y);
        const d2 = Math.hypot(curr.x - ai.x, curr.y - ai.y);
        return d1 < d2 ? prev : curr;
      });
      targetX = closestPowerUp.x;
      targetY = closestPowerUp.y;
    }

    let dodgeX = 0;
    let dodgeY = 0;
    let bulletNearby = false;

    for (const b of this.bullets) {
      if (b.owner === 1) {
        const dist = Math.hypot(b.x - ai.x, b.y - ai.y);
        if (dist < dodgeRange) {
          dodgeX += (ai.x - b.x) / dist;
          dodgeY += (ai.y - b.y) / dist;
          bulletNearby = true;
        }
      }
    }

    if (bulletNearby) {
      targetX += dodgeX * 120;
      targetY += dodgeY * 120;
    }

    const angleToTarget = Math.atan2(targetY - ai.y, targetX - ai.x);

    let angleDiff = angleToTarget - ai.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    ai.angle += angleDiff * reactionSpeed;

    const distToTarget = Math.hypot(targetX - ai.x, targetY - ai.y);
    const speed = ai.type === "interceptor" ? 0.15 : 0.08;
    const maxVelocity = (ai.type === "interceptor" ? 4.5 : 2.5) * ai.speedMultiplier;

    if (distToTarget > 60 || bulletNearby) {
      ai.vx += Math.cos(ai.angle) * speed;
      ai.vy += Math.sin(ai.angle) * speed;
    }

    const vel = Math.hypot(ai.vx, ai.vy);
    if (vel > maxVelocity) {
      ai.vx = (ai.vx / vel) * maxVelocity;
      ai.vy = (ai.vy / vel) * maxVelocity;
    }

    if (ai.cooldown === 0 && Math.abs(angleDiff) < 0.25) {
      const distToPlayer = Math.hypot(player.x - ai.x, player.y - ai.y);
      const bulletSpeed = 12;
      const timeToHit = distToPlayer / bulletSpeed;
      const predictedPlayerX = player.x + player.vx * timeToHit;
      const predictedPlayerY = player.y + player.vy * timeToHit;
      
      const predAngle = Math.atan2(predictedPlayerY - ai.y, predictedPlayerX - ai.x);
      let predDiff = predAngle - ai.angle;
      while (predDiff < -Math.PI) predDiff += Math.PI * 2;
      while (predDiff > Math.PI) predDiff -= Math.PI * 2;

      if (Math.abs(predDiff) < shootRandomness + 0.1) {
        this.fireBullet(ai);
      }
    }
  }

  processP1Inputs() {
    const p = this.p1;
    const rotationSpeed = p.type === "interceptor" ? 0.07 : 0.04;
    const accel = p.type === "interceptor" ? 0.16 : 0.09;
    const maxVelocity = (p.type === "interceptor" ? 5.0 : 3.0) * p.speedMultiplier;

    if (this.activeKeys["a"] || (this.settings.mode === "solo" && this.activeKeys["arrowleft"])) {
      p.angle -= rotationSpeed;
    } else if (this.activeKeys["d"] || (this.settings.mode === "solo" && this.activeKeys["arrowright"])) {
      p.angle += rotationSpeed;
    }

    const isThrusting = this.activeKeys["w"] || (this.settings.mode === "solo" && this.activeKeys["arrowup"]);

    if (isThrusting) {
      p.vx += Math.cos(p.angle) * accel;
      p.vy += Math.sin(p.angle) * accel;

      const exhaustX = p.x - Math.cos(p.angle) * 12;
      const exhaustY = p.y - Math.sin(p.angle) * 12;
      this.spawnParticles(exhaustX, exhaustY, p.color, 1, "thrust");
      this.warpGrid(exhaustX, exhaustY, 1, 20);
    }

    p.vx *= 0.985;
    p.vy *= 0.985;

    const velocity = Math.hypot(p.vx, p.vy);
    if (velocity > maxVelocity) {
      p.vx = (p.vx / velocity) * maxVelocity;
      p.vy = (p.vy / velocity) * maxVelocity;
    }

    if (this.activeKeys[" "] || this.activeKeys["v"] || (this.settings.mode === "solo" && (this.activeKeys["enter"] || this.activeKeys["m"]))) {
      this.fireBullet(p);
    }
  }

  processP2Inputs() {
    const p = this.p2;
    const rotationSpeed = p.type === "interceptor" ? 0.07 : 0.04;
    const accel = p.type === "interceptor" ? 0.16 : 0.09;
    const maxVelocity = (p.type === "interceptor" ? 5.0 : 3.0) * p.speedMultiplier;

    if (this.activeKeys["arrowleft"]) {
      p.angle -= rotationSpeed;
    } else if (this.activeKeys["arrowright"]) {
      p.angle += rotationSpeed;
    }

    if (this.activeKeys["arrowup"]) {
      p.vx += Math.cos(p.angle) * accel;
      p.vy += Math.sin(p.angle) * accel;

      const exhaustX = p.x - Math.cos(p.angle) * 12;
      const exhaustY = p.y - Math.sin(p.angle) * 12;
      this.spawnParticles(exhaustX, exhaustY, p.color, 1, "thrust");
      this.warpGrid(exhaustX, exhaustY, 1, 20);
    }

    p.vx *= 0.985;
    p.vy *= 0.985;

    const velocity = Math.hypot(p.vx, p.vy);
    if (velocity > maxVelocity) {
      p.vx = (p.vx / velocity) * maxVelocity;
      p.vy = (p.vy / velocity) * maxVelocity;
    }

    if (this.activeKeys["enter"] || this.activeKeys["m"]) {
      this.fireBullet(p);
    }
  }

  updateEntities() {
    this.p1.x += this.p1.vx;
    this.p1.y += this.p1.vy;
    this.p1.update(this.width, this.height);

    this.p2.x += this.p2.vx;
    this.p2.y += this.p2.vy;
    this.p2.update(this.width, this.height);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life++;

      if (b.type === "missile" && b.target) {
        const targetAngle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
        let diff = targetAngle - b.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        b.angle += diff * 0.05;

        b.vx = Math.cos(b.angle) * 7;
        b.vy = Math.sin(b.angle) * 7;

        if (b.life % 2 === 0) {
          this.particles.push({
            x: b.x,
            y: b.y,
            vx: -b.vx * 0.2 + (Math.random() - 0.5),
            vy: -b.vy * 0.2 + (Math.random() - 0.5),
            color: "#eab308",
            size: 2,
            alpha: 0.8,
            life: 20,
            maxLife: 20,
            type: "dust"
          });
        }
      }

      b.x += b.vx;
      b.y += b.vy;

      if (b.type === "railgun" && b.life % 2 === 0) {
        this.warpGrid(b.x, b.y, 2, 40);
      }

      if (b.life >= b.maxLife || b.x < 0 || b.x > this.width || b.y < 0 || b.y > this.height) {
        this.bullets.splice(i, 1);
        continue;
      }

      const targetShip = b.owner === 1 ? this.p2 : this.p1;
      const dist = Math.hypot(b.x - targetShip.x, b.y - targetShip.y);
      if (dist < targetShip.width / 2 + b.size) {
        this.handleShipHit(targetShip, b);
        this.bullets.splice(i, 1);
        continue;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.life--;
      pu.pulse += 0.05;

      if (pu.life <= 0) {
        this.powerUps.splice(i, 1);
        continue;
      }

      const d1 = Math.hypot(pu.x - this.p1.x, pu.y - this.p1.y);
      if (d1 < this.p1.width / 2 + pu.size) {
        this.applyPowerUp(this.p1, pu.type);
        this.powerUps.splice(i, 1);
        continue;
      }

      const d2 = Math.hypot(pu.x - this.p2.x, pu.y - this.p2.y);
      if (d2 < this.p2.width / 2 + pu.size) {
        this.applyPowerUp(this.p2, pu.type);
        this.powerUps.splice(i, 1);
        continue;
      }
    }
  }

  handleShipHit(ship: Ship, bullet: Bullet) {
    this.audio.playShieldHit();
    this.triggerScreenShake(bullet.type === "railgun" ? 6 : 3);
    this.spawnParticles(bullet.x, bullet.y, ship.color, 12, "spark");
    this.warpGrid(bullet.x, bullet.y, -5, 50);

    if (ship.shield > 0) {
      ship.shield = Math.max(0, ship.shield - bullet.damage * 25);
      ship.shieldHitCooldown = 60;
      if (ship.shield === 0) {
        this.audio.playExplosion();
        this.onStatusMsg(`${ship.id === 1 ? "PLAYER 1" : "PLAYER 2"} SHIELD DOWN`);
      }
    } else {
      ship.health -= 1;
      this.audio.playExplosion();
      this.spawnParticles(ship.x, ship.y, "#f43f5e", 25, "spark");
      this.warpGrid(ship.x, ship.y, -12, 100);

      this.onHpUpdate(this.p1.health, this.p2.health);

      if (ship.health <= 0) {
        this.handleShipExplosion(ship);
      }
    }
  }

  applyPowerUp(ship: Ship, type: PowerUpType) {
    this.audio.playPowerup();
    this.spawnParticles(ship.x, ship.y, "#22c55e", 15, "glow");

    if (type === "shield") {
      ship.shield = ship.maxShield;
      this.onStatusMsg(`${ship.id === 1 ? "P1" : "P2"} SHIELD RESTORED`);
    } else if (type === "speed") {
      ship.speedMultiplier = 1.4;
      ship.speedTime = 300;
      this.onStatusMsg(`${ship.id === 1 ? "P1" : "P2"} SPEED HYPER-DRIVE`);
    } else {
      ship.activeWeapon = type;
      ship.weaponTime = 360;
      this.onStatusMsg(`${ship.id === 1 ? "P1" : "P2"} EQUIPPED ${type.toUpperCase()}`);
    }
  }

  handleShipExplosion(ship: Ship) {
    this.triggerScreenShake(18);
    this.spawnParticles(ship.x, ship.y, ship.color, 60, "ring");
    this.audio.playExplosion();

    if (ship.id === 1) {
      this.scoreP2++;
    } else {
      this.scoreP1++;
    }
    this.onScoreUpdate(this.scoreP1, this.scoreP2);

    ship.health = ship.maxHealth;
    ship.shield = ship.maxShield;
    ship.vx = 0;
    ship.vy = 0;
    if (ship.id === 1) {
      ship.x = this.width * 0.2;
      ship.y = this.height * 0.5;
      ship.angle = 0;
    } else {
      ship.x = this.width * 0.8;
      ship.y = this.height * 0.5;
      ship.angle = Math.PI;
    }

    this.onHpUpdate(this.p1.health, this.p2.health);
  }

  endMatch() {
    this.audio.stopBGM();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    let winner = "DRAW";
    if (this.scoreP1 > this.scoreP2) {
      winner = "PLAYER 1";
    } else if (this.scoreP2 > this.scoreP1) {
      winner = this.settings.mode === "solo" ? "CYBER-AI" : "PLAYER 2";
    }

    this.onGameOver(winner, this.scoreP1, this.scoreP2);
  }

  updateGrid() {
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const node = this.gridNodes[r][c];

        const dx = node.ox - node.x;
        const dy = node.oy - node.y;
        node.vx += dx * this.gridSpring;
        node.vy += dy * this.gridSpring;

        node.x += node.vx;
        node.y += node.vy;
        node.vx *= this.gridDamp;
        node.vy *= this.gridDamp;
      }
    }
  }

  update() {
    this.processP1Inputs();
    if (this.settings.mode === "solo") {
      this.processAI();
    } else {
      this.processP2Inputs();
    }

    this.updateEntities();
    this.updateGrid();

    if (this.shakeTime > 0) {
      this.shakeTime--;
      if (this.shakeTime === 0) this.shakeAmount = 0;
    }
  }

  draw() {
    this.ctx.save();

    if (this.shakeAmount > 0) {
      const dx = (Math.random() - 0.5) * this.shakeAmount;
      const dy = (Math.random() - 0.5) * this.shakeAmount;
      this.ctx.translate(dx, dy);
    }

    if (this.settings.theme === "abyss") {
      this.ctx.fillStyle = "#020005";
    } else if (this.settings.theme === "hyperdrive") {
      this.ctx.fillStyle = "#000508";
    } else {
      this.ctx.fillStyle = "#040408";
    }
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = this.settings.theme === "abyss" ? "rgba(236,72,153,0.12)" : "rgba(6,182,212,0.12)";
    this.ctx.lineWidth = 1;

    for (let r = 0; r < this.gridRows; r++) {
      this.ctx.beginPath();
      for (let c = 0; c < this.gridCols; c++) {
        const node = this.gridNodes[r][c];
        if (c === 0) this.ctx.moveTo(node.x, node.y);
        else this.ctx.lineTo(node.x, node.y);
      }
      this.ctx.stroke();
    }

    for (let c = 0; c < this.gridCols; c++) {
      this.ctx.beginPath();
      for (let r = 0; r < this.gridRows; r++) {
        const node = this.gridNodes[r][c];
        if (r === 0) this.ctx.moveTo(node.x, node.y);
        else this.ctx.lineTo(node.x, node.y);
      }
      this.ctx.stroke();
    }

    for (const pu of this.powerUps) {
      this.ctx.save();
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = pu.color;
      this.ctx.fillStyle = pu.color;
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;

      const size = pu.size + Math.sin(pu.pulse) * 3;
      this.ctx.beginPath();
      this.ctx.arc(pu.x, pu.y, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }

    for (const b of this.bullets) {
      this.ctx.save();
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = b.color;
      this.ctx.strokeStyle = b.color;
      this.ctx.lineWidth = b.size;

      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(b.x - b.vx * 0.8, b.y - b.vy * 0.8);
      this.ctx.stroke();
      this.ctx.restore();
    }

    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;

      this.ctx.beginPath();
      if (p.type === "ring") {
        this.ctx.arc(p.x, p.y, p.size * (1 + (p.maxLife - p.life) * 0.15), 0, Math.PI * 2);
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      } else {
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    const drawShip = (ship: Ship) => {
      this.ctx.save();
      this.ctx.translate(ship.x, ship.y);
      this.ctx.rotate(ship.angle);

      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = ship.color;
      this.ctx.strokeStyle = ship.color;
      this.ctx.lineWidth = 2.5;

      this.ctx.beginPath();
      if (ship.type === "interceptor") {
        this.ctx.moveTo(15, 0);
        this.ctx.lineTo(-12, -10);
        this.ctx.lineTo(-6, 0);
        this.ctx.lineTo(-12, 10);
      } else {
        this.ctx.moveTo(18, 0);
        this.ctx.lineTo(8, -12);
        this.ctx.lineTo(-14, -12);
        this.ctx.lineTo(-8, 0);
        this.ctx.lineTo(-14, 12);
        this.ctx.lineTo(8, 12);
      }
      this.ctx.closePath();
      this.ctx.stroke();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.arc(-8, 0, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();

      if (ship.shield > 0) {
        this.ctx.save();
        this.ctx.translate(ship.x, ship.y);
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = ship.color;
        this.ctx.strokeStyle = ship.color;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = 0.2 + (ship.shield / ship.maxShield) * 0.3;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, ship.width * 0.9, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    };

    drawShip(this.p1);
    drawShip(this.p2);

    this.ctx.restore();
  }
}
