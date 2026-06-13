"use client";

import React, { useState } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { playClickSound } from "@/utils/webos/audio";

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
    isStartMenuOpen,
    setStartMenuOpen,
    settings,
  } = useOS();

  const [bouncingAppId, setBouncingAppId] = useState<string | null>(null);

  // App catalog map for Dock icons
  const dockApps = [
    { id: "start", title: "ARES Menu", icon: "🏠" },
    { id: "file-manager", title: "File Explorer", icon: "📁" },
    { id: "browser", title: "Web Browser", icon: "🌐" },
    { id: "text-editor", title: "Notepad", icon: "📒" },
    { id: "calendar", title: "Calendar", icon: "📅" },
    { id: "todo", title: "Todo checklist", icon: "✅" },
    { id: "terminal", title: "Command Shell", icon: "💻" },
    { id: "calculator", title: "Calculator", icon: "🧮" },
    { id: "clock", title: "System Clock", icon: "⏰" },
    { id: "settings", title: "Settings", icon: "⚙️" },
  ];

  const handleIconClick = (appId: string) => {
    // Play subtle click audio beep
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
    // dark
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

      {/* Floating glassmorphic Dock container */}
      <div className={dockClasses}>
        {dockApps.map((app) => {
          // Check if process of this app is running
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
