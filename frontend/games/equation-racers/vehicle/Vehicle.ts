import { VehicleState, Vector2D } from "../types/GameTypes";

export class Vehicle {
  private state: VehicleState;

  constructor(
    startPos: Vector2D = { x: 400, y: 0 },
    public maxSpeed = 300,
    public handling = 2.5,
    public magnetRadius = 80,
    public damageReduction = 0
  ) {
    this.state = {
      position: { ...startPos },
      velocity: { x: 0, y: 0 },
      angle: 0,
      speed: 0,
      distanceTraveled: 0,
      damage: 0,
      isCrashed: false
    };
  }

  public getState(): VehicleState {
    return this.state;
  }

  public reset(startPos: Vector2D): void {
    this.state = {
      position: { ...startPos },
      velocity: { x: 0, y: 0 },
      angle: 0,
      speed: 0,
      distanceTraveled: 0,
      damage: 0,
      isCrashed: false
    };
  }

  public applyPhysics(accInput: number, steerInput: number, dt: number, terrainFriction = 1.0): void {
    if (this.state.isCrashed) return;

    // Engine acceleration force (accInput: px/sec^2) limited by max values
    const maxAccForce = 300;
    const force = Math.max(-maxAccForce, Math.min(maxAccForce, accInput)) * terrainFriction;

    // Air Drag (proportional to velocity squared)
    const dragCoeff = 0.0012;
    const dragForce = -dragCoeff * this.state.speed * this.state.speed;

    // Rolling Resistance (rolling friction)
    const frictionCoeff = 12.0;
    const frictionForce = -frictionCoeff * Math.sign(this.state.speed) * (this.state.speed > 1 ? 1 : 0);

    // Total Net Acceleration
    const netAcc = force + dragForce + frictionForce;
    this.state.speed += netAcc * dt;
    if (this.state.speed < 0) this.state.speed = 0;
    if (this.state.speed > this.maxSpeed * terrainFriction) {
      this.state.speed = this.maxSpeed * terrainFriction;
    }

    // Ackerman Speed-dependent steering rate: turn rate is proportional to velocity
    const maxSteerAngle = 0.35; // radians limit
    const targetSteerAngle = Math.max(-maxSteerAngle, Math.min(maxSteerAngle, steerInput)) * terrainFriction;

    const wheelbase = 55.0; 
    const angularVelocity = (this.state.speed / wheelbase) * Math.sin(targetSteerAngle);

    // Apply angular angle rotation
    this.state.angle += angularVelocity * dt;

    // Velocity coordinates
    this.state.velocity.x = this.state.speed * Math.sin(this.state.angle);
    this.state.velocity.y = -this.state.speed * Math.cos(this.state.angle);

    // Update positions
    const oldY = this.state.position.y;
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    const distanceDelta = Math.abs(this.state.position.y - oldY);
    this.state.distanceTraveled += distanceDelta;
  }

  public takeDamage(amount: number): void {
    const reducedAmount = amount * (1 - this.damageReduction);
    this.state.damage = Math.min(100, this.state.damage + reducedAmount);
    if (this.state.damage >= 100) {
      this.state.isCrashed = true;
      this.state.speed = 0;
      this.state.velocity = { x: 0, y: 0 };
    }
  }

  public setPosition(x: number, y: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
  }

  public setSpeed(speed: number): void {
    this.state.speed = speed;
  }

  public setAngle(angle: number): void {
    this.state.angle = angle;
  }
}
