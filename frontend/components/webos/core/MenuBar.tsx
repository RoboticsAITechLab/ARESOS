"use client";
import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

export const MenuBar: React.FC = () => {
  const { settings } = useOS();
  const [time, setTime] = useState("");
  const [cpu, setCpu] = useState(23);
  const [ram, setRam] = useState(41);
  const [temp, setTemp] = useState(42);

  // Time Sync
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Telemetry Fluctuation Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCpu((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(15, Math.min(35, prev + delta));
      });
      setRam((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.max(38, Math.min(45, prev + delta));
      });
      setTemp((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        return Math.max(40, Math.min(44, prev + delta));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const barClasses = "h-8 w-full flex items-center justify-between px-4 select-none z-[999] text-[10px] font-mono border-b bg-black/95 border-red-500/40 text-red-500 shadow-[0_0_10px_rgba(255,0,0,0.15)] relative";

  return (
    <div className={barClasses}>
      {/* Left side: HUD Command telemetry */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="w-1.5 h-1.5 bg-red-650 animate-pulse inline-block" />
          <span>[SYS:ONLINE]</span>
        </div>
        <div className="text-zinc-400 font-extrabold tracking-wider">
          ARESOS // ORBITAL COMMAND
        </div>
        <div className="hidden sm:inline text-red-600/70">
          SEC:AURION-7
        </div>
        <div className="hidden md:inline text-red-600/70">
          UPLINK:STABLE
        </div>
        <div className="hidden lg:inline text-red-600/70">
          NET:ACTIVE
        </div>
      </div>

      {/* Right side: Realtime Telemetry Stats */}
      <div className="flex items-center gap-6 font-mono text-zinc-300">
        <div className="flex items-center gap-1">
          <span className="text-red-500/60">CPU:</span>
          <span className="text-red-500 font-bold">{cpu}%</span>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-red-500/60">RAM:</span>
          <span className="text-red-500 font-bold">{ram}%</span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <span className="text-red-500/60">TEMP:</span>
          <span className="text-red-500 font-bold">{temp}°C</span>
        </div>
        <div className="hidden lg:flex items-center gap-1">
          <span className="text-red-500/60">UPLINK:</span>
          <span className="text-emerald-400 font-bold">STABLE</span>
        </div>
        <div className="border-l border-red-500/30 pl-3 text-red-500 font-bold">
          {time}
        </div>
      </div>
    </div>
  );
};
