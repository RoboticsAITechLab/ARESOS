export interface RunEvent {
  type: "correct" | "wrong" | "near_miss" | "milestone" | "coin";
  timestamp: number;
  category?: string;
  description: string;
  reactionTime?: number;
}

export class RunAnalyticsManager {
  public events: RunEvent[] = [];
  public categoryStats: Record<string, { solved: number; correct: number }> = {};
  private startTime = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.events = [];
    this.categoryStats = {};
    this.startTime = performance.now();
  }

  /**
   * Log an event into the run timeline
   */
  public logEvent(event: Omit<RunEvent, "timestamp">): void {
    const elapsedSeconds = (performance.now() - this.startTime) / 1000;
    const fullEvent: RunEvent = {
      ...event,
      timestamp: elapsedSeconds
    };
    this.events.push(fullEvent);

    // Aggregate category stats for correctness
    if (event.category && (event.type === "correct" || event.type === "wrong")) {
      if (!this.categoryStats[event.category]) {
        this.categoryStats[event.category] = { solved: 0, correct: 0 };
      }
      this.categoryStats[event.category].solved++;
      if (event.type === "correct") {
        this.categoryStats[event.category].correct++;
      }
    }
  }

  /**
   * Get accuracy percentage for a specific category
   */
  public getAccuracyForCategory(category: string): number {
    const stats = this.categoryStats[category];
    if (!stats || stats.solved === 0) return 0;
    return Math.round((stats.correct / stats.solved) * 100);
  }

  /**
   * Generates a text summary of the run performance
   */
  public getSummary(): string {
    const totalCorrect = this.events.filter(e => e.type === "correct").length;
    const totalWrong = this.events.filter(e => e.type === "wrong").length;
    const totalNearMiss = this.events.filter(e => e.type === "near_miss").length;
    const coinsCollected = this.events.filter(e => e.type === "coin").length;

    let summary = `Answers: Correct: ${totalCorrect}, Mistakes: ${totalWrong}`;
    if (totalNearMiss > 0) {
      summary += `, Near Misses: ${totalNearMiss}`;
    }
    summary += `. Coins: ${coinsCollected}.`;
    return summary;
  }
}
