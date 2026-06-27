import { SeededRandom } from "./SeededRandom";
import { Gate } from "./GateManager";

export interface TrafficVehicle {
  id: string;
  type: "sedan" | "truck" | "motorcycle";
  lane: number;            // Current fractional lane (0 to numLanes - 1)
  targetLane: number;      // Integer target lane
  y: number;               // World Y position (decreases as it moves forward)
  speed: number;           // Pixels per second
  color: string;           // Custom color for rendering
  width: number;           // Collision width
  length: number;          // Collision length
  active: boolean;         // Object pool flag
  crashed: boolean;        // Whether the vehicle has crashed
  nearMissed: boolean;     // Whether player has already near-missed this vehicle
  laneChangeTimer: number; // Cooldown timer for lane changes
  speedVariationTimer: number; // Cooldown timer for speed variation
  baseSpeed: number;
}

export class TrafficManager {
  private pool: TrafficVehicle[] = [];
  private numLanes = 3;
  private spawnTimer = 0;
  private seedRng: SeededRandom;
  private nextVehicleId = 0;

  // Callbacks
  public onCollision: (vehicle: TrafficVehicle) => void = () => {};
  public onNearMiss: (vehicle: TrafficVehicle) => void = () => {};

  constructor(seedVal: number) {
    this.seedRng = new SeededRandom(seedVal);
    // Initialize pool of 30 vehicles
    for (let i = 0; i < 30; i++) {
      this.pool.push({
        id: "",
        type: "sedan",
        lane: 0,
        targetLane: 0,
        y: 0,
        speed: 0,
        color: "#ffffff",
        width: 0,
        length: 0,
        active: false,
        crashed: false,
        nearMissed: false,
        laneChangeTimer: 0,
        speedVariationTimer: 0,
        baseSpeed: 0
      });
    }
  }

  /**
   * Resets the traffic manager state
   */
  public reset(seedVal: number, numLanes = 3): void {
    this.seedRng = new SeededRandom(seedVal);
    this.numLanes = numLanes;
    this.spawnTimer = 0;
    this.nextVehicleId = 0;
    for (const v of this.pool) {
      v.active = false;
      v.crashed = false;
      v.nearMissed = false;
    }
  }

  /**
   * Gets all active traffic vehicles
   */
  public getActiveVehicles(): TrafficVehicle[] {
    return this.pool.filter(v => v.active);
  }

  /**
   * Spawns a vehicle if possible
   */
  private trySpawn(playerY: number, gates: Gate[]): void {
    // Determine spawn lane
    const spawnLane = this.seedRng.range(0, this.numLanes - 1);
    
    // Choose spawn Y ahead of the player
    const spawnY = playerY - 800 - this.seedRng.range(0, 300);

    // Safety checks:
    // 1. Spacing to math gates (minimum 120px)
    for (const gate of gates) {
      if (Math.abs(spawnY - gate.y) < 140) {
        return; // Too close to a gate
      }
    }

    // 2. Spacing to other active traffic vehicles in the same/adjacent lane
    for (const v of this.pool) {
      if (v.active) {
        // If in same lane, check strict spacing
        if (Math.abs(v.lane - spawnLane) < 0.5) {
          if (Math.abs(v.y - spawnY) < 150) {
            return; // Too close in Y in same lane
          }
        } else if (Math.abs(v.lane - spawnLane) < 1.5) {
          // Adjacent lane check: avoid blocking player completely
          if (Math.abs(v.y - spawnY) < 80) {
            return; // Too close laterally/longitudinally
          }
        }
      }
    }

    // Find inactive vehicle in pool
    const vehicle = this.pool.find(v => !v.active);
    if (!vehicle) return;

    // Pick type based on weights (Sedan 50%, Truck 30%, Motorcycle 20%)
    const roll = this.seedRng.next();
    let type: TrafficVehicle["type"] = "sedan";
    if (roll < 0.5) {
      type = "sedan";
    } else if (roll < 0.8) {
      type = "truck";
    } else {
      type = "motorcycle";
    }

    // Configure properties
    vehicle.id = `traffic-${this.nextVehicleId++}`;
    vehicle.type = type;
    vehicle.lane = spawnLane;
    vehicle.targetLane = spawnLane;
    vehicle.y = spawnY;
    vehicle.active = true;
    vehicle.crashed = false;
    vehicle.nearMissed = false;
    vehicle.laneChangeTimer = this.seedRng.range(3, 7);
    vehicle.speedVariationTimer = this.seedRng.range(2, 5);

    // Personalities config
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#fbbf24", "#a855f7", "#ec4899", "#f97316", "#06b6d4"];
    vehicle.color = this.seedRng.choice(colors);

    if (type === "sedan") {
      vehicle.baseSpeed = this.seedRng.range(130, 160);
      vehicle.width = 24;
      vehicle.length = 40;
    } else if (type === "truck") {
      vehicle.baseSpeed = this.seedRng.range(80, 110);
      vehicle.width = 30;
      vehicle.length = 65;
      vehicle.color = "#71717a"; // trucks usually metallic/grey
    } else { // motorcycle
      vehicle.baseSpeed = this.seedRng.range(180, 220);
      vehicle.width = 16;
      vehicle.length = 24;
    }

    vehicle.speed = vehicle.baseSpeed;
  }

