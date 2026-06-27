export interface SettlementConfig {
  type: "small" | "medium" | "large";
  radius: number;
  houses: number;
}

export const SettlementConfigs: Record<string, SettlementConfig> = {
  small: { type: "small", radius: 8, houses: 3 },
  medium: { type: "medium", radius: 12, houses: 5 },
  large: { type: "large", radius: 16, houses: 7 },
};
