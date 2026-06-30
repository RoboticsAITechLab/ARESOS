"use client";

import React, { useState, useRef, useEffect } from "react";

interface CalculatorProps {
  pid: string;
}

export default function Calculator({ pid: _pid }: CalculatorProps) {
  // Modes: "basic" | "scientific" | "notes"
  const [mode, setMode] = useState<"basic" | "scientific" | "notes">("basic");
  
  // Basic & Scientific States
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Math Notes / Scratchpad States
  const [canvasColor, setCanvasColor] = useState("#38bdf8"); // Cyan
  const [brushSize, setBrushSize] = useState(3);
  const [typedNotes, setTypedNotes] = useState(
    "// Welcome to iPad Math Notes\n// Type an equation and end with '=' to solve:\n5 + 5 =\n12 * (3 + 4) =\nsin(pi / 2) ="
  );
  const [solvedLines, setSolvedLines] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  // Parse and solve equations line by line
  useEffect(() => {
    const lines = typedNotes.split("\n");
    const results = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return "";
      
      if (trimmed.endsWith("=")) {
        const expression = trimmed.slice(0, -1).trim();
        try {
          // Safe mathematical string evaluation
          const sanitized = expression
            .replace(/pi/g, "Math.PI")
            .replace(/e/g, "Math.E")
            .replace(/sin\(/g, "Math.sin(")
            .replace(/cos\(/g, "Math.cos(")
            .replace(/tan\(/g, "Math.tan(")
            .replace(/sqrt\(/g, "Math.sqrt(")
            .replace(/log\(/g, "Math.log10(")
            .replace(/ln\(/g, "Math.log(")
            .replace(/[^0-9+\-*/().\sMathPIEsinclog]/gi, ""); // sanitize

          // eslint-disable-next-line no-eval
          const val = eval(sanitized);
          if (typeof val === "number" && !isNaN(val)) {
            return `= ${Number(val.toFixed(4))}`;
          }
        } catch (e) {
          return "?";
        }
      }
      return "";
    });
    setSolvedLines(results);
  }, [typedNotes]);

  // Standard Button clicks
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
      const lastChar = prev.trim().slice(-1);
      if (["+", "-", "*", "/"].includes(lastChar)) {
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
  };

  const handleScientificOp = (op: string) => {
    setIsDone(false);
    setEquation((prev) => prev + op);
    setDisplay("0");
  };

  const handleClear = () => {
    setDisplay("0");
    setEquation("");
    setIsDone(false);
  };

  const evaluateBasicMath = (expr: string): number => {
    // Basic fallback parsing
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
      const sanitized = equation.replace(/[^0-9+\-*/().]/g, "");
      const result = evaluateBasicMath(sanitized);
      const resStr = String(Number(result).toLocaleString("en-US", { maximumFractionDigits: 4 }));
      
      setHistory(prev => [`${equation} = ${resStr}`, ...prev.slice(0, 10)]);
      setDisplay(resStr);
      setEquation(resStr);
      setIsDone(true);
    } catch {
      setDisplay("Error");
      setEquation("");
      setIsDone(true);
    }
  };

  // Drawing Canvas Methods
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    lastXRef.current = e.clientX - rect.left;
    lastYRef.current = e.clientY - rect.top;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = canvasColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.stroke();

    lastXRef.current = currentX;
    lastYRef.current = currentY;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Resize canvas handler
  useEffect(() => {
    if (mode === "notes" && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.offsetWidth || 500;
      canvas.height = canvas.parentElement?.offsetHeight || 300;
    }
  }, [mode]);

  return (
    <div className="w-full h-full bg-[#0e0c15] text-zinc-100 flex flex-col p-4 select-none font-mono">
      
      {/* Mode Selector Header */}
      <div className="flex gap-1.5 p-1 bg-zinc-950/60 border border-zinc-900 rounded-xl mb-4 self-center">
        <button
          onClick={() => setMode("basic")}
          className={`px-3 py-1 text-[9px] font-bold rounded-lg transition cursor-pointer ${
            mode === "basic" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          🧮 BASIC
        </button>
        <button
          onClick={() => setMode("scientific")}
          className={`px-3 py-1 text-[9px] font-bold rounded-lg transition cursor-pointer ${
            mode === "scientific" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          🔬 SCIENTIFIC
        </button>
        <button
          onClick={() => setMode("notes")}
          className={`px-3 py-1 text-[9px] font-bold rounded-lg transition cursor-pointer ${
            mode === "notes" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          📝 MATH NOTES
        </button>
      </div>

      {mode !== "notes" ? (
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* Main Calculator Pad */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Display screen */}
            <div className="bg-zinc-950/70 border border-zinc-900 p-4 rounded-2xl mb-4 text-right flex flex-col justify-end min-h-[85px] flex-shrink-0 relative overflow-hidden">
              <div className="absolute top-2 left-3 text-[7.5px] font-bold text-indigo-400 tracking-wider">
                {mode.toUpperCase()} MODE
              </div>
              <span className="text-[10px] text-zinc-500 truncate mb-1">
                {equation || "0"}
              </span>
              <span className="text-3xl font-black text-white tracking-tight truncate">
                {display}
              </span>
            </div>

            {/* Grid pad */}
            <div className="flex-1 grid grid-cols-4 gap-2 items-stretch justify-items-stretch min-h-0">
              <button onClick={handleClear} className="py-3 text-xs font-bold rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 transition cursor-pointer hover:bg-zinc-800">AC</button>
              <button onClick={() => handleOpClick("/")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">÷</button>
              <button onClick={() => handleOpClick("*")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">×</button>
              <button onClick={() => handleOpClick("-")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">−</button>

              {/* Scientific buttons show up if scientific mode */}
              {mode === "scientific" && (
                <>
                  <button onClick={() => handleScientificOp("sin(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">sin</button>
                  <button onClick={() => handleScientificOp("cos(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">cos</button>
                  <button onClick={() => handleScientificOp("tan(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">tan</button>
                  <button onClick={() => handleScientificOp("pi")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">π</button>
                </>
              )}

              <button onClick={() => handleNumClick("7")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">7</button>
              <button onClick={() => handleNumClick("8")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">8</button>
              <button onClick={() => handleNumClick("9")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">9</button>
              <button onClick={() => handleOpClick("+")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">+</button>

              {/* More scientific buttons */}
              {mode === "scientific" && (
                <>
                  <button onClick={() => handleScientificOp("sqrt(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">√</button>
                  <button onClick={() => handleScientificOp("(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">(</button>
                  <button onClick={() => handleScientificOp(")")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">)</button>
                  <button onClick={() => handleScientificOp("log(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">log</button>
                </>
              )}

              <button onClick={() => handleNumClick("4")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">4</button>
              <button onClick={() => handleNumClick("5")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">5</button>
              <button onClick={() => handleNumClick("6")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">6</button>
              <button onClick={handleEqual} className="py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer row-span-2 flex items-center justify-center shadow-lg shadow-indigo-550/25">=</button>

              <button onClick={() => handleNumClick("1")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">1</button>
              <button onClick={() => handleNumClick("2")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">2</button>
              <button onClick={() => handleNumClick("3")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">3</button>

              <button onClick={() => handleNumClick("0")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50 col-span-2">0</button>
              <button onClick={() => handleNumClick(".")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-900/50">.</button>
            </div>
          </div>

          {/* Sidebar History Panel */}
          <div className="w-[140px] bg-zinc-950/50 border border-zinc-900 rounded-2xl p-3 flex flex-col min-h-0">
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">History</span>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[9.5px]">
              {history.length === 0 ? (
                <div className="text-zinc-600 italic">No calculations yet.</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="border-b border-zinc-900 pb-1.5 text-zinc-400 break-all select-text">
                    {h}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* MATH NOTES WORKSPACE (Drawing Scratchpad + Typed Solver) */
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          
          {/* Left panel: Typed Math Solver */}
          <div className="flex-1 flex flex-col bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 relative min-h-0">
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">Typed Math Notes</span>
            
            {/* Editor Area */}
            <div className="flex-1 relative font-mono text-xs">
              <textarea
                value={typedNotes}
                onChange={(e) => setTypedNotes(e.target.value)}
                className="absolute inset-0 bg-transparent text-zinc-300 resize-none focus:outline-none z-10 w-full h-full leading-6 font-mono p-1 select-text"
                spellCheck={false}
              />
              
              {/* Overlay Solutions aligned line by line */}
              <div className="absolute top-0 right-4 bottom-0 left-0 pointer-events-none select-none text-right font-mono pr-4 text-emerald-400 font-bold leading-6 p-1 z-0">
                {solvedLines.map((solved, i) => (
                  <div key={i} className="h-6">
                    {solved}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Custom Drawing/Scratchpad Board */}
          <div className="flex-1 flex flex-col bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 min-h-0 relative">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Handwritten Sketchpad</span>
              <div className="flex items-center gap-2 z-20">
                {/* Custom brush color swatches */}
                <div className="flex gap-1">
                  {["#38bdf8", "#ec4899", "#22d3ee", "#a855f7", "#eab308", "#10b981"].map(color => (
                    <button
                      key={color}
                      onClick={() => setCanvasColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-3.5 h-3.5 rounded-full border cursor-pointer transition ${
                        canvasColor === color ? "border-white scale-110" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
                
                {/* Brush size slider */}
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-12 h-1 accent-indigo-500 rounded bg-zinc-800"
                  title="Brush Size"
                />

                <button
                  onClick={clearCanvas}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[8.5px] rounded-lg cursor-pointer"
                >
                  CLEAR
                </button>
              </div>
            </div>

            {/* Drawing Canvas Area */}
            <div className="flex-1 bg-zinc-950/80 rounded-xl relative border border-zinc-900 min-h-0 overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full cursor-crosshair block absolute top-0 left-0"
              />
              <span className="absolute bottom-2 left-3 text-[7.5px] text-zinc-600 font-semibold pointer-events-none uppercase tracking-wide">
                Draw shapes or write formulas here
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
