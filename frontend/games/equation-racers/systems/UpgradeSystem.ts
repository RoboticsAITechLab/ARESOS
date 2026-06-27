import { UpgradeModifiers } from "../types/GameTypes";

export class UpgradeSystem {
  private baseMaxSpeed = 300;
  private baseHandling = 2.5;
  private baseMagnetRadius = 80;

  private activeUpgrades: Record<string, number> = {
    speedLevel: 0,
    handlingLevel: 0,
    magnetLevel: 0,
    armorLevel: 0
  };

  constructor(upgrades?: Record<string, number>) {
    if (upgrades) {
      this.activeUpgrades = { ...this.activeUpgrades, ...upgrades };
    }
  }

  public getUpgradeLevel(key: string): number {
    return this.activeUpgrades[key] ?? 0;
  }

  public setUpgradeLevel(key: string, level: number): void {
    this.activeUpgrades[key] = level;
  }

  public getModifiers(): UpgradeModifiers {
    const speedMultiplier = 1 + (this.activeUpgrades.speedLevel * 0.05);
    const handlingMultiplier = 1 + (this.activeUpgrades.handlingLevel * 0.04);
    const magnetRadiusAddition = this.activeUpgrades.magnetLevel * 15;

    return {
      maxSpeedMultiplier: speedMultiplier,
      handlingMultiplier: handlingMultiplier,
      magnetRadiusAddition: magnetRadiusAddition
    };
  }

  public getAppliedMaxSpeed(): number {
    return this.baseMaxSpeed * this.getModifiers().maxSpeedMultiplier;
  }

  public getAppliedHandling(): number {
    return this.baseHandling * this.getModifiers().handlingMultiplier;
  }

  public getAppliedMagnetRadius(): number {
    return this.baseMagnetRadius + this.getModifiers().magnetRadiusAddition;
  }

  public getAppliedDamageReduction(): number {
    const level = Math.min(10, this.activeUpgrades.armorLevel ?? 0);
    return level * 0.08;
  }
}
