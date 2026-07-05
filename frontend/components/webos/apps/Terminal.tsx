"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";
import { playClickSound } from "@/utils/webos/audio";
import { executeCommandLine, ShellContext, expandHistory } from "@/utils/webos/shellEngine";

interface TerminalProps {
  pid: string;
}

const COMMANDS = [
  "help", "ls", "cd", "pwd", "cat", "touch", "write", "mkdir", "rm", "echo",
  "clear", "theme", "neofetch", "cp", "mv", "find", "tree", "grep", "head",
  "tail", "wc", "chmod", "zip", "unzip", "zipinfo", "ps", "kill", "jobs", "bg", "fg",
  "nohup", "htop", "diskusage", "meminfo", "cpuinfo", "curl", "wget",
  "nslookup", "traceroute", "netstat", "ssh", "scp", "git", "python", "node",
  "npm", "gcc", "clang", "arespkg", "ping", "weather", "top", "matrix", "calc"
];

const getLastWord = (val: string): { word: string; prefix: string } => {
  let lastSpaceIdx = -1;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char === '\\') {
      i++;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === ' ' && !inDoubleQuote && !inSingleQuote) {
      lastSpaceIdx = i;
    }
  }
  if (lastSpaceIdx === -1) {
    return { word: val, prefix: "" };
  }
  return {
    word: val.substring(lastSpaceIdx + 1),
    prefix: val.substring(0, lastSpaceIdx + 1)
  };
};

