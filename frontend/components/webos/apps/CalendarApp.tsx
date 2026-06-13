"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface CalendarAppProps {
  pid: string;
}

interface Event {
  id: string;
  dateStr: string; // "YYYY-MM-DD"
  text: string;
}

export default function CalendarApp({ pid: _pid }: CalendarAppProps) {
  const { addNotification } = useOS();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[] | null>(null);
  const [newEventText, setNewEventText] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  const defaultEvents: Event[] = [
    { id: "1", dateStr: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`, text: "ARESOS OS Launch Party 🎉" },
    { id: "2", dateStr: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-15`, text: "Check VFS localStorage sync" },
    {
      id: "3",
      dateStr: `${new Date().getFullYear()}-06-14`,
      text: "🎂 Ankit Birthday",
    }
  ];

  // Load from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_calendar_events");
      if (saved) {
        try {
          setEvents(JSON.parse(saved));
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

  // Calendar math logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const daysArray: (number | null)[] = [];
  // Fill initial empty grid cells
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  // Fill month days
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
    };

    setEvents((prev) => [...(prev || []), newEvent]);
    setNewEventText("");
    addNotification("Calendar Reminder", `Added task for ${monthName} ${selectedDay}: "${newEvent.text}"`, "success");
  };

  const handleDeleteEvent = (id: string) => {
    setEvents((prev) => (prev ? prev.filter((ev) => ev.id !== id) : []));
    addNotification("Calendar Reminder", "Reminder deleted.", "info");
  };

  // Get events on selected date
  const selectedDateStr = selectedDay 
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}` 
    : "";
  const selectedDayEvents = (events || []).filter((ev) => ev.dateStr === selectedDateStr);

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none">
      {/* Calendar Grid Pane */}
      <div className="flex-1 p-5 flex flex-col">
        {/* Month Header Nav */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 flex-shrink-0">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {monthName} {year}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zinc-800 rounded cursor-pointer text-xs"
            >
              ◀
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-zinc-800 rounded cursor-pointer text-xs"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-zinc-500 uppercase tracking-wider mb-2 flex-shrink-0">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid cells */}
        <div className="flex-1 grid grid-cols-7 gap-1 items-stretch justify-items-stretch">
          {daysArray.map((day, idx) => {
            const isToday =
              day === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();
            
            const isSelected = day === selectedDay;

            // Check if day has events
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const hasEvents = day && events && events.some((ev) => ev.dateStr === dateStr);

            if (day === null) {
              return <div key={`empty-${idx}`} className="bg-transparent" />;
            }

            return (
              <button
                key={`day-${day}`}
                onClick={() => setSelectedDay(day)}
                className={`rounded-lg flex flex-col justify-between p-1.5 transition-all text-xs font-semibold text-center border cursor-pointer select-none ${
                  isSelected
                    ? "bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                    : isToday
                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                    : "bg-zinc-950/20 border-zinc-850 hover:bg-zinc-800/40 text-zinc-300"
                }`}
              >
                <span>{day}</span>
                {hasEvents && (
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 self-center shadow-[0_0_4px_#d946ef]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Right Sidebar Pane */}
      <div className="w-56 bg-zinc-950/40 border-l border-zinc-800/60 p-4 flex flex-col flex-shrink-0">
        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-3">
          Reminders {selectedDay ? `(${monthName} ${selectedDay})` : ""}
        </div>

        {selectedDay ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Event list */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-thin">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-850 text-[11px] text-zinc-200 flex justify-between items-center gap-2"
                  >
                    <span className="break-all">{ev.text}</span>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-zinc-500 hover:text-red-400 p-0.5 transition cursor-pointer text-xs"
                      title="Delete event"
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-zinc-600 py-10">
                  No plans scheduled.
                </div>
              )}
            </div>

            {/* Quick add form */}
            <form onSubmit={handleAddEvent} className="space-y-2 flex-shrink-0">
              <input
                type="text"
                placeholder="New reminder..."
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-850 focus:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition"
              />
              <button
                type="submit"
                disabled={!newEventText.trim()}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none active:bg-indigo-700 text-xs font-bold text-white rounded-lg transition cursor-pointer"
              >
                + Add Reminder
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center text-xs text-zinc-600 py-16">
            Select a day cell to view or schedule events.
          </div>
        )}
      </div>
    </div>
  );
}
