"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { REGISTERED_APPS } from "@/config/webos/apps.config";

export const StartMenu: React.FC = () => {
  const { isStartMenuOpen, setStartMenuOpen, launchApp, currentUser } = useOS();
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Ignore click if clicking the start button itself
      const target = e.target as HTMLElement;
      if (target.closest("button")?.textContent?.includes("ARESOS")) return;

      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStartMenuOpen(false);
      }
    };

    if (isStartMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isStartMenuOpen, setStartMenuOpen]);

  if (!isStartMenuOpen) return null;

  const filteredApps = REGISTERED_APPS.filter((app) =>
    app.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      ref={menuRef}
      className="absolute bottom-14 left-3 w-[420px] h-[500px] bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl flex z-[9999] overflow-hidden select-none animate-in slide-in-from-bottom-6 duration-200"
    >
      {/* Sidebar: Profile & Quick Controls */}
      <div className="w-16 bg-zinc-900/60 border-r border-zinc-800/40 flex flex-col justify-between items-center py-5">
        <div className="flex flex-col items-center gap-6">
          {/* Avatar Icon */}
          <div className="w-9 h-9 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center font-bold text-white shadow-md">
            {currentUser.username.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Quick Power Actions */}
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <button
            onClick={() => {
              if (confirm("Restart ARESOS? All unsaved data will be cleared.")) {
                window.location.reload();
              }
            }}
            className="hover:text-indigo-400 transition cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800/40"
            title="Restart System"
          >
            🔄
          </button>
          <button
            onClick={() => {
              if (confirm("Shut down WebOS?")) {
                document.body.innerHTML = `
                  <div style="background:#000;color:#333;width:100vw;height:100vh;display:flex;align-items:center;justify-center:center;font-family:sans-serif;font-weight:bold;font-size:24px;">
                    It is now safe to close your browser tab.
                  </div>
                `;
              }
            }}
            className="hover:text-red-400 transition cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800/40"
            title="Shut Down"
          >
            🔌
          </button>
        </div>
      </div>

      {/* Main Apps Layout Panel */}
      <div className="flex-1 flex flex-col p-5">
        {/* Search Input */}
        <div className="relative mb-5">
          <input
            autoFocus
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
          />
        </div>

        {/* Apps Header */}
        <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-2">
          Registered Applications
        </div>

        {/* List of Apps */}
        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <button
                key={app.id}
                onClick={() => launchApp(app.id)}
                className="w-full text-left flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition duration-150 cursor-pointer select-none"
              >
                <span className="text-2xl filter drop-shadow">{app.icon}</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-100">
                    {app.title}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    System Application
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-xs text-zinc-600 py-10">
              No matching applications found.
            </div>
          )}
        </div>

        {/* System Info footer */}
        <div className="border-t border-zinc-900 pt-3 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Username: {currentUser.username}</span>
          <span>Build v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