const parseAnsiColors = (text: string) => {
  const ansiRegex = /[\u001b\x1b]\[([0-9;]*)m/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentStyle: React.CSSProperties = {};
  let match;
  let key = 0;

  while ((match = ansiRegex.exec(text)) !== null) {
    const textPart = text.substring(lastIndex, match.index);
    if (textPart) {
      parts.push(
        <span key={key++} style={{ ...currentStyle }}>
          {textPart}
        </span>
      );
    }

    const codes = match[1].split(";");
    for (const code of codes) {
      const codeNum = parseInt(code, 10);
      if (codeNum === 0 || code === "") {
        currentStyle = {};
      } else if (codeNum === 1) {
        currentStyle.fontWeight = "bold";
      } else if (codeNum === 4) {
        currentStyle.textDecoration = "underline";
      } else if (codeNum >= 30 && codeNum <= 37) {
        const colors = [
          "#000000", // 30 Black
          "#ef4444", // 31 Red
          "#22c55e", // 32 Green
          "#eab308", // 33 Yellow
          "#3b82f6", // 34 Blue
          "#ec4899", // 35 Magenta
          "#06b6d4", // 36 Cyan
          "#ffffff", // 37 White
        ];
        currentStyle.color = colors[codeNum - 30];
      } else if (codeNum >= 90 && codeNum <= 97) {
        const colors = [
          "#71717a", // 90 Gray
          "#f87171", // 91 Bright Red
          "#4ade80", // 92 Bright Green
          "#facc15", // 93 Bright Yellow
          "#60a5fa", // 94 Bright Blue
          "#f472b6", // 95 Bright Magenta
          "#22d3ee", // 96 Bright Cyan
          "#f4f4f5", // 97 Bright White
        ];
        currentStyle.color = colors[codeNum - 90];
      } else if (codeNum >= 40 && codeNum <= 47) {
        const bgColors = [
          "#000000", // 40
          "#7f1d1d", // 41
          "#14532d", // 42
          "#713f12", // 43
          "#1e3a8a", // 44
          "#701a75", // 45
          "#164e63", // 46
          "#3f3f46", // 47
        ];
        currentStyle.backgroundColor = bgColors[codeNum - 40];
      } else if (codeNum >= 100 && codeNum <= 107) {
        const bgColors = [
          "#27272a", // 100
          "#b91c1c", // 101
          "#15803d", // 102
          "#a16207", // 103
          "#1d4ed8", // 104
          "#a21caf", // 105
          "#0e7490", // 106
          "#71717a", // 107
        ];
        currentStyle.backgroundColor = bgColors[codeNum - 100];
      }
    }
    lastIndex = ansiRegex.lastIndex;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push(
      <span key={key++} style={{ ...currentStyle }}>
        {remainingText}
      </span>
    );
  }
  return parts.length > 0 ? parts : text;
};

export default function Terminal({ pid: _pid }: TerminalProps) {
  const {
    currentPath,
    listDirectory,
    changeDirectory,
    readFile,
    writeFile,
    createDirectory,
    deleteNode,
    renameNode
  } = useFileSystem();

  const {
    updateSettings,
    addNotification,
    currentUser,
    updateUser,
    settings,
    processes,
    windows,
    terminateApp,
    launchApp
  } = useOS();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const bootLines = [
      "INITIALIZING ARES CORE...",
      "MOUNTING FILE SYSTEM...",
      "LOADING AUDIO ENGINE...",
      "VERIFYING SYSTEM STATE...",
      "UPLINK ESTABLISHED...",
      "SYSTEM READY.",
      "",
      "ARESOS Command Line Shell [Version 2.0.0]",
      "(c) 2026 Robotics AI Tech Lab. All rights reserved.",
      "",
      "Type 'help' to see list of available commands.",
      ""
    ];

    let currentIdx = 0;
    const printNextLine = () => {
      if (currentIdx < bootLines.length) {
        setHistory((prev) => [...prev, bootLines[currentIdx]]);
        currentIdx++;
        setTimeout(printNextLine, 80 + Math.random() * 100);
      }
    };
    printNextLine();
  }, []);

  // Active sub-program state
  const [activeProgram, setActiveProgram] = useState<"none" | "ping" | "top" | "matrix">("none");

  // Ping states
  const [pingTarget, setPingTarget] = useState("");
  const [pingIp, setPingIp] = useState("");

  // Top states
  const [cpuLoad, setCpuLoad] = useState(5);
  const [ramUsage, setRamUsage] = useState(3500);

  // Command history logs (for Up/Down arrows scroll)
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(true);

  // Reverse Search (Ctrl+R) States
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistoryIdx, setSearchHistoryIdx] = useState(-1);
  const [searchMatch, setSearchMatch] = useState("");

  // Environment and Alias References
  const envRef = useRef<Record<string, string>>({
    USER: currentUser?.username || "user",
    HOME: "/home/user",
    PATH: "/bin:/usr/bin",
    SHELL: "/bin/ares",
    TERM: "xterm-256color",
    PWD: currentPath,
  });

  const aliasesRef = useRef<Record<string, string>>({
    ll: "ls -la",
    gs: "git status",
    la: "ls -a",
  });

  // Sync PWD with currentPath
  useEffect(() => {
    envRef.current.PWD = currentPath;
  }, [currentPath]);

  // Sync USER with currentUser
  useEffect(() => {
    if (currentUser?.username) {
      envRef.current.USER = currentUser.username;
    }
  }, [currentUser]);

  const findSearchMatch = (query: string, startIdx: number): { index: number; match: string } => {
    if (!query) return { index: -1, match: "" };
    for (let i = startIdx; i >= 0; i--) {
      if (commandHistory[i] && commandHistory[i].toLowerCase().includes(query.toLowerCase())) {
        return { index: i, match: commandHistory[i] };
      }
    }
    return { index: -1, match: "" };
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load terminal command history from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_terminal_history");
      if (saved) {
        try {
          setCommandHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse terminal history", e);
        }
      }
      setIsHistoryLoaded(true);
    }
  }, []);

  // Save terminal command history to localStorage on change
  useEffect(() => {
    if (isHistoryLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_terminal_history", JSON.stringify(commandHistory));
    }
  }, [commandHistory, isHistoryLoaded]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeProgram === "none" || activeProgram === "ping") {
      scrollToBottom();
    }
  }, [history, input, activeProgram]);

  // Auto focus terminal on mount
  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  // Ping polling interval effect
  useEffect(() => {
    if (activeProgram !== "ping") return;

    let seq = 0;
    const interval = setInterval(() => {
      if (seq >= 5) {
        setHistory((prev) => [
          ...prev,
          `--- ${pingTarget} ping statistics ---`,
          `5 packets transmitted, 5 received, 0% packet loss`,
          `rtt min/avg/max = ${((10 + Math.random() * 2)).toFixed(1)}/${((12 + Math.random() * 2)).toFixed(1)}/${((15 + Math.random() * 5)).toFixed(1)} ms`,
          "",
        ]);
        setActiveProgram("none");
        clearInterval(interval);
        return;
      }

      const time = (10 + Math.random() * 10).toFixed(1);
      const ttl = 64 + Math.floor(Math.random() * 64);
      setHistory((prev) => [
        ...prev,
        `64 bytes from ${pingTarget} (${pingIp}): icmp_seq=${seq} ttl=${ttl} time=${time} ms`,
      ]);
      seq++;
    }, 800);

    return () => clearInterval(interval);
  }, [activeProgram, pingTarget, pingIp]);

  // Helper to query real JS memory heap values or estimated browser VFS allocation
  const getRealMemory = () => {
    if (typeof window !== "undefined" && (window.performance as any)?.memory) {
      const mem = (window.performance as any).memory;
      const used = Math.round(mem.usedJSHeapSize / (1024 * 1024));
      const total = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
      return { used, total };
    }
    const deviceMemoryGb = (typeof navigator !== "undefined" ? ((navigator as any).deviceMemory || 8) : 8);
    const total = deviceMemoryGb * 1024;
    const used = 400 + (windows.length * 150) + Math.floor(Math.random() * 50);
    return { used, total };
  };

  // Top stats updater effect
  useEffect(() => {
    if (activeProgram !== "top") return;

    const getRealStats = () => {
      // Calculate realistic CPU based on active windows/processes
      const activeWins = windows.length;
      const activeProcs = processes.length;
      const baseCpu = 2 + (activeWins * 2) + (activeProcs * 1.5);
      const randCpu = Math.floor(Math.random() * 4);
      setCpuLoad(Math.min(99, Math.round(baseCpu + randCpu)));

      const mem = getRealMemory();
      setRamUsage(mem.used);
    };

    getRealStats();
    const interval = setInterval(getRealStats, 1000);

    return () => clearInterval(interval);
  }, [activeProgram, windows, processes]);

  // Matrix digital rain canvas renderer effect
  useEffect(() => {
    if (activeProgram !== "matrix") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = canvas.parentElement?.clientHeight || 400;

    const katakana = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const alphabet = katakana.split("");
    const fontSize = 11;
    const columns = canvas.width / fontSize;
    const rainDrops: number[] = [];

    for (let x = 0; x < columns; x++) {
      rainDrops[x] = 1;
    }

    let animationId: number;
    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0f0";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet[Math.floor(Math.random() * alphabet.length)];
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeProgram]);

  // Calculates uptime since performance boot session
  const getUptimeString = () => {
    const uptimeMs = performance.now();
    const totalSecs = Math.floor(uptimeMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  // Autocomplete Suggestions Calculation
  const getSuggestion = () => {
    if (!input) return "";
    const { word, prefix } = getLastWord(input);
    if (!word) return "";

    if (word.startsWith("$")) {
      const varName = word.substring(1).toUpperCase();
      const match = Object.keys(envRef.current).find(
        (k) => k.startsWith(varName) && k !== varName
      );
      if (match) {
        return match.substring(varName.length);
      }
      return "";
    }

    const trimmedPrefix = prefix.trim();
    const isCommandName =
      !trimmedPrefix ||
      trimmedPrefix.endsWith("&&") ||
      trimmedPrefix.endsWith("||") ||
      trimmedPrefix.endsWith(";") ||
      trimmedPrefix.endsWith("|");

    if (isCommandName) {
      const match = COMMANDS.find(
        (c) => c.startsWith(word.toLowerCase()) && c !== word.toLowerCase()
      );
      if (match) {
        return match.substring(word.length);
      }
      return "";
    }

    // Otherwise, autocomplete VFS files or directories
    let searchDir = "";
    let namePrefix = word;
    let targetPathForList = currentPath;

    if (word.includes("/")) {
      const lastSlashIdx = word.lastIndexOf("/");
      searchDir = word.substring(0, lastSlashIdx + 1);
      namePrefix = word.substring(lastSlashIdx + 1);
      const dirToResolve = word.substring(0, lastSlashIdx);
      if (dirToResolve.startsWith("/")) {
        targetPathForList = "/" + dirToResolve.split("/").filter(Boolean).join("/");
      } else {
        const segments = currentPath.split("/").filter(Boolean);
        const relativeSegments = dirToResolve.split("/").filter(Boolean);
        for (const seg of relativeSegments) {
          if (seg === ".") continue;
          if (seg === "..") {
            segments.pop();
          } else {
            segments.push(seg);
          }
        }
        targetPathForList = "/" + segments.join("/");
      }
    }

    try {
      const nodes = listDirectory(targetPathForList);
      const match = nodes.find(
        (n) =>
          n.name.toLowerCase().startsWith(namePrefix.toLowerCase()) &&
          n.name.toLowerCase() !== namePrefix.toLowerCase()
      );
      if (match) {
        return match.name.substring(namePrefix.length);
      }
    } catch (err) {}

    return "";
  };

  const suggestion = getSuggestion();

  const handleCommandExecute = async (commandLine: string) => {
    const context: ShellContext = {
      currentPath,
      listDirectory,
      changeDirectory,
      readFile,
      writeFile,
      createDirectory,
      deleteNode,
      renameNode,
      settings,
      updateSettings,
      currentUser,
      updateUser,
      addNotification,
      processes,
      windows,
      terminateApp,
      launchApp,
      env: envRef.current,
      aliases: aliasesRef.current,
      commandHistory,
      setHistory,
      activeProgram,
      setActiveProgram,
      setPingTarget,
      setPingIp,
    };
    await executeCommandLine(commandLine, context);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+R starts reverse history search
    if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      setIsSearchMode(true);
      setSearchQuery("");
      setSearchHistoryIdx(-1);
      setSearchMatch("");
      return;
    }

    // Escape or Ctrl+C terminates sub-programs
    if (e.key === "Escape") {
      e.preventDefault();
      if (activeProgram !== "none") {
        const lastProg = activeProgram;
        setActiveProgram("none");
        setHistory((prev) => [...prev, `[Program '${lastProg}' closed]`, ""]);
        setInput("");
      }
      return;
    }

    if (e.ctrlKey && e.key === "c") {
      // If there is active text selection, let the browser copy it normally instead of sending interrupt
      const selection = window.getSelection();
      if (selection && selection.toString().trim() !== "") {
        return;
      }
      e.preventDefault();
      if (activeProgram !== "none") {
        const lastProg = activeProgram;
        setActiveProgram("none");
        setHistory((prev) => [...prev, "^C", `[Program '${lastProg}' terminated]`, ""]);
        setInput("");
      } else {
        setHistory((prev) => [...prev, `${currentUser.username}@aresos:${currentPath}$ ${input}^C`, ""]);
        setInput("");
      }
      return;
    }

    // Intercept keys when in search mode
    if (isSearchMode) {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        const start = searchHistoryIdx === -1 ? commandHistory.length - 1 : searchHistoryIdx - 1;
        const res = findSearchMatch(searchQuery, start);
        if (res.index !== -1) {
          setSearchHistoryIdx(res.index);
          setSearchMatch(res.match);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const nextQuery = searchQuery + e.key;
        setSearchQuery(nextQuery);
        const res = findSearchMatch(nextQuery, commandHistory.length - 1);
        if (res.index !== -1) {
          setSearchHistoryIdx(res.index);
          setSearchMatch(res.match);
        } else {
          setSearchHistoryIdx(-1);
          setSearchMatch("");
        }
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        const nextQuery = searchQuery.slice(0, -1);
        setSearchQuery(nextQuery);
        if (nextQuery) {
          const res = findSearchMatch(nextQuery, commandHistory.length - 1);
          if (res.index !== -1) {
            setSearchHistoryIdx(res.index);
            setSearchMatch(res.match);
          } else {
            setSearchHistoryIdx(-1);
            setSearchMatch("");
          }
        } else {
          setSearchHistoryIdx(-1);
          setSearchMatch("");
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        setIsSearchMode(false);
        if (searchMatch) {
          setInput("");
          setCommandHistory((prev) => {
            const next = [...prev];
            if (next[next.length - 1] !== searchMatch) {
              next.push(searchMatch);
            }
            return next;
          });
          handleCommandExecute(searchMatch);
        }
        return;
      }

      if (e.key === "Escape" || (e.ctrlKey && e.key === "g")) {
        e.preventDefault();
        setIsSearchMode(false);
        setSearchQuery("");
        setSearchMatch("");
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
        e.preventDefault();
        setIsSearchMode(false);
        if (searchMatch) {
          setInput(searchMatch);
        }
        return;
      }
    }

    // Intercept keyboard controls for active subprograms
    if (activeProgram !== "none") {
      if (activeProgram === "matrix") {
        e.preventDefault();
        setActiveProgram("none");
        setHistory((prev) => [...prev, "[Matrix rain mode terminated]", ""]);
        setInput("");
        return;
      }

      if (activeProgram === "top") {
        if (e.key === "q" || e.key === "Q") {
          e.preventDefault();
          setActiveProgram("none");
          setInput("");
          return;
        }

        // Process top input box on enter
        if (e.key === "Enter") {
          e.preventDefault();
          const cmd = input.trim();
          setInput("");
          if (cmd.startsWith("kill ")) {
            const targetPid = cmd.substring(5).trim();
            terminateApp(targetPid);
          }
        }
        return;
      }

      // Block normal typing during background running tasks (e.g. ping)
      if (activeProgram === "ping") {
        e.preventDefault();
        return;
      }
    }

    // Tab autocomplete triggers completion
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestion) {
        setInput((prev) => prev + suggestion);
      }
      return;
    }

    // Right Arrow triggers autocomplete if suggestion exists
    if (e.key === "ArrowRight") {
      if (suggestion) {
        e.preventDefault();
        setInput((prev) => prev + suggestion);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      playClickSound((settings?.volume ?? 80) / 100);
      const command = input;
      setInput("");
      setHistoryIndex(-1);

      if (command.trim()) {
        const { expanded, error } = expandHistory(command, commandHistory);

        if (error) {
          setHistory((prev) => [...prev, `${currentUser.username}@aresos:${currentPath}$ ${command}`, error, ""]);
          return;
        }

        setCommandHistory((prev) => {
          const next = [...prev];
          if (next[next.length - 1] !== expanded) {
            next.push(expanded);
          }
          return next;
        });
        handleCommandExecute(command);
      } else {
        setHistory((prev) => [...prev, `${currentUser.username}@aresos:${currentPath}$`, ""]);
      }
      return;
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

  // Formatter for stylized output render
  const renderHistoryLine = (line: string, idx: number) => {
    if (!line || typeof line !== "string") {
      return <div key={idx} className="min-h-[14px]" />;
    }
    // Check if line contains ANSI escape character codes
    if (line.includes("\u001b") || line.includes("\x1b")) {
      return (
        <div key={idx} className="text-zinc-300 leading-relaxed min-h-[14px] whitespace-pre-wrap select-text">
          {parseAnsiColors(line)}
        </div>
      );
    }

    // Parse prompt line
    if (line.includes("@aresos:") && line.includes("$")) {
      const isPromptOnly = !line.includes("$ ");
      const promptPart = isPromptOnly ? line : line.split("$ ")[0] + "$";
      const commandPart = isPromptOnly ? "" : line.split("$ ").slice(1).join("$ ");

      const userHost = promptPart.split(":")[0];
      const path = promptPart.substring(userHost.length + 1, promptPart.length - 1);

      return (
        <div key={idx} className="leading-relaxed min-h-[14px]">
          <span className="text-emerald-400 font-semibold">{userHost}</span>
          <span className="text-zinc-500">:</span>
          <span className="text-cyan-400 font-bold">{path}</span>
          <span className="text-zinc-400 font-bold">$</span>
          {commandPart && <span className="text-white font-semibold ml-1.5">{commandPart}</span>}
        </div>
      );
    }

    // Highlight directories
    if (line.startsWith("📁  ")) {
      return (
        <div key={idx} className="text-cyan-400 font-semibold leading-relaxed min-h-[14px]">
          {line}
        </div>
      );
    }

    // Highlight normal files
    if (line.startsWith("📄  ")) {
      return (
        <div key={idx} className="text-zinc-300 leading-relaxed min-h-[14px]">
          {line}
        </div>
      );
    }

    // Highlight syntax warning/errors
    if (
      line.startsWith("sh:") ||
      line.startsWith("cd:") ||
      line.startsWith("cat:") ||
      line.startsWith("rm:") ||
      line.startsWith("mkdir:") ||
      line.startsWith("touch:") ||
      line.startsWith("write:") ||
      line.startsWith("calc:")
    ) {
      return (
        <div key={idx} className="text-rose-400 leading-relaxed min-h-[14px]">
          {line}
        </div>
      );
    }

    // Highlight headers/commands manual
    if (
      line.startsWith("====") ||
      line.startsWith("DIRECTORY / FILE COMMANDS:") ||
      line.startsWith("SYSTEM COMMANDS:") ||
      line.startsWith("INTERACTIVE UTILITIES") ||
      line.startsWith("SHORTCUTS:") ||
      line.startsWith("Created empty file") ||
      line.startsWith("Written content to") ||
      line.startsWith("Created directory")
    ) {
      return (
        <div key={idx} className="text-emerald-400 font-medium leading-relaxed min-h-[14px]">
          {line}
        </div>
      );
    }

    // Uptime or system neofetch layout keys highlight
    if (
      line.includes("OS:") ||
      line.includes("Kernel:") ||
      line.includes("Uptime:") ||
      line.includes("Host:") ||
      line.includes("Shell:") ||
      line.includes("Browser:") ||
      line.includes("CPU:") ||
      line.includes("Memory:")
    ) {
      const labelMatch = line.match(/(OS|Kernel|Uptime|Host|Shell|Browser|CPU|Memory):/);
      if (labelMatch) {
        const parts = line.split(labelMatch[0]);
        return (
          <div key={idx} className="leading-relaxed min-h-[14px]">
            <span className="text-emerald-500 font-semibold">{parts[0]}</span>
            <span className="text-zinc-400 font-bold">{labelMatch[0]}</span>
            <span className="text-zinc-200">{parts[1]}</span>
          </div>
        );
      }
    }

    // Default regular output
    return (
      <div key={idx} className="text-zinc-300 leading-relaxed min-h-[14px] whitespace-pre-wrap select-text">
        {line}
      </div>
    );
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-zinc-950 font-mono text-emerald-400 p-4 text-xs select-text relative overflow-hidden"
      onMouseUp={() => {
        // Only focus hidden input if user is not selecting text to allow easy copy-paste operations
        const selection = window.getSelection();
        if (selection && selection.toString().trim() !== "") {
          return;
        }
        hiddenInputRef.current?.focus();
      }}
      onContextMenu={async (e) => {
        e.preventDefault(); // Block browser's default context menu

        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : "";

        if (selectedText.trim() !== "") {
          // Windows Cmd Style: Copy selected text on right-click
          try {
            await navigator.clipboard.writeText(selectedText);
            addNotification("System Shell", "Selected text copied to clipboard", "info");
          } catch (err) {
            console.error("Failed to copy selected text via right click: ", err);
          }
        } else {
          // Windows Cmd Style: Paste text from clipboard on right-click if no selection
          try {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText) {
              setInput((prev) => prev + clipboardText);
              // Focus hidden input to allow typing immediately after paste
              hiddenInputRef.current?.focus();
            }
          } catch (err) {
            console.error("Failed to read from clipboard via right click: ", err);
          }
        }
      }}
    >
      {/* Hidden textarea to capture keyboard inputs */}
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

      {activeProgram === "matrix" ? (
        <div className="w-full h-full relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full bg-black cursor-pointer"
            onClick={() => setActiveProgram("none")}
          />
          <div className="absolute top-4 left-4 text-[9px] text-zinc-500 bg-black/75 border border-zinc-800/40 px-2.5 py-1 rounded select-none pointer-events-none tracking-wider font-semibold">
            ARES MATRIX SHIELD ACTIVE // PRESS ESCAPE TO EXIT
          </div>
        </div>
      ) : activeProgram === "top" ? (
        <div className="w-full h-full flex flex-col bg-zinc-950 text-emerald-400 select-none">
          {/* Top Header stats */}
          <div className="border-b border-emerald-500/20 pb-2 mb-3">
            <div className="flex justify-between text-emerald-500/60 font-bold">
              <span>ARES TASK MANAGER v1.2.0</span>
              <span>UPTIME: {getUptimeString()}</span>
            </div>
            <div className="flex gap-6 mt-1 text-zinc-300 font-semibold text-[10px]">
              <span>CPU: {cpuLoad}%</span>
              <span>RAM: {ramUsage}MB / {getRealMemory().total}MB</span>
              <span>THEME: {settings.theme.toUpperCase()}</span>
            </div>
          </div>

          {/* Table of active processes */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="text-emerald-500/40 border-b border-emerald-950/40 font-bold">
                  <th className="py-1 pr-4">PID</th>
                  <th className="pr-4">APP ID</th>
                  <th className="pr-4">NAME</th>
                  <th className="pr-4">STATUS</th>
                  <th>Z-INDEX</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-emerald-500/60 font-medium">
                  <td className="py-1">PID-1</td>
                  <td>system</td>
                  <td>ARES Core OS Init</td>
                  <td>sleeping</td>
                  <td>-</td>
                </tr>
                <tr className="text-emerald-500/60 font-medium">
                  <td className="py-1">PID-12</td>
                  <td>shell</td>
                  <td>Virtual CLI Terminal</td>
                  <td>running</td>
                  <td>-</td>
                </tr>
                {processes.map((p) => {
                  const win = windows.find((w) => w.pid === p.pid);
                  const isFocused = win?.isFocused;
                  return (
                    <tr
                      key={p.pid}
                      className={isFocused ? "text-white font-bold bg-emerald-500/10" : "text-zinc-300"}
                    >
                      <td className="py-1">{p.pid}</td>
                      <td>{p.appId}</td>
                      <td>{p.title}</td>
                      <td>{win?.isMinimized ? "minimized" : "running"}</td>
                      <td>{win?.zIndex || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer bar */}
          <div className="border-t border-emerald-500/20 pt-2.5 mt-2 flex items-center justify-between text-emerald-500/50">
            <span>Type 'kill &lt;PID&gt;' or press 'Q' to exit</span>
            <div className="flex items-center">
              <span>Command: </span>
              <span className="text-white ml-2 bg-zinc-900 px-2 py-0.5 rounded border border-emerald-500/15 min-w-[140px] inline-block font-mono">
                {input}
                <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin select-text">
          {history.map((line, idx) => renderHistoryLine(line, idx))}

          {/* Prompt + suggestion */}
          {isSearchMode ? (
            <div className="flex flex-wrap items-center leading-relaxed">
              <span className="text-zinc-400 select-none mr-2">
                (reverse-i-search)`{searchQuery}':
              </span>
              <span className="text-white break-all whitespace-pre-wrap select-text pr-0.5">
                {searchMatch || "(no match)"}
              </span>
              {isFocused && (
                <span
                  className="inline-block w-1.5 h-3.5 bg-cyan-400 align-middle animate-pulse"
                  style={{ verticalAlign: "middle" }}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center leading-relaxed">
              <span className="text-zinc-400 select-none mr-2">
                {currentUser.username}@aresos:{currentPath}$
              </span>
              <span className="text-white break-all whitespace-pre-wrap select-text pr-0.5">
                {input}
                {suggestion && (
                  <span className="text-zinc-600 select-none pointer-events-none">
                    {suggestion}
                  </span>
                )}
              </span>
              {isFocused && (
                <span
                  className="inline-block w-1.5 h-3.5 bg-emerald-400 align-middle animate-pulse"
                  style={{ verticalAlign: "middle" }}
                />
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
