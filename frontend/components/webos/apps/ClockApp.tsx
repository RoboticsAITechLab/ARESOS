"use client";

import React, { useState, useEffect, useRef } from "react";

interface ClockAppProps {
  pid: string;
}

export default function ClockApp({ pid: _pid }: ClockAppProps) {
  const [tab, setTab] = useState<"clocks" | "stopwatch">("clocks");
  
  // World Clocks State
  const [localTime, setLocalTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const worldClocks = [
    { name: "London (GMT/BST)", tz: "Europe/London" },
    { name: "New York (EST/EDT)", tz: "America/New_York" },
    { name: "Tokyo (JST)", tz: "Asia/Tokyo" },
    { name: "Sydney (AEST)", tz: "Australia/Sydney" },
  ];

  // Stopwatch State
  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0); // in ms
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const swTimerRef = useRef<NodeJS.Timeout | null>(null);
  const swStartRef = useRef<number>(0);

  const startStopwatch = () => {
    if (swRunning) {
      // Pause
      setSwRunning(false);
      if (swTimerRef.current) clearInterval(swTimerRef.current);
    } else {
      // Start
      setSwRunning(true);
      swStartRef.current = Date.now() - swTime;
      swTimerRef.current = setInterval(() => {
        setSwTime(Date.now() - swStartRef.current);
      }, 10);
    }
  };

  const handleLapOrReset = () => {
    if (swRunning) {
      // Lap
      setSwLaps((prev) => [swTime, ...prev]);
    } else {
      // Reset
      setSwTime(0);
      setSwLaps([]);
    }
  };

  useEffect(() => {
    return () => {
      if (swTimerRef.current) clearInterval(swTimerRef.current);
    };
  }, []);

  const formatStopwatch = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const centisec = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(centisec).padStart(2, "0")}`;
  };

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none">
      {/* Sidebar Navigation */}
      <div className="w-40 bg-zinc-950/40 border-r border-zinc-800/60 p-4 space-y-2 flex-shrink-0">
        <button
          onClick={() => setTab("clocks")}
          className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition ${
            tab === "clocks" ? "bg-indigo-600/35 text-indigo-200 font-semibold" : "hover:bg-zinc-800/50 text-zinc-300"
          }`}
        >
          🌐 World Clocks
        </button>
        <button
          onClick={() => setTab("stopwatch")}
          className={`w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition ${
            tab === "stopwatch" ? "bg-indigo-600/35 text-indigo-200 font-semibold" : "hover:bg-zinc-800/50 text-zinc-300"
          }`}
        >
          ⏱️ Stopwatch
        </button>
      </div>

      {/* Main Content View */}
      <div className="flex-1 p-5 overflow-y-auto">
        {tab === "clocks" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200">
              Local System Time
            </h3>
            
            {/* Local Clock Layout */}
            <div className="bg-zinc-950/50 border border-zinc-850 p-4 rounded-2xl text-center select-text">
              <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                {localTime.toLocaleTimeString()}
              </span>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">
                {localTime.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <h3 className="text-sm font-bold border-b border-zinc-850 pb-2 text-zinc-200 pt-3">
              World Zones
            </h3>

            {/* World Zone List */}
            <div className="grid grid-cols-2 gap-3">
              {worldClocks.map((clock) => {
                const timeStr = localTime.toLocaleTimeString([], {
                  timeZone: clock.tz,
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                return (
                  <div
                    key={clock.tz}
                    className="p-3 bg-zinc-950/20 border border-zinc-850 rounded-xl flex justify-between items-center"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-200 truncate">{clock.name.split(" ")[0]}</span>
                      <span className="text-[9px] text-zinc-500 truncate">{clock.tz}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-white pl-2">
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "stopwatch" && (
          <div className="space-y-5 flex flex-col items-center justify-center h-full">
            {/* Stopwatch Digits Display */}
            <div className="text-4xl font-extrabold text-white font-mono tracking-wider py-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
              {formatStopwatch(swTime)}
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-3 w-full max-w-[240px]">
              <button
                onClick={handleLapOrReset}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition text-zinc-400 cursor-pointer"
              >
                {swRunning ? "Lap" : "Reset"}
              </button>

              <button
                onClick={startStopwatch}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition text-white cursor-pointer ${
                  swRunning
                    ? "bg-red-600/30 border border-red-500/40 text-red-200 hover:bg-red-600/40"
                    : "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-lg shadow-indigo-500/10"
                }`}
              >
                {swRunning ? "Pause" : "Start"}
              </button>
            </div>

            {/* Laps List */}
            {swLaps.length > 0 && (
              <div className="w-full max-w-[240px] border border-zinc-850 rounded-xl bg-zinc-950/30 overflow-hidden flex flex-col max-h-[140px] mt-2">
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider px-3 py-1.5 border-b border-zinc-850">
                  Laps Record
                </div>
                <div className="overflow-y-auto divide-y divide-zinc-850/50 flex-1 scrollbar-thin">
                  {swLaps.map((lap, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 flex justify-between text-[10px] font-mono text-zinc-400"
                    >
                      <span>Lap {swLaps.length - index}</span>
                      <span>{formatStopwatch(lap)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
