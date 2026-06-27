import { TrackSegment, SegmentType, SceneryObject, ObstacleData } from "./TrackSegment";
import { TrackSeed } from "./TrackSeed";

const BILLBOARD_MESSAGES = [
  "MATH RACER",
  "COACH APPROVED",
  "KEEP FOCUS",
  "SPEED LIMIT 200",
  "DANGER CONES",
  "SOLVE TO BOOST",
  "SHARP CURVES",
  "MOUNTAIN RUSH",
  "METRICS DNA",
  "ARES OS STABLE"
];

export class TrackGenerator {
  private segments: TrackSegment[] = [];
  private seed: TrackSeed;

  constructor(seedVal: number) {
    this.seed = new TrackSeed(seedVal);
  }

  private lastFoundSegment: TrackSegment | null = null;

  public generate(segmentCount = 60): void {
    this.segments = [];
    this.lastFoundSegment = null;
    let currentY = 0;
    let currentCenterX = 400;
    let currentWidth = 300;
    let currentElevation = 0;

    // Track active zone group states sequentially (Highway -> City -> Bridge -> Tunnel -> Mountain)
    const ZONE_SEQUENCE: ("highway" | "city" | "bridge" | "tunnel" | "mountain")[] = ["highway", "city", "bridge", "tunnel", "mountain"];
    let zoneIndex = 0;
    let activeZone = ZONE_SEQUENCE[zoneIndex];
    let nextZone = ZONE_SEQUENCE[(zoneIndex + 1) % ZONE_SEQUENCE.length];
    let activeChallengeZone: "math_rush" | null = null;
    let zoneCounter = 0;

    for (let i = 0; i < segmentCount; i++) {
      // 1. Determine zone clusters sequentially every 16-22 segments
      if (zoneCounter <= 0) {
        zoneCounter = this.seed.integerRange(16, 22);
        activeZone = ZONE_SEQUENCE[zoneIndex];
        nextZone = ZONE_SEQUENCE[(zoneIndex + 1) % ZONE_SEQUENCE.length];
        zoneIndex = (zoneIndex + 1) % ZONE_SEQUENCE.length;

        // 15% chance to trigger a Math Rush challenge zone
        activeChallengeZone = this.seed.next() < 0.15 ? "math_rush" : null;
      }
      zoneCounter--;

      // 2. Select appropriate segment type and length based on zone
      let type: SegmentType = "straight";
      let length = this.seed.range(400, 650);
      let endWidth = currentWidth;

      if (i > 0) {
        if (activeZone === "highway") {
          type = this.seed.choice(["straight", "curve_left", "curve_right"]);
          endWidth = this.seed.range(280, 320);
        } else if (activeZone === "city") {
          type = this.seed.choice(["straight", "curve_left", "curve_right", "s_curve_left", "s_curve_right"]);
          endWidth = this.seed.range(230, 260); // slightly narrower
        } else if (activeZone === "mountain") {
          type = this.seed.choice(["curve_left", "curve_right", "hairpin_left", "hairpin_right", "s_curve_left", "s_curve_right"]);
          endWidth = this.seed.range(230, 270);
          length = this.seed.range(350, 500); // shorter segments for winding curves
        } else if (activeZone === "bridge") {
          type = this.seed.choice(["straight", "curve_left", "curve_right"]);
          endWidth = this.seed.range(210, 230); // Narrower bridge visual/physical width
          length = this.seed.range(500, 700);
        } else if (activeZone === "tunnel") {
          type = this.seed.choice(["straight", "curve_left", "curve_right"]);
          endWidth = this.seed.range(240, 275);
          length = this.seed.range(450, 600);
        }
      }

      // Calculate path curving offsets - Mountain curves are 40% sharper!
      let endCenterX = currentCenterX;
      const isMountain = activeZone === "mountain";
      const curveMultiplier = isMountain ? 1.4 : 1.0;

      if (type === "curve_left") {
        endCenterX = currentCenterX - this.seed.range(80, 160) * curveMultiplier;
      } else if (type === "curve_right") {
        endCenterX = currentCenterX + this.seed.range(80, 160) * curveMultiplier;
      } else if (type === "hairpin_left") {
        endCenterX = currentCenterX - this.seed.range(200, 280) * curveMultiplier;
      } else if (type === "hairpin_right") {
        endCenterX = currentCenterX + this.seed.range(200, 280) * curveMultiplier;
      } else if (type === "s_curve_left") {
        endCenterX = currentCenterX - this.seed.range(80, 120) * curveMultiplier;
      } else if (type === "s_curve_right") {
        endCenterX = currentCenterX + this.seed.range(80, 120) * curveMultiplier;
      }

      // Bounds clamping for centerline path
      if (endCenterX < 180) endCenterX = 180;
      if (endCenterX > 620) endCenterX = 620;

      // 3. Interpolate Continuous Elevation slopes
      let elevationChange = 0;
      if (activeZone === "mountain") {
        elevationChange = this.seed.choice([-160, -100, 0, 100, 160]);
        // Restrict continuous climbing limits to avoid extreme clipping
        const nextElevation = currentElevation + elevationChange;
        if (nextElevation < -350) elevationChange = 100;
        if (nextElevation > 350) elevationChange = -100;
      } else if (activeZone === "tunnel") {
        elevationChange = this.seed.choice([-60, 0, 60]);
        const nextElevation = currentElevation + elevationChange;
        if (nextElevation < -200) elevationChange = 60;
        if (nextElevation > 200) elevationChange = -60;
      } else if (activeZone === "bridge") {
        elevationChange = this.seed.choice([-30, 0, 30]);
      }

      const startElevation = currentElevation;
      const endElevation = currentElevation + elevationChange;
      currentElevation = endElevation;

      // 4. Generate scenery decorations flanking the segment Y
      const scenery: SceneryObject[] = [];
      let sceneryIdCounter = 0;
      let nextSceneryY = 40;

      const isTransitionSegment = zoneCounter <= 4;
      const getZoneSceneryType = (z: "highway" | "city" | "mountain" | "bridge" | "tunnel"): SceneryObject["type"] => {
        const val = this.seed.next();
        if (z === "highway") {
          if (val < 0.12) return "billboard";
          if (val < 0.22) return "roadsign";
          if (val < 0.26) return "gasstation";
          return "tree";
        } else if (z === "city") {
          if (val < 0.65) return "building";
          if (val < 0.85) return "lamp";
          return "billboard";
        } else if (z === "mountain") {
          if (val < 0.50) return "tree"; // Pine trees
          if (val < 0.78) return "rock";
          return "cliff";
        } else if (z === "bridge") {
          if (val < 0.75) return "lamp";
          return "roadsign";
        } else { // tunnel
          return "lamp"; // simple signs or lamps inside
        }
      };

      // Locked cliff side for mountain zone to establish a canyon/drop-off feel
      const mountainCliffSide = this.seed.choice(["left", "right"] as const);

      while (nextSceneryY < length - 40) {
        let side = this.seed.choice(["left", "right"] as const);
        let scType: SceneryObject["type"] = "tree";

        if (isTransitionSegment && this.seed.next() < 0.40) {
          scType = getZoneSceneryType(nextZone);
        } else {
          scType = getZoneSceneryType(activeZone);
        }

        // Tunnels do not spawn external scenery
        if (activeZone === "tunnel" && scType !== "lamp") {
          nextSceneryY += this.seed.range(130, 220);
          continue;
        }

        // Mountain Cliff-Side Lock: cliffs/rocks on cliff side, tree/roadsign on the other (drop-off) side
        if (activeZone === "mountain" && !isTransitionSegment) {
          if (scType === "cliff" || scType === "rock") {
            side = mountainCliffSide;
          } else if (side !== mountainCliffSide) {
            scType = this.seed.next() < 0.6 ? "tree" : "roadsign";
          }
        }

        const text = scType === "billboard" ? this.seed.choice(BILLBOARD_MESSAGES) : undefined;
        
        scenery.push({
          id: `scenery-${i}-${sceneryIdCounter++}`,
          type: scType,
          side,
          offsetY: nextSceneryY,
          scale: scType === "building" ? this.seed.range(1.4, 2.5) : this.seed.range(0.85, 1.35),
          text
        });

        // Advance spacing step
        nextSceneryY += this.seed.range(130, 220);
      }

      // 5. Procedurally generate static obstacles between gates
      const obstacles: ObstacleData[] = [];
      let obstacleIdCounter = 0;

      // Determine obstacle spawn density
      let spawnChance = 0.10; // Highway
      if (activeZone === "city") spawnChance = 0.40;
      if (activeZone === "mountain") spawnChance = 0.25;
      if (activeZone === "bridge" || activeZone === "tunnel") spawnChance = 0.15;

      if (i > 0 && this.seed.next() < spawnChance && length > 350) {
        // Spawn one obstacle at 1/3 segment length
        const lane = this.seed.integerRange(0, 2);
        const type = (activeZone === "city" || activeZone === "tunnel") && this.seed.next() < 0.5 ? "barrier" : "cone";
        obstacles.push({
          id: `obs-${i}-${obstacleIdCounter++}`,
          type,
          lane,
          offsetY: length * 0.35
        });

        // Spawn a second obstacle at 2/3 length for city zones (ensure different lane for fairness!)
        if (activeZone === "city" && this.seed.next() < 0.5) {
          let lane2 = this.seed.integerRange(0, 2);
          if (lane2 === lane) lane2 = (lane + 1) % 3;
          obstacles.push({
            id: `obs-${i}-${obstacleIdCounter++}`,
            type: "cone",
            lane: lane2,
            offsetY: length * 0.7
          });
        }
      }

      // 6. Push segment metadata
      this.segments.push({
        id: `seg-${i}`,
        type,
        yStart: currentY,
        length,
        startCenterX: currentCenterX,
        endCenterX,
        startWidth: currentWidth,
        endWidth,
        zone: activeZone,
        startElevation,
        endElevation,
        challengeZone: activeChallengeZone,
        scenery,
        obstacles
      });

      // Prepare markers for subsequent segment
      currentY -= length;
      currentCenterX = endCenterX;
      currentWidth = endWidth;
    }
  }

