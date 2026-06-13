"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";
import { playClickSound } from "@/utils/webos/audio";

interface TerminalProps {
  pid: string;
}

export default function Terminal({ pid: _pid }: TerminalProps) {
  const { currentPath, listDirectory, changeDirectory, readFile, createDirectory, deleteNode } = useFileSystem();
  const { updateSettings, addNotification, currentUser, settings } = useOS();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "ARESOS Command Line Shell [Version 1.0.0]",
    "(c) 2026 Robotics AI Tech Lab. All rights reserved.",
    "",
    "Type 'help' to see list of available commands.",
    "",
  ]);

  // Command history logs (for Up/Down arrows scroll)
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, input]);

  // Auto focus terminal on mount
  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleCommandExecute = (command: string) => {
    const args = command.trim().split(" ");
    const cmd = args[0].toLowerCase();
    let output: string[] = [];

    switch (cmd) {
      case "help":
        output = [
          "Available Commands:",
          "  help           Display this assistance manual",
          "  ls             List contents of the current directory",
          "  cd <path>      Navigate to directory path",
          "  pwd            Show current working path",
          "  cat <file>     Display contents of file",
          "  mkdir <name>   Create a new folder in current directory",
          "  rm <name>      Remove a file or folder",
          "  echo <text>    Print message to console",
          "  clear          Clear the command terminal window",
          "  neofetch       Display system parameters in neat art style",
          "  theme <name>   Set theme (light, dark, midnight, or aurora)",
        ];
        break;

      case "ls":
        try {
          const nodes = listDirectory();
          if (nodes.length === 0) {
            output = ["(empty directory)"];
          } else {
            output = nodes.map(
              (n) => `${n.node.type === "directory" ? "📁" : "📄"}  ${n.name}`
            );
          }
        } catch {
          output = ["ls: failed to list contents."];
        }
        break;

      case "cd":
        if (!args[1]) {
          output = ["cd: missing destination argument."];
        } else {
          const ok = changeDirectory(args[1]);
          if (!ok) {
            output = [`cd: no such directory: ${args[1]}`];
          }
        }
        break;

      case "pwd":
        output = [currentPath];
        break;

      case "cat":
        if (!args[1]) {
          output = ["cat: missing file name argument."];
        } else {
          const file = readFile(args[1]);
          if (file) {
            output = file.content.split("\n");
          } else {
            output = [`cat: file not found: ${args[1]}`];
          }
        }
        break;

      case "mkdir":
        if (!args[1]) {
          output = ["mkdir: missing folder name argument."];
        } else {
          const ok = createDirectory(currentPath, args[1]);
          if (ok) {
            output = [`Created directory '${args[1]}'`];
          } else {
            output = ["mkdir: folder already exists or path invalid."];
          }
        }
        break;

      case "rm":
        if (!args[1]) {
          output = ["rm: missing target name argument."];
        } else {
          const ok = deleteNode(args[1]);
          if (ok) {
            output = [`Removed '${args[1]}'`];
          } else {
            output = [`rm: no such file or directory: ${args[1]}`];
          }
        }
        break;

      case "echo":
        output = [args.slice(1).join(" ")];
        break;

      case "clear":
        setHistory([]);
        return;

      case "theme":
        const reqTheme = args[1];
        if (reqTheme === "light" || reqTheme === "dark" || reqTheme === "midnight" || reqTheme === "aurora") {
          updateSettings({ theme: reqTheme as "light" | "dark" | "midnight" | "aurora" });
          output = [`System theme updated to '${reqTheme}'`];
          addNotification("System Command", `Theme set to ${reqTheme}`, "info");
        } else {
          output = [
            "theme: invalid argument. Select 'light', 'dark', 'midnight', or 'aurora'.",
          ];
        }
        break;

      case "neofetch":
        output = [
          "    /\\_/\\          OS: ARESOS WebOS v1.0.0",
          "   ( o.o )         Kernel: Next.js 16 Client-side Runtime",
          "    > ^ <          Uptime: 45 mins",
          "   /     \\         Host: Advanced AI Agent Interface",
          "  (       )        Shell: custom bash emulator",
          "   `-^-^-'         Browser: Chrome/WebKit Engine",
          "                   CPU: Mock Intel i9-16900K @ 5.2GHz",
          "                   Memory: 3500MB / 8000MB (VFS Mode)",
        ];
        break;

      default:
        output = [`sh: command not found: ${cmd}. Type 'help' for command list.`];
        break;
    }

    setHistory((prev) => [
      ...prev,
      `${currentUser.username}@aresos:${currentPath}$ ${command}`,
      ...output,
      "",
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      playClickSound((settings?.volume ?? 80) / 100);
      const command = input;
      setInput("");
      setHistoryIndex(-1);

      if (command.trim()) {
        // Add to history list if it's new
        setCommandHistory((prev) => {
          const next = [...prev];
          if (next[next.length - 1] !== command) {
            next.push(command);
          }
          return next;
        });
        handleCommandExecute(command);
      } else {
        // Just print prompt on empty enter
        setHistory((prev) => [...prev, `${currentUser.username}@aresos:${currentPath}$`, ""]);
      }
    }

    // Scroll command history: Up Arrow
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      let nextIndex = historyIndex === -1 ? commandHistory.length - 1 : historyIndex - 1;
      if (nextIndex < 0) nextIndex = 0;

      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    }

    // Scroll command history: Down Arrow
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;

      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-zinc-950 font-mono text-emerald-400 p-4 text-xs select-text relative overflow-hidden"
      onClick={() => hiddenInputRef.current?.focus()}
    >
      {/* Hidden textarea to capture system keyboard inputs */}
      <textarea
        ref={hiddenInputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute w-0 h-0 opacity-0 pointer-events-none border-none p-0 focus:ring-0 focus:outline-none"
        style={{ left: "-9999px", top: "-9999px" }}
      />

      {/* Screen logs display */}
      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin select-text">
        {history.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed min-h-[14px]">
            {line}
          </div>
        ))}

        {/* The active inline prompt + cursor blinking directly adjacent */}
        <div className="flex flex-wrap items-center leading-relaxed">
          <span className="text-zinc-400 select-none mr-2">
            {currentUser.username}@aresos:{currentPath}$
          </span>
          <span className="text-emerald-300 break-all whitespace-pre-wrap select-text pr-0.5">
            {input}
          </span>
          {isFocused && (
            <span 
              className="inline-block w-1.5 h-3.5 bg-emerald-400 align-middle animate-pulse"
              style={{ verticalAlign: "middle" }}
            />
          )}
        </div>
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
