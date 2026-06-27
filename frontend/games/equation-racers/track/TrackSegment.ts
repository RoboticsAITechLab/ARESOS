export type SegmentType =
  | "straight"
  | "curve_left"
  | "curve_right"
  | "hairpin_left"
  | "hairpin_right"
  | "s_curve_left"
  | "s_curve_right"
  | "jump"
  | "split_path";

export interface SceneryObject {
  id: string;
  type: "tree" | "billboard" | "lamp";
  side: "left" | "right";
  offsetY: number; // relative offset Y from segment start (positive number, absolute world Y = yStart - offsetY)
  scale: number;
  text?: string;
}

export interface ObstacleData {
  id: string;
  type: "cone" | "barrier";
  lane: number; // 0 = Left, 1 = Center, 2 = Right
  offsetY: number; // relative offset Y from segment start
}

export interface TrackSegment {
  id: string;
  type: SegmentType;
  yStart: number;
  length: number;
  startCenterX: number;
  endCenterX: number;
  startWidth: number;
  endWidth: number;
  
  // Phase 6A.7 Fields
  zone: "highway" | "city" | "mountain";
  startElevation: number;
  endElevation: number;
  challengeZone: "math_rush" | null;
  scenery: SceneryObject[];
  obstacles: ObstacleData[];
}
