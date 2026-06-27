import { SeededRandom } from "./SeededRandom";
import { QuestionGenerator, MathQuestion } from "./QuestionGenerator";
import { LaneManager } from "./LaneManager";
import { GateManager, Gate } from "./GateManager";
import { CollectibleManager, Collectible } from "./CollectibleManager";
import { SaveManager } from "./SaveManager";
import { RunAnalyticsManager } from "./RunAnalyticsManager";
import { ObstacleManager } from "./ObstacleManager";

export class GameManager {
  public gameMode: "Start" | "Running" | "Paused" | "GameOver" = "Start";
  
  // Active run stats
  public score = 0;
  public lives = 3;
  public combo = 0;
  public maxCombo = 0;
  public coinsCollected = 0;
  public questionsSolved = 0;
  public correctAnswersCount = 0;
  public wrongAnswersCount = 0;
  public distance = 0; // In meters
  
  // Difficulty & speed tuning
  public difficulty = 1;
  public baseSpeed = 160; // Base forward scroll speed (px/sec)
  public speed = 160; // Active speed
  public carY = 0; // Auto-forward vertical coordinate

  // Focus Mode & Timing parameters
  public runAnalytics: RunAnalyticsManager;
  public focusModeActive = false;
  public focusModeTimer = 0;
  public correctLaneEnteredY: number | null = null;
  public lastScoreMilestone = 0;

  // Visual & Physics feedback states
  public roadAngle = 0;
  public vehicleState: "Idle" | "Cruising" | "Turning" | "Hard Turning" | "Near Crash" | "Low Lives" = "Cruising";
  public brakingTimer = 0;
  public isBraking = false;
  public lastCarX = 400;
  public lastSpeed = 160;

  // Seeds & Categories
  public trackSeed: number;
  public isDailyChallenge = false;
  public activeCategories = ["addition", "subtraction", "multiplication"];

  // System managers
  public rng!: SeededRandom;
  public questionGen: QuestionGenerator;
  public laneManager: LaneManager;
  public gateManager: GateManager;
  public collectibleManager: CollectibleManager;
  public saveManager: SaveManager;
  public obstacleManager: ObstacleManager;

  // Track zones & elevation
  public activeZone: "highway" | "city" | "mountain" = "highway";
  public activeChallengeZone: "math_rush" | null = null;
  public elevation = 0;
  public activeWeather: "clear" | "rain" | "fog" | "night" | "storm" = "clear";

  // Track next gate coordinate
  private nextGateY = -600;

  // Visual/sound callbacks registered by React layer
  public onCoinCollected: (worldX: number, worldY: number) => void = () => {};
  public onCorrectAnswer: (pos: { x: number; y: number }, value: string) => void = () => {};
  public onWrongAnswer: () => void = () => {};
  public onGameOver: () => void = () => {};
  public onScreenShake: () => void = () => {};
  public onMilestoneTrigger: () => void = () => {};
  public onObstacleHit: (type: "cone" | "barrier") => void = () => {};

  constructor() {
    this.questionGen = new QuestionGenerator();
    this.laneManager = new LaneManager();
    this.gateManager = new GateManager();
    this.collectibleManager = new CollectibleManager();
    this.saveManager = new SaveManager();
    this.runAnalytics = new RunAnalyticsManager();
    this.obstacleManager = new ObstacleManager();
    this.trackSeed = 918237; // Default seed
    this.init(this.trackSeed);
  }

  /**
   * Initializes or restarts the game managers with a specific seed
   */
  public init(seed: number, categories = ["addition", "subtraction", "multiplication"], daily = false): void {
    this.trackSeed = seed;
    this.activeCategories = categories;
    this.isDailyChallenge = daily;
    
    this.rng = new SeededRandom(seed);
    this.laneManager.reset();
    this.gateManager.reset();
    this.collectibleManager.reset();
    this.obstacleManager.reset();
    this.runAnalytics.reset();
    
    // Sync settings to laneManager
    this.laneManager.reduceMotion = this.saveManager.getData().settings.reduceMotion;
    
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.maxCombo = 0;
    this.coinsCollected = 0;
    this.questionsSolved = 0;
    this.correctAnswersCount = 0;
    this.wrongAnswersCount = 0;
    this.distance = 0;
    this.difficulty = 1;
    this.baseSpeed = 160;
    this.speed = 160;
    this.carY = 0;
    this.nextGateY = -600;

    this.focusModeActive = false;
    this.focusModeTimer = 0;
    this.correctLaneEnteredY = null;
    this.lastScoreMilestone = 0;

    this.roadAngle = 0;
    this.vehicleState = "Cruising";
    this.brakingTimer = 0;
    this.isBraking = false;
    this.lastCarX = 400;
    this.lastSpeed = 160;

    this.activeZone = "highway";
    this.activeChallengeZone = null;
    this.elevation = 0;
    this.activeWeather = "clear";
    
    // Spawn first gate and initial coins leading up to it
    this.spawnNextChallenge();
  }

