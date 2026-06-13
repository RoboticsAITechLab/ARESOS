"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { REGISTERED_APPS } from "@/config/webos/apps.config";

export const StartMenu: React.FC = () => {
  const { isStartMenuOpen, setStartMenuOpen, launchApp, settings } = useOS();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on ESC key, auto-focus search input on load/typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isStartMenuOpen) return;

      if (e.key === "Escape") {
        setStartMenuOpen(false);
      } else {
        // Auto focus input if user starts typing letters
        if (
          inputRef.current &&
          document.activeElement !== inputRef.current &&
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          inputRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStartMenuOpen, setStartMenuOpen]);

  // Focus input when Launchpad is toggled open
  useEffect(() => {
    if (isStartMenuOpen) {
      setSearch("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isStartMenuOpen]);

  if (!isStartMenuOpen) return null;

  const filteredApps = REGISTERED_APPS.filter((app) =>
    app.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleLaunch = (appId: string) => {
    launchApp(appId);
    setStartMenuOpen(false);
  };

  const theme = settings?.theme || "dark";

  let bgOverlayClasses = "";
  let searchInputClasses = "";
  let iconCardClasses = "";
  let textTitleClasses = "";
  let footerClasses = "";

  if (theme === "light") {
    bgOverlayClasses = "bg-white/80 backdrop-blur-3xl";
    searchInputClasses = "bg-slate-100 border border-slate-350 focus:border-slate-400 text-slate-800 placeholder-slate-400";
    iconCardClasses = "bg-slate-100/60 border border-slate-200 shadow-sm group-hover:bg-slate-200/50 group-hover:border-slate-300";
    textTitleClasses = "text-slate-750 group-hover:text-slate-900";
    footerClasses = "text-slate-500";
  } else if (theme === "midnight") {
    bgOverlayClasses = "bg-slate-950/80 backdrop-blur-3xl";
    searchInputClasses = "bg-indigo-950/40 border border-indigo-900/40 focus:border-indigo-800 text-indigo-100 placeholder-indigo-500";
    iconCardClasses = "bg-indigo-950/30 border border-indigo-900/20 group-hover:bg-indigo-900/10 group-hover:border-indigo-800/40";
    textTitleClasses = "text-indigo-200 group-hover:text-white";
    footerClasses = "text-indigo-400/80";
  } else if (theme === "aurora") {
    bgOverlayClasses = "bg-zinc-950/80 backdrop-blur-3xl";
    searchInputClasses = "bg-teal-950/40 border border-teal-900/40 focus:border-teal-800 text-teal-100 placeholder-teal-500";
    iconCardClasses = "bg-teal-950/30 border border-teal-900/20 group-hover:bg-teal-900/10 group-hover:border-teal-800/40";
    textTitleClasses = "text-teal-200 group-hover:text-white";
    footerClasses = "text-teal-500/80";
  } else {
    // dark
    bgOverlayClasses = "bg-zinc-950/75 backdrop-blur-3xl";
    searchInputClasses = "bg-zinc-900/60 border border-zinc-800/80 focus:border-zinc-700/80 text-zinc-100 placeholder-zinc-500";
    iconCardClasses = "bg-zinc-900/50 border border-zinc-800/40 group-hover:bg-white/10 group-hover:border-zinc-700/50";
    textTitleClasses = "text-zinc-300 group-hover:text-white";
    footerClasses = "text-zinc-600";
  }

  return (
    <div
      onClick={() => setStartMenuOpen(false)}
      className={`fixed inset-0 w-screen h-screen z-[9999] flex flex-col p-8 md:p-16 select-none animate-in fade-in duration-200 ${bgOverlayClasses}`}
    >
      <style>{`
        @keyframes launchpad-pop {
          0% { transform: scale(0.9) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .app-icon-stagger {
          animation: launchpad-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
      `}</style>

      {/* Centered Top Floating Search Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-auto mb-12 flex-shrink-0 animate-in slide-in-from-top-4 duration-300"
      >
        <div className="relative group">
          <span className="absolute left-4 top-3 text-sm text-zinc-500">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all shadow-xl ${searchInputClasses}`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-3 text-xs text-zinc-500 hover:text-zinc-350 font-bold transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Apps Layout Grid */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="flex-1 w-full max-w-4xl mx-auto overflow-y-auto px-4 scrollbar-none"
      >
        {filteredApps.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-8 py-4 justify-items-center">
            {filteredApps.map((app, index) => (
              <div
                key={app.id}
                onClick={() => handleLaunch(app.id)}
                style={{ animationDelay: `${index * 20}ms` }}
                className="app-icon-stagger flex flex-col items-center justify-center p-3 rounded-2xl w-24 hover:bg-black/5 active:bg-black/10 transition-all duration-150 cursor-pointer text-center group"
              >
                {/* Visual Icon Grid representation */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4.5xl mb-2.5 shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-200 ${iconCardClasses}`}>
                  <span className="filter drop-shadow group-hover:scale-105 transition-transform duration-200 leading-none">
                    {app.icon}
                  </span>
                </div>
                <span className={`text-xs font-semibold truncate w-full tracking-wide ${textTitleClasses}`}>
                  {app.title}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-zinc-500 font-mono py-24">
            No system applications matching &quot;{search}&quot; found.
          </div>
        )}
      </div>

      {/* Footer shortcut instructions */}
      <div className={`text-center text-[10px] font-bold uppercase tracking-wider mt-8 flex-shrink-0 ${footerClasses}`}>
        Press <span className={theme === 'light' ? 'text-slate-650' : 'text-zinc-500'}>ESC</span> to exit launchpad // Start typing to search instantly
      </div>
    </div>
  );
};
