import { SeededRandom } from "./SeededRandom";

export interface MathQuestion {
  text: string;
  options: (number | string)[];
  correctLane: number;
  correctValue: number | string;
  presentationType: "standard" | "split" | "compare";
  category: string;
}

export interface QuestionCategory {
  id: string;
  name: string;
  generate(difficulty: number, rng: SeededRandom): MathQuestion;
}

// Generate distractor answers that are close to the correct value and unique
function generateDistractors(correctValue: number, count: number, rng: SeededRandom): number[] {
  const distractors = new Set<number>();
  while (distractors.size < count) {
    const offset = rng.choice([-3, -2, -1, 1, 2, 3, -5, 5, -10, 10]);
    const val = correctValue + offset;
    if (val !== correctValue && val >= 0) {
      distractors.add(val);
    }
  }
  return Array.from(distractors);
}

// Shuffle elements deterministically using the SeededRandom instance
function shuffleOptions<T>(correctVal: T, distractors: T[], rng: SeededRandom): { options: T[]; correctLane: number } {
  const options = [correctVal, ...distractors];
  
  for (let i = options.length - 1; i > 0; i--) {
    const j = rng.range(0, i);
    const temp = options[i];
    options[i] = options[j];
    options[j] = temp;
  }

  const correctLane = options.indexOf(correctVal);
  return { options, correctLane };
}

export class AdditionCategory implements QuestionCategory {
  public id = "addition";
  public name = "Addition";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    const maxVal = Math.min(100, 10 + difficulty * 5);
    const a = rng.range(1, maxVal);
    const b = rng.range(1, maxVal);
    const correctValue = a + b;

    const distractors = generateDistractors(correctValue, 2, rng);
    
    // Choose standard or split gate presentation randomly
    const presentationType = rng.choice(["standard", "split"] as const);

    if (presentationType === "split") {
      const { options, correctLane } = shuffleOptions(b, generateDistractors(b, 2, rng), rng);
      return {
        text: `${a} + ? = ${correctValue}`,
        options,
        correctLane,
        correctValue: b,
        presentationType: "split",
        category: this.id
      };
    } else {
      const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);
      return {
        text: `${a} + ${b} = ?`,
        options,
        correctLane,
        correctValue,
        presentationType: "standard",
        category: this.id
      };
    }
  }
}

export class SubtractionCategory implements QuestionCategory {
  public id = "subtraction";
  public name = "Subtraction";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    const maxVal = Math.min(100, 15 + difficulty * 5);
    const a = rng.range(5, maxVal);
    const b = rng.range(1, a);
    const correctValue = a - b;

    const distractors = generateDistractors(correctValue, 2, rng);
    const presentationType = rng.choice(["standard", "split"] as const);

    if (presentationType === "split") {
      const { options, correctLane } = shuffleOptions(b, generateDistractors(b, 2, rng), rng);
      return {
        text: `${a} - ? = ${correctValue}`,
        options,
        correctLane,
        correctValue: b,
        presentationType: "split",
        category: this.id
      };
    } else {
      const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);
      return {
        text: `${a} - ${b} = ?`,
        options,
        correctLane,
        correctValue,
        presentationType: "standard",
        category: this.id
      };
    }
  }
}

export class MultiplicationCategory implements QuestionCategory {
  public id = "multiplication";
  public name = "Multiplication";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    const factorLimit = Math.min(12, 5 + Math.floor(difficulty / 2));
    const a = rng.range(2, factorLimit);
    const b = rng.range(2, factorLimit);
    const correctValue = a * b;

    const distractors = generateDistractors(correctValue, 2, rng);
    const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);

    return {
      text: `${a} × ${b} = ?`,
      options,
      correctLane,
      correctValue,
      presentationType: "standard",
      category: this.id
    };
  }
}

export class DivisionCategory implements QuestionCategory {
  public id = "division";
  public name = "Division";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    const factorLimit = Math.min(10, 4 + Math.floor(difficulty / 3));
    const divisor = rng.range(2, factorLimit);
    const correctValue = rng.range(2, factorLimit);
    const dividend = divisor * correctValue;

    const distractors = generateDistractors(correctValue, 2, rng);
    const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);

    return {
      text: `${dividend} ÷ ${divisor} = ?`,
      options,
      correctLane,
      correctValue,
      presentationType: "standard",
      category: this.id
    };
  }
}

export class SequenceCategory implements QuestionCategory {
  public id = "sequence";
  public name = "Patterns";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    const step = rng.range(2, Math.min(10, 2 + difficulty));
    const start = rng.range(1, 20);
    const seqType = rng.choice(["arithmetic", "geometric"] as const);

    if (seqType === "geometric" && step <= 4 && difficulty >= 3) {
      // Geometric: 2, 4, 8, 16...
      const a1 = rng.range(2, 4);
      const values = [a1, a1 * 2, a1 * 4, a1 * 8];
      const correctValue = a1 * 16;
      const distractors = [correctValue - 4, correctValue + 8];
      const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);