  /**
   * Spawns a challenge gate and placement of coins
   */
  private spawnNextChallenge(): void {
    const gateId = `gate-${this.questionsSolved}`;
    
    // Scale question difficulty according to the active zone
    let targetDifficulty = this.difficulty;
    if (this.activeZone === "highway") {
      targetDifficulty = Math.max(1, Math.min(2, this.difficulty));
    } else if (this.activeZone === "city") {
      targetDifficulty = Math.max(2, Math.min(4, this.difficulty));
    } else if (this.activeZone === "mountain") {
      targetDifficulty = Math.max(3, this.difficulty);
    }

    const question = this.questionGen.generateQuestion(this.activeCategories, targetDifficulty, this.rng);
    
    // Spawn gate
    this.gateManager.spawnGate(gateId, this.nextGateY, "math", question);

    // Spawn 3 coins in random lanes leading up to the gate
    for (let i = 0; i < 3; i++) {
      const coinLane = this.rng.range(0, this.laneManager.numLanes - 1);
      const coinY = this.nextGateY + 150 + i * 150; // spawn at e.g. y = gateY + 150, +300, +450
      this.collectibleManager.spawnCollectible(
        `coin-${gateId}-${i}`,
        coinLane,
        coinY,
        "coin"
      );
    }

    // Prepare next gate threshold (closer spacing in Math Rush challenge)
    const spacing = this.activeChallengeZone === "math_rush" ? 380 : 700;
    this.nextGateY -= spacing;
  }

  /**
   * Shifts lane Left
   */
  public handleLeft(): void {
    if (this.gameMode === "Running") {
      this.laneManager.moveLeft();
    }
  }

  /**
   * Shifts lane Right
   */
  public handleRight(): void {
    if (this.gameMode === "Running") {
      this.laneManager.moveRight();
    }
  }

  /**
   * Toggles Pause/Resume state
   */
  public togglePause(): void {
    if (this.gameMode === "Running") {
      this.gameMode = "Paused";
    } else if (this.gameMode === "Paused") {
      this.gameMode = "Running";
    }
  }

  /**
   * Starts a new run
   */
  public start(): void {
    this.gameMode = "Running";
  }

  /**
   * Get the distance in pixels to the next active gate in front of the car
   */
  public getNextGateDistance(): number | null {
    const nextGate = this.gateManager.getNextActiveGate(this.carY);
    if (!nextGate) return null;
    return this.carY - nextGate.y; // distance is positive
  }

  /**
   * Checks if warning system is active based on proximity to the next gate
   */
  public isNearGate(): boolean {
    const dist = this.getNextGateDistance();
    if (dist === null) return false;
    const settings = this.saveManager.getData().settings;
    const limit = settings.largeTextMode ? 250 : 150;
    return dist < limit;
  }

