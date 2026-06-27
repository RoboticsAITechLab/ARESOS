import { EquationSystem } from "./core/EquationSystem";
import { Vehicle } from "./vehicle/Vehicle";
import { VehicleController } from "./vehicle/VehicleController";
import { TrackGenerator } from "./track/TrackGenerator";
import { CoinSystem } from "./systems/CoinSystem";
import { ObstacleSystem } from "./systems/ObstacleSystem";
import { ScoreSystem } from "./systems/ScoreSystem";
import { ReplayEngine } from "./core/ReplayEngine";
import { GhostEngine } from "./core/GhostEngine";
import { SimulationEngine } from "./core/SimulationEngine";
import { TrackSeed } from "./track/TrackSeed";
import { SaveManager } from "./storage/SaveManager";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testParser() {
  console.log("--- Testing Parser & Registries ---");
  const eqSys = EquationSystem.createDefault();

  // Test standard cases
  const c30 = eqSys.compile("30");
  assert(eqSys.evaluate(c30, { t: 0 }) === 30, "30 evaluated incorrectly");

  const cLinear = eqSys.compile("30 + t");
  assert(eqSys.evaluate(cLinear, { t: 5 }) === 35, "30+t evaluated incorrectly");

  const cSin = eqSys.compile("sin(t)");
  assert(Math.abs(eqSys.evaluate(cSin, { t: Math.PI / 2 }) - 1) < 1e-6, "sin(t) evaluated incorrectly");

  const cCos = eqSys.compile("cos(t)");
  assert(Math.abs(eqSys.evaluate(cCos, { t: 0 }) - 1) < 1e-6, "cos(t) evaluated incorrectly");

  const cCompound = eqSys.compile("30 + 5 * sin(t)");
  assert(Math.abs(eqSys.evaluate(cCompound, { t: Math.PI / 2 }) - 35) < 1e-6, "30+5*sin(t) evaluated incorrectly");

  // Test dynamic registry extension (obs_x, obs_y, distance, x, y)
  const vr = eqSys.variableRegistry;
  vr.registerVariable("coin_x", (ctx) => ctx.coin_x);
  vr.registerVariable("x", (ctx) => ctx.x);

  const cCustomVar = eqSys.compile("(coin_x - x) * 0.05");
  assert(
    Math.abs(eqSys.evaluate(cCustomVar, { coin_x: 100, x: 20, t: 0 }) - 4) < 1e-6,
    "Custom variable resolver expression failed"
  );

  // Test validation error handling
  assert(eqSys.validate("30 + *").valid === false, "Failed to reject invalid syntax '30 + *'");
  assert(eqSys.validate("hack()").valid === false, "Failed to reject unregistered function 'hack()'");
  assert(eqSys.validate("abc + 5").valid === false, "Failed to reject unregistered variable 'abc'");

  // Test runtime errors (division by zero)
  try {
    const cDivZero = eqSys.compile("10 / (t - t)");
    eqSys.evaluate(cDivZero, { t: 5 });
    assert(false, "Failed to catch division by zero");
  } catch (e: any) {
    assert(e.message.includes("Division by zero"), "Unexpected error message for division by zero: " + e.message);
  }

  // Test graph generation
  const graphPoints = eqSys.generateGraphData("30 + 5 * sin(t)", 0, 2, 0.5);
  assert(graphPoints.length === 5, "Graph points length mismatch");
  assert(Math.abs(graphPoints[0].y - 30) < 1e-6, "Graph point 0 incorrect");
  assert(Math.abs(graphPoints[2].y - 34.2) < 0.1, "Graph point 2 incorrect"); // t=1 => sin(1) approx 0.8415 => 30 + 4.2 = 34.2

  console.log("Parser & Registries passed all tests.");
}

