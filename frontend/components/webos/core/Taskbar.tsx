"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
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
    isStartMenuOpen,
    setStartMenuOpen,
    settings,
    updateSettings,
  } = useOS();

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // Clock Update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setDate(
        now.toLocaleDateString([], { month: "short", day: "numeric" })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartClick = () => {
    setStartMenuOpen(!isStartMenuOpen);
  };

  const handleTaskClick = (pid: string) => {
    const win = windows.find((w) => w.pid === pid);
    if (!win) return;

    if (win.isMinimized) {
      minimizeWindow(pid);
    } else if (win.isFocused) {
      minimizeWindow(pid);
    } else {
      focusWindow(pid);
    }
  };

  return (
    <div className="h-12 w-full bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/60 flex items-center justify-between px-3 select-none z-[999]">
      {/* Left Area: Start Menu Launcher */}
      <div className="flex items-center">
        <button
          onClick={handleStartClick}
          className={`h-9 px-4 rounded-lg flex items-center justify-center font-bold text-xs gap-2 transition duration-200 cursor-pointer ${
            isStartMenuOpen
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-100"
          }`}
        >
          <span className="text-base">🌌</span>
          <span>ARESOS</span>
        </button>
      </div>

      {/* Middle Area: Active Application Tasks */}
      <div className="flex-1 flex items-center justify-center gap-1.5 px-4 overflow-x-auto scrollbar-none">
        {processes.map((proc) => {
          const config = REGISTERED_APPS.find((app) => app.id === proc.appId);
          const win = windows.find((w) => w.pid === proc.pid);
          const isActive = activePid === proc.pid && win && !win.isMinimized;

          if (!config) return null;

          return (
            <button
              key={proc.pid}
              onClick={() => handleTaskClick(proc.pid)}
              className={`h-9 px-3 max-w-[140px] rounded-lg flex items-center gap-2 transition duration-150 cursor-pointer select-none text-left relative ${
                isActive
                  ? "bg-zinc-800 text-zinc-50 border border-zinc-700/50"
                  : "bg-zinc-900/40 hover:bg-zinc-900/80 text-zinc-400 border border-transparent"
              }`}
            >
              <span className="text-base flex-shrink-0">{config.icon}</span>
              <span className="text-xs truncate font-medium">{proc.title}</span>

              {/* Status indicator line */}
              <div
                className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-indigo-500"
                    : win?.isMinimized
                    ? "bg-zinc-600 w-2.5"
                    : "bg-zinc-500 w-1.5"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Right Area: System Settings Tray + Clock */}
      <div className="flex items-center gap-4 text-zinc-300">
        {/* Simple settings controls */}
        <div className="hidden md:flex items-center gap-3 bg-zinc-900/60 py-1 px-3.5 rounded-lg border border-zinc-800/40 text-xs">
          {/* Theme Switcher Toggle */}
          <button
            onClick={() => {
              const themes: ("light" | "dark" | "glassmorphism")[] = ["light", "dark", "glassmorphism"];
              const currentIdx = themes.indexOf(settings.theme);
              const nextIdx = (currentIdx + 1) % themes.length;
              updateSettings({ theme: themes[nextIdx] });
            }}
            className="hover:text-zinc-100 transition cursor-pointer"
            title="Cycle theme mode"
          >
            {settings.theme === "glassmorphism" ? "✨" : settings.theme === "dark" ? "🌙" : "☀️"}
          </button>

          {/* Audio Slider Toggle representation */}
          <div className="flex items-center gap-1">
            <span
              onClick={() => updateSettings({ volume: settings.volume === 0 ? 80 : 0 })}
              className="cursor-pointer hover:text-white"
            >
              {settings.volume === 0 ? "🔇" : settings.volume < 40 ? "🔈" : "🔊"}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">{settings.volume}%</span>
          </div>
        </div>

        {/* Notifications toggle */}
        <button
          onClick={onToggleNotifications}
          className="hover:bg-zinc-800/60 p-1.5 rounded-lg transition text-base relative cursor-pointer"
          title="Notification Center"
        >
          🔔
        </button>

        {/* Date Time Display */}
        <div className="text-right flex flex-col justify-center border-l border-zinc-800/60 pl-4 h-8 min-w-[70px]">
          <span className="text-xs font-semibold tracking-wide text-zinc-100">
            {time}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">
            {date}
          </span>
        </div>
      </div>
    </div>
  );
};
