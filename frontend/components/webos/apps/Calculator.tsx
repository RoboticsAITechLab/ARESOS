"use client";

import React,{ useState } from "react";

interface CalculatorProps {
  pid: string;
}

export default function Calculator({ pid: _pid }: CalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isDone, setIsDone] = useState(false);

  const handleNumClick = (val: string) => {
    if (display === "0" || isDone) {
      setDisplay(val);
      setIsDone(false);
    } else {
      setDisplay((prev) => prev + val);
    }
    setEquation((prev) => (isDone ? val : prev + val));
  };

  const handleOpClick = (op: string) => {
    setIsDone(false);
    setDisplay("0");
    setEquation((prev) => {
      // Avoid stacking operators
      const lastChar = prev.trim().slice(-1);
      if (["+", "-", "*", "/"].includes(lastChar)) {
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
  };

  const handleClear = () => {
    setDisplay("0");
    setEquation("");
    setIsDone(false);
  };

  const evaluateBasicMath = (expr: string): number => {
    for (let i = expr.length - 1; i >= 0; i--) {
      const char = expr[i];
      if (char === "+" || char === "-") {
        if (i === 0) continue;
        if (["+", "-", "*", "/"].includes(expr[i - 1])) continue;
        const left = evaluateBasicMath(expr.slice(0, i));
        const right = evaluateBasicMath(expr.slice(i + 1));
        return char === "+" ? left + right : left - right;
      }
    }
    for (let i = expr.length - 1; i >= 0; i--) {
      const char = expr[i];
      if (char === "*" || char === "/") {
        const left = evaluateBasicMath(expr.slice(0, i));
        const right = evaluateBasicMath(expr.slice(i + 1));
        return char === "*" ? left * right : left / right;
      }
    }
    return Number(expr);
  };

  const handleEqual = () => {
    try {
      if (!equation) return;
      // Evaluate equation safely (since it is a calculator of basic math strings)
      // We sanitise characters to exclude non-mathematical entities
      const sanitized = equation.replace(/[^0-9+\-*/.]/g, "");
      const result = evaluateBasicMath(sanitized);
      
      const resStr = String(Number(result).toLocaleString("en-US", { maximumFractionDigits: 4 }));
      setDisplay(resStr);
      setEquation(resStr);
      setIsDone(true);
    } catch {
      setDisplay("Error");
      setEquation("");
      setIsDone(true);
    }
  };

  const btnClass = "py-4 text-sm font-semibold rounded-xl select-none transition cursor-pointer text-center";
  const numBtnClass = `${btnClass} bg-zinc-950/45 hover:bg-zinc-800/40 text-zinc-300 border border-zinc-850/50`;
  const opBtnClass = `${btnClass} bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-900/30`;
  const actionBtnClass = `${btnClass} bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-400`;

  return (
    <div className="w-full h-full bg-zinc-900 text-zinc-100 flex flex-col p-5 select-none font-mono">
      {/* Display Screen */}
      <div className="bg-zinc-950/70 border border-zinc-850 p-4 rounded-xl mb-4 text-right flex flex-col justify-end min-h-[72px] flex-shrink-0 select-text">
        <span className="text-[10px] text-zinc-600 truncate h-4 mb-0.5">
          {equation || "0"}
        </span>
        <span className="text-2xl font-bold text-white tracking-tight truncate">
          {display}
        </span>
      </div>

      {/* Button Pad grid */}
      <div className="flex-1 grid grid-cols-4 gap-2 items-stretch justify-items-stretch">
        <button onClick={handleClear} className={actionBtnClass}>C</button>
        <button onClick={() => handleOpClick("/")} className={opBtnClass}>÷</button>
        <button onClick={() => handleOpClick("*")} className={opBtnClass}>×</button>
        <button onClick={() => handleOpClick("-")} className={opBtnClass}>−</button>

        <button onClick={() => handleNumClick("7")} className={numBtnClass}>7</button>
        <button onClick={() => handleNumClick("8")} className={numBtnClass}>8</button>
        <button onClick={() => handleNumClick("9")} className={numBtnClass}>9</button>
        <button onClick={() => handleOpClick("+")} className={`${opBtnClass} row-span-2 flex items-center justify-center`}>+</button>

        <button onClick={() => handleNumClick("4")} className={numBtnClass}>4</button>
        <button onClick={() => handleNumClick("5")} className={numBtnClass}>5</button>
        <button onClick={() => handleNumClick("6")} className={numBtnClass}>6</button>

        <button onClick={() => handleNumClick("1")} className={numBtnClass}>1</button>
        <button onClick={() => handleNumClick("2")} className={numBtnClass}>2</button>
        <button onClick={() => handleNumClick("3")} className={numBtnClass}>3</button>
        <button onClick={handleEqual} className={`${btnClass} bg-indigo-600 hover:bg-indigo-500 text-white font-bold row-span-2 flex items-center justify-center shadow-lg shadow-indigo-500/10`}>=</button>

        <button onClick={() => handleNumClick("0")} className={`${numBtnClass} col-span-2`}>0</button>
        <button onClick={() => handleNumClick(".")} className={numBtnClass}>.</button>
      </div>
    </div>
  );
}






// =============================================================================================================
