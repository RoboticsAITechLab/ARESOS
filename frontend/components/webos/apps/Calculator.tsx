"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { solveLocally } from "../../../utils/localMathSolver";

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
  width: number;
}

interface TextElement {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

interface SolveStep {
  explanation: string;
  math?: string;
}

interface SolveResult {
  equation: string;
  steps: SolveStep[];
  result: string;
  timestamp: string;
  graphableFunction?: string;
  variables?: Record<string, string>;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

type ActionHistoryItem = 
  | { type: "stroke"; data: Stroke }
  | { type: "text"; data: TextElement };

export default function Calculator({ pid: _pid }: CalculatorProps) {
  // Mode selection: "basic" | "scientific" | "notes"
  const [mode, setMode] = useState<"basic" | "scientific" | "notes">("notes");
  
  // Basic & Scientific States
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  // Math Notes States
  const [canvasColor, setCanvasColor] = useState("#4f46e5"); // Indigo default pen
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser" | "text">("pen");

  // TTS Voice Explanation state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Smart Variables Memory list
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Canvas Vector Data
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [historyStack, setHistoryStack] = useState<ActionHistoryItem[]>([]);
  const [redoHistoryStack, setRedoHistoryStack] = useState<ActionHistoryItem[]>([]);

  // Active AI Solve result drawn directly inside the canvas
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);

  // Math Graph Zoom, Pan and animation parameter t drawn inside canvas
  const [graphZoom, setGraphZoom] = useState(30); 
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeVal, setTimeVal] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(0.04);
  const animationFrameRef = useRef<number | null>(null);

  // Bounding box of the graph inside the whiteboard canvas
  const [graphBox, setGraphBox] = useState({ x: 500, y: 150, width: 280, height: 200 });

