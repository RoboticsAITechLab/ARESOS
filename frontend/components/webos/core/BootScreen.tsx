"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { playBootSound } from "@/utils/webos/audio";

interface BootScreenProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  { time: "0.00s", tag: "SYS", text: "ARES Core Bootloader v2.4.9-Quantum initializing..." },
  { time: "0.12s", tag: "CPU", text: "Detecting processor cores... 16 Virtual Hyperthreads OK." },
  { time: "0.38s", tag: "MEM", text: "Paging physical blocks... 8192 MB mapped to RAM memory space." },
  { time: "0.64s", tag: "VFS", text: "Probing virtual disk structures... localStorage backend detected." },
  { time: "0.85s", tag: "VFS", text: "Verifying filesystem nodes hierarchy. 4 subfolders, 3 files mounted." },
  { time: "1.10s", tag: "SEC", text: "Generating RSA-4096 host keys... Handshake signatures secured." },
  { time: "1.45s", tag: "NET", text: "Initializing loopback bridge interface... 127.0.0.1 link active." },
  { time: "1.80s", tag: "APP", text: "Loading system binaries: [terminal, explorer, editor, browser]." },
  { time: "2.12s", tag: "UI", text: "Compiling theme engine components. Glassmorphism styling preloaded." },
  { time: "2.40s", tag: "SYS", text: "Spawning init process (PID: 1) and user shell (PID: 12)..." },
  { time: "2.75s", tag: "OK", text: "All core subsystems online. Authorizing login user 'ares_user'." },
  { time: "3.20s", tag: "SYS", text: "Launching ARESOS desktop workspace interface..." },
  { time: "3.65s", tag: "INIT", text: "System boot sequence complete. Opening session." },
];

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const { settings } = useOS();
  const [progress, setProgress] = useState(0);
  const [activeLogs, setActiveLogs] = useState<typeof BOOT_LOGS>([]);
  const [glitch, setGlitch] = useState(false);
  const [systemLogsIdx, setSystemLogsIdx] = useState(0);
  
  const audioLinkMock = useRef("LINK ACTIVE");
  const bootSoundPlayed = useRef(false);

  // Trigger boot chime
  useEffect(() => {
    if (progress >= 82 && !bootSoundPlayed.current) {
      bootSoundPlayed.current = true;
      playBootSound((settings?.volume ?? 80) / 100);
    }
  }, [progress, settings?.volume]);


  // Dynamic progress increment
  useEffect(() => {
    const duration = 3800; // 3.8 seconds
    const intervalTime = 40;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          // Small glitch effect right before completing
          setGlitch(true);
          setTimeout(() => {
            onComplete();
          }, 350);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Dynamic logs output sequence based on progress
  useEffect(() => {
    const progressThresholds = [0, 8, 18, 28, 38, 48, 58, 65, 72, 80, 88, 93, 98];
    const logIdx = progressThresholds.findIndex((th, i) => {
      const nextTh = progressThresholds[i + 1] || 101;
      return progress >= th && progress < nextTh;
    });

    if (logIdx !== -1 && logIdx >= systemLogsIdx) {
      setActiveLogs(BOOT_LOGS.slice(0, logIdx + 1));
      setSystemLogsIdx(logIdx + 1);
    }
  }, [progress, systemLogsIdx]);

  // Intermittent minor aesthetic glitch flicker
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 80);
    }, 1200 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-zinc-950 font-mono text-cyan-400 select-none overflow-hidden z-[99999] flex flex-col p-6 md:p-8">
      {/* Self-contained Sci-fi keyframe animations */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes rotate-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotate-counter-clockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .scanlines-overlay {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%,
            rgba(0, 0, 0, 0.25) 50%
          ), linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.06),
            rgba(0, 255, 0, 0.02),
            rgba(0, 0, 255, 0.06)
          );
          background-size: 100% 4px, 3px 100%;
        }
        .hud-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(6, 182, 212, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.04) 1px, transparent 1px);
        }
      `}</style>

      {/* Retro CRT overlay effects */}
      <div className="absolute inset-0 scanlines-overlay pointer-events-none z-50 opacity-80" />
      
      {/* Scanline scroll bar */}
      <div 
        className="absolute inset-x-0 h-40 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none z-50"
        style={{
          animation: "scanline 8s linear infinite",
        }}
      />

      {/* Matrix cyber grid layout backdrop */}
      <div className="absolute inset-0 hud-grid pointer-events-none" />

      {/* Header Panel */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border border-cyan-500/20 bg-cyan-950/10 p-4 rounded-xl gap-2 backdrop-blur-sm z-10 flex-shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />

        <div className="flex items-center gap-3">
          <div className="text-xl animate-pulse">▲</div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider text-white">ARES QUANTUM OS</span>
            <span className="text-[9px] text-cyan-500/80">MAINFRAME INITIALIZATION SEQUENCE</span>
          </div>
        </div>

        <div className="flex gap-4 text-[10px] text-cyan-500">
          <div>LINK: <span className="text-emerald-400">{audioLinkMock.current}</span></div>
          <div>VOLTAGE: <span className="text-white">1.28V [STABLE]</span></div>
          <div>SECURE CORE: <span className="text-white">LEVEL-5</span></div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 min-h-0 z-10">
        
        {/* Left HUD Panel: Diagnostics */}
        <section className="border border-cyan-500/20 bg-cyan-950/5 rounded-xl p-5 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-cyan-400" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-cyan-400" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-cyan-400" />

          <div className="space-y-4">
            <div className="text-xs font-bold border-b border-cyan-500/20 pb-1.5 uppercase tracking-wider text-white">
              System Diagnostics
            </div>

            {/* Diagnostic items */}
            <div className="space-y-3.5 text-[10px] text-zinc-400">
              <div className="flex justify-between">
                <span>QUANTUM SYNC:</span>
                <span className="text-cyan-400">0.018ms DRIFT</span>
              </div>
              <div className="flex justify-between">
                <span>THERMAL SENSOR:</span>
                <span className="text-emerald-400">38°C [NORMAL]</span>
              </div>
              <div className="flex justify-between">
                <span>GRAPHICS PIPELINE:</span>
                <span className="text-cyan-400">VULKAN/WEBGL OK</span>
              </div>
              <div className="flex justify-between">
                <span>CRITICAL FAILURES:</span>
                <span className="text-emerald-400">0 DETECTED</span>
              </div>
              <div className="flex justify-between">
                <span>HOST NETWORK ENVELOPE:</span>
                <span className="text-cyan-400">LOOPBACK-BRIDGE</span>
              </div>
            </div>
          </div>

          {/* Graphical representation: Mock graph nodes grid */}
          <div className="border border-cyan-500/15 p-3 rounded-lg bg-zinc-950/40 mt-4 flex-1 flex flex-col justify-between">
            <div className="text-[8px] uppercase tracking-wider text-cyan-600 mb-2">Core Memory Grid Mapping</div>
            <div className="grid grid-cols-8 gap-1 flex-1 items-center content-center">
              {Array.from({ length: 32 }).map((_, i) => {
                const filled = progress > (i * 3);
                return (
                  <div
                    key={i}
                    className={`h-4 rounded-sm transition-all duration-300 ${
                      filled
                        ? i % 7 === 0 
                          ? "bg-fuchsia-500 shadow-sm shadow-fuchsia-500/50" 
                          : "bg-cyan-500 shadow-sm shadow-cyan-500/50"
                        : "bg-zinc-900 border border-zinc-800"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Center Panel: SVG HUD Core Rotor */}
        <section className="border border-cyan-500/20 bg-cyan-950/5 rounded-xl p-5 flex flex-col items-center justify-center backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-cyan-400" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-cyan-400" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-cyan-400" />

          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer dotted spinning ring */}
            <svg
              className="absolute inset-0 w-full h-full text-cyan-500/30"
              viewBox="0 0 100 100"
              style={{ animation: "rotate-clockwise 20s linear infinite" }}
            >
              <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3, 3" fill="none" />
            </svg>

            {/* Mid rotating ring */}
            <svg
              className="absolute inset-0 w-full h-full text-cyan-400/60"
              viewBox="0 0 100 100"
              style={{
                animation: "rotate-counter-clockwise 8s linear infinite",
                filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.4))",
              }}
            >
              <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="1" strokeDasharray="60, 20, 10, 40" fill="none" />
            </svg>

            {/* Inner fuchsia rotating segment ring */}
            <svg
              className="absolute inset-0 w-full h-full text-fuchsia-500/65"
              viewBox="0 0 100 100"
              style={{
                animation: "rotate-clockwise 4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                filter: "drop-shadow(0 0 6px rgba(217, 70, 239, 0.5))",
              }}
            >
              <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1.5" strokeDasharray="15, 90, 30, 20" fill="none" />
            </svg>

            {/* Central glowing reactor core text */}
            <div className="text-center flex flex-col items-center justify-center z-10">
              <span className="text-[9px] uppercase tracking-widest text-cyan-500 font-bold select-none mb-1">
                REACTOR LOAD
              </span>
              <span className="text-4xl font-extrabold text-white font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {Math.round(progress)}%
              </span>
              <span className="text-[7px] text-fuchsia-400 mt-1 select-none font-bold animate-pulse">
                INITIALIZING...
              </span>
            </div>
          </div>
        </section>

        {/* Right HUD Panel: Scrolling Boot Logs */}
        <section className="border border-cyan-500/20 bg-cyan-950/5 rounded-xl p-5 flex flex-col backdrop-blur-sm relative overflow-hidden min-h-0">
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-cyan-400" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-cyan-400" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-cyan-400" />

          <div className="text-xs font-bold border-b border-cyan-500/20 pb-1.5 uppercase tracking-wider text-white mb-3">
            Boot Initialization Logs
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-2 scrollbar-none flex flex-col justify-end">
            <div className="space-y-1.5">
              {activeLogs.map((log, index) => (
                <div key={index} className="flex gap-2 leading-relaxed">
                  <span className="text-cyan-600 font-medium select-none">[{log.time}]</span>
                  <span className={`font-bold select-none ${
                    log.tag === "OK" ? "text-emerald-400" : log.tag === "SEC" ? "text-fuchsia-400" : "text-cyan-400"
                  }`}>
                    [{log.tag}]
                  </span>
                  <span className="text-zinc-300">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Footer Progress HUD Panel */}
      <footer className="border border-cyan-500/20 bg-cyan-950/10 p-5 rounded-xl flex flex-col gap-3 backdrop-blur-sm z-10 flex-shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />

        <div className="flex justify-between items-center text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
          <span>Bootloader Core Status: Initializing Mainframe Services</span>
          <span className="text-cyan-400">SYSTEM STABLE // CODE 200</span>
        </div>

        {/* Outer neon glowing progress bar container */}
        <div className="w-full bg-zinc-950/80 border border-cyan-500/25 h-6 rounded-lg p-1 relative overflow-hidden shadow-inner">
          {/* Glowing bar */}
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-fuchsia-500 rounded transition-all duration-300 ease-out flex items-center justify-end pr-2 overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          >
            {progress > 10 && (
              <span className="text-[9px] font-bold text-black drop-shadow font-mono select-none">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>

        {/* Dynamic bottom flashing indicators */}
        <div className="flex justify-between text-[8px] text-cyan-600 font-semibold select-none">
          <span>ARESOS SHUTDOWN PROTOCOL: INACTIVE</span>
          <span className="flex items-center gap-1">
            TERMINAL FOCUS LINK
            <span className="inline-block w-1 h-3 bg-cyan-500 animate-[blink_1s_steps(2)_infinite] align-middle" />
          </span>
          <span>SYSTEM TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>

      {/* Extreme Glitch Overlay right before rendering desktop */}
      {glitch && (
        <div className="absolute inset-0 bg-cyan-400/20 backdrop-invert-0 z-[999999] pointer-events-none transition-opacity duration-100 flex items-center justify-center animate-[pulse_0.08s_infinite]" />
      )}
    </div>
  );
};
