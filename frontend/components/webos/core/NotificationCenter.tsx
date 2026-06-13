"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    clearNotifications,
    markNotificationAsRead,
    settings,
  } = useOS();

  const [cpuUsage, setCpuUsage] = useState(12);
  const [ramUsage, setRamUsage] = useState(44);
  const centerRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Ignore click if clicking the notification button on taskbar
      const target = e.target as HTMLElement;
      if (target.closest("button")?.title === "Notification Center" || target.textContent?.includes("🔔")) return;

      if (centerRef.current && !centerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Mock CPU & RAM usage updates to simulate a live OS environment
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
        return Math.min(100, Math.max(2, prev + delta));
      });
      setRamUsage((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1; // -1 to +1
        return Math.min(100, Math.max(20, prev + delta));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={centerRef}
      className="absolute right-3 bottom-14 w-80 h-[520px] bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col p-5 select-none animate-in slide-in-from-right-6 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
        <span className="text-sm font-bold text-zinc-100">Notification Center</span>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* OS System Resource Monitors */}
      <div className="bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl mb-4 space-y-3">
        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
          System Resources
        </div>
        
        {/* CPU Monitor */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-zinc-300">
            <span>CPU Usage</span>
            <span className="font-mono text-zinc-500">{cpuUsage}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${cpuUsage}%` }}
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* RAM Monitor */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-zinc-300">
            <span>RAM Usage</span>
            <span className="font-mono text-zinc-500">{ramUsage}% (3.5 GB)</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${ramUsage}%` }}
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Notifications Container */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">
          Alerts
        </div>

        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const dateStr = new Date(notif.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Set accent colors based on notification type
            const typeColors = {
              info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
              success: "bg-green-500/10 border-green-500/20 text-green-400",
              warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
              error: "bg-red-500/10 border-red-500/20 text-red-400",
            };

            return (
              <div
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-opacity cursor-pointer ${
                  typeColors[notif.type]
                } ${notif.read ? "opacity-55 hover:opacity-85" : "opacity-100"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate text-zinc-100">
                    {notif.title}
                  </span>
                  <span className="text-[9px] text-zinc-500 font-medium">
                    {dateStr}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            );
          })
        ) : (
          <div className="text-center text-xs text-zinc-600 py-16">
            No active system notifications.
          </div>
        )}
      </div>
    </div>
  );
};
