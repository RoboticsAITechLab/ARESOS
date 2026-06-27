export interface SaveData {
  highScore: number;
  coins: number;
  xp: number;
  statistics: {
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    accuracy: number;
    bestCombo: number;
    distanceTravelled: number;
  };
  garage: {
    ownedSkins: string[];
    equippedSkin: string;
  };
  settings: {
    mute: boolean;
    sfxVolume: number;
    musicVolume: number;
    largeTextMode: boolean;
    colorblindHighlighting: boolean;
    reduceMotion: boolean;
    learningMode: boolean;
  };
}

const LOCAL_STORAGE_KEY = "math_racer_evolution_save";

const DEFAULT_SAVE_DATA: SaveData = {
  highScore: 0,
  coins: 0,
  xp: 0,
  statistics: {
    totalQuestions: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    accuracy: 0,
    bestCombo: 0,
    distanceTravelled: 0
  },
  garage: {
    ownedSkins: ["default"],
    equippedSkin: "default"
  },
  settings: {
    mute: false,
    sfxVolume: 80,
    musicVolume: 50,
    largeTextMode: false,
    colorblindHighlighting: false,
    reduceMotion: false,
    learningMode: true
  }
};

export class SaveManager {
  private activeData: SaveData = { ...DEFAULT_SAVE_DATA };

  constructor() {
    this.load();
  }

  /**
   * Loads save data from LocalStorage
   */
  public load(): SaveData {
    if (typeof window === "undefined") return DEFAULT_SAVE_DATA;

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.activeData = {
          highScore: data.highScore ?? DEFAULT_SAVE_DATA.highScore,
          coins: data.coins ?? DEFAULT_SAVE_DATA.coins,
          xp: data.xp ?? DEFAULT_SAVE_DATA.xp,
          statistics: {
            ...DEFAULT_SAVE_DATA.statistics,
            ...(data.statistics ?? {})
          },
          garage: {
            ...DEFAULT_SAVE_DATA.garage,
            ...(data.garage ?? {})
          },
          settings: {
            ...DEFAULT_SAVE_DATA.settings,
            ...(data.settings ?? {})
          }
        };
      } else {
        const legacyScore = localStorage.getItem("eq_racers_best_score");
        if (legacyScore) {
          this.activeData.highScore = parseInt(legacyScore, 10) || 0;
        }
        this.save();
      }
    } catch (e) {
      console.error("Failed to load save data:", e);
      this.activeData = { ...DEFAULT_SAVE_DATA };
    }
    return this.activeData;
  }

  /**
   * Saves active data to LocalStorage
   */
  public save(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.activeData));
    } catch (e) {
      console.error("Failed to write save data:", e);
    }
  }

  public getData(): SaveData {
    return this.activeData;
  }

  /**
   * Updates global stats upon completing a run
   */
  public updateRunStats(score: number, coins: number, distance: number, questions: number, correct: number, wrong: number, maxCombo: number): void {
    if (score > this.activeData.highScore) {
      this.activeData.highScore = score;
    }

    this.activeData.coins += coins;
    this.activeData.xp += Math.round(score * 0.1 + coins * 2);

    const s = this.activeData.statistics;
    s.totalQuestions += questions;
    s.correctAnswers += correct;
    s.wrongAnswers += wrong;
    s.bestCombo = Math.max(s.bestCombo, maxCombo);
    s.distanceTravelled += Math.round(distance);

    if (s.totalQuestions > 0) {
      s.accuracy = Math.round((s.correctAnswers / s.totalQuestions) * 100);
    }

    this.save();
  }

  public unlockSkin(skinId: string, cost: number): boolean {
    if (this.activeData.coins >= cost && !this.activeData.garage.ownedSkins.includes(skinId)) {
      this.activeData.coins -= cost;
      this.activeData.garage.ownedSkins.push(skinId);
      this.save();
      return true;
    }
    return false;
  }

  public equipSkin(skinId: string): boolean {
    if (this.activeData.garage.ownedSkins.includes(skinId)) {
      this.activeData.garage.equippedSkin = skinId;
      this.save();
      return true;
    }
    return false;
  }

  public setMute(mute: boolean): void {
    this.activeData.settings.mute = mute;
    this.save();
  }

  public setLargeTextMode(val: boolean): void {
    this.activeData.settings.largeTextMode = val;
    this.save();
  }

  public setColorblindHighlighting(val: boolean): void {
    this.activeData.settings.colorblindHighlighting = val;
    this.save();
  }

  public setReduceMotion(val: boolean): void {
    this.activeData.settings.reduceMotion = val;
    this.save();
  }

  public setLearningMode(val: boolean): void {
    this.activeData.settings.learningMode = val;
    this.save();
  }

  public clearAll(): void {
    this.activeData = {
      ...DEFAULT_SAVE_DATA,
      garage: { ownedSkins: ["default"], equippedSkin: "default" },
      statistics: { ...DEFAULT_SAVE_DATA.statistics }
    };
    this.save();
  }
}
