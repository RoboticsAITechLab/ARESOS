import { MathQuestion } from "./QuestionGenerator";

export interface Gate {
  id: string;
  y: number; // Vertical road coordinate
  type: "math" | "boss" | "powerup" | "event";
  question?: MathQuestion;
  passed: boolean;
}

export class GateManager {
  private gates: Gate[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.gates = [];
  }

  public getGates(): Gate[] {
    return this.gates;
  }

  /**
   * Spawn a new gate at a specific Y coordinate
   */
  public spawnGate(id: string, y: number, type: "math" | "boss" | "powerup" | "event", question?: MathQuestion): void {
    this.gates.push({
      id,
      y,
      type,
      question,
      passed: false
    });
  }

  /**
   * Checks if the car has driven past a gate.
   * Returns any newly crossed gates.
   */
  public update(carY: number): Gate[] {
    const crossed: Gate[] = [];
    
    for (const gate of this.gates) {
      // Remember car Y decreases as it moves forward, so crossing means carY <= gate.y
      if (carY <= gate.y && !gate.passed) {
        gate.passed = true;
        crossed.push(gate);
      }
    }
    
    return crossed;
  }

  /**
   * Get the nearest active gate in front of the car (where gate.y is less than carY, i.e., further along track)
   */
  public getNextActiveGate(carY: number): Gate | null {
    // Filter gates ahead of the car that haven't been passed yet
    const ahead = this.gates.filter(g => g.y < carY && !g.passed);
    if (ahead.length === 0) return null;
    // Find the one closest to the car (the one with the largest Y coordinate, since Y decreases forward)
    return ahead.reduce((prev, curr) => (curr.y > prev.y ? curr : prev), ahead[0]);
  }

  /**
   * Delete gates that are far behind the car to conserve memory (carY is decreasing, so behind means gate.y > carY + 800)
   */
  public cleanUp(carY: number): void {
    this.gates = this.gates.filter(g => g.y <= carY + 1200);
  }
}
