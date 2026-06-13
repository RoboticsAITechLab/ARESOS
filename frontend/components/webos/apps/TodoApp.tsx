"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface TodoAppProps {
  pid: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoApp({ pid: _pid }: TodoAppProps) {
  const { addNotification } = useOS();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputText, setInputText] = useState("");

  const defaultTodos: TodoItem[] = [
    { id: "1", text: "Create high-fidelity landing page layouts", completed: true },
    { id: "2", text: "Setup local workspace Git integration", completed: true },
    { id: "3", text: "Customize glassmorphic desktop shortcuts", completed: false },
    { id: "4", text: "Configure interactive terminal CLI features", completed: false },
  ];

  // Load from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_todo_items");
      if (saved) {
        try {
          setTodos(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse todo items", e);
          setTodos(defaultTodos);
        }
      } else {
        setTodos(defaultTodos);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_todo_items", JSON.stringify(todos));
    }
  }, [todos, isLoaded]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text,
      completed: false,
    };

    setTodos((prev) => [...prev, newTodo]);
    setInputText("");
    addNotification("Task Tracker", `Added task: "${text}"`, "success");
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.id === id) {
          const nextCompleted = !todo.completed;
          if (nextCompleted) {
            addNotification("Task Completed", `"${todo.text}" is done!`, "success");
          }
          return { ...todo, completed: nextCompleted };
        }
        return todo;
      })
    );
  };

  const deleteTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
    addNotification("Task Tracker", "Cleared all completed tasks.", "info");
  };

  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 text-zinc-100 select-none p-5">
      {/* Header section with stats summary */}
      <header className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4 flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Personal Checklist
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">
            {completedCount} of {totalCount} tasks resolved
          </span>
        </div>
        
        {completedCount > 0 && (
          <button
            onClick={clearCompleted}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wide cursor-pointer transition"
          >
            Clear Completed
          </button>
        )}
      </header>

      {/* Checklist display */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-thin">
        {todos.length > 0 ? (
          todos.map((todo) => (
            <div
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                todo.completed
                  ? "bg-zinc-950/20 border-zinc-850/40 opacity-50"
                  : "bg-zinc-950/50 border-zinc-850 hover:border-zinc-800 hover:bg-zinc-950/70"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Circular checkbox status */}
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    todo.completed
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "border-zinc-700 group-hover:border-zinc-500"
                  }`}
                >
                  {todo.completed && <span className="text-[8px]">✓</span>}
                </div>
                
                {/* Text string */}
                <span className={`text-xs font-medium text-zinc-200 ${todo.completed ? "line-through text-zinc-500" : ""}`}>
                  {todo.text}
                </span>
              </div>

              {/* Delete trash button */}
              <button
                onClick={(e) => deleteTodo(todo.id, e)}
                className="text-zinc-500 hover:text-red-400 p-1 transition cursor-pointer text-xs"
                title="Delete task"
              >
                ✕
              </button>
            </div>
          ))
        ) : (
          <div className="text-center text-xs text-zinc-600 py-16">
            All caught up! Type a task below to get started.
          </div>
        )}
      </div>

      {/* Task input field form */}
      <form onSubmit={handleAddTodo} className="flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="I want to..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-white rounded-xl transition cursor-pointer"
        >
          Add Task
        </button>
      </form>
    </div>
  );
}
