"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { playScanSound, playSuccessSound } from "@/utils/webos/audio";
import { Karla_Tamil_Inclined } from "next/font/google";

interface LoginScreenProps {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { settings } = useOS();
  const [passkey, setPasskey] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "denied">("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [matrixText, setMatrixText] = useState("");

  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pwd = localStorage.getItem("aresos_admin_password") || process.env.NEXT_PUBLIC_LOGIN_PASSWORD;
      if (pwd) {
        setStoredPassword(pwd);
        setIsFirstTimeSetup(false);
      } else {
        setIsFirstTimeSetup(true);
      }
    }
  }, []);
  
  // Matrix text animation loop
  useEffect(() => {
    const chars = "0123456789ABCDEF@#$¥%&*§Ø";
    const interval = setInterval(() => {
      let text = "";
      for (let i = 0; i < 48; i++) {
        text += chars[Math.floor(Math.random() * chars.length)];
        if (i % 8 === 7) text += "\n";
      }
      setMatrixText(text);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const handleRetinalScan = () => {
    if (scanState === "scanning" || scanState === "success") return;
    
    setScanState("scanning");
    setScanProgress(0);
    setErrorMessage("");
    
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 10;
        // Play scan sound on alternate steps to avoid audio clutter
        if (next % 20 === 0) {
          playScanSound((settings?.volume ?? 80) / 100);
        }
        if (next >= 100) {
          clearInterval(interval);
          setScanState("success");
          playSuccessSound((settings?.volume ?? 80) / 100);
          return 100;
        }
        return next;
      });
    }, 45);
  };

  const handleSetupPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = newPassword;
    if (!cleanPassword) {
      setErrorMessage("PASS-KEY CANNOT BE EMPTY");
      return;
    }
    if (cleanPassword.length < 4) {
      setErrorMessage("PASS-KEY MUST BE AT LEAST 4 CHARACTERS");
      return;
    }
    if (cleanPassword.includes(" ")) {
      setErrorMessage("PASS-KEY CANNOT CONTAIN SPACES");
      return;
    }
    if (cleanPassword !== confirmPassword) {
      setErrorMessage("CONFIRM PASS-KEY DOES NOT MATCH");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("aresos_admin_password", cleanPassword);
        setStoredPassword(cleanPassword);
        setIsFirstTimeSetup(false);
        setErrorMessage("");
        
        // Since it's setup, automatically trigger the retinal scan to proceed to login
        handleRetinalScan();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("FAILED TO WRITE SECURITY KEY TO DISK");
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (scanState !== "success") {
      setErrorMessage("RETINAL SYNC REQUIRED");
      // Trigger scan automatically to help the user
      handleRetinalScan();
      return;
    }

    const correctPassword = storedPassword || localStorage.getItem("aresos_admin_password") || process.env.NEXT_PUBLIC_LOGIN_PASSWORD;
    if (correctPassword && passkey !== correctPassword) {
      setErrorMessage("INVALID ACCESS KEY");
      return;
    }

    // We will show a 0.2s authenticating state then succeed
    setScanState("scanning");
    setScanProgress(90);
    playSuccessSound((settings?.volume ?? 80) / 100);
    
    setTimeout(() => {
      onSuccess();
    }, 200);
  };

  // Auto-scan on load to make it feel extremely advanced and responsive
  useEffect(() => {
    if (!isFirstTimeSetup) {
      const timer = setTimeout(() => {
        handleRetinalScan();
      }, 250);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstTimeSetup]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-zinc-950 font-mono text-cyan-400 select-none overflow-hidden z-[99999] flex flex-col items-center justify-center p-6">
      
      {/* Self-contained Sci-fi keyframe animations */}
      <style>{`
        @keyframes scanline-v {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.45; }
        }
        @keyframes scanlines-v-scroll {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
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
          background-size: 30px 30px;
          background-image: 
            linear-gradient(to right, rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.03) 1px, transparent 1px);
        }
      `}</style>

      {/* CRT & Grid Overlays */}
      <div className="absolute inset-0 scanlines-overlay pointer-events-none z-50 opacity-80" />
      <div className="absolute inset-0 hud-grid pointer-events-none" />

      {/* Futuristic Background Glare Ring */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-fuchsia-500/5 blur-[100px] pointer-events-none z-0" />

      {/* Main Login holographic Card */}
      <div className="w-full max-w-[420px] bg-zinc-950/70 border border-cyan-500/25 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden z-10 flex flex-col items-center">
        {/* Holographic Corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

        {/* Top Header */}
        <div className="text-center w-full mb-6">
          <span className="text-[9px] uppercase tracking-widest text-cyan-600 block mb-1">
            System Security Interface
          </span>
          <h2 className="text-lg font-black text-white tracking-widest uppercase">
            ARES OS v1.0
          </h2>
          <div className="h-[1px] w-full bg-cyan-500/20 mt-2.5" />
        </div>

        {/* Retinal Scanning Interface Avatar (◉) */}
        <div 
          onClick={handleRetinalScan}
          className={`w-32 h-32 rounded-full border-2 bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer group mb-5 transition-all duration-300 ${
            scanState === "scanning" 
              ? "border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              : scanState === "success"
              ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              : "border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          }`}
        >
          {/* Animated laser scanning line */}
          {(scanState === "scanning" || scanState === "idle") && (
            <div 
              className="absolute left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-20 pointer-events-none"
              style={{
                animation: "scanline-v 3s linear infinite",
              }}
            />
          )}

          {/* Central Eye / Radar Icon */}
          <div className="text-center z-10 flex flex-col items-center">
            {scanState === "success" ? (
              <span className="text-4xl text-emerald-400 animate-pulse">✓</span>
            ) : (
              <span className={`text-4xl transition-transform duration-200 select-none ${
                scanState === "scanning" ? "scale-105 text-cyan-400" : "text-cyan-500 group-hover:scale-105"
              }`}>
                ◉
              </span>
            )}
            
            <span className={`text-[8px] font-bold uppercase tracking-widest mt-1.5 ${
              scanState === "success" 
                ? "text-emerald-400" 
                : scanState === "scanning" 
                ? "text-cyan-400 animate-pulse" 
                : "text-cyan-600/80 group-hover:text-cyan-400"
            }`}>
              {scanState === "success" 
                ? "SYNCED" 
                : scanState === "scanning" 
                ? `SCAN: ${scanProgress}%` 
                : "RETINAL SYNC"}
            </span>
          </div>

          {/* Radar grids backings */}
          <div className="absolute inset-2 border border-cyan-500/5 rounded-full pointer-events-none" />
          <div className="absolute inset-5 border border-cyan-500/5 rounded-full pointer-events-none" />
        </div>

        {/* User Identity Details */}
        <div className="text-center mb-6">
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">Ankit</h3>
          <span className="text-[9px] text-cyan-600 font-bold uppercase tracking-wider block mt-1">
            CLASS-1 ADMINISTRATOR
          </span>
        </div>

        {isFirstTimeSetup ? (
          /* First Time Password Setup Form */
          <form onSubmit={handleSetupPassword} className="w-full space-y-4">
            <div className="text-[9px] text-yellow-500 font-bold uppercase tracking-wider text-center animate-pulse mb-1">
              ⚠️ NO PASS-KEY DETECTED.<br />CREATE ONE TO SECURE YOUR OS.
            </div>
            
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-cyan-600 select-none">🔑</span>
              <input
                type="password"
                placeholder="CREATE PASS-KEY"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-cyan-500/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 rounded-xl py-2.5 pl-9 pr-4 text-xs font-mono tracking-widest text-center text-white placeholder-cyan-700/60 outline-none transition"
                required
              />
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-cyan-650 select-none">🛡️</span>
              <input
                type="password"
                placeholder="CONFIRM PASS-KEY"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-cyan-500/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 rounded-xl py-2.5 pl-9 pr-4 text-xs font-mono tracking-widest text-center text-white placeholder-cyan-700/60 outline-none transition"
                required
              />
            </div>

            {errorMessage && (
              <div className="text-[9px] font-bold text-red-500 text-center animate-pulse tracking-wide select-none">
                ⚠️ {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-black text-xs tracking-widest border transition duration-205 cursor-pointer bg-indigo-650 border-indigo-400 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
            >
              [ INITIALIZE PASS-KEY ]
            </button>
          </form>
        ) : (
          /* Authentication Form */
          <form onSubmit={handleLoginSubmit} className="w-full space-y-4">
            
            {/* Holographic key passcode entry input */}
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-cyan-600 select-none">🔑</span>
              <input
                type="password"
                placeholder="ENTER SYSTEM PASS-KEY"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                className="w-full bg-zinc-950 border border-cyan-500/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20 rounded-xl py-2.5 pl-9 pr-4 text-xs font-mono tracking-widest text-center text-white placeholder-cyan-700/60 outline-none transition"
              />
            </div>

            {/* Warning / Error Log Message */}
            {errorMessage && (
              <div className="text-[9px] font-bold text-red-500 text-center animate-pulse tracking-wide select-none">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Submit button "[ ENTER ARES ]" */}
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-black text-xs tracking-widest border transition duration-200 cursor-pointer ${
                scanState === "success"
                  ? "bg-indigo-600 border-indigo-400 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-zinc-950 border-cyan-500/25 hover:border-cyan-400/50 hover:bg-cyan-950/20 text-cyan-500"
              }`}
            >
              [ ENTER ARESOS ]
            </button>
          </form>
        )}

        {/* Footer HUD elements */}
        <div className="w-full border-t border-cyan-500/10 mt-6 pt-4 flex justify-between items-center text-[8px] text-cyan-700 select-none">
          <span className="font-semibold">IP LINK: SECURE</span>
          <span className="font-bold text-fuchsia-600 animate-pulse">LEVEL-5 ENCRYPTED</span>
        </div>
      </div>

      {/* Help & Security Documentation Link */}
      <div className="mt-5 text-center flex flex-col items-center gap-1.5 z-10 max-w-[420px] select-none">
        <a 
          href="https://github.com/RoboticsAITechLab/ARESOS/blob/main/README.md" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 transition"
        >
          <span>📖</span> <span className="underline decoration-cyan-500/30">View README.md on GitHub</span>
        </a>
        <p className="text-[9px] text-zinc-500 text-center leading-relaxed">
          ⚠️ <span className="font-semibold text-zinc-400">Security Suggestion:</span> Please change the default pass-key (<code className="text-cyan-500 bg-zinc-900/60 px-1 py-0.5 rounded border border-cyan-500/15">1462007</code>) after logging in.
        </p>
      </div>

      {/* Side Decorative Diagnostics: Decryption Matrix Panel */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 hidden xl:flex flex-col border border-cyan-500/15 p-4 rounded-xl bg-cyan-950/5 text-[9px] max-w-[200px] gap-2 select-none">
        <div className="text-[10px] text-white font-bold border-b border-cyan-500/15 pb-1 uppercase tracking-wider">
          Enigma Cipher Core
        </div>
        <div className="font-mono text-cyan-700/80 whitespace-pre leading-relaxed select-none">
          {matrixText}
        </div>
        <div className="text-[7px] text-cyan-600 font-mono mt-1">
          RECALCULATING CHIPS...
        </div>
      </div>

      {/* Side Decorative Diagnostics: Secure Nodes Log */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden xl:flex flex-col border border-cyan-500/15 p-4 rounded-xl bg-cyan-950/5 text-[9px] min-w-[210px] gap-3 select-none">
        <div className="text-[10px] text-white font-bold border-b border-cyan-500/15 pb-1 uppercase tracking-wider">
          Node Authentication
        </div>
        <div className="space-y-2 text-zinc-500 font-mono">
          <div className="flex justify-between">
            <span>NODE-01 (KERNEL):</span>
            <span className="text-emerald-500">AUTHORIZED</span>
          </div>
          <div className="flex justify-between">
            <span>NODE-02 (VFS):</span>
            <span className="text-emerald-500">LINKED</span>
          </div>
          <div className="flex justify-between">
            <span>NODE-03 (NETWORK):</span>
            <span className="text-emerald-500">ENVELOPE OK</span>
          </div>
          <div className="flex justify-between">
            <span>BIOMETRICS SCAN:</span>
            <span className={scanState === "success" ? "text-emerald-500" : "text-yellow-500"}>
              {scanState === "success" ? "VERIFIED" : "PENDING"}
            </span>
          </div>
        </div>
      </div>
    </div>

  );
};
