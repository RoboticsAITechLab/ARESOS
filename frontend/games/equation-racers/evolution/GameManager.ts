import { SeededRandom } from "./SeededRandom";
import { QuestionGenerator, MathQuestion } from "./QuestionGenerator";
import { LaneManager } from "./LaneManager";
import { GateManager, Gate } from "./GateManager";
import { CollectibleManager, Collectible } from "./CollectibleManager";
import { SaveManager } from "./SaveManager";
import { RunAnalyticsManager } from "./RunAnalyticsManager";
import { ObstacleManager } from "./ObstacleManager";
import { TrafficManager, TrafficVehicle } from "./TrafficManager";

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
  public targetSpeed = 160; // Persistent target speed
  public maxSpeed = 360;
  public carY = 0; // Auto-forward vertical coordinate

  // Focus Mode & Timing parameters
  public runAnalytics: RunAnalyticsManager;
  public focusModeActive = false;
  public focusModeTimer = 0;
  public correctLaneEnteredY: number | null = null;
  public lastScoreMilestone = 0;

  // Final Polish properties
  public lastCategory: string | null = null;
  public questionHistory: { text: string; userAnswer: string; correctAnswer: string; isCorrect: boolean }[] = [];
  public feedbackBannerTimer = 0;
  public feedbackBannerText = "";
  public learningMode = true;
  public currentQuestion: MathQuestion | null = null;
  public nextQuestion: MathQuestion | null = null;

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
  public trafficManager: TrafficManager;

  // Track zones & elevation
  public activeZone: "highway" | "city" | "mountain" | "bridge" | "tunnel" = "highway";
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
  public onTrafficCollision: (type: "sedan" | "truck" | "motorcycle") => void = () => {};
  public onNearMiss: (phrase: string) => void = () => {};

  constructor() {
    this.questionGen = new QuestionGenerator();
    this.laneManager = new LaneManager();
    this.gateManager = new GateManager();
    this.collectibleManager = new CollectibleManager();
    this.saveManager = new SaveManager();
    this.runAnalytics = new RunAnalyticsManager();
    this.obstacleManager = new ObstacleManager();
    this.trafficManager = new TrafficManager(918237);

    // Bind traffic callbacks
    this.trafficManager.onCollision = (vehicle) => {
      this.lives--;
      this.combo = 0;
      this.brakingTimer = 0.65;
      // Reduce speed significantly
      this.targetSpeed = Math.max(80, this.targetSpeed - 70);

      this.runAnalytics.logEvent({
        type: "wrong",
        description: `Collided with AI traffic: ${vehicle.type}`
      });

      this.onScreenShake();
      this.onTrafficCollision(vehicle.type);

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
      }
    };

    this.trafficManager.onNearMiss = (vehicle) => {
      this.score += 50;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      const phrases = ["NEAR MISS!", "CLOSE CALL!", "INSANE DODGE!"];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      this.onNearMiss(phrase);
    };

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
    this.targetSpeed = 160;
    this.carY = 0;
    this.nextGateY = -600;

    this.focusModeActive = false;
    this.focusModeTimer = 0;
    this.correctLaneEnteredY = null;
    this.lastScoreMilestone = 0;
    this.lastCategory = null;
    this.questionHistory = [];
    this.feedbackBannerTimer = 0;
    this.feedbackBannerText = "";
    this.learningMode = this.saveManager.getData().settings.learningMode;

    // Pre-populate queue
    this.currentQuestion = this.generateNextMathQuestion();
    this.nextQuestion = this.generateNextMathQuestion();

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
    
    this.trafficManager.reset(seed, this.laneManager.numLanes);

    // Spawn first gate and initial coins leading up to it
    this.spawnNextChallenge();
  }

  private generateNextMathQuestion(): MathQuestion {
    // Scale question difficulty based on dynamic score progression brackets
    let targetDifficulty = 1;
    if (this.score < 1000) {
      targetDifficulty = this.rng.range(1, 2);
    } else if (this.score < 3000) {
      targetDifficulty = this.rng.range(2, 4);
    } else {
      targetDifficulty = this.rng.range(4, 6);
    }

    // Question Variety Rotation: Filter out last active category to prevent repeating back-to-back
    let categoriesToUse = this.activeCategories.filter(cat => cat !== this.lastCategory);
    if (categoriesToUse.length === 0) {
      categoriesToUse = this.activeCategories;
    }

    const question = this.questionGen.generateQuestion(categoriesToUse, targetDifficulty, this.rng);
    this.lastCategory = question.category;
    return question;
  }

  private spawnNextChallenge(): void {
    const gateId = `gate-${this.questionsSolved}`;
    
    if (!this.currentQuestion) {
      this.currentQuestion = this.generateNextMathQuestion();
    }
    const question = this.currentQuestion;

    // Advance queue instantly
    this.currentQuestion = this.nextQuestion || this.generateNextMathQuestion();
    this.nextQuestion = this.generateNextMathQuestion();
    
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

    // Dynamic Gate Spacing: solve distance based on speed and difficulty, plus 300px cooldown
    const solveDist = this.getActiveGateSolveDistance({ question });
    const spacing = solveDist + 300;
    this.nextGateY -= spacing;
  }

  public handleLeft(): void {
    if (this.gameMode === "Running" && this.feedbackBannerTimer <= 0) {
      const dist = this.getNextGateDistance();
      if (dist === null || dist >= 100) {
        this.laneManager.moveLeft();
      }
    }
  }

  public handleRight(): void {
    if (this.gameMode === "Running" && this.feedbackBannerTimer <= 0) {
      const dist = this.getNextGateDistance();
      if (dist === null || dist >= 100) {
        this.laneManager.moveRight();
      }
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

  public getActiveGateSolveDistance(gate: any): number {
    if (!gate || !gate.question) return 800;
    const diff = gate.question.difficultyVal ?? 1;
    const solveTime = diff <= 2 ? 4.5 : diff <= 4 ? 6.5 : 8.5;
    return solveTime * this.speed;
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

    // 1. Decrement wrong answer explanation banner timer
    if (this.feedbackBannerTimer > 0) {
      this.feedbackBannerTimer -= dt;
    }

    // 2. Compute active scroll speed based on dynamic speed control and feedback banners
    let activeSpeed = this.targetSpeed;
    if (this.feedbackBannerTimer > 0) {
      activeSpeed = 45; // Slow scroll speed during explanation display so player can read it
    } else {
      const activeGate = this.gateManager.getNextActiveGate(this.carY);
      if (activeGate && activeGate.question) {
        const qDist = this.carY - activeGate.y;
        const solveDist = this.getActiveGateSolveDistance(activeGate);
        if (qDist <= solveDist) {
          const diffVal = activeGate.question.difficultyVal ?? 1;
          if (diffVal >= 5) {
            activeSpeed *= 0.82; // Temporarily reduce speed by 18% for Hard questions
          }
        }
      }
    }
    this.speed = activeSpeed;

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
      this.targetSpeed = Math.max(100, this.targetSpeed - 60);

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

    // Calculate road curvature connection angle using track centerline lookahead
    const currentCenter = roadCenterXAtY(this.carY);
    const futureCenter = roadCenterXAtY(this.carY - 50);
    const rawRoadAngle = Math.atan2(futureCenter - currentCenter, 50);
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

    // Update coins collection checks
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
        const isAnswerCorrect = (this.laneManager.currentLane === q.correctLane);
        const playerAnswerStr = String(q.options[this.laneManager.currentLane]);

        // Push solved question details to questionHistory list
        this.questionHistory.push({
          text: q.text,
          userAnswer: playerAnswerStr,
          correctAnswer: String(q.correctValue),
          isCorrect: isAnswerCorrect
        });
        if (this.questionHistory.length > 5) {
          this.questionHistory.shift();
        }
        
        if (isAnswerCorrect) {
          // Correct answer!
          this.correctAnswersCount++;
          this.combo++;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          
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
            this.targetSpeed = Math.min(320, this.baseSpeed + this.difficulty * 8);
          }
        } else {
          // Incorrect answer!
          this.wrongAnswersCount++;
          this.lives--;
          this.combo = 0;

          // If Learning Mode is ON, trigger a 1.5 second wrong answer explanation banner
          if (this.learningMode) {
            this.feedbackBannerTimer = 1.5;
            this.feedbackBannerText = `Wrong! Correct Answer: ${q.correctValue}`;
            this.brakingTimer = 1.5;
          } else {
            this.brakingTimer = 0.85; // Default short brake shock
          }

          // Log incorrect event
          this.runAnalytics.logEvent({
            type: "wrong",
            category: q.category,
            description: `Mistake on: ${q.text} (selected lane ${this.laneManager.currentLane}, correct was ${q.correctLane})`
          });

          // Adaptive Difficulty Speed slowdown on mistakes
          this.difficulty = Math.max(1, this.difficulty - 1);
          this.targetSpeed = Math.max(120, this.baseSpeed + this.difficulty * 8);

          this.onWrongAnswer();
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

        // Spawn subsequent challenge
        this.spawnNextChallenge();
      }
    }

    // Dynamic speed adjustment based on run accuracy (smoothly interpolation over time)
    const accuracy = this.questionsSolved > 0 ? (this.correctAnswersCount / this.questionsSolved) : 1.0;
    if (accuracy > 0.85) {
      this.targetSpeed = Math.min(360, this.targetSpeed + 4 * dt); // gradually increase
    } else if (accuracy < 0.5) {
      this.targetSpeed = Math.max(100, this.targetSpeed - 8 * dt); // gradually decrease
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

    // Update traffic vehicles
    this.trafficManager.update(
      dt,
      this.laneManager.carX,
      this.carY,
      this.speed,
      this.gateManager.getGates(),
      this.activeZone === "city" ? Math.max(3000, this.score + 3000) : this.score,
      roadCenterXAtY,
      roadWidthAtY
    );

    if (this.gameMode !== "Running") return;

    // Clean up passed entities
    this.gateManager.cleanUp(this.carY);
    this.collectibleManager.cleanUp(this.carY);
  }
}
