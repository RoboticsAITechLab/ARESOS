import { ReplayData, KeyFrame, DeltaFrame, Vector2D } from "../types/GameTypes";

export class ReplayEngine {
  private keyframes: KeyFrame[] = [];
  private deltas: DeltaFrame[] = [];
  
  private lastPosition: Vector2D = { x: 0, y: 0 };
  private lastVelocity: Vector2D = { x: 0, y: 0 };
  private lastTime = 0;
  private lastScore = 0;
  private frameCount = 0;

  constructor(
    private seed: number,
    private gameVersion: string,
    private equations: Record<string, string>
  ) {}

  public recordFrame(time: number, pos: Vector2D, vel: Vector2D, score: number): void {
    if (this.frameCount % 30 === 0) {
      this.keyframes.push({
        frameIndex: this.frameCount,
        time,
        position: { ...pos },
        velocity: { ...vel },
        score
      });
    } else {
      this.deltas.push({
        dTime: Number((time - this.lastTime).toFixed(4)),
        dPosition: {
          x: Number((pos.x - this.lastPosition.x).toFixed(4)),
          y: Number((pos.y - this.lastPosition.y).toFixed(4))
        },
        dVelocity: {
          x: Number((vel.x - this.lastVelocity.x).toFixed(4)),
          y: Number((vel.y - this.lastVelocity.y).toFixed(4))
        },
        dScore: Number((score - this.lastScore).toFixed(4))
      });
    }

    this.lastPosition = { ...pos };
    this.lastVelocity = { ...vel };
    this.lastTime = time;
    this.lastScore = score;
    this.frameCount++;
  }

  public serialize(): string {
    const replay: ReplayData = {
      version: 1,
      gameVersion: this.gameVersion,
      trackSeed: this.seed,
      createdAt: Date.now(),
      raceDuration: this.lastTime,
      finalScore: this.lastScore,
      equations: this.equations,
      keyframes: this.keyframes,
      deltas: this.deltas
    };
    return JSON.stringify(replay);
  }
}
