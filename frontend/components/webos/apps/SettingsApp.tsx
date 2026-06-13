"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { useFileSystem } from "@/hooks/webos/useFileSystem";

interface SettingsAppProps {
  pid: string;
}

type SettingsTab = "appearance" | "wallpaper" | "profile" | "storage" | "about";

export default function SettingsApp({ pid }: SettingsAppProps) {
  const { settings, updateSettings, currentUser, updateUser, addNotification } = useOS();
  const { root } = useFileSystem();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [usernameInput, setUsernameInput] = useState(currentUser.username);
  const [vfsBytes, setVfsBytes] = useState(0);

  // Recalculate VFS size dynamically
  useEffect(() => {
    let bytes = 0;
    const traverse = (node: any) => {
      if (node.type === "file") {
        bytes += typeof node.content === "string" ? node.content.length : 0;
      } else if (node.type === "directory" && node.children) {
        Object.values(node.children).forEach(traverse);
      }
    };
    traverse(root);
    setVfsBytes(bytes);
  }, [root]);

  // Expanded Wallpapers matching mockup: Aurora, Space, Ocean, Neon, Mountain, Abstract
  const wallpapers = [
    {
      name: "Aurora",
      value: "linear-gradient(135deg, #022c22 0%, #059669 45%, #0d9488 80%, #0f172a 100%)",
    },
    {
      name: "Space",
      value: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
    },
    {
      name: "Ocean",
      value: "linear-gradient(135deg, #082f49 0%, #0369a1 50%, #075985 100%)",
    },
    {
      name: "Neon",
      value: "linear-gradient(135deg, #3b0764 0%, #701a75 50%, #4c1d95 100%)",
    },
    {
      name: "Mountain",
      value: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
    },
    {
      name: "Abstract",
      value: "linear-gradient(135deg, #2e1065 0%, #3b0764 50%, #180828 100%)",
    },
  ];

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    updateUser({ username: usernameInput.trim() });
    addNotification("Profile Sync", `Username updated to ${usernameInput.trim()}`, "success");
  };

  const tabs = [
    { id: "appearance" as const, label: "🎨 Themes" },
    { id: "wallpaper" as const, label: "🖼️ Wallpapers" },
    { id: "profile" as const, label: "👤 Profile" },
    { id: "storage" as const, label: "💾 Storage" },
    { id: "about" as const, label: "ℹ️ About" },
  ];

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-300 select-none font-sans">
      {/* Left Sidebar Menu */}
      <div className="w-40 bg-zinc-950/40 border-r border-zinc-800/60 p-4 space-y-1.5 flex-shrink-0">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block px-3 mb-2.5">
          Settings
        </span>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left text-xs px-3 py-2 rounded-xl cursor-pointer transition-all ${
              activeTab === tab.id
                ? "bg-indigo-600/30 text-indigo-200 font-semibold border border-indigo-500/20"
                : "hover:bg-zinc-800/50 text-zinc-300 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right Content display Panel */}
      <div className="flex-1 p-5 overflow-y-auto min-w-0">
        
        {/* Appearance Tab: Theme Manager (Dark, Light, Midnight, Aurora) */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Theme Manager
            </h3>
            
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-3">
              {(["dark", "light", "midnight", "aurora"] as const).map((t) => {
                const isActive = settings.theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      updateSettings({ theme: t });
                      addNotification("Theme Manager", `System theme updated to '${t}'`, "info");
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold tracking-wide capitalize transition cursor-pointer ${
                      isActive
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                        : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={isActive ? "text-indigo-400" : "text-zinc-600"}>
                        {isActive ? "●" : "○"}
                      </span>
                      <span>{t}</span>
                    </span>
                    {isActive && <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Wallpaper Tab: Wallpaper Manager */}
        {activeTab === "wallpaper" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Wallpaper Manager
            </h3>

            {/* Grid display layout */}
            <div className="grid grid-cols-2 gap-3.5">
              {wallpapers.map((wp) => {
                const isActive = settings.wallpaperUrlOrGradient === wp.value;
                return (
                  <button
                    key={wp.name}
                    onClick={() => {
                      updateSettings({ wallpaperUrlOrGradient: wp.value });
                      addNotification("Wallpaper Manager", `Desktop wallpaper set to '${wp.name}'`, "info");
                    }}
                    style={{ background: wp.value }}
                    className={`h-16 rounded-xl border relative transition-all overflow-hidden cursor-pointer ${
                      isActive
                        ? "border-indigo-400 ring-2 ring-indigo-500/25 scale-[0.98]"
                        : "border-zinc-800 hover:border-zinc-700 hover:scale-[1.01]"
                    }`}
                  >
                    <span className="absolute bottom-1.5 left-2.5 text-[9px] font-bold text-white bg-black/60 py-0.5 px-2 rounded backdrop-blur">
                      [ {wp.name} ]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Profile Management
            </h3>

            <form onSubmit={handleUpdateProfile} className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-4">
              {/* Circular Avatar */}
              <div className="flex items-center gap-4 border-b border-zinc-850/40 pb-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center font-bold text-white text-lg">
                  {currentUser.username.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{currentUser.username}</span>
                  <span className="text-[9px] text-cyan-500 font-bold uppercase tracking-wider">{currentUser.role}</span>
                </div>
              </div>

              {/* Username edit input */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                  Update Username
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs font-bold text-white rounded-xl transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === "storage" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Storage Usage
            </h3>

            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-zinc-200">
                  <span>Virtual Disk Size (VFS)</span>
                  <span className="font-mono text-zinc-400">
                    Used: {(12 + vfsBytes / (1024 * 1024)).toFixed(4)} MB
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: "32.4%" }}
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-0.5">
                  <span>Total Allocation: 64.00 MB</span>
                  <span>Free Space: ~51.95 MB</span>
                </div>
              </div>

              <div className="border-t border-zinc-850/40 pt-3 text-[10px] text-zinc-400 leading-relaxed font-mono">
                Virtual storage partitions are compiled directly onto browser LocalStorage to preserve directory structures and Notepad text modifications dynamically.
              </div>
            </div>
          </div>
        )}

        {/* About Tab: About ARES OS */}
        {activeTab === "about" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              About ARES OS
            </h3>

            <div className="bg-zinc-950/30 border border-zinc-850 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              {/* Holographic glowing lines decor */}
              <div className="w-16 h-16 rounded-full bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-indigo-500/5 animate-pulse">
                ▲
              </div>

              <h2 className="text-base font-extrabold text-white tracking-widest uppercase">
                ARES OS
              </h2>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1.5">
                Version: 1.0
              </span>

              <div className="h-[1px] w-full bg-zinc-850/50 my-4" />

              <div className="space-y-2.5 font-mono text-[11px] text-zinc-400 w-full text-left max-w-xs mx-auto">
                <div className="flex justify-between">
                  <span>Build:</span>
                  <span className="text-white font-semibold">WebOS Mission Edition</span>
                </div>
                <div className="flex justify-between">
                  <span>Developer:</span>
                  <span className="text-white font-semibold">Ankit Kumar</span>
                </div>
              </div>

              <div className="h-[1px] w-full bg-zinc-850/50 my-4" />

              <p className="text-[11px] italic font-semibold text-zinc-200 font-serif">
                &ldquo;Mission Control For Students&rdquo;
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
