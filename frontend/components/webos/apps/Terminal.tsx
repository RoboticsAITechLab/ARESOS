"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";

interface TerminalProps {
  pid: string;
}

export default function Terminal({ pid }: TerminalProps) {
  const { currentPath, listDirectory, changeDirectory, readFile, writeFile, createDirectory, deleteNode } = useFileSystem();
  const { updateSettings, addNotification, currentUser } = useOS();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "ARESOS Command Line Shell [Version 1.0.0]",
    "(c) 2026 Robotics AI Tech Lab. All rights reserved.",
    "",
    "Type 'help' to see list of available commands.",
    "",
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = input.trim();
    if (!command) return;

    // Echo input command
    setHistory((prev) => [...prev, `${currentUser.username}@aresos:${currentPath}$ ${command}`]);
    setInput("");

    // Command parser
    const args = command.split(" ");
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case "help":
        setHistory((prev) => [
          ...prev,
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
          "  theme <name>   Set theme (light, dark, glassmorphism)",
        ]);
        break;

      case "ls":
        try {
          const nodes = listDirectory();
          if (nodes.length === 0) {
            setHistory((prev) => [...prev, "(empty directory)"]);
          } else {
            const formatted = nodes.map(
              (n) => `${n.node.type === "directory" ? "📁" : "📄"}  ${n.name}`
            );
            setHistory((prev) => [...prev, ...formatted]);
          }
        } catch (err) {
          setHistory((prev) => [...prev, "ls: failed to list contents."]);
        }
        break;

      case "cd":
        if (!args[1]) {
          setHistory((prev) => [...prev, "cd: missing destination argument."]);
        } else {
          const ok = changeDirectory(args[1]);
          if (!ok) {
            setHistory((prev) => [...prev, `cd: no such directory: ${args[1]}`]);
          }
        }
        break;

      case "pwd":
        setHistory((prev) => [...prev, currentPath]);
        break;

      case "cat":
        if (!args[1]) {
          setHistory((prev) => [...prev, "cat: missing file name argument."]);
        } else {
          const file = readFile(args[1]);
          if (file) {
            setHistory((prev) => [...prev, ...file.content.split("\n")]);
          } else {
            setHistory((prev) => [...prev, `cat: file not found: ${args[1]}`]);
          }
        }
        break;

      case "mkdir":
        if (!args[1]) {
          setHistory((prev) => [...prev, "mkdir: missing folder name argument."]);
        } else {
          const ok = createDirectory(currentPath, args[1]);
          if (ok) {
            setHistory((prev) => [...prev, `Created directory '${args[1]}'`]);
          } else {
            setHistory((prev) => [...prev, "mkdir: folder already exists or path invalid."]);
          }
        }
        break;

      case "rm":
        if (!args[1]) {
          setHistory((prev) => [...prev, "rm: missing target name argument."]);
        } else {
          const ok = deleteNode(args[1]);
          if (ok) {
            setHistory((prev) => [...prev, `Removed '${args[1]}'`]);
          } else {
            setHistory((prev) => [...prev, `rm: no such file or directory: ${args[1]}`]);
          }
        }
        break;

      case "echo":
        setHistory((prev) => [...prev, args.slice(1).join(" ")]);
        break;

      case "clear":
        setHistory([]);
        break;

      case "theme":
        const reqTheme = args[1];
        if (reqTheme === "light" || reqTheme === "dark" || reqTheme === "midnight" || reqTheme === "aurora") {
          updateSettings({ theme: reqTheme as any });
          setHistory((prev) => [...prev, `System theme updated to '${reqTheme}'`]);
          addNotification("System Command", `Theme set to ${reqTheme}`, "info");
        } else {
          setHistory((prev) => [
            ...prev,
            "theme: invalid argument. Select 'light', 'dark', 'midnight', or 'aurora'.",
          ]);
        }
        break;

      case "neofetch":
        setHistory((prev) => [
          ...prev,
          "    /\\_/\\          OS: ARESOS WebOS v1.0.0",
          "   ( o.o )         Kernel: Next.js 16 Client-side Runtime",
          "    > ^ <          Uptime: 45 mins",
          "   /     \\         Host: Advanced AI Agent Interface",
          "  (       )        Shell: custom bash emulator",
          "   `-^-^-'         Browser: Chrome/WebKit Engine",
          "                   CPU: Mock Intel i9-16900K @ 5.2GHz",
          "                   Memory: 3500MB / 8000MB (VFS Mode)",
        ]);
        break;

      default:
        setHistory((prev) => [
          ...prev,
          `sh: command not found: ${cmd}. Type 'help' for command list.`,
        ]);
        break;
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-zinc-950 font-mono text-emerald-400 p-4 text-xs select-text"
      onClick={() => {
        // Focus the prompt input when container is clicked
        const inputElem = document.getElementById(`term-input-${pid}`);
        inputElem?.focus();
      }}
    >
      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
        {history.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed min-h-[16px]">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 mt-3 border-t border-zinc-900 pt-2 flex-shrink-0">
        <span className="text-zinc-400">{currentUser.username}@aresos:{currentPath}$</span>
        <input
          id={`term-input-${pid}`}
          autoComplete="off"
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-emerald-300 outline-none caret-emerald-400 border-none p-0 focus:ring-0 focus:outline-none"
        />
      </form>
    </div>
  );
}
