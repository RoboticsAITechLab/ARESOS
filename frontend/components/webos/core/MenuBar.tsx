"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

export const MenuBar: React.FC = () => {
  const { settings, currentUser } = useOS();
  const [time, setTime] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(95);

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

  // Mock battery depletion very slowly
  useEffect(() => {
    const batteryTimer = setInterval(() => {
      setBatteryLevel((prev) => (prev > 10 ? prev - 1 : 95));
    }, 600000); // every 10 min
    return () => clearInterval(batteryTimer);
  }, []);

  const theme = settings?.theme || "dark";
  
  let barClasses = "h-7 w-full flex items-center justify-between px-4 select-none z-[999] text-xs font-semibold backdrop-blur-md border-b ";
  let brandTextClasses = "font-extrabold tracking-wider cursor-pointer transition-colors ";
  let submenuClasses = "hidden md:flex items-center gap-4 font-medium ";
  let statusClasses = "flex items-center gap-4 font-medium ";
  let clockClasses = "font-bold pl-2 border-l ";

  if (theme === "light") {
    barClasses += "bg-white/75 border-slate-200 text-slate-700";
    brandTextClasses += "text-slate-900 hover:text-indigo-600";
    submenuClasses += "text-slate-500";
    statusClasses += "text-slate-500";
    clockClasses += "text-slate-900 border-slate-200";
  } else if (theme === "midnight") {
    barClasses += "bg-slate-950/75 border-indigo-950/40 text-indigo-200";
    brandTextClasses += "text-white hover:text-indigo-400";
    submenuClasses += "text-indigo-400/80";
    statusClasses += "text-indigo-400/80";
    clockClasses += "text-indigo-100 border-indigo-950/40";
  } else if (theme === "aurora") {
    barClasses += "bg-zinc-950/75 border-teal-950/40 text-teal-300";
    brandTextClasses += "text-white hover:text-teal-400";
    submenuClasses += "text-teal-500/80";
    statusClasses += "text-teal-500/80";
    clockClasses += "text-teal-200 border-teal-950/40";
  } else {
    // dark
    barClasses += "bg-zinc-950/75 border-zinc-800/40 text-zinc-300";
    brandTextClasses += "text-white hover:text-cyan-400";
    submenuClasses += "text-zinc-400";
    statusClasses += "text-zinc-400";
    clockClasses += "text-white border-zinc-800";
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

        {/* Global OS Name */}
        <span className={brandTextClasses}>
          ARES
        </span>

        {/* App Context Submenus */}
        <div className={submenuClasses}>
          <span className="hover:text-white cursor-pointer transition-colors">File</span>
          <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
          <span className="hover:text-white cursor-pointer transition-colors">View</span>
          <span className="hover:text-white cursor-pointer transition-colors">Go</span>
          <span className="hover:text-white cursor-pointer transition-colors">Help</span>
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
        <div className="flex items-center gap-1.5 cursor-help" title={`Battery Status: ${batteryLevel}% Charged`}>
          <span className="text-sm">🔋</span>
          <span className="text-[10px] font-mono">{batteryLevel}%</span>
        </div>

        {/* System Time */}
        <div className={clockClasses}>
          {time}
        </div>
      </div>
    </div>
  );
};