  /**
   * Main simulation frame update
   */
  public update(
    dt: number,
    roadCenterXAtY: (y: number) => number,
    roadWidthAtY: (y: number) => number,
    getSegmentAtY: (y: number) => any,
    getElevationAt: (y: number) => number
  ): void {
    if (this.gameMode !== "Running") return;

    // Sync current zone metadata and elevation
    const seg = getSegmentAtY(this.carY);
    if (seg) {
      this.activeZone = seg.zone;
      this.activeChallengeZone = seg.challengeZone;
      this.elevation = getElevationAt(this.carY);

      // Register obstacles from current segment and next segment
      if (seg.obstacles) {
        for (const obs of seg.obstacles) {
          const obsWorldY = seg.yStart - obs.offsetY;
          this.obstacleManager.registerObstacle(obs.id, obs.type, obs.lane, obsWorldY);
        }
      }
      const nextSeg = getSegmentAtY(this.carY - 550);
      if (nextSeg && nextSeg.obstacles) {
        for (const obs of nextSeg.obstacles) {
          const obsWorldY = nextSeg.yStart - obs.offsetY;
          this.obstacleManager.registerObstacle(obs.id, obs.type, obs.lane, obsWorldY);
        }
      }
    }

    // Check obstacle collisions
    const hitObstacles = this.obstacleManager.updateCollisions(
      this.laneManager.carX,
      this.carY,
      roadCenterXAtY,
      roadWidthAtY,
      this.laneManager.numLanes
    );

    for (const obs of hitObstacles) {
      this.onObstacleHit(obs.type);
      this.lives--;
      this.combo = 0;
      this.brakingTimer = 0.65;
      this.speed = Math.max(100, this.speed - 60);

      this.runAnalytics.logEvent({
        type: "wrong",
        description: `Collided with obstacle: ${obs.type}`
      });

      this.onScreenShake();

      if (this.lives <= 0) {
        this.gameMode = "GameOver";
        this.saveManager.updateRunStats(
          this.score,
          this.coinsCollected,
          this.distance,
          this.questionsSolved,
          this.correctAnswersCount,
          this.wrongAnswersCount,
          this.maxCombo
        );
        this.onGameOver();
        return;
      }
    }
    this.obstacleManager.cleanUp(this.carY);

    // Apply auto-forward travel coordinates (decreasing y)
    this.carY -= this.speed * dt;
    this.distance += (this.speed * dt) * 0.05; // 1 meter per 20px of travel

    // Calculate road curvature angle via numerical differentiation (lookahead of 45px)
    const cxCurrent = roadCenterXAtY(this.carY);
    const cxAhead = roadCenterXAtY(this.carY - 45);
    const rawRoadAngle = Math.atan2(cxAhead - cxCurrent, 45);
    // Clamp curvature angle to ±15 degrees (0.26 radians) to preserve option text readability
    const maxClamp = 0.26;
    this.roadAngle = Math.max(-maxClamp, Math.min(maxClamp, rawRoadAngle));

    // Calculate lateral velocity
    const lateralVelocity = dt > 0 ? Math.abs(this.laneManager.carX - this.lastCarX) / dt : 0;
    this.lastCarX = this.laneManager.carX;

    // Update braking trackers
    if (this.brakingTimer > 0) {
      this.brakingTimer -= dt;
    }
    const speedDropped = this.speed < this.lastSpeed - 0.1;
    this.isBraking = this.brakingTimer > 0 || speedDropped;
    this.lastSpeed = this.speed;

    // Calculate Vehicle State
    const nextGate = this.gateManager.getNextActiveGate(this.carY);
    const isNearCrash = this.isNearGate() && nextGate && nextGate.question && 
      this.laneManager.currentLane !== nextGate.question.correctLane;

    if (this.lives === 1) {
      this.vehicleState = "Low Lives";
    } else if (isNearCrash) {
      this.vehicleState = "Near Crash";
    } else if (lateralVelocity > 160) {
      this.vehicleState = "Hard Turning";
    } else if (lateralVelocity > 35) {
      this.vehicleState = "Turning";
    } else if (this.speed > 10) {
      this.vehicleState = "Cruising";
    } else {
      this.vehicleState = "Idle";
    }

    // Update Focus Mode timer if active
    if (this.focusModeActive) {
      this.focusModeTimer -= dt;
      if (this.focusModeTimer <= 0) {
        this.focusModeActive = false;
      }
    }

    // Update car swerving X coordinates
    const roadCenterX = roadCenterXAtY(this.carY);
    const roadWidth = roadWidthAtY(this.carY);
    this.laneManager.update(dt, roadCenterX, roadWidth);

    // Update coins collection checks (Magnet defaults to false for 6A MVP)
    const collected = this.collectibleManager.update(
      dt,
      this.laneManager.carX,
      this.carY,
      roadCenterXAtY,
      roadWidthAtY,
      false
    );

    if (collected.length > 0) {
      this.coinsCollected += collected.length;
      for (const item of collected) {
        // Calculate item's world coordinates to pass to collector callback
        const cx = roadCenterXAtY(item.y);
        const w = roadWidthAtY(item.y);
        const laneWidth = w / this.laneManager.numLanes;
        const itemX = item.x ?? (cx + (item.lane - (this.laneManager.numLanes - 1) / 2) * laneWidth);
        
        this.onCoinCollected(itemX, item.y);
        this.score += 15; // base coin points bonus

        this.runAnalytics.logEvent({
          type: "coin",
          description: "Collected coin"
        });
      }
    }

    // Track the distance at which the correct lane is entered
    const nextGateAhead = this.gateManager.getNextActiveGate(this.carY);
    if (nextGateAhead && nextGateAhead.question) {
      if (this.laneManager.currentLane === nextGateAhead.question.correctLane) {
        if (this.correctLaneEnteredY === null) {
          this.correctLaneEnteredY = this.carY;
        }
      } else {
        this.correctLaneEnteredY = null;
      }
    } else {
      this.correctLaneEnteredY = null;
    }

    // Check gate passes
    const crossedGates = this.gateManager.update(this.carY);
    for (const gate of crossedGates) {
      if (gate.type === "math" && gate.question) {
        this.questionsSolved++;
        const q = gate.question;
        
        if (this.laneManager.currentLane === q.correctLane) {
          // Correct answer!
          this.correctAnswersCount++;
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          
          // Determine answer swerve timing quality
          let rating: "Perfect" | "Good" | "Clutch Save" = "Good";
          let ratingBonus = 0;
          let ratingText = "GOOD!";
          
          if (this.correctLaneEnteredY !== null) {
            const entryDist = this.correctLaneEnteredY - gate.y;
            if (entryDist > 180) {
              rating = "Perfect";
              ratingBonus = 50;
              ratingText = "PERFECT!";
            } else if (entryDist < 60) {
              rating = "Clutch Save";
              ratingBonus = 20;
              ratingText = "CLUTCH SAVE!";
            }
          }

          const baseMultiplier = 1 + Math.floor(this.combo / 5);
          let multiplier = this.focusModeActive ? baseMultiplier * 2 : baseMultiplier;
          if (this.activeZone === "mountain") {
            multiplier = Math.ceil(multiplier * 1.5);
          }
          const pointsGained = 100 * multiplier + ratingBonus;
          this.score += pointsGained;

          // Log analytics
          this.runAnalytics.logEvent({
            type: "correct",
            category: q.category,
            description: `${rating} Answer: ${q.text}`,
            reactionTime: this.correctLaneEnteredY !== null ? (this.correctLaneEnteredY - gate.y) : undefined
          });

          if (rating === "Clutch Save") {
            this.runAnalytics.logEvent({
              type: "near_miss",
              category: q.category,
              description: `Clutch save on question: ${q.text}`
            });
          }

          // Trigger floats
          this.onCorrectAnswer(
            { x: this.laneManager.carX, y: this.carY },
            `${ratingText} +${pointsGained}`
          );

          // Focus Mode activation check (10% chance)
          if (!this.focusModeActive && this.rng.next() < 0.10) {
            this.focusModeActive = true;
            this.focusModeTimer = 10.0;
            this.runAnalytics.logEvent({
              type: "milestone",
              description: "Focus Mode activated! 2x multiplier!"
            });
          }

          // Check category solved counts for milestones
          if (this.correctAnswersCount % 10 === 0) {
            this.runAnalytics.logEvent({
              type: "milestone",
              description: `Reached milestone: ${this.correctAnswersCount} correct answers!`
            });
            this.onMilestoneTrigger();
          }

          // Adaptive Difficulty Speed increase
          if (this.combo % 3 === 0) {
            this.difficulty++;
            this.speed = Math.min(320, this.baseSpeed + this.difficulty * 8);
          }
        } else {
          // Incorrect answer!
          this.wrongAnswersCount++;
          this.lives--;
          this.combo = 0;
          this.brakingTimer = 0.85; // turn on brake lights for mistake shock

          // Log incorrect event
          this.runAnalytics.logEvent({
            type: "wrong",
            category: q.category,
            description: `Mistake on: ${q.text} (selected lane ${this.laneManager.currentLane}, correct was ${q.correctLane})`
          });

          // Adaptive Difficulty Speed slowdown on mistakes
          this.difficulty = Math.max(1, this.difficulty - 1);
          this.speed = Math.max(120, this.baseSpeed + this.difficulty * 8);

          this.onWrongAnswer();
          this.onScreenShake();

          if (this.lives <= 0) {
            this.gameMode = "GameOver";
            // Commit and save statistics to LocalStorage
            this.saveManager.updateRunStats(
              this.score,
              this.coinsCollected,
              this.distance,
              this.questionsSolved,
              this.correctAnswersCount,
              this.wrongAnswersCount,
              this.maxCombo
            );
            this.onGameOver();
            return;
          }
        }

        // Spawn subsequent challenge
        this.spawnNextChallenge();
      }
    }

    // Dynamic speed adjustment based on run accuracy (smoothly interpolation over time)
    const accuracy = this.questionsSolved > 0 ? (this.correctAnswersCount / this.questionsSolved) : 1.0;
    if (accuracy > 0.85) {
      this.speed = Math.min(360, this.speed + 4 * dt); // gradually increase
    } else if (accuracy < 0.5) {
      this.speed = Math.max(100, this.speed - 8 * dt); // gradually decrease
    }

    // Check score threshold milestones
    const currentScoreMilestone = Math.floor(this.score / 1000);
    if (currentScoreMilestone > this.lastScoreMilestone) {
      this.lastScoreMilestone = currentScoreMilestone;
      this.runAnalytics.logEvent({
        type: "milestone",
        description: `Score passed milestone: ${currentScoreMilestone * 1000} points!`
      });
      this.onMilestoneTrigger();
    }

    // Clean up passed entities
    this.gateManager.cleanUp(this.carY);
    this.collectibleManager.cleanUp(this.carY);
  }
}
