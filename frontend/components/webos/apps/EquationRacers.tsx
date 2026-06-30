import React, { useState, useEffect, useRef } from "react";
import { GameManager } from "@/games/equation-racers/evolution/GameManager";
import { TrackGenerator } from "@/games/equation-racers/track/TrackGenerator";
import { AnimationManager } from "@/games/equation-racers/evolution/AnimationManager";
import { CameraManager, CameraMode } from "@/games/equation-racers/evolution/CameraManager";
import { WebGLRenderer } from "@/games/equation-racers/evolution/WebGLRenderer";
import { VehicleRenderer } from "@/games/equation-racers/evolution/VehicleRenderer";
import { s } from "framer-motion/client";

// Web Audio API Synthesizer for retro retro sounds and music
class AudioSynth {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmInterval: any = null;
  public isBgmPlaying = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

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
    if (mute) {
      this.stopBGM();
      this.stopEngine();
    } else if (this.isBgmPlaying) {
      this.startBGM();
    }
  }

  public startBGM(hasCustomBgm?: boolean) {
    this.isBgmPlaying = true;
    if (this.muted || hasCustomBgm) return;
    this.initCtx();
    this.stopBGM();

    const bpm = 125;
    const stepTime = 60 / bpm / 2; // eighth notes
    let step = 0;
    const bassline = [82.41, 82.41, 98.00, 82.41, 110.00, 110.00, 123.47, 98.00];

    this.bgmInterval = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(bassline[step % bassline.length], now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 0.95);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(250, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + stepTime);

      if (step % 2 === 1) {
        const hh = ctx.createOscillator();
        const hhGain = ctx.createGain();
        hh.type = "triangle";
        hh.frequency.setValueAtTime(8000, now);
        hhGain.gain.setValueAtTime(0.01, now);
        hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        hh.connect(hhGain);
        hhGain.connect(ctx.destination);
        hh.start(now);
        hh.stop(now + 0.05);
      }

      step++;
    }, stepTime * 1000);
  }

  public stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
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

  public startEngine() {
    if (this.muted || this.engineOsc) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, now); // Low engine rumble

    gain.gain.setValueAtTime(0.015, now);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(150, now);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);

    this.engineOsc = osc;
    this.engineGain = gain;
  }

  public stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  public updateEnginePitch(speedRatio: number) {
    if (this.muted || !this.engineOsc) return;
    const now = this.ctx!.currentTime;
    // Engine pitch goes from 55Hz (idle) to 165Hz (full speed)
    let targetFreq = 55 + (isNaN(speedRatio) || !isFinite(speedRatio) ? 0 : Math.max(0, Math.min(1.0, speedRatio))) * 110;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
  }

  public playSwerve() {
    if (this.muted) return;
    this.initCtx();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
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

interface CarSkin {
  id: string;
  name: string;
  bodyColor: string;
  trimColor: string;
  cost: number;
  description: string;
}

const CAR_SKINS: CarSkin[] = [
  { id: "default", name: "Default Cobalt", bodyColor: "#4f46e5", trimColor: "#60a5fa", cost: 0, description: "Classic Indigo & Blue theme" },
  { id: "cyber", name: "Cyber Orange", bodyColor: "#f97316", trimColor: "#eab308", cost: 80, description: "Futuristic neon orange & yellow" },
  { id: "space", name: "Nebula Purple", bodyColor: "#a855f7", trimColor: "#ec4899", cost: 150, description: "Deep nebula purple & hot pink" },
  { id: "formula", name: "Formula Red", bodyColor: "#ef4444", trimColor: "#ffffff", cost: 250, description: "High-octane red & white speed theme" },
  { id: "retro", name: "Retro Green", bodyColor: "#eab308", trimColor: "#16a34a", cost: 350, description: "Classic vintage yellow & green livery" }
];

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
  const [showGarage, setShowGarage] = useState(false);
  const [ytBgmUrl, setYtBgmUrl] = useState("");
  const [ytVideoId, setYtVideoId] = useState("");
  
  // Accessibility preferences
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [colorblindHighlighting, setColorblindHighlighting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [learningMode, setLearningMode] = useState(true);
  
  // Floating feedback text array
  const floatersRef = useRef<FloatingText[]>([]);
  const nextFloaterId = useRef(0);

  // Zone entry banner & milestone refs
  const bannerRef = useRef<{ title: string; subtitle: string; timer: number; isMilestone?: boolean } | null>(null);
  
  // WebGL Renderer Refs and States
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const webglRendererRef = useRef<WebGLRenderer | null>(null);
  const [webglSupported, setWebglSupported] = useState(false);
  const [useWebGL, setUseWebGL] = useState(true);
  
  // Offscreen player vehicle canvas
  const offscreenCarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCarCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastActiveZoneRef = useRef<string>("highway");
  const lastMilestoneRef = useRef<number>(0);

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
    setLearningMode(data.settings.learningMode ?? true);
    synth.setMute(data.settings.mute);
    // Don't autoplay if custom video id is active
    synth.startBGM(!!ytVideoId);

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

    gm.onTrafficCollision = (type) => {
      synth.playWrong();
      animationManager.triggerFlash("wrong");
      if (canvasRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        animationManager.spawnSparks(W / 2, H * 0.7, "#ef4444", 25);
        cameraManager.triggerZoom(0.88);
        floatersRef.current.push({
          id: nextFloaterId.current++,
          x: W / 2,
          y: H * 0.5,
          text: `Hit ${type.toUpperCase()}! -1 Life`,
          color: "#f43f5e",
          age: 0
        });
      }
    };

    gm.onNearMiss = (phrase) => {
      synth.playCoin();
      if (canvasRef.current) {
        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        animationManager.spawnSparks(W / 2, H * 0.7, "#38bdf8", 8);
        floatersRef.current.push({
          id: nextFloaterId.current++,
          x: W / 2 + (Math.random() - 0.5) * 80,
          y: H * 0.5 + (Math.random() - 0.5) * 40,
          text: `${phrase} +50`,
          color: "#38bdf8",
          age: 0
        });
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
      synth.stopBGM();
      synth.stopEngine();
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

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "";
  };

  const handleYtBgmChange = (url: string) => {
    setYtBgmUrl(url);
    const id = extractYoutubeId(url);
    setYtVideoId(id);
    if (id && synthRef.current) {
      synthRef.current.stopBGM();
    } else if (!id && synthRef.current && !isMuted) {
      synthRef.current.startBGM();
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

  const toggleLearningMode = () => {
    if (gameManagerRef.current) {
      const nextVal = !learningMode;
      setLearningMode(nextVal);
      gameManagerRef.current.saveManager.setLearningMode(nextVal);
      gameManagerRef.current.learningMode = nextVal;
    }
  };

  const getActiveGate = () => {
    const gm = gameManagerRef.current;
    if (!gm) return null;
    const gate = gm.gateManager.getNextActiveGate(gm.carY);
    if (!gate || !gate.question) return null;
    return gate;
  };

  // Retrieve current active question text with dynamic memory hide checks
  const getActiveQuestionText = () => {
    const gate = getActiveGate();
    if (!gate || !gate.question) return "";
    const q = gate.question;
    if (q.category === "memory") {
      const gm = gameManagerRef.current!;
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
      
      bannerRef.current = {
        title: "HIGHWAY",
        subtitle: "Open Roads Ahead",
        timer: 2.0
      };
      lastActiveZoneRef.current = "highway";
      lastMilestoneRef.current = 0;

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
        if (synthRef.current) synthRef.current.playSwerve();
      }
      if (key === "d" || e.key === "ArrowRight") {
        gameManagerRef.current.handleRight();
        if (synthRef.current) synthRef.current.playSwerve();
      }
      if (key === "c") {
        const cameraManager = cameraManagerRef.current;
        if (cameraManager) {
          const modes = [
            CameraMode.ChaseCamera,
            CameraMode.FarChase,
            CameraMode.HoodCamera,
            CameraMode.CockpitCamera
          ];
          const nextIdx = (modes.indexOf(cameraManager.mode) + 1) % modes.length;
          cameraManager.mode = modes[nextIdx];
          if (synthRef.current) synthRef.current.playClick();
        }
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

  // WebGL context & offscreen canvas initialization hook
  useEffect(() => {
    if (gameMode !== "Start") {
      const webglCanvas = webglCanvasRef.current;
      if (webglCanvas && !webglRendererRef.current) {
        const renderer = new WebGLRenderer(webglCanvas);
        if (renderer.isSupported()) {
          webglRendererRef.current = renderer;
          setWebglSupported(true);
          console.log("WebGL2 context initialized successfully");
        } else {
          setWebglSupported(false);
          console.log("WebGL2 not supported, falling back to Canvas 2D");
        }
      }
      
      if (typeof document !== "undefined" && !offscreenCarCanvasRef.current) {
        const osc = document.createElement("canvas");
        osc.width = 128;
        osc.height = 128;
        offscreenCarCanvasRef.current = osc;
        offscreenCarCtxRef.current = osc.getContext("2d");
      }
    }
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

    // Decrement banner timer
    if (bannerRef.current) {
      bannerRef.current.timer -= dt;
      if (bannerRef.current.timer <= 0) {
        bannerRef.current = null;
      }
    }

    if (gm.gameMode === "Running") {
      synthRef.current?.startEngine();
      synthRef.current?.updateEnginePitch(gm.speed / gm.maxSpeed);

      // Pass track queries into GameManager
      gm.update(
        dt,
        (y) => track.getCenterXAt(y),
        (y) => track.getWidthAt(y),
        (y) => track.getSegmentAtY(y),
        (y) => track.getElevationAt(y)
      );

      // Adjust traffic speed dynamically for Highway zone (without modifying TrafficManager class)
      const activeVehicles = gm.trafficManager.getActiveVehicles();
      for (const v of activeVehicles) {
        if (!v.crashed && gm.activeZone === "highway") {
          if (!v.id.includes("-hwyboosted")) {
            v.baseSpeed *= 1.35;
            v.speed *= 1.35;
            v.id = v.id + "-hwyboosted";
          }
        }
      }

      // Zone Entry Check
      const activeZone = gm.activeZone;
      if (activeZone !== lastActiveZoneRef.current) {
        lastActiveZoneRef.current = activeZone;
        let subtitle = "Open Roads Ahead";
        if (activeZone === "city") subtitle = "Urban Challenge";
        else if (activeZone === "bridge") subtitle = "Crossing Waters";
        else if (activeZone === "tunnel") subtitle = "Low Visibility Zone";
        else if (activeZone === "mountain") subtitle = "Dangerous Curves Ahead";

        bannerRef.current = {
          title: activeZone.toUpperCase(),
          subtitle,
          timer: 2.0
        };
      }

      // Distance Milestones Check: 1 KM (1000m), 5 KM (5000m), 10 KM (10000m)
      const currentDist = Math.round(gm.distance);
      const targetMilestones = [1000, 5000, 10000];
      for (const m of targetMilestones) {
        if (currentDist >= m && lastMilestoneRef.current < m) {
          lastMilestoneRef.current = m;
          bannerRef.current = {
            title: `${m / 1000} KM REACHED`,
            subtitle: m === 1000 ? "Keep pushing the limit!" : m === 5000 ? "Elite driving in progress!" : "Legendary distance achieved!",
            timer: 3.0,
            isMilestone: true
          };
          synthRef.current?.playCorrect();
          if (animationManagerRef.current && canvasRef.current) {
            animationManagerRef.current.spawnConfetti(canvasRef.current.width / 2, canvasRef.current.height * 0.4, 30);
          }
        }
      }

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
          motionPrefs,
          gm.lives
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
    } else {
      synthRef.current?.stopEngine();
    }

    // Update floaters
    floatersRef.current.forEach(f => {
      f.y -= 60 * dt; // drift up
      f.age += 1.8 * dt; // fade out speed
    });
    floatersRef.current = floatersRef.current.filter(f => f.age < 1.0);

    if (webglSupported && useWebGL) {
      drawFrameWebGL(dt);
    } else {
      drawFrame(dt);
    }

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

  const drawFrameWebGL = (dt = 0.016) => {
    const canvas = webglCanvasRef.current;
    const wr = webglRendererRef.current;
    if (!canvas || !wr) return;

    const gm = gameManagerRef.current;
    const track = trackRef.current;
    const cameraManager = cameraManagerRef.current;
    const animationManager = animationManagerRef.current;
    if (!gm || !track) return;
    const speedRatio = gm.speed / gm.baseSpeed;

    // Resize viewport if bounds changed
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      wr.resize(canvas.width, canvas.height);
    }

    const W = canvas.width;
    const H = canvas.height;

    // Color Lerp utility
    const lerpColor = (c1: string, c2: string, ratio: number) => {
      const parseHex = (hex: string) => {
        const num = parseInt(hex.substring(1), 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
      };
      const color1 = parseHex(c1);
      const color2 = parseHex(c2);
      const r = Math.max(0, Math.min(255, Math.round(color1.r + (color2.r - color1.r) * ratio)));
      const g = Math.max(0, Math.min(255, Math.round(color1.g + (color2.g - color1.g) * ratio)));
      const b = Math.max(0, Math.min(255, Math.round(color1.b + (color2.b - color1.b) * ratio)));
      const toHex = (n: number) => n.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // 1. Layered Sky Gradient
    const getZoneSkyColors = (zone: "highway" | "city" | "mountain" | "bridge" | "tunnel") => {
      if (zone === "city") return { top: "#06060c", bottom: "#141424" };
      if (zone === "mountain") return { top: "#0a0f1d", bottom: "#1a2333" };
      if (zone === "bridge") return { top: "#041d33", bottom: "#026aa6" };
      if (zone === "tunnel") return { top: "#030305", bottom: "#08080c" };
      return { top: "#01030d", bottom: "#0b1021" };
    };

    const sky = getZoneSkyColors(gm.activeZone);
    const carY = gm.carY;
    const cameraX = cameraManager ? cameraManager.cameraX : gm.laneManager.carX;
    const horizonY = H * 0.40 + (cameraManager ? cameraManager.verticalOffset : 0);

    // Draw 4-slice Sky Gradient to give depth/horizon haze
    const sliceH = horizonY / 4;
    for (let s = 0; s < 4; s++) {
      const topY = s * sliceH;
      const botY = (s + 1) * sliceH;
      const col = lerpColor(sky.top, sky.bottom, (s + 1) / 4);
      wr.drawRoadQuad(0, topY, 1200, W, topY, 1200, W, botY, 1200, 0, botY, 1200, col);
    }

    // 2. Draw ground background quad (from horizonY to bottom)
    const getZoneGroundColor = (zone: "highway" | "city" | "mountain" | "bridge" | "tunnel") => {
      if (zone === "city") return "#1e293b";
      if (zone === "mountain") return "#1c1917";
      if (zone === "bridge") return "#0284c7";
      if (zone === "tunnel") return "#09090b";
      return "#14532d";
    };
    const groundColor = getZoneGroundColor(gm.activeZone);
    wr.drawRoadQuad(0, horizonY, 1200, W, horizonY, 1200, W, H, 1200, 0, H, 1200, groundColor);

    // 3. Environment Depth System - Layered Parallax Backgrounds
    if (gm.activeZone === "city") {
      // Layer 3: Distant Skyline Silhouette (Very slow scroll)
      const skylineOffset = (cameraX * 0.015) % 360;
      for (let bx = -180; bx < W + 180; bx += 90) {
        const heightVal = 40 + Math.sin(bx * 0.03) * 20;
        wr.drawAtlasSprite("skyscraper", bx - skylineOffset, horizonY - heightVal * 0.4, heightVal / 64, 48, 64, [0.06, 0.06, 0.10, 1.0]);
      }
      // Layer 2: Mid-distance Buildings (Medium scroll)
      const midOffset = (cameraX * 0.035) % 240;
      for (let bx = -120; bx < W + 120; bx += 100) {
        const heightVal = 65 + Math.cos(bx * 0.05) * 30;
        wr.drawAtlasSprite("skyscraper", bx - midOffset, horizonY - heightVal * 0.5, heightVal / 64, 48, 64, [0.12, 0.12, 0.20, 1.0]);
      }
    } else if (gm.activeZone === "mountain") {
      // Layer 3: Distant Mountain Chain (Slowest scroll)
      const mountFar = (cameraX * 0.01) % 400;
      for (let bx = -200; bx < W + 200; bx += 200) {
        wr.drawAtlasSprite("mountain_cliff", bx - mountFar, horizonY - 45, 3.5, 64, 64, [0.05, 0.06, 0.12, 0.35]);
      }
      // Layer 2: Mid-distance Ridge (Medium scroll)
      const mountMid = (cameraX * 0.022) % 280;
      for (let bx = -140; bx < W + 140; bx += 160) {
        wr.drawAtlasSprite("mountain_cliff", bx - mountMid, horizonY - 30, 2.2, 64, 64, [0.08, 0.08, 0.14, 0.70]);
      }
    } else if (gm.activeZone === "bridge") {
      // Advanced water wave layering
      const time = performance.now() * 0.0018;
      const waveColor1 = "#0369a1"; // deep blue
      const waveColor2 = "#0284c7"; // mid blue
      const waveColor3 = "#0ea5e9"; // cyan surface
      
      const wave1Y = horizonY + Math.sin(time) * 4;
      wr.drawRoadQuad(0, wave1Y, 1200, W, wave1Y, 1200, W, H, 1200, 0, H, 1200, waveColor1);
      
      const wave2Y = horizonY + 8 + Math.cos(time + 1) * 3;
      wr.drawRoadQuad(0, wave2Y, 800, W, wave2Y, 800, W, H, 800, 0, H, 800, waveColor2);
      
      const wave3Y = horizonY + 16 + Math.sin(time * 1.5) * 2;
      wr.drawRoadQuad(0, wave3Y, 400, W, wave3Y, 400, W, H, 400, 0, H, 400, waveColor3);
    }

    const visibleSegments = track.getSegmentsInYRange(carY - 1200, carY + 150);
    const getSegmentInVisible = (y: number) => {
      for (let idx = 0; idx < visibleSegments.length; idx++) {
        const seg = visibleSegments[idx];
        if (y <= seg.yStart && y >= (seg.yStart - seg.length)) return seg;
      }
      return null;
    };
    const getElevationAtVisible = (y: number) => {
      const seg = getSegmentInVisible(y);
      if (!seg) return 0;
      const progress = (seg.yStart - y) / seg.length;
      return seg.startElevation + (seg.endElevation - seg.startElevation) * progress;
    };
    const getCenterXAtVisible = (y: number) => {
      const seg = getSegmentInVisible(y);
      if (!seg) return 400;
      const progress = (seg.yStart - y) / seg.length;
      if (seg.type.includes("curve") || seg.type.includes("hairpin") || seg.type.includes("s_curve")) {
        const t = progress * progress * (3 - 2 * progress);
        return seg.startCenterX + (seg.endCenterX - seg.startCenterX) * t;
      }
      return seg.startCenterX + (seg.endCenterX - seg.startCenterX) * progress;
    };
    const getWidthAtVisible = (y: number) => {
      const seg = getSegmentInVisible(y);
      if (!seg) return 300;
      const progress = (seg.yStart - y) / seg.length;
      return seg.startWidth + (seg.endWidth - seg.startWidth) * progress;
    };

    const getScale = (z: number) => {
      const focalLength = cameraManager ? cameraManager.focalLength : 0.82;
      return (H * 0.32 * focalLength) / (z + 55);
    };

    const project = (worldX: number, worldY: number) => {
      const zOffset = cameraManager ? cameraManager.cameraZOffset : 45;
      const z = carY - worldY + zOffset;
      const scale = getScale(z);
      const el = getElevationAtVisible(worldY);
      const elCar = getElevationAtVisible(carY);
      const horizon = H * 0.40 + (cameraManager ? cameraManager.verticalOffset : 0);
      const camHeight = cameraManager ? cameraManager.cameraHeight : 155;
      const sx = W / 2 + (worldX - cameraX) * scale;
      const sy = horizon + (camHeight - (el - elCar)) * scale;
      return { sx, sy, scale, z };
    };

    // Draw Road segments quads (far to near)
    const numLanes = gm.laneManager.numLanes;
    for (let y = carY - 1200; y <= carY + 150; y += 15) {
      const y1 = y;
      const y2 = y + 15;

      const cx1 = getCenterXAtVisible(y1);
      const w1 = getWidthAtVisible(y1);
      const cx2 = getCenterXAtVisible(y2);
      const w2 = getWidthAtVisible(y2);

      const p1 = project(cx1, y1);
      const p2 = project(cx2, y2);

      if (p1.z <= 0 && p2.z <= 0) continue;

      const seg1 = getSegmentInVisible(y1);
      const zone = seg1 ? seg1.zone : "highway";

      const x1_left = p1.sx - (w1 / 2) * p1.scale;
      const x1_right = p1.sx + (w1 / 2) * p1.scale;
      const x2_left = p2.sx - (w2 / 2) * p2.scale;
      const x2_right = p2.sx + (w2 / 2) * p2.scale;

      let roadColor = "#1c1c1e";
      if (zone === "city") roadColor = "#27272a";
      else if (zone === "mountain") roadColor = "#292524";
      else if (zone === "bridge") roadColor = "#3f3f46";
      else if (zone === "tunnel") roadColor = "#18181b";

      wr.drawRoadQuad(x1_left, p1.sy, p1.z, x1_right, p1.sy, p1.z, x2_right, p2.sy, p2.z, x2_left, p2.sy, p2.z, roadColor);

      // Curb shoulders
      const i = Math.floor(y1 / 20);
      let curbColor = "#ef4444";
      let curbWidth = 10 * p1.scale;
      if (zone === "city") {
        curbColor = i % 2 === 0 ? "#eab308" : "#1f2937";
        curbWidth = 12 * p1.scale;
      } else if (zone === "mountain") {
        curbColor = "#78716c";
        curbWidth = 6 * p1.scale;
      } else if (zone === "bridge") {
        curbColor = i % 2 === 0 ? "#52525b" : "#a1a1aa";
        curbWidth = 14 * p1.scale;
      } else if (zone === "tunnel") {
        curbColor = "#27272a";
        curbWidth = 8 * p1.scale;
      } else {
        curbColor = i % 2 === 0 ? "#ef4444" : "#ffffff";
        curbWidth = 10 * p1.scale;
      }

      // Left curb shoulder
      wr.drawRoadQuad(x1_left - curbWidth, p1.sy, p1.z, x1_left, p1.sy, p1.z, x2_left, p2.sy, p2.z, x2_left - curbWidth, p2.sy, p2.z, curbColor);
      // Right curb shoulder
      wr.drawRoadQuad(x1_right, p1.sy, p1.z, x1_right + curbWidth, p1.sy, p1.z, x2_right + curbWidth, p2.sy, p2.z, x2_right, p2.sy, p2.z, curbColor);

      // Roadside Terrain Details (Roadside shoulders, sidewalks, cliff walls, rib tunnels)
      if (zone === "highway") {
        // Dirt shoulders flanking the curb
        const dirtW1 = 26 * p1.scale;
        const dirtW2 = 26 * p2.scale;
        wr.drawRoadQuad(x1_left - curbWidth - dirtW1, p1.sy, p1.z, x1_left - curbWidth, p1.sy, p1.z, x2_left - curbWidth, p2.sy, p2.z, x2_left - curbWidth - dirtW2, p2.sy, p2.z, "#4b5320");
        wr.drawRoadQuad(x1_right + curbWidth, p1.sy, p1.z, x1_right + curbWidth + dirtW1, p1.sy, p1.z, x2_right + curbWidth + dirtW2, p2.sy, p2.z, x2_right + curbWidth, p2.sy, p2.z, "#4b5320");
      } else if (zone === "city") {
        // Pedestrian gray concrete sidewalks
        const walkW1 = 30 * p1.scale;
        const walkW2 = 30 * p2.scale;
        wr.drawRoadQuad(x1_left - curbWidth - walkW1, p1.sy, p1.z, x1_left - curbWidth, p1.sy, p1.z, x2_left - curbWidth, p2.sy, p2.z, x2_left - curbWidth - walkW2, p2.sy, p2.z, "#3f3f46");
        wr.drawRoadQuad(x1_right + curbWidth, p1.sy, p1.z, x1_right + curbWidth + walkW1, p1.sy, p1.z, x2_right + curbWidth + walkW2, p2.sy, p2.z, x2_right + curbWidth, p2.sy, p2.z, "#3f3f46");
      } else if (zone === "mountain") {
        // Canyon drop-offs vs vertical rocky cliffs
        let cliffSide: "left" | "right" = "left";
        if (seg1 && seg1.scenery) {
          const firstCliff = seg1.scenery.find(sc => sc.type === "cliff" || sc.type === "rock");
          if (firstCliff) {
            cliffSide = firstCliff.side;
          }
        }
        const canyonW1 = 150 * p1.scale;
        const canyonW2 = 150 * p2.scale;
        if (cliffSide === "left") {
          // Left is rocky wall, right is canyon drop
          wr.drawRoadQuad(x1_right + curbWidth, p1.sy, p1.z, x1_right + curbWidth + canyonW1, H, p1.z, x2_right + curbWidth + canyonW2, H, p2.z, x2_right + curbWidth, p2.sy, p2.z, "#0c0a09");
        } else {
          // Right is rocky wall, left is canyon drop
          wr.drawRoadQuad(x1_left - curbWidth - canyonW1, H, p1.z, x1_left - curbWidth, p1.sy, p1.z, x2_left - curbWidth, p2.sy, p2.z, x2_left - curbWidth - canyonW2, H, p2.z, "#0c0a09");
        }
      } else if (zone === "tunnel") {
        // Thick concrete arch structural ribs rendering periodically to feel enclosed
        if (i % 5 === 0) {
          const wallH1 = 125 * p1.scale;
          const wallH2 = 125 * p2.scale;
          const ribW1 = 18 * p1.scale;
          const ribW2 = 18 * p2.scale;
          
          // Left rib
          wr.drawRoadQuad(x1_left - ribW1, p1.sy - wallH1, p1.z, x1_left, p1.sy, p1.z, x2_left, p2.sy, p2.z, x2_left - ribW2, p2.sy - wallH2, p2.z, "#18181b");
          // Right rib
          wr.drawRoadQuad(x1_right, p1.sy, p1.z, x1_right + ribW1, p1.sy - wallH1, p1.z, x2_right + ribW2, p2.sy - wallH2, p2.z, x2_right, p2.sy, p2.z, "#18181b");
          // Ceiling rib
          wr.drawRoadQuad(x1_left - ribW1, p1.sy - wallH1, p1.z, x1_right + ribW1, p1.sy - wallH1, p1.z, x2_right + ribW2, p2.sy - wallH2, p2.z, x2_left - ribW2, p2.sy - wallH2, p2.z, "#111115");
        }
      }

      // Center dashed lane markings
      const laneInterval1 = w1 / numLanes;
      const laneInterval2 = w2 / numLanes;
      if (Math.floor(y1 / 30) % 2 === 0) {
        const dashColor = "#ffffff";
        const dashW = Math.max(1, 2.5 * p1.scale);
        for (let l = 1; l < numLanes; l++) {
          const lx1 = p1.sx - (w1 / 2) * p1.scale + l * laneInterval1 * p1.scale;
          const lx2 = p2.sx - (w2 / 2) * p2.scale + l * laneInterval2 * p2.scale;
          wr.drawRoadQuad(lx1 - dashW / 2, p1.sy, p1.z, lx1 + dashW / 2, p1.sy, p1.z, lx2 + dashW / 2, p2.sy, p2.z, lx2 - dashW / 2, p2.sy, p2.z, dashColor);
        }
      }
    }

    const fogColor = getZoneSkyColors(gm.activeZone).bottom;
    wr.flushRoad(gm.activeZone, fogColor, performance.now() * 0.001, gm.speed);

    // 4. Gather scenery elements depth-sorted
    interface WebGLTask {
      z: number;
      draw: () => void;
    }
    const glTasks: WebGLTask[] = [];

    // Coins
    const coinsList = gm.collectibleManager.getCollectibles();
    for (const c of coinsList) {
      const z = carY - c.y + 45;
      if (z > 0 && z < 1200) {
        glTasks.push({
          z,
          draw: () => {
            const cx = track.getCenterXAt(c.y);
            const w = track.getWidthAt(c.y);
            const laneWidth = w / numLanes;
            const wx = cx + (c.lane - (numLanes - 1) / 2) * laneWidth;
            const p = project(wx, c.y);
            // Apply atmospheric color fading tint
            const fogFactor = Math.max(0, Math.min(1.0, (z - 250) / 950));
            const tint = [1.0 - fogFactor * 0.5, 1.0 - fogFactor * 0.5, 1.0, 1.0];
            wr.drawAtlasSprite("coin", p.sx, p.sy, p.scale, 32, 32, tint);
          }
        });
      }
    }

    // Obstacles
    const obstaclesList = gm.obstacleManager.getObstacles();
    for (const o of obstaclesList) {
      const z = carY - o.y + 45;
      if (z > 0 && z < 1200) {
        glTasks.push({
          z,
          draw: () => {
            const cx = track.getCenterXAt(o.y);
            const w = track.getWidthAt(o.y);
            const laneWidth = w / numLanes;
            const wx = cx + (o.lane - (numLanes - 1) / 2) * laneWidth;
            const p = project(wx, o.y);
            const fogFactor = Math.max(0, Math.min(1.0, (z - 250) / 950));
            const tint = [1.0 - fogFactor * 0.4, 1.0 - fogFactor * 0.4, 1.0 - fogFactor * 0.2, 1.0];
            wr.drawAtlasSprite("barrier", p.sx, p.sy, p.scale, 48, 48, tint);
          }
        });
      }
    }

    // Civilian Traffic
    const trafficList = gm.trafficManager.getActiveVehicles();
    for (const v of trafficList) {
      const z = carY - v.y + 45;
      if (z > 0 && z < 1200) {
        glTasks.push({
          z,
          draw: () => {
            const cx = track.getCenterXAt(v.y);
            const w = track.getWidthAt(v.y);
            const laneWidth = w / numLanes;
            const vx = cx + (v.lane - (numLanes - 1) / 2) * laneWidth;
            const p = project(vx, v.y);
            const spriteName = v.type === "truck" ? "civilian_truck" : v.type === "motorcycle" ? "civilian_moto" : "civilian_sedan";
            const fogFactor = Math.max(0, Math.min(1.0, (z - 250) / 950));
            const tint = [1.0 - fogFactor * 0.4, 1.0 - fogFactor * 0.4, 1.0 - fogFactor * 0.2, 1.0];
            wr.drawAtlasSprite(spriteName, p.sx, p.sy, p.scale, 64, 64, tint);
          }
        });
      }
    }

    // Roadside Scenery (Trees, Signs, Lamp posts, Cliffs)
    for (const seg of visibleSegments) {
      if (seg.scenery) {
        for (const s of seg.scenery) {
          const itemY = seg.yStart - s.offsetY;
          const z = carY - itemY + 45;
          if (z > 0 && z < 1200) {
            glTasks.push({
              z,
              draw: () => {
                const cx = getCenterXAtVisible(itemY);
                const w = getWidthAtVisible(itemY);
                const sideOffset = s.side === "left" ? -w / 2 - 38 : w / 2 + 38;
                const p = project(cx + sideOffset, itemY);
                const sType = s.type as string;
                const spriteName = sType === "rock" ? "rock" : sType === "sign" ? "sign" : sType === "cliff" ? "mountain_cliff" : sType === "pine" ? "pine" : "tree";
                
                // Advanced environment depth shading: far objects get more atmosphere haze (tint toward sky/horizon background)
                const fogFactor = Math.max(0, Math.min(1.0, (z - 250) / 950));
                const tint = [1.0 - fogFactor * 0.4, 1.0 - fogFactor * 0.4, 1.0 - fogFactor * 0.2, 1.0];
                wr.drawAtlasSprite(spriteName, p.sx, p.sy, p.scale, 64, 64, tint);
              }
            });
          }
        }
      }
    }

    // Player Car dynamic canvas rendering
    if (!cameraManager || cameraManager.mode !== CameraMode.CockpitCamera) {
      glTasks.push({
        z: 45,
        draw: () => {
          const osc = offscreenCarCanvasRef.current;
          const oscCtx = offscreenCarCtxRef.current;
          if (osc && oscCtx && vehicleRendererRef.current) {
            oscCtx.clearRect(0, 0, 128, 128);
            oscCtx.save();
            oscCtx.translate(64, 82);
            oscCtx.scale(1.25, 1.25);
            vehicleRendererRef.current.draw(
              oscCtx,
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
            oscCtx.restore();

            const pCar = project(gm.laneManager.carX, carY);
            wr.drawPlayerCarTexture(osc, pCar.sx, pCar.sy, pCar.scale, 85, 85);
          }
        }
      });
    }

    glTasks.sort((a, b) => b.z - a.z);
    glTasks.forEach(t => t.draw());

    // Flush all sprites to GPU
    wr.flushSprites(wr["atlasTexture"]!, [1.0, 1.0, 1.0, 1.0], gm.activeZone);

    // Apply fullscreen post-processing presentation pass
    const speedBoostVal = Math.max(0, (gm.speed - gm.baseSpeed) / gm.baseSpeed);
    const hitFeedbackVal = animationManager ? animationManager.wrongFlash : 0.0;
    let zoneId = 0; // highway
    if (gm.activeZone === "city") zoneId = 1;
    else if (gm.activeZone === "mountain") zoneId = 2;
    else if (gm.activeZone === "bridge") zoneId = 3;
    else if (gm.activeZone === "tunnel") zoneId = 4;

    wr.present(performance.now() * 0.001, speedBoostVal, hitFeedbackVal, zoneId);
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

    // Visible segments query culling to avoid checking all segments in track
    const visibleSegments = track.getSegmentsInYRange(carY - 1200, carY + 150);

    const getSegmentInVisible = (y: number) => {
      for (let idx = 0; idx < visibleSegments.length; idx++) {
        const seg = visibleSegments[idx];
        if (y <= seg.yStart && y >= (seg.yStart - seg.length)) {
          return seg;
        }
      }
      return null;
    };

    const getElevationAtVisible = (y: number) => {
      const seg = getSegmentInVisible(y);
      if (!seg) return 0;
      const progress = (seg.yStart - y) / seg.length;
      return seg.startElevation + (seg.endElevation - seg.startElevation) * progress;
    };

    const getCenterXAtVisible = (y: number) => {
      const seg = getSegmentInVisible(y);
      if (!seg) return 400;
      const progress = (seg.yStart - y) / seg.length;
      if (seg.type.includes("curve") || seg.type.includes("hairpin") || seg.type.includes("s_curve")) {
        const t = progress * progress * (3 - 2 * progress);
        return seg.startCenterX + (seg.endCenterX - seg.startCenterX) * t;
      }
      return seg.startCenterX + (seg.endCenterX - seg.startCenterX) * progress;
    };

    const getWidthAtVisible = (y: number) => {
      const seg = getSegmentInVisible(y);
      if (!seg) return 300;
      const progress = (seg.yStart - y) / seg.length;
      return seg.startWidth + (seg.endWidth - seg.startWidth) * progress;
    };

    // Projection helpers for pseudo-3D perspective mapping using fast local lookups
    const getScale = (z: number) => {
      const focalLength = cameraManager ? cameraManager.focalLength : 0.82;
      return (H * 0.32 * focalLength) / (z + 55);
    };

    const project = (worldX: number, worldY: number) => {
      const zOffset = cameraManager ? cameraManager.cameraZOffset : 45;
      const z = carY - worldY + zOffset;
      const scale = getScale(z);
      const el = getElevationAtVisible(worldY);
      const elCar = getElevationAtVisible(carY);
      const horizonY = H * 0.40 + (cameraManager ? cameraManager.verticalOffset : 0);
      const camHeight = cameraManager ? cameraManager.cameraHeight : 155;
      const sx = W / 2 + (worldX - cameraX) * scale;
      const sy = horizonY + (camHeight - (el - elCar)) * scale;
      return { sx, sy, scale, z };
    };

    const horizonY = H * 0.40 + (cameraManager ? cameraManager.verticalOffset : 0);

    // Compute zone transition metrics
    const getZoneTransitionState = () => {
      const currentSeg = getSegmentInVisible(carY);
      if (!currentSeg) return { currentZone: "highway" as const, nextZone: "highway" as const, factor: 0 };

      const currentZone = currentSeg.zone;
      let nextZone = currentZone;
      let distanceToChange = 99999;

      const allSegs = track.getSegments();
      const currentIdx = allSegs.indexOf(currentSeg);
      if (currentIdx !== -1) {
        for (let i = currentIdx + 1; i < allSegs.length; i++) {
          const seg = allSegs[i];
          if (seg.zone !== currentZone) {
            nextZone = seg.zone;
            distanceToChange = carY - seg.yStart;
            break;
          }
        }
      }

      const blendDistance = 800;
      let factor = 0;
      if (distanceToChange <= blendDistance) {
        factor = 1 - (distanceToChange / blendDistance);
        factor = Math.max(0, Math.min(1, factor));
      }

      return { currentZone, nextZone, factor };
    };

    const transitionState = getZoneTransitionState();

    // 1. Draw Parallax Background (sky, scrolling mountains/hills anchored to horizonY)
    const getZoneSkyColors = (zone: "highway" | "city" | "mountain" | "bridge" | "tunnel") => {
      if (zone === "city") {
        return { top: "#0b0b14", bottom: "#1e1e2f" };
      } else if (zone === "mountain") {
        return { top: "#0c1524", bottom: "#1e293b" };
      } else if (zone === "bridge") {
        return { top: "#082f49", bottom: "#0284c7" };
      } else if (zone === "tunnel") {
        return { top: "#050508", bottom: "#0c0c12" };
      } else { // highway
        return { top: "#020617", bottom: "#0f172a" };
      }
    };

    const getZoneGroundColors = (zone: "highway" | "city" | "mountain" | "bridge" | "tunnel") => {
      if (zone === "city") return "#1e293b";
      if (zone === "mountain") return "#1c1917";
      if (zone === "bridge") return "#0284c7";
      if (zone === "tunnel") return "#09090b";
      return "#14532d";
    };

    const lerpColor = (c1: string, c2: string, ratio: number) => {
      const parseHex = (hex: string) => {
        const num = parseInt(hex.substring(1), 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
      };
      const color1 = parseHex(c1);
      const color2 = parseHex(c2);
      const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
      const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
      const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
      return `rgb(${r},${g},${b})`;
    };

    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    if (gm.focusModeActive) {
      skyGrad.addColorStop(0, "#09090b");
      skyGrad.addColorStop(1, "#180828");
    } else {
      const currentSky = getZoneSkyColors(transitionState.currentZone);
      const nextSky = getZoneSkyColors(transitionState.nextZone);
      skyGrad.addColorStop(0, lerpColor(currentSky.top, nextSky.top, transitionState.factor));
      skyGrad.addColorStop(1, lerpColor(currentSky.bottom, nextSky.bottom, transitionState.factor));
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizonY);

    // Parallax background renderer
    const drawParallaxBackground = (zone: "highway" | "city" | "mountain" | "bridge" | "tunnel", opacity: number) => {
      if (opacity <= 0 || zone === "tunnel") return;
      ctx.save();
      ctx.globalAlpha = opacity;

      if (zone === "city") {
        ctx.fillStyle = "#11111e";
        const cityOffset = (cameraX * 0.05) % 180;
        for (let bx = -100; bx < W + 100; bx += 30) {
          const blockH = 50 + Math.sin(bx * 0.05) * 35 + Math.cos(bx * 0.1) * 15;
          ctx.fillRect(bx - cityOffset, horizonY - blockH, 25, blockH);
        }
      } else if (zone === "mountain") {
        ctx.fillStyle = "#0c0a09";
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= W; x += 20) {
          const yPeak = horizonY - 40 + Math.sin((x + cameraX * 0.04) * 0.008) * 60 + Math.cos((x + cameraX * 0.04) * 0.02) * 20;
          ctx.lineTo(x, yPeak);
        }
        ctx.lineTo(W, horizonY);
        ctx.closePath();
        ctx.fill();
      } else if (zone === "bridge") {
        ctx.fillStyle = "#034d73";
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= W; x += 40) {
          const yPeak = horizonY - 10 + Math.sin((x + cameraX * 0.03) * 0.004) * 15;
          ctx.lineTo(x, yPeak);
        }
        ctx.lineTo(W, horizonY);
        ctx.closePath();
        ctx.fill();
      } else { // highway
        ctx.fillStyle = gm.focusModeActive ? "#120d24" : "#14532d";
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= W; x += 15) {
          const yPeak = horizonY - 20 + Math.sin((x + cameraX * 0.04) * 0.005) * 45 + Math.cos((x + cameraX * 0.04) * 0.012) * 15;
          ctx.lineTo(x, yPeak);
        }
        ctx.lineTo(W, horizonY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    if (transitionState.currentZone !== "tunnel" || transitionState.nextZone !== "tunnel") {
      drawParallaxBackground(transitionState.currentZone, 1 - transitionState.factor);
      drawParallaxBackground(transitionState.nextZone, transitionState.factor);
    }

    // Draw Grass/Ground background below horizon
    if (gm.focusModeActive) {
      ctx.fillStyle = "rgba(9, 9, 11, 0.95)";
      ctx.fillRect(0, horizonY, W, H - horizonY);
    } else {
      const currentGround = getZoneGroundColors(transitionState.currentZone);
      const nextGround = getZoneGroundColors(transitionState.nextZone);
      ctx.fillStyle = lerpColor(currentGround, nextGround, transitionState.factor);
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Render scrolling water waves if either zone is a Bridge
      if (transitionState.currentZone === "bridge" || transitionState.nextZone === "bridge") {
        const bridgeWeight = transitionState.currentZone === "bridge" ? (1 - transitionState.factor) : transitionState.factor;
        ctx.save();
        ctx.globalAlpha = bridgeWeight;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        const waveOffset = (carY * 0.04) % 40;
        for (let wy = horizonY + waveOffset; wy < H; wy += 40) {
          ctx.beginPath();
          ctx.moveTo(0, wy);
          for (let wx = 0; wx <= W; wx += 20) {
            ctx.lineTo(wx, wy + Math.sin((wx + carY) * 0.02) * 2);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 2. Draw curving asphalt road polygon and borders segment by segment (far-to-near)
    const numLanes = gm.laneManager.numLanes;
    for (let y = carY - 1200; y <= carY + 150; y += 15) {
      const y1 = y;
      const y2 = y + 15;

      const cx1 = getCenterXAtVisible(y1);
      const w1 = getWidthAtVisible(y1);
      const cx2 = getCenterXAtVisible(y2);
      const w2 = getWidthAtVisible(y2);

      const p1 = project(cx1, y1);
      const p2 = project(cx2, y2);

      // Clip if both are behind camera
      if (p1.z <= 0 && p2.z <= 0) continue;

      const seg1 = getSegmentInVisible(y1);
      const zone = seg1 ? seg1.zone : "highway";

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
      let roadColor = "#1c1c1e";
      if (zone === "city") {
        roadColor = "#27272a";
      } else if (zone === "mountain") {
        roadColor = "#292524";
      } else if (zone === "bridge") {
        roadColor = "#3f3f46";
      } else if (zone === "tunnel") {
        roadColor = "#18181b";
      }
      ctx.fillStyle = roadColor;
      ctx.fill();

      // Draw side curb borders
      const i = Math.floor(y1 / 20);
      let curbColor = "#ef4444";
      let curbWidth = 10 * p1.scale;

      if (zone === "city") {
        curbColor = i % 2 === 0 ? "#eab308" : "#1f2937";
        curbWidth = 12 * p1.scale;
      } else if (zone === "mountain") {
        curbColor = "#78716c";
        curbWidth = 6 * p1.scale;
      } else if (zone === "bridge") {
        curbColor = i % 2 === 0 ? "#52525b" : "#a1a1aa";
        curbWidth = 14 * p1.scale;
      } else if (zone === "tunnel") {
        curbColor = "#27272a";
        curbWidth = 8 * p1.scale;
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

      // Highway-specific: Draw steel guardrails along the road edges
      if (zone === "highway") {
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = Math.max(1, 2.5 * p1.scale);
        ctx.beginPath();
        ctx.moveTo(x1_left - 2 * p1.scale, p1.sy - 8 * p1.scale);
        ctx.lineTo(x2_left - 2 * p2.scale, p2.sy - 8 * p2.scale);
        ctx.moveTo(x1_right + 2 * p1.scale, p1.sy - 8 * p1.scale);
        ctx.lineTo(x2_right + 2 * p2.scale, p2.sy - 8 * p2.scale);
        ctx.stroke();

        if (i % 2 === 0) {
          ctx.fillStyle = "#4b5563"; // post support
          ctx.fillRect(x1_left - 3 * p1.scale, p1.sy - 8 * p1.scale, 1.5 * p1.scale, 8 * p1.scale);
          ctx.fillRect(x1_right + 1.5 * p1.scale, p1.sy - 8 * p1.scale, 1.5 * p1.scale, 8 * p1.scale);
        }
      }

      // City-specific: Draw perpendicular side road junctions branching out
      if (zone === "city" && i % 12 === 0) {
        ctx.fillStyle = "#27272a";
        ctx.beginPath();
        ctx.moveTo(x1_left, p1.sy);
        ctx.lineTo(x1_left - 200 * p1.scale, p1.sy - 30 * p1.scale);
        ctx.lineTo(x2_left - 200 * p2.scale, p2.sy + 30 * p2.scale);
        ctx.lineTo(x2_left, p2.sy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x1_right, p1.sy);
        ctx.lineTo(x1_right + 200 * p1.scale, p1.sy - 30 * p1.scale);
        ctx.lineTo(x2_right + 200 * p2.scale, p2.sy + 30 * p2.scale);
        ctx.lineTo(x2_right, p2.sy);
        ctx.closePath();
        ctx.fill();
      }

      // City-specific: Draw crosswalks on the road floor
      if (zone === "city" && i % 20 === 0) {
        ctx.fillStyle = "#ffffff";
        const stripeW = w1 / 10;
        const stripeCount = 6;
        for (let s = 1; s <= stripeCount; s++) {
          const sx = x1_left + s * (w1 / (stripeCount + 1)) * p1.scale;
          ctx.fillRect(sx - stripeW * p1.scale / 2, p1.sy - 2, stripeW * p1.scale, 4);
        }
      }

      // Mountain-specific: Draw wooden rope fence barrier along the canyon drop-off side
      if (zone === "mountain") {
        let cliffSide: "left" | "right" = "left";
        if (seg1 && seg1.scenery) {
          const firstCliff = seg1.scenery.find(sc => sc.type === "cliff" || sc.type === "rock");
          if (firstCliff) {
            cliffSide = firstCliff.side;
          }
        }
        const dropOffSide = cliffSide === "left" ? "right" : "left";

        const x1_drop = dropOffSide === "left" ? x1_left - 3 * p1.scale : x1_right + 3 * p1.scale;
        const x2_drop = dropOffSide === "left" ? x2_left - 3 * p2.scale : x2_right + 3 * p2.scale;

        ctx.strokeStyle = "#854d0e"; // dark rope brown
        ctx.lineWidth = Math.max(1, 1 * p1.scale);
        ctx.beginPath();
        ctx.moveTo(x1_drop, p1.sy - 6 * p1.scale);
        ctx.lineTo(x2_drop, p2.sy - 6 * p2.scale);
        ctx.stroke();

        if (i % 2 === 0) {
          ctx.fillStyle = "#78350f"; // wood post
          ctx.fillRect(x1_drop - 1.5 * p1.scale, p1.sy - 8 * p1.scale, 3 * p1.scale, 8 * p1.scale);
        }
      }

      // Draw Bridge structural details and side railings
      if (zone === "bridge") {
        // Draw concrete curb extensions
        ctx.fillStyle = "#71717a";
        ctx.beginPath();
        ctx.moveTo(x1_left, p1.sy);
        ctx.lineTo(x1_left - 8 * p1.scale, p1.sy);
        ctx.lineTo(x2_left - 8 * p2.scale, p2.sy);
        ctx.lineTo(x2_left, p2.sy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x1_right, p1.sy);
        ctx.lineTo(x1_right + 8 * p1.scale, p1.sy);
        ctx.lineTo(x2_right + 8 * p2.scale, p2.sy);
        ctx.lineTo(x2_right, p2.sy);
        ctx.closePath();
        ctx.fill();

        // Draw vertical railing posts
        ctx.strokeStyle = "#d4d4d8";
        ctx.lineWidth = Math.max(1, 2 * p1.scale);
        ctx.beginPath();
        ctx.moveTo(x1_left - 4 * p1.scale, p1.sy);
        ctx.lineTo(x1_left - 4 * p1.scale, p1.sy - 22 * p1.scale);
        ctx.moveTo(x1_right + 4 * p1.scale, p1.sy);
        ctx.lineTo(x1_right + 4 * p1.scale, p1.sy - 22 * p1.scale);
        ctx.stroke();

        // Draw horizontal safety rails
        ctx.beginPath();
        ctx.moveTo(x1_left - 4 * p1.scale, p1.sy - 20 * p1.scale);
        ctx.lineTo(x2_left - 4 * p2.scale, p2.sy - 20 * p2.scale);
        ctx.moveTo(x1_left - 4 * p1.scale, p1.sy - 10 * p1.scale);
        ctx.lineTo(x2_left - 4 * p2.scale, p2.sy - 10 * p2.scale);

        ctx.moveTo(x1_right + 4 * p1.scale, p1.sy - 20 * p1.scale);
        ctx.lineTo(x2_right + 4 * p2.scale, p2.sy - 20 * p2.scale);
        ctx.moveTo(x1_right + 4 * p1.scale, p1.sy - 10 * p1.scale);
        ctx.lineTo(x2_right + 4 * p2.scale, p2.sy - 10 * p2.scale);
        ctx.stroke();

        // Draw massive bridge pillars underneath at periodic Y marks
        if (i % 3 === 0) {
          ctx.fillStyle = "#3f3f46";
          ctx.fillRect(x1_left - 30 * p1.scale, p1.sy, 22 * p1.scale, H - p1.sy);
          ctx.fillRect(x1_right + 8 * p1.scale, p1.sy, 22 * p1.scale, H - p1.sy);
        }

        // Draw massive concrete pylons and suspension cables across the deck
        if (i % 8 === 0 && y1 % 60 === 0) {
          const towerH = 120 * p1.scale;
          const deckY = p1.sy;
          const towerW = 6 * p1.scale;
          const leftPylonX = x1_left - 15 * p1.scale;
          const rightPylonX = x1_right + 15 * p1.scale;

          ctx.fillStyle = "#52525b";
          ctx.strokeStyle = "#27272a";
          ctx.lineWidth = 1;

          // Left Tower
          ctx.beginPath();
          ctx.rect(leftPylonX - towerW/2, deckY - towerH, towerW, towerH);
          ctx.fill(); ctx.stroke();

          // Right Tower
          ctx.beginPath();
          ctx.rect(rightPylonX - towerW/2, deckY - towerH, towerW, towerH);
          ctx.fill(); ctx.stroke();

          // Cross Beams
          ctx.strokeStyle = "#52525b";
          ctx.lineWidth = 4 * p1.scale;
          ctx.beginPath();
          ctx.moveTo(leftPylonX, deckY - towerH + 20 * p1.scale);
          ctx.lineTo(rightPylonX, deckY - towerH + 20 * p1.scale);
          ctx.moveTo(leftPylonX, deckY - towerH * 0.6);
          ctx.lineTo(rightPylonX, deckY - towerH * 0.6);
          ctx.stroke();

          // Cables
          ctx.strokeStyle = "#71717a";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(leftPylonX, deckY - towerH);
          ctx.quadraticCurveTo((leftPylonX + x2_left) / 2, deckY - 10 * p1.scale, x2_left - 10 * p2.scale, p2.sy);
          ctx.moveTo(rightPylonX, deckY - towerH);
          ctx.quadraticCurveTo((rightPylonX + x2_right) / 2, deckY - 10 * p1.scale, x2_right + 10 * p2.scale, p2.sy);
          ctx.stroke();
        }
      }

      // Draw Tunnel structural walls and fluorescent light arches
      if (zone === "tunnel") {
        const wallHeight1 = 125 * p1.scale;
        const wallHeight2 = 125 * p2.scale;

        // Concrete side walls
        ctx.fillStyle = "#27272a";
        ctx.beginPath();
        ctx.moveTo(x1_left, p1.sy);
        ctx.lineTo(x1_left - 30 * p1.scale, p1.sy - wallHeight1);
        ctx.lineTo(x2_left - 30 * p2.scale, p2.sy - wallHeight2);
        ctx.lineTo(x2_left, p2.sy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x1_right, p1.sy);
        ctx.lineTo(x1_right + 30 * p1.scale, p1.sy - wallHeight1);
        ctx.lineTo(x2_right + 30 * p2.scale, p2.sy - wallHeight2);
        ctx.lineTo(x2_right, p2.sy);
        ctx.closePath();
        ctx.fill();

        // Curved ceiling top arch
        ctx.fillStyle = "#18181b";
        ctx.beginPath();
        ctx.moveTo(x1_left - 30 * p1.scale, p1.sy - wallHeight1);
        ctx.lineTo(x1_right + 30 * p1.scale, p1.sy - wallHeight1);
        ctx.lineTo(x2_right + 30 * p2.scale, p2.sy - wallHeight2);
        ctx.lineTo(x2_left - 30 * p2.scale, p2.sy - wallHeight2);
        ctx.closePath();
        ctx.fill();

        // Fluorescent ceiling lights arch patterns
        if (Math.floor(y1 / 65) % 2 === 0) {
          ctx.fillStyle = "#fef08a"; // warm glow
          const lightW1 = 10 * p1.scale;
          const lightW2 = 10 * p2.scale;
          const ceilingCx1 = (x1_left + x1_right) / 2;
          const ceilingCx2 = (x2_left + x2_right) / 2;
          const ceilingCy1 = p1.sy - wallHeight1;
          const ceilingCy2 = p2.sy - wallHeight2;

          ctx.beginPath();
          ctx.moveTo(ceilingCx1 - lightW1, ceilingCy1);
          ctx.lineTo(ceilingCx1 + lightW1, ceilingCy1);
          ctx.lineTo(ceilingCx2 + lightW2, ceilingCy2);
          ctx.lineTo(ceilingCx2 - lightW2, ceilingCy2);
          ctx.closePath();
          ctx.fill();
        }

        // Draw animated ventilation fans hanging from the ceiling
        if (i % 5 === 0 && y1 % 45 === 0) {
          const ceilingCx = (x1_left + x1_right) / 2;
          const ceilingCy = p1.sy - wallHeight1;
          const fanSize = 10 * p1.scale;

          ctx.fillStyle = "#3f3f46";
          ctx.fillRect(ceilingCx - 1.5 * p1.scale, ceilingCy, 3 * p1.scale, 8 * p1.scale);

          ctx.fillStyle = "#18181b";
          ctx.beginPath();
          ctx.arc(ceilingCx, ceilingCy + 8 * p1.scale, fanSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#52525b";
          ctx.lineWidth = 2 * p1.scale;
          const angle = (performance.now() * 0.01) % (Math.PI * 2);
          ctx.beginPath();
          ctx.moveTo(ceilingCx, ceilingCy + 8 * p1.scale);
          ctx.lineTo(ceilingCx + Math.cos(angle) * fanSize, ceilingCy + 8 * p1.scale + Math.sin(angle) * fanSize);
          ctx.moveTo(ceilingCx, ceilingCy + 8 * p1.scale);
          ctx.lineTo(ceilingCx + Math.cos(angle + Math.PI) * fanSize, ceilingCy + 8 * p1.scale + Math.sin(angle + Math.PI) * fanSize);
          ctx.stroke();
        }

        // Draw hazard reflectors on the side walls for low visibility speed feel
        if (i % 2 === 0) {
          ctx.fillStyle = "#f97316";
          ctx.fillRect(x1_left - 15 * p1.scale, p1.sy - wallHeight1 * 0.3, 2.5 * p1.scale, 5 * p1.scale);
          ctx.fillRect(x1_right + 12.5 * p1.scale, p1.sy - wallHeight1 * 0.3, 2.5 * p1.scale, 5 * p1.scale);
        }
      }

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

    // Collect Traffic Vehicles
    const trafficVehicles = gm.trafficManager.getActiveVehicles();
    for (const v of trafficVehicles) {
      const z = carY - v.y + 45;
      if (z > 0 && z < 1200) {
        tasks.push({
          z,
          draw: (ctx) => {
            const cx = track.getCenterXAt(v.y);
            const w = track.getWidthAt(v.y);
            const laneWidth = w / numLanes;
            const vx = cx + (v.lane - (numLanes - 1) / 2) * laneWidth;
            const p = project(vx, v.y);
            if (p.sy < -80 || p.sy > H + 80) return;

            const rotAngle = (v.y * 0.08) % (Math.PI * 2);
            const drawWheel = (wx: number, wy: number) => {
              ctx.fillStyle = "#18181b"; // Dark black wheel
              ctx.fillRect(wx - 2, wy - 5, 4, 10);
              // Draw spoke line
              ctx.strokeStyle = "#71717a";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(wx, wy);
              ctx.lineTo(wx + Math.cos(rotAngle) * 2, wy + Math.sin(rotAngle) * 5);
              ctx.stroke();
            };

            ctx.save();
            ctx.translate(p.sx, p.sy);
            ctx.scale(p.scale, p.scale);

            // Draw shadow under the vehicle
            ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
            ctx.beginPath();
            ctx.ellipse(0, v.length / 2 - 2, v.width / 2 + 3, v.length / 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Taillights/Brake lights color selection
            const brakeGlow = v.crashed || v.speed < v.baseSpeed;
            const taillightColor = brakeGlow ? "#f43f5e" : "#be123c";

            if (v.type === "truck") {
              // Wheels
              drawWheel(-v.width / 2 - 1, -v.length / 2 + 8);
              drawWheel(v.width / 2 + 1, -v.length / 2 + 8);
              drawWheel(-v.width / 2 - 1, v.length / 2 - 14);
              drawWheel(v.width / 2 + 1, v.length / 2 - 14);
              drawWheel(-v.width / 2 - 1, v.length / 2 - 5);
              drawWheel(v.width / 2 + 1, v.length / 2 - 5);

              // Cab
              ctx.fillStyle = "#3f3f46";
              ctx.strokeStyle = "#09090b";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(-v.width / 2, -v.length / 2, v.width, 18, 2);
              ctx.fill();
              ctx.stroke();

              // Cab Windshield
              ctx.fillStyle = "rgba(186, 230, 253, 0.85)";
              ctx.fillRect(-v.width / 2 + 3, -v.length / 2 + 3, v.width - 6, 4);

              // Cargo Trailer
              ctx.fillStyle = v.color;
              ctx.beginPath();
              ctx.roundRect(-v.width / 2 - 1, -v.length / 2 + 18, v.width + 2, v.length - 18, 3);
              ctx.fill();
              ctx.stroke();

              // Red brake lights
              ctx.fillStyle = taillightColor;
              ctx.fillRect(-v.width / 2, v.length / 2 - 3, 5, 2.5);
              ctx.fillRect(v.width / 2 - 5, v.length / 2 - 3, 5, 2.5);
              
              if (brakeGlow) {
                ctx.fillStyle = "rgba(244, 63, 94, 0.3)";
                ctx.beginPath();
                ctx.arc(-v.width / 2 + 2.5, v.length / 2 - 2, 5, 0, Math.PI * 2);
                ctx.arc(v.width / 2 - 2.5, v.length / 2 - 2, 5, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (v.type === "motorcycle") {
              // Wheels
              drawWheel(0, -v.length / 2 + 2);
              drawWheel(0, v.length / 2 - 2);

              // Chassis
              ctx.fillStyle = v.color;
              ctx.strokeStyle = "#09090b";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(-2, -v.length / 2, 4, v.length, 1);
              ctx.fill();
              ctx.stroke();

              // Rider
              ctx.fillStyle = "#1e293b";
              ctx.beginPath();
              ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = "#f59e0b"; // Helmet
              ctx.beginPath();
              ctx.arc(0, -3.5, 3, 0, Math.PI * 2);
              ctx.fill();

              // Brake light
              ctx.fillStyle = taillightColor;
              ctx.fillRect(-1.5, v.length / 2 - 1, 3, 2);
              
              if (brakeGlow) {
                ctx.fillStyle = "rgba(244, 63, 94, 0.3)";
                ctx.beginPath();
                ctx.arc(0, v.length / 2, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              // Sedan
              drawWheel(-v.width / 2 - 1, -10);
              drawWheel(v.width / 2 + 1, -10);
              drawWheel(-v.width / 2 - 1, 10);
              drawWheel(v.width / 2 + 1, 10);

              // Body
              ctx.fillStyle = v.color;
              ctx.strokeStyle = "#09090b";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(-v.width / 2, -v.length / 2, v.width, v.length, 4);
              ctx.fill();
              ctx.stroke();

              // Windshield (rear)
              ctx.fillStyle = "rgba(186, 230, 253, 0.85)";
              ctx.fillRect(-v.width / 2 + 3, 5, v.width - 6, 4);

              // Windshield (front)
              ctx.fillRect(-v.width / 2 + 3, -v.length / 2 + 6, v.width - 6, 5);

              // Roof panel (dark accent)
              ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
              ctx.fillRect(-v.width / 2 + 2, -v.length / 2 + 11, v.width - 4, 13);

              // Red brake lights
              ctx.fillStyle = taillightColor;
              ctx.fillRect(-v.width / 2 + 2, v.length / 2 - 3, 4, 2.5);
              ctx.fillRect(v.width / 2 - 6, v.length / 2 - 3, 4, 2.5);

              if (brakeGlow) {
                ctx.fillStyle = "rgba(244, 63, 94, 0.3)";
                ctx.beginPath();
                ctx.arc(-v.width / 2 + 4, v.length / 2 - 2, 5, 0, Math.PI * 2);
                ctx.arc(v.width / 2 - 4, v.length / 2 - 2, 5, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            ctx.restore();
          }
        });
      }
    }

    // Collect Scenery from visible segments only (Culling!)
    for (const seg of visibleSegments) {
      if (seg.scenery) {
        for (const sc of seg.scenery) {
          const worldY = seg.yStart - sc.offsetY;
          const z = carY - worldY + 45;
          if (z > 0 && z < 1200) {
            const cx = getCenterXAtVisible(worldY);
            const w = getWidthAtVisible(worldY);
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
                    // Pine/Conifer tree with nice shading trunk
                    ctx.fillStyle = "#164e63"; // dark blue-green
                    ctx.beginPath();
                    ctx.moveTo(0, -26);
                    ctx.lineTo(-9, -12);
                    ctx.lineTo(-6, -12);
                    ctx.lineTo(-13, 1);
                    ctx.lineTo(-8, 1);
                    ctx.lineTo(-18, 15);
                    ctx.lineTo(18, 15);
                    ctx.lineTo(8, 1);
                    ctx.lineTo(13, 1);
                    ctx.lineTo(6, -12);
                    ctx.lineTo(9, -12);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = "#451a03"; // trunk
                    ctx.fillRect(-2.5, 15, 5, 7);
                  } else {
                    // Deciduous tree
                    ctx.fillStyle = "#15803d"; // bright green
                    ctx.beginPath();
                    ctx.arc(0, -8, 12, 0, Math.PI * 2);
                    ctx.arc(-6, -4, 9, 0, Math.PI * 2);
                    ctx.arc(6, -4, 9, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#78350f";
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

                  // Render light cone in City or Tunnel zones
                  if (seg.zone === "city" || seg.zone === "tunnel") {
                    ctx.fillStyle = "rgba(254, 240, 138, 0.07)";
                    ctx.beginPath();
                    ctx.moveTo(armOffset, -26);
                    ctx.lineTo(armOffset - 18, 16);
                    ctx.lineTo(armOffset + 18, 16);
                    ctx.closePath();
                    ctx.fill();
                  }
                } else if (sc.type === "billboard") {
                  ctx.fillStyle = "#374151"; // legs
                  ctx.fillRect(-10, 0, 2.5, 16);
                  ctx.fillRect(8, 0, 2.5, 16);

                  ctx.fillStyle = "#0f172a";
                  ctx.strokeStyle = "#4f46e5"; // glowing border
                  ctx.lineWidth = 1.5;
                  ctx.fillRect(-22, -14, 44, 15);
                  ctx.strokeRect(-22, -14, 44, 15);

                  if (sc.text) {
                    ctx.fillStyle = "#f8fafc";
                    ctx.font = "bold 4.5px monospace";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(sc.text, 0, -6.5);
                  }
                } else if (sc.type === "roadsign") {
                  if (seg.zone === "highway") {
                    // Overhead Highway Gantry spanning across the road
                    const spanDirection = sc.side === "left" ? 1 : -1;
                    const spanWidth = (w + 56) * p.scale; // Width of gantry span in screen units

                    ctx.strokeStyle = "#4b5563";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(0, 16);
                    ctx.lineTo(0, -32);
                    ctx.moveTo(spanDirection * spanWidth, 16);
                    ctx.lineTo(spanDirection * spanWidth, -32);
                    ctx.moveTo(0, -30);
                    ctx.lineTo(spanDirection * spanWidth, -30);
                    ctx.moveTo(0, -25);
                    ctx.lineTo(spanDirection * spanWidth, -25);
                    ctx.stroke();

                    // Green highway board
                    ctx.fillStyle = "#15803d";
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.0;
                    const signW = 32;
                    const signH = 14;
                    const signX = (spanDirection * spanWidth) / 2 - signW / 2;
                    const signY = -34;
                    ctx.fillRect(signX, signY, signW, signH);
                    ctx.strokeRect(signX, signY, signW, signH);

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 3.5px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("HWY ARES-OS", signX + signW / 2, signY + 4);
                    ctx.font = "3.2px sans-serif";
                    ctx.fillText("KEEP SPEED 120+", signX + signW / 2, signY + 9);
                  } else if (seg.zone === "mountain") {
                    let cliffSide: "left" | "right" = "left";
                    if (seg.scenery) {
                      const firstCliff = seg.scenery.find(scObj => scObj.type === "cliff" || scObj.type === "rock");
                      if (firstCliff) {
                        cliffSide = firstCliff.side;
                      }
                    }
                    if (sc.side !== cliffSide) {
                      // Draw red/white chevron curve indicator or wooden post
                      if (Math.floor(worldY / 120) % 2 === 0) {
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(-5, -6, 10, 8);
                        ctx.strokeStyle = "#ef4444";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(-5, -6, 10, 8);

                        ctx.fillStyle = "#ef4444";
                        ctx.beginPath();
                        const isLeft = seg.type.includes("left");
                        if (isLeft) {
                          ctx.moveTo(2, -5); ctx.lineTo(-2, -2); ctx.lineTo(2, 1);
                          ctx.lineTo(4, 1); ctx.lineTo(0, -2); ctx.lineTo(4, -5);
                        } else {
                          ctx.moveTo(-2, -5); ctx.lineTo(2, -2); ctx.lineTo(-2, 1);
                          ctx.lineTo(-4, 1); ctx.lineTo(0, -2); ctx.lineTo(-4, -5);
                        }
                        ctx.closePath();
                        ctx.fill();

                        ctx.fillStyle = "#71717a";
                        ctx.fillRect(-1, 2, 2, 14);
                      } else {
                        ctx.fillStyle = "#78350f"; // wood fence post
                        ctx.fillRect(-2, 0, 4, 16);
                        ctx.fillStyle = "#a16207";
                        ctx.fillRect(-2, 0, 4, 2);
                      }
                    } else {
                      ctx.fillStyle = "#71717a";
                      ctx.fillRect(-1, -2, 2, 18);
                      ctx.fillStyle = "#f59e0b"; // warning diamond
                      ctx.beginPath();
                      ctx.moveTo(0, -8);
                      ctx.lineTo(5, -3);
                      ctx.lineTo(0, 2);
                      ctx.lineTo(-5, -3);
                      ctx.closePath();
                      ctx.fill();
                      ctx.fillStyle = "#000000";
                      ctx.font = "bold 4px sans-serif";
                      ctx.textAlign = "center";
                      ctx.fillText("⚠", 0, -2.5);
                    }
                  } else if (seg.zone === "city") {
                    ctx.fillStyle = "#71717a";
                    ctx.fillRect(-1, 0, 2, 16);

                    if (Math.floor(worldY / 150) % 2 === 0) {
                      ctx.fillStyle = "#b91c1c"; // Stop hex sign
                      ctx.beginPath();
                      ctx.moveTo(-4, -8);
                      ctx.lineTo(4, -8);
                      ctx.lineTo(6, -5);
                      ctx.lineTo(6, -2);
                      ctx.lineTo(4, 1);
                      ctx.lineTo(-4, 1);
                      ctx.lineTo(-6, -2);
                      ctx.lineTo(-6, -5);
                      ctx.closePath();
                      ctx.fill();

                      ctx.fillStyle = "#ffffff";
                      ctx.font = "bold 3.5px sans-serif";
                      ctx.textAlign = "center";
                      ctx.textBaseline = "middle";
                      ctx.fillText("STOP", 0, -3.5);
                    } else {
                      ctx.fillStyle = "#047857"; // green street name sign
                      ctx.fillRect(-10, -7, 20, 5);
                      ctx.strokeStyle = "#ffffff";
                      ctx.strokeRect(-10, -7, 20, 5);

                      ctx.fillStyle = "#ffffff";
                      ctx.font = "bold 2.5px monospace";
                      ctx.textAlign = "center";
                      ctx.textBaseline = "middle";
                      ctx.fillText(sc.side === "left" ? "BROADWAY" : "WALL ST", 0, -4.5);
                    }
                  } else {
                    ctx.fillStyle = "#71717a";
                    ctx.fillRect(-1.5, -4, 3, 20);

                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#be123c";
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(0, -8, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = "#000000";
                    ctx.font = "bold 5px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("120", 0, -8);
                  }
                } else if (sc.type === "gasstation") {
                  ctx.fillStyle = "#1d4ed8";
                  ctx.fillRect(-15, -14, 30, 4);
                  ctx.fillStyle = "#71717a";
                  ctx.fillRect(-13, -10, 2, 22);
                  ctx.fillRect(11, -10, 2, 22);
                  ctx.fillStyle = "#d4d4d8";
                  ctx.fillRect(-3, 0, 6, 12);
                  ctx.fillStyle = "#3b82f6";
                  ctx.fillRect(-2, 2, 4, 3);
                } else if (sc.type === "building") {
                  const idHash = sc.id.split("-").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const bType = idHash % 3;

                  ctx.save();
                  ctx.strokeStyle = "#09090b";
                  ctx.lineWidth = 1.5;

                  if (bType === 0) {
                    // Tech Skyscraper with neon pink edge trims
                    const bW = 24;
                    const bH = 80;
                    ctx.fillStyle = "#0f172a";
                    ctx.fillRect(-bW / 2, -bH, bW, bH);
                    ctx.strokeRect(-bW / 2, -bH, bW, bH);

                    ctx.strokeStyle = "#ec4899";
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    ctx.moveTo(-bW / 2, -bH);
                    ctx.lineTo(-bW / 2, 0);
                    ctx.moveTo(bW / 2, -bH);
                    ctx.lineTo(bW / 2, 0);
                    ctx.stroke();

                    ctx.fillStyle = "#fef08a";
                    for (let wy = -bH + 8; wy < -5; wy += 8) {
                      for (let wx = -bW / 2 + 3; wx < bW / 2 - 2; wx += 4) {
                        if ((wx + wy) % 5 > 1) {
                          ctx.fillRect(wx, wy, 1.5, 3);
                        }
                      }
                    }
                  } else if (bType === 1) {
                    // Corporate tower with top spire beacon
                    const bW = 28;
                    const bH = 70;
                    ctx.fillStyle = "#1e293b";
                    ctx.fillRect(-bW / 2, -bH, bW, bH);
                    ctx.strokeRect(-bW / 2, -bH, bW, bH);

                    ctx.strokeStyle = "#38bdf8";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, -bH);
                    ctx.lineTo(0, -bH - 12);
                    ctx.stroke();
                    ctx.fillStyle = "#ef4444"; // red blinking light
                    ctx.beginPath();
                    ctx.arc(0, -bH - 12, 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = "#38bdf8"; // blue windows
                    for (let wy = -bH + 6; wy < -5; wy += 6) {
                      for (let wx = -bW / 2 + 4; wx < bW / 2 - 3; wx += 5) {
                        if ((wx + wy) % 7 > 2) {
                          ctx.fillRect(wx, wy, 2.5, 2.5);
                        }
                      }
                    }
                  } else {
                    // Standard brick style apartment
                    const bW = 32;
                    const bH = 60;
                    ctx.fillStyle = "#1f2937";
                    ctx.fillRect(-bW / 2, -bH, bW, bH);
                    ctx.strokeRect(-bW / 2, -bH, bW, bH);

                    ctx.fillStyle = "#eab308";
                    for (let wy = -bH + 8; wy < -5; wy += 8) {
                      for (let wx = -bW / 2 + 4; wx < bW / 2 - 3; wx += 6) {
                        if ((wx + wy) % 4 > 1) {
                          ctx.fillRect(wx, wy, 3, 4);
                        }
                      }
                    }
                  }
                  ctx.restore();
                } else if (sc.type === "rock") {
                  ctx.fillStyle = "#57534e";
                  ctx.strokeStyle = "#292524";
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(-10, 12);
                  ctx.lineTo(-11, 2);
                  ctx.lineTo(-5, -6);
                  ctx.lineTo(6, -8);
                  ctx.lineTo(10, 2);
                  ctx.lineTo(9, 12);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
                } else if (sc.type === "cliff") {
                  ctx.fillStyle = "#44403c";
                  ctx.strokeStyle = "#1c1917";
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  if (sc.side === "left") {
                    ctx.moveTo(-18, 12);
                    ctx.lineTo(-24, -30);
                    ctx.lineTo(-4, -28);
                    ctx.lineTo(3, 12);
                  } else {
                    ctx.moveTo(18, 12);
                    ctx.lineTo(24, -30);
                    ctx.lineTo(4, -28);
                    ctx.lineTo(-3, 12);
                  }
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
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
      const z = carY - gate.y + 45 - 5;
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

            // Draw option boxes inside the lanes if within 500px preview threshold
            const distToGate = carY - gate.y;
            if (gate.question && distToGate < 500) {
              const q = gate.question;
              const numOptions = q.options.length;
              
              const hasLargeText = gm.saveManager.getData().settings.largeTextMode;
              const baseBoxW = hasLargeText ? 70 : 50;
              const baseBoxH = hasLargeText ? 36 : 28;
              const baseFontSize = hasLargeText ? 16 : 13;
              
              // Option Reveal Animation: 300ms transition over 60px of travel below 500px
              const revealFactor = Math.min(1.0, (500 - distToGate) / 60);
              const boxOpacity = revealFactor;
              const boxScaleMultiplier = 0.7 + 0.3 * revealFactor;
              const boxYOffset = -15 * (1 - revealFactor);

              // Proximity Approach Sizing: grow up to 35% under 400px
              const approachScale = distToGate < 400 ? 1.0 + ((400 - distToGate) / 400) * 0.35 : 1.0;
              const totalScale = boxScaleMultiplier * approachScale;

              for (let laneIdx = 0; laneIdx < numOptions; laneIdx++) {
                const lX = cx + (laneIdx - (numLanes - 1) / 2) * laneWidth;
                const pBox = project(lX, gate.y);

                const boxW = Math.max(40, baseBoxW * pBox.scale * totalScale);
                const boxH = Math.max(22, baseBoxH * pBox.scale * totalScale);
                const fontSize = Math.max(10, baseFontSize * pBox.scale * totalScale);

                const bx = pBox.sx - boxW / 2;
                const by = pBox.sy - boxH / 2 + boxYOffset * pBox.scale;

                ctx.save();
                ctx.globalAlpha = boxOpacity;

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
                ctx.fillText(textToDraw, pBox.sx, pBox.sy + boxYOffset * pBox.scale);

                ctx.restore();
              }
            }
          }
        });
      }
    }

    // Add Player Car Task (fixed at Z = 45 relative to camera)
    if (!cameraManager || cameraManager.mode !== CameraMode.CockpitCamera) {
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
    }

    // Collect Headlight projections
    if (gm.activeZone === "tunnel") {
      tasks.push({
        z: 44.5,
        draw: (ctx) => {
          const pLeft = project(gm.laneManager.carX - 8, carY - 18);
          const pRight = project(gm.laneManager.carX + 8, carY - 18);
          
          const targetY = carY - 450;
          const cxAhead = getCenterXAtVisible(targetY);
          const wAhead = getWidthAtVisible(targetY);
          
          const pTargetLeft = project(cxAhead - wAhead * 0.35, targetY);
          const pTargetRight = project(cxAhead + wAhead * 0.35, targetY);

          ctx.save();
          ctx.globalCompositeOperation = "screen";

          // Left Headlight Cone
          const gradL = ctx.createLinearGradient(pLeft.sx, pLeft.sy, pTargetLeft.sx, pTargetLeft.sy);
          gradL.addColorStop(0, "rgba(254, 240, 138, 0.4)");
          gradL.addColorStop(1, "rgba(254, 240, 138, 0.0)");
          ctx.fillStyle = gradL;
          ctx.beginPath();
          ctx.moveTo(pLeft.sx, pLeft.sy);
          ctx.lineTo(pTargetLeft.sx - 35, pTargetLeft.sy);
          ctx.lineTo(pTargetLeft.sx + 35, pTargetLeft.sy);
          ctx.closePath();
          ctx.fill();

          // Right Headlight Cone
          const gradR = ctx.createLinearGradient(pRight.sx, pRight.sy, pTargetRight.sx, pTargetRight.sy);
          gradR.addColorStop(0, "rgba(254, 240, 138, 0.4)");
          gradR.addColorStop(1, "rgba(254, 240, 138, 0.0)");
          ctx.fillStyle = gradR;
          ctx.beginPath();
          ctx.moveTo(pRight.sx, pRight.sy);
          ctx.lineTo(pTargetRight.sx - 35, pTargetRight.sy);
          ctx.lineTo(pTargetRight.sx + 35, pTargetRight.sy);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
      });
    }

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

    // 9.5 High Speed Wind Lines / Speed Lines
    if (speedRatio > 1.45) {
      ctx.save();
      const alphaPulse = Math.min(0.35, (speedRatio - 1.45) * 0.5) * (0.8 + Math.random() * 0.2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alphaPulse})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + (performance.now() * 0.0002);
        const startRadius = H * 0.2;
        const endRadius = H * 0.8;
        const sx = W / 2 + Math.cos(angle) * startRadius;
        const sy = H * 0.4 + Math.sin(angle) * startRadius;
        const ex = W / 2 + Math.cos(angle) * endRadius;
        const ey = H * 0.4 + Math.sin(angle) * endRadius;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9.6 Low Lives Red Pulsing border overlay
    if (gm.lives <= 1) {
      ctx.save();
      const redPulse = Math.abs(Math.sin(performance.now() * 0.005));
      ctx.strokeStyle = `rgba(239, 68, 68, ${redPulse * 0.35})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, W, H);
      
      const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.8);
      grad.addColorStop(0, "rgba(239, 68, 68, 0)");
      grad.addColorStop(1, `rgba(239, 68, 68, ${redPulse * 0.18})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // 9.7 Cockpit Dashboard & Windshield Frame HUD overlay
    if (cameraManager && cameraManager.mode === CameraMode.CockpitCamera) {
      ctx.save();
      
      // A-pillars (left & right Windshield frames)
      ctx.fillStyle = "#18181b"; // Zinc 900
      ctx.strokeStyle = "#09090b";
      ctx.lineWidth = 2;

      // Left Pillar
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(W * 0.08, H);
      ctx.lineTo(W * 0.20, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Pillar
      ctx.beginPath();
      ctx.moveTo(W, H);
      ctx.lineTo(W * 0.92, H);
      ctx.lineTo(W * 0.80, 0);
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top Windshield Frame Border
      ctx.fillRect(0, 0, W, 25);
      ctx.strokeRect(0, 0, W, 25);

      // Bottom Dashboard Panel
      ctx.fillStyle = "#1c1917"; // Stone 900
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H - 75);
      ctx.lineTo(W * 0.22, H - 75);
      // Gauge Cluster Hood arch in the center
      ctx.arc(W / 2, H - 75, 60, Math.PI, 0);
      ctx.lineTo(W * 0.78, H - 75);
      ctx.lineTo(W, H - 75);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Steering Wheel
      ctx.save();
      ctx.translate(W / 2, H - 40);
      const steerRotation = gm.laneManager.steerAngle * 1.8;
      ctx.rotate(steerRotation);
      ctx.strokeStyle = "#0c0a09"; // Dark stone
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.stroke();
      
      // Steering struts
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(42, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 42);
      ctx.stroke();
      ctx.restore();

      // Dashboard gauges
      // Speedometer Gauge Cluster (digital speed text under gauge hood)
      ctx.fillStyle = "#38bdf8"; // Light Blue
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(gm.speed)} km/h`, W / 2, H - 32);

      // Gear indicator
      const activeGear = Math.max(1, Math.min(6, 1 + Math.floor(gm.combo / 4)));
      ctx.fillStyle = gm.combo > 0 ? "#10b981" : "#78716c";
      ctx.font = "bold 8px monospace";
      ctx.fillText(`GEAR ${activeGear}`, W / 2, H - 18);

      // Low Lives indicator flashing warning light
      if (gm.lives <= 1 && Math.floor(performance.now() * 0.005) % 2 === 0) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(W / 2 - 32, H - 35, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
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
      const miniW = 32;
      const miniH = 160;
      const miniX = W - miniW - 30;
      const miniY = H * 0.32;

      // Draw Active Zone text box above minimap
      ctx.save();
      ctx.fillStyle = "rgba(9, 9, 11, 0.85)";
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(miniX - 25, miniY - 28, miniW + 50, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(gm.activeZone.toUpperCase(), miniX + miniW / 2, miniY - 19);

      // Draw Minimap box container
      ctx.fillStyle = "rgba(9, 9, 11, 0.75)";
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(miniX - 8, miniY - 6, miniW + 16, miniH + 12, 6);
      ctx.fill();
      ctx.stroke();

      // Render color-coded zone track paths on minimap (far-to-near)
      ctx.lineWidth = 3.5;
      let lastZoneLabelDrawn = "";

      for (let j = 0; j < 10; j++) {
        const y1 = carY - j * 240;
        const y2 = carY - (j + 1) * 240;

        const cx1 = track.getCenterXAt(y1);
        const cx2 = track.getCenterXAt(y2);

        // Curvature exaggeration: scale center offset by 1.6
        const ex1 = 400 + (cx1 - 400) * 1.6;
        const ex2 = 400 + (cx2 - 400) * 1.6;
        
        const mx1 = miniX + ((ex1 - 180) / 440) * miniW;
        const my1 = miniY + miniH - (j / 10) * miniH;
        const mx2 = miniX + ((ex2 - 180) / 440) * miniW;
        const my2 = miniY + miniH - ((j + 1) / 10) * miniH;

        const seg = track.getSegmentAtY(y2);
        let zoneColor = "#10b981"; // highway green
        let zoneName = "HWY";
        if (seg) {
          if (seg.zone === "city") {
            zoneColor = "#a1a1aa";
            zoneName = "CITY";
          } else if (seg.zone === "mountain") {
            zoneColor = "#f97316";
            zoneName = "MTN";
          } else if (seg.zone === "bridge") {
            zoneColor = "#06b6d4";
            zoneName = "BRG";
          } else if (seg.zone === "tunnel") {
            zoneColor = "#d97706"; // amber
            zoneName = "TNL";
          }
        }

        ctx.strokeStyle = zoneColor;
        ctx.beginPath();
        ctx.moveTo(mx1, my1);
        ctx.lineTo(mx2, my2);
        ctx.stroke();

        // Tunnel brackets on minimap path
        if (seg && seg.zone === "tunnel") {
          ctx.strokeStyle = "rgba(217, 119, 6, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx1 - 4, my1); ctx.lineTo(mx2 - 4, my2);
          ctx.moveTo(mx1 + 4, my1); ctx.lineTo(mx2 + 4, my2);
          ctx.stroke();
          ctx.lineWidth = 3.5; // restore
        }

        // Bridge brackets on minimap path
        if (seg && seg.zone === "bridge") {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx1 - 4.5, my1); ctx.lineTo(mx2 - 4.5, my2);
          ctx.moveTo(mx1 + 4.5, my1); ctx.lineTo(mx2 + 4.5, my2);
          ctx.stroke();
          ctx.lineWidth = 3.5; // restore
        }

        // Inline Upcoming Zone Changes Labels
        if (seg && zoneName !== lastZoneLabelDrawn && j > 0) {
          lastZoneLabelDrawn = zoneName;
          ctx.fillStyle = zoneColor;
          ctx.font = "bold 6.5px monospace";
          ctx.textAlign = "right";
          ctx.fillText(zoneName, miniX - 12, (my1 + my2) / 2);
          // Small pointer line
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(miniX - 9, (my1 + my2) / 2);
          ctx.lineTo(miniX - 2, (my1 + my2) / 2);
          ctx.stroke();
        }
      }

      // Draw upcoming gates ticks on minimap
      for (const gate of gm.gateManager.getGates()) {
        if (gate.y < carY && gate.y > carY - 2400) {
          const progress = (carY - gate.y) / 2400;
          const gMy = miniY + miniH - progress * miniH;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(miniX, gMy);
          ctx.lineTo(miniX + miniW, gMy);
          ctx.stroke();
        }
      }

      // Draw active traffic density markers on minimap path
      const activeTraffic = gm.trafficManager.getActiveVehicles();
      for (const v of activeTraffic) {
        if (v.y < carY && v.y > carY - 2400 && !v.crashed) {
          const progress = (carY - v.y) / 2400;
          const tMy = miniY + miniH - progress * miniH;
          const cx = track.getCenterXAt(v.y);
          const ex = 400 + (cx - 400) * 1.6;
          const laneWidth = miniW / 3;
          const laneOffset = (v.lane - 1) * laneWidth * 0.7;
          const tMx = miniX + ((ex - 180) / 440) * miniW + laneOffset;

          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(tMx, tMy, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render player car dot
      const playerCx = track.getCenterXAt(carY);
      const playerEx = 400 + (playerCx - 400) * 1.6;
      const playerMx = miniX + ((playerEx - 180) / 440) * miniW;
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

      // Upcoming Turns warning alert
      let turnDetected = false;
      let isLeftTurn = false;
      const checkRange = 600;
      const testSeg = track.getSegmentAtY(carY - checkRange);
      if (testSeg && testSeg.type !== "straight") {
        turnDetected = true;
        isLeftTurn = testSeg.type.includes("left");
      }

      if (turnDetected && Math.floor(performance.now() / 250) % 2 === 0) {
        ctx.fillStyle = "#eab308";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(isLeftTurn ? "◀ CURVE" : "CURVE ▶", miniX + miniW / 2, miniY + miniH + 18);
      }

      ctx.restore();
    }

    // Render Cinematic Banner & Milestones overlay
    if (bannerRef.current) {
      const banner = bannerRef.current;
      const progress = banner.timer;
      let alpha = 1.0;
      if (progress > 1.7) {
        alpha = (2.0 - progress) / 0.3;
      } else if (progress < 0.3) {
        alpha = progress / 0.3;
      }
      alpha = Math.max(0, Math.min(1, alpha));

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.fillStyle = "rgba(9, 9, 11, 0.88)";
      ctx.strokeStyle = banner.isMilestone ? "rgba(234, 179, 8, 0.55)" : "rgba(99, 102, 241, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const barH = 45;
      ctx.roundRect(W * 0.15, H * 0.45 - barH / 2, W * 0.7, barH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = banner.isMilestone ? "#fbbf24" : "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.title, W / 2, H * 0.45 - 8);

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "bold 8px monospace";
      ctx.fillText(banner.subtitle, W / 2, H * 0.45 + 10);

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
      
      {/* Hidden YouTube Player */}
      {ytVideoId && !isMuted && (
        <iframe
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}`}
          className="absolute opacity-0 pointer-events-none w-1 h-1"
          allow="autoplay"
        />
      )}
      
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
                <label className="flex items-center justify-between cursor-pointer hover:bg-zinc-850 p-1.5 rounded-lg border border-transparent hover:border-zinc-800">
                  <span>Learning Mode</span>
                  <input
                    type="checkbox"
                    checked={learningMode}
                    onChange={toggleLearningMode}
                    className="accent-indigo-600 h-3.5 w-3.5 cursor-pointer"
                  />
                </label>
                {webglSupported && (
                  <label className="flex items-center justify-between cursor-pointer hover:bg-zinc-850 p-1.5 rounded-lg border border-transparent hover:border-zinc-800 text-indigo-400 font-semibold">
                    <span>WebGL Hardware Acceleration</span>
                    <input
                      type="checkbox"
                      checked={useWebGL}
                      onChange={(e) => setUseWebGL(e.target.checked)}
                      className="accent-indigo-600 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Custom BGM Input */}
            <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3 text-left">
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                Custom Soundtrack (YouTube URL)
              </span>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytBgmUrl}
                onChange={(e) => handleYtBgmChange(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-mono px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 w-full"
              />
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

            {/* Garage Button */}
            <button
              onClick={() => {
                if (synthRef.current) synthRef.current.playClick();
                setShowGarage(true);
              }}
              className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-purple-400 text-xs font-bold rounded-xl border border-zinc-700 transition cursor-pointer text-center font-mono tracking-wider flex items-center justify-center gap-2"
            >
              🏎️ OPEN GARAGE & SKIN SHOP
            </button>

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
          {webglSupported && useWebGL ? (
            <canvas ref={webglCanvasRef} className="w-full h-full block absolute top-0 left-0" />
          ) : (
            <canvas ref={canvasRef} className="w-full h-full block absolute top-0 left-0" />
          )}

          {/* Active Question Top HUD Card */}
          {gameMode === "Running" && getActiveGate() && (
            (() => {
              const gate = getActiveGate()!;
              const q = gate.question!;
              const diffVal = q.difficultyVal ?? 1;
              const difficultyLabel = diffVal <= 2 ? "Easy" : diffVal <= 4 ? "Medium" : "Hard";
              const difficultyColor = difficultyLabel === "Easy" ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/20" 
                                    : difficultyLabel === "Medium" ? "text-amber-400 border-amber-500/30 bg-amber-950/20" 
                                    : "text-rose-400 border-rose-500/30 bg-rose-950/20";
              const categoryLabel = q.category.charAt(0).toUpperCase() + q.category.slice(1);

              return (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-2.5 shadow-2xl backdrop-blur-md text-center z-30 transition-all duration-350 ${
                  largeTextMode ? "w-[300px]" : "w-[240px]"
                }`}>
                  {/* Badges: Category & Difficulty */}
                  <div className="flex gap-2 w-full justify-center">
                    <span className="px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/60 font-bold uppercase tracking-wider font-mono text-[7px] text-zinc-400">
                      {categoryLabel}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider font-mono text-[7px] ${difficultyColor}`}>
                      {difficultyLabel}
                    </span>
                  </div>

                  {/* Question text */}
                  <div className={`font-black text-white tracking-wide font-mono ${
                    largeTextMode ? "text-2xl" : "text-xl"
                  }`}>
                    {getActiveQuestionText()}
                  </div>

                  {/* Context footer */}
                  <div className="text-[6.5px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
                    Math Challenge
                  </div>
                </div>
              );
            })()
          )}

          {/* Wrong Answer Feedback Banner Overlay */}
          {gameMode === "Running" && gameManagerRef.current && gameManagerRef.current.feedbackBannerTimer > 0 && (
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-950/95 border border-red-500 rounded-3xl p-6 shadow-2xl backdrop-blur-md text-center z-40 animate-pulse w-[340px] flex flex-col gap-2 font-mono">
              <span className="text-red-400 font-extrabold text-lg uppercase tracking-wider">❌ INCORRECT!</span>
              <div className="text-white font-black text-xl">
                {gameManagerRef.current.feedbackBannerText}
              </div>
              <span className="text-zinc-400 text-[8px] uppercase tracking-widest mt-1">Reviewing Correct Answer...</span>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
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
              <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-zinc-800">
                <span>Learning Mode</span>
                <input
                  type="checkbox"
                  checked={learningMode}
                  onChange={toggleLearningMode}
                  className="accent-indigo-600 h-3 w-3"
                />
              </label>
              {webglSupported && (
                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-zinc-800 text-indigo-400 font-semibold">
                  <span>WebGL Hardware Acceleration</span>
                  <input
                    type="checkbox"
                    checked={useWebGL}
                    onChange={(e) => setUseWebGL(e.target.checked)}
                    className="accent-indigo-600 h-3 w-3 cursor-pointer"
                  />
                </label>
              )}
            </div>

            {/* Solved Question History list */}
            {gameManagerRef.current && gameManagerRef.current.questionHistory.length > 0 && (
              <div className="flex flex-col gap-2 border-b border-zinc-800 pb-3 text-left font-mono text-[8px]">
                <div className="text-zinc-400 font-bold uppercase tracking-wider">Solved Questions (Last 5):</div>
                <div className="flex flex-col gap-1 bg-zinc-950/60 p-2 rounded-lg border border-zinc-850 max-h-[120px] overflow-y-auto">
                  {gameManagerRef.current.questionHistory.map((h, i) => (
                    <div key={i} className="flex justify-between items-center py-0.5 border-b border-zinc-900/60 last:border-0">
                      <span className="text-zinc-300 font-bold">{h.text}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] text-zinc-500">Ans: <span className={h.isCorrect ? "text-emerald-400" : "text-rose-400 font-bold"}>{h.userAnswer}</span></span>
                        <span className="text-[7.5px] text-zinc-500">Correct: <span className="text-emerald-400 font-bold">{h.correctAnswer}</span></span>
                        <span>{h.isCorrect ? "✅" : "❌"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <div className="flex flex-col border-t border-zinc-900 pt-2 text-[8px] text-zinc-400">
                <span>Total Questions</span>
                <span className="text-white font-bold">{gameManagerRef.current?.questionsSolved ?? 0}</span>
              </div>
              <div className="flex flex-col border-t border-zinc-900 pt-2 text-[8px] text-zinc-400">
                <span>Correct Answers</span>
                <span className="text-emerald-400 font-bold">{gameManagerRef.current?.correctAnswersCount ?? 0}</span>
              </div>
              <div className="flex flex-col col-span-2 border-t border-zinc-900 pt-2 text-[8px] text-zinc-400 flex flex-row justify-around">
                <div>Distance: <span className="text-white font-bold">{Math.round(gameManagerRef.current?.distance ?? 0)} m</span></div>
                <div>Accuracy: <span className="text-indigo-400 font-bold">
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

      {/* GARAGE MODAL */}
      {showGarage && (
        <div className="absolute inset-0 bg-zinc-950/95 z-50 flex items-center justify-center p-6 overflow-y-auto font-mono text-zinc-150">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative text-left">
            <button 
              onClick={() => {
                if (synthRef.current) synthRef.current.playClick();
                setShowGarage(false);
              }} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
            <h2 className="text-xl font-extrabold tracking-tight text-white uppercase bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-center mb-1">
              Vehicle Garage & Shop
            </h2>
            <div className="text-center text-xs text-zinc-400 mb-2">
              COINS AVAILABLE: <span className="text-amber-400 font-bold">🪙 {gameManagerRef.current?.saveManager.getData().coins ?? coins}</span>
            </div>

            <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
              {CAR_SKINS.map((skin) => {
                const owned = gameManagerRef.current?.saveManager.getData().garage.ownedSkins.includes(skin.id) ?? false;
                const active = equippedSkin === skin.id;

                const handleBuyOrEquip = () => {
                  const gm = gameManagerRef.current;
                  if (!gm) return;

                  if (owned) {
                    gm.saveManager.equipSkin(skin.id);
                    setEquippedSkin(skin.id);
                  } else {
                    if (gm.saveManager.getData().coins >= skin.cost) {
                      gm.saveManager.unlockSkin(skin.id, skin.cost);
                      setCoins(gm.saveManager.getData().coins);
                      setEquippedSkin(skin.id);
                    } else {
                      alert("Not enough coins!");
                    }
                  }
                };

                return (
                  <div key={skin.id} className="flex justify-between items-center bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-200">{skin.name}</span>
                        <div className="flex gap-1.5">
                          <span style={{ backgroundColor: skin.bodyColor }} className="w-3 h-3 rounded-sm border border-black/30" />
                          <span style={{ backgroundColor: skin.trimColor }} className="w-3 h-3 rounded-sm border border-black/30" />
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-400 mt-1">{skin.description}</p>
                    </div>

                    <button
                      onClick={handleBuyOrEquip}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                        active 
                          ? "bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                          : owned 
                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                            : "bg-amber-500 hover:bg-amber-400 text-black font-bold"
                      }`}
                    >
                      {active ? "EQUIPPED" : owned ? "EQUIP" : `BUY: 🪙${skin.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (synthRef.current) synthRef.current.playClick();
                setShowGarage(false);
              }}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-[10px] font-bold rounded-xl transition cursor-pointer text-center"
            >
              BACK TO MENU
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


















