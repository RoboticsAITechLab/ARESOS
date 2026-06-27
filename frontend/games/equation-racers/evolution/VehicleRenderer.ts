export type VehicleState = "Idle" | "Cruising" | "Turning" | "Hard Turning" | "Near Crash" | "Low Lives";

export class VehicleRenderer {
  // Visual state variables for springy behavior
  private wheelRotation = 0;
  private currentRoll = 0;
  private currentBounceY = 0;
  private currentSteerAngle = 0;
  private lowLivesFlashTimer = 0;

  /**
   * Main draw call for the player vehicle in pseudo-3D rear-quarter perspective
   * @param ctx Canvas 2D context
   * @param x Screen center X coordinate of the vehicle
   * @param y Screen center Y coordinate of the vehicle
   * @param roadAngle Track heading angle (radians)
   * @param laneChangeSteer Lateral swerve steer angle (radians)
   * @param speedRatio Current speed / base speed
   * @param state Active vehicle state
   * @param isBraking Whether vehicle is decelerating
   * @param dt Frame delta time
   * @param skin Equipped vehicle skin cosmetic
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    roadAngle: number,
    laneChangeSteer: number,
    speedRatio: number,
    state: VehicleState,
    isBraking: boolean,
    dt: number,
    skin = "default"
  ): void {
    // 1. Tick visual trackers
    this.wheelRotation += 20 * speedRatio * dt;
    this.lowLivesFlashTimer += 8 * dt;

    // Body roll damping (lean opposite to swerve direction for centrifugal force weight shift)
    const targetRoll = -laneChangeSteer * 0.9;
    this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1.0, 14 * dt);

    // Front wheels steer direction damping
    const targetSteer = laneChangeSteer * 1.35;
    this.currentSteerAngle += (targetSteer - this.currentSteerAngle) * Math.min(1.0, 18 * dt);

    // Dynamic vertical suspension bounce (settles dynamically)
    if (state === "Hard Turning") {
      this.currentBounceY = Math.sin(performance.now() * 0.045) * 1.6;
    } else if (state === "Cruising" && speedRatio > 1.2) {
      this.currentBounceY = Math.sin(performance.now() * 0.025) * 0.7 * speedRatio;
    } else {
      this.currentBounceY += (0 - this.currentBounceY) * Math.min(1.0, 10 * dt);
    }

    // Speed-based road vibration
    let vibrationX = 0;
    let vibrationY = 0;
    if (state === "Cruising") {
      vibrationX = (Math.random() - 0.5) * 0.5 * speedRatio;
    } else if (state === "Turning" || state === "Hard Turning") {
      vibrationX = (Math.random() - 0.5) * 1.1;
    } else if (state === "Near Crash") {
      vibrationX = (Math.random() - 0.5) * 2.2;
    } else if (state === "Low Lives") {
      vibrationX = (Math.random() - 0.5) * 2.4;
      vibrationY = (Math.random() - 0.5) * 1.8;
    }

    // Combine road curvature and lane change headings
    let finalHeading = roadAngle * 0.4 + laneChangeSteer * 0.25;
    const maxHeading = 0.24; // ~14 degrees
    if (finalHeading > maxHeading) finalHeading = maxHeading;
    if (finalHeading < -maxHeading) finalHeading = -maxHeading;

    ctx.save();
    
    // Position car with vibration jitter
    ctx.translate(x + vibrationX, y + vibrationY + this.currentBounceY);
    ctx.rotate(finalHeading);

    // 2. Draw soft shadow under the vehicle (scales and stretches at speed)
    ctx.save();
    let shadowOpacity = 0.40;
    if (state === "Hard Turning") shadowOpacity = 0.55;
    const shadowStretch = Math.max(1.0, Math.min(1.25, 1.0 + (speedRatio - 1.0) * 0.2));
    
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
    ctx.beginPath();
    ctx.ellipse(0, 10, 20, 10 * shadowStretch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Set vehicle colors depending on skin configurations
    let bodyColor = "#4f46e5"; // default Indigo
    let trimColor = "#38bdf8"; // Light Blue
    let wheelColor = "#0f172a"; // Dark navy black
    let accentColor = "#6366f1";

    if (skin === "cyber") {
      bodyColor = "#f97316"; // Orange
      trimColor = "#facc15"; // Yellow
      accentColor = "#fb923c";
    } else if (skin === "space") {
      bodyColor = "#a855f7"; // Purple
      trimColor = "#f472b6"; // Pink
      accentColor = "#c084fc";
    } else if (skin === "formula") {
      bodyColor = "#ef4444"; // Red
      trimColor = "#f8fafc"; // White
      accentColor = "#f87171";
    } else if (skin === "retro") {
      bodyColor = "#eab308"; // Yellow
      trimColor = "#16a34a"; // Green
      accentColor = "#fde047";
    }

    // Apply visual chassis roll rotation
    ctx.rotate(this.currentRoll);

    // 4. Draw tires (thick 3D rear-quarter profiles)
    const drawTire3D = (tx: number, ty: number, angle: number) => {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle);
      
      // Tire body shadow
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.roundRect(-4, -10, 8, 20, 3);
      ctx.fill();
      
      // Tire tread lines to show wheel rotation blur
      ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 1;
      const spinOffset = (this.wheelRotation % 10) - 5;
      ctx.beginPath();
      ctx.moveTo(-4, spinOffset);
      ctx.lineTo(4, spinOffset);
      ctx.moveTo(-4, spinOffset + 8 > 10 ? spinOffset - 12 : spinOffset + 8);
      ctx.lineTo(4, spinOffset + 8 > 10 ? spinOffset - 12 : spinOffset + 8);
      ctx.stroke();

      ctx.restore();
    };

    // Draw rear tires (placed wide)
    drawTire3D(-16, 2, this.currentSteerAngle * 0.3); // Rear Left
    drawTire3D(16, 2, this.currentSteerAngle * 0.3);  // Rear Right

    // 5. Draw 3D Rear Car Bumper & Diffuser
    ctx.strokeStyle = "#020205";
    ctx.lineWidth = 2.0;

    // Diffuser fins (lower chassis)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-12, 3, 24, 6);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-8, 5, 2, 4);
    ctx.fillRect(-2, 5, 2, 4);
    ctx.fillRect(4, 5, 2, 4);

    // Twin Exhaust pipes
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(-11, 7, 2, 0, Math.PI * 2);
    ctx.arc(11, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    // Exhaust flame glow at high speeds
    if (speedRatio > 1.4 && Math.random() < 0.6) {
      ctx.fillStyle = "#38bdf8"; // blue nitrous spark
      ctx.beginPath();
      ctx.arc(-11, 8, 3, 0, Math.PI * 2);
      ctx.arc(11, 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Draw Bumper Panel (Trapezoidal rear bumper face)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-18, 3);
    ctx.lineTo(18, 3);
    ctx.lineTo(16, -6);
    ctx.lineTo(-16, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 7. Draw Rear Spoiler struted above bumper
    ctx.save();
    // Struts
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-10, -12, 3, 7);
    ctx.fillRect(7, -12, 3, 7);
    
    // Spoiler Wing Board (tilted up)
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.moveTo(-21, -16);
    ctx.lineTo(21, -16);
    ctx.lineTo(18, -12);
    ctx.lineTo(-18, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spoiler Side Wings
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-22, -18, 2, 8);
    ctx.fillRect(20, -18, 2, 8);
    ctx.restore();

    // 8. Perspective cabin section (Windshield & Roof)
    // Horizontal shift simulates looking around corners (3D perspective illusion)
    const turnShiftX = -this.currentSteerAngle * 10;
    
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(-15, -6);
    ctx.lineTo(15, -6);
    ctx.lineTo(10 + turnShiftX, -16);
    ctx.lineTo(-10 + turnShiftX, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rear Windshield reflective glass
    ctx.fillStyle = "rgba(186, 230, 253, 0.82)"; // light blue
    ctx.beginPath();
    ctx.moveTo(-13, -7);
    ctx.lineTo(13, -7);
    ctx.lineTo(8 + turnShiftX, -14);
    ctx.lineTo(-8 + turnShiftX, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Windshield diagonal glossy reflection sheen
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(2 + turnShiftX, -14);
    ctx.stroke();

    // Cabin Roof (carbon fiber black or body color)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(-10 + turnShiftX, -16);
    ctx.lineTo(10 + turnShiftX, -16);
    ctx.lineTo(8 + turnShiftX, -19);
    ctx.lineTo(-8 + turnShiftX, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 9. Taillights (Glossy LED stripe look)
    const glowBrake = isBraking || state === "Near Crash";
    ctx.fillStyle = glowBrake ? "#f43f5e" : "#be123c"; // glowing bright rose vs dark crimson red
    ctx.fillRect(-14, -3, 6, 2.5);
    ctx.fillRect(8, -3, 6, 2.5);
    
    if (glowBrake) {
      // Draw circular brake halo glows
      ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
      ctx.beginPath();
      ctx.arc(-11, -2, 7, 0, Math.PI * 2);
      ctx.arc(11, -2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 10. Low Lives spoiler hazard flashing beacon
    if (state === "Low Lives" && Math.floor(this.lowLivesFlashTimer) % 2 === 0) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, -14, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -14, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 11. Speed wind line overlay (only at high speed)
    if (speedRatio > 1.6) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-17, -25);
      ctx.lineTo(-17, 10);
      ctx.moveTo(17, -25);
      ctx.lineTo(17, 10);
      ctx.stroke();
    }

    ctx.restore();
  }
}
