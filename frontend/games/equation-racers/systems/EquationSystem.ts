export interface Equation {
  id: number;
  name: string;
  expression: string;
  description: string;
  speedMultiplier: number;
  scoreMultiplier: number;
  magneticRadius: number;
  damageReduction: number;
}

export const EQUATIONS: Record<number, Equation> = {
  1: {
    id: 1,
    name: "Linear [x]",
    expression: "y = x",
    description: "Balanced Mode: Stable handling, normal speed.",
    speedMultiplier: 1.0,
    scoreMultiplier: 1.0,
    magneticRadius: 80,
    damageReduction: 0.0,
  },
  2: {
    id: 2,
    name: "Velocity [2x]",
    expression: "y = 2x",
    description: "Velocity Mode: Extreme speed, high scoring, but difficult to steer.",
    speedMultiplier: 1.7,
    scoreMultiplier: 2.5,
    magneticRadius: 80,
    damageReduction: 0.0,
  },
  3: {
    id: 3,
    name: "Quadratic [x²]",
    expression: "y = x²",
    description: "Drift Mode: Drift physics. Sliding momentum yields curve score bonuses.",
    speedMultiplier: 1.2,
    scoreMultiplier: 1.5,
    magneticRadius: 100,
    damageReduction: 0.1,
  },
  4: {
    id: 4,
    name: "Wave [sin(x)]",
    expression: "y = sin(x)",
    description: "Wave Mode: Automatic wave patterns, wide coin magnet.",
    speedMultiplier: 0.9,
    scoreMultiplier: 1.2,
    magneticRadius: 220, // Huge magnet!
    damageReduction: 0.0,
  },
  5: {
    id: 5,
    name: "Precision [cos(x)]",
    expression: "y = cos(x)",
    description: "Precision Mode: Sharper turning response, takes 50% less collision damage.",
    speedMultiplier: 1.1,
    scoreMultiplier: 1.0,
    magneticRadius: 80,
    damageReduction: 0.5, // 50% damage reduction!
  },
};

export class EquationSystem {
  private activeEquationId = 1;

  public getActive(): Equation {
    return EQUATIONS[this.activeEquationId];
  }

  public setActive(id: number): void {
    if (EQUATIONS[id]) {
      this.activeEquationId = id;
    }
  }
}
