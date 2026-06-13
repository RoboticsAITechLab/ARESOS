"use client";

import React, { useState } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface SettingsAppProps {
  pid: string;
}

export default function SettingsApp({ pid }: SettingsAppProps) {
  const { settings, updateSettings, currentUser, addNotification } = useOS();
  const [activeTab, setActiveTab] = useState<"appearance" | "audio" | "system">("appearance");

  const wallpapers = [
    {
      name: "Nebula Dark",
      value: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
    },
    {
      name: "Cyber Sunset",
      value: "linear-gradient(135deg, #180828 0%, #280818 50%, #081828 100%)",
    },
    {
      name: "Midnight Ocean",
      value: "linear-gradient(135deg, #050508 0%, #0b1528 70%, #1e1b4b 100%)",
    },
    {
      name: "Obsidian",
      value: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
    },
  ];

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none">
      {/* Sidebar navigation */}
      <div className="w-40 bg-zinc-950/40 border-r border-zinc-800/60 p-4 space-y-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab("appearance")}
          className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition ${
            activeTab === "appearance" ? "bg-indigo-600/35 text-indigo-200 font-semibold" : "hover:bg-zinc-800/50 text-zinc-300"
          }`}
        >
          🎨 Appearance
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition ${
            activeTab === "audio" ? "bg-indigo-600/35 text-indigo-200 font-semibold" : "hover:bg-zinc-800/50 text-zinc-300"
          }`}
        >
          🔊 Audio & Display
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition ${
            activeTab === "system" ? "bg-indigo-600/35 text-indigo-200 font-semibold" : "hover:bg-zinc-800/50 text-zinc-300"
          }`}
        >
          💻 System Details
        </button>
      </div>

      {/* Main settings options pane */}
      <div className="flex-1 p-5 overflow-y-auto space-y-6">
        {activeTab === "appearance" && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">System Theme</h3>
            <div className="grid grid-cols-3 gap-3">
              {(["light", "dark", "glassmorphism"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    updateSettings({ theme: t });
                    addNotification("Settings Updated", `Theme set to ${t}.`, "info");
                  }}
                  className={`py-3 text-xs capitalize rounded-xl border text-center transition cursor-pointer ${
                    settings.theme === t
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold"
                      : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200 pt-3">Desktop Wallpapers</h3>
            <div className="grid grid-cols-2 gap-3.5">
              {wallpapers.map((wp) => (
                <button
                  key={wp.name}
                  onClick={() => {
                    updateSettings({ wallpaperUrlOrGradient: wp.value });
                    addNotification("Settings Updated", "Wallpaper updated.", "info");
                  }}
                  style={{ background: wp.value }}
                  className={`h-16 rounded-xl border relative transition cursor-pointer overflow-hidden ${
                    settings.wallpaperUrlOrGradient === wp.value
                      ? "border-indigo-400 scale-[0.98] ring-2 ring-indigo-500/30"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="absolute bottom-1.5 left-2.5 text-[10px] font-bold text-white bg-black/60 py-0.5 px-2 rounded backdrop-blur">
                    {wp.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "audio" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">Volume Settings</h3>
            <div className="flex items-center gap-4">
              <span className="text-base select-none">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                className="flex-1 accent-indigo-500 bg-zinc-950 h-2 rounded-lg cursor-pointer appearance-none"
              />
              <span className="text-xs font-mono w-8 text-right text-zinc-400">{settings.volume}%</span>
            </div>

            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200 pt-2">Screen Brightness</h3>
            <div className="flex items-center gap-4">
              <span className="text-base select-none">☀️</span>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.brightness}
                onChange={(e) => updateSettings({ brightness: parseInt(e.target.value) })}
                className="flex-1 accent-indigo-500 bg-zinc-950 h-2 rounded-lg cursor-pointer appearance-none"
              />
              <span className="text-xs font-mono w-8 text-right text-zinc-400">{settings.brightness}%</span>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">Device Specifications</h3>
            
            <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-3 text-xs bg-zinc-950/35 border border-zinc-850 p-4 rounded-xl font-mono text-zinc-300">
              <span className="text-zinc-500">Device Name:</span>
              <span>ARESOS-PC</span>

              <span className="text-zinc-500">Architecture:</span>
              <span>x86_64 Virtual Environment</span>

              <span className="text-zinc-500">Virtual OS:</span>
              <span>ARESOS Core Web OS v1.0.0</span>

              <span className="text-zinc-500">Engine:</span>
              <span>Next.js Client Engine + React 19</span>

              <span className="text-zinc-500">Active User:</span>
              <span>{currentUser.username} ({currentUser.role})</span>

              <span className="text-zinc-500">VFS Status:</span>
              <span>LocalStorage Persisted (Connected)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
