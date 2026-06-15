"use client";
import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

export const MenuBar: React.FC = () => {
  const { settings, launchApp, updateSettings, addNotification, clearNotifications } = useOS();
  const [time, setTime] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(true);
  const [showBattery, setShowBattery] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Time Sync
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real Battery Status API Integration with Desktop detection
  useEffect(() => {
    if (typeof window === "undefined" || !("getBattery" in navigator)) {
      setShowBattery(false);
      return;
    }

    let battery: any = null;

    const updateBatteryStatus = () => {
      if (!battery) return;
      const level = Math.round(battery.level * 100);
      setBatteryLevel(level);
      setIsCharging(battery.charging);

      // detect mobile / portable user agents
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // on desktop, the browser mock-simulates battery as 100%, charging = true, and dischargingTime = Infinity.
      // Laptop running on battery (charging = false) or discharging has battery, or mobile device.
      const hasBattery = level < 100 || !battery.charging || battery.dischargingTime !== Infinity || isMobile;
      
      setShowBattery(hasBattery);
    };

    (navigator as any).getBattery().then((batt: any) => {
      battery = batt;
      updateBatteryStatus();

      batt.addEventListener("chargingchange", updateBatteryStatus);
      batt.addEventListener("levelchange", updateBatteryStatus);
    });

    return () => {
      if (battery) {
        battery.removeEventListener("chargingchange", updateBatteryStatus);
        battery.removeEventListener("levelchange", updateBatteryStatus);
      }
    };
  }, []);

  // Click outside listener to close dropdowns
  useEffect(() => {
    if (activeMenu === null) return;
    const handleOutsideClick = () => {
      setActiveMenu(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [activeMenu]);

  const handleMenuClick = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent immediate closing by global click listener
    setActiveMenu((prev) => (prev === menuId ? null : menuId));
  };

  const handleMenuHover = (menuId: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuId);
    }
  };

  // Natively Toggle Browser Fullscreen
  // const toggleFullscreen = () => {
  //   if (!document.fullscreenElement) {
  //     document.documentElement.requestFullscreen().catch((err) => {
  //       console.error("Error attempting to enable fullscreen:", err);
  //     });
  //   } else {
  //     document.exitFullscreen();
  //   }
  // };


  const toggleFullscreen = async () => {
  try {
    console.log("Fullscreen Clicked");

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      console.log("Entered Fullscreen");
    } else {
      await document.exitFullscreen();
      console.log("Exited Fullscreen");
    }
  } catch (err) {
    console.error("Fullscreen Error:", err);
  }
};

  // Cycle global OS themes
  const cycleTheme = () => {
    const themes: ("light" | "dark" | "midnight" | "aurora")[] = ["dark", "light", "midnight", "aurora"];
    const currentIdx = themes.indexOf(settings?.theme || "dark");
    const nextIdx = (currentIdx + 1) % themes.length;
    const nextTheme = themes[nextIdx];
    updateSettings({ theme: nextTheme });
    addNotification("Theme Manager", `System theme changed to ${nextTheme.toUpperCase()}`, "info");
  };

  // About Modal Notification
  const triggerAboutNotification = () => {
    addNotification(
      "About ARESOS",
      "ARESOS WebOS v1.2.0. Built with Next.js 16, React 19, and Tailwind CSS. Designed by Ankit Kumar.",
      "info"
    );
  };

  // Hard Reset Local Storage
  const triggerHardReset = () => {
    localStorage.clear();
    addNotification("System Reset", "Clearing local storage data... Restarting mainframes.", "warning");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Clear shell command history
  const clearShellHistory = () => {
    localStorage.removeItem("aresos_terminal_history");
    addNotification("System Shell", "Command history logs cleared from data registries.", "success");
  };

  const theme = settings?.theme || "dark";
  
  let barClasses = "h-7 w-full flex items-center justify-between px-4 select-none z-[999] text-xs font-semibold backdrop-blur-md border-b relative ";
  let brandTextClasses = "font-extrabold tracking-wider cursor-pointer transition-colors ";
  let submenuClasses = "hidden md:flex items-center gap-2 font-medium ";
  let statusClasses = "flex items-center gap-4 font-medium ";
  let clockClasses = "font-bold pl-2 border-l ";
  let dropdownBg = "";

  if (theme === "light") {
    barClasses += "bg-white/75 border-slate-200 text-slate-700";
    brandTextClasses += "text-slate-900 hover:text-indigo-600";
    submenuClasses += "text-slate-500";
    statusClasses += "text-slate-500";
    clockClasses += "text-slate-900 border-slate-200";
    dropdownBg = "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50";
  } else if (theme === "midnight") {
    barClasses += "bg-slate-950/75 border-indigo-950/40 text-indigo-200";
    brandTextClasses += "text-white hover:text-indigo-400";
    submenuClasses += "text-indigo-400/80";
    statusClasses += "text-indigo-400/80";
    clockClasses += "text-indigo-100 border-indigo-950/40";
    dropdownBg = "bg-slate-950/95 border-indigo-900/30 text-indigo-100 shadow-indigo-950/20";
  } else if (theme === "aurora") {
    barClasses += "bg-zinc-950/75 border-teal-950/40 text-teal-300";
    brandTextClasses += "text-white hover:text-teal-400";
    submenuClasses += "text-teal-500/80";
    statusClasses += "text-teal-500/80";
    clockClasses += "text-teal-200 border-teal-950/40";
    dropdownBg = "bg-zinc-950/95 border-teal-900/30 text-teal-100 shadow-emerald-950/20";
  } else {
    // dark
    barClasses += "bg-zinc-950/75 border-zinc-800/40 text-zinc-300";
    brandTextClasses += "text-white hover:text-cyan-400";
    submenuClasses += "text-zinc-400";
    statusClasses += "text-zinc-400";
    clockClasses += "text-white border-zinc-800";
    dropdownBg = "bg-zinc-950/95 border-zinc-800/40 text-zinc-200 shadow-zinc-950/40";
  }

  return (
    <div className={barClasses}>
      {/* Left side: System Controls, OS name, submenus */}
      <div className="flex items-center gap-4">
        {/* macOS dot indicators */}
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
        </div>

        {/* Global OS Name / Dropdown */}
        <div className="relative">
          <span 
            className={brandTextClasses}
            onClick={(e) => handleMenuClick("system", e)}
            onMouseEnter={() => handleMenuHover("system")}
          >
            ARES
          </span>
          {activeMenu === "system" && (
            <div className={`absolute top-6 left-0 w-48 rounded-lg border p-1 shadow-2xl z-[99999] flex flex-col font-medium animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownBg}`}>
              <button onClick={triggerAboutNotification} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                <span>💻</span> About ARESOS
              </button>
              <button onClick={() => launchApp("settings")} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                <span>⚙️</span> System Settings
              </button>
              <div className="border-t border-white/5 my-1" />
              <button onClick={() => window.location.reload()} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                <span>🔒</span> Lock Session
              </button>
              <button onClick={() => window.location.reload()} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-rose-400 hover:text-rose-300 transition duration-100">
                <span>🔌</span> Shutdown Mainframe
              </button>
            </div>
          )}
        </div>

        {/* App Context Submenus */}
        <div className={submenuClasses}>
          {/* File Dropdown */}
          <div className="relative px-2">
            <span 
              onClick={(e) => handleMenuClick("file", e)}
              onMouseEnter={() => handleMenuHover("file")}
              className={`hover:text-white cursor-pointer transition-colors ${activeMenu === "file" ? "text-white" : ""}`}
            >
              File
            </span>
            {activeMenu === "file" && (
              <div className={`absolute top-6 left-0 w-48 rounded-lg border p-1 shadow-2xl z-[99999] flex flex-col font-medium animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownBg}`}>
                <button onClick={() => launchApp("terminal")} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>💻</span> Launch Terminal
                </button>
                <button onClick={() => launchApp("file-manager")} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>📁</span> Launch File Manager
                </button>
                <button onClick={() => launchApp("text-editor")} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>📒</span> Launch Text Editor
                </button>
              </div>
            )}
          </div>

          {/* Edit Dropdown */}
          <div className="relative px-2">
            <span 
              onClick={(e) => handleMenuClick("edit", e)}
              onMouseEnter={() => handleMenuHover("edit")}
              className={`hover:text-white cursor-pointer transition-colors ${activeMenu === "edit" ? "text-white" : ""}`}
            >
              Edit
            </span>
            {activeMenu === "edit" && (
              <div className={`absolute top-6 left-0 w-48 rounded-lg border p-1 shadow-2xl z-[99999] flex flex-col font-medium animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownBg}`}>
                <button onClick={clearNotifications} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>🧹</span> Clear Alerts Drawer
                </button>
                <button onClick={clearShellHistory} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>🧹</span> Clear Shell History
                </button>
                <div className="border-t border-white/5 my-1" />
                <button onClick={triggerHardReset} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 text-red-400 hover:text-red-300 transition duration-100">
                  <span>☣️</span> Factory Reset OS
                </button>
              </div>
            )}
          </div>

          {/* View Dropdown */}
          <div className="relative px-2">
            <span 
              onClick={(e) => handleMenuClick("view", e)}
              onMouseEnter={() => handleMenuHover("view")}
              className={`hover:text-white cursor-pointer transition-colors ${activeMenu === "view" ? "text-white" : ""}`}
            >
              View
            </span>
            {activeMenu === "view" && (
              <div className={`absolute top-6 left-0 w-48 rounded-lg border p-1 shadow-2xl z-[99999] flex flex-col font-medium animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownBg}`}>
                <button onClick={toggleFullscreen} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>🖥️</span> Toggle Fullscreen
                </button>
                <button onClick={cycleTheme} className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100">
                  <span>🎨</span> Cycle OS Themes
                </button>
              </div>
            )}
          </div>

          {/* Help Dropdown */}
          <div className="relative px-2">
            <span 
              onClick={(e) => handleMenuClick("help", e)}
              onMouseEnter={() => handleMenuHover("help")}
              className={`hover:text-white cursor-pointer transition-colors ${activeMenu === "help" ? "text-white" : ""}`}
            >
              Help
            </span>
            {activeMenu === "help" && (
              <div className={`absolute top-6 left-0 w-52 rounded-lg border p-1 shadow-2xl z-[99999] flex flex-col font-medium animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownBg}`}>
                <button 
                  onClick={() => addNotification("ARES Help", "ARES OS shell emulator supports ls, cd, mkdir, rm, weather, ping and top commands. Tap dock icons to launch applications.", "info")}
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100"
                >
                  {/* <span>📖</span> Quick Start Manual */}
                </button>
                <a 
                  href="https://github.com/RoboticsAITechLab/ARESOS" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2 transition duration-100"
                >
                  <span>🐈</span> Source Repository
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: WiFi, Battery, Date & Time status */}
      <div className={statusClasses}>
        {/* WiFi Indicator */}
        <div className="flex items-center gap-1 cursor-help" title="WiFi Signal: 95% Strong">
          <span>📶</span>
          <span className="text-[10px] font-mono">95%</span>
        </div>

        {/* Battery Indicator */}
        {showBattery && (
          <div className="flex items-center gap-1.5 cursor-help" title={`Battery Status: ${batteryLevel}% ${isCharging ? "Charging" : "Discharging"}`}>
            <span className="text-sm">{isCharging ? "⚡🔋" : "🔋"}</span>
            <span className="text-[10px] font-mono">{batteryLevel}%</span>
          </div>
        )}

        {/* System Time */}
        <div className={clockClasses}>
          {time}
        </div>
      </div>
    </div>
  );
};

