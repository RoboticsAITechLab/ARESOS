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
  const [goals, setGoals] = useState<MiniGoal[] | null>(null);
  const [newGoalText, setNewGoalText] = useState("");

  const defaultGoals: MiniGoal[] = [
    { id: "g1", text: "Design clean layouts", completed: true },
    { id: "g2", text: "Test VFS system logs", completed: false },
  ];

  // Load goals from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_notification_goals");
      if (saved) {
        try {
          setGoals(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse goals checklist", e);
          setGoals(defaultGoals);
        }
      } else {
        setGoals(defaultGoals);
      }
    }
  }, []);

  // Save goals to localStorage on changes
  useEffect(() => {
    if (goals !== null && typeof window !== "undefined") {
      localStorage.setItem("aresos_notification_goals", JSON.stringify(goals));
    }
  }, [goals]);

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
        setFocusSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [focusActive, focusSeconds]);

  // Handle Focus Timer completion side effects
  useEffect(() => {
    if (focusSeconds <= 0) {
      const timer = setTimeout(() => {
        setFocusActive(false);
        setFocusSeconds(1500);
        addNotification("Focus Session", "Focus Session Finished", "success");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [focusSeconds, addNotification]);

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
    setGoals((prev) => [...(prev || []), nGoal]);
    setNewGoalText("");
  };

  const handleToggleGoal = (id: string) => {
    const targetGoal = (goals || []).find((g) => g.id === id);
    if (targetGoal) {
      const nextVal = !targetGoal.completed;
      setGoals((prev) =>
        (prev || []).map((g) => (g.id === id ? { ...g, completed: nextVal } : g))
      );
      if (nextVal) {
        addNotification("Goal Updated", `Goal Completed: "${targetGoal.text}"`, "success");
      }
    }
  };

  const theme = settings?.theme || "dark";
  
  let outerThemeClasses = "bg-zinc-950/65 border-zinc-800/40 text-zinc-300";
  let widgetThemeClasses = "bg-zinc-900/45 border-zinc-850";
  let labelThemeClasses = "text-zinc-500";
  let valueThemeClasses = "text-white";
  let inputThemeClasses = "bg-zinc-950 border-zinc-850 text-zinc-200 placeholder-zinc-500 focus:border-zinc-800";
  let btnThemeClasses = "bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/40";
  let itemThemeClasses = "bg-zinc-950/40 border border-zinc-850/50 hover:bg-zinc-950/60 text-zinc-400";
  let titleThemeClasses = "text-white";

  if (theme === "light") {
    outerThemeClasses = "bg-white/90 border-slate-200/80 text-slate-800";
    widgetThemeClasses = "bg-slate-100/70 border-slate-200";
    labelThemeClasses = "text-slate-500 font-semibold";
    valueThemeClasses = "text-slate-900";
    inputThemeClasses = "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-400";
    btnThemeClasses = "bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300";
    itemThemeClasses = "bg-slate-50 border border-slate-200/60 hover:bg-slate-100/80 text-slate-650";
    titleThemeClasses = "text-slate-800";
  } else if (theme === "midnight") {
    outerThemeClasses = "bg-slate-950/75 border-indigo-950/40 text-indigo-200";
    widgetThemeClasses = "bg-indigo-950/30 border-indigo-900/30";
    labelThemeClasses = "text-indigo-400/80";
    valueThemeClasses = "text-white";
    inputThemeClasses = "bg-indigo-950 border border-indigo-900 text-indigo-100 placeholder-indigo-500 focus:border-indigo-850";
    btnThemeClasses = "bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/40";
    itemThemeClasses = "bg-indigo-950/40 border border-indigo-900/20 hover:bg-indigo-900/10 text-indigo-200";
    titleThemeClasses = "text-white";
  } else if (theme === "aurora") {
    outerThemeClasses = "bg-zinc-950/65 border-teal-950/40 text-teal-100";
    widgetThemeClasses = "bg-teal-950/30 border-teal-900/30";
    labelThemeClasses = "text-teal-500/80";
    valueThemeClasses = "text-white";
    inputThemeClasses = "bg-teal-950 border border-teal-900 text-teal-100 placeholder-teal-500 focus:border-teal-850";
    btnThemeClasses = "bg-teal-600/30 border border-teal-500/30 text-teal-200 hover:bg-teal-600/40";
    itemThemeClasses = "bg-teal-950/40 border border-teal-900/20 hover:bg-teal-900/10 text-teal-200";
    titleThemeClasses = "text-white";
  }

  return (
    <div
      ref={centerRef}
      className={`fixed top-7 right-0 bottom-0 w-80 backdrop-blur-2xl shadow-2xl z-[999] overflow-hidden flex flex-col p-4 select-none animate-in slide-in-from-right-6 duration-300 border-l ${outerThemeClasses}`}
    >
      {/* Sidebar Scrollable Widgets Panels */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
        
        {/* Widget 1: System Control Center sliders */}
        <div className={`p-3.5 rounded-xl space-y-3 border ${widgetThemeClasses}`}>
          <div className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${labelThemeClasses}`}>
            Control Center
          </div>

          {/* Volume Slider */}
          <div className="space-y-1">
            <div className={`flex justify-between text-[11px] font-medium ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span>System Volume</span>
              <span className={`font-mono ${labelThemeClasses}`}>{settings.volume}%</span>
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
            <div className={`flex justify-between text-[11px] font-medium ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
              <span>Display Brightness</span>
              <span className={`font-mono ${labelThemeClasses}`}>{settings.brightness}%</span>
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
        <div className={`p-3.5 rounded-xl flex items-center justify-between border ${widgetThemeClasses}`}>
          <div className="flex flex-col min-w-0">
            <span className={`text-[10px] uppercase font-bold tracking-wider ${labelThemeClasses}`}>
              Focus Session
            </span>
            <span className={`text-xl font-extrabold tracking-tight font-mono mt-1 ${valueThemeClasses}`}>
              {formatFocusTimer()}
            </span>
          </div>
          <button
            onClick={() => setFocusActive(!focusActive)}
            className={`px-3 py-1.5 rounded-lg text-xxs font-bold tracking-wide uppercase transition cursor-pointer ${
              focusActive
                ? "bg-red-500/20 border border-red-500/30 text-red-200"
                : btnThemeClasses
            }`}
          >
            {focusActive ? "Pause" : "Start"}
          </button>
        </div>

        {/* Widget 3: Goals Checklist Planner */}
        <div className={`p-3.5 rounded-xl space-y-2.5 border ${widgetThemeClasses}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${labelThemeClasses}`}>
            Active Targets
          </span>
          
          <div className="space-y-1.5 max-h-28 overflow-y-auto scrollbar-thin">
            {(goals || []).map((g) => (
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
                <span className={`truncate group-hover:text-white ${g.completed ? "line-through text-zinc-650" : (theme === 'light' ? 'text-slate-700' : 'text-zinc-305')}`}>
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
              className={`flex-1 rounded-lg px-2 py-1 text-[10px] outline-none transition ${inputThemeClasses}`}
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
          <div className={`flex items-center justify-between border-b pb-1.5 ${theme === 'light' ? 'border-slate-200' : 'border-zinc-900'}`}>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${labelThemeClasses}`}>
              Alerts Drawer
            </span>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className={`text-[9px] font-semibold cursor-pointer ${labelThemeClasses} hover:text-white`}
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
                    className={`p-3 rounded-xl flex items-start gap-2.5 cursor-pointer transition ${
                      notif.read ? "opacity-55" : "opacity-100"
                    } ${itemThemeClasses}`}
                  >
                    <span className="text-emerald-400 font-bold select-none text-xs flex-shrink-0">✓</span>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold truncate pr-1 ${titleThemeClasses}`}>
                          {notif.title}
                        </span>
                        <span className={`text-[8px] font-mono flex-shrink-0 ${labelThemeClasses}`}>
                          {dateStr}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-normal ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
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
                    className={`p-3 rounded-xl flex items-start gap-2.5 transition ${itemThemeClasses}`}
                  >
                    <span className="text-emerald-400 font-bold select-none text-xs flex-shrink-0">✓</span>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className={`text-xs font-bold truncate pr-1 ${titleThemeClasses}`}>
                        {item.title}
                      </span>
                      <p className={`text-[10px] leading-normal ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>
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
        className={`w-full py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition mt-4 cursor-pointer ${
          theme === "light"
            ? "bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-350"
            : "bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400"
        }`}
      >
        Close Drawer
      </button>
    </div>
  );
};
