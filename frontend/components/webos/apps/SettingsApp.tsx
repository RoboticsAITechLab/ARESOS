"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { FSNode } from "@/types/webos/fs";

interface SettingsAppProps {
  pid: string;
}

type SettingsTab = "appearance" | "wallpaper" | "profile" | "storage" | "about";

export default function SettingsApp({ pid: _pid }: SettingsAppProps) {
  const { settings, updateSettings, currentUser, updateUser, addNotification } = useOS();
  const { root, formatFileSystem } = useFileSystem();

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  
  // Profile Form States
  const [usernameInput, setUsernameInput] = useState(currentUser.username);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  
  // Custom Wallpapers States
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const [customGradient, setCustomGradient] = useState("");
  const [gradColorStart, setGradColorStart] = useState("#8b5cf6");
  const [gradColorEnd, setGradColorEnd] = useState("#ec4899");
  const [gradAngle, setGradAngle] = useState(135);

  const [vfsBytes, setVfsBytes] = useState(0);
  const [clientSpecs, setClientSpecs] = useState({
    userAgent: "Loading...",
    resolution: "Loading...",
    timeZone: "Loading...",
  });

  // Calculate system client hardware details on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setClientSpecs({
        userAgent: navigator.userAgent.split(" ")[0] || "NextJS Client Runtime",
        resolution: `${window.innerWidth} x ${window.innerHeight} px`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
    }
  }, []);

  // Recalculate VFS size dynamically
  useEffect(() => {
    let bytes = 0;
    const traverse = (node: FSNode) => {
      if (node.type === "file") {
        bytes += typeof node.content === "string" ? node.content.length : 0;
      } else if (node.type === "directory" && node.children) {
        Object.values(node.children).forEach(traverse);
      }
    };
    traverse(root);
    const timer = setTimeout(() => {
      setVfsBytes(bytes);
    }, 0);
    return () => clearTimeout(timer);
  }, [root]);

  const wallpapers = [
    {
      name: "Aurora Glow",
      value: "linear-gradient(135deg, #022c22 0%, #059669 45%, #0d9488 80%, #0f172a 100%)",
    },
    {
      name: "Deep Space",
      value: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
    },
    {
      name: "Oceanic Depths",
      value: "linear-gradient(135deg, #082f49 0%, #0369a1 50%, #075985 100%)",
    },
    {
      name: "Cyber Neon",
      value: "linear-gradient(135deg, #3b0764 0%, #701a75 50%, #4c1d95 100%)",
    },
    {
      name: "Charcoal Ridge",
      value: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
    },
    {
      name: "Violet Void",
      value: "linear-gradient(135deg, #2e1065 0%, #3b0764 50%, #180828 100%)",
    },
  ];

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    updateUser({ username: usernameInput.trim() });
    addNotification("Profile Sync", `Username updated to ${usernameInput.trim()}`, "success");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window === "undefined") return;

    const actualCurrentPassword = localStorage.getItem("aresos_admin_password") || process.env.NEXT_PUBLIC_LOGIN_PASSWORD || "";
    
    // 1. Current password verification check
    if (actualCurrentPassword && currentPasswordInput !== actualCurrentPassword) {
      addNotification("Security Settings", "Verification failed: Current pass-key is incorrect.", "error");
      return;
    }

    // 2. Format validation check
    const cleanNewPassword = newPasswordInput;
    if (!cleanNewPassword) {
      addNotification("Security Settings", "Validation error: New pass-key cannot be empty.", "error");
      return;
    }

    if (cleanNewPassword.length < 4) {
      addNotification("Security Settings", "Validation error: Pass-key must be at least 4 characters long.", "error");
      return;
    }

    if (cleanNewPassword.includes(" ")) {
      addNotification("Security Settings", "Validation error: Pass-key cannot contain space characters.", "error");
      return;
    }

    if (cleanNewPassword === actualCurrentPassword) {
      addNotification("Security Settings", "Validation error: New pass-key must be different from the current one.", "error");
      return;
    }

    // 3. Action and Storage Write Error Handling
    try {
      localStorage.setItem("aresos_admin_password", cleanNewPassword);
      addNotification("Security Settings", "System partition synced: Pass-key updated successfully.", "success");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
    } catch (err) {
      console.error(err);
      addNotification("Security Settings", "System error: Failed to save pass-key to localStorage.", "error");
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWallpaperUrl.trim()) return;

    let targetUrl = customWallpaperUrl.trim();
    const formatted = targetUrl.startsWith("url(") ? targetUrl : `url("${targetUrl}")`;

    updateSettings({ wallpaperUrlOrGradient: formatted });
    addNotification("Wallpaper Manager", "Custom wallpaper image applied to desktop background.", "success");
    setCustomWallpaperUrl("");
  };

  const handleApplyCustomGradient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGradient.trim()) return;

    updateSettings({ wallpaperUrlOrGradient: customGradient.trim() });
    addNotification("Wallpaper Manager", "Custom gradient wallpaper applied to desktop background.", "success");
    setCustomGradient("");
  };

  const handleWipeStorage = () => {
    if (confirm("WARNING: This will delete all virtual files, folders, notepad entries, and reset to defaults. Proceed?")) {
      formatFileSystem();
      addNotification("System Partitions", "Disk formatted. Resetting workspace...", "warning");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  };

  const tabs = [
    { id: "appearance" as const, label: "🎨 System & Theme" },
    { id: "wallpaper" as const, label: "🖼️ Wallpaper Manager" },
    { id: "profile" as const, label: "👤 Profile Settings" },
    { id: "storage" as const, label: "💾 Storage Allocation" },
    { id: "about" as const, label: "ℹ️ System About" },
  ];

  const theme = settings?.theme || "dark";

  return (
    <div className={`w-full h-full flex select-none font-sans overflow-hidden ${theme === "light" ? "bg-slate-100 text-slate-800" : "bg-zinc-900/40 text-zinc-300"}`}>
      {/* Left Sidebar Menu */}
      <div className={`w-44 border-r p-4 space-y-1.5 flex-shrink-0 ${theme === "light" ? "bg-slate-200/50 border-slate-350" : "bg-zinc-950/40 border-zinc-855"}`}>
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block px-3 mb-2.5">
          System Control
        </span>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left text-xs px-3 py-2 rounded-xl cursor-pointer transition-all ${
              activeTab === tab.id
                ? (theme === "light" ? "bg-indigo-600 text-white font-semibold" : "bg-indigo-600/30 text-indigo-200 font-semibold border border-indigo-500/20")
                : (theme === "light" ? "hover:bg-slate-200 text-slate-700" : "hover:bg-zinc-800/50 text-zinc-355")
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right Content Display Panel */}
      <div className="flex-1 p-5 overflow-y-auto min-w-0 scrollbar-thin">
        
        {/* Appearance Tab: System Themes & Controls */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            <h3 className={`text-sm font-bold border-b pb-2 ${theme === "light" ? "border-slate-200 text-slate-900" : "border-zinc-850 text-zinc-200"}`}>
              System Themes & Hardware Controls
            </h3>
            
            <div className={`p-4 rounded-xl space-y-4 border ${theme === "light" ? "bg-white border-slate-200" : "bg-zinc-950/30 border-zinc-850"}`}>
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Themes Manager</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["dark", "light", "midnight", "aurora"] as const).map((t) => {
                    const isActive = settings.theme === t;
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          updateSettings({ theme: t });
                          addNotification("Theme Manager", `System theme set to '${t}'`, "info");
                        }}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-semibold capitalize transition cursor-pointer ${
                          isActive
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                            : (theme === "light" ? "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600" : "bg-zinc-955/20 border-zinc-800/60 hover:border-zinc-700 text-zinc-400")
                        }`}
                      >
                        <span>{t}</span>
                        {isActive && <span className="text-[7.5px] font-bold uppercase tracking-wider bg-indigo-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>


            </div>
          </div>
        )}

        {/* Wallpaper Tab: Preset & Custom Background Manager */}
        {activeTab === "wallpaper" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Desktop Background Manager
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Preset Selectors */}
              <div className="space-y-3.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Wallpaper Presets</span>
                <div className="grid grid-cols-2 gap-2.5">
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
                            : "border-zinc-800/80 hover:border-zinc-700 hover:scale-[1.01]"
                        }`}
                      >
                        <span className="absolute bottom-1.5 left-2 text-[8px] font-bold text-white bg-black/60 py-0.5 px-1.5 rounded backdrop-blur">
                          {wp.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live mini screen monitor preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/45 border border-zinc-850 rounded-xl space-y-2.5">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Background Preview</span>
                <div
                  className="w-48 h-28 border border-zinc-800 rounded-lg overflow-hidden shadow-lg relative flex flex-col justify-between p-2"
                  style={{
                    backgroundImage: (settings.wallpaperUrlOrGradient.startsWith("url") || settings.wallpaperUrlOrGradient.includes("gradient"))
                      ? settings.wallpaperUrlOrGradient
                      : undefined,
                    backgroundColor: (!settings.wallpaperUrlOrGradient.startsWith("url") && !settings.wallpaperUrlOrGradient.includes("gradient"))
                      ? settings.wallpaperUrlOrGradient
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: `brightness(${settings.wallpaperBrightness ?? 100}%)`,
                  }}
                >
                  <div className="flex justify-between items-center bg-black/50 backdrop-blur-xxs rounded px-1.5 py-0.5 text-[5px] text-white/80 select-none">
                    <span>ARES OS Desktop</span>
                    <span>12:00 PM</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-8 h-6 bg-white/10 backdrop-blur border border-white/20 rounded shadow" />
                    <div className="w-10 h-8 bg-black/30 backdrop-blur border border-white/10 rounded shadow self-end" />
                  </div>
                  <div className="h-1.5 w-24 bg-white/15 backdrop-blur border border-white/20 rounded-full self-center" />
                </div>
              </div>
            </div>

            {/* Custom Wallpapers configuration inputs */}
            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-4 mt-2">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Set Custom Desktop Background</span>
              
              {/* Wallpaper Brightness Dimmer */}
              <div className="space-y-1.5 pb-2">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Wallpaper Brightness Dimmer</span>
                  <span className="font-mono text-indigo-400">{settings.wallpaperBrightness ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.wallpaperBrightness ?? 100}
                  onChange={(e) => {
                    updateSettings({ wallpaperBrightness: parseInt(e.target.value) });
                  }}
                  className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                />
              </div>

              {/* Form 1: Image URL */}
              <form onSubmit={handleApplyCustomUrl} className="space-y-1.5 border-t border-zinc-850/45 pt-3.5">
                <label className="text-[9px] text-zinc-400 font-medium">Custom Image URL (Unsplash, Imgur, etc.)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={customWallpaperUrl}
                    onChange={(e) => setCustomWallpaperUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition cursor-pointer"
                  >
                    Apply Image
                  </button>
                </div>
              </form>

              {/* Form 2: CSS Gradient string */}
              <form onSubmit={handleApplyCustomGradient} className="space-y-2 border-t border-zinc-850/45 pt-3.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Custom Gradient Builder</label>
                  <span className="text-[8px] text-zinc-500 font-mono">Select colors & angle dynamically</span>
                </div>
                
                {/* Advanced Builder controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-950/45 border border-zinc-850/80 rounded-xl">
                  {/* Start Color picker */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">Start Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={gradColorStart}
                        onChange={(e) => setGradColorStart(e.target.value)}
                        className="w-7 h-7 rounded border border-zinc-800 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={gradColorStart}
                        onChange={(e) => setGradColorStart(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 rounded-md px-2 py-1 text-[10px] font-mono text-zinc-250 outline-none"
                      />
                    </div>
                  </div>

                  {/* End Color picker */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">End Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={gradColorEnd}
                        onChange={(e) => setGradColorEnd(e.target.value)}
                        className="w-7 h-7 rounded border border-zinc-800 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={gradColorEnd}
                        onChange={(e) => setGradColorEnd(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-700 rounded-md px-2 py-1 text-[10px] font-mono text-zinc-250 outline-none"
                      />
                    </div>
                  </div>

                  {/* Gradient Angle */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">Angle ({gradAngle}°)</span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={gradAngle}
                      onChange={(e) => setGradAngle(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded cursor-pointer mt-2"
                    />
                  </div>
                </div>

                {/* Preview and Apply section */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <div 
                    className="h-8 flex-1 rounded-lg border border-zinc-850/80 flex items-center justify-center font-mono text-[9px] text-white font-bold tracking-wider shadow" 
                    style={{ background: `linear-gradient(${gradAngle}deg, ${gradColorStart} 0%, ${gradColorEnd} 100%)` }}
                  >
                    BUILDER PREVIEW
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const grad = `linear-gradient(${gradAngle}deg, ${gradColorStart} 0%, ${gradColorEnd} 100%)`;
                      updateSettings({ wallpaperUrlOrGradient: grad });
                      addNotification("Wallpaper Manager", "Applied custom generated gradient.", "success");
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    Apply Builder Gradient
                  </button>
                </div>

                {/* Raw gradient CSS fallback input */}
                <div className="space-y-1 border-t border-zinc-850/30 pt-3 mt-3">
                  <label className="text-[9px] text-zinc-500 font-semibold block">Or paste custom CSS Linear Gradient Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="linear-gradient(135deg, #ff007f 0%, #00f0ff 100%)"
                      value={customGradient}
                      onChange={(e) => setCustomGradient(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none transition"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-355 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg transition cursor-pointer"
                    >
                      Apply Code
                    </button>
                  </div>
                </div>
              </form>
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
              <div className="flex items-center gap-4 border-b border-zinc-850/40 pb-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center font-bold text-white text-lg shadow">
                  {currentUser.username.substring(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{currentUser.username}</span>
                  <span className="text-[9px] text-cyan-500 font-bold uppercase tracking-wider">{currentUser.role}</span>
                </div>
              </div>

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

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-4 mt-4">
              <span className="text-[10px] text-zinc-505 uppercase font-bold tracking-wider block border-b border-zinc-850/40 pb-2">
                🔒 Security Settings & Pass-key
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-zinc-400 font-medium">Current Pass-key</label>
                  <input
                    type="password"
                    placeholder="Enter current pass-key"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-zinc-400 font-medium">New Pass-key</label>
                  <input
                    type="password"
                    placeholder="Enter new pass-key"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs font-bold text-white rounded-xl transition cursor-pointer"
                >
                  Update Pass-key
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === "storage" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Virtual Storage Partition (VFS)
            </h3>

            <div className="bg-zinc-950/30 border border-zinc-850 p-4 rounded-xl space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-200">
                  <span>Disk Capacity (LocalStorage)</span>
                  <span className="font-mono text-zinc-400">
                    Used: {(vfsBytes / (1024 * 1024)).toFixed(4)} MB
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (vfsBytes / (1024 * 1024) / (settings.maxStorageAllocation || 64)) * 100)}%` }}
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-0.5">
                  <span>Total Allocation: {(settings.maxStorageAllocation || 64).toFixed(2)} MB</span>
                  <span>Free Space: {Math.max(0, (settings.maxStorageAllocation || 64) - (vfsBytes / (1024 * 1024))).toFixed(2)} MB</span>
                </div>
              </div>

              {/* Slider for storage allotment */}
              <div className="space-y-2 pt-2 border-t border-zinc-850/40">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex justify-between">
                  <span>Allot Storage Limit</span>
                  <span className="text-indigo-400 font-mono">{(settings.maxStorageAllocation || 64)} MB</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="1024"
                  step="10"
                  value={settings.maxStorageAllocation || 64}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateSettings({ maxStorageAllocation: val });
                  }}
                  className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
                />
              </div>

              {/* Reset Storage */}
              <div className="border-t border-zinc-850/40 pt-4 space-y-2.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Disk Diagnostics</span>
                <button
                  onClick={handleWipeStorage}
                  className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/35 hover:border-rose-500 rounded-lg text-xs font-bold transition cursor-pointer shadow-md shadow-rose-900/10"
                >
                  Wipe Filesystem & Format Disk
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About Tab: Full telemetry info */}
        {activeTab === "about" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              System Telemetry Diagnostics
            </h3>

            <div className="bg-zinc-950/30 border border-zinc-850 p-5 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-14 h-14 rounded-full bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-indigo-500/5 animate-pulse">
                ▲
              </div>

              <h2 className="text-base font-extrabold text-white tracking-widest uppercase">
                ARES OS
              </h2>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-1.5">
                Next.js Client-Side WebOS
              </span>

              <div className="h-[1px] w-full bg-zinc-850/50 my-4.5" />

              <div className="space-y-2.5 font-mono text-[10px] text-zinc-400 w-full text-left max-w-sm mx-auto">
                <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                  <span>OS Version:</span>
                  <span className="text-white font-semibold">1.2.0 (Quantum Edition)</span>
                </div>
                <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                  <span>Client Browser Engine:</span>
                  <span className="text-white font-semibold truncate max-w-[200px]" title={clientSpecs.userAgent}>
                    {clientSpecs.userAgent}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                  <span>Screen Viewport Scale:</span>
                  <span className="text-white font-semibold">{clientSpecs.resolution}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-850/30 pb-1.5">
                  <span>Regional Time Zone:</span>
                  <span className="text-white font-semibold">{clientSpecs.timeZone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Host Core Architect:</span>
                  <span className="text-white font-semibold">Ankit Kumar</span>
                </div>
              </div>

              <div className="h-[1px] w-full bg-zinc-850/50 my-4.5" />

              <p className="text-[10px] italic font-semibold text-zinc-350 font-serif">
                &ldquo;Mission Control For Students // Powered by Robotics AI Tech Lab&rdquo;
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
