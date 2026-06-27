import { ObjectPool } from "./ObjectPool";
import { Enemy, EnemyConfigs, EnemyConfig } from "../entities/Enemy";
import { WaveDirector } from "./WaveDirector";
import { ChunkManager } from "../world/ChunkManager";
import { WorldConfig } from "../world/WorldConfig";

export class EnemySpawnSystem {
  private scene: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;
  private chunkManager: ChunkManager;
  private waveDirector: WaveDirector;
  private enemyPool: ObjectPool<Enemy>;
  private activeEnemies: Enemy[] = [];
  
  private spawnTimerEvent!: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite, chunkManager: ChunkManager, waveDirector: WaveDirector) {
    this.scene = scene;
    this.player = player;
    this.chunkManager = chunkManager;
    this.waveDirector = waveDirector;

    // Create high-performance enemy pool
    this.enemyPool = new ObjectPool<Enemy>(
      () => new Enemy(this.scene),
      (enemy) => {
        enemy.setActive(false);
        enemy.setVisible(false);
      }
    );

    // Initial spawn timer loop
    this.startSpawnLoop();
  }

  private startSpawnLoop(): void {
    const config = this.waveDirector.getWaveConfig();
    this.spawnTimerEvent = this.scene.time.addEvent({
      delay: config.spawnInterval,
      callback: this.attemptSpawn,
      callbackScope: this,
      loop: true,
    });
  }

  // Adjusts spawn timer speeds if difficulty interval changed
  public updateSpawnTimer(): void {
    const config = this.waveDirector.getWaveConfig();
    if (this.spawnTimerEvent && this.spawnTimerEvent.delay !== config.spawnInterval) {
      this.spawnTimerEvent.destroy();
      this.startSpawnLoop();
    }
  }

  private attemptSpawn(): void {
    if (!this.player || !this.player.active) return;

    const waveConfig = this.waveDirector.getWaveConfig();
    
    // Respect max active enemy limits
    if (this.activeEnemies.length >= waveConfig.maxEnemies) return;

    // Choose spawn coordinate in a ring outside camera viewport (e.g. 380 - 550 pixels away)
    const angle = Math.random() * Math.PI * 2;
    const distance = 380 + Math.random() * 170;
    const sx = this.player.x + Math.cos(angle) * distance;
    const sy = this.player.y + Math.sin(angle) * distance;

    // Respect chunk manager: only spawn in active, loaded chunks
    if (!this.isPositionInLoadedChunk(sx, sy)) return;

    // Pick random allowed type from WaveDirector
    const allowedTypes = waveConfig.allowedTypes;
    const chosenType = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
    const enemyConfig = EnemyConfigs[chosenType];

    if (!enemyConfig) return;

    // Get from pool and spawn
    const enemy = this.enemyPool.get();
    enemy.spawn(sx, sy, enemyConfig, this.player);
    this.activeEnemies.push(enemy);
  }

  private isPositionInLoadedChunk(x: number, y: number): boolean {
    const chunkWidth = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE; // 1024
    const cx = Math.floor(x / chunkWidth);
    const cy = Math.floor(y / chunkWidth);

    const loadedMap = this.chunkManager.getLoadedChunks();
    const key = `${cx},${cy}`;
    return loadedMap.has(key);
  }

  public update(): void {
    // 1. Clean up dead enemies or enemies that are too far away
    const maxDespawnDist = 680;
    
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];

      if (!enemy.active || enemy.aiState === "DEAD") {
        // Just remove from active tracking; enemy handles its own alpha/disable in die()
        this.activeEnemies.splice(i, 1);
        continue;
      }

      // Check distance for auto-despawn
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist > maxDespawnDist) {
        // Despawn off-screen enemy to save physics
        this.activeEnemies.splice(i, 1);
        this.enemyPool.release(enemy);
        console.log("SpawnSystem: Despawned off-screen enemy to optimize performance.");
      }
    }

    // Keep spawn timer updated
    this.updateSpawnTimer();
  }

  public getActiveEnemies(): Enemy[] {
    return this.activeEnemies;
  }

  public getActiveEnemiesCount(): number {
    return this.activeEnemies.length;
  }

  // Force despawn all on transition/death/reset
  public clearAll(): void {
    for (const enemy of this.activeEnemies) {
      this.enemyPool.release(enemy);
    }
    this.activeEnemies = [];
    this.enemyPool.clear();
    if (this.spawnTimerEvent) {
      this.spawnTimerEvent.destroy();
    }
  }
}
