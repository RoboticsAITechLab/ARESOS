"use client";

import React, { useState, useRef, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

type ToolType = "pencil" | "eraser" | "bucket";
type GridSize = 16 | 32 | 64;

const NEON_PALETTE = [
  "#00ffff", // Cyan
  "#ff00ff", // Magenta
  "#ffff00", // Yellow
  "#9d4edd", // Purple
  "#39ff14", // Neon Green
  "#ff3131", // Neon Red
  "#ffffff", // White
  "#000000"  // Black
];

export default function PixelPaint() {
  const { addNotification } = useOS();
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [activeColor, setActiveColor] = useState("#00ffff");
  const [activeTool, setActiveTool] = useState<ToolType>("pencil");
  const [customColor, setCustomColor] = useState("#00ffff");
  const [showGridLines, setShowGridLines] = useState(true);

  // Grid pixels map. We use a 1D array of length gridSize * gridSize
  const [pixels, setPixels] = useState<string[]>([]);
  const isDrawingRef = useRef(false);

  // Initialize pixels when grid size changes
  useEffect(() => {
    setPixels(Array(gridSize * gridSize).fill("#000000"));
  }, [gridSize]);

  // Color picker selection handler
  const handleColorSelect = (color: string) => {
    setActiveColor(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomColor(val);
    setActiveColor(val);
  };

  // Draw pixel helper
  const drawPixel = (index: number) => {
    const nextPixels = [...pixels];
    if (activeTool === "pencil") {
      nextPixels[index] = activeColor;
    } else if (activeTool === "eraser") {
      nextPixels[index] = "#000000";
    } else if (activeTool === "bucket") {
      // Flood fill implementation
      const targetColor = pixels[index];
      const fillColor = activeColor;
      if (targetColor === fillColor) return;

      const queue = [index];
      const visited = new Set<number>();
      visited.add(index);

      const getNeighbors = (idx: number) => {
        const row = Math.floor(idx / gridSize);
        const col = idx % gridSize;
        const neighbors = [];

        if (row > 0) neighbors.push(idx - gridSize);
        if (row < gridSize - 1) neighbors.push(idx + gridSize);
        if (col > 0) neighbors.push(idx - 1);
        if (col < gridSize - 1) neighbors.push(idx + 1);

        return neighbors;
      };

      while (queue.length > 0) {
        const curr = queue.shift()!;
        nextPixels[curr] = fillColor;

        for (const neighbor of getNeighbors(curr)) {
          if (!visited.has(neighbor) && nextPixels[neighbor] === targetColor) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
    setPixels(nextPixels);
  };

  // Drag-to-paint mouse event listeners
  const handleMouseDown = (index: number) => {
    isDrawingRef.current = true;
    drawPixel(index);
  };

  const handleMouseEnter = (index: number) => {
    if (isDrawingRef.current && activeTool !== "bucket") {
      drawPixel(index);
    }
  };

  const handleMouseUpGlobal = () => {
    isDrawingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUpGlobal);
    return () => window.removeEventListener("mouseup", handleMouseUpGlobal);
  }, []);

  const handleClear = () => {
    if (confirm("Clear paint board? Your current art will be reset.")) {
      setPixels(Array(gridSize * gridSize).fill("#000000"));
    }
  };

  // Convert pixel art map into a real canvas and trigger PNG file download
  const handleExport = () => {
    const scale = 24; // Scale factor for exported PNG
    const canvas = document.createElement("canvas");
    canvas.width = gridSize * scale;
    canvas.height = gridSize * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        ctx.fillStyle = pixels[idx] || "#000000";
        ctx.fillRect(col * scale, row * scale, scale, scale);
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `pixel_art_${gridSize}x${gridSize}.png`;
    link.href = dataUrl;
    link.click();
    addNotification("Pixel Paint", "Image exported successfully as PNG!", "success");
  };

  return (
    <div className="w-full h-full bg-[#030206] text-slate-200 flex flex-col font-mono p-4 select-none relative border border-purple-900/40">
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c041c_1px,transparent_1px),linear-gradient(to_bottom,#0c041c_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center z-10 border-b border-purple-950 pb-3 mb-4">
        <div>
          <h2 className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            NEON PIXEL CANVAS
          </h2>
          <p className="text-[10px] text-purple-400 tracking-widest">RETRO PIXEL ART CREATOR</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGridSize(16)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer transition ${
              gridSize === 16 
                ? "bg-purple-600/30 border-purple-400 text-purple-300"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            16x16
          </button>
          <button
            onClick={() => setGridSize(32)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer transition ${
              gridSize === 32
                ? "bg-purple-600/30 border-purple-400 text-purple-300"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            32x32
          </button>
          <button
            onClick={() => setGridSize(64)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer transition ${
              gridSize === 64
                ? "bg-purple-600/30 border-purple-400 text-purple-300"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            64x64
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0 z-10">
        
        {/* Left column: Toolboxes, Colors */}
        <div className="flex flex-col gap-4">
          
          {/* Drawing Tools */}
          <div className="bg-slate-950/60 border border-purple-950/80 rounded-xl p-3.5 flex flex-col gap-2">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Canvas Tools</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveTool("pencil")}
                className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition flex flex-col items-center gap-1 ${
                  activeTool === "pencil"
                    ? "bg-purple-600/25 border-purple-400 text-purple-300"
                    : "bg-slate-900/40 border-indigo-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>✏️</span>
                <span className="text-[9px]">Pencil</span>
              </button>
              <button
                onClick={() => setActiveTool("eraser")}
                className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition flex flex-col items-center gap-1 ${
                  activeTool === "eraser"
                    ? "bg-purple-600/25 border-purple-400 text-purple-300"
                    : "bg-slate-900/40 border-indigo-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🧽</span>
                <span className="text-[9px]">Erase</span>
              </button>
              <button
                onClick={() => setActiveTool("bucket")}
                className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition flex flex-col items-center gap-1 ${
                  activeTool === "bucket"
                    ? "bg-purple-600/25 border-purple-400 text-purple-300"
                    : "bg-slate-900/40 border-indigo-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🪣</span>
                <span className="text-[9px]">Fill</span>
              </button>
            </div>

            <button
              onClick={() => setShowGridLines(!showGridLines)}
              className={`mt-2 py-1.5 text-[10px] font-bold rounded border cursor-pointer transition ${
                showGridLines 
                  ? "bg-purple-900/10 border-purple-900/50 text-purple-300" 
                  : "bg-slate-900/40 border-slate-950 text-slate-500"
              }`}
            >
              {showGridLines ? "HIDE GRID LINES" : "SHOW GRID LINES"}
            </button>
          </div>

          {/* Color Palettes */}
          <div className="bg-slate-955/60 border border-purple-955/80 rounded-xl p-3.5 flex flex-col gap-2.5">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Neon Swatches</span>
            <div className="grid grid-cols-4 gap-2">
              {NEON_PALETTE.map((color) => {
                const isSelected = activeColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    style={{ backgroundColor: color }}
                    className={`w-full aspect-square rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-white ring-2 ring-purple-500 scale-[0.9]"
                        : "border-slate-800 hover:scale-[1.05]"
                    }`}
                  />
                );
              })}
            </div>
            
            <div className="flex items-center justify-between border-t border-purple-955/40 pt-2.5 mt-1">
              <span className="text-[10px] text-slate-400">CUSTOM COLOR</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="w-7 h-7 bg-transparent border-0 rounded cursor-pointer"
                />
                <span className="text-[10px] font-semibold text-slate-400 font-mono select-all">
                  {customColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Disk Controls */}
          <div className="bg-slate-955/60 border border-purple-955/80 rounded-xl p-3 flex gap-2.5">
            <button
              onClick={handleClear}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold rounded-lg text-rose-400 transition cursor-pointer"
            >
              CLEAR ALL
            </button>
            <button
              onClick={handleExport}
              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-[0_0_10px_rgba(219,39,119,0.25)]"
            >
              EXPORT PNG
            </button>
          </div>

        </div>

        {/* Right column: Interactive Canvas Board */}
        <div className="md:col-span-3 bg-black/80 rounded-2xl border border-purple-955/70 p-4 flex items-center justify-center min-h-0 overflow-hidden relative">
          
          {/* Canvas Wrapper */}
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              width: "100%",
              maxWidth: "400px",
              aspectRatio: "1/1",
              border: "2px solid #581c87"
            }}
            className="shadow-[0_0_30px_rgba(88,28,135,0.3)] bg-[#000000]"
          >
            {pixels.map((color, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: color,
                  border: showGridLines ? "1px solid rgba(88, 28, 135, 0.15)" : "none"
                }}
                className="w-full h-full cursor-crosshair transition-all duration-75"
                onMouseDown={() => handleMouseDown(index)}
                onMouseEnter={() => handleMouseEnter(index)}
              />
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
