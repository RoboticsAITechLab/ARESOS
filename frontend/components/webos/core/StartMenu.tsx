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
      setTimeout(() => {
        setSearch("");
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

  const bgOverlayClasses = theme === "light" ? "bg-white/80 backdrop-blur-3xl" : "bg-[#050607]/80 backdrop-blur-3xl";
  const searchInputClasses =
    theme === "light"
      ? "border border-slate-300 bg-slate-100 text-slate-800 placeholder-slate-400 focus:border-slate-400"
      : "border border-[rgba(214,58,58,0.3)] bg-black/35 text-[#f9e1e1] placeholder-[#b78b8b] focus:border-[rgba(214,58,58,0.6)]";
  const iconCardClasses =
    theme === "light"
      ? "border border-slate-200 bg-slate-100/60 group-hover:bg-slate-200/50 group-hover:border-slate-300"
      : "border border-[rgba(214,58,58,0.18)] bg-black/20 group-hover:bg-[rgba(214,58,58,0.1)] group-hover:border-[rgba(214,58,58,0.38)]";
  const textTitleClasses = theme === "light" ? "text-slate-750 group-hover:text-slate-900" : "text-[#f2d0d0] group-hover:text-white";
  const footerClasses = theme === "light" ? "text-slate-500" : "text-[#b68a8a]";

  return (
    <div
      onClick={() => setStartMenuOpen(false)}
      className={`fixed inset-0 z-[9999] flex h-screen w-screen flex-col select-none p-8 md:p-16 animate-in fade-in duration-200 ${bgOverlayClasses}`}
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
        className="mx-auto mb-12 w-full max-w-sm flex-shrink-0 animate-in slide-in-from-top-4 duration-300"
      >
        <div className="relative group">
          <span className="absolute left-4 top-3 text-sm text-[#b78b8b]">SEARCH</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search mission modules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-none py-2.5 pl-20 pr-4 text-xs font-semibold uppercase tracking-[0.22em] outline-none transition-all shadow-xl ${searchInputClasses}`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-3 text-xs font-bold text-[#b78b8b] transition hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Apps Layout Grid */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 scrollbar-none"
      >
        {filteredApps.length > 0 ? (
          <div className="grid grid-cols-3 justify-items-center gap-8 py-4 sm:grid-cols-4 md:grid-cols-5">
            {filteredApps.map((app, index) => (
              <div
                key={app.id}
                onClick={() => handleLaunch(app.id)}
                style={{ animationDelay: `${index * 20}ms` }}
                className="app-icon-stagger group flex w-28 cursor-pointer flex-col items-center justify-center border border-[rgba(214,58,58,0.14)] bg-black/20 p-3 text-center transition-all duration-150 hover:border-[rgba(214,58,58,0.38)] hover:bg-[rgba(214,58,58,0.1)]"
              >
                <div className={`mb-2.5 flex h-16 w-16 items-center justify-center rounded-none text-[11px] font-bold tracking-[0.28em] transition-all duration-200 ${iconCardClasses}`}>
                  <span className="leading-none transition-transform duration-200 group-hover:scale-105">
                    {app.icon}
                  </span>
                </div>
                <span className={`w-full truncate text-xs font-semibold tracking-[0.2em] ${textTitleClasses}`}>
                  {app.title}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-sm font-mono text-[#b68a8a]">
            No system applications matching &quot;{search}&quot; found.
          </div>
        )}
      </div>

      {/* Footer shortcut instructions */}
      <div className={`mt-8 flex-shrink-0 text-center text-[10px] font-bold uppercase tracking-wider ${footerClasses}`}>
        Press <span className={theme === "light" ? "text-slate-650" : "text-[#d3a1a1]"}>ESC</span> to exit launcher // Start typing to search instantly
      </div>
    </div>
  );
};
