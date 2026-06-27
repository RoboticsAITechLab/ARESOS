export interface Vector2D {
  x: number;
  y: number;
}

export interface VehicleState {
  position: Vector2D;
  velocity: Vector2D;
  angle: number;
  speed: number;
  distanceTraveled: number;
  damage: number;
  isCrashed: boolean;
}

export interface KeyFrame {
  frameIndex: number;
  time: number;
  position: Vector2D;
  velocity: Vector2D;
  score: number;
}

export interface DeltaFrame {
  dTime: number;
  dPosition: Vector2D;
  dVelocity: Vector2D;
  dScore: number;
}

export interface ReplayData {
  version: number;
  gameVersion: string;
  trackSeed: number;
  createdAt: number;
  raceDuration: number;
  finalScore: number;
  equations: Record<string, string>;
  keyframes: KeyFrame[];
  deltas: DeltaFrame[];
}

export interface DriverProfile {
  version: number;
  id: string;
  name: string;
  equations: Record<string, string>;
  upgrades: Record<string, number>;
}

export interface ChallengeSeed {
  id: string;
  seed: number;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  createdAt: number;
  bestScore?: number;
}

export interface UpgradeModifiers {
  maxSpeedMultiplier: number;
  handlingMultiplier: number;
  magnetRadiusAddition: number;
}
