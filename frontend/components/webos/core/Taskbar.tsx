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
        "terminal",
        "file-manager",
        "mission-control",
        "settings",
        "music-player",
        "equation-racers"
      ];
      setPinnedAppIds(defaults);
      localStorage.setItem("aresos_pinned_apps", JSON.stringify(defaults));
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

  const dockClasses =
    theme === "light"
      ? "border-slate-300 bg-white/88 text-slate-800"
      : "border-[rgba(214,58,58,0.45)] bg-[#050607]/96 text-[#f8d8d8]";

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full translate-x-0 px-0 md:bottom-3 md:left-1/2 md:-translate-x-1/2 md:w-auto md:px-2 z-[999] flex md:items-end select-none pointer-events-auto">
      <style>{`
        @keyframes dock-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-9px) scale(1.04); }
          60% { transform: translateY(0) scale(0.98); }
        }
        .dock-bounce {
          animation: dock-bounce 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        /* Hide scrollbar utility */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
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
          className="w-48 rounded-none border border-[rgba(214,58,58,0.4)] bg-[#050607]/96 py-1.5 text-[#f4d7d7] shadow-2xl backdrop-blur-md z-[1000] animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pin / Unpin Button */}
          <button
            onClick={() => {
              togglePinApp(contextMenu.appId);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-[#d9aaaa] hover:bg-[rgba(214,58,58,0.12)]"
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
              className="flex w-full items-center gap-2 border-t border-[rgba(214,58,58,0.2)] px-3.5 py-2 text-left text-xs font-medium text-[#ff9d9d] hover:bg-[rgba(214,58,58,0.12)]"
            >
              <span>❌</span>
              <span>Close Application</span>
            </button>
          )}
        </div>
      )}

      <div className={`flex items-center justify-start gap-1.5 md:items-stretch md:gap-2 border w-full md:w-auto overflow-x-auto md:overflow-x-visible scrollbar-none px-3 py-2 h-[var(--taskbar-height)] md:h-auto pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:pb-2 border-l-0 border-r-0 border-b-0 md:border-l md:border-r md:border-b shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] ${dockClasses}`}>
        {visibleApps.map((app) => {
          const isRunning = processes.some((p) => p.appId === app.id);
          const isFocused = processes.some((p) => p.appId === app.id && activePid === p.pid);

          const buttonClasses = `flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-none border px-3 py-2.5 md:py-2 text-[10px] tracking-[0.24em] transition-all duration-150 min-h-[44px] md:min-h-0 flex-shrink-0 ${
            isFocused
              ? "border-[rgba(214,58,58,0.55)] bg-[rgba(214,58,58,0.12)] text-[#fff2f2]"
              : "border-[rgba(214,58,58,0.18)] bg-transparent text-inherit hover:border-[rgba(214,58,58,0.4)] hover:bg-[rgba(214,58,58,0.08)]"
          }`;

          const dotClasses = `mt-[-1px] h-1 w-full rounded-none flex-shrink-0 ${isRunning ? (isFocused ? "bg-[#ef4444]" : "bg-[rgba(214,58,58,0.3)]") : "bg-transparent"}`;

          return (
            <div
              key={app.id}
              className="group relative flex flex-col items-center justify-end flex-shrink-0"
              onContextMenu={(e) => handleContextMenu(e, app.id)}
            >
              <div className="absolute bottom-14 border border-[rgba(214,58,58,0.22)] bg-[#050607]/95 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-[#f6d7d7] opacity-0 shadow-md whitespace-nowrap transition-opacity duration-150 pointer-events-none select-none group-hover:opacity-100">
                {app.title}
              </div>

              <div className={bouncingAppId === app.id ? "dock-bounce" : ""}>
                <button
                  onClick={() => handleIconClick(app.id)}
                  className={buttonClasses}
                >
                  <span className="select-none leading-none">
                    {app.icon}
                  </span>
                  <span className="text-[9px] leading-none">{app.title}</span>
                </button>
              </div>

              <div className={dotClasses} />
            </div>
          );
        })}

        <div className="mx-1 h-10 w-px bg-[rgba(214,58,58,0.3)] flex-shrink-0" />

        <button
          onClick={() => {
            playClickSound((settings?.volume ?? 80) / 100);
            onToggleNotifications();
          }}
          className="flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-none border border-[rgba(214,58,58,0.18)] px-3 py-2.5 md:py-2 text-[10px] tracking-[0.24em] text-inherit transition-all duration-150 hover:border-[rgba(214,58,58,0.4)] hover:bg-[rgba(214,58,58,0.08)] min-h-[44px] md:min-h-0 flex-shrink-0"
          title="Mission Alerts"
        >
          <span>ALERT</span>
          <span className="text-[9px]">CENTER</span>
        </button>
      </div>
    </div>
  );
};


