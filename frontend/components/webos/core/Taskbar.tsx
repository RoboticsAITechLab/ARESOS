"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { playClickSound } from "@/utils/webos/audio";
import { REGISTERED_APPS } from "@/config/webos/apps.config";

interface TaskbarProps {
  onToggleNotifications: () => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({ onToggleNotifications }) => {
  const {
    processes,
    windows,
    activePid,
    focusWindow,
    minimizeWindow,
    launchApp,
    terminateApp,
    isStartMenuOpen,
    setStartMenuOpen,
    settings,
  } = useOS();

  const [bouncingAppId, setBouncingAppId] = useState<string | null>(null);
  
  // Custom right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ appId: string; x: number; y: number } | null>(null);

  // Initialize pinned apps from localStorage or system defaults
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const defaults = [
        "file-manager",
        "browser",
        "text-editor",
        "calendar",
        "todo",
        "terminal",
        "calculator",
        "clock",
        "settings"
      ];
      const saved = localStorage.getItem("aresos_pinned_apps");
      if (saved) {
        try {
          setPinnedAppIds(JSON.parse(saved));
        } catch (e) {
          setPinnedAppIds(defaults);
        }
      } else {
        setPinnedAppIds(defaults);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save pinned apps to localStorage on change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_pinned_apps", JSON.stringify(pinnedAppIds));
    }
  }, [pinnedAppIds, isLoaded]);

  // Click handler to close context menu
  useEffect(() => {
    const handleWindowClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const handleIconClick = (appId: string) => {
    playClickSound((settings?.volume ?? 80) / 100);

    if (appId === "start") {
      setStartMenuOpen(!isStartMenuOpen);
      return;
    }

    // Check if app is running
    const runningProc = processes.find((p) => p.appId === appId);
    if (runningProc) {
      const win = windows.find((w) => w.pid === runningProc.pid);
      if (win) {
        if (win.isMinimized || !win.isFocused) {
          focusWindow(runningProc.pid);
        } else {
          minimizeWindow(runningProc.pid);
        }
      }
    } else {
      // Trigger bouncing icon animation for 1 second
      setBouncingAppId(appId);
      setTimeout(() => {
        setBouncingAppId((current) => (current === appId ? null : current));
      }, 1000);

      launchApp(appId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, appId: string) => {
    e.preventDefault();
    if (appId === "start") return; // start menu cannot be pinned/unpinned
    
    // Open context menu near mouse coordinates, offset to render above the taskbar
    setContextMenu({
      appId,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: e.clientY - 85,
    });
  };

  const togglePinApp = (appId: string) => {
    setPinnedAppIds((prev) => {
      if (prev.includes(appId)) {
        return prev.filter((id) => id !== appId);
      } else {
        return [...prev, appId];
      }
    });
  };

  const handleCloseApp = (appId: string) => {
    const runningProcs = processes.filter((p) => p.appId === appId);
    runningProcs.forEach((p) => {
      terminateApp(p.pid);
    });
  };

  // Compile active visible taskbar apps list:
  // Special Home (start) + Pinned Apps + Running Unpinned Apps
  const visibleApps: { id: string; title: string; icon: string }[] = [
    { id: "start", title: "ARES Menu", icon: "🏠" }
  ];

  // Add all pinned apps configurations
  pinnedAppIds.forEach((appId) => {
    const config = REGISTERED_APPS.find((app) => app.id === appId);
    if (config) {
      visibleApps.push({
        id: appId,
        title: config.title,
        icon: config.icon
      });
    }
  });

  // Find running apps not already in pinned list
  processes.forEach((proc) => {
    const alreadyVisible = visibleApps.some((app) => app.id === proc.appId);
    if (!alreadyVisible) {
      const config = REGISTERED_APPS.find((app) => app.id === proc.appId);
      if (config) {
        visibleApps.push({
          id: proc.appId,
          title: config.title,
          icon: config.icon
        });
      }
    }
  });

  const theme = settings?.theme || "dark";

  let dockClasses = "flex items-end gap-3 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl max-w-max border ";
  let dividerClasses = "w-[1px] h-10 self-center ";
  let notifyHoverClass = "";

  if (theme === "light") {
    dockClasses += "bg-white/35 border-slate-200/50 shadow-slate-300/30";
    dividerClasses += "bg-slate-300";
    notifyHoverClass = "hover:bg-slate-200/40";
  } else if (theme === "midnight") {
    dockClasses += "bg-slate-950/30 border-indigo-900/30 shadow-indigo-950/30";
    dividerClasses += "bg-indigo-950/40";
    notifyHoverClass = "hover:bg-white/10";
  } else if (theme === "aurora") {
    dockClasses += "bg-zinc-950/30 border-teal-900/30 shadow-emerald-950/30";
    dividerClasses += "bg-teal-950/40";
    notifyHoverClass = "hover:bg-white/10";
  } else {
    dockClasses += "bg-zinc-950/40 border-zinc-800/40 shadow-black/40";
    dividerClasses += "bg-zinc-850";
    notifyHoverClass = "hover:bg-white/10";
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[999] select-none pointer-events-auto">
      {/* Sci-fi macOS Bouncing Dock Animation Keyframes */}
      <style>{`
        @keyframes dock-bounce {
          0%, 100% { transform: translateY(0) scaleY(1); }
          30% { transform: translateY(-18px) scaleY(1.15); }
          50% { transform: translateY(3px) scaleY(0.9); }
          70% { transform: translateY(-7px) scaleY(1.05); }
          90% { transform: translateY(0) scaleY(0.98); }
        }
        .dock-bounce {
          animation: dock-bounce 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      {/* Dynamic Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          className="bg-zinc-900/95 border border-zinc-800/80 rounded-xl py-1.5 shadow-2xl backdrop-blur-md z-[1000] w-44 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pin / Unpin Button */}
          <button
            onClick={() => {
              togglePinApp(contextMenu.appId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/10 flex items-center gap-2 font-medium"
          >
            <span>📌</span>
            <span>
              {pinnedAppIds.includes(contextMenu.appId) ? "Unpin from Taskbar" : "Pin to Taskbar"}
            </span>
          </button>

          {/* Close App option (if app is running) */}
          {processes.some((p) => p.appId === contextMenu.appId) && (
            <button
              onClick={() => {
                handleCloseApp(contextMenu.appId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 border-t border-zinc-800/60 flex items-center gap-2 font-medium"
            >
              <span>❌</span>
              <span>Close Application</span>
            </button>
          )}
        </div>
      )}

      {/* Floating glassmorphic Dock container */}
      <div className={dockClasses}>
        {visibleApps.map((app) => {
          const isRunning = processes.some((p) => p.appId === app.id);
          const isFocused = processes.some((p) => p.appId === app.id && activePid === p.pid);

          let buttonClasses = "w-12 h-12 rounded-xl flex items-center justify-center text-3.5xl cursor-pointer select-none transition-all duration-200 hover:scale-120 hover:-translate-y-1.5 active:scale-105 active:translate-y-0 ";
          if (isFocused) {
            if (theme === "light") {
              buttonClasses += "bg-slate-300/40 border border-slate-400/50 shadow-sm";
            } else if (theme === "midnight") {
              buttonClasses += "bg-indigo-600/25 border border-indigo-500/30 shadow-[0_0_6px_rgba(99,102,241,0.2)]";
            } else if (theme === "aurora") {
              buttonClasses += "bg-teal-600/25 border border-teal-500/30 shadow-[0_0_6px_rgba(20,184,166,0.2)]";
            } else {
              buttonClasses += "bg-indigo-600/25 border border-indigo-500/30";
            }
          } else {
            buttonClasses += theme === "light" ? "hover:bg-slate-200/40" : "hover:bg-white/10";
          }

          let dotClasses = "w-1.5 h-1.5 rounded-full absolute -bottom-1 transition-all duration-200 ";
          if (isRunning) {
            if (isFocused) {
              if (theme === "light") {
                dotClasses += "bg-indigo-650 shadow-[0_0_6px_rgba(79,70,229,0.8)] scale-110";
              } else if (theme === "midnight") {
                dotClasses += "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)] scale-110";
              } else if (theme === "aurora") {
                dotClasses += "bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)] scale-110";
              } else {
                dotClasses += "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] scale-110";
              }
            } else {
              dotClasses += theme === "light" ? "bg-slate-400" : "bg-zinc-500";
            }
          }

          return (
            <div
              key={app.id}
              className="flex flex-col items-center justify-end relative group"
              onContextMenu={(e) => handleContextMenu(e, app.id)}
            >
              {/* App Title tooltip on hover */}
              <div className="absolute bottom-16 bg-zinc-950/90 text-white border border-zinc-850 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none select-none">
                {app.title}
              </div>

              {/* Bouncing wrapper for the button */}
              <div className={bouncingAppId === app.id ? "dock-bounce" : ""}>
                {/* Dock Icon Button */}
                <button
                  onClick={() => handleIconClick(app.id)}
                  className={buttonClasses}
                >
                  <span className="filter drop-shadow select-none leading-none">
                    {app.icon}
                  </span>
                </button>
              </div>

              {/* Bottom status dot indicator (macOS style) */}
              {isRunning && (
                <div className={dotClasses} />
              )}
            </div>
          );
        })}

        {/* Divider separator */}
        <div className={dividerClasses} />

        {/* Notifications Tray Icon */}
        <button
          onClick={() => {
            playClickSound((settings?.volume ?? 80) / 100);
            onToggleNotifications();
          }}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all duration-200 hover:scale-120 hover:-translate-y-1.5 active:scale-105 active:translate-y-0 ${notifyHoverClass}`}
          title="Notification Center"
        >
          🔔
        </button>
      </div>
    </div>
  );
};
