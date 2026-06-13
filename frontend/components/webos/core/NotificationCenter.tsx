"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MiniGoal {
  id: string;
  text: string;
  completed: boolean;
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
    updateSettings,
    addNotification,
  } = useOS();

  const centerRef = useRef<HTMLDivElement>(null);

  // Focus Timer Widget State
  const [focusSeconds, setFocusSeconds] = useState(1500); // 25 mins
  const [focusActive, setFocusActive] = useState(false);
  
  // Goals Widget State
  const [goals, setGoals] = useState<MiniGoal[]>([
    { id: "g1", text: "Design clean layouts", completed: true },
    { id: "g2", text: "Test VFS system logs", completed: false },
  ]);
  const [newGoalText, setNewGoalText] = useState("");

  // Close when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Ignore click if clicking the notification button on Dock
      if (
        target.closest("button")?.title === "Notification Center" || 
        target.textContent?.includes("🔔")
      ) return;

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

  // Pomodoro Focus Timer countdown loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (focusActive && focusSeconds > 0) {
      timer = setInterval(() => {
        setFocusSeconds((prev) => {
          if (prev <= 1) {
            setFocusActive(false);
            addNotification("Focus Session", "Focus Session Finished", "success");
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [focusActive, focusSeconds, addNotification]);

  if (!isOpen) return null;

  // Focus timer display formatter
  const formatFocusTimer = () => {
    const mins = Math.floor(focusSeconds / 60);
    const secs = focusSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const nGoal: MiniGoal = {
      id: `g-${Date.now()}`,
      text: newGoalText.trim(),
      completed: false,
    };
    setGoals((prev) => [...prev, nGoal]);
    setNewGoalText("");
  };

  const handleToggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const nextVal = !g.completed;
          if (nextVal) {
            addNotification("Goal Updated", `Goal Completed: "${g.text}"`, "success");
          }
          return { ...g, completed: nextVal };
        }
        return g;
      })
    );
  };

  return (
    <div
      ref={centerRef}
      className="fixed top-7 right-0 bottom-0 w-80 bg-zinc-950/65 border-l border-zinc-800/40 backdrop-blur-2xl shadow-2xl z-[999] overflow-hidden flex flex-col p-4 select-none animate-in slide-in-from-right-6 duration-300"
    >
      {/* Sidebar Scrollable Widgets Panels */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
        
        {/* Widget 1: System Control Center sliders */}
        <div className="bg-zinc-900/45 border border-zinc-850 p-3.5 rounded-xl space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">
            Control Center
          </div>

          {/* Volume Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-zinc-300">
              <span>System Volume</span>
              <span className="font-mono text-zinc-500">{settings.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
            />
          </div>

          {/* Brightness Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium text-zinc-300">
              <span>Display Brightness</span>
              <span className="font-mono text-zinc-500">{settings.brightness}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.brightness}
              onChange={(e) => updateSettings({ brightness: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
            />
          </div>
        </div>

        {/* Widget 2: Focus Timer (Pomodoro Widget) */}
        <div className="bg-zinc-900/45 border border-zinc-850 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Focus Session
            </span>
            <span className="text-xl font-extrabold text-white tracking-tight font-mono mt-1">
              {formatFocusTimer()}
            </span>
          </div>
          <button
            onClick={() => setFocusActive(!focusActive)}
            className={`px-3 py-1.5 rounded-lg text-xxs font-bold tracking-wide uppercase transition cursor-pointer ${
              focusActive
                ? "bg-red-500/20 border border-red-500/30 text-red-200"
                : "bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/40"
            }`}
          >
            {focusActive ? "Pause" : "Start"}
          </button>
        </div>

        {/* Widget 3: Goals Checklist Planner */}
        <div className="bg-zinc-900/45 border border-zinc-850 p-3.5 rounded-xl space-y-2.5">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
            Active Targets
          </span>
          
          <div className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin">
            {goals.map((g) => (
              <div
                key={g.id}
                onClick={() => handleToggleGoal(g.id)}
                className="flex items-center gap-2 cursor-pointer group text-[11px]"
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition ${
                  g.completed ? "bg-indigo-600 border-indigo-500 text-white" : "border-zinc-700"
                }`}>
                  {g.completed && <span className="text-[7px]">✓</span>}
                </div>
                <span className={`truncate text-zinc-300 group-hover:text-white ${g.completed ? "line-through text-zinc-600" : ""}`}>
                  {g.text}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddGoal} className="flex gap-1.5 pt-1">
            <input
              type="text"
              placeholder="Target..."
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none transition"
            />
            <button
              type="submit"
              disabled={!newGoalText.trim()}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-[10px] font-bold text-white rounded-lg transition cursor-pointer"
            >
              +
            </button>
          </form>
        </div>

        {/* Alerts / Notifications pane */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Alerts Drawer
            </span>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-[9px] text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const dateStr = new Date(notif.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`p-3 rounded-xl border border-zinc-850/50 bg-zinc-950/40 flex items-start gap-2.5 cursor-pointer hover:bg-zinc-950/60 transition ${
                      notif.read ? "opacity-55" : "opacity-100"
                    }`}
                  >
                    <span className="text-emerald-400 font-bold select-none text-xs flex-shrink-0">✓</span>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white truncate pr-1">
                          {notif.title}
                        </span>
                        <span className="text-[8px] text-zinc-600 font-mono flex-shrink-0">
                          {dateStr}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Fallback mock alerts matching the user's template description */
              <div className="space-y-2">
                {[
                  { title: "Goal Completed", desc: "Decryption synchronization complete." },
                  { title: "Focus Session Finished", desc: "Completed 25m Pomodoro sprint." },
                  { title: "Note Saved", desc: "Written documentation saved onto VFS." },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-850/50 bg-zinc-950/40 flex items-start gap-2.5 hover:bg-zinc-950/60 transition"
                  >
                    <span className="text-emerald-400 font-bold select-none text-xs flex-shrink-0">✓</span>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-white truncate pr-1">
                        {item.title}
                      </span>
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Slide-out close drawer trigger */}
      <button
        onClick={onClose}
        className="w-full py-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider rounded-xl transition mt-4 cursor-pointer"
      >
        Close Drawer
      </button>
    </div>
  );
};