  public getSegments(): TrackSegment[] {
    return this.segments;
  }

  public getSegmentsInYRange(yMin: number, yMax: number): TrackSegment[] {
    return this.segments.filter(seg => {
      const segMinY = seg.yStart - seg.length;
      const segMaxY = seg.yStart;
      return segMaxY >= yMin && segMinY <= yMax;
    });
  }

  public getSegmentAtY(y: number): TrackSegment | null {
    if (this.lastFoundSegment && y <= this.lastFoundSegment.yStart && y >= (this.lastFoundSegment.yStart - this.lastFoundSegment.length)) {
      return this.lastFoundSegment;
    }
    for (const seg of this.segments) {
      if (y <= seg.yStart && y >= (seg.yStart - seg.length)) {
        this.lastFoundSegment = seg;
        return seg;
      }
    }
    return null;
  }

  public getCenterXAt(y: number): number {
    const seg = this.getSegmentAtY(y);
    if (!seg) return 400;
    const progress = (seg.yStart - y) / seg.length;
    if (seg.type.includes("curve") || seg.type.includes("hairpin") || seg.type.includes("s_curve")) {
      const t = progress * progress * (3 - 2 * progress);
      return seg.startCenterX + (seg.endCenterX - seg.startCenterX) * t;
    }
    return seg.startCenterX + (seg.endCenterX - seg.startCenterX) * progress;
  }

  public getWidthAt(y: number): number {
    const seg = this.getSegmentAtY(y);
    if (!seg) return 300;
    const progress = (seg.yStart - y) / seg.length;
    return seg.startWidth + (seg.endWidth - seg.startWidth) * progress;
  }

  /**
   * Calculates continuous road elevation at a given world coordinate
   */
  public getElevationAt(y: number): number {
    const seg = this.getSegmentAtY(y);
    if (!seg) return 0;
    const progress = (seg.yStart - y) / seg.length;
    return seg.startElevation + (seg.endElevation - seg.startElevation) * progress;
  }
}
