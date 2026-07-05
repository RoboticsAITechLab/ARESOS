"use client";

import React, { useRef, useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { WindowInstance } from "@/types/webos/window";
import { DotGothic16 } from "next/font/google";

interface WindowProps {
  windowState: WindowInstance;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ windowState, children }) => {
  const {
    activePid,
    focusWindow,
    terminateApp,
    minimizeWindow,
    maximizeWindow,
    updateWindowPosition,
    updateWindowDimensions,
    settings,
  } = useOS();

  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const isActive = activePid === windowState.pid;

  // Handle Drag Start
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (windowState.isMaximized) return;
    
    // Focus window
    focusWindow(windowState.pid);
    
    // Ignore if clicking buttons
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      winX: windowState.x,
      winY: windowState.y,
    };
    
    e.preventDefault();
  };

  // Handle Resize Start
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    focusWindow(windowState.pid);
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: windowState.width,
      height: windowState.height,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  // Global mousemove/mouseup handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.current.x;
        const deltaY = e.clientY - dragStart.current.y;
        
        const newX = dragStart.current.winX + deltaX;
        let newY = dragStart.current.winY + deltaY;

        // Prevent dragging above top bar (Y = 0)
        if (newY < 0) newY = 0;

        updateWindowPosition(windowState.pid, newX, newY);
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;

        const newWidth = Math.max(300, resizeStart.current.width + deltaX);
        const newHeight = Math.max(200, resizeStart.current.height + deltaY);

        updateWindowDimensions(windowState.pid, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, windowState.pid, updateWindowPosition, updateWindowDimensions, windowState.x, windowState.y, windowState.width, windowState.height]);

  const isTransitioning = !isDragging && !isResizing;

  const style: React.CSSProperties = windowState.isMaximized
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: "76px", // clear floating Dock/Taskbar height (with margin)
        zIndex: windowState.zIndex,
        transformOrigin: "bottom center",
        transition: isTransitioning
          ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out"
          : "none",
        transform: windowState.isMinimized ? "scale(0.01) translateY(800px)" : "scale(1) translateY(0)",
        opacity: windowState.isMinimized ? 0 : 1,
        pointerEvents: windowState.isMinimized ? "none" : "auto",
      }
    : {
        position: "absolute",
        left: `${windowState.x}px`,
        top: `${windowState.y}px`,
        width: `${windowState.width}px`,
        height: `${windowState.height}px`,
        zIndex: windowState.zIndex,
        transformOrigin: "bottom center",
        transition: isTransitioning
          ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out, left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out"
          : "none",
        transform: windowState.isMinimized ? "scale(0.01) translateY(800px)" : "scale(1) translateY(0)",
        opacity: windowState.isMinimized ? 0 : 1,
        pointerEvents: windowState.isMinimized ? "none" : "auto",
      };

  const theme = settings?.theme || "dark";

  let windowThemeClasses = "";
  let headerThemeClasses = "";

  if (theme === "light") {
    windowThemeClasses = isActive
      ? "border-emerald-600/60 shadow-emerald-200/30 bg-emerald-50/90 text-emerald-950"
      : "border-slate-300 shadow-black/5 bg-slate-100/80 text-slate-550";
    headerThemeClasses = isActive
      ? "bg-emerald-100 border-emerald-200"
      : "bg-slate-200/50 border-slate-300/40";
  } else if (theme === "midnight") {
    windowThemeClasses = isActive
      ? "border-purple-500/80 shadow-purple-950/50 bg-slate-950/90 text-purple-200"
      : "border-purple-900/30 shadow-black/30 bg-slate-950/80 text-purple-400/80";
    headerThemeClasses = isActive
      ? "bg-purple-950/60 border-purple-800/40"
      : "bg-purple-950/20 border-purple-900/20";
  } else if (theme === "aurora") {
    windowThemeClasses = isActive
      ? "border-cyan-500/80 shadow-cyan-950/50 bg-zinc-950/90 text-cyan-200"
      : "border-cyan-900/30 shadow-black/30 bg-zinc-950/80 text-cyan-500/80";
    headerThemeClasses = isActive
      ? "bg-cyan-950/60 border-cyan-800/40"
      : "bg-cyan-950/20 border-cyan-900/20";
  } else {
    // dark theme (default ARES OS Terminal Green)
    windowThemeClasses = isActive
      ? "border-emerald-500/80 shadow-emerald-950/50 bg-black/90 text-emerald-400"
      : "border-emerald-900/30 shadow-black/40 bg-zinc-950/85 text-emerald-600/70";
    headerThemeClasses = isActive
      ? "bg-emerald-950/60 border-emerald-900/40"
      : "bg-emerald-950/20 border-emerald-950/20";
  }

  return (
    <div
      ref={windowRef}
      style={style}
      onClick={() => focusWindow(windowState.pid)}
      className={`flex flex-col rounded-none shadow-2xl border-2 transition-shadow duration-200 overflow-hidden ${windowThemeClasses}`}
    >
      {/* Window Header (Title Bar) */}
      <div
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={() => maximizeWindow(windowState.pid)}
        className={`flex items-center justify-between h-9 px-3 select-none cursor-default border-b font-mono ${headerThemeClasses}`}
      >
        <span className="text-xs font-bold uppercase tracking-wider truncate select-none">
          ⚡ {windowState.title}
        </span>
        
        {/* Title Bar Buttons */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {/* Minimize */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(windowState.pid);
            }}
            className="px-1.5 py-0.5 border border-zinc-700/50 hover:bg-zinc-800/80 transition-colors cursor-pointer text-[10px] select-none text-zinc-400 font-bold"
            title="Minimize"
          >
            _
          </button>
          
          {/* Maximize */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(windowState.pid);
            }}
            className="px-1.5 py-0.5 border border-zinc-700/50 hover:bg-zinc-800/80 transition-colors cursor-pointer text-[10px] select-none text-zinc-400 font-bold"
            title="Maximize"
          >
            ⛶
          </button>

          {/* Close */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              terminateApp(windowState.pid);
            }}
            className="px-1.5 py-0.5 border border-red-500/40 hover:bg-red-950/60 transition-colors cursor-pointer text-[10px] select-none text-red-400 font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className={`flex-1 overflow-auto p-0 relative ${theme === "light" ? "bg-white/70" : "bg-black/40"}`}>
        {children}
      </div>

      {/* Window Resize Handle */}
      {!windowState.isMaximized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5"
          style={{ zIndex: 100 }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-zinc-650 hover:text-zinc-400 select-none pointer-events-none"
          >
            <line x1="6" y1="0" x2="0" y2="6" />
            <line x1="7" y1="3" x2="3" y2="7" />
            <line x1="8" y1="6" x2="6" y2="8" />
          </svg>
        </div>
      )}
    </div>
  );
};




// ===========================================================