  // Floating Text Tool temporary input states
  const [textInput, setTextInput] = useState("");
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);

  // Graph interaction state on canvas
  const [isInteractingWithGraph, setIsInteractingWithGraph] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const lastGraphDragRef = useRef({ x: 0, y: 0 });

  // AI Tutor Chat Panel States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isResultPanelOpen, setIsResultPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // AI Solver States
  const [isSolving, setIsSolving] = useState(false);
  const lastSolveTimeRef = useRef(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Retry, countdown timer and loading state text
  const [rateLimitTimer, setRateLimitTimer] = useState<number | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [loadingStateText, setLoadingStateText] = useState<string | null>(null);

  // Countdown timer handler for AI rate limiting
  useEffect(() => {
    if (rateLimitTimer === null || rateLimitTimer <= 0) {
      if (rateLimitTimer === 0) {
        setRateLimitTimer(null);
      }
      return;
    }

    const timer = setInterval(() => {
      setRateLimitTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitTimer]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);

  // Animation frame loop for 't'
  useEffect(() => {
    if (isAnimating) {
      const renderLoop = () => {
        setTimeVal((prev) => (prev + animationSpeed) % (2 * Math.PI));
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      };
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, animationSpeed]);

  // Redraw canvas with notebook lines, strokes, text elements, solution steps, and interactive graph
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw notebook ruling lines (horizontal blue lines)
    ctx.save();
    ctx.strokeStyle = "rgba(79, 70, 229, 0.08)"; // Ultra-soft subtle blue line
    ctx.lineWidth = 1;
    const lineSpacing = 28;
    for (let y = lineSpacing; y < canvas.height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw notebook left margin line (pink/red vertical line)
    ctx.strokeStyle = "rgba(239, 68, 68, 0.25)"; // Soft red/pink
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(56, 0);
    ctx.lineTo(56, canvas.height);
    ctx.stroke();
    ctx.restore();
    
    // Draw all completed strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
    });

    // Draw all text elements
    textElements.forEach((el) => {
      ctx.save();
      ctx.fillStyle = el.color;
      ctx.font = `bold ${el.size}px monospace`;
      ctx.fillText(el.text, el.x, el.y);
      ctx.restore();
    });

    // DRAW AI RESULTS AND SOLUTIONS DIRECTLY ON THE CANVAS
    if (solveResult) {
      const box = getStrokesBoundingBox();
      const stepsX = Math.min(canvas.width - 320, Math.max(100, box.maxX + 80));
      const stepsY = Math.max(50, box.minY - 20);

      // Draw final answer inline green text next to equation
      ctx.save();
      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = "#059669"; // Emerald 600
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
      ctx.fillText(`= ${solveResult.result}`, box.maxX + 20, box.minY + 25);
      ctx.restore();

      // Draw solution steps title & steps directly on whiteboard paper
      ctx.save();
      ctx.fillStyle = "#4f46e5"; // Indigo steps text
      ctx.font = "bold 11px monospace";
      ctx.fillText("AI EXPLANATION STEPS:", stepsX, stepsY);
      
      let currentY = stepsY + 22;
      solveResult.steps.forEach((step, idx) => {
        ctx.font = "600 11px sans-serif";
        ctx.fillStyle = "#1e293b";
        ctx.fillText(`${idx + 1}. ${step.explanation}`, stepsX, currentY);
        currentY += 18;
        if (step.math) {
          ctx.font = "bold 10px monospace";
          ctx.fillStyle = "#059669";
          ctx.fillText(`   ${step.math}`, stepsX, currentY);
          currentY += 16;
        }
      });
      ctx.restore();

      // Draw graph directly on canvas inside the graphBox boundary
      if (solveResult.graphableFunction) {
        ctx.save();
        // Background card layout on canvas
        ctx.fillStyle = "#07070a"; 
        ctx.beginPath();
        ctx.roundRect(graphBox.x, graphBox.y, graphBox.width, graphBox.height, 16);
        ctx.fill();

        ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Clip coordinate rendering inside the graphBox boundary
        ctx.clip();

        const centerX = graphBox.x + graphBox.width / 2 + graphOffset.x;
        const centerY = graphBox.y + graphBox.height / 2 + graphOffset.y;

        // Coordinate Grid inside graphBox
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;
        const stepDist = 25;
        for (let gx = (centerX - graphBox.x) % stepDist; gx < graphBox.width; gx += stepDist) {
          ctx.beginPath();
          ctx.moveTo(graphBox.x + gx, graphBox.y);
          ctx.lineTo(graphBox.x + gx, graphBox.y + graphBox.height);
          ctx.stroke();
        }
        for (let gy = (centerY - graphBox.y) % stepDist; gy < graphBox.height; gy += stepDist) {
          ctx.beginPath();
          ctx.moveTo(graphBox.x, graphBox.y + gy);
          ctx.lineTo(graphBox.x + graphBox.width, graphBox.y + gy);
          ctx.stroke();
        }

        // Axes lines
        ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, graphBox.y);
        ctx.lineTo(centerX, graphBox.y + graphBox.height);
        ctx.moveTo(graphBox.x, centerY);
        ctx.lineTo(graphBox.x + graphBox.width, centerY);
        ctx.stroke();

        // Plot function graph inside graphBox
        const funcString = solveResult.graphableFunction;
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#10b981";
        ctx.beginPath();

        let first = true;
        for (let pixelX = 0; pixelX < graphBox.width; pixelX++) {
          const x = (pixelX - (centerX - graphBox.x)) / graphZoom;
          const t = timeVal;

          let y = 0;
          try {
            const evalString = funcString
              .replace(/x/g, `(${x})`)
              .replace(/\bt\b/g, `(${t})`)
              .replace(/sin/g, "Math.sin")
              .replace(/cos/g, "Math.cos")
              .replace(/tan/g, "Math.tan")
              .replace(/sqrt/g, "Math.sqrt")
              .replace(/pow/g, "Math.pow")
              .replace(/pi/g, "Math.PI");

            // eslint-disable-next-line no-eval
            y = eval(evalString);
          } catch {
            continue;
          }

          const pixelY = centerY - y * graphZoom;
          if (pixelY >= graphBox.y && pixelY <= graphBox.y + graphBox.height) {
            if (first) {
              ctx.moveTo(graphBox.x + pixelX, pixelY);
              first = false;
            } else {
              ctx.lineTo(graphBox.x + pixelX, pixelY);
            }
          }
        }
        ctx.stroke();
        ctx.restore();

        // Draw graph overlay label directly on canvas
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`FUNCTION: ${solveResult.equation}`, graphBox.x + 12, graphBox.y + 18);
        ctx.restore();
      }
    }
  };

  // Bulletproof ResizeObserver for responsive canvas scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "notes") return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          redrawCanvas();
        }
      }
    });

    resizeObserver.observe(parent);
    
    const rect = parent.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    }

    return () => resizeObserver.disconnect();
  }, [mode, strokes, textElements, solveResult, graphZoom, graphOffset, timeVal]);

  // Explicitly focus the input box when it is spawned
  useEffect(() => {
    if (textInputPos && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputPos]);

  // Text-To-Speech solution speech
  const speakSolution = () => {
    if (!solveResult) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const stepsText = solveResult.steps 
      ? solveResult.steps.map((s, i) => `Step ${i + 1}: ${s.explanation}.`).join(" ")
      : "";

    const textToSpeak = `The result is ${solveResult.result}. ${stepsText}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Chat request sender to Gemini AI Math Tutor (via secure server-side API route)
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !solveResult) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const box = getStrokesBoundingBox();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userText,
          solveResult,
          variables,
          chatMessages,
        }),
      });

      if (response.status === 429) {
        const errData = await response.json();
        const baseDelay = errData.retryAfter || 20;
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `⚠️ AI Tutor limit reached (429 Rate Limit Exceeded). Please wait ${baseDelay} seconds and try again!`,
          },
        ]);
        setIsChatLoading(false);
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to contact AI Tutor endpoint");
      }

      const parsed = await response.json();
      
      // Add chat reply
      setChatMessages((prev) => [...prev, { sender: "ai", text: parsed.reply }]);
      
      // Handle canvas drawing actions
      if (parsed.action && parsed.action.type === "drawText" && parsed.action.text) {
        const drawX = Math.max(80, box.minX);
        const drawY = Math.max(280, box.maxY + 50 + (textElements.length * 30));
        
        const newEl: TextElement = {
          x: drawX,
          y: drawY,
          text: parsed.action.text,
          color: "#4f46e5", // Draw in indigo
          size: 22,
        };
        
        setTextElements((prev) => [...prev, newEl]);
        setHistoryStack((prev) => [...prev, { type: "text", data: newEl }]);
      }

    } catch (err: any) {
      console.error("Chat Tutor Error:", err);
      const errStr = String(err.message || "");
      const is429 = errStr.includes("429") || errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("rate limit");
      
      let tutorErrorText = `Sorry, I encountered an error: ${err.message}`;
      if (is429) {
        tutorErrorText = "⚠️ AI Tutor limit reached (429 Rate Limit Exceeded). Gemini free tier is currently busy. Please wait a few seconds and try sending your message again!";
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: tutorErrorText }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Bounding box helper
  const getStrokesBoundingBox = () => {
    if (strokes.length === 0 && textElements.length === 0) {
      return { minX: 100, maxX: 300, minY: 100, maxY: 200 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    strokes.forEach((s) => {
      s.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
    });

    textElements.forEach((el) => {
      if (el.x < minX) minX = el.x;
      if (el.x + 100 > maxX) maxX = el.x + 100;
      if (el.y - 12 < minY) minY = el.y - 12;
      if (el.y > maxY) maxY = el.y;
    });

    return { minX, maxX, minY, maxY };
  };

  const getDistance = (p1: Point, p2: Point) => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  const exportCanvasAsPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `math_notes_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Check if click coordinate lies inside inline graph boundary
  const isInsideGraphBox = (x: number, y: number) => {
    return x >= graphBox.x && x <= graphBox.x + graphBox.width &&
           y >= graphBox.y && y <= graphBox.y + graphBox.height;
  };

  // Drawing & Graph Interaction Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked inside graph area to pan graph instead of drawing
    if (solveResult?.graphableFunction && isInsideGraphBox(x, y)) {
      setIsInteractingWithGraph(true);
      lastGraphDragRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === "text") {
      setTextInputPos({ x, y });
      return;
    }

    isDrawingRef.current = true;
    
    if (tool === "eraser") {
      eraseAtPoint({ x, y });
    } else {
      currentStrokeRef.current = [{ x, y }];
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = canvasColor;
        ctx.fill();
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isInteractingWithGraph) {
      const deltaX = e.clientX - lastGraphDragRef.current.x;
      const deltaY = e.clientY - lastGraphDragRef.current.y;
      setGraphOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      lastGraphDragRef.current = { x: e.clientX, y: e.clientY };
      
      // Live hover coordinate tooltips
      const centerX = graphBox.x + graphBox.width / 2 + graphOffset.x;
      const centerY = graphBox.y + graphBox.height / 2 + graphOffset.y;
      const mathX = (x - centerX) / graphZoom;
      const mathY = (centerY - y) / graphZoom;
      setHoverCoords({ x: Number(mathX.toFixed(2)), y: Number(mathY.toFixed(2)) });
      return;
    }

    if (!isDrawingRef.current || tool === "text") return;

    if (tool === "eraser") {
      eraseAtPoint({ x, y });
    } else {
      const ctx = canvas.getContext("2d");
      if (!ctx || currentStrokeRef.current.length === 0) return;

      const lastPt = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      
      ctx.beginPath();
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = canvasColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      currentStrokeRef.current.push({ x, y });
    }
  };

  const stopDrawing = () => {
    if (isInteractingWithGraph) {
      setIsInteractingWithGraph(false);
      setHoverCoords(null);
      return;
    }

    if (isDrawingRef.current && tool === "pen" && currentStrokeRef.current.length > 0) {
      const newStroke: Stroke = {
        points: [...currentStrokeRef.current],
        color: canvasColor,
        width: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      setHistoryStack((prev) => [...prev, { type: "stroke", data: newStroke }]);
      setRedoHistoryStack([]);
    }
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
  };

  // Zoom grid inside canvas when scrolling inside graphBox
  const handleGraphWheelOnCanvas = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (solveResult?.graphableFunction && isInsideGraphBox(x, y)) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setGraphZoom((prev) => Math.max(5, Math.min(150, prev * zoomFactor)));
    }
  };

  const saveTextElement = () => {
    if (textInput.trim() && textInputPos) {
      const newEl: TextElement = {
        x: textInputPos.x,
        y: textInputPos.y + (brushSize * 4 + 12) * 0.85, 
        text: textInput,
        color: canvasColor,
        size: brushSize * 4 + 12,
      };
      setTextElements((prev) => [...prev, newEl]);
      setHistoryStack((prev) => [...prev, { type: "text", data: newEl }]);
      setRedoHistoryStack([]);
    }
    setTextInput("");
    setTextInputPos(null);
  };

  const eraseAtPoint = (pt: Point) => {
    const eraseRadius = 24;
    
    // Erase strokes
    setStrokes((prevStrokes) => {
      const filtered = prevStrokes.filter((stroke) => {
        return !stroke.points.some((p) => getDistance(p, pt) < eraseRadius);
      });
      return filtered;
    });

    // Erase text elements
    setTextElements((prevText) => {
      return prevText.filter((el) => {
        return getDistance({ x: el.x, y: el.y }, pt) > eraseRadius * 1.5;
      });
    });
  };

  const undo = () => {
    if (historyStack.length === 0) return;
    const lastAction = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setRedoHistoryStack((prev) => [...prev, lastAction]);

    if (lastAction.type === "stroke") {
      setStrokes((prev) => prev.slice(0, -1));
    } else {
      setTextElements((prev) => prev.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoHistoryStack.length === 0) return;
    const lastAction = redoHistoryStack[redoHistoryStack.length - 1];
    setRedoHistoryStack((prev) => prev.slice(0, -1));
    setHistoryStack((prev) => [...prev, lastAction]);

    if (lastAction.type === "stroke") {
      setStrokes((prev) => [...prev, lastAction.data]);
    } else {
      setTextElements((prev) => [...prev, lastAction.data]);
    }
  };

  const clearCanvas = () => {
    setStrokes([]);
    setTextElements([]);
    setSolveResult(null);
    setHistoryStack([]);
    setRedoHistoryStack([]);
    setAiLogs([]);
    setErrorMessage(null);
    setChatMessages([]);
    setIsChatOpen(false);
    setIsResultPanelOpen(false);
  };

  // Run AI Solver with secure Next.js API calling, exponential backoffs, and MathJS local fallback
  const runHandwrittenMathAI = async () => {
    // 1. Debounce Check (2 seconds)
    const now = Date.now();
    if (now - lastSolveTimeRef.current < 2000) {
      console.warn("Solve request debounced to prevent touch spam.");
      return;
    }
    lastSolveTimeRef.current = now;

    // 2. Request Deduplication Check
    if (isSolving) return;
    setIsSolving(true);

    if (strokes.length === 0 && textElements.length === 0) {
      setAiLogs(["[Math AI] Error: Canvas is empty. Write or type an equation first!"]);
      setIsSolving(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsSolving(false);
      return;
    }

    setIsScanning(true);
    setScanProgress(10);
    setErrorMessage(null);
    setRateLimitMessage(null);
    setRateLimitTimer(null);
    
    // Logging: Solve Started
    setAiLogs((prev) => [...prev, "[AI] Solve Started"]);
    setLoadingStateText("Analyzing Canvas...");

    // Helper function to render a flat image of strokes & text elements for OCR
    const getCanvasBase64Data = (): string => {
      const offCanvas = document.createElement("canvas");
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
      const offCtx = offCanvas.getContext("2d");
      if (offCtx) {
        offCtx.fillStyle = "white";
        offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        offCtx.lineWidth = brushSize > 4 ? brushSize : 5;
        offCtx.lineCap = "round";
        offCtx.lineJoin = "round";
        offCtx.strokeStyle = "black";
        
        strokes.forEach((s) => {
          if (s.points.length === 0) return;
          offCtx.beginPath();
          offCtx.moveTo(s.points[0].x, s.points[0].y);
          for (let j = 1; j < s.points.length; j++) {
            offCtx.lineTo(s.points[j].x, s.points[j].y);
          }
          offCtx.stroke();
        });

        textElements.forEach((el) => {
          offCtx.fillStyle = "black";
          offCtx.font = `bold ${el.size}px monospace`;
          offCtx.fillText(el.text, el.x, el.y);
        });
      }
      return offCanvas.toDataURL("image/png").split(",")[1];
    };
    const base64Image = getCanvasBase64Data();

    const executeAttempt = async (): Promise<SolveResult & { _log?: string }> => {
      setLoadingStateText("Checking Cache...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      setLoadingStateText("Contacting Gemini...");
      setScanProgress(60);
      
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          variables: variables,
        }),
      });

      if (response.status === 429) {
        setAiLogs((prev) => [...prev, "[AI] Rate Limited"]);
        throw new Error("AI Rate Limit Reached (429). Please wait a few seconds and try again.");
      }

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || "Failed to contact solve endpoint");
      }

      setLoadingStateText("Generating Solution...");
      return await response.json();
    };

    try {
      const parsed = await executeAttempt();
      
      if (parsed._log) {
        setAiLogs((prev) => [...prev, parsed._log!]);
      }

      const box = getStrokesBoundingBox();
      const stepsX = Math.min(canvas.width - 320, Math.max(100, box.maxX + 80));
      
      // Position graph box dynamic on the canvas directly under the written steps
      const stepsLineHeight = 22 + (parsed.steps?.length || 0) * 34;
      const graphY = Math.max(160, box.minY + stepsLineHeight);
      setGraphBox({
        x: stepsX,
        y: graphY,
        width: 280,
        height: 200,
      });

      setChatMessages([]);
      setSolveResult(parsed);
      setIsResultPanelOpen(true);
      if (parsed.graphableFunction?.toLowerCase().includes("t")) {
        setIsAnimating(true);
      }

      setScanProgress(100);
      setAiLogs((prev) => [...prev, "[AI] Solve Complete"]);
      setIsScanning(false);
      setLoadingStateText("Completed");
      setTimeout(() => setLoadingStateText(null), 1000);
      setIsSolving(false);
    } catch (err: any) {
      console.warn("Gemini solve failed, activating local MathJS fallback mode:", err);
      
      // AI Fallback Activated log
      setAiLogs((prev) => [...prev, "[AI] Fallback Activated"]);

      try {
        // Collect all text from typed whiteboard elements
        const typedExpr = textElements.map((el) => el.text).join(" ").trim();
        
        if (!typedExpr) {
          throw new Error(err.message || "Gemini exhausted and no typed text equations are present for local fallback solving.");
        }

        const localParsed = solveLocally(typedExpr);

        const box = getStrokesBoundingBox();
        const stepsX = Math.min(canvas.width - 320, Math.max(100, box.maxX + 80));
        const stepsLineHeight = 22 + (localParsed.steps?.length || 0) * 34;
        const graphY = Math.max(160, box.minY + stepsLineHeight);
        setGraphBox({
          x: stepsX,
          y: graphY,
          width: 280,
          height: 200,
        });

        setChatMessages([]);
        
        // Convert to SolveResult model format
        setSolveResult({
          equation: localParsed.equation,
          steps: localParsed.steps,
          result: localParsed.result,
          timestamp: new Date().toISOString(),
          graphableFunction: localParsed.graphableFunction || undefined
        });
        setIsResultPanelOpen(true);

        if (localParsed.graphableFunction?.toLowerCase().includes("t")) {
          setIsAnimating(true);
        }

        setScanProgress(100);
        setAiLogs((prev) => [...prev, "[AI] Solve Complete"]);
        setIsScanning(false);
        setLoadingStateText("Completed");
        setTimeout(() => setLoadingStateText(null), 1000);
        setIsSolving(false);

      } catch (fallbackErr: any) {
        console.error("Local fallback also failed:", fallbackErr);
        setErrorMessage(fallbackErr.message || "Gemini quota exhausted. Please try again later.");
        setIsScanning(false);
        setLoadingStateText(null);
        setIsSolving(false);
      }
    }
  };

  // Calculator basic logic
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
      
      setHistory((prev) => [`${equation} = ${resStr}`, ...prev.slice(0, 10)]);
      setDisplay(resStr);
      setEquation(resStr);
      setIsDone(true);
    } catch {
      setDisplay("Error");
      setEquation("");
      setIsDone(true);
    }
  };

  return (
    <div className="w-full h-full bg-[#07070a] text-zinc-200 flex flex-col p-4 select-none font-sans overflow-hidden">
      
      {/* Apple-Style Navigation Tab */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">✏️</span>
          <div>
            <h1 className="text-xs font-bold tracking-widest text-white uppercase bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">ARES Math Notes</h1>
            <p className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase">iPad-Inspired Scientific AI Core</p>
          </div>
        </div>

        <div className="flex gap-1 p-0.5 bg-zinc-900/60 border border-zinc-850 rounded-xl">
          {(["basic", "scientific", "notes"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3.5 py-1.5 text-[9.5px] font-bold rounded-lg transition-all duration-200 cursor-pointer uppercase ${
                mode === m
                  ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {m === "notes" ? "📝 Math Notes" : m === "scientific" ? "🔬 Scientific" : "🧮 Basic"}
            </button>
          ))}
        </div>
      </div>

      {mode !== "notes" ? (
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Main Calculator Pad */}
          <div className="flex-1 flex flex-col min-h-0 text-white">
            <div className="bg-zinc-950/80 border border-zinc-900/60 p-5 rounded-2xl mb-4 text-right flex flex-col justify-end min-h-[95px] flex-shrink-0 relative overflow-hidden shadow-inner">
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
              <button onClick={handleClear} className="py-3 text-xs font-bold rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 transition cursor-pointer hover:bg-zinc-855">AC</button>
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

              <button onClick={() => handleNumClick("7")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">7</button>
              <button onClick={() => handleNumClick("8")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">8</button>
              <button onClick={() => handleNumClick("9")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">9</button>
              <button onClick={() => handleOpClick("+")} className="py-3 text-xs font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">+</button>

              {mode === "scientific" && (
                <>
                  <button onClick={() => handleScientificOp("sqrt(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">√</button>
                  <button onClick={() => handleScientificOp("(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">(</button>
                  <button onClick={() => handleScientificOp(")")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">)</button>
                  <button onClick={() => handleScientificOp("log(")} className="py-2 text-[9px] font-bold rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 transition cursor-pointer hover:bg-indigo-950/40">log</button>
                </>
              )}

              <button onClick={() => handleNumClick("4")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">4</button>
              <button onClick={() => handleNumClick("5")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">5</button>
              <button onClick={() => handleNumClick("6")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">6</button>
              <button onClick={handleEqual} className="py-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer row-span-2 flex items-center justify-center shadow-lg shadow-indigo-600/30">=</button>

              <button onClick={() => handleNumClick("1")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">1</button>
              <button onClick={() => handleNumClick("2")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">2</button>
              <button onClick={() => handleNumClick("3")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">3</button>

              <button onClick={() => handleNumClick("0")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50 col-span-2">0</button>
              <button onClick={() => handleNumClick(".")} className="py-3 text-xs font-bold rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 transition cursor-pointer hover:bg-zinc-950/50">.</button>
            </div>
          </div>

          {/* Sidebar History Panel */}
          <div className="w-[140px] bg-zinc-950/40 border border-zinc-900/60 rounded-2xl p-4 flex flex-col min-h-0 shadow-inner">
            <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-widest block mb-3 pb-1 border-b border-zinc-900">History</span>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-[9.5px]">
              {history.length === 0 ? (
                <div className="text-zinc-650 italic text-center py-4">Empty</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="border-b border-zinc-900/60 pb-2 text-zinc-400 break-all select-text font-mono">
                    {h}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* MATH NOTES WHITEBOARD (UNIFIED FULL SCREEN INTERACTIVE WHITEBOARD) */
        <div 
          className="flex-1 flex flex-col min-h-0 overflow-hidden relative rounded-3xl border border-[#cbd5e1]/10 bg-[#fdfcfa] shadow-[0_15px_45px_rgba(0,0,0,0.25)]"
        >
          {/* Canvas Draw Layer */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onWheel={handleGraphWheelOnCanvas}
            className="w-full h-full cursor-crosshair block absolute top-0 left-0 z-10"
          />

          {/* Laser Scanning Scanner Overlay */}
          {isScanning && (
            <div 
              style={{ top: `${scanProgress}%` }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1] animate-pulse pointer-events-none z-20"
            />
          )}

          {/* Floating Text Tool input overlay */}
          {textInputPos && (
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={saveTextElement}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") saveTextElement();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: `${textInputPos.x}px`,
                top: `${textInputPos.y}px`,
                color: canvasColor,
                fontSize: `${brushSize * 4 + 12}px`,
                background: "rgba(255, 255, 255, 0.98)",
                border: "1.5px solid #6366f1",
                outline: "none",
                fontFamily: "monospace",
                fontWeight: "bold",
                borderRadius: "8px",
                padding: "3px 8px",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.15)",
                zIndex: 40,
              }}
              className="m-0 w-[220px] select-text text-zinc-950 bg-white"
              placeholder="Type expression..."
            />
          )}

          {/* Dynamic AI Loading Status Pill */}
          {isScanning && loadingStateText && (
            <div style={{ zIndex: 30 }} className="absolute top-5 left-5 bg-zinc-950/90 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{loadingStateText}</span>
            </div>
          )}

          {/* Draggable error notification toast */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                style={{ zIndex: 50 }}
                className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-rose-950/95 border border-rose-500/30 text-rose-200 px-4 py-3 rounded-2xl shadow-[0_15px_30px_rgba(244,63,94,0.15)] backdrop-blur-md max-w-[80%]"
              >
                <div className="text-[11px] font-semibold leading-relaxed">
                  {errorMessage}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      runHandwrittenMathAI();
                    }}
                    className="px-2.5 py-1 text-[9.5px] font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-lg cursor-pointer transition shadow-sm"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="px-2 py-1 text-[9.5px] font-bold text-rose-350 hover:bg-rose-900/60 rounded-lg cursor-pointer transition"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rate Limit Alert Countdown Overlay */}
          <AnimatePresence>
            {rateLimitMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                style={{ zIndex: 50 }}
                className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 bg-indigo-950/95 border border-indigo-500/35 text-indigo-200 px-5 py-3.5 rounded-2xl shadow-[0_15px_35px_rgba(99,102,241,0.2)] backdrop-blur-md max-w-[80%]"
              >
                <div className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">
                  ⚠️ AI Rate Limit Reached
                </div>
                <div className="text-[11px] font-semibold text-center leading-relaxed">
                  Retrying automatically in <span className="font-black text-white bg-indigo-650 px-2 py-0.5 rounded-md animate-pulse">{rateLimitTimer}</span> seconds...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline Action Controls overlaying the canvas for speaks, animations and AI Chat */}
          {solveResult && (
            <div className="absolute top-5 right-5 z-35 flex items-center gap-2 bg-white/80 border border-white/50 px-3 py-1.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md">
              <button
                onClick={speakSolution}
                className="px-2.5 py-1 text-[9.5px] font-bold rounded-lg transition-all duration-150 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-650 flex items-center gap-1 cursor-pointer"
              >
                🔊 {isSpeaking ? "Stop Speech" : "Speak steps"}
              </button>

              {solveResult.graphableFunction && (
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className={`px-2.5 py-1 text-[9.5px] font-bold rounded-lg border transition cursor-pointer ${
                    isAnimating
                      ? "bg-rose-950/60 text-rose-455 border-rose-900/50 animate-pulse"
                      : "bg-indigo-950/40 text-indigo-400 border-indigo-900/30 hover:bg-indigo-900/40"
                  }`}
                >
                  {isAnimating ? "⏸️ Pause Graph" : "▶️ Play Graph"}
                </button>
              )}

              <button
                onClick={() => {
                  setIsResultPanelOpen(!isResultPanelOpen);
                  setIsChatOpen(false);
                }}
                className="px-2.5 py-1 text-[9.5px] font-bold rounded-lg transition-all duration-150 bg-indigo-50 hover:bg-indigo-100/70 text-indigo-650 flex items-center gap-1 cursor-pointer"
              >
                📊 {isResultPanelOpen ? "Hide Panel" : "Show Panel"}
              </button>

              <button
                onClick={() => {
                  setIsChatOpen(!isChatOpen);
                  setIsResultPanelOpen(false);
                }}
                className="px-2.5 py-1 text-[9.5px] font-bold rounded-lg transition-all duration-150 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-650 flex items-center gap-1 cursor-pointer border border-transparent hover:border-emerald-250"
              >
                💬 Ask Tutor
              </button>
            </div>
          )}

          {/* Ask AI Sliding Side Drawer Panel */}
          <AnimatePresence>
            {isChatOpen && solveResult && (
              <motion.div
                initial={{ x: 350, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 350, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{ zIndex: 40 }}
                className="absolute right-0 top-0 bottom-0 w-[330px] bg-zinc-950/95 border-l border-zinc-800/80 p-5 flex flex-col min-h-0 shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-zinc-900 mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎓</span>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase">ARES AI Tutor</h3>
                      <p className="text-[8px] text-zinc-500 font-semibold uppercase">Ask questions & explanations</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-bold"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mb-4 scrollbar-thin text-left select-text">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <span className="text-3xl mb-3 opacity-30">💬</span>
                      <h4 className="text-[11px] font-bold text-zinc-400 mb-1">Hi, I'm your ARES AI Tutor</h4>
                      <p className="text-[9px] text-zinc-500 leading-relaxed">
                        Ask me anything about the equation, steps, variable definitions, or real-world applications of this math!
                      </p>
                      
                      {/* Suggestion Prompts */}
                      <div className="mt-5 w-full space-y-1.5">
                        {[
                          "Explain the steps in simpler terms",
                          "Where is this equation used in real life?",
                          "Explain variables & graph parameters"
                        ].map((promptText) => (
                          <button
                            key={promptText}
                            onClick={() => {
                              setChatInput(promptText);
                            }}
                            className="w-full text-left text-[9px] text-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-900/20 rounded-xl px-3 py-2 cursor-pointer transition"
                          >
                            💡 "{promptText}"
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-550 mb-0.5 px-1">
                          {msg.sender === "user" ? "You" : "ARES AI Tutor"}
                        </span>
                        <div 
                          className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-[10px] leading-relaxed shadow-sm break-words whitespace-pre-wrap select-text selection:bg-indigo-500/30 ${
                            msg.sender === "user" 
                              ? "bg-indigo-600 text-white rounded-tr-none" 
                              : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex flex-col items-start">
                      <span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-550 mb-0.5 px-1">ARES AI Tutor</span>
                      <div className="bg-zinc-900 text-zinc-450 border border-zinc-850 rounded-2xl rounded-tl-none px-3.5 py-2 text-[10px] flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Footer */}
                <div className="flex gap-2 border-t border-zinc-900 pt-3 flex-shrink-0">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") sendChatMessage();
                    }}
                    placeholder="Ask a question about this math..."
                    className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 select-text"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-[10px] font-bold rounded-xl shadow-md cursor-pointer transition shrink-0"
                  >
                    Send
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed Result Sliding Side Drawer Panel */}
          <AnimatePresence>
            {isResultPanelOpen && solveResult && (
              <motion.div
                initial={{ x: 350, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 350, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{ zIndex: 40 }}
                className="absolute right-0 top-0 bottom-0 w-[330px] bg-zinc-950/95 border-l border-zinc-800/80 p-5 flex flex-col min-h-0 shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-zinc-900 mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase">Solution Details</h3>
                      <p className="text-[8px] text-zinc-500 font-semibold uppercase">AI Generated Output</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsResultPanelOpen(false)}
                    className="text-zinc-500 hover:text-white transition cursor-pointer text-xs font-bold"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Result Body */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin text-left select-text">
                  
                  {/* Equation Box */}
                  <div className="bg-zinc-900/85 border border-zinc-800/60 p-3.5 rounded-2xl">
                    <span className="text-[7.5px] font-black tracking-widest text-indigo-400 uppercase">Recognized Equation</span>
                    <div className="text-sm font-mono font-bold text-white mt-1 select-text">
                      {solveResult.equation}
                    </div>
                  </div>

                  {/* Final Result Box */}
                  <div className="bg-emerald-950/40 border border-emerald-500/20 p-3.5 rounded-2xl">
                    <span className="text-[7.5px] font-black tracking-widest text-emerald-400 uppercase">Final Result</span>
                    <div className="text-xl font-mono font-bold text-emerald-400 mt-1 select-text">
                      {solveResult.result}
                    </div>
                  </div>

                  {/* Steps Box */}
                  <div className="space-y-3">
                    <span className="text-[7.5px] font-black tracking-widest text-zinc-450 uppercase">Step-by-Step Explanation</span>
                    {solveResult.steps && solveResult.steps.map((step, idx) => (
                      <div key={idx} className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl space-y-1.5">
                        <div className="text-[10px] font-bold text-zinc-300 leading-relaxed">
                          {idx + 1}. {step.explanation}
                        </div>
                        {step.math && (
                          <div className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded-md inline-block select-text">
                            {step.math}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Variables Box */}
                  {solveResult.variables && Object.keys(solveResult.variables).length > 0 && (
                    <div className="bg-zinc-900/30 border border-zinc-900 p-3.5 rounded-2xl space-y-2">
                      <span className="text-[7.5px] font-black tracking-widest text-purple-400 uppercase">Saved Variables</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(solveResult.variables).map(([name, val]) => (
                          <div key={name} className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-center">
                            <div className="text-[9px] font-bold text-zinc-500 uppercase">{name}</div>
                            <div className="text-xs font-mono font-bold text-purple-400">{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Graphable Function */}
                  {solveResult.graphableFunction && (
                    <div className="bg-zinc-900/30 border border-zinc-900 p-3.5 rounded-2xl space-y-1">
                      <span className="text-[7.5px] font-black tracking-widest text-amber-400 uppercase">Graph Function</span>
                      <div className="text-[10px] font-mono text-zinc-300">
                        {solveResult.graphableFunction}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FLOATING GLASS TOOLBAR (Apple-inspired bottom bar overlay) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-35 flex items-center gap-3.5 bg-white/85 border border-white/50 px-4.5 py-2.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-lg max-w-[95%]">
            
            {/* Tool Toggle */}
            <div className="flex bg-zinc-200/50 p-0.5 rounded-xl border border-zinc-300/40">
              <button
                onClick={() => setTool("pen")}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                  tool === "pen" ? "bg-white text-zinc-900 shadow-sm scale-[1.03]" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                ✏️ Pen
              </button>
              <button
                onClick={() => setTool("text")}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                  tool === "text" ? "bg-white text-zinc-900 shadow-sm scale-[1.03]" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                🔤 Text
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                  tool === "eraser" ? "bg-white text-zinc-900 shadow-sm scale-[1.03]" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                🧹 Eraser
              </button>
            </div>

            <div className="w-[1px] h-5 bg-zinc-300/80" />

            {/* Color Selectors */}
            <div className="flex gap-1.5">
              {["#4f46e5", "#059669", "#dc2626", "#d97706", "#2563eb", "#18181b"].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setCanvasColor(color);
                    if (tool === "eraser") setTool("pen");
                  }}
                  style={{ backgroundColor: color }}
                  className={`w-4.5 h-4.5 rounded-full border border-white/60 transition-all cursor-pointer ${
                    canvasColor === color && tool !== "eraser"
                      ? "ring-2 ring-indigo-500 scale-125 shadow-sm"
                      : "hover:scale-110"
                  }`}
                />
              ))}
            </div>

            <div className="w-[1px] h-5 bg-zinc-300/80" />

            {/* Brush size */}
            <div className="flex items-center gap-1.5">
              <span className="text-[7.5px] text-zinc-400 font-bold uppercase tracking-wider">Size</span>
              <input
                type="range"
                min="2"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-14 h-1 accent-indigo-650 bg-zinc-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="w-[1px] h-5 bg-zinc-300/80" />

            {/* Undo / Redo */}
            <div className="flex gap-1">
              <button
                onClick={undo}
                disabled={historyStack.length === 0}
                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-650 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition text-[9px]"
              >
                ↩️
              </button>
              <button
                onClick={redo}
                disabled={redoHistoryStack.length === 0}
                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-650 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition text-[9px]"
              >
                ↪️
              </button>
            </div>

            <div className="w-[1px] h-5 bg-zinc-300/80" />

            {/* Actions */}
            <div className="flex gap-1.5">
              <button
                onClick={exportCanvasAsPNG}
                className="px-3 py-1.5 text-[9.5px] font-bold text-indigo-650 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 rounded-lg cursor-pointer transition flex items-center gap-1"
                title="Export Notes as Image"
              >
                💾 Save
              </button>
              <button
                onClick={clearCanvas}
                className="px-3 py-1.5 text-[9.5px] font-bold text-zinc-600 hover:text-rose-600 bg-zinc-100 hover:bg-rose-50 rounded-lg cursor-pointer transition"
              >
                Clear
              </button>
              <button
                onClick={runHandwrittenMathAI}
                disabled={isScanning || rateLimitTimer !== null || isSolving}
                className="px-4.5 py-1.5 text-[9.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md hover:shadow-lg shadow-indigo-600/10 cursor-pointer transition disabled:opacity-50"
                title="Solve equation on canvas"
              >
                {rateLimitTimer !== null ? `Wait ${rateLimitTimer}s` : isSolving ? "Solve In Progress" : "✨ Solve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
