export enum CameraMode {
  ChaseCamera = "ChaseCamera",
  FarChase = "FarChase",
  HoodCamera = "HoodCamera",
  CockpitCamera = "CockpitCamera"
}

export class CameraManager {
  public mode: CameraMode = CameraMode.ChaseCamera;

  public zoom = 1.0;
  public targetZoom = 1.0;
  public shakeAmount = 0;
  public cameraX = 400; // Smoothed camera view focus coordinate
  public verticalOffset = 0; // Vertically shifted perspective offset for elevation pitches
  public cameraHeight = 155; // Height of the camera above the road plane
  public focalLength = 0.82; // Focal length / projection depth
  public cameraZOffset = 45; // Camera distance behind the car
  private shakeDecay = 45; // pixels/sec

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.mode = CameraMode.ChaseCamera;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.shakeAmount = 0;
    this.cameraX = 400;
    this.verticalOffset = 0;
    this.cameraHeight = 155;
    this.focalLength = 0.82;
    this.cameraZOffset = 45;
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
    reduceMotion = false,
    lives = 3
  ): void {
    if (reduceMotion) {
      this.shakeAmount = 0;
      this.zoom = 1.0;
      this.targetZoom = 1.0;
      this.cameraX = carX;
      this.verticalOffset = 0;
      this.cameraHeight = 155;
      this.cameraZOffset = 45;
      this.focalLength = 0.82;
      return;
    }

    // 1. Configure base parameters per CameraMode
    let baseHeight = 155;
    let baseZOffset = 45;
    let baseFocal = 0.82;

    switch (this.mode) {
      case CameraMode.ChaseCamera:
        baseHeight = 155;
        baseZOffset = 45;
        baseFocal = 0.82;
        break;
      case CameraMode.FarChase:
        baseHeight = 260;
        baseZOffset = 70;
        baseFocal = 0.52;
        break;
      case CameraMode.HoodCamera:
        baseHeight = 82;
        baseZOffset = 18;
        baseFocal = 1.05;
        break;
      case CameraMode.CockpitCamera:
        baseHeight = 96;
        baseZOffset = 30;
        baseFocal = 1.15;
        break;
    }

    this.cameraHeight = baseHeight;
    this.cameraZOffset = baseZOffset;

    // 2. Decay/Apply screen shakes & low lives continuous camera vibration
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);
    }

    // High speed camera vibration
    if (speedRatio > 1.35) {
      const highSpeedShake = (speedRatio - 1.35) * 2.8;
      if (this.shakeAmount < highSpeedShake) {
        this.shakeAmount = highSpeedShake;
      }
    }

    // Low health vibration
    if (lives <= 1) {
      const lowHealthShake = 1.1; // subtle vibration
      if (this.shakeAmount < lowHealthShake) {
        this.shakeAmount = lowHealthShake;
      }
    }

    // 3. Camera Curve Anticipation: shift camera target offset in turn direction
    const targetCameraX = carX + roadAngle * 120;
    
    // Smooth damp camera horizontal track centering
    const lerpCenteringSpeed = 6.5;
    this.cameraX += (targetCameraX - this.cameraX) * Math.min(1.0, lerpCenteringSpeed * dt);

    // 4. Dynamic Zoom & FOV focal length adjustment
    let targetFocal = baseFocal;
    if (speedRatio > 1.35) {
      // Dynamic FOV increase / focal length decrease at high speed for speed stretch feeling
      targetFocal = baseFocal - (speedRatio - 1.35) * 0.18;
    }
    const focalDampSpeed = 5.0;
    this.focalLength += (targetFocal - this.focalLength) * Math.min(1.0, focalDampSpeed * dt);

    // Dynamic zoom scale
    const baseTargetZoom = this.targetZoom - (speedRatio - 1.0) * 0.10;
    const clampedTarget = Math.max(0.70, Math.min(1.30, baseTargetZoom));
    const zoomLerpSpeed = 5;
    this.zoom += (clampedTarget - this.zoom) * Math.min(1.0, zoomLerpSpeed * dt);

    // 5. Interpolate continuous elevation shifts (camera follows the hill tilt)
    const rawTargetOffset = (elevationAhead - roadElevation) * 0.45;
    const clampedTargetOffset = Math.max(-90, Math.min(90, rawTargetOffset));
    const verticalDampSpeed = 5.0;
    this.verticalOffset += (clampedTargetOffset - this.verticalOffset) * Math.min(1.0, verticalDampSpeed * dt);
  }
}
