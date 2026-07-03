import { evaluate } from "mathjs";
import nerdamer from "nerdamer";
// @ts-ignore
import Algebrite from "algebrite";
// Load nerdamer solve extension
import "nerdamer/Solve";

interface LocalSolveResult {
  equation: string;
  steps: { explanation: string; math?: string }[];
  result: string;
  graphableFunction?: string | null;
}

export function solveLocally(rawText: string): LocalSolveResult {
  // Pre-process equation to normalize symbols
  let cleaned = rawText
    .replace(/x²/g, "x^2")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/=/g, " = ")
    .replace(/\?/g, "")
    .trim();

  // Try MathJS first (Arithmetic, Trigonometry, Fractions, Powers)
  try {
    // Check if it is a simple arithmetic or trigonometric query
    const hasVariables = /[a-zA-Z]/g.test(cleaned.replace(/\b(sin|cos|tan|pi|deg)\b/g, ""));
    const isEquation = cleaned.includes("=");

    if (!hasVariables && !isEquation) {
      const evalResult = evaluate(cleaned);
      const resultStr = String(evalResult);

      return {
        equation: cleaned,
        steps: [
          { explanation: "Extracted mathematical expression", math: cleaned },
          { explanation: "Evaluated arithmetic expression using MathJS", math: `${cleaned} = ${resultStr}` }
        ],
        result: resultStr,
        graphableFunction: null
      };
    }
  } catch (err) {
    console.warn("MathJS direct evaluation failed, trying algebraic solvers...", err);
  }

  // Try Nerdamer next (Algebra equations like x^2 + 5x + 6 = 0)
  try {
    if (cleaned.includes("=")) {
      const parts = cleaned.split("=");
      const leftPart = parts[0].trim();
      const rightPart = parts[1].trim() || "0";
      const eqToSolve = `${leftPart} - (${rightPart})`;

      // Find variable (default to 'x')
      const varMatch = cleaned.match(/[a-zA-Z]/);
      const solveVar = varMatch ? varMatch[0] : "x";

      const solutions = (nerdamer as any).solve(eqToSolve, solveVar);
      const resultStr = solutions.toString();

      return {
        equation: cleaned,
        steps: [
          { explanation: "Identified algebraic equation", math: cleaned },
          { explanation: "Isolated terms and solved for variable using Nerdamer Solver", math: `${solveVar} = ${resultStr}` }
        ],
        result: `${solveVar} = ${resultStr}`,
        graphableFunction: leftPart.toLowerCase().includes("x") ? leftPart : null
      };
    }
  } catch (err) {
    console.warn("Nerdamer algebraic solution failed, trying Algebrite...", err);
  }

  // Try Algebrite (Algebra simplification and basic calculus/simplifications)
  try {
    const algResult = Algebrite.run(cleaned);
    if (algResult && algResult !== "0" && algResult !== cleaned) {
      return {
        equation: cleaned,
        steps: [
          { explanation: "Parsed algebraic formula", math: cleaned },
          { explanation: "Simplified symbolic expression using Algebrite", math: algResult }
        ],
        result: algResult,
        graphableFunction: cleaned.toLowerCase().includes("x") ? cleaned : null
      };
    }
  } catch (err) {
    console.warn("Algebrite simplification failed...", err);
  }

  throw new Error("Local solvers could not resolve the expression structure.");
}
