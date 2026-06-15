"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category: "work" | "personal" | "ideas" | "urgent";
  dueDate?: string;
  subtasks: SubTask[];
  createdAt: number;
}

interface TodoAppProps {
  pid: string;
}

export default function TodoApp({ pid: _pid }: TodoAppProps) {
  const { addNotification, settings } = useOS();
  const [todos, setTodos] = useState<TodoItem[] | null>(null);

  // Form Fields
  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState<"work" | "personal" | "ideas" | "urgent">("work");
  const [dueDate, setDueDate] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // Search, Filter, Sort States
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "high">("all");
  const [sortBy, setSortBy] = useState<"created" | "due" | "priority">("created");

  // Subtasks toggles & inputs
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [subtaskInputText, setSubtaskInputText] = useState<Record<string, string>>({});

  const defaultTodos: TodoItem[] = [
    {
      id: "1",
      text: "Create high-fidelity landing page layouts",
      completed: true,
      priority: "high",
      category: "work",
      dueDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
      subtasks: [
        { id: "1-1", text: "Draft wireframes in Figma", completed: true },
        { id: "1-2", text: "Select cyberpunk color scheme", completed: true },
      ],
      createdAt: Date.now() - 172800000,
    },
    {
      id: "2",
      text: "Setup local workspace Git integration",
      completed: true,
      priority: "medium",
      category: "work",
      dueDate: new Date().toISOString().split("T")[0],
      subtasks: [],
      createdAt: Date.now() - 86400000,
    },
    {
      id: "3",
      text: "Customize glassmorphic desktop shortcuts",
      completed: false,
      priority: "low",
      category: "ideas",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      subtasks: [
        { id: "3-1", text: "Create customized dock icons", completed: false },
        { id: "3-2", text: "Test theme switching compatibility", completed: false },
      ],
      createdAt: Date.now() - 43200000,
    },
    {
      id: "4",
      text: "Configure interactive terminal CLI features",
      completed: false,
      priority: "high",
      category: "urgent",
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      subtasks: [
        { id: "4-1", text: "Implement autocomplete suggestions", completed: true },
        { id: "4-2", text: "Add cmatrix digital rain visualizer", completed: false },
        { id: "4-3", text: "Create interactive process monitor (top)", completed: false },
      ],
      createdAt: Date.now(),
    },
  ];

  const migrateTodos = (loadedTodos: any[]): TodoItem[] => {
    return loadedTodos.map((todo) => ({
      id: todo.id || `todo-${Date.now()}-${Math.random()}`,
      text: todo.text || "",
      completed: !!todo.completed,
      priority: todo.priority || "medium",
      category: todo.category || "work",
      dueDate: todo.dueDate || "",
      subtasks: todo.subtasks || [],
      createdAt: todo.createdAt || Date.now(),
    }));
  };

  // Load from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_todo_items");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setTodos(migrateTodos(parsed));
          } else {
            setTodos(defaultTodos);
          }
        } catch (e) {
          console.error("Failed to parse todo items", e);
          setTodos(defaultTodos);
        }
      } else {
        setTodos(defaultTodos);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (todos !== null && typeof window !== "undefined") {
      localStorage.setItem("aresos_todo_items", JSON.stringify(todos));
    }
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text,
      completed: false,
      priority,
      category,
      dueDate: dueDate || undefined,
      subtasks: [],
      createdAt: Date.now(),
    };

    setTodos((prev) => [...(prev || []), newTodo]);
    setInputText("");
    setDueDate("");
    setShowOptions(false);
    addNotification("Task Tracker", `Added task: "${text}"`, "success");
  };

  const toggleTodo = (id: string) => {
    let completedTodoText = "";

    setTodos((prev) => {
      if (!prev) return [];
      return prev.map((todo) => {
        if (todo.id === id) {
          const nextCompleted = !todo.completed;
          if (nextCompleted) {
            completedTodoText = todo.text;
          }
          return { ...todo, completed: nextCompleted };
        }
        return todo;
      });
    });

    if (completedTodoText) {
      addNotification("Task Completed", `"${completedTodoText}" is done!`, "success");
    }
  };

  const deleteTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos((prev) => (prev || []).filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => (prev || []).filter((todo) => !todo.completed));
    addNotification("Task Tracker", "Cleared completed tasks.", "info");
  };

  const handleAddSubtask = (todoId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = subtaskInputText[todoId]?.trim();
    if (!text) return;

    setTodos((prev) =>
      (prev || []).map((todo) => {
        if (todo.id === todoId) {
          const newSub: SubTask = {
            id: `sub-${Date.now()}-${Math.random()}`,
            text,
            completed: false,
          };
          return {
            ...todo,
            subtasks: [...todo.subtasks, newSub],
          };
        }
        return todo;
      })
    );

    setSubtaskInputText((prev) => ({ ...prev, [todoId]: "" }));
  };

  const toggleSubtask = (todoId: string, subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos((prev) =>
      (prev || []).map((todo) => {
        if (todo.id === todoId) {
          const nextSubtasks = todo.subtasks.map((sub) => {
            if (sub.id === subtaskId) {
              return { ...sub, completed: !sub.completed };
            }
            return sub;
          });
          return { ...todo, subtasks: nextSubtasks };
        }
        return todo;
      })
    );
  };

  const deleteSubtask = (todoId: string, subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos((prev) =>
      (prev || []).map((todo) => {
        if (todo.id === todoId) {
          return {
            ...todo,
            subtasks: todo.subtasks.filter((sub) => sub.id !== subtaskId),
          };
        }
        return todo;
      })
    );
  };

  const toggleExpandTask = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks((prev) => ({
      ...prev,
      [todoId]: !prev[todoId],
    }));
  };

  const isOverdue = (todo: TodoItem) => {
    if (todo.completed || !todo.dueDate) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    return todo.dueDate < todayStr;
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    if (dateStr === todayStr) return "Today";
    if (dateStr === tomorrowStr) return "Tomorrow";

    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const priorityWeight = { high: 3, medium: 2, low: 1 };

  const getFilteredAndSortedTodos = () => {
    let list = [...(todos || [])];

    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    // Status / Category Filter
    if (filter === "active") {
      list = list.filter((t) => !t.completed);
    } else if (filter === "completed") {
      list = list.filter((t) => t.completed);
    } else if (filter === "high") {
      list = list.filter((t) => t.priority === "high");
    }

    // Sort options
    list.sort((a, b) => {
      if (sortBy === "priority") {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortBy === "due") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      // default: created
      return b.createdAt - a.createdAt;
    });

    return list;
  };

  const activeFilteredTodos = getFilteredAndSortedTodos();

  // Statistics counters
  const totalCount = (todos || []).length;
  const completedCount = (todos || []).filter((todo) => todo.completed).length;
  const activeCount = totalCount - completedCount;
  const highPriorityCount = (todos || []).filter((todo) => todo.priority === "high" && !todo.completed).length;
  
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categoryColors = {
    work: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    personal: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    ideas: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
    urgent: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  };

  const priorityColors = {
    low: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-amber-500/20 text-amber-400",
    high: "bg-rose-500/20 text-rose-400",
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 text-zinc-100 select-none p-4 font-sans overflow-hidden">
      {/* Header and Statistics Widget Panel */}
      <header className="grid grid-cols-3 gap-2 mb-4 flex-shrink-0">
        <div className="bg-zinc-950/40 border border-zinc-800/60 p-2.5 rounded-xl flex flex-col justify-between">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Completion</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg font-extrabold text-white tracking-tight">{overallPercent}%</span>
            <div className="flex-1 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 h-full transition-all duration-300" 
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-800/60 p-2.5 rounded-xl flex flex-col justify-between">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Active Tasks</span>
          <span className="text-lg font-extrabold text-indigo-400 mt-0.5">{activeCount}</span>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-800/60 p-2.5 rounded-xl flex flex-col justify-between">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">High Priority</span>
          <span className={`text-lg font-extrabold mt-0.5 ${highPriorityCount > 0 ? "text-rose-400 animate-pulse" : "text-zinc-400"}`}>
            {highPriorityCount}
          </span>
        </div>
      </header>

      {/* Searching, Filtering, Sorting toolbar */}
      <div className="flex flex-col gap-2 mb-3.5 flex-shrink-0 bg-zinc-950/20 border border-zinc-800/30 p-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search tasks or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800/50 rounded-lg pl-7 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 transition"
            />
          </div>

          {/* Sort selection drop dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-800/50 text-zinc-300 rounded-lg px-2.5 py-1 text-xxs font-semibold outline-none cursor-pointer hover:border-zinc-700 transition"
          >
            <option value="created">Date Created</option>
            <option value="due">Due Date</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {/* Filter buttons */}
        <div className="flex justify-between items-center pt-1.5 border-t border-zinc-850/40">
          <div className="flex items-center gap-1">
            {(["all", "active", "completed", "high"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  filter === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300 bg-transparent"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-[9px] text-rose-400/80 hover:text-rose-400 font-bold uppercase tracking-wider cursor-pointer transition"
            >
              Clear Done
            </button>
          )}
        </div>
      </div>

      {/* Task checklist container */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-0.5 scrollbar-thin">
        {todos === null ? (
          <div className="text-center text-xs text-zinc-600 py-16 font-mono animate-pulse">
            COMPILING DATA STACK...
          </div>
        ) : activeFilteredTodos.length > 0 ? (
          activeFilteredTodos.map((todo) => {
            const subtasksCount = todo.subtasks.length;
            const completedSubsCount = todo.subtasks.filter((s) => s.completed).length;
            const percent = subtasksCount > 0 ? Math.round((completedSubsCount / subtasksCount) * 100) : 0;
            const isExpanded = !!expandedTasks[todo.id];
            const overdue = isOverdue(todo);

            return (
              <div
                key={todo.id}
                onClick={() => toggleTodo(todo.id)}
                className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition duration-150 ${
                  todo.completed
                    ? "bg-zinc-950/10 border-zinc-900/40 opacity-55"
                    : "bg-zinc-950/45 border-zinc-850/80 hover:border-zinc-800/80 hover:bg-zinc-950/60 shadow-md"
                }`}
              >
                {/* Main Task Header Row */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Status Circle checkbox indicator */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition flex-shrink-0 mt-0.5 ${
                        todo.completed
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      {todo.completed && <span className="text-[8px] font-bold">✓</span>}
                    </div>

                    {/* Task Title content */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-semibold block leading-tight break-words text-zinc-100 ${
                          todo.completed ? "line-through text-zinc-500" : ""
                        }`}
                      >
                        {todo.text}
                      </span>
                      
                      {/* Secondary Tags and Attributes Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${categoryColors[todo.category]}`}>
                          {todo.category}
                        </span>

                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase font-mono ${priorityColors[todo.priority]}`}>
                          {todo.priority}
                        </span>

                        {todo.dueDate && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono ${
                            overdue 
                              ? "bg-rose-950/30 text-rose-400 border border-rose-900/20" 
                              : "bg-zinc-950 text-zinc-500 border border-zinc-800/40"
                          }`}>
                            <span>📅</span>
                            <span className={overdue ? "font-extrabold animate-pulse" : ""}>
                              {formatDueDate(todo.dueDate)} {overdue ? "[OVERDUE]" : ""}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column (Expand Subtasks, Delete) */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => toggleExpandTask(todo.id, e)}
                      className={`w-5 h-5 rounded hover:bg-zinc-900 flex items-center justify-center text-xxs font-bold text-zinc-500 hover:text-white transition cursor-pointer ${
                        isExpanded ? "bg-zinc-900 text-white" : ""
                      }`}
                      title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>

                    <button
                      onClick={(e) => deleteTodo(todo.id, e)}
                      className="w-5 h-5 rounded hover:bg-rose-950/30 flex items-center justify-center text-[10px] text-zinc-600 hover:text-rose-400 transition cursor-pointer"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Subtask progress bar indicator */}
                {subtasksCount > 0 && (
                  <div className="w-full pl-6.5 mt-0.5">
                    <div className="flex justify-between items-center text-[8px] text-zinc-500 font-mono font-bold mb-1">
                      <span>Subtasks Progress</span>
                      <span>{completedSubsCount}/{subtasksCount} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 rounded overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Expanded Subtasks details view */}
                {isExpanded && (
                  <div 
                    onClick={(e) => e.stopPropagation()} // Intercept clicks inside subtask window
                    className="mt-2.5 ml-6.5 pl-3 border-l border-zinc-800/60 space-y-2 pb-1"
                  >
                    {todo.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={(e) => toggleSubtask(todo.id, sub.id, e)}
                        className="flex items-center justify-between group/sub cursor-pointer text-zinc-300 hover:text-white text-[11px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition flex-shrink-0 ${
                            sub.completed 
                              ? "bg-indigo-600 border-indigo-500 text-white" 
                              : "border-zinc-700 hover:border-zinc-500"
                          }`}>
                            {sub.completed && <span className="text-[7px]">✓</span>}
                          </div>
                          <span className={`truncate leading-none ${sub.completed ? "line-through text-zinc-500" : ""}`}>
                            {sub.text}
                          </span>
                        </div>

                        <button
                          onClick={(e) => deleteSubtask(todo.id, sub.id, e)}
                          className="opacity-0 group-hover/sub:opacity-100 w-4 h-4 rounded flex items-center justify-center text-[8px] text-zinc-600 hover:text-rose-400 hover:bg-rose-950/20 transition cursor-pointer"
                          title="Delete subtask"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Subtask quick append form */}
                    <form 
                      onSubmit={(e) => handleAddSubtask(todo.id, e)}
                      className="flex gap-1.5 pt-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Add subtask..."
                        value={subtaskInputText[todo.id] || ""}
                        onChange={(e) =>
                          setSubtaskInputText((prev) => ({
                            ...prev,
                            [todo.id]: e.target.value,
                          }))
                        }
                        className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded-lg px-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-650 outline-none focus:border-zinc-700 transition"
                      />
                      <button
                        type="submit"
                        disabled={!(subtaskInputText[todo.id] || "").trim()}
                        className="px-2 bg-indigo-600/30 border border-indigo-500/25 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white disabled:opacity-25 text-indigo-300 disabled:pointer-events-none text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        +
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-xs text-zinc-600 py-16">
            No matching tasks found. Adjust filters or search values!
          </div>
        )}
      </div>

      {/* Task input field form */}
      <form onSubmit={handleAddTodo} className="flex flex-col gap-2 flex-shrink-0 bg-zinc-950/30 border-t border-zinc-800/40 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="I want to..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition"
          />

          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className={`px-3 py-2.5 border rounded-xl text-xs font-bold tracking-wide transition cursor-pointer ${
              showOptions 
                ? "bg-zinc-800 border-zinc-700 text-white" 
                : "bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-zinc-400"
            }`}
            title="Configure priority, due date, category"
          >
            ⚙️
          </button>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-white rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            Add Task
          </button>
        </div>

        {/* Expandable Options form panel */}
        {showOptions && (
          <div className="grid grid-cols-3 gap-2.5 p-3 bg-zinc-950 border border-zinc-850/65 rounded-xl animate-in slide-in-from-bottom-2 duration-200">
            {/* Category Selector */}
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-1.5 text-[10px] font-semibold outline-none cursor-pointer hover:border-zinc-700 transition"
              >
                <option value="work">💼 Work</option>
                <option value="personal">🏠 Personal</option>
                <option value="ideas">💡 Ideas</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-1.5 text-[10px] font-semibold outline-none cursor-pointer hover:border-zinc-700 transition"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            {/* Due Date picker */}
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg p-1 text-[10px] font-semibold outline-none cursor-pointer hover:border-zinc-700 transition"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
