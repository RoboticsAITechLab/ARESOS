export class LaneManager {
  public currentLane = 1; // 0 = Left, 1 = Center, 2 = Right
  public numLanes = 3; // Variable lane count configuration (e.g. 3, 4, 5)
  public carX = 400; // Smoothed road coordinate
  public steerAngle = 0; // Visual chassis roll angle
  public reduceMotion = false; // Accessibility preference       able spring bounce
  
  // Spring-harmonic suspension physics parameters
  public springX = 0; // Displacement offset
  private springVel = 0; // Velocity
  private stiffness = 220; // Spring constant k
  private damping = 14; // Damping constant c

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.currentLane = Math.floor(this.numLanes / 2);
    this.carX = 400;
    this.steerAngle = 0;
    this.springX = 0;
    this.springVel = 0;
  }

  /**
   * Configure a new lane count limit
   */
  public setNumLanes(count: number): void {
    this.numLanes = count;
    this.currentLane = Math.floor(count / 2);
  }

  /**
   * Shift car one lane left
   */
  public moveLeft(): void {
    if (this.currentLane > 0) {
      this.currentLane--;
      if (!this.reduceMotion) {
        // Set spring shock to wobble leftward
        this.springX += 12;
        this.springVel += 150;
      }
    }
  }

  /**
   * Shift car one lane right
   */
  public moveRight(): void {
    if (this.currentLane < this.numLanes - 1) {
      this.currentLane++;
      if (!this.reduceMotion) {
        // Set spring shock to wobble rightward
        this.springX -= 12;
        this.springVel -= 150;
      }
    }
  }

  /**
   * Frame updates applying lerp swerving and spring oscillation dynamics
   */
  public update(dt: number, roadCenterX: number, roadWidth: number): void {
    const laneWidth = roadWidth / this.numLanes;
    
    // Math handles dynamic lane splits (e.g., 3 lanes -> offset -1, 0, 1; 5 lanes -> -2, -1, 0, 1, 2)
    const targetOffset = (this.currentLane - (this.numLanes - 1) / 2) * laneWidth;
    const targetX = roadCenterX + targetOffset;

    // Smooth horizontal swerve lerp
    const lerpSpeed = 16;
    this.carX += (targetX - this.carX) * Math.min(1.0, lerpSpeed * dt);

    // Spring harmonic physics iteration
    const force = -this.stiffness * this.springX - this.damping * this.springVel;
    this.springVel += force * dt;
    this.springX += this.springVel * dt;

    // Calculate heading roll tilt based on swerve delta and active bounce velocity
    const deltaX = targetX - this.carX;
    const targetAngle = deltaX * 0.0035 + this.springVel * 0.0003;
    
    // Smooth angle recovery
    this.steerAngle += (targetAngle - this.steerAngle) * Math.min(1.0, 12 * dt);
    
    // Clamp visual tilt bounds
    const maxAngle = 0.28;
    if (this.steerAngle > maxAngle) this.steerAngle = maxAngle;
    if (this.steerAngle < -maxAngle) this.steerAngle = -maxAngle;
  }
}