  /**
   * Main update tick for AI traffic simulation
   */
  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerSpeed: number,
    gates: Gate[],
    score: number,
    roadCenterXAtY: (y: number) => number,
    roadWidthAtY: (y: number) => number
  ): void {
    // 1. Spawning Check
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.4; // check every 400ms

      const activeCount = this.getActiveVehicles().length;
      
      // Determine density target based on score
      let targetCount = 3; // Low Density
      if (score >= 3000) {
        targetCount = 10; // High Density (8-15)
      } else if (score >= 1000) {
        targetCount = 6;  // Medium Density (4-8)
      }

      if (activeCount < targetCount) {
        this.trySpawn(playerY, gates);
      }
    }

    // 2. Update each active vehicle
    for (const v of this.pool) {
      if (!v.active) continue;

      // Despawn if too far behind player or too far ahead
      if (v.y > playerY + 250 || v.y < playerY - 1400) {
        v.active = false;
        continue;
      }

      // If crashed, slow down to a stop and drift off slightly
      if (v.crashed) {
        v.speed = Math.max(0, v.speed - 300 * dt);
        v.y -= v.speed * dt;
        continue;
      }

      // Forward movement
      v.y -= v.speed * dt;

      // Speed variations
      v.speedVariationTimer -= dt;
      if (v.speedVariationTimer <= 0) {
        v.speedVariationTimer = this.seedRng.range(2, 5);
        // Vary speed within +/- 15px/sec of base speed
        v.speed = v.baseSpeed + this.seedRng.range(-15, 15);
      }

      // Smooth lane changing interpolation
      if (v.lane !== v.targetLane) {
        let changeSpeed = 1.5;
        if (v.type === "truck") changeSpeed = 1.0;
        if (v.type === "motorcycle") changeSpeed = 2.5;

        const diff = v.targetLane - v.lane;
        if (Math.abs(diff) < changeSpeed * dt) {
          v.lane = v.targetLane;
        } else {
          v.lane += Math.sign(diff) * changeSpeed * dt;
        }
      }

      // AI Decision: Lane changes & Overtaking
      v.laneChangeTimer -= dt;
      if (v.laneChangeTimer <= 0) {
        v.laneChangeTimer = v.type === "motorcycle" 
          ? this.seedRng.range(1.5, 3.5)
          : v.type === "truck"
            ? this.seedRng.range(7, 12)
            : this.seedRng.range(3.5, 7);

        // Check if there is a vehicle directly in front of this AI (same lane, Y coordinate is smaller, i.e., ahead)
        let vehicleAhead = false;
        let gapAhead = 9999;
        for (const other of this.pool) {
          if (other.active && other.id !== v.id && Math.abs(other.lane - v.lane) < 0.5) {
            const dist = v.y - other.y; // positive if other is ahead (remember Y decreases forward)
            if (dist > 0 && dist < 220) {
              vehicleAhead = true;
              if (dist < gapAhead) gapAhead = dist;
            }
          }
        }

        // Decide to switch lanes
        let wantsToChange = false;
        if (vehicleAhead && gapAhead < 150) {
          wantsToChange = true; // Overtake behavior
        } else {
          // Random lane change check
          const chance = v.type === "motorcycle" ? 0.5 : v.type === "sedan" ? 0.2 : 0.05;
          wantsToChange = this.seedRng.next() < chance;
        }

        if (wantsToChange && v.lane === v.targetLane) {
          // Pick left or right
          const dirs: number[] = [];
          if (v.targetLane > 0) dirs.push(-1);
          if (v.targetLane < this.numLanes - 1) dirs.push(1);

          if (dirs.length > 0) {
            const dir = this.seedRng.choice(dirs);
            const testLane = v.targetLane + dir;

            // Safety check: is target lane free?
            let laneSafe = true;
            for (const other of this.pool) {
              if (other.active && other.id !== v.id && Math.abs(other.lane - testLane) < 0.5) {
                if (Math.abs(other.y - v.y) < 120) {
                  laneSafe = false;
                  break;
                }
              }
            }

            if (laneSafe) {
              v.targetLane = testLane;
            }
          }
        }
      }

      // 3. Collision Detection
      // Get AI center X position
      const cx = roadCenterXAtY(v.y);
      const w = roadWidthAtY(v.y);
      const laneWidth = w / this.numLanes;
      const aiX = cx + (v.lane - (this.numLanes - 1) / 2) * laneWidth;

      // Player size: 24w, 40l. AI size: v.width, v.length
      const playerWidth = 24;
      const playerLength = 40;

      const dx = Math.abs(playerX - aiX);
      const dy = Math.abs(playerY - v.y);

      // Simple box collision
      if (dx < (playerWidth + v.width) / 2 - 2 && dy < (playerLength + v.length) / 2 - 2) {
        v.crashed = true;
        this.onCollision(v);
        continue;
      }

      // 4. Near Miss Detection
      // Near miss conditions:
      // - Player passes vehicle (or vehicle passes player) within Y range
      // - No collision (meaning dx >= (playerWidth + v.width)/2 - 2)
      // - Close lateral proximity: dx < (playerWidth + v.width)/2 + 25
      // - Must not have been already registered
      if (!v.nearMissed && dy < 40 && dx >= (playerWidth + v.width) / 2 - 2 && dx < (playerWidth + v.width) / 2 + 25) {
        v.nearMissed = true;
        this.onNearMiss(v);
      }
    }
  }
}
