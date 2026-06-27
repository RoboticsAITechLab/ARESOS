import { WorldConfig } from "./WorldConfig";
import { Tile } from "./Tile";
import { TerrainGenerator } from "./TerrainGenerator";
import { AssetRegistry } from "../systems/AssetRegistry";

export interface Chunk {
  x: number; // chunk grid coordinate
  y: number; // chunk grid coordinate
  container: Phaser.GameObjects.Container;
  tiles: Tile[];
  obstacles: Phaser.Physics.Arcade.Sprite[];
}

export class ChunkManager {
  private scene: Phaser.Scene;
  private seed: number;
  private terrainGenerator: TerrainGenerator;
  private obstacleGroup: Phaser.Physics.Arcade.StaticGroup;
  private loadedChunks: Map<string, Chunk> = new Map();
  private loadRadius = 1; // 3x3 grid around player (each chunk is 1024x1024 px)

  constructor(scene: Phaser.Scene, seed: number, obstacleGroup: Phaser.Physics.Arcade.StaticGroup) {
    this.scene = scene;
    this.seed = seed;
    this.terrainGenerator = new TerrainGenerator(seed);
    this.obstacleGroup = obstacleGroup;
  }

  // Returns chunk key string for a given coordinate
  private getChunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  // Checks and updates chunks based on player pixel position
  public update(playerPixelX: number, playerPixelY: number): void {
    const chunkWidth = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE; // 1024
    const chunkHeight = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE; // 1024

    const currentCx = Math.floor(playerPixelX / chunkWidth);
    const currentCy = Math.floor(playerPixelY / chunkHeight);

    const activeKeys = new Set<string>();

    // Determine chunks that should be loaded
    for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
      for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
        const cx = currentCx + dx;
        const cy = currentCy + dy;
        const key = this.getChunkKey(cx, cy);
        activeKeys.add(key);

        if (!this.loadedChunks.has(key)) {
          this.loadChunk(cx, cy);
        }
      }
    }

    // Unload chunks that are no longer active
    for (const [key, chunk] of this.loadedChunks.entries()) {
      if (!activeKeys.has(key)) {
        this.unloadChunk(key, chunk);
      }
    }
  }

  // Clean Grass: 96% is flat grass (tile_01). 4% has details (flower, mushrooms, etc.)
  private getGrassTexture(wx: number, wy: number): string {
    if (!this.scene.textures.exists("tile_01")) {
      return AssetRegistry.GRASS;
    }
    const noiseDetail = Math.abs(Math.sin(wx * 12.3 + wy * 37.7)) % 1;
    if (noiseDetail > 0.96) {
      const variants = ["tile_02", "tile_03", "tile_04"];
      const index = Math.floor(noiseDetail * 100) % variants.length;
      return variants[index];
    }
    return "tile_01"; // flat grass base
  }

  private getPathTexture(wx: number, wy: number): string {
    if (!this.scene.textures.exists("tile_05")) {
      return AssetRegistry.GRASS;
    }
    const variants = ["tile_05", "tile_06", "tile_07", "tile_08", "tile_09"];
    const index = Math.abs((wx * 11 + wy * 23) % variants.length);
    return variants[index];
  }

  private getTreeTexture(wx: number, wy: number): string {
    if (!this.scene.textures.exists("tile_131")) {
      return AssetRegistry.TREE;
    }
    const variants = ["tile_131", "tile_132"];
    const index = Math.abs((wx * 7 + wy * 19) % variants.length);
    return variants[index];
  }

  private getRockTexture(wx: number, wy: number): string {
    if (!this.scene.textures.exists("tile_100")) {
      return AssetRegistry.ROCK;
    }
    const variants = [
      "tile_100",
      "tile_101",
      "tile_102",
      "tile_103",
      "tile_104",
      "tile_105",
      "tile_106",
      "tile_107",
    ];
    const index = Math.abs((wx * 13 + wy * 29) % variants.length);
    return variants[index];
  }

  // Generates and loads a chunk
  private loadChunk(cx: number, cy: number): void {
    const chunkWidth = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE;
    const chunkHeight = WorldConfig.CHUNK_SIZE * WorldConfig.TILE_SIZE;
    const startTileX = cx * WorldConfig.CHUNK_SIZE;
    const startTileY = cy * WorldConfig.CHUNK_SIZE;

    // Query landmark system and settlement generator at chunk start to make them available across all scopes
    const landmarkSystem = (this.scene as any).landmarkSystem;
    const settlementGenerator = (this.scene as any).settlementGenerator;

    // Create a Phaser Container for all visual objects in this chunk
    const container = this.scene.add.container(cx * chunkWidth, cy * chunkHeight);

    const tiles: Tile[] = [];
    const obstacles: Phaser.Physics.Arcade.Sprite[] = [];

    // 1. Generate all ground tiles and analyze roads/settlements/landmarks first (Roads/Locations First!)
    const groundGrids: {
      worldX: number;
      worldY: number;
      pixelX: number;
      pixelY: number;
      tileData: Tile;
      groundTexture: string;
      isPath: boolean;
      landmarkTile: any;
      settlementTile: any;
    }[][] = [];

    for (let lx = 0; lx < WorldConfig.CHUNK_SIZE; lx++) {
      groundGrids[lx] = [];
      for (let ly = 0; ly < WorldConfig.CHUNK_SIZE; ly++) {
        const worldX = startTileX + lx;
        const worldY = startTileY + ly;
        const tileData = this.terrainGenerator.getTileAt(worldX, worldY);

        const pixelX = lx * WorldConfig.TILE_SIZE + WorldConfig.TILE_SIZE / 2;
        const pixelY = ly * WorldConfig.TILE_SIZE + WorldConfig.TILE_SIZE / 2;

        // Snaking path equations: creates continuous, beautiful winding roadways
        const pathCenter = Math.sin(worldX * 0.06) * 16 + Math.cos(worldX * 0.02) * 8;
        const distToPath = Math.abs(worldY - pathCenter);
        const isPath = distToPath < 2.5; // ~5 tiles wide roadway

        let groundTexture = this.getGrassTexture(worldX, worldY);
        if (isPath) {
          groundTexture = this.getPathTexture(worldX, worldY);
          tileData.resourceType = "none";
          tileData.walkable = true;
        }

        // Query landmark placement
        const landmarkTile = landmarkSystem ? landmarkSystem.getLandmarkTile(worldX, worldY) : null;

        // Query settlement placement
        const settlementTile = settlementGenerator ? settlementGenerator.getSettlementTile(worldX, worldY) : null;

        if (landmarkTile) {
          if (landmarkTile.role === "floor" || landmarkTile.role === "pedestal" || landmarkTile.role === "base") {
            groundTexture = "tile_05"; // dirt pathway texture for stone floor look
          }
          tileData.walkable = landmarkTile.walkable;
          if (!landmarkTile.walkable) {
            tileData.resourceType = "landmark";
          }
        } else if (settlementTile) {
          if (settlementTile.role === "town_center_core" || settlementTile.role === "town_center_base" || settlementTile.role.startsWith("house") || settlementTile.role === "road") {
            groundTexture = "tile_05"; // paved flooring or road
          } else if (settlementTile.role === "market_ground") {
            groundTexture = "tile_06"; // paved market pathway
          }
          tileData.walkable = settlementTile.walkable;
          if (!settlementTile.walkable) {
            tileData.resourceType = "settlement";
          }
        }

        groundGrids[lx][ly] = {
          worldX,
          worldY,
          pixelX,
          pixelY,
          tileData,
          groundTexture,
          isPath,
          landmarkTile,
          settlementTile
        };
      }
    }

    // 2. Determine Zone of the Chunk
    const chunkZone = this.terrainGenerator.getZoneAt(startTileX, startTileY);

    // 3. Cluster Generation algorithm for trees and rocks
    // Seeded random helper
    let h = this.seed ^ (cx * 18437) ^ (cy * 68311);
    const rand = () => {
      h = Math.sin(h) * 10000;
      return h - Math.floor(h);
    };

    const hasTree = Array.from({ length: 32 }, () => new Array(32).fill(false));
    const hasRock = Array.from({ length: 32 }, () => new Array(32).fill(false));

    // Generate clusters based on zone
    if (chunkZone === "forest") {
      // Forest: 70% Trees, 20% Empty, 10% Rocks. Spawn 3-4 tree clusters, 1-2 rock clusters
      const treeClustersCount = 3 + Math.floor(rand() * 2);
      for (let c = 0; c < treeClustersCount; c++) {
        const cxLoc = Math.floor(rand() * 32);
        const cyLoc = Math.floor(rand() * 32);
        const radius = 4 + Math.floor(rand() * 4); // radius 4-7 tiles
        
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const tx = cxLoc + dx;
            const ty = cyLoc + dy;
            if (tx >= 0 && tx < 32 && ty >= 0 && ty < 32) {
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist <= radius && rand() < 0.75) {
                // Check distance rule: Tree-Tree min 1 tile
                let canPlace = true;
                for (let nx = -1; nx <= 1; nx++) {
                  for (let ny = -1; ny <= 1; ny++) {
                    const ntx = tx + nx;
                    const nty = ty + ny;
                    if (ntx >= 0 && ntx < 32 && nty >= 0 && nty < 32) {
                      if (hasTree[ntx][nty]) canPlace = false;
                    }
                  }
                }
                if (canPlace) {
                  hasTree[tx][ty] = true;
                }
              }
            }
          }
        }
      }

      const rockClustersCount = 1 + Math.floor(rand() * 2);
      for (let c = 0; c < rockClustersCount; c++) {
        const cxLoc = Math.floor(rand() * 32);
        const cyLoc = Math.floor(rand() * 32);
        const radius = 2 + Math.floor(rand() * 2); // radius 2-3 tiles
        
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const tx = cxLoc + dx;
            const ty = cyLoc + dy;
            if (tx >= 0 && tx < 32 && ty >= 0 && ty < 32) {
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist <= radius && rand() < 0.5 && !hasTree[tx][ty]) {
                // Check distance rule: Rock-Rock min 2 tiles
                let canPlace = true;
                for (let nx = -2; nx <= 2; nx++) {
                  for (let ny = -2; ny <= 2; ny++) {
                    const ntx = tx + nx;
                    const nty = ty + ny;
                    if (ntx >= 0 && ntx < 32 && nty >= 0 && nty < 32) {
                      if (hasRock[ntx][nty]) canPlace = false;
                    }
                  }
                }
                if (canPlace) {
                  hasRock[tx][ty] = true;
                }
              }
            }
          }
        }
      }
    } else if (chunkZone === "plains" || chunkZone === "village" || chunkZone === "landmark") {
      // Open Plains/Village/Landmark: 90% Open, very few trees/rocks
      // Spawn 1 small tree cluster and 1 small rock cluster with 40% chance
      const treeClustersCount = rand() < 0.4 ? 1 : 0;
      for (let c = 0; c < treeClustersCount; c++) {
        const cxLoc = Math.floor(rand() * 32);
        const cyLoc = Math.floor(rand() * 32);
        const radius = 1 + Math.floor(rand() * 2); // radius 1-2 tiles
        
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const tx = cxLoc + dx;
            const ty = cyLoc + dy;
            if (tx >= 0 && tx < 32 && ty >= 0 && ty < 32) {
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist <= radius && rand() < 0.4) {
                let canPlace = true;
                for (let nx = -1; nx <= 1; nx++) {
                  for (let ny = -1; ny <= 1; ny++) {
                    const ntx = tx + nx;
                    const nty = ty + ny;
                    if (ntx >= 0 && ntx < 32 && nty >= 0 && nty < 32) {
                      if (hasTree[ntx][nty]) canPlace = false;
                    }
                  }
                }
                if (canPlace) {
                  hasTree[tx][ty] = true;
                }
              }
            }
          }
        }
      }

      const rockClustersCount = rand() < 0.4 ? 1 : 0;
      for (let c = 0; c < rockClustersCount; c++) {
        const cxLoc = Math.floor(rand() * 32);
        const cyLoc = Math.floor(rand() * 32);
        const radius = 1 + Math.floor(rand() * 2); // radius 1-2 tiles
        
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const tx = cxLoc + dx;
            const ty = cyLoc + dy;
            if (tx >= 0 && tx < 32 && ty >= 0 && ty < 32) {
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist <= radius && rand() < 0.3 && !hasTree[tx][ty]) {
                let canPlace = true;
                for (let nx = -2; nx <= 2; nx++) {
                  for (let ny = -2; ny <= 2; ny++) {
                    const ntx = tx + nx;
                    const nty = ty + ny;
                    if (ntx >= 0 && ntx < 32 && nty >= 0 && nty < 32) {
                      if (hasRock[ntx][nty]) canPlace = false;
                    }
                  }
                }
                if (canPlace) {
                  hasRock[tx][ty] = true;
                }
              }
            }
          }
        }
      }
    }

    // 4. Render and spawn final tiles and obstacles
    for (let lx = 0; lx < WorldConfig.CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < WorldConfig.CHUNK_SIZE; ly++) {
        const gridInfo = groundGrids[lx][ly];
        const { worldX, worldY, pixelX, pixelY, tileData, groundTexture, isPath, landmarkTile, settlementTile } = gridInfo;

        // Render Ground
        const groundImg = this.scene.add.image(pixelX, pixelY, groundTexture);
        groundImg.setOrigin(0.5);
        container.add(groundImg);

        // Apply reservation checks & clearings:
        // A. No spawning on road pathways
        // B. No spawning inside village radius (settlementTile is not null)
        // C. No spawning near landmark (within 8 tiles of landmark center)
        let isCleared = isPath || (settlementTile !== null);

        const cellX = Math.floor(worldX / 128);
        const cellY = Math.floor(worldY / 128);
        const cellLandmark = landmarkSystem ? landmarkSystem.getLandmarkInCell(cellX, cellY) : null;
        if (cellLandmark) {
          const distToLandmark = Math.max(Math.abs(worldX - cellLandmark.worldX), Math.abs(worldY - cellLandmark.worldY));
          if (distToLandmark <= 8) {
            isCleared = true; // Clear 8-tile radius around landmark!
          }
        }

        // D. Clear starting zone at the origin (0, 0)
        if (Math.abs(worldX) <= 2 && Math.abs(worldY) <= 2) {
          isCleared = true;
        }

        // Apply resource placement overrides
        if (!isCleared) {
          if (hasTree[lx][ly]) {
            tileData.resourceType = "tree";
            tileData.walkable = false;
          } else if (hasRock[lx][ly]) {
            tileData.resourceType = "rock";
            tileData.walkable = false;
          }
        }

        tiles.push(tileData);

        // Spawn obstacles
        if (landmarkTile && !landmarkTile.walkable) {
          const absolutePixelX = cx * chunkWidth + pixelX;
          const absolutePixelY = cy * chunkHeight + pixelY;
          
          let obstacleTexture = "tile_120"; // standard stone wall block
          let tintColor = 0xffffff;
          let scaleVal = 1;

          if (landmarkTile.landmark.type === "prime_pillar") {
            obstacleTexture = "tile_120";
            if (landmarkTile.role === "pillar_core") {
              obstacleTexture = "tile_131"; // tree pillar look
              tintColor = 0x00ffff; // neon cyan glowing pillar!
              scaleVal = 3.0; // grand scale 3x
            } else if (landmarkTile.role === "pedestal") {
              scaleVal = 1.5;
              tintColor = 0x558888;
            }
          } else if (landmarkTile.landmark.type === "crystal_cluster") {
            obstacleTexture = "tile_100";
            tintColor = 0x00ffff; // cyan glowing crystals
            if (landmarkTile.role === "crystal_core") {
              tintColor = 0xff00ff; // purple main crystal core
              scaleVal = 3.0; // grand scale 3x
            } else if (landmarkTile.role === "crystal") {
              scaleVal = 1.8;
              tintColor = 0x00ffff;
            }
          } else if (landmarkTile.landmark.type === "ancient_obelisk") {
            obstacleTexture = "tile_120";
            if (landmarkTile.role === "obelisk") {
              obstacleTexture = "tile_100"; // large rock obelisk
              scaleVal = 3.0; // grand scale 3x
              tintColor = 0x9933ff; // magical purple obelisk glow
            } else if (landmarkTile.role === "base") {
              scaleVal = 1.5;
              tintColor = 0x333333;
            }
          } else if (landmarkTile.landmark.type === "broken_gateway") {
            obstacleTexture = "tile_120";
            if (landmarkTile.role === "gateway_pillar") {
              scaleVal = 2.8; // grand scale 2.8x
              tintColor = 0x55ff55; // mossy green archway pillars
            }
          }

          const landmarkSprite = this.scene.physics.add.sprite(absolutePixelX, absolutePixelY, obstacleTexture);
          landmarkSprite.setImmovable(true);
          landmarkSprite.setScale(scaleVal);
          if (tintColor !== 0xffffff) {
            landmarkSprite.setTint(tintColor);
          }
          
          const landmarkBody = landmarkSprite.body as Phaser.Physics.Arcade.Body;
          landmarkBody.setSize(24, 24);
          landmarkBody.setOffset(4, 4);

          this.obstacleGroup.add(landmarkSprite);
          obstacles.push(landmarkSprite);
        } else if (settlementTile && !settlementTile.walkable) {
          // Spawn Village buildings obstacles ONLY at the center of the footprints (no noisy repeats!)
          if (settlementTile.role === "town_center_core" || settlementTile.role === "house_center") {
            const absolutePixelX = cx * chunkWidth + pixelX;
            const absolutePixelY = cy * chunkHeight + pixelY;
            
            let obstacleTexture = "tile_120"; // default wall block
            let tintColor = 0xffffff;
            const scaleVal = 3.5; // grand building scale!

            if (settlementTile.role === "town_center_core") {
              obstacleTexture = "tile_120";
              tintColor = 0xeab308; // golden center pillar
            } else if (settlementTile.role === "house_center") {
              obstacleTexture = "tile_126"; // roof tile structure
            }

            const settlementSprite = this.scene.physics.add.sprite(absolutePixelX, absolutePixelY, obstacleTexture);
            settlementSprite.setImmovable(true);
            settlementSprite.setScale(scaleVal);
            if (tintColor !== 0xffffff) {
              settlementSprite.setTint(tintColor);
            }
            
            const settlementBody = settlementSprite.body as Phaser.Physics.Arcade.Body;
            settlementBody.setSize(96 / scaleVal, 96 / scaleVal);
            settlementBody.setOffset((32 - 96 / scaleVal) / 2, (32 - 96 / scaleVal) / 2);

            this.obstacleGroup.add(settlementSprite);
            obstacles.push(settlementSprite);
          }
        } else if (tileData.resourceType === "tree") {
          const absolutePixelX = cx * chunkWidth + pixelX;
          const absolutePixelY = cy * chunkHeight + pixelY;
          
          const treeTexture = this.getTreeTexture(worldX, worldY);
          const treeSprite = this.scene.physics.add.sprite(absolutePixelX, absolutePixelY, treeTexture);
          treeSprite.setImmovable(true);
          
          const treeBody = treeSprite.body as Phaser.Physics.Arcade.Body;
          treeBody.setSize(18, 12);
          treeBody.setOffset(7, 20);
          
          this.obstacleGroup.add(treeSprite);
          obstacles.push(treeSprite);
        } else if (tileData.resourceType === "rock") {
          const absolutePixelX = cx * chunkWidth + pixelX;
          const absolutePixelY = cy * chunkHeight + pixelY;
          
          const rockTexture = this.getRockTexture(worldX, worldY);
          const rockSprite = this.scene.physics.add.sprite(absolutePixelX, absolutePixelY, rockTexture);
          rockSprite.setImmovable(true);
          
          const rockBody = rockSprite.body as Phaser.Physics.Arcade.Body;
          rockBody.setSize(24, 20);
          rockBody.setOffset(4, 8);
  
          this.obstacleGroup.add(rockSprite);
          obstacles.push(rockSprite);
        }
      }
    }

    const key = this.getChunkKey(cx, cy);
    this.loadedChunks.set(key, {
      x: cx,
      y: cy,
      container,
      tiles,
      obstacles,
    });
  }

  // Unloads and destroys a chunk
  private unloadChunk(key: string, chunk: Chunk): void {
    chunk.container.destroy();

    // Destroy obstacles and remove from physical world
    for (const obstacle of chunk.obstacles) {
      if (obstacle && obstacle.active) {
        this.obstacleGroup.remove(obstacle, true, true);
      }
    }

    this.loadedChunks.delete(key);
  }

  public getLoadedChunksCount(): number {
    return this.loadedChunks.size;
  }

  public getLoadedChunks(): Map<string, Chunk> {
    return this.loadedChunks;
  }

  public clearAll(): void {
    for (const [key, chunk] of this.loadedChunks.entries()) {
      this.unloadChunk(key, chunk);
    }
    this.loadedChunks.clear();
  }
}
