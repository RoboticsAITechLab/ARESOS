import { EquationSystem } from "../core/EquationSystem";
import { EquationContext } from "../types/EquationTypes";

export class VehicleController {
  private compiledSpeed: ((ctx: EquationContext) => number) | null = null;
  private compiledSteer: ((ctx: EquationContext) => number) | null = null;
  
  constructor(
    private equationSystem: EquationSystem,
    private speedExpression: string,
    private steerExpression: string
  ) {
    this.recompile();
  }

  public updateExpressions(speedExpr: string, steerExpr: string): void {
    this.speedExpression = speedExpr;
    this.steerExpression = steerExpr;
    this.recompile();
  }

  public updateSpeedExpression(speedExpr: string): void {
    this.speedExpression = speedExpr;
    this.compiledSpeed = this.equationSystem.compile(speedExpr);
  }

  public updateSteerExpression(steerExpr: string): void {
    this.steerExpression = steerExpr;
    this.compiledSteer = this.equationSystem.compile(steerExpr);
  }

  private recompile(): void {
    this.compiledSpeed = this.equationSystem.compile(this.speedExpression);
    this.compiledSteer = this.equationSystem.compile(this.steerExpression);
  }

  public getInputs(context: EquationContext): { speed: number; steer: number } {
    if (!this.compiledSpeed || !this.compiledSteer) {
      return { speed: 0, steer: 0 };
    }
    
    const speed = this.equationSystem.evaluate(this.compiledSpeed, context);
    const steer = this.equationSystem.evaluate(this.compiledSteer, context);
    return { speed, steer };
  }
}
