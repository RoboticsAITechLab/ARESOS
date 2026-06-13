"use client";

import React, { useRef, useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { WindowInstance } from "@/types/webos/window";

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
        
        let newX = dragStart.current.winX + deltaX;
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

  if (windowState.isMinimized) return null;

  const style: React.CSSProperties = windowState.isMaximized
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: "48px", // taskbar height
        zIndex: windowState.zIndex,
      }
    : {
        position: "absolute",
        left: `${windowState.x}px`,
        top: `${windowState.y}px`,
        width: `${windowState.width}px`,
        height: `${windowState.height}px`,
        zIndex: windowState.zIndex,
      };

  return (
    <div
      ref={windowRef}
      style={style}
      onClick={() => focusWindow(windowState.pid)}
      className={`flex flex-col rounded-t-lg shadow-2xl border transition-shadow duration-200 overflow-hidden ${
        isActive
          ? "border-zinc-500/50 shadow-zinc-950/40 bg-zinc-900/85 backdrop-blur-xl text-zinc-50"
          : "border-zinc-700/30 shadow-black/20 bg-zinc-950/75 backdrop-blur-md text-zinc-400"
      }`}
    >
      {/* Window Header (Title Bar) */}
      <div
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={() => maximizeWindow(windowState.pid)}
        className={`flex items-center justify-between h-10 px-4 select-none cursor-default border-b ${
          isActive
            ? "bg-zinc-800/40 border-zinc-700/50"
            : "bg-zinc-900/20 border-zinc-800/35"
        }`}
      >
        <span className="text-sm font-semibold truncate select-none">
          {windowState.title}
        </span>
        
        {/* Title Bar Buttons */}
        <div className="flex items-center gap-2">
          {/* Minimize */}
          <button
            onClick={() => minimizeWindow(windowState.pid)}
            className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 flex items-center justify-center transition-colors cursor-pointer text-[9px] text-yellow-950 font-bold select-none"
            title="Minimize"
          >
            –
          </button>
          
          {/* Maximize */}
          <button
            onClick={() => maximizeWindow(windowState.pid)}
            className="w-3.5 h-3.5 rounded-full bg-green-500/80 hover:bg-green-500 flex items-center justify-center transition-colors cursor-pointer text-[8px] text-green-950 font-bold select-none"
            title="Maximize"
          >
            ⤢
          </button>

          {/* Close */}
          <button
            onClick={() => terminateApp(windowState.pid)}
            className="w-3.5 h-3.5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors cursor-pointer text-[9px] text-red-950 font-bold select-none"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto bg-zinc-900/60 p-0 relative">
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
            className="text-zinc-600 hover:text-zinc-400 select-none pointer-events-none"
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