function testDeterminismAndReplay() {
  console.log("--- Testing Simulation Determinism & Replay Compression ---");

  const seedVal = 918237;
  const speedExpr = "150 + 50 * sin(t)";
  const steerExpr = "cos(t) * 0.1";

  // Create Run A
  const eqSysA = EquationSystem.createDefault();
  const carA = new Vehicle({ x: 400, y: 0 });
  const controllerA = new VehicleController(eqSysA, speedExpr, steerExpr);
  const trackA = new TrackGenerator(seedVal);
  trackA.generate(20);
  const coinsA = new CoinSystem(new TrackSeed(seedVal));
  coinsA.spawnCoins(trackA);
  const obsA = new ObstacleSystem(new TrackSeed(seedVal));
  obsA.spawnObstacles(trackA);
  const scoreA = new ScoreSystem();
  const replayA = new ReplayEngine(seedVal, "1.0.0", { speed: speedExpr, steer: steerExpr });
  
  const simA = new SimulationEngine(seedVal, carA, controllerA, trackA, coinsA, obsA, scoreA, eqSysA, replayA);

  // Create Run B
  const eqSysB = EquationSystem.createDefault();
  const carB = new Vehicle({ x: 400, y: 0 });
  const controllerB = new VehicleController(eqSysB, speedExpr, steerExpr);
  const trackB = new TrackGenerator(seedVal);
  trackB.generate(20);
  const coinsB = new CoinSystem(new TrackSeed(seedVal));
  coinsB.spawnCoins(trackB);
  const obsB = new ObstacleSystem(new TrackSeed(seedVal));
  obsB.spawnObstacles(trackB);
  const scoreB = new ScoreSystem();
  const replayB = new ReplayEngine(seedVal, "1.0.0", { speed: speedExpr, steer: steerExpr });
  
  const simB = new SimulationEngine(seedVal, carB, controllerB, trackB, coinsB, obsB, scoreB, eqSysB, replayB);

  // Run both simulations for 100 updates
  simA.start();
  simB.start();
  for (let i = 0; i < 100; i++) {
    simA.update(1 / 60);
    simB.update(1 / 60);
  }

  // Assert exact determinism
  const stateA = carA.getState();
  const stateB = carB.getState();
  assert(stateA.position.x === stateB.position.x, "Determinism failed on position.x");
  assert(stateA.position.y === stateB.position.y, "Determinism failed on position.y");
  assert(stateA.speed === stateB.speed, "Determinism failed on speed");
  assert(scoreA.getScore() === scoreB.getScore(), "Determinism failed on score");

  console.log(`Final Y: ${stateA.position.y.toFixed(2)}, Score: ${scoreA.getScore()}`);

  // Test Replay Serialization & Decompression/Interpolation
  const serializedReplay = replayA.serialize();
  const replayObj = JSON.parse(serializedReplay);
  assert(replayObj.version === 1, "Serialized replay version mismatch");
  assert(replayObj.keyframes.length > 0, "Keyframes list empty");
  assert(replayObj.deltas.length > 0, "Deltas list empty");

  // Reconstruct path via GhostEngine
  const ghost = new GhostEngine(serializedReplay);
  assert(ghost.getReconstructedFramesCount() === 100, "Ghost frame reconstruction count incorrect");

  // Query and interpolate coordinate at t=1.234
  const interpolatedPos = ghost.getPositionAt(1.234);
  assert(interpolatedPos !== null, "Ghost failed to interpolate position");
  console.log(`Ghost interpolated position at t=1.234: (${interpolatedPos?.x.toFixed(2)}, ${interpolatedPos?.y.toFixed(2)})`);

  console.log("Determinism & Replay Compression passed all tests.");
}

function testSaveMigrations() {
  console.log("--- Testing Save Versioning & Migrations ---");
  if (typeof window === "undefined") {
    // Mock local storage to execute node tests successfully
    const mockStorage: Record<string, string> = {};
    (global as any).localStorage = {
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      getItem: (key: string) => mockStorage[key] || null,
      removeItem: (key: string) => { delete mockStorage[key]; }
    };
  }

  // Save V1 structure
  const testData = { name: "Champion Racer", score: 999 };
  SaveManager.save("test_profile", testData);

  // Load V1 structure without migration
  const loaded = SaveManager.load("test_profile", (data) => data);
  assert(loaded !== null && loaded.score === 999, "SaveManager load failed");

  // Test migration from V0 (simulating raw object in localStorage)
  localStorage.setItem("old_profile", JSON.stringify({ version: 0, data: { pilotName: "V0 Pilot", highscore: 150 } }));
  
  const migrated = SaveManager.load<{ name: string; score: number }>("old_profile", (loadedData, version) => {
    assert(version === 0, "Migration trigger version mismatch");
    return {
      name: loadedData.pilotName,
      score: loadedData.highscore
    };
  });

  assert(migrated !== null, "Migration returned null");
  assert(migrated?.name === "V0 Pilot", "Migration property renaming failed");
  assert(migrated?.score === 150, "Migration value translation failed");

  console.log("Save system migrations passed all tests.");
}

export function runSuite() {
  try {
    testParser();
    testDeterminismAndReplay();
    testSaveMigrations();
    console.log("\n====================================");
    console.log("  ALL FOUNDATION TESTS PASSED OK!   ");
    console.log("====================================\n");
  } catch (error: any) {
    console.error("Test suite failed:", error.message);
    process.exit(1);
  }
}

// Automatically run suite if script executed directly
if (require.main === module) {
  runSuite();
}
