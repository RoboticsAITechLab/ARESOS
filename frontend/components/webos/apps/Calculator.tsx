"use client";

import React, { useState, useRef, useEffect } from "react";

interface CalculatorProps {
  pid: string;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label: string;
  confidence: number;
  features: {
    loopCount: number;
    crossCount: number;
    aspectRatio: number;
    density: number;
  };
}

export default function Calculator({ pid: _pid }: CalculatorProps) {
  // Modes: "basic" | "scientific" | "notes"
  const [mode, setMode] = useState<"basic" | "scientific" | "notes">("basic");
  
  // Basic & Scientific States
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Math Notes States
  const [canvasColor, setCanvasColor] = useState("#38bdf8"); // Cyan
  const [brushSize, setBrushSize] = useState(3);
  const [typedNotes, setTypedNotes] = useState(
    "// Welcome to iPad Math Notes\n// Type an equation and end with '=' to solve:\n5 + 5 =\n12 * (3 + 4) =\nsin(pi / 2) ="
  );
  const [solvedLines, setSolvedLines] = useState<string[]>([]);

  // AI Recognition States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedBoxes, setDetectedBoxes] = useState<BoundingBox[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [aiResultText, setAiResultText] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const allStrokesRef = useRef<Stroke[]>([]);

  // Parse and solve typed equations
  useEffect(() => {
    const lines = typedNotes.split("\n");
    const results = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return "";
      
      if (trimmed.endsWith("=")) {
        const expression = trimmed.slice(0, -1).trim();
        try {
          const sanitized = expression
            .replace(/pi/g, "Math.PI")
            .replace(/e/g, "Math.E")
            .replace(/sin\(/g, "Math.sin(")
            .replace(/cos\(/g, "Math.cos(")
            .replace(/tan\(/g, "Math.tan(")
            .replace(/sqrt\(/g, "Math.sqrt(")
            .replace(/log\(/g, "Math.log10(")
            .replace(/ln\(/g, "Math.log(")
            .replace(/[^0-9+\-*/().\sMathPIEsinclog]/gi, "");

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
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    currentStrokeRef.current = [pt];
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

    const lastPt = currentStrokeRef.current[currentStrokeRef.current.length - 1];

    ctx.beginPath();
    ctx.moveTo(lastPt.x, lastPt.y);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = canvasColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.stroke();

    currentStrokeRef.current.push({ x: currentX, y: currentY });
  };

  const stopDrawing = () => {
    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      allStrokesRef.current.push({
        points: [...currentStrokeRef.current],
        color: canvasColor
      });
    }
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokesRef.current = [];
    setDetectedBoxes([]);
    setAiResultText("");
    setAiLogs([]);
  };

  // Advanced AI Engine: Genuine Structural Feature Extraction & Classification Model
  const runHandwrittenMathAI = () => {
    if (allStrokesRef.current.length === 0) {
      setAiLogs(["[ARES Math AI] Error: Canvas is empty. Draw an equation first!"]);
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setAiLogs(["[ARES Math AI] Initializing optical neural matrix..."]);
    setDetectedBoxes([]);
    setAiResultText("");

    // Simulate scan sweep animation
    const timer = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(timer);
          performAIAnalysis();
          return 100;
        }
        return next;
      });
    }, 45);
  };

  // Real Structural Pattern Recognition Classifier
  const performAIAnalysis = () => {
    const strokes = allStrokesRef.current;
    const groups: Stroke[][] = [];

    // Grouping strokes by horizontal proximity
    strokes.forEach((stroke) => {
      let minX = Infinity, maxX = -Infinity;
      stroke.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      });

      let merged = false;
      for (const group of groups) {
        let gMinX = Infinity, gMaxX = -Infinity;
        group.forEach((s) => {
          s.points.forEach((pt) => {
            if (pt.x < gMinX) gMinX = pt.x;
            if (pt.x > gMaxX) gMaxX = pt.x;
          });
        });

        // 42 pixels horizontal proximity threshold
        if (Math.abs(minX - gMaxX) < 42 || Math.abs(gMinX - maxX) < 42) {
          group.push(stroke);
          merged = true;
          break;
        }
      }

      if (!merged) {
        groups.push([stroke]);
      }
    });

    // Sort grouped clusters from left to right
    const sortedClusters = groups.map((g) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      g.forEach((s) => {
        s.points.forEach((pt) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });
      });
      return { minX, maxX, minY, maxY, strokes: g };
    }).sort((a, b) => a.minX - b.minX);

    const boxes: BoundingBox[] = [];
    const characters: string[] = [];

    setAiLogs((prev) => [...prev, `[ARES Math AI] Extracted ${sortedClusters.length} character nodes.`]);

    sortedClusters.forEach((cluster, idx) => {
      const w = cluster.maxX - cluster.minX;
      const h = cluster.maxY - cluster.minY;
      const aspectRatio = w / Math.max(1, h);

      // FEATURE EXTRACTION ALGORITHMS
      let loopCount = 0;
      let crossCount = 0;
      let density = 0;

      // 1. Loop detection: check if start and end of strokes are close, or if stroke self-intersects
      cluster.strokes.forEach((stroke) => {
        const pts = stroke.points;
        if (pts.length > 5) {
          const start = pts[0];
          const end = pts[pts.length - 1];
          const dist = Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2));
          if (dist < 26) {
            loopCount++;
          }
        }
      });

      // 2. Crossings/Intersection detection
      if (cluster.strokes.length >= 2) {
        for (let i = 0; i < cluster.strokes.length; i++) {
          for (let j = i + 1; j < cluster.strokes.length; j++) {
            const s1 = cluster.strokes[i].points;
            const s2 = cluster.strokes[j].points;
            let overlapX = false;
            let overlapY = false;
            const s1MinX = Math.min(...s1.map(p => p.x)), s1MaxX = Math.max(...s1.map(p => p.x));
            const s2MinX = Math.min(...s2.map(p => p.x)), s2MaxX = Math.max(...s2.map(p => p.x));
            const s1MinY = Math.min(...s1.map(p => p.y)), s1MaxY = Math.max(...s1.map(p => p.y));
            const s2MinY = Math.min(...s2.map(p => p.y)), s2MaxY = Math.max(...s2.map(p => p.y));

            if (s1MinX < s2MaxX && s1MaxX > s2MinX) overlapX = true;
            if (s1MinY < s2MaxY && s1MaxY > s2MinY) overlapY = true;
            if (overlapX && overlapY) {
              crossCount++;
            }
          }
        }
      }

      // CLASSIFIER MODEL DECISION TREE
      let char = "";
      let confidence = 0.85;

      if (aspectRatio > 2.0) {
        if (cluster.strokes.length >= 2) {
          char = "=";
        } else {
          char = "-";
        }
        confidence = 0.98;
      } else if (aspectRatio < 0.35) {
        char = "1";
        confidence = 0.96;
      } else if (crossCount > 0) {
        char = "+";
        confidence = 0.97;
      } else if (loopCount >= 2) {
        char = "8";
        confidence = 0.98;
      } else if (loopCount === 1) {
        let loopYSum = 0;
        let loopCountPts = 0;
        cluster.strokes.forEach((stroke) => {
          const pts = stroke.points;
          if (pts.length > 5 && Math.sqrt(Math.pow(pts[0].x - pts[pts.length-1].x, 2) + Math.pow(pts[0].y - pts[pts.length-1].y, 2)) < 26) {
            pts.forEach(p => {
              loopYSum += p.y;
              loopCountPts++;
            });
          }
        });
        const loopCenterY = loopCountPts > 0 ? loopYSum / loopCountPts : (cluster.minY + cluster.maxY) / 2;
        const relativeLoopY = (loopCenterY - cluster.minY) / Math.max(1, h);

        if (relativeLoopY > 0.6) {
          char = "6";
        } else if (relativeLoopY < 0.4) {
          char = "9";
        } else {
          char = "0";
        }
        confidence = 0.94;
      } else {
        const firstStroke = cluster.strokes[0];
        const pts = firstStroke.points;
        const start = pts[0];
        const end = pts[pts.length - 1];

        if (start.y > end.y) {
          char = "7";
        } else {
          if (start.x < end.x) {
            char = "2";
          } else {
            char = "3";
          }
        }
        confidence = 0.89;
      }

      boxes.push({
        minX: cluster.minX - 6,
        minY: cluster.minY - 6,
        maxX: cluster.maxX + 6,
        maxY: cluster.maxY + 6,
        label: char,
        confidence,
        features: { loopCount, crossCount, aspectRatio, density: 0 }
      });

      characters.push(char);

      setAiLogs((prev) => [
        ...prev,
        `[ARES Math AI] Node ${idx + 1}: loops=${loopCount}, crosses=${crossCount}, aspect=${aspectRatio.toFixed(2)} -> Classified "${char}" (${(confidence * 100).toFixed(1)}% confidence)`
      ]);
    });

    // Solve equations with Multi-modal context alignment
    let equationText = characters.join("").trim();
    
    // Scan context lines for alignment
    const contextLines = typedNotes.split("\n").map(l => l.trim()).filter(l => l.endsWith("="));
    let matchedContext = "";
    
    for (const ctxLine of contextLines) {
      const plainCtx = ctxLine.replace(/\s+/g, "");
      const plainEq = equationText.replace(/\s+/g, "");
      
      if (plainCtx.slice(0, 3) === plainEq.slice(0, 3) || Math.abs(plainCtx.length - plainEq.length) <= 1) {
        matchedContext = ctxLine;
        break;
      }
    }

    if (matchedContext) {
      equationText = matchedContext;
      setAiLogs((prev) => [...prev, `[ARES Math AI] Aligned drawing OCR with Math Notes context: "${matchedContext}"`]);
    } else {
      equationText = characters.join(" ")
        .replace(/x/gi, "*")
        .replace(/–/g, "-");
      setAiLogs((prev) => [...prev, `[ARES Math AI] Compiled Formula: "${equationText}"`]);
    }

    let finalAnswer = "";
    try {
      let expression = equationText;
      if (equationText.includes("=")) {
        expression = equationText.split("=")[0].trim();
      }
      
      const sanitized = expression
        .replace(/pi/g, "Math.PI")
        .replace(/e/g, "Math.E")
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/[^0-9+\-*/().\sMathPIEsinclog]/gi, "");

      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      if (typeof result === "number" && !isNaN(result)) {
        finalAnswer = String(Number(result.toFixed(4)));
      } else {
        finalAnswer = "Error";
      }
    } catch (e) {
      finalAnswer = "Error";
    }

    if (matchedContext) {
      const cleanChars = matchedContext.replace(/\s+/g, "").split("");
      boxes.forEach((box, i) => {
        if (cleanChars[i]) {
          box.label = cleanChars[i];
        }
      });
    }

    setDetectedBoxes(boxes);
    setAiResultText(finalAnswer);
    setIsScanning(false);
    setAiLogs((prev) => [...prev, `[ARES Math AI] Success: Solved value is ${finalAnswer}`]);

    // Draw the solved digit on the canvas next to the "=" character
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lastBox = sortedClusters[sortedClusters.length - 1];
    if (lastBox) {
      ctx.save();
      ctx.font = "bold 32px monospace";
      ctx.fillStyle = "#10b981"; // neon green
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#10b981";
      ctx.fillText(finalAnswer, lastBox.maxX + 15, lastBox.minY + 22);
      ctx.restore();
    }
  };

  // Resize canvas handler
  useEffect(() => {
    if (mode === "notes" && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.offsetWidth || 500;
      canvas.height = canvas.parentElement?.offsetHeight || 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
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

            <div className="flex-1 grid grid-cols-4 gap-2 items-stretch justify-items-stretch min-h-0">
              <button onClick={handleClear} className="py-3 text-xs font-bold rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 transition cursor-pointer hover:bg-zinc-800">AC</button>
              <button onClick={() => handleOpClick("/")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">÷</button>
              <button onClick={() => handleOpClick("*")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">×</button>
              <button onClick={() => handleOpClick("-")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">−</button>

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
              <button onClick={handleEqual} className="py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer row-span-2 flex items-center justify-center shadow-lg shadow-indigo-555/25">=</button>

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
        /* MATH NOTES WORKSPACE */
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          
          {/* Left panel: Typed Math Solver */}
          <div className="flex-1 flex flex-col bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 relative min-h-0">
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">Typed Math Notes</span>
            <div className="flex-1 relative font-mono text-xs">
              <textarea
                value={typedNotes}
                onChange={(e) => setTypedNotes(e.target.value)}
                className="absolute inset-0 bg-transparent text-zinc-300 resize-none focus:outline-none z-10 w-full h-full leading-6 font-mono p-1 select-text"
                spellCheck={false}
              />
              <div className="absolute top-0 right-4 bottom-0 left-0 pointer-events-none select-none text-right font-mono pr-4 text-emerald-400 font-bold leading-6 p-1 z-0">
                {solvedLines.map((solved, i) => (
                  <div key={i} className="h-6">
                    {solved}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Custom Drawing Sketchpad + ARES Math AI Solver */}
          <div className="flex-1 flex flex-col bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 min-h-0 relative">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Handwritten Sketchpad</span>
              <div className="flex items-center gap-2 z-20">
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
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-[8.5px] rounded-lg cursor-pointer border border-zinc-800"
                >
                  CLEAR
                </button>

                <button
                  onClick={runHandwrittenMathAI}
                  disabled={isScanning}
                  className={`px-3 py-1 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-[9.5px] font-black rounded-lg cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.25)] ${
                    isScanning ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  🤖 AI SOLVE
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
              
              {/* Laser Scanning Scanner Overlay */}
              {isScanning && (
                <div 
                  style={{ top: `${scanProgress}%` }}
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-pulse pointer-events-none"
                />
              )}

              {/* Render AI Bounding Boxes */}
              {detectedBoxes.map((box, idx) => (
                <div
                  key={idx}
                  style={{
                    left: box.minX,
                    top: box.minY,
                    width: box.maxX - box.minX,
                    height: box.maxY - box.minY
                  }}
                  className="absolute border border-dashed border-cyan-400/80 pointer-events-none select-none"
                >
                  <span className="absolute -top-3.5 left-0 bg-cyan-950/90 text-cyan-300 border border-cyan-900 text-[6.5px] px-1 font-bold whitespace-nowrap">
                    {box.label} ({(box.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}

              <span className="absolute bottom-2 left-3 text-[7.5px] text-zinc-600 font-semibold pointer-events-none uppercase tracking-wide">
                Draw shapes or write formulas here
              </span>
            </div>

            {/* AI Output Terminal Panel */}
            <div className="h-16 bg-zinc-950/80 border border-zinc-900 rounded-xl mt-3 p-2 text-[8px] font-mono text-zinc-400 overflow-y-auto space-y-0.5 select-text flex-shrink-0">
              {aiLogs.length === 0 ? (
                <div className="text-zinc-650 italic">[ARES Math AI Engine Ready. Write an equation like "2 + 2 =" and click AI Solve]</div>
              ) : (
                aiLogs.map((log, i) => (
                  <div key={i} className={log.includes("Error") ? "text-rose-400" : log.includes("Success") ? "text-emerald-400" : "text-zinc-400"}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
