export class CameraManager {
  public zoom = 1.0;
  public targetZoom = 1.0;
  public shakeAmount = 0;
  public cameraX = 400; // Smoothed camera view focus coordinate
  public verticalOffset = 0; // Vertically shifted perspective offset for elevation pitches
  public cameraHeight = 155; // Height of the camera above the road plane
  public focalLength = 0.82; // Focal length / projection depth
  private shakeDecay = 45; // pixels/sec

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.shakeAmount = 0;
    this.cameraX = 400;
    this.verticalOffset = 0;
  }

  /**
   * Sets the current screen shake magnitude
   */
  public triggerShake(amount: number): void {
    this.shakeAmount = amount;
  }

  /**
   * Modulates the target camera zoom
   */
  public triggerZoom(scale: number): void {
    this.targetZoom = scale;
  }

  /**
   * Frame tick updating camera shake decay, smooth speed-zoom levels, and elevation vertical shifting
   */
  public update(
    dt: number,
    speedRatio: number,
    carX: number,
    roadAngle: number,
    roadElevation = 0,
    elevationAhead = 0,
    reduceMotion = false
  ): void {
    if (reduceMotion) {
      this.shakeAmount = 0;
      this.zoom = 1.0;
      this.targetZoom = 1.0;
      this.cameraX = carX;
      this.verticalOffset = 0;
      return;
    }

    // Decay screen shake
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);
    }

    // Camera Curve Anticipation: shift camera target offset in turn direction
    const targetCameraX = carX + roadAngle * 140;
    
    // Smooth damp camera horizontal track centering
    const lerpCenteringSpeed = 6.5;
    this.cameraX += (targetCameraX - this.cameraX) * Math.min(1.0, lerpCenteringSpeed * dt);

    // Dynamic zoom based on speed: zooms out slightly as car goes faster for wider field
    const baseTargetZoom = this.targetZoom - (speedRatio - 1.0) * 0.14;
    const clampedTarget = Math.max(0.75, Math.min(1.25, baseTargetZoom));

    // Smoothly lerp camera zoom towards target
    const zoomLerpSpeed = 5;
    this.zoom += (clampedTarget - this.zoom) * Math.min(1.0, zoomLerpSpeed * dt);

    // Interpolate continuous elevation shifts (camera follows the hill tilt)
    // Positive offset shifts camera focus down (road moves up), simulating going uphill
    const rawTargetOffset = (elevationAhead - roadElevation) * 0.45;
    const clampedTargetOffset = Math.max(-90, Math.min(90, rawTargetOffset));
    const verticalDampSpeed = 5.0;
    this.verticalOffset += (clampedTargetOffset - this.verticalOffset) * Math.min(1.0, verticalDampSpeed * dt);
  }
}

