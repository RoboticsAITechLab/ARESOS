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

  return (
    <div className="h-7 w-full bg-zinc-950/75 backdrop-blur-md border-b border-zinc-800/40 flex items-center justify-between px-4 select-none z-[999] text-xs font-semibold text-zinc-300">
      {/* Left side: System Controls, OS name, submenus */}
      <div className="flex items-center gap-4">
        {/* macOS dot indicators */}
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-[0_0_6px_rgba(234,179,8,0.4)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
        </div>

        {/* Global OS Name */}
        <span className="font-extrabold text-white tracking-wider cursor-pointer hover:text-cyan-400 transition-colors">
          ARES
        </span>

        {/* App Context Submenus */}
        <div className="hidden md:flex items-center gap-4 text-zinc-400 font-medium">
          <span className="hover:text-white cursor-pointer transition-colors">File</span>
          <span className="hover:text-white cursor-pointer transition-colors">Edit</span>
          <span className="hover:text-white cursor-pointer transition-colors">View</span>
          <span className="hover:text-white cursor-pointer transition-colors">Go</span>
          <span className="hover:text-white cursor-pointer transition-colors">Help</span>
        </div>
      </div>

      {/* Right side: WiFi, Battery, Date & Time status */}
      <div className="flex items-center gap-4 text-zinc-400 font-medium">
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
        <div className="text-white font-bold pl-2 border-l border-zinc-800">
          {time}
        </div>
      </div>
    </div>
  );
};
