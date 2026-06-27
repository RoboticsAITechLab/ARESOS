import { Vehicle } from "../vehicle/Vehicle";
import { VehicleController } from "../vehicle/VehicleController";
import { TrackGenerator } from "../track/TrackGenerator";
import { CoinSystem } from "../systems/CoinSystem";
import { ObstacleSystem } from "../systems/ObstacleSystem";
import { ScoreSystem } from "../systems/ScoreSystem";
import { ReplayEngine } from "./ReplayEngine";
import { GhostEngine } from "./GhostEngine";
import { EquationSystem } from "./EquationSystem";
import { EquationContext } from "../types/EquationTypes";

export class SimulationEngine {
  private elapsed = 0;
  private timeStep = 1 / 60;
  private accumulator = 0;
  private isRunning = false;

  // Real-time metrics tracking for optimization diagnostic panel
  public coinsCollected = 0;
  public obstacleHits = 0;
  public offRoadTimer = 0;

  // Control Mode and Manual Inputs for Phase 5B
  public controlMode: "AI" | "Manual" | "Hybrid" = "AI";
  public manualInputs = { speed: 0, steer: 0 };

  constructor(
    public seedValue: number,
    public vehicle: Vehicle,
    public controller: VehicleController,
    public track: TrackGenerator,
    public coinSystem: CoinSystem,
    public obstacleSystem: ObstacleSystem,
    public scoreSystem: ScoreSystem,
    public equationSystem: EquationSystem,
    public replay: ReplayEngine,
    public ghost?: GhostEngine
  ) {
    this.setupRegistries();
  }

  private setupRegistries(): void {
    const vr = this.equationSystem.variableRegistry;
    vr.registerVariable("t", () => this.elapsed);
    vr.registerVariable("x", () => this.vehicle.getState().position.x);
    vr.registerVariable("y", () => this.vehicle.getState().position.y);
    vr.registerVariable("velocity", () => this.vehicle.getState().speed);
    vr.registerVariable("distance", () => this.vehicle.getState().distanceTraveled);
    vr.registerVariable("score", () => this.scoreSystem.getScore());

    vr.registerVariable("coin_x", () => {
      const coin = this.coinSystem.getClosestCoin(this.vehicle.getState().position);
      return coin ? coin.position.x : this.vehicle.getState().position.x;
    });
    vr.registerVariable("coin_y", () => {
      const coin = this.coinSystem.getClosestCoin(this.vehicle.getState().position);
      return coin ? coin.position.y : this.vehicle.getState().position.y;
    });

    vr.registerVariable("coin_distance", () => {
      const coin = this.coinSystem.getClosestCoin(this.vehicle.getState().position);
      if (!coin) return 9999;
      const dx = coin.position.x - this.vehicle.getState().position.x;
      const dy = coin.position.y - this.vehicle.getState().position.y;
      return Math.sqrt(dx * dx + dy * dy);
    });

    vr.registerVariable("obs_x", () => {
      const obs = this.obstacleSystem.getClosestObstacle(this.vehicle.getState().position);
      return obs ? obs.position.x : this.vehicle.getState().position.x;
    });
    vr.registerVariable("obs_y", () => {
      const obs = this.obstacleSystem.getClosestObstacle(this.vehicle.getState().position);
      return obs ? obs.position.y : this.vehicle.getState().position.y - 1000;
    });

    vr.registerVariable("obs_distance", () => {
      const obs = this.obstacleSystem.getClosestObstacle(this.vehicle.getState().position);
      if (!obs) return 9999;
      const dx = obs.position.x - this.vehicle.getState().position.x;
      const dy = obs.position.y - this.vehicle.getState().position.y;
      return Math.sqrt(dx * dx + dy * dy);
    });

    vr.registerVariable("track_center_x", () => this.track.getCenterXAt(this.vehicle.getState().position.y));
    
    vr.registerVariable("track_curvature", () => {
      const y = this.vehicle.getState().position.y;
      return this.track.getCenterXAt(y - 150) - this.track.getCenterXAt(y);
    });

    vr.registerVariable("future_curvature", () => {
      const y = this.vehicle.getState().position.y;
      return this.track.getCenterXAt(y - 300) - this.track.getCenterXAt(y);
    });

    vr.registerVariable("speed", () => this.vehicle.getState().speed);
    
    vr.registerVariable("heading", () => this.vehicle.getState().angle);

    vr.registerVariable("track_width", () => this.track.getWidthAt(this.vehicle.getState().position.y));

    vr.registerVariable("distance_to_finish", () => {
      const segments = this.track.getSegments();
      if (segments.length === 0) return 9999;
      const endY = segments[segments.length - 1].yStart - segments[segments.length - 1].length;
      return Math.max(0, this.vehicle.getState().position.y - endY);
    });

    vr.registerVariable("coin_count", () => {
      return this.coinSystem.getCoins().filter(c => !c.isCollected).length;
    });

    vr.registerVariable("obstacle_count", () => {
      return this.obstacleSystem.getObstacles().filter(o => o.position.y !== 999999).length;
    });
  }

