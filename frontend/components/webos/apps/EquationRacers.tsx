import React, { useState, useEffect, useRef } from "react";
import { GameManager } from "@/games/equation-racers/evolution/GameManager";
import { TrackGenerator } from "@/games/equation-racers/track/TrackGenerator";
import { AnimationManager } from "@/games/equation-racers/evolution/AnimationManager";
import { CameraManager } from "@/games/equation-racers/evolution/CameraManager";
import { VehicleRenderer } from "@/games/equation-racers/evolution/VehicleRenderer";
import { s } from "framer-motion/client";

// Web Audio API Synthesizer for retro retro sounds and music
class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMute(mute: boolean) {
    this.muted = mute;
  }

  public playCoin() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now); // B5 note
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6 note
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playCorrect() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Upward major triad arpeggio (C5 - E5 - G5)
    playNote(523.25, now, 0.15);
    playNote(659.25, now + 0.08, 0.15);
    playNote(783.99, now + 0.16, 0.35);
  }

  public playWrong() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playClick() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  age: number; // 0 to 1
}

interface EquationRacersProps {
  pid: string;
}

export default function EquationRacers({ pid }: EquationRacersProps) {
  // Main Canvas reference
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game Manager instances
  const gameManagerRef = useRef<GameManager | null>(null);
  const trackRef = useRef<TrackGenerator | null>(null);
  const synthRef = useRef<AudioSynth | null>(null);
  const animationManagerRef = useRef<AnimationManager | null>(null);
  const cameraManagerRef = useRef<CameraManager | null>(null);
  const vehicleRendererRef = useRef<VehicleRenderer | null>(null);
  
  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // React state synchronization
  const [gameMode, setGameMode] = useState<GameManager["gameMode"]>("Start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Smoothly interpolated HUD metrics
  const [displayedScore, setDisplayedScore] = useState(0);
  const [displayedCoins, setDisplayedCoins] = useState(0);
  
  // Settings & selections
  const [categories, setCategories] = useState<string[]>(["addition", "subtraction", "multiplication"]);
  const [isMuted, setIsMuted] = useState(false);
  const [equippedSkin, setEquippedSkin] = useState("default");
  
  // Accessibility preferences
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [colorblindHighlighting, setColorblindHighlighting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  
  // Floating feedback text array
  const floatersRef = useRef<FloatingText[]>([]);
  const nextFloaterId = useRef(0);

  // Initialize systems
  useEffect(() => {
    const gm = new GameManager();
    const track = new TrackGenerator(918237);
    track.generate(100); // long track
    
    const synth = new AudioSynth();
    const animationManager = new AnimationManager();
    const cameraManager = new CameraManager();
    const vehicleRenderer = new VehicleRenderer();
    
    gameManagerRef.current = gm;
    trackRef.current = track;
    synthRef.current = synth;
    animationManagerRef.current = animationManager;
    cameraManagerRef.current = cameraManager;
    vehicleRendererRef.current = vehicleRenderer;

    // Synchronize high scores & equipped skin & accessibility preferences
    const data = gm.saveManager.getData();
    setHighScore(data.highScore);
    setEquippedSkin(data.garage.equippedSkin);
    setIsMuted(data.settings.mute);
    setLargeTextMode(data.settings.largeTextMode);
    setColorblindHighlighting(data.settings.colorblindHighlighting);
    setReduceMotion(data.settings.reduceMotion);
    synth.setMute(data.settings.mute);

    // Setup GM callbacks
    gm.onCoinCollected = (worldX, worldY) => {
      synth.playCoin();
      if (canvasRef.current && gameManagerRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        const screenCarY = H * 0.7 + (cameraManagerRef.current ? cameraManagerRef.current.verticalOffset : 0);
        const sx = worldX - gameManagerRef.current.laneManager.carX + W / 2;
        const sy = worldY - gameManagerRef.current.carY + screenCarY;
        animationManager.spawnSparks(sx, sy, "#fbbf24", 12);
        animationManager.spawnCoinFly(sx, sy, 50, 50);
      }
    };

    gm.onCorrectAnswer = (pos, val) => {
      synth.playCorrect();
      animationManager.triggerFlash("correct");
      
      if (canvasRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        animationManager.spawnSparks(W / 2, H * 0.7, "#10b981", 20);
        cameraManager.triggerZoom(1.08); // dynamic camera scale pulse
        
        floatersRef.current.push({
          id: nextFloaterId.current++,
          x: W / 2,
          y: H * 0.5,
          text: val,
          color: "#10b981", // Emerald green
          age: 0
        });
      }
    };

    gm.onWrongAnswer = () => {
      synth.playWrong();
      animationManager.triggerFlash("wrong");
      
      if (canvasRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        animationManager.spawnSparks(W / 2, H * 0.7, "#ef4444", 25);
        cameraManager.triggerZoom(0.92); // camera shock push back
        
        floatersRef.current.push({
          id: nextFloaterId.current++,
          x: W / 2,
          y: H * 0.5,
          text: "Mistake! -1 Life",
          color: "#f43f5e", // Rose red
          age: 0
        });
      }
    };

    gm.onObstacleHit = (type) => {
      synth.playWrong();
      animationManager.triggerFlash("wrong");
      if (canvasRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        animationManager.spawnSparks(W / 2, H * 0.7, "#f43f5e", 20);
        cameraManager.triggerZoom(0.9);
        floatersRef.current.push({
          id: nextFloaterId.current++,
          x: W / 2,
          y: H * 0.5,
          text: `Hit Obstacle! -1 Life`,
          color: "#f43f5e",
          age: 0
        });
      }
    };

    gm.onScreenShake = () => {
      cameraManager.triggerShake(16);
    };

    gm.onMilestoneTrigger = () => {
      animationManager.triggerFlash("milestone");
      if (canvasRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        animationManager.spawnConfetti(W / 2, H * 0.4, 45);
      }
    };

    gm.onGameOver = () => {
      setGameMode("GameOver");
      setHighScore(gm.saveManager.getData().highScore);
    };

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Sync mute settings
  const toggleMute = () => {
    if (synthRef.current && gameManagerRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      synthRef.current.setMute(nextMute);
      gameManagerRef.current.saveManager.setMute(nextMute);
    }
  };

  const toggleLargeText = () => {
    if (gameManagerRef.current) {
      const nextVal = !largeTextMode;
      setLargeTextMode(nextVal);
      gameManagerRef.current.saveManager.setLargeTextMode(nextVal);
    }
  };

  const toggleColorblind = () => {
    if (gameManagerRef.current) {
      const nextVal = !colorblindHighlighting;
      setColorblindHighlighting(nextVal);
      gameManagerRef.current.saveManager.setColorblindHighlighting(nextVal);
    }
  };

  const toggleReduceMotion = () => {
    if (gameManagerRef.current) {
      const nextVal = !reduceMotion;
      setReduceMotion(nextVal);
      gameManagerRef.current.saveManager.setReduceMotion(nextVal);
      // Sync to LaneManager immediately
      gameManagerRef.current.laneManager.reduceMotion = nextVal;
    }
  };

  // Retrieve current active question text with dynamic memory hide checks
  const getActiveQuestionText = () => {
    const gm = gameManagerRef.current;
    if (!gm) return "";
    const gate = gm.gateManager.getNextActiveGate(gm.carY);
    if (!gate || !gate.question) return "";
    
    const q = gate.question;
    if (q.category === "memory") {
      const dist = gm.carY - gate.y;
      if (dist < 280) {
        return `What was the equation that equaled ${q.correctValue}?`;
      }
    }
    return q.text;
  };

  // Start run
  const startRun = () => {
    if (synthRef.current) synthRef.current.playClick();
    if (gameManagerRef.current) {
      const randomSeed = Math.floor(Math.random() * 999999);
      if (trackRef.current) {
        trackRef.current.generate(100);
      }
      gameManagerRef.current.init(randomSeed, categories, false);
      gameManagerRef.current.start();
      setGameMode("Running");
      setScore(0);
      setCoins(0);
      setCombo(0);
      setLives(3);
      setDisplayedScore(0);
      setDisplayedCoins(0);
      floatersRef.current = [];
      
      if (animationManagerRef.current) animationManagerRef.current.reset();
      if (cameraManagerRef.current) cameraManagerRef.current.reset();
      
      lastTimeRef.current = performance.now();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = requestAnimationFrame(loop);
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameManagerRef.current) return;
      const key = e.key.toLowerCase();

      if (key === "a" || e.key === "ArrowLeft") {
        gameManagerRef.current.handleLeft();
      }
      if (key === "d" || e.key === "ArrowRight") {
        gameManagerRef.current.handleRight();
      }
      if (e.key === " ") {
        // Space to Pause/Resume
        if (gameMode === "Running") {
          gameManagerRef.current.togglePause();
          setGameMode("Paused");
        } else if (gameMode === "Paused") {
          gameManagerRef.current.togglePause();
          setGameMode("Running");
        }
        e.preventDefault();
      }
      if (e.key === "Escape") {
        if (gameMode === "Running") {
          gameManagerRef.current.togglePause();
          setGameMode("Paused");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameMode]);

  // Main animation frame loop
  const loop = (timestamp: number) => {
    const gm = gameManagerRef.current;
    const track = trackRef.current;
    const cameraManager = cameraManagerRef.current;
    const animationManager = animationManagerRef.current;
    if (!gm || !track || gm.gameMode === "Start") return;

    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    if (gm.gameMode === "Running") {
      // Pass track queries into GameManager
      gm.update(
        dt,
        (y) => track.getCenterXAt(y),
        (y) => track.getWidthAt(y),
        (y) => track.getSegmentAtY(y),
        (y) => track.getElevationAt(y)
      );

      // Update camera and animation visual tickers
      const motionPrefs = gm.saveManager.getData().settings.reduceMotion;
      if (cameraManager) {
        const roadElevation = track.getElevationAt(gm.carY);
        const elevationAhead = track.getElevationAt(gm.carY - 140);
        cameraManager.update(
          dt,
          gm.speed / gm.baseSpeed,
          gm.laneManager.carX,
          gm.roadAngle,
          roadElevation,
          elevationAhead,
          motionPrefs
        );
      }
      if (animationManager) {
        animationManager.update(dt, gm.speed / gm.baseSpeed, canvasRef.current ? canvasRef.current.width : 800);
        
        // Spawn tire trails during turning & skidding states
        const isHardTurning = gm.vehicleState === "Hard Turning";
        const isTurning = gm.vehicleState === "Turning";
        if (isHardTurning || (isTurning && Math.random() < 0.25)) {
          animationManager.spawnTireTrail(gm.laneManager.carX - 13, gm.carY + 10);
          animationManager.spawnTireTrail(gm.laneManager.carX + 13, gm.carY + 10);
        }
        
        // Spawn wheel dust when close to edges or hard cornering
        const currentRoadCenter = track.getCenterXAt(gm.carY);
        const currentRoadWidth = track.getWidthAt(gm.carY);
        const distToCenter = Math.abs(gm.laneManager.carX - currentRoadCenter);
        const closeToEdge = distToCenter > (currentRoadWidth / 2 - 42);
        
        if (canvasRef.current && (isHardTurning || closeToEdge)) {
          const W = canvasRef.current.width;
          const H = canvasRef.current.height;
          const camX = cameraManager ? cameraManager.cameraX : gm.laneManager.carX;
          const screenCarY = H * 0.7 + (cameraManager ? cameraManager.verticalOffset : 0);
          
          const sxLeft = gm.laneManager.carX - 13 - camX + W / 2;
          const sxRight = gm.laneManager.carX + 13 - camX + W / 2;
          const syRear = screenCarY + 10;
          
          animationManager.spawnDust(sxLeft, syRear, 1);
          animationManager.spawnDust(sxRight, syRear, 1);
        }
      }

      // Sync metrics states
      setScore(gm.score);
      setCoins(gm.coinsCollected);
      setCombo(gm.combo);
      setLives(gm.lives);
      
      // Smoothly count up HUD values
      setDisplayedScore(prev => {
        const diff = gm.score - prev;
        if (Math.abs(diff) < 1) return gm.score;
        return Math.round(prev + diff * Math.min(1.0, 10 * dt));
      });
      setDisplayedCoins(prev => {
        const diff = gm.coinsCollected - prev;
        if (Math.abs(diff) < 1) return gm.coinsCollected;
        return Math.round(prev + diff * Math.min(1.0, 10 * dt));
      });
    }

    // Update floaters
    floatersRef.current.forEach(f => {
      f.y -= 60 * dt; // drift up
      f.age += 1.8 * dt; // fade out speed
    });
    floatersRef.current = floatersRef.current.filter(f => f.age < 1.0);

    drawFrame(dt);

    if (gm.gameMode !== "GameOver") {
      animationFrameId.current = requestAnimationFrame(loop);
    } else {
      setGameMode("GameOver");
    }
  };

  // Car visual renderer with skin cosmetics
  const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, skin: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    let bodyColor = "#4f46e5"; // default indigo
    let trimColor = "#60a5fa"; // blue
    let wheelColor = "#09090b";

    if (skin === "cyber") {
      bodyColor = "#f97316"; // Orange
      trimColor = "#eab308"; // Yellow
    } else if (skin === "space") {
      bodyColor = "#a855f7"; // Purple
      trimColor = "#ec4899"; // Pink
    } else if (skin === "formula") {
      bodyColor = "#ef4444"; // Red
      trimColor = "#ffffff"; // White
    } else if (skin === "retro") {
      bodyColor = "#eab308"; // Yellow
      trimColor = "#16a34a"; // Green
    }

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    // Chassis body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-9, -20, 18, 40);

    // Front spoiler
    ctx.fillStyle = trimColor;
    ctx.fillRect(-13, -20, 26, 4);

    // Rear spoiler
    ctx.fillRect(-15, 16, 30, 4);

    // Cockpit windshield
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(5, -8);
    ctx.lineTo(4, 2);
    ctx.lineTo(-4, 2);
    ctx.closePath();
    ctx.fill();

    // Wheels
    ctx.fillStyle = wheelColor;
    ctx.fillRect(-12, -15, 3, 9); // Front Left
    ctx.fillRect(9, -15, 3, 9);  // Front Right
    ctx.fillRect(-12, 7, 3, 9);   // Rear Left
    ctx.fillRect(9, 7, 3, 9);    // Rear Right

    ctx.restore();
  };

  // Canvas drawing orchestrator
  const drawFrame = (dt = 0.016) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const gm = gameManagerRef.current;
    const track = trackRef.current;
    const cameraManager = cameraManagerRef.current;
    const animationManager = animationManagerRef.current;
    if (!ctx || !gm || !track) return;
    const speedRatio = gm.speed / gm.baseSpeed;

    // Resize canvas if bounds changed
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Apply camera transformations (zoom & shake)
    ctx.save();
    const centerPointX = W / 2;
    const centerPointY = H * 0.7;
    
    if (cameraManager) {
      if (cameraManager.zoom !== 1.0) {
        ctx.translate(centerPointX, centerPointY);
        ctx.scale(cameraManager.zoom, cameraManager.zoom);
        ctx.translate(-centerPointX, -centerPointY);
      }
      if (cameraManager.shakeAmount > 0) {
        const dx = (Math.random() - 0.5) * cameraManager.shakeAmount;
        const dy = (Math.random() - 0.5) * cameraManager.shakeAmount;
        ctx.translate(dx, dy);
      }
    }

    // Scroll offsets relative to camera and auto-forward coordinates
    const carY = gm.carY;
    const cameraX = cameraManager ? cameraManager.cameraX : gm.laneManager.carX;

    // Projection helpers for pseudo-3D perspective mapping
    const getScale = (z: number) => {
      const focalLength = cameraManager ? cameraManager.focalLength : 0.82;
      return (H * 0.32 * focalLength) / (z + 55);
    };

    const project = (worldX: number, worldY: number) => {
      // Trailing camera distance offset
      const z = carY - worldY + 45;
      const scale = getScale(z);
      const el = track.getElevationAt(worldY);
      const elCar = track.getElevationAt(carY);
      const horizonY = H * 0.40 + (cameraManager ? cameraManager.verticalOffset : 0);
      const camHeight = cameraManager ? cameraManager.cameraHeight : 155;
      const sx = W / 2 + (worldX - cameraX) * scale;
      const sy = horizonY + (camHeight - (el - elCar)) * scale;
      return { sx, sy, scale, z };
    };

    const horizonY = H * 0.40 + (cameraManager ? cameraManager.verticalOffset : 0);

    // 1. Draw Parallax Background (sky, scrolling mountains/hills anchored to horizonY)
    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    if (gm.focusModeActive) {
      skyGrad.addColorStop(0, "#09090b");
      skyGrad.addColorStop(1, "#180828");
    } else {
      skyGrad.addColorStop(0, gm.activeZone === "city" ? "#0f172a" : gm.activeZone === "mountain" ? "#082f49" : "#020617");
      skyGrad.addColorStop(1, gm.activeZone === "city" ? "#1e293b" : gm.activeZone === "mountain" ? "#0c4a6e" : "#0f172a");
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizonY);

    // Draw distant mountains (scrolling slowly with cameraX)
    ctx.save();
    ctx.fillStyle = gm.focusModeActive 
      ? "#120d24" 
      : gm.activeZone === "city" ? "#0f172a" : gm.activeZone === "mountain" ? "#064e3b" : "#14532d";
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= W; x += 15) {
      const yPeak = horizonY - 20 + Math.sin((x + cameraX * 0.04) * 0.005) * 45 + Math.cos((x + cameraX * 0.04) * 0.012) * 15;
      ctx.lineTo(x, yPeak);
    }
    ctx.lineTo(W, horizonY);
    ctx.closePath();
    ctx.fill();

    // Draw mid-distance hills (scrolling slightly faster)
    ctx.fillStyle = gm.focusModeActive 
      ? "#1c1236" 
      : gm.activeZone === "city" ? "#1e293b" : gm.activeZone === "mountain" ? "#0f766e" : "#166534";
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= W; x += 15) {
      const yPeak = horizonY - 8 + Math.sin((x + cameraX * 0.12) * 0.010) * 22 + Math.cos((x + cameraX * 0.12) * 0.022) * 8;
      ctx.lineTo(x, yPeak);
    }
    ctx.lineTo(W, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Grass/Ground background below horizon
    if (gm.focusModeActive) {
      ctx.fillStyle = "rgba(9, 9, 11, 0.95)";
    } else {
      if (gm.activeZone === "city") {
        ctx.fillStyle = "#111827"; // deep grey/black urban ground
      } else if (gm.activeZone === "mountain") {
        ctx.fillStyle = "#06130b"; // dark green pine forest ground
      } else {
        ctx.fillStyle = "#132a13"; // standard green highway grass
      }
    }
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // 2. Draw curving asphalt road polygon and borders segment by segment (far-to-near)
    const numLanes = gm.laneManager.numLanes;
    // Step from far (carY - 1200) to near (carY + 150)
    for (let y = carY - 1200; y <= carY + 150; y += 15) {
      const y1 = y;
      const y2 = y + 15;

      const cx1 = track.getCenterXAt(y1);
      const w1 = track.getWidthAt(y1);
      const cx2 = track.getCenterXAt(y2);
      const w2 = track.getWidthAt(y2);

      const p1 = project(cx1, y1);
      const p2 = project(cx2, y2);

      // Clip if both are behind camera
      if (p1.z <= 0 && p2.z <= 0) continue;

      const x1_left = p1.sx - (w1 / 2) * p1.scale;
      const x1_right = p1.sx + (w1 / 2) * p1.scale;
      const x2_left = p2.sx - (w2 / 2) * p2.scale;
      const x2_right = p2.sx + (w2 / 2) * p2.scale;

      // Draw road asphalt slice
      ctx.beginPath();
      ctx.moveTo(x1_left, p1.sy);
      ctx.lineTo(x1_right, p1.sy);
      ctx.lineTo(x2_right, p2.sy);
      ctx.lineTo(x2_left, p2.sy);
      ctx.closePath();
      ctx.fillStyle = gm.activeZone === "city" ? "#2f3238" : gm.activeZone === "mountain" ? "#161e18" : "#1c1c1e";
      ctx.fill();

      // Draw side curb borders
      const i = Math.floor(y1 / 20);
      let curbColor = "#ef4444";
      const seg1 = track.getSegmentAtY(y1);
      const zone = seg1 ? seg1.zone : "highway";
      let curbWidth = 10 * p1.scale;

      if (zone === "city") {
        curbColor = i % 2 === 0 ? "#eab308" : "#1f2937";
        curbWidth = 12 * p1.scale;
      } else if (zone === "mountain") {
        curbColor = "#9ca3af";
        curbWidth = 6 * p1.scale;
      } else {
        curbColor = i % 2 === 0 ? "#ef4444" : "#ffffff";
        curbWidth = 10 * p1.scale;
      }

      ctx.strokeStyle = curbColor;
      ctx.lineWidth = Math.max(1, curbWidth);
      ctx.beginPath();
      ctx.moveTo(x1_left, p1.sy);
      ctx.lineTo(x2_left, p2.sy);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1_right, p1.sy);
      ctx.lineTo(x2_right, p2.sy);
      ctx.stroke();

      if (zone === "mountain" && i % 2 === 0) {
        ctx.fillStyle = "#4b5563"; // post
        ctx.fillRect(x1_left - 1, p1.sy, 2, 7 * p1.scale);
        ctx.fillRect(x1_right - 1, p1.sy, 2, 7 * p1.scale);
      }

      // Draw center lane guidelines (dashed)
      const laneInterval1 = w1 / numLanes;
      const laneInterval2 = w2 / numLanes;
      const isDashActive = Math.floor(y1 / 30) % 2 === 0;

      if (isDashActive) {
        ctx.strokeStyle = gm.focusModeActive ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = Math.max(1, 2 * p1.scale);
        for (let l = 1; l < numLanes; l++) {
          const lx1 = p1.sx - (w1 / 2) * p1.scale + l * laneInterval1 * p1.scale;
          const lx2 = p2.sx - (w2 / 2) * p2.scale + l * laneInterval2 * p2.scale;
          ctx.beginPath();
          ctx.moveTo(lx1, p1.sy);
          ctx.lineTo(lx2, p2.sy);
          ctx.stroke();
        }
      }

      // Draw glowing current lane slice
      const currentLane = gm.laneManager.currentLane;
      const clX1_left = p1.sx - (w1 / 2) * p1.scale + currentLane * laneInterval1 * p1.scale;
      const clX1_right = clX1_left + laneInterval1 * p1.scale;
      const clX2_left = p2.sx - (w2 / 2) * p2.scale + currentLane * laneInterval2 * p2.scale;
      const clX2_right = clX2_left + laneInterval2 * p2.scale;

      ctx.fillStyle = gm.focusModeActive ? "rgba(168, 85, 247, 0.05)" : "rgba(99, 102, 241, 0.05)";
      ctx.beginPath();
      ctx.moveTo(clX1_left, p1.sy);
      ctx.lineTo(clX1_right, p1.sy);
      ctx.lineTo(clX2_right, p2.sy);
      ctx.lineTo(clX2_left, p2.sy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = gm.focusModeActive ? "rgba(168, 85, 247, 0.55)" : "rgba(99, 102, 241, 0.55)";
      ctx.lineWidth = Math.max(1, 3.5 * p1.scale);
      ctx.beginPath();
      ctx.moveTo(clX1_left, p1.sy);
      ctx.lineTo(clX2_left, p2.sy);
      ctx.moveTo(clX1_right, p1.sy);
      ctx.lineTo(clX2_right, p2.sy);
      ctx.stroke();
    }

    // 3. Depth-Sorted Rendering (Painter's Algorithm for Scenery, Collectibles, Obstacles, Gates, and Player Car)
    interface RenderTask {
      z: number;
      draw: (ctx: CanvasRenderingContext2D) => void;
    }
    const tasks: RenderTask[] = [];

    // Collect Scenery
    for (const seg of track.getSegments()) {
      if (seg.scenery) {
        for (const sc of seg.scenery) {
          const worldY = seg.yStart - sc.offsetY;
          const z = carY - worldY + 45;
          if (z > 0 && z < 1200) {
            const cx = track.getCenterXAt(worldY);
            const w = track.getWidthAt(worldY);
            const borderX = sc.side === "left" ? cx - w / 2 : cx + w / 2;
            const xOffset = sc.side === "left" ? -28 * sc.scale : 28 * sc.scale;
            const worldX = borderX + xOffset;

            tasks.push({
              z,
              draw: (ctx) => {
                const p = project(worldX, worldY);
                if (p.sy < -50 || p.sy > H + 50) return;

                ctx.save();
                ctx.translate(p.sx, p.sy);
                const finalScale = sc.scale * p.scale;
                ctx.scale(finalScale, finalScale);

                if (sc.type === "tree") {
                  if (seg.zone === "mountain") {
                    ctx.fillStyle = "#1e3f20";
                    ctx.beginPath();
                    ctx.moveTo(0, -22);
                    ctx.lineTo(-8, -10);
                    ctx.lineTo(-5, -10);
                    ctx.lineTo(-12, 2);
                    ctx.lineTo(-7, 2);
                    ctx.lineTo(-16, 14);
                    ctx.lineTo(16, 14);
                    ctx.lineTo(7, 2);
                    ctx.lineTo(12, 2);
                    ctx.lineTo(5, -10);
                    ctx.lineTo(8, -10);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = "#4a2c11";
                    ctx.fillRect(-2, 14, 4, 6);
                  } else {
                    ctx.fillStyle = "#2d6a4f";
                    ctx.beginPath();
                    ctx.arc(0, -8, 12, 0, Math.PI * 2);
                    ctx.arc(-6, -4, 9, 0, Math.PI * 2);
                    ctx.arc(6, -4, 9, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#5c3d2e";
                    ctx.fillRect(-3, 4, 6, 8);
                  }
                } else if (sc.type === "lamp") {
                  ctx.strokeStyle = "#4b5563";
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(0, 16);
                  ctx.lineTo(0, -20);
                  const armOffset = sc.side === "left" ? 10 : -10;
                  ctx.quadraticCurveTo(0, -26, armOffset, -26);
                  ctx.stroke();

                  ctx.fillStyle = "#fef08a";
                  ctx.beginPath();
                  ctx.arc(armOffset, -26, 3.5, 0, Math.PI * 2);
                  ctx.fill();

                  ctx.fillStyle = "rgba(254, 240, 138, 0.08)";
                  ctx.beginPath();
                  ctx.moveTo(armOffset, -26);
                  ctx.lineTo(armOffset - 16, 16);
                  ctx.lineTo(armOffset + 16, 16);
                  ctx.closePath();
                  ctx.fill();
                } else if (sc.type === "billboard") {
                  ctx.fillStyle = "#5c3d2e";
                  ctx.fillRect(-8, 2, 2.5, 14);
                  ctx.fillRect(5, 2, 2.5, 14);

                  ctx.fillStyle = "#1e2937";
                  ctx.strokeStyle = "#e2e8f0";
                  ctx.lineWidth = 1.2;
                  ctx.fillRect(-16, -12, 32, 14);
                  ctx.strokeRect(-16, -12, 32, 14);

                  if (sc.text) {
                    ctx.fillStyle = "#10b981";
                    ctx.font = "bold 5px monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(sc.text, 0, -5);
                  }
                }
                ctx.restore();
              }
            });
          }
        }
      }
    }

    // Collect Obstacles
    const activeObstacles = gm.obstacleManager.getObstacles();
    for (const obs of activeObstacles) {
      const z = carY - obs.y + 45;
      if (z > 0 && z < 1200) {
        tasks.push({
          z,
          draw: (ctx) => {
            const cx = track.getCenterXAt(obs.y);
            const w = track.getWidthAt(obs.y);
            const laneWidth = w / numLanes;
            const obsX = cx + (obs.lane - (numLanes - 1) / 2) * laneWidth;
            const p = project(obsX, obs.y);
            if (p.sy < -40 || p.sy > H + 40) return;

            ctx.save();
            ctx.translate(p.sx, p.sy);
            ctx.scale(p.scale, p.scale);

            if (obs.type === "cone") {
              ctx.fillStyle = "#f97316";
              ctx.beginPath();
              ctx.moveTo(-10, 8);
              ctx.lineTo(10, 8);
              ctx.lineTo(8, 6);
              ctx.lineTo(-8, 6);
              ctx.closePath();
              ctx.fill();

              ctx.beginPath();
              ctx.moveTo(-6, 6);
              ctx.lineTo(6, 6);
              ctx.lineTo(2, -10);
              ctx.lineTo(-2, -10);
              ctx.closePath();
              ctx.fill();

              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.moveTo(-4, 0);
              ctx.lineTo(4, 0);
              ctx.lineTo(3, -4);
              ctx.lineTo(-3, -4);
              ctx.closePath();
              ctx.fill();
            } else if (obs.type === "barrier") {
              ctx.fillStyle = "#374151";
              ctx.fillRect(-14, 4, 3.5, 6);
              ctx.fillRect(10, 4, 3.5, 6);
              
              ctx.fillStyle = "#f59e0b";
              ctx.fillRect(-18, -8, 36, 12);
              
              ctx.strokeStyle = "#1e293b";
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              for (let sxPos = -14; sxPos <= 14; sxPos += 8) {
                ctx.moveTo(sxPos - 3, -8);
                ctx.lineTo(sxPos + 3, 4);
              }
              ctx.stroke();

              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 1.2;
              ctx.strokeRect(-18, -8, 36, 12);
            }
            ctx.restore();
          }
        });
      }
    }

    // Collect Coins
    const collectibles = gm.collectibleManager.getCollectibles();
    for (const item of collectibles) {
      if (item.isCollected) continue;
      const z = carY - item.y + 45;
      if (z > 0 && z < 1200) {
        tasks.push({
          z,
          draw: (ctx) => {
            const cx = track.getCenterXAt(item.y);
            const w = track.getWidthAt(item.y);
            const laneWidth = w / numLanes;
            const baseItemX = cx + (item.lane - (numLanes - 1) / 2) * laneWidth;
            const itemX = item.x ?? baseItemX;
            const p = project(itemX, item.y);
            if (p.sy < -20 || p.sy > H + 20) return;

            ctx.save();
            ctx.translate(p.sx, p.sy);
            ctx.scale(p.scale, p.scale);

            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#fbbf24";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#d97706";
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#f59e0b";
            ctx.fill();

            ctx.restore();
          }
        });
      }
    }

    // Collect Tire Trails
    if (animationManager) {
      for (const trail of animationManager.tireTrails) {
        const z = carY - trail.y + 45;
        if (z > 0 && z < 1200) {
          tasks.push({
            z,
            draw: (ctx) => {
              const p = project(trail.x, trail.y);
              if (p.sy < -20 || p.sy > H + 20) return;

              ctx.save();
              ctx.globalAlpha = trail.life * 0.45;
              ctx.fillStyle = "rgba(9, 9, 11, 0.48)";
              ctx.beginPath();
              ctx.arc(p.sx, p.sy, 3 * p.scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          });
        }
      }
    }

    // Collect Math challenge gates
    const gates = gm.gateManager.getGates();
    const nextActiveGate = gm.gateManager.getNextActiveGate(gm.carY);
    for (const gate of gates) {
      if (gate.passed) continue;
      const z = carY - gate.y + 45;
      if (z > 0 && z < 1200) {
        tasks.push({
          z,
          draw: (ctx) => {
            const cx = track.getCenterXAt(gate.y);
            const w = track.getWidthAt(gate.y);
            const laneWidth = w / numLanes;

            const pLeft = project(cx - w / 2, gate.y);
            const pRight = project(cx + w / 2, gate.y);

            // Draw horizontal threshold gate bar
            ctx.strokeStyle = gm.focusModeActive ? "#a855f7" : "#4f46e5";
            ctx.lineWidth = Math.max(2, 6 * pLeft.scale);
            ctx.beginPath();
            ctx.moveTo(pLeft.sx, pLeft.sy);
            ctx.lineTo(pRight.sx, pRight.sy);
            ctx.stroke();

            // Draw option boxes inside the lanes
            if (gate.question) {
              const q = gate.question;
              const numOptions = q.options.length;
              
              const hasLargeText = gm.saveManager.getData().settings.largeTextMode;
              const baseBoxW = hasLargeText ? 70 : 50;
              const baseBoxH = hasLargeText ? 36 : 28;
              const baseFontSize = hasLargeText ? 16 : 13;
              
              for (let laneIdx = 0; laneIdx < numOptions; laneIdx++) {
                const lX = cx + (laneIdx - (numLanes - 1) / 2) * laneWidth;
                const pBox = project(lX, gate.y);

                // Depth scaling and clamped minimum sizing for math readability
                const boxW = Math.max(40, baseBoxW * pBox.scale);
                const boxH = Math.max(22, baseBoxH * pBox.scale);
                const fontSize = Math.max(10, baseFontSize * pBox.scale);

                const bx = pBox.sx - boxW / 2;
                const by = pBox.sy - boxH / 2;

                // Draw glowing option box
                ctx.fillStyle = "#1e1b4b";
                ctx.strokeStyle = gm.focusModeActive ? "#c084fc" : "#6366f1";
                ctx.lineWidth = Math.max(1, 2 * pBox.scale);
                
                ctx.beginPath();
                ctx.roundRect(bx, by, boxW, boxH, 6);
                ctx.fill();
                ctx.stroke();

                const optionVal = q.options[laneIdx].toString();
                const textToDraw = gm.saveManager.getData().settings.colorblindHighlighting
                  ? `${String.fromCharCode(65 + laneIdx)}: ${optionVal}`
                  : optionVal;
                  
                ctx.fillStyle = "#ffffff";
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(textToDraw, pBox.sx, pBox.sy);

                // Proximity Danger Zone Warning chevron arrow
                if (gm.isNearGate() && gate === nextActiveGate) {
                  if (laneIdx === q.correctLane) {
                    const arrowY = by - (12 * pBox.scale) - (Math.sin(performance.now() * 0.01) * 4);
                    ctx.fillStyle = "#10b981";
                    ctx.beginPath();
                    const arrowScale = Math.max(0.6, pBox.scale);
                    ctx.moveTo(pBox.sx, arrowY);
                    ctx.lineTo(pBox.sx - 6 * arrowScale, arrowY - 8 * arrowScale);
                    ctx.lineTo(pBox.sx - 3 * arrowScale, arrowY - 8 * arrowScale);
                    ctx.lineTo(pBox.sx - 3 * arrowScale, arrowY - 14 * arrowScale);
                    ctx.lineTo(pBox.sx + 3 * arrowScale, arrowY - 14 * arrowScale);
                    ctx.lineTo(pBox.sx + 3 * arrowScale, arrowY - 8 * arrowScale);
                    ctx.lineTo(pBox.sx + 6 * arrowScale, arrowY - 8 * arrowScale);
                    ctx.closePath();
                    ctx.fill();
                  }
                }
              }
            }
          }
        });
      }
    }

    // Add Player Car Task (fixed at Z = 45 relative to camera)
    tasks.push({
      z: 45,
      draw: (ctx) => {
        if (vehicleRendererRef.current) {
          const pCar = project(gm.laneManager.carX, carY);
          ctx.save();
          ctx.translate(pCar.sx, pCar.sy);
          ctx.scale(pCar.scale, pCar.scale);
          vehicleRendererRef.current.draw(
            ctx,
            0,
            0,
            gm.roadAngle,
            gm.laneManager.steerAngle,
            speedRatio,
            gm.vehicleState,
            gm.isBraking,
            dt,
            equippedSkin
          );
          ctx.restore();
        }
      }
    });

    // Sort all rendering tasks by depth ( Painters algorithm: Far to Near / Descending Z )
    tasks.sort((a, b) => b.z - a.z);

    // Execute all sorted draw tasks
    tasks.forEach(t => t.draw(ctx));

    // 4. Draw active animation particles (sparks & confetti & dust)
    if (animationManager) {
      for (const p of animationManager.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // 5. Draw floating feedback texts
    floatersRef.current.forEach(f => {
      ctx.fillStyle = f.color;
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.globalAlpha = 1.0 - f.age;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1.0;
    });

    // Restore screen zoom/shake context for screen-space static rendering
    ctx.restore();

    // 6. Draw static screen-space coin HUD paths
    if (animationManager) {
      ctx.save();
      for (const c of animationManager.coinFlies) {
        ctx.beginPath();
        ctx.arc(c.currentX, c.currentY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#d97706";
        ctx.stroke();
      }
      ctx.restore();
    }
    
    // 7. Draw screen-space wind lines (motion streaks)
    if (animationManager && speedRatio > 1.4) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1.5;
      for (const w of animationManager.windStreaks) {
        ctx.globalAlpha = w.opacity;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x, w.y + w.length);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
    
    // 8. Draw distance fog on the horizon
    const fogGrad = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    if (gm.activeZone === "mountain") {
      fogGrad.addColorStop(0, "#06130b"); // misty dark green mountain fog
    } else {
      fogGrad.addColorStop(0, "#09090b");
    }
    fogGrad.addColorStop(1, "rgba(9, 9, 11, 0)");
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, W, H * 0.4);

    // 9. Focus Mode vignette edge glow
    if (gm.focusModeActive) {
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
      vignette.addColorStop(0, "rgba(168, 85, 247, 0)");
      vignette.addColorStop(1, "rgba(168, 85, 247, 0.16)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }

    // 10. Full screen color flash chimes
    if (animationManager) {
      if (animationManager.correctFlash > 0) {
        ctx.fillStyle = `rgba(16, 185, 129, ${animationManager.correctFlash})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (animationManager.wrongFlash > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${animationManager.wrongFlash})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (animationManager.milestoneFlash > 0) {
        ctx.fillStyle = `rgba(168, 85, 247, ${animationManager.milestoneFlash})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 11. Draw HUD minimap on screen (static overlays)
    if (gm.gameMode === "Running") {
      const miniW = 28;
      const miniH = 150;
      const miniX = W - miniW - 20;
      const miniY = H * 0.3;

      ctx.save();
      ctx.fillStyle = "rgba(9, 9, 11, 0.75)";
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(miniX - 4, miniY - 4, miniW + 8, miniH + 8, 6);
      ctx.fill();
      ctx.stroke();

      // Render color-coded zone track paths on minimap
      ctx.lineWidth = 3;
      for (let j = 0; j < 9; j++) {
        const y1 = carY - j * 260;
        const y2 = carY - (j + 1) * 260;
        const cx1 = track.getCenterXAt(y1);
        const cx2 = track.getCenterXAt(y2);
        
        const mx1 = miniX + ((cx1 - 180) / 440) * miniW;
        const my1 = miniY + miniH - (j / 9) * miniH;
        const mx2 = miniX + ((cx2 - 180) / 440) * miniW;
        const my2 = miniY + miniH - ((j + 1) / 9) * miniH;

        const seg = track.getSegmentAtY(y2);
        const zoneColor = seg ? (seg.zone === "mountain" ? "#f59e0b" : seg.zone === "city" ? "#9ca3af" : "#10b981") : "#10b981";

        ctx.strokeStyle = zoneColor;
        ctx.beginPath();
        ctx.moveTo(mx1, my1);
        ctx.lineTo(mx2, my2);
        ctx.stroke();
      }

      // Draw upcoming gates ticks on minimap
      for (const gate of gm.gateManager.getGates()) {
        if (gate.y < carY && gate.y > carY - 2400) {
          const progress = (carY - gate.y) / 2400;
          const gMy = miniY + miniH - progress * miniH;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(miniX, gMy);
          ctx.lineTo(miniX + miniW, gMy);
          ctx.stroke();
        }
      }

      // Draw upcoming obstacles on minimap
      const miniObstacles = gm.obstacleManager.getObstacles();
      for (const obs of miniObstacles) {
        if (obs.y < carY && obs.y > carY - 2400) {
          const progress = (carY - obs.y) / 2400;
          const oMy = miniY + miniH - progress * miniH;
          const cx = track.getCenterXAt(obs.y);
          const oMx = miniX + ((cx - 180) / 440) * miniW;
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(oMx, oMy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render player car dot
      const playerCx = track.getCenterXAt(carY);
      const playerMx = miniX + ((playerCx - 180) / 440) * miniW;
      const playerMy = miniY + miniH;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(playerMx, playerMy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing indicator ring
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(playerMx, playerMy, 3.5 + Math.sin(performance.now() * 0.015) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Retries gameplay
  const handleRetry = () => {
    if (synthRef.current) synthRef.current.playClick();
    startRun();
  };

  // Quit back to dashboard
  const handleQuit = () => {
    if (synthRef.current) synthRef.current.playClick();
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (gameManagerRef.current) {
      gameManagerRef.current.gameMode = "Start";
      setGameMode("Start");
    }
  };

  // Toggle categories checkboxes
  const handleToggleCategory = (id: string) => {
    if (synthRef.current) synthRef.current.playClick();
    setCategories(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // keep at least 1
        return prev.filter(c => c !== id);
      }
      return [...prev, id];
    });
  };

  // Dynamic coach report parsing
  const getCoachReport = () => {
    const gm = gameManagerRef.current;
    if (!gm) return null;

    const stats = gm.runAnalytics.categoryStats;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    Object.entries(stats).forEach(([catId, data]) => {
      const accuracy = data.solved > 0 ? (data.correct / data.solved) : 0;
      const catName = gm.questionGen.getCategory(catId)?.name || catId;
      if (accuracy >= 0.8) {
        strengths.push(catName);
      } else if (accuracy < 0.6 || data.solved - data.correct > 0) {
        weaknesses.push(catName);
      }
    });

    let advice = "";
    if (weaknesses.length > 0) {
      advice = `Practice ${weaknesses.join(" & ")} challenges to sharpen your recall. Use the flashing chevron arrows on the road to line up early!`;
    } else if (gm.correctAnswersCount > 0) {
      advice = "Sensational driving! Try enabling other math challenges (like Sequences or Logic) in the menu to push your boundaries.";
    } else {
      advice = "Look at the top HUD card early to read the math question, and swerve into the correct lane ahead of time.";
    }

    // Evaluate Driver DNA
    let dnaName = "Rookie Racer";
    let riskLevel = "Medium";
    let strengthsText = "Cooperative";
    let weaknessesText = "Uncalibrated";
    
    const combo = gm.maxCombo;
    const totalWrong = gm.wrongAnswersCount;
    const accuracyPercent = gm.questionsSolved > 0 ? Math.round((gm.correctAnswersCount / gm.questionsSolved) * 100) : 0;

    if (combo >= 15 && totalWrong === 0) {
      dnaName = "Mathematical Legend";
      riskLevel = "Low Risk";
      strengthsText = "Perfect accuracy, massive combos";
      weaknessesText = "None detected";
    } else if (combo >= 8) {
      dnaName = "Speed Demon";
      riskLevel = "Moderate";
      strengthsText = "High combo chains, rapid lane sweeps";
      weaknessesText = "Minor safety margins";
    } else if (totalWrong > 3) {
      dnaName = "Chaotic Swerver";
      riskLevel = "High Risk";
      strengthsText = "Quick recovery";
      weaknessesText = "Last-second swerving";
    } else if (accuracyPercent > 80) {
      dnaName = "Precision Engineer";
      riskLevel = "Low Risk";
      strengthsText = "Stable lane alignment, consistent accuracy";
      weaknessesText = "Prefers conservative paces";
    } else {
      dnaName = "Arcade Competitor";
      riskLevel = "Medium";
      strengthsText = "Versatile";
      weaknessesText = "Still learning the lanes";
    }

    return {
      strengths: strengths.length > 0 ? strengths.join(", ") : "None recorded",
      weaknesses: weaknesses.length > 0 ? weaknesses.join(", ") : "None! Flawless run!",
      advice,
      dnaName,
      riskLevel,
      strengthsText,
      weaknessesText
    };
  };

  const report = gameMode === "GameOver" ? getCoachReport() : null;

  return (
    <div className={`w-full h-full flex bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none relative ${
      largeTextMode ? "text-xs" : "text-[10px]"
    }`}>
      
      {/* 1. Startup menu dashboard */}
      {gameMode === "Start" && (
        <div className="absolute inset-0 bg-zinc-950 z-40 flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className="text-center mb-8 flex flex-col gap-1.5 animate-pulse">
            <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Math Racer Evolution
            </h1>
            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">
              Arcade Educational Racing Game
            </p>
          </div>

          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
            {/* Highscore & Coins stat indicators */}
            <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-5 text-center font-mono">
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                <span className="text-[8px] text-zinc-500 uppercase font-bold">Best Score</span>
                <div className="text-lg font-black text-white mt-0.5">{highScore}</div>
              </div>
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                <span className="text-[8px] text-zinc-550 uppercase font-bold">Coins Wallet</span>
                <div className="text-lg font-black text-amber-400 mt-0.5">
                  🪙 {gameManagerRef.current?.saveManager.getData().coins ?? 0}
                </div>
              </div>
            </div>

            {/* Select categories checkboxes */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[8.5px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                Select Math Challenges
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["addition", "subtraction", "multiplication"] as const).map(catId => {
                  const active = categories.includes(catId);
                  return (
                    <button
                      key={catId}
                      onClick={() => handleToggleCategory(catId)}
                      className={`py-2 px-1 text-center font-bold text-[9px] rounded-xl border transition cursor-pointer ${
                        active 
                          ? "bg-indigo-600 border-indigo-500 text-white font-extrabold" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {catId === "addition" ? "➕ Add" : catId === "subtraction" ? "➖ Sub" : "✖ Mul"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accessibility Settings Section */}
            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono text-left">
                Accessibility Options
              </span>
              <div className="grid grid-cols-1 gap-1 text-[9px] text-zinc-300 font-mono">
                <label className="flex items-center justify-between cursor-pointer hover:bg-zinc-850 p-1.5 rounded-lg border border-transparent hover:border-zinc-800">
                  <span>Large Text HUD</span>
                  <input
                    type="checkbox"
                    checked={largeTextMode}
                    onChange={toggleLargeText}
                    className="accent-indigo-600 h-3.5 w-3.5 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:bg-zinc-850 p-1.5 rounded-lg border border-transparent hover:border-zinc-800">
                  <span>Colorblind Markings</span>
                  <input
                    type="checkbox"
                    checked={colorblindHighlighting}
                    onChange={toggleColorblind}
                    className="accent-indigo-600 h-3.5 w-3.5 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:bg-zinc-850 p-1.5 rounded-lg border border-transparent hover:border-zinc-800">
                  <span>Reduce Motion / Shakes</span>
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={toggleReduceMotion}
                    className="accent-indigo-600 h-3.5 w-3.5 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl text-zinc-400 flex flex-col gap-1.5">
              <div className="text-white font-bold text-[8.5px] font-mono uppercase tracking-wider">Quick Controls:</div>
              <div className="text-[9.5px] leading-relaxed font-sans">
                👉 Switch lanes with <span className="text-white font-bold font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700">A</span> / <span className="text-white font-bold font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700">D</span> or <span className="text-white font-bold font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700">←</span> / <span className="text-white font-bold font-mono bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700">→ Arrows</span>.
                <br />
                🧠 Steer into the lane showing the **correct answer** to clear gates.
              </div>
            </div>

            <button
              onClick={startRun}
              className="py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-650/20 cursor-pointer transition transform hover:-translate-y-0.5 active:translate-y-0 text-center font-mono tracking-widest"
            >
              🎮 START RACE
            </button>
          </div>
        </div>
      )}

      {/* 2. Active run dashboard */}
      {gameMode !== "Start" && (
        <>
          {/* Background Canvas */}
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Active Question Top HUD Card */}
          {gameMode === "Running" && gameManagerRef.current?.gateManager.getNextActiveGate(gameManagerRef.current.carY)?.question && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border rounded-2xl px-6 py-3 flex flex-col items-center gap-1 shadow-2xl backdrop-blur-md text-center z-10 transition-all duration-200 ${
              gameManagerRef.current.isNearGate() 
                ? "border-amber-500 shadow-amber-950/40 animate-pulse scale-105" 
                : "border-zinc-800"
            } ${largeTextMode ? "min-w-[240px]" : "min-w-[180px]"}`}>
              <span className={`font-bold text-indigo-400 uppercase tracking-widest font-mono ${
                largeTextMode ? "text-[8.5px]" : "text-[7.5px]"
              }`}>
                Solve Challenge
              </span>
              <div className={`font-black text-white tracking-wide ${
                largeTextMode ? "text-xl" : "text-lg"
              }`}>
                {getActiveQuestionText()}
              </div>
            </div>
          )}

          {/* HUD Top Left Stats */}
          <div className={`absolute top-4 left-4 flex flex-col gap-2.5 z-10 font-mono bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3 shadow-xl backdrop-blur-sm ${
            largeTextMode ? "min-w-[130px] text-xs" : "min-w-[110px] text-[10px]"
          }`}>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
              <span className="text-zinc-500 text-[8px] uppercase">Score</span>
              <span className="text-white font-extrabold">{displayedScore}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
              <span className="text-zinc-500 text-[8px] uppercase">Coins</span>
              <span className="text-amber-400 font-extrabold">🪙 {displayedCoins}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-[8px] uppercase">Lives</span>
              <div className="flex gap-0.5 text-rose-500">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i}>{i < lives ? "❤️" : "🖤"}</span>
                ))}
              </div>
            </div>
          </div>

          {/* HUD Top Right Combo Meter */}
          {combo > 0 && (
            <div className={`absolute top-4 right-4 bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center justify-center gap-0.5 shadow-xl backdrop-blur-sm font-mono z-10 animate-bounce ${
              largeTextMode ? "min-w-[95px] text-xs" : "min-w-[75px]"
            }`}>
              <span className="text-[7.5px] text-zinc-500 uppercase font-bold">Combo Streak</span>
              <div className={`font-black text-emerald-400 ${largeTextMode ? "text-lg" : "text-base"}`}>
                {combo}x
              </div>
              <span className="text-[6.5px] text-indigo-400 font-bold uppercase text-center leading-none">
                Multiplier: {1 + Math.floor(combo / 5)}x
              </span>
            </div>
          )}

          {/* Focus Mode Overlay Announcement Banner */}
          {gameMode === "Running" && gameManagerRef.current?.focusModeActive && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-purple-950/80 border border-purple-500/50 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg backdrop-blur-sm z-10 font-mono animate-pulse">
              <span className="text-purple-400 animate-ping">●</span>
              <span className="text-white font-extrabold uppercase text-[9px] tracking-widest">
                FOCUS MODE ACTIVE (2X MULTIPLIER) - {gameManagerRef.current.focusModeTimer.toFixed(1)}s
              </span>
            </div>
          )}

          {/* HUD Audio settings */}
          <button
            onClick={toggleMute}
            className="absolute bottom-4 right-4 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850 px-3.5 py-2 rounded-full text-zinc-400 hover:text-white shadow-xl backdrop-blur-sm cursor-pointer transition z-10 font-mono text-[9px]"
          >
            {isMuted ? "🔇 Muted" : "🔊 Audio"}
          </button>
        </>
      )}

      {/* 3. Pause Screen Overlay */}
      {gameMode === "Paused" && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-xs w-full shadow-2xl flex flex-col gap-4 text-center">
            <h2 className="text-base font-extrabold text-white">⏸ RACE PAUSED</h2>
            <p className="text-zinc-400 text-xs leading-normal">
              Take a breath! Ready to jump back in?
            </p>

            {/* Accessibility Toggles inside Pause Menu */}
            <div className="flex flex-col gap-1.5 border-t border-b border-zinc-800 py-3 text-left font-mono text-[8.5px] text-zinc-400">
              <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-zinc-800">
                <span>Large Text HUD</span>
                <input
                  type="checkbox"
                  checked={largeTextMode}
                  onChange={toggleLargeText}
                  className="accent-indigo-600 h-3 w-3"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-zinc-800">
                <span>Colorblind Markings</span>
                <input
                  type="checkbox"
                  checked={colorblindHighlighting}
                  onChange={toggleColorblind}
                  className="accent-indigo-600 h-3 w-3"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-zinc-800">
                <span>Reduce Motion</span>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={toggleReduceMotion}
                  className="accent-indigo-600 h-3 w-3"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (synthRef.current) synthRef.current.playClick();
                  if (gameManagerRef.current) {
                    gameManagerRef.current.togglePause();
                    setGameMode("Running");
                  }
                }}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer font-mono"
              >
                Resume Run
              </button>
              <button
                onClick={handleQuit}
                className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer border border-zinc-705 font-mono"
              >
                Quit to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Game Over Overlay Scorecard */}
      {gameMode === "GameOver" && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center max-h-[92%] overflow-y-auto">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-black text-rose-500 uppercase tracking-widest font-mono">🏁 RACE FINISHED</h2>
              <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-mono">Game Over Scorecard</span>
            </div>

            {/* Run statistics */}
            <div className="grid grid-cols-2 gap-3 bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl text-center font-mono text-xs">
              <div className="flex flex-col col-span-2 border-b border-zinc-900 pb-2">
                <span className="text-[7.5px] text-zinc-500 uppercase font-extrabold">Final Score</span>
                <span className="text-white text-lg font-black">{displayedScore}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7.5px] text-zinc-550 uppercase font-extrabold">Gold Coins</span>
                <span className="text-amber-400 font-bold">🪙 {displayedCoins}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7.5px] text-zinc-550 uppercase font-extrabold">Max Combo</span>
                <span className="text-emerald-400 font-bold">{gameManagerRef.current?.maxCombo ?? 0}x</span>
              </div>
              <div className="flex flex-col col-span-2 border-t border-zinc-900 pt-2 text-[8px] text-zinc-400 flex flex-row justify-around">
                <div>Distance: <span className="text-white font-bold">{Math.round(gameManagerRef.current?.distance ?? 0)} m</span></div>
                <div>Accuracy: <span className="text-white font-bold">
                  {gameManagerRef.current?.questionsSolved && gameManagerRef.current.questionsSolved > 0
                    ? Math.round((gameManagerRef.current.correctAnswersCount / gameManagerRef.current.questionsSolved) * 100)
                    : 0}%
                </span></div>
              </div>
            </div>

            {/* Coach Report & Driver DNA Presentation Panel */}
            {report && (
              <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3.5 text-left flex flex-col gap-2 font-mono text-[9px] leading-relaxed max-h-[180px] overflow-y-auto">
                <div className="text-indigo-400 font-extrabold uppercase border-b border-zinc-900 pb-1 text-[8.5px] tracking-wider">
                  📋 COACH REPORT & DRIVER DNA
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase">DNA Profile:</span>{" "}
                  <span className="text-white font-black">{report.dnaName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase">Risk Rating:</span>{" "}
                  <span className={`${
                    report.riskLevel === "Low Risk" ? "text-emerald-400" : report.riskLevel === "High Risk" ? "text-rose-400" : "text-amber-400"
                  } font-bold`}>{report.riskLevel}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase">Driving Strengths:</span>{" "}
                  <span className="text-zinc-350">{report.strengthsText}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold uppercase">Areas for Training:</span>{" "}
                  <span className="text-zinc-400">{report.weaknesses}</span>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-850 mt-1 text-zinc-300 leading-normal text-[9.5px]">
                  <span className="text-indigo-400 font-extrabold">COACH ADVICE:</span> {report.advice}
                </div>
              </div>
            )}

            {score >= highScore && score > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 p-2 rounded-xl text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                👑 NEW PERSONAL BEST RECORD!
              </div>
            )}

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-650/15 font-mono"
              >
                🔄 Retry
              </button>
              <button
                onClick={handleQuit}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer border border-zinc-705 font-mono"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}





















