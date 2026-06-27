export type VehicleState = "Idle" | "Cruising" | "Turning" | "Hard Turning" | "Near Crash" | "Low Lives";

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export class VehicleRenderer {
  // Visual state variables for springy behavior
  private wheelRotation = 0;
  private currentRoll = 0;
  private currentBounceY = 0;
  private currentSteerAngle = 0;
  private lowLivesFlashTimer = 0;

  // Weight and suspension physics
  private lastSteer = 0;
  private bounceVelocity = 0;
  private smokeParticles: SmokeParticle[] = [];

  /**
   * Main draw call for the player vehicle in pseudo-3D rear-quarter perspective
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

    // Front wheels steer direction damping
    const targetSteer = laneChangeSteer * 1.35;
    this.currentSteerAngle += (targetSteer - this.currentSteerAngle) * Math.min(1.0, 18 * dt);

    // Body roll damping (lean opposite to swerve direction for centrifugal weight transfer)
    const targetRoll = -laneChangeSteer * 1.15; // Enhanced lean response
    this.currentRoll += (targetRoll - this.currentRoll) * Math.min(1.0, 12 * dt);

    // Suspension Spring Bobbing vertical bounce (wobble on lane switches)
    const steerDelta = Math.abs(laneChangeSteer - this.lastSteer);
    this.lastSteer = laneChangeSteer;
    if (steerDelta > 0.015) {
      // Bob the chassis down in response to sudden swerve force
      this.bounceVelocity += steerDelta * 110;
    }
    // Spring harmonic physics oscillation
    const springForce = -210 * this.currentBounceY - 13 * this.bounceVelocity;
    this.bounceVelocity += springForce * dt;
    this.currentBounceY += this.bounceVelocity * dt;
    // Damp settling when cruising normally
    if (steerDelta === 0 && Math.abs(this.currentBounceY) < 0.1) {
      this.currentBounceY = 0;
      this.bounceVelocity = 0;
    }
    this.currentBounceY = Math.max(-10, Math.min(10, this.currentBounceY));

    // Speed-based vibration
    let vibrationX = 0;
    let vibrationY = 0;
    if (state === "Cruising" && speedRatio > 1.35) {
      vibrationX = (Math.random() - 0.5) * 0.45 * speedRatio;
    } else if (state === "Turning" || state === "Hard Turning") {
      vibrationX = (Math.random() - 0.5) * 0.9;
    } else if (state === "Near Crash") {
      vibrationX = (Math.random() - 0.5) * 2.2;
    } else if (state === "Low Lives") {
      vibrationX = (Math.random() - 0.5) * 2.5;
      vibrationY = (Math.random() - 0.5) * 1.9;
    }

    // Weight transfer squat/dip offsets
    const squatY = Math.max(0, (speedRatio - 1.0) * 4.5); // Rear squats down at speed
    const brakingDipY = isBraking ? -3.5 : 0; // Front dips down (bumper rises in rear perspective)

    // Road Connection Alignment: final rotation heading matches centerline curvature
    let finalHeading = roadAngle * 0.7 + laneChangeSteer * 0.3;
    const maxHeading = 0.28;
    if (finalHeading > maxHeading) finalHeading = maxHeading;
    if (finalHeading < -maxHeading) finalHeading = -maxHeading;

    ctx.save();
    
    // Position car with vibration jitter and vertical weight squat/dip
    ctx.translate(x + vibrationX, y + vibrationY + this.currentBounceY + squatY + brakingDipY);
    ctx.rotate(finalHeading);

    // 2. Draw soft shadow under the vehicle
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

    // 4. Draw tires (thick 3D profiles)
    const drawTire3D = (tx: number, ty: number, angle: number, isFront: boolean) => {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle);
      
      // Tire body shadow
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.roundRect(-4, -10, 8, 20, 3);
      ctx.fill();
      
      if (isFront || speedRatio <= 1.45) {
        // Draw tread lines showing rotation
        ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
        ctx.lineWidth = 1;
        const spinOffset = (this.wheelRotation % 10) - 5;
        ctx.beginPath();
        ctx.moveTo(-4, spinOffset);
        ctx.lineTo(4, spinOffset);
        ctx.moveTo(-4, spinOffset + 8 > 10 ? spinOffset - 12 : spinOffset + 8);
        ctx.lineTo(4, spinOffset + 8 > 10 ? spinOffset - 12 : spinOffset + 8);
        ctx.stroke();
      } else {
        // High speed Rear Wheel Blur effect (blurred concentric spin circles)
        ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
        ctx.beginPath();
        ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
        ctx.arc(0, 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // Draw Front Tires (visible turning steer angles)
    drawTire3D(-14, -14, this.currentSteerAngle, true);  // Front Left
    drawTire3D(14, -14, this.currentSteerAngle, true);   // Front Right

    // Draw Rear Tires (spin blurred at high speed)
    drawTire3D(-16, 2, this.currentSteerAngle * 0.2, false); // Rear Left
    drawTire3D(16, 2, this.currentSteerAngle * 0.2, false);  // Rear Right

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

    // Nitrous exhaust sparks
    if (speedRatio > 1.4 && Math.random() < 0.6) {
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(-11, 8, 3, 0, Math.PI * 2);
      ctx.arc(11, 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Draw Bumper Panel
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
    
    // Spoiler Wing Board (braking tilts it forward)
    const spoilerAngle = isBraking ? -0.15 : 0;
    ctx.translate(0, -14);
    ctx.rotate(spoilerAngle);
    ctx.fillStyle = trimColor;
    ctx.beginPath();
    ctx.moveTo(-21, -2);
    ctx.lineTo(21, -2);
    ctx.lineTo(18, 2);
    ctx.lineTo(-18, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Spoiler Side Wings
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-22, -4, 2, 8);
    ctx.fillRect(20, -4, 2, 8);
    ctx.restore();

    // 8. Perspective cabin section (Windshield & Roof)
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

    // Windshield reflection sheen
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(2 + turnShiftX, -14);
    ctx.stroke();

    // Cabin Roof
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(-10 + turnShiftX, -16);
    ctx.lineTo(10 + turnShiftX, -16);
    ctx.lineTo(8 + turnShiftX, -19);
    ctx.lineTo(-8 + turnShiftX, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 9. Taillights (Glow brake lights)
    const glowBrake = isBraking || state === "Near Crash";
    ctx.fillStyle = glowBrake ? "#f43f5e" : "#be123c"; // bright rose red vs dark crimson
    ctx.fillRect(-14, -3, 6, 2.5);
    ctx.fillRect(8, -3, 6, 2.5);
    
    if (glowBrake) {
      ctx.fillStyle = "rgba(244, 63, 94, 0.45)";
      ctx.beginPath();
      ctx.arc(-11, -2, 8, 0, Math.PI * 2);
      ctx.arc(11, -2, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 10. Low Lives flashing beacon & gray engine damage smoke particles
    if (state === "Low Lives") {
      // Beacon warning flash
      if (Math.floor(this.lowLivesFlashTimer) % 2 === 0) {
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

      // Add smoke particle
      if (Math.random() < 0.28) {
        this.smokeParticles.push({
          x: -4 + Math.random() * 8,
          y: -10,
          vx: (Math.random() - 0.5) * 15,
          vy: -Math.random() * 25 - 15,
          size: Math.random() * 3 + 2,
          alpha: 0.65
        });
      }
    }

    // Tick/Draw local damage smoke particles
    this.smokeParticles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= 1.1 * dt;
      p.size += 4 * dt; // expand slightly as it rises
    });
    this.smokeParticles = this.smokeParticles.filter(p => p.alpha > 0);

    ctx.save();
    ctx.shadowBlur = 0;
    this.smokeParticles.forEach(p => {
      ctx.fillStyle = `rgba(120, 113, 108, ${p.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 11. High speed wind lines overlay
    if (speedRatio > 1.6) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
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
