"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface Event {
  id: string;
  dateStr: string; // "YYYY-MM-DD"
  text: string;
  time?: string; // "HH:MM"
  type: "work" | "personal" | "deadline" | "holiday";
  description?: string;
}

interface CalendarAppProps {
  pid: string;
}

export default function CalendarApp({ pid: _pid }: CalendarAppProps) {
  const { addNotification, settings } = useOS();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[] | null>(null);

  // View Mode: Month Grid or Agenda Timeline list
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");

  // Form states
  const [newEventText, setNewEventText] = useState("");
  const [newEventTime, setNewEventTime] = useState("12:00");
  const [newEventType, setNewEventType] = useState<Event["type"]>("work");
  const [newEventDesc, setNewEventDesc] = useState("");

  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const defaultEvents: Event[] = [
    {
      id: "1",
      dateStr: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
      text: "ARESOS OS Launch Party 🎉",
      time: "18:00",
      type: "holiday",
      description: "Celebrate the first stable release of ARESOS WebOS with the team!",
    },
    {
      id: "2",
      dateStr: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-15`,
      text: "Check VFS localStorage sync",
      time: "10:00",
      type: "work",
      description: "Run automated benchmarks on filesystem nodes write operations.",
    },
    {
      id: "3",
      dateStr: `${new Date().getFullYear()}-06-14`,
      text: "Ankit Birthday 🎂",
      time: "00:00",
      type: "personal",
      description: "Celebrate birthday milestone!",
    },
    {
      id: "4",
      dateStr: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate() + 1).padStart(2, "0")}`,
      text: "Submit frontend refactoring commits",
      time: "23:59",
      type: "deadline",
      description: "Push changes to origin main and verify hot reloading compiles cleanly.",
    }
  ];

  const migrateEvents = (loadedEvents: any[]): Event[] => {
    return loadedEvents.map((ev) => ({
      id: ev.id || `ev-${Date.now()}-${Math.random()}`,
      dateStr: ev.dateStr || "",
      text: ev.text || "",
      time: ev.time || "12:00",
      type: ev.type || "work",
      description: ev.description || "",
    }));
  };

  // Load from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_calendar_events");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEvents(migrateEvents(parsed));
          } else {
            setEvents(defaultEvents);
          }
        } catch (e) {
          console.error("Failed to parse calendar events", e);
          setEvents(defaultEvents);
        }
      } else {
        setEvents(defaultEvents);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (events !== null && typeof window !== "undefined") {
      localStorage.setItem("aresos_calendar_events", JSON.stringify(events));
    }
  }, [events]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !newEventText.trim()) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    const newEvent: Event = {
      id: `ev-${Date.now()}`,
      dateStr,
      text: newEventText.trim(),
      time: newEventTime,
      type: newEventType,
      description: newEventDesc.trim() || undefined,
    };

    setEvents((prev) => [...(prev || []), newEvent]);
    setNewEventText("");
    setNewEventDesc("");
    setNewEventTime("12:00");
    addNotification("Calendar Reminder", `Scheduled event on ${monthName} ${selectedDay}: "${newEvent.text}"`, "success");
  };

  const handleDeleteEvent = (id: string, text: string) => {
    setEvents((prev) => (prev ? prev.filter((ev) => ev.id !== id) : []));
    addNotification("Calendar Reminder", `Removed event: "${text}"`, "info");
  };

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : "";
  const selectedDayEvents = (events || []).filter((ev) => ev.dateStr === selectedDateStr);

  // Sorting events by time
  selectedDayEvents.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  // Upcoming monthly statistics
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = (events || []).filter((ev) => ev.dateStr.startsWith(currentMonthPrefix));
  const deadlineCount = monthEvents.filter((ev) => ev.type === "deadline").length;
  const workCount = monthEvents.filter((ev) => ev.type === "work").length;

  const eventBadgeColors = {
    work: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    personal: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    holiday: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    deadline: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  };

  const eventDotColors = {
    work: "bg-blue-400 shadow-[0_0_4px_#3b82f6]",
    personal: "bg-purple-400 shadow-[0_0_4px_#a855f7]",
    holiday: "bg-amber-400 shadow-[0_0_4px_#f59e0b]",
    deadline: "bg-rose-400 shadow-[0_0_4px_#f43f5e]",
  };

  const formatSelectedDayLabel = () => {
    if (!selectedDay) return "";
    try {
      const d = new Date(year, month, selectedDay);
      return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    } catch {
      return `${monthName} ${selectedDay}`;
    }
  };

  // Groups agenda items chronologically
  const getAgendaItems = () => {
    const sorted = [...(events || [])].sort((a, b) => {
      const dateCompare = a.dateStr.localeCompare(b.dateStr);
      if (dateCompare !== 0) return dateCompare;
      return (a.time || "").localeCompare(b.time || "");
    });
    return sorted;
  };

  const agendaEvents = getAgendaItems();

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none font-sans overflow-hidden">
      {/* Left panel: Calendar & View Mode */}
      <div className="flex-1 p-4 flex flex-col min-w-0">
        
        {/* Month Navigation & Mode Switch Toolbar */}
        <header className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {monthName} {year}
            </h3>
            
            {/* Monthly stats info badges */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-500 border border-zinc-850">
                {monthEvents.length} Events this month
              </span>
              {deadlineCount > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-950/20 text-rose-400 border border-rose-900/20 animate-pulse">
                  {deadlineCount} Deadlines
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher */}
            <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-850">
              <button
                onClick={() => setViewMode("month")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${
                  viewMode === "month" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition cursor-pointer ${
                  viewMode === "agenda" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Agenda
              </button>
            </div>

            {/* Prev/Next buttons */}
            {viewMode === "month" && (
              <div className="flex bg-zinc-950 rounded-lg border border-zinc-850 overflow-hidden">
                <button
                  onClick={handlePrevMonth}
                  className="px-2.5 py-1 hover:bg-zinc-800 transition cursor-pointer text-xs font-bold text-zinc-400 hover:text-white"
                >
                  ◀
                </button>
                <button
                  onClick={handleNextMonth}
                  className="px-2.5 py-1 hover:bg-zinc-800 transition cursor-pointer text-xs font-bold text-zinc-400 hover:text-white border-l border-zinc-850"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic content rendering based on viewMode */}
        <div className="flex-1 min-h-0 flex flex-col">
          {viewMode === "month" ? (
            <div className="flex-1 flex flex-col">
              {/* Day of Week Labels */}
              <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-extrabold text-zinc-500 uppercase tracking-wider mb-1.5 flex-shrink-0">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day Cells Grid */}
              <div className="flex-1 grid grid-cols-7 gap-1 items-stretch justify-items-stretch min-h-0">
                {daysArray.map((day, idx) => {
                  const isToday =
                    day === new Date().getDate() &&
                    month === new Date().getMonth() &&
                    year === new Date().getFullYear();

                  const isSelected = day === selectedDay;
                  const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";

                  // Gather unique event types on this day for colored dots
                  const dayEvents = (events || []).filter((ev) => ev.dateStr === dateStr);
                  const hasEvents = dayEvents.length > 0;
                  const uniqueTypes = Array.from(new Set(dayEvents.map((ev) => ev.type)));

                  if (day === null) {
                    return <div key={`empty-${idx}`} className="bg-transparent" />;
                  }

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => setSelectedDay(day)}
                      className={`rounded-xl flex flex-col justify-between p-1.5 border transition-all text-xs font-bold cursor-pointer select-none text-left ${
                        isSelected
                          ? "bg-indigo-600/35 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : isToday
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                          : "bg-zinc-950/45 border-zinc-850/80 hover:bg-zinc-800/40 text-zinc-300 hover:text-white"
                      }`}
                    >
                      <span>{day}</span>
                      
                      {/* Interactive small colored dot trackers */}
                      {hasEvents && (
                        <div className="flex gap-1.5 justify-center items-center py-0.5 mt-auto">
                          {uniqueTypes.map((type) => (
                            <span 
                              key={type} 
                              className={`w-1.5 h-1.5 rounded-full ${eventDotColors[type]}`} 
                              title={`${type} event scheduled`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda Timeline Scrollview */
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 scrollbar-thin">
              {agendaEvents.length > 0 ? (
                agendaEvents.map((ev) => {
                  const evDate = new Date(ev.dateStr);
                  const dateFormatted = evDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        const d = new Date(ev.dateStr);
                        // Shift view context to this day
                        setCurrentDate(d);
                        setSelectedDay(d.getDate());
                        setViewMode("month");
                      }}
                      className="p-3 bg-zinc-950/45 border border-zinc-850/80 hover:border-zinc-800 rounded-xl flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-950/60 transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Event indicator block */}
                        <div className={`w-2 h-8 rounded-full flex-shrink-0 ${ev.type === 'work' ? 'bg-blue-500' : ev.type === 'personal' ? 'bg-purple-500' : ev.type === 'deadline' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-white truncate">{ev.text}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            📅 {dateFormatted} {ev.time && `at ${ev.time}`}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${eventBadgeColors[ev.type]}`}>
                        {ev.type}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-zinc-650 py-24 font-mono">
                  AGENDA TELEMETRY EMPTY // NO SCHEDULED REMINDERS
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Events Schedule & creation Form */}
      <div className="w-64 bg-zinc-950/45 border-l border-zinc-800/60 p-4 flex flex-col flex-shrink-0 min-h-0">
        
        {/* Dynamic header summary */}
        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2 flex-shrink-0 border-b border-zinc-850 pb-1.5">
          Schedule {selectedDay ? `(${formatSelectedDayLabel()})` : ""}
        </div>

        {selectedDay ? (
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* Chronological reminders scrollview */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-3.5 pr-0.5 scrollbar-thin min-h-0">
              {events === null ? (
                <div className="text-center text-xs text-zinc-650 py-16 font-mono animate-pulse">
                  SYNCING CHRONO LOGS...
                </div>
              ) : selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-850 flex flex-col gap-1.5 shadow-sm text-zinc-200"
                  >
                    <div className="flex justify-between items-start gap-1.5">
                      <span className="text-xs font-bold leading-tight break-all text-white">{ev.text}</span>
                      <button
                        onClick={() => handleDeleteEvent(ev.id, ev.text)}
                        className="text-zinc-500 hover:text-rose-400 p-0.5 transition cursor-pointer text-xs flex-shrink-0"
                        title="Delete event"
                      >
                        ✕
                      </button>
                    </div>

                    {ev.description && (
                      <p className="text-[10px] text-zinc-400 leading-normal break-all">{ev.description}</p>
                    )}

                    <div className="flex justify-between items-center pt-1 mt-0.5 border-t border-zinc-850/60">
                      <span className="text-[9px] text-zinc-500 font-mono font-bold">
                        🕒 {ev.time || "All day"}
                      </span>
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${eventBadgeColors[ev.type]}`}>
                        {ev.type}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-zinc-650 py-16">
                  No plans scheduled.
                </div>
              )}
            </div>

            {/* Event creator form */}
            <form onSubmit={handleAddEvent} className="space-y-2.5 border-t border-zinc-850/80 pt-3 flex-shrink-0">
              
              {/* Event Title */}
              <div className="space-y-0.5">
                <input
                  type="text"
                  placeholder="New reminder title..."
                  value={newEventText}
                  required
                  onChange={(e) => setNewEventText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition"
                />
              </div>

              {/* Time and Category Row */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Time picker */}
                <div className="space-y-0.5">
                  <label className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">Time</label>
                  <input
                    type="time"
                    value={newEventTime}
                    required
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-lg p-1 text-[10px] font-semibold outline-none cursor-pointer hover:border-zinc-700 transition"
                  />
                </div>

                {/* Event Type selector */}
                <div className="space-y-0.5">
                  <label className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-lg p-1 text-[10px] font-semibold outline-none cursor-pointer hover:border-zinc-700 transition"
                  >
                    <option value="work">💼 Work</option>
                    <option value="personal">🏠 Personal</option>
                    <option value="holiday">🎉 Holiday</option>
                    <option value="deadline">🚨 Deadline</option>
                  </select>
                </div>
              </div>

              {/* Event description */}
              <div className="space-y-0.5">
                <textarea
                  placeholder="Description notes (optional)..."
                  value={newEventDesc}
                  rows={2}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none resize-none transition scrollbar-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newEventText.trim()}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none active:bg-indigo-700 text-xs font-bold text-white rounded-lg transition cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                + Add Reminder
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center text-xs text-zinc-650 py-16">
            Select a day cell to view or schedule events.
          </div>
        )}
      </div>
    </div>
  );
}
