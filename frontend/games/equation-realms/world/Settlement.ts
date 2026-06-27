import { SettlementConfig } from "./SettlementTypes";

export interface Settlement {
  id: string;
  type: "small" | "medium" | "large";
  name: string;
  worldX: number; // Center grid X coordinate
  worldY: number; // Center grid Y coordinate
  config: SettlementConfig;
}