  public getContext(): EquationContext {
    const vr = this.equationSystem.variableRegistry;
    const ctx: EquationContext = {};
    for (const name of vr.getAllowedNames()) {
      ctx[name] = vr.resolve(name, null);
    }
    return ctx;
  }

  public start(): void {
    this.isRunning = true;
    this.elapsed = 0;
    this.accumulator = 0;
    this.coinsCollected = 0;
    this.obstacleHits = 0;
  }

  public update(dt: number): void {
    if (!this.isRunning) return;

    this.accumulator += dt;
    while (this.accumulator >= this.timeStep) {
      this.stepSimulation(this.timeStep);
      this.accumulator -= this.timeStep;
    }
  }

  private stepSimulation(fixedDt: number): void {
    if (this.vehicle.getState().isCrashed) {
      this.isRunning = false;
      return;
    }

    const context = this.getContext();
    let inputs = this.controller.getInputs(context);

    const carPos = this.vehicle.getState().position;
    const trackCenterX = this.track.getCenterXAt(carPos.y);

    if (this.controlMode === "Manual") {
      inputs = { ...this.manualInputs };
    } else if (this.controlMode === "Hybrid") {
      const obstacle = this.obstacleSystem.getClosestObstacle(carPos);
      const obsDistance = obstacle ? Math.sqrt((obstacle.position.x - carPos.x)**2 + (obstacle.position.y - carPos.y)**2) : 9999;
      
      let correctionSteer = 0;
      if (obsDistance < 180 || Math.abs(carPos.x - trackCenterX) > 70) {
        correctionSteer = inputs.steer;
      }
      
      const blendedSteer = this.manualInputs.steer !== 0 
        ? (this.manualInputs.steer * 0.75 + correctionSteer * 0.25)
        : correctionSteer;
        
      inputs = {
        speed: this.manualInputs.speed,
        steer: blendedSteer
      };
    }

    const trackWidth = this.track.getWidthAt(carPos.y);
    const halfWidth = trackWidth / 2;

    const isOffRoad = Math.abs(carPos.x - trackCenterX) > halfWidth;
    let terrainFriction = 1.0;

    if (isOffRoad) {
      terrainFriction = 0.45;
      this.offRoadTimer += fixedDt;
      this.vehicle.takeDamage(10 * fixedDt);
      if (this.offRoadTimer >= 10) {
        this.vehicle.setPosition(trackCenterX, carPos.y);
        this.vehicle.setSpeed(0);
        this.vehicle.setAngle(0);
        this.scoreSystem.deductOffRoadPenalty();
        this.offRoadTimer = 0;
      }
    } else {
      this.offRoadTimer = 0;
    }

    const oldY = this.vehicle.getState().position.y;
    this.vehicle.applyPhysics(inputs.speed, inputs.steer, fixedDt, terrainFriction);

    const collectedCoins = this.coinSystem.update(carPos, this.vehicle.magnetRadius, fixedDt);
    if (collectedCoins > 0) {
      this.coinsCollected += collectedCoins;
      for (let c = 0; c < collectedCoins; c++) {
        this.scoreSystem.addCoinScore();
      }
    }

    const damage = this.obstacleSystem.checkCollisions(carPos, 16);
    if (damage > 0) {
      this.obstacleHits++;
      this.vehicle.takeDamage(damage);
      this.scoreSystem.deductObstaclePenalty();
    }

    const distDelta = Math.abs(carPos.y - oldY);
    this.scoreSystem.updateDistanceScore(distDelta);
    this.scoreSystem.addSpeedBonus(this.vehicle.getState().speed, fixedDt);

    this.replay.recordFrame(
      this.elapsed,
      this.vehicle.getState().position,
      this.vehicle.getState().velocity,
      this.scoreSystem.getScore()
    );

    this.elapsed += fixedDt;
  }

  public getElapsedTime(): number {
    return this.elapsed;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