      return {
        text: `${values.join(", ")}, ?`,
        options,
        correctLane,
        correctValue,
        presentationType: "standard",
        category: this.id
      };
    } else {
      // Arithmetic: 5, 10, 15, 20...
      const values = [start, start + step, start + step * 2, start + step * 3];
      const correctValue = start + step * 4;
      const distractors = generateDistractors(correctValue, 2, rng);
      const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);

      return {
        text: `${values.join(", ")}, ?`,
        options,
        correctLane,
        correctValue,
        presentationType: "standard",
        category: this.id
      };
    }
  }
}

export class ComparisonCategory implements QuestionCategory {
  public id = "comparison";
  public name = "Comparison";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    // Generates 3 unique random integers
    const numbers = new Set<number>();
    while (numbers.size < 3) {
      numbers.add(rng.range(10, 10 + difficulty * 15));
    }
    const list = Array.from(numbers);
    const correctValue = Math.max(...list);
    
    // Distractors are simply the other two numbers
    const distractors = list.filter(n => n !== correctValue);
    const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);

    return {
      text: "Which is LARGEST?",
      options,
      correctLane,
      correctValue,
      presentationType: "compare",
      category: this.id
    };
  }
}

export class LogicCategory implements QuestionCategory {
  public id = "logic";
  public name = "Logic";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    // Odd one out: E.g. two evens, one odd or vice versa
    const isOddTarget = rng.choice([true, false]);
    let target = 0;
    const distractors: number[] = [];

    if (isOddTarget) {
      // Pick 1 odd target, 2 evens
      target = rng.range(2, 20) * 2 + 1; // odd
      while (distractors.length < 2) {
        const val = rng.range(2, 20) * 2;
        if (!distractors.includes(val)) distractors.push(val);
      }
    } else {
      // Pick 1 even target, 2 odds
      target = rng.range(2, 20) * 2; // even
      while (distractors.length < 2) {
        const val = rng.range(2, 20) * 2 + 1;
        if (!distractors.includes(val)) distractors.push(val);
      }
    }

    const { options, correctLane } = shuffleOptions(target, distractors, rng);

    return {
      text: isOddTarget ? "Find the ODD number" : "Find the EVEN number",
      options,
      correctLane,
      correctValue: target,
      presentationType: "compare",
      category: this.id
    };
  }
}

export class MemoryCategory implements QuestionCategory {
  public id = "memory";
  public name = "Memory";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    // Memorize short fact: e.g. 5 + 8 = 13
    const a = rng.range(1, 10 + difficulty * 2);
    const b = rng.range(1, 10 + difficulty * 2);
    const correctValue = a + b;

    const distractors = generateDistractors(correctValue, 2, rng);
    const { options, correctLane } = shuffleOptions(correctValue, distractors, rng);

    return {
      text: `MEMORIZE: ${a} + ${b} = ${correctValue}`,
      options,
      correctLane,
      correctValue,
      presentationType: "standard", // standard but hides in manager
      category: this.id
    };
  }
}

export class ReactionCategory implements QuestionCategory {
  public id = "reaction";
  public name = "Reaction";

  public generate(difficulty: number, rng: SeededRandom): MathQuestion {
    // Quick instruction directive
    const correctLane = rng.range(0, 2);
    const laneLabels = ["LEFT", "CENTER", "RIGHT"];
    const text = `SWERVE ${laneLabels[correctLane]} NOW!`;
    
    const options = ["LEFT", "CENTER", "RIGHT"];

    return {
      text,
      options,
      correctLane,
      correctValue: options[correctLane],
      presentationType: "compare",
      category: this.id
    };
  }
}

export class QuestionGenerator {
  private categories: Map<string, QuestionCategory> = new Map();

  constructor() {
    this.registerCategory(new AdditionCategory());
    this.registerCategory(new SubtractionCategory());
    this.registerCategory(new MultiplicationCategory());
    this.registerCategory(new DivisionCategory());
    this.registerCategory(new SequenceCategory());
    this.registerCategory(new ComparisonCategory());
    this.registerCategory(new LogicCategory());
    this.registerCategory(new MemoryCategory());
    this.registerCategory(new ReactionCategory());
  }

  public registerCategory(category: QuestionCategory): void {
    this.categories.set(category.id, category);
  }

  public getCategory(id: string): QuestionCategory | undefined {
    return this.categories.get(id);
  }

  public generateQuestion(categoryIds: string[], difficulty: number, rng: SeededRandom): MathQuestion {
    const activeIds = categoryIds.filter(id => this.categories.has(id));
    const finalIds = activeIds.length > 0 ? activeIds : ["addition"];
    const id = rng.choice(finalIds);
    const category = this.categories.get(id)!;
    return category.generate(difficulty, rng);
  }
}
