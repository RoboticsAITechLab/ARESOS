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

  // Try simple eval for arithmetic
  try {
    const isEquation = cleaned.includes("=");
    if (!isEquation) {
      // Clean equation of unsafe characters for a safe basic evaluation
      const safeExpr = cleaned.replace(/[^0-9+\-*/().\s]/g, "");
      if (safeExpr.trim()) {
        const evalResult = new Function(`return (${safeExpr})`)();
        if (typeof evalResult === "number" && !isNaN(evalResult)) {
          const resultStr = String(evalResult);
          return {
            equation: cleaned,
            steps: [
              { explanation: "Extracted mathematical expression", math: cleaned },
              { explanation: "Evaluated arithmetic expression", math: `${cleaned} = ${resultStr}` }
            ],
            result: resultStr,
            graphableFunction: null
          };
        }
      }
    } else {
      // Basic linear equation solver mock (e.g. x + 2 = 5 or x = 3)
      const parts = cleaned.split("=");
      const leftPart = parts[0].trim();
      const rightPart = parts[1].trim();
      
      // If it's a simple x = value
      if (leftPart.toLowerCase() === "x") {
        return {
          equation: cleaned,
          steps: [
            { explanation: "Identified algebraic equation", math: cleaned },
            { explanation: "Solved for variable x", math: `x = ${rightPart}` }
          ],
          result: `x = ${rightPart}`,
          graphableFunction: null
        };
      }
    }
  } catch (err) {
    console.warn("Local solver failed: ", err);
  }

  // Fallback default response
  return {
    equation: cleaned,
    steps: [
      { explanation: "Extracted mathematical expression", math: cleaned },
      { explanation: "Processed expression (local solver mode)", math: cleaned }
    ],
    result: cleaned,
    graphableFunction: cleaned.toLowerCase().includes("x") ? cleaned : null
  };
}
