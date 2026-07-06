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
    settings,
  } = useOS();

  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const isActive = activePid === windowState.pid;
  const isVisible = isActive && !windowState.isMinimized;

  // Handle Drag Start
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
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
    if (isMobile) return;
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
      if (isMobile) return;
      if (isDragging) {
        const deltaX = e.clientX - dragStart.current.x;
        const deltaY = e.clientY - dragStart.current.y;
        
        let newX = dragStart.current.winX + deltaX;
        let newY = dragStart.current.winY + deltaY;

        // Viewport boundaries constraints
        const topbarHeight = 28;
        const taskbarHeight = 64;
        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;

        // Constraint window position
        if (newX < 0) newX = 0;
        if (newY < topbarHeight) newY = topbarHeight;
        if (newX + windowState.width > viewportWidth) newX = viewportWidth - windowState.width;
        if (newY + windowState.height > viewportHeight - taskbarHeight) newY = viewportHeight - taskbarHeight - windowState.height;

        if (newX < 0) newX = 0;
        if (newY < topbarHeight) newY = topbarHeight;

        updateWindowPosition(windowState.pid, newX, newY);
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;

        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;
        const topbarHeight = 28;
        const taskbarHeight = 64;

        // Max width/height rules (max-width: 90vw, max-height: 80vh)
        const maxWidth = Math.floor(viewportWidth * 0.9);
        const maxHeight = Math.floor(viewportHeight * 0.8);

        let newWidth = Math.max(300, Math.min(maxWidth, resizeStart.current.width + deltaX));
        let newHeight = Math.max(200, Math.min(maxHeight, resizeStart.current.height + deltaY));

        // Prevent resizing outside viewport boundaries
        if (windowState.x + newWidth > viewportWidth) {
          newWidth = viewportWidth - windowState.x;
        }
        if (windowState.y + newHeight > viewportHeight - taskbarHeight) {
          newHeight = viewportHeight - taskbarHeight - windowState.y;
        }

        newWidth = Math.max(300, newWidth);
        newHeight = Math.max(200, newHeight);

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
  }, [isDragging, isResizing, windowState.pid, updateWindowPosition, updateWindowDimensions, windowState.x, windowState.y, windowState.width, windowState.height, isMobile]);

  const isTransitioning = !isDragging && !isResizing;

  const style: React.CSSProperties = isMobile
    ? {
        position: "absolute",
        left: 0,
        right: 0,
        top: "var(--menubar-height)",
        bottom: "var(--taskbar-height)",
        zIndex: windowState.zIndex,
        transition: isTransitioning
          ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out"
          : "none",
        display: isVisible ? "flex" : "none",
        pointerEvents: isVisible ? "auto" : "none",
      }
    : windowState.isMaximized
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        left: `${Math.max(0, windowState.x ?? 0)}px`,
        top: `${Math.max(28, windowState.y ?? 28)}px`,
        width: `${Math.max(300, windowState.width ?? 300)}px`,
        height: `${Math.max(200, windowState.height ?? 200)}px`,
        zIndex: windowState.zIndex,
        transformOrigin: "bottom center",
        transition: isTransitioning
          ? "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-out, width 0.2s ease-out, height 0.2s ease-out"
          : "none",
        transform: windowState.isMinimized ? "scale(0.01) translateY(800px)" : "scale(1) translateY(0)",
        opacity: windowState.isMinimized ? 0 : 1,
        pointerEvents: windowState.isMinimized ? "none" : "auto",
      };

  const theme = settings?.theme || "dark";

  const windowThemeClasses =
    theme === "light"
      ? isActive
        ? "border-[rgba(214,58,58,0.65)] bg-[#f8f5f1] text-slate-900 shadow-[0_0_0_1px_rgba(214,58,58,0.2)]"
        : "border-[rgba(214,58,58,0.22)] bg-[#fbfaf8] text-slate-700 shadow-[0_0_0_1px_rgba(214,58,58,0.08)]"
      : isActive
        ? "border-[rgba(214,58,58,0.75)] bg-[#050607]/96 text-[#f8d9d9] shadow-[0_0_0_1px_rgba(214,58,58,0.2),0_0_30px_rgba(214,58,58,0.08)]"
        : "border-[rgba(214,58,58,0.3)] bg-[#050607]/90 text-[#ddb7b7] shadow-[0_0_0_1px_rgba(214,58,58,0.08)]";

  const headerThemeClasses =
    theme === "light"
      ? isActive
        ? "bg-[rgba(214,58,58,0.08)] border-[rgba(214,58,58,0.2)]"
        : "bg-[rgba(214,58,58,0.03)] border-[rgba(214,58,58,0.14)]"
      : isActive
        ? "bg-[rgba(214,58,58,0.1)] border-[rgba(214,58,58,0.28)]"
        : "bg-[rgba(214,58,58,0.05)] border-[rgba(214,58,58,0.12)]";

  return (
    <div
      ref={windowRef}
      style={style}
      onClick={() => focusWindow(windowState.pid)}
      className={`flex flex-col rounded-none border transition-shadow duration-200 overflow-hidden ${windowThemeClasses}`}
    >
      {/* Window Header (Title Bar) */}
      <div
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={() => maximizeWindow(windowState.pid)}
        className={`flex h-9 items-center justify-between border-b px-3 font-mono text-[10px] uppercase tracking-[0.22em] select-none cursor-default ${headerThemeClasses}`}
      >
        <span className="truncate font-semibold select-none">
          {isActive ? "[LOCKED]" : "[IDLE]"} {windowState.title}
        </span>
        
        {/* Title Bar Buttons */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {/* Minimize */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(windowState.pid);
            }}
            className="h-5 w-7 border border-[rgba(214,58,58,0.22)] bg-black/20 text-[#f2c1c1] transition-colors cursor-pointer select-none hover:bg-[rgba(214,58,58,0.14)]"
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
            className="h-5 w-7 border border-[rgba(214,58,58,0.22)] bg-black/20 text-[#f2c1c1] transition-colors cursor-pointer select-none hover:bg-[rgba(214,58,58,0.14)]"
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
            className="h-5 w-7 border border-[rgba(214,58,58,0.45)] bg-black/20 text-[#ff9b9b] transition-colors cursor-pointer select-none hover:bg-[rgba(214,58,58,0.22)]"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className={`flex-1 overflow-auto p-0 relative ${theme === "light" ? "bg-[#fcfbfa]" : "bg-[#030405]/90"}`}>
        {children}
      </div>

      {/* Window Resize Handle */}
      {!windowState.isMaximized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 flex h-4 w-4 cursor-se-resize items-end justify-end p-0.5"
          style={{ zIndex: 100 }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="pointer-events-none select-none text-[#cf7b7b] hover:text-[#ffb3b3]"
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


