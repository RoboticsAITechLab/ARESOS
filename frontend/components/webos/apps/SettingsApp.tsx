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

  const wallpapers = [
    {
      name: "Aurora (Green)",
      value: "linear-gradient(135deg, #022c22 0%, #059669 45%, #0d9488 80%, #0f172a 100%)",
    },
    {
      name: "Nebula (Dark)",
      value: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
    },
    {
      name: "Cyber Sunset",
      value: "linear-gradient(135deg, #180828 0%, #280818 50%, #081828 100%)",
    },
    {
      name: "Obsidian",
      value: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
    },
  ];

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    updateUser({ username: usernameInput.trim() });
    addNotification("Profile Sync", `Username updated to ${usernameInput.trim()}`, "success");
  };

  // Sidebar link details
  const tabs = [
    { id: "appearance" as const, label: "🎨 Appearance" },
    { id: "wallpaper" as const, label: "🖼️ Wallpaper" },
    { id: "profile" as const, label: "👤 Profile" },
    { id: "storage" as const, label: "💾 Storage" },
    { id: "about" as const, label: "ℹ️ About" },
  ];

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none font-sans">
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
        
        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Appearance Settings
            </h3>
            
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Current Theme:</span>
                <span className="font-bold text-white capitalize">{settings.theme}</span>
              </div>

              {/* Segmented Selection Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(["light", "dark", "glassmorphism"] as const).map((themeType) => (
                  <button
                    key={themeType}
                    onClick={() => {
                      updateSettings({ theme: themeType });
                      addNotification("Appearance", `Theme toggled to ${themeType}`, "info");
                    }}
                    className={`py-2 text-[10px] uppercase font-bold tracking-wider rounded-xl border text-center transition cursor-pointer ${
                      settings.theme === themeType
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                        : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {themeType.substring(0, 5)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wallpaper Tab */}
        {activeTab === "wallpaper" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Wallpaper Presets
            </h3>

            <div className="grid grid-cols-2 gap-3.5">
              {wallpapers.map((wp) => {
                const isActive = settings.wallpaperUrlOrGradient === wp.value;
                return (
                  <button
                    key={wp.name}
                    onClick={() => {
                      updateSettings({ wallpaperUrlOrGradient: wp.value });
                      addNotification("Appearance", `Wallpaper set to ${wp.name.split(" ")[0]}`, "info");
                    }}
                    style={{ background: wp.value }}
                    className={`h-16 rounded-xl border relative transition-all overflow-hidden cursor-pointer ${
                      isActive
                        ? "border-indigo-400 ring-2 ring-indigo-500/25 scale-[0.98]"
                        : "border-zinc-800 hover:border-zinc-700 hover:scale-[1.01]"
                    }`}
                  >
                    <span className="absolute bottom-1.5 left-2.5 text-[9px] font-bold text-white bg-black/60 py-0.5 px-2 rounded backdrop-blur">
                      {wp.name}
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
                  {/* Mock 12MB base requested, combined with actual filesystem text contents bytes */}
                  <span className="font-mono text-zinc-400">
                    Used: {(12 + vfsBytes / (1024 * 1024)).toFixed(4)} MB
                  </span>
                </div>
                {/* Progress load slider */}
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

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              System Specifications
            </h3>

            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-3 font-mono text-[11px] text-zinc-300">
              <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                <span className="text-zinc-500">System Name:</span>
                <span className="text-white font-bold">ARES OS</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                <span className="text-zinc-500">System Version:</span>
                <span className="text-white font-bold">1.0</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                <span className="text-zinc-500">Environment Kernel:</span>
                <span className="text-zinc-400">Next.js Client Runtime</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                <span className="text-zinc-500">Authorization Host:</span>
                <span className="text-zinc-400">Ankit (ALPHA-1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Build Channel:</span>
                <span className="text-emerald-400 font-semibold">STABLE RELEASE</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
