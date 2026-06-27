export interface Tile {
  x: number; // grid x coordinate
  y: number; // grid y coordinate
  biome: string; // "grass" or other biomes
  walkable: boolean;
  resourceType?: string; // e.g. "tree", "rock", "none"
  zone?: string; // "forest" | "village" | "landmark" | "plains"
}
