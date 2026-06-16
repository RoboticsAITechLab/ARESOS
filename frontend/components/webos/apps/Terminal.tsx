"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";
import { playClickSound } from "@/utils/webos/audio";

interface TerminalProps {
  pid: string;
}

const COMMANDS = [
  "help",
  "ls",
  "cd",
  "pwd",
  "cat",
  "mkdir",
  "rm",
  "echo",
  "clear",
  "neofetch",
  "theme",
  "history",
  "touch",
  "write",
  "ping",
  "top",
  "matrix",
  "calc",
  "weather"
];

export default function Terminal({ pid: _pid }: TerminalProps) {
  const {
    currentPath,
    listDirectory,
    changeDirectory,
    readFile,
    writeFile,
    createDirectory,
    deleteNode
  } = useFileSystem();

  const {
    updateSettings,
    addNotification,
    currentUser,
    settings,
    processes,
    windows,
    terminateApp
  } = useOS();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "ARESOS Command Line Shell [Version 1.2.0]",
    "(c) 2026 Robotics AI Tech Lab. All rights reserved.",
    "",
    "Type 'help' to see list of available commands.",
    "",
  ]);

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
    if (!input.trim()) return "";
    const trimmed = input.trimStart();
    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
      // Autocomplete command name
      const cmdPart = parts[0].toLowerCase();
      const match = COMMANDS.find((c) => c.startsWith(cmdPart) && c !== cmdPart);
      if (match) {
        return match.substring(cmdPart.length);
      }
    } else if (parts.length === 2) {
      // Autocomplete folder or file argument based on command
      const cmd = parts[0].toLowerCase();
      if (["cd", "cat", "rm", "write", "touch"].includes(cmd)) {
        const argPart = parts[1];
        let nodes = listDirectory();

        if (cmd === "cd") {
          nodes = nodes.filter((n) => n.node.type === "directory");
        } else if (cmd === "cat") {
          nodes = nodes.filter((n) => n.node.type === "file");
        }

        const match = nodes.find(
          (n) =>
            n.name.toLowerCase().startsWith(argPart.toLowerCase()) &&
            n.name.toLowerCase() !== argPart.toLowerCase()
        );
        if (match) {
          return match.name.substring(argPart.length);
        }
      }
    }

    return "";
  };

  const suggestion = getSuggestion();

  interface ChainedCommand {
    cmdText: string;
    operator: "&&" | "||" | ";" | "none";
  }

  const parseCommandLine = (line: string): ChainedCommand[] => {
    const result: ChainedCommand[] = [];
    let currentCmd = "";
    let inDoubleQuote = false;
    let inSingleQuote = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        currentCmd += char;
      } else if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        currentCmd += char;
      } else if (!inDoubleQuote && !inSingleQuote) {
        // Check for &&
        if (char === '&' && line[i + 1] === '&') {
          result.push({ cmdText: currentCmd.trim(), operator: "&&" });
          currentCmd = "";
          i++; // skip next &
        }
        // Check for ||
        else if (char === '|' && line[i + 1] === '|') {
          result.push({ cmdText: currentCmd.trim(), operator: "||" });
          currentCmd = "";
          i++; // skip next |
        }
        // Check for ;
        else if (char === ';') {
          result.push({ cmdText: currentCmd.trim(), operator: ";" });
          currentCmd = "";
        } else {
          currentCmd += char;
        }
      } else {
        currentCmd += char;
      }
    }
    
    if (currentCmd.trim() || result.length === 0) {
      result.push({ cmdText: currentCmd.trim(), operator: "none" });
    }
    
    return result;
  };

  const executeSingleCommand = async (
    command: string,
    localPath: string,
    historyOutput: string[]
  ): Promise<{ success: boolean; newPath: string }> => {
    const args = command.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    let output: string[] = [];
    let success = true;
    let newPath = localPath;

    // Helper to resolve path relative to localPath
    const resolveLocalPath = (target: string): string => {
      if (!target) return localPath;
      if (target.startsWith("/")) {
        return "/" + target.split("/").filter(Boolean).join("/");
      }
      const currentSegments = localPath.split("/").filter(Boolean);
      const relativeSegments = target.split("/").filter(Boolean);

      for (const segment of relativeSegments) {
        if (segment === ".") {
          continue;
        } else if (segment === "..") {
          currentSegments.pop();
        } else {
          currentSegments.push(segment);
        }
      }
      return "/" + currentSegments.join("/");
    };

    switch (cmd) {
      case "help":
        output = [
          "================ ARES SYSTEM ASSISTANCE SHELL v1.2 ================",
          "",
          "DIRECTORY / FILE COMMANDS:",
          "  ls             List contents of the current directory",
          "  cd <path>      Navigate to directory path",
          "  pwd            Show current working path",
          "  cat <file>     Display contents of file",
          "  touch <file>   Create an empty file in current directory",
          "  write <f> <t>  Write/append text <t> into file <f>",
          "  mkdir <name>   Create a new folder in current directory",
          "  rm <name>      Remove a file or folder",
          "",
          "SYSTEM COMMANDS:",
          "  neofetch       Display host specs in aesthetic ASCII art style",
          "  theme <name>   Set theme (light, dark, midnight, or aurora)",
          "  history        Show command prompt input logs history",
          "  clear          Clear the command terminal window logs",
          "",
          "INTERACTIVE UTILITIES & UTILS:",
          "  top            Run live processes manager & system task monitor",
          "  matrix         Activate cyberdigital code matrix decryption waterfall",
          "  ping <host>    Simulate network latency link diagnostic probes",
          "  calc <expr>    Safe command line math evaluator (e.g. 150*2.5)",
          "  weather <c>    Poll weather forecast telemetry for a city <c>",
          "",
          "SHORTCUTS:",
          "  [Tab]          Autocomplete command or directory filename suggestion",
          "  [Up/Down]      Cycle through previously entered shell commands",
          "  [Esc]/[Ctrl+C] Interrupt and exit currently running process",
          "===================================================================",
        ];
        break;

      case "ls":
        try {
          const nodes = listDirectory(localPath);
          if (nodes.length === 0) {
            output = ["(empty directory)"];
          } else {
            output = nodes.map(
              (n) => `${n.node.type === "directory" ? "📁" : "📄"}  ${n.name}`
            );
          }
        } catch {
          output = ["ls: failed to list contents."];
          success = false;
        }
        break;

      case "cd":
        if (!args[1]) {
          output = ["cd: missing destination argument."];
          success = false;
        } else {
          const target = resolveLocalPath(args[1]);
          const ok = changeDirectory(target);
          if (ok) {
            newPath = target;
          } else {
            output = [`cd: no such directory: ${args[1]}`];
            success = false;
          }
        }
        break;

      case "pwd":
        output = [localPath];
        break;

      case "cat":
        if (!args[1]) {
          output = ["cat: missing file name argument."];
          success = false;
        } else {
          const target = resolveLocalPath(args[1]);
          const file = readFile(target);
          if (file) {
            output = file.content.split("\n");
          } else {
            output = [`cat: file not found: ${args[1]}`];
            success = false;
          }
        }
        break;

      case "touch":
        if (!args[1]) {
          output = ["touch: missing filename argument."];
          success = false;
        } else {
          const target = resolveLocalPath(args[1]);
          const ok = writeFile(target, "");
          if (ok) {
            output = [`Created empty file '${args[1]}'`];
          } else {
            output = [`touch: failed to create file: ${args[1]}`];
            success = false;
          }
        }
        break;

      case "write":
        if (!args[1]) {
          output = ["write: missing filename argument."];
          success = false;
        } else if (args.length < 3) {
          output = ["write: missing content. Usage: write <filename> <text content>"];
          success = false;
        } else {
          const content = args.slice(2).join(" ");
          const target = resolveLocalPath(args[1]);
          const ok = writeFile(target, content);
          if (ok) {
            output = [`Written content to file '${args[1]}'`];
          } else {
            output = [`write: failed to write to file: ${args[1]}`];
            success = false;
          }
        }
        break;

      case "mkdir":
        if (!args[1]) {
          output = ["mkdir: missing folder name argument."];
          success = false;
        } else {
          const ok = createDirectory(localPath, args[1]);
          if (ok) {
            output = [`Created directory '${args[1]}'`];
          } else {
            output = ["mkdir: folder already exists or path invalid."];
            success = false;
          }
        }
        break;

      case "rm":
        if (!args[1]) {
          output = ["rm: missing target name argument."];
          success = false;
        } else {
          const target = resolveLocalPath(args[1]);
          const ok = deleteNode(target);
          if (ok) {
            output = [`Removed '${args[1]}'`];
          } else {
            output = [`rm: no such file or directory: ${args[1]}`];
            success = false;
          }
        }
        break;

      case "echo":
        output = [args.slice(1).join(" ")];
        break;

      case "history":
        output = commandHistory.map((cmd, idx) => `  ${idx + 1}  ${cmd}`);
        break;

      case "clear":
        setHistory([]);
        break;

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
          success = false;
        }
        break;

      case "neofetch": {
        const cpuCores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 8) : 8;
        const memoryDetails = getRealMemory();
        const browserName = typeof navigator !== "undefined" ? (navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Safari/WebKit") : "WebKit";
        
        output = [
          "    /\\_/\\          OS: ARESOS WebOS v1.2.0",
          "   ( o.o )         Kernel: Next.js 16 Client-side Runtime",
          "    > ^ <          Uptime: " + getUptimeString(),
          "   /     \\         Host: Advanced AI Agent Interface",
          "  (       )        Shell: custom ares-bash emulator",
          "   `-^-^-'         Browser: " + browserName,
          "                   CPU: AMD/Intel Host Cores (" + cpuCores + " Threads)",
          "                   Memory: " + memoryDetails.used + "MB / " + memoryDetails.total + "MB (JS Heap Mode)",
        ];
        break;
      }

      case "ping": {
        if (!args[1]) {
          output = ["ping: missing target host name. Usage: ping google.com"];
          success = false;
        } else {
          const host = args[1].trim().replace(/^<|>$/g, "").replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, "").replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim();

          historyOutput.push(`${currentUser.username}@aresos:${localPath}$ ${command}`);
          historyOutput.push(`🔍 Querying domain registry coordinates for ${host}...`);
          historyOutput.push("");

          (async () => {
            let resolvedIp = "8.8.8.8";
            try {
              const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
                headers: { accept: "application/dns-json" }
              });
              if (res.ok) {
                const data = await res.json();
                if (data.Answer && data.Answer.length > 0) {
                  const aRecord = data.Answer.find((ans: any) => ans.type === 1);
                  if (aRecord) {
                    resolvedIp = aRecord.data;
                  }
                }
              }
            } catch (err) {
              console.warn("DNS resolution failed, using fallback IP.", err);
              let hash = 0;
              for (let i = 0; i < host.length; i++) {
                hash = host.charCodeAt(i) + ((hash << 5) - hash);
              }
              const ipParts = [
                Math.abs((hash & 0xFF000000) >> 24) % 223 + 1,
                Math.abs((hash & 0x00FF0000) >> 16) % 256,
                Math.abs((hash & 0x0000FF00) >> 8) % 256,
                Math.abs(hash & 0x000000FF) % 254 + 1
              ];
              resolvedIp = ipParts.join(".");
            }

            setPingTarget(host);
            setPingIp(resolvedIp);
            setActiveProgram("ping");
            setHistory((prev) => [
              ...prev,
              `PING ${host} (${resolvedIp}) 56(84) bytes of data.`,
              ""
            ]);
          })();
          return { success: true, newPath: localPath };
        }
        break;
      }

      case "top":
        setActiveProgram("top");
        return { success: true, newPath: localPath };

      case "matrix":
        setActiveProgram("matrix");
        return { success: true, newPath: localPath };

      case "calc":
        if (args.length < 2) {
          output = ["calc: missing mathematical expression. Usage: calc 2 + 2"];
          success = false;
        } else {
          const expr = args.slice(1).join("");
          if (/^[0-9+\-*/%().\s]+$/.test(expr)) {
            try {
              // eslint-disable-next-line no-eval
              const result = eval(expr);
              output = [`${expr} = ${result}`];
            } catch {
              output = ["calc: syntax error in expression."];
              success = false;
            }
          } else {
            output = ["calc: insecure characters detected in expression."];
            success = false;
          }
        }
        break;

      case "weather": {
        let queryCity = args[1] ? args.slice(1).join(" ") : "";
        queryCity = queryCity.trim().replace(/^<|>$/g, "").replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, "").replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim();

        historyOutput.push(`${currentUser.username}@aresos:${localPath}$ ${command}`);
        historyOutput.push("📡 Initiating connection with orbital weather satellites...");
        historyOutput.push("🛰️ Resolving location coordinates...");

        setTimeout(() => {
          setHistory((prev) => [...prev, "⚡ Calibrating thermal sensor arrays... [OK]"]);
        }, 350);
        setTimeout(() => {
          setHistory((prev) => [...prev, "🔓 Bypassing atmospheric distortion filters... [CONNECTED]"]);
        }, 700);
        setTimeout(() => {
          setHistory((prev) => [...prev, "📊 Downloading telemetry packets: [████████████████] 100%"]);
        }, 1100);
        setTimeout(() => {
          setHistory((prev) => [...prev, "🧬 Synthesizing weather matrix... [READY]", ""]);
        }, 1450);

        const getWeatherCondition = (code: number): { condition: string; ascii: string } => {
          if (code === 0) return { condition: "Clear Sky ☀️", ascii: "      \\   /\n       .-.\n    ― (   ) ―\n       `-’\n      /   \\" };
          if (code === 1) return { condition: "Mainly Clear 🌤️", ascii: "      \\   /\n       .-.\n    ― (   ) ―\n       `-’\n      /   \\" };
          if (code === 2) return { condition: "Partly Cloudy ⛅", ascii: "      \\   /\n    _ /.-.\n   ( (   )\n    (______)" };
          if (code === 3) return { condition: "Overcast ☁️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)" };
          if ([45, 48].includes(code)) return { condition: "Foggy 🌫️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n  ════════════" };
          if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle 🌧️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n   '  '  '  '\n  '  '  '  '" };
          if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rainy / Showers 🌧️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n   / / / / /\n  / / / / /" };
          if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snowy ❄️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n   *  *  *  *\n  *  *  *  *" };
          if ([95, 96, 99].includes(code)) return { condition: "Thunderstorm ⚡", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n    ⚡ ⚡ ⚡ ⚡\n   / / / / /" };
          return { condition: "Cloudy", ascii: "      .--.\n   .-(    ).\n  (___.___)__)" };
        };

        const getWindDirectionStr = (deg: number): string => {
          const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
          const index = Math.round(((deg % 360) / 22.5)) % 16;
          return directions[index];
        };

        (async () => {
          const startTime = Date.now();
          try {
            let lat = 28.6139;
            let lon = 77.2090;
            let resolvedCity = "New Delhi";
            let resolvedCountry = "India";
            let resolvedTimezone = "Asia/Kolkata";

            if (queryCity) {
              const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=1&language=en`);
              if (!geoRes.ok) throw new Error("Geocoding failed");
              const geoData = await geoRes.json();
              if (!geoData.results || geoData.results.length === 0) {
                const elapsed = Date.now() - startTime;
                if (elapsed < 1600) await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));
                setHistory((prev) => [...prev, `weather: city '${queryCity}' could not be resolved by satellite networks.`, ""]);
                return;
              }
              const location = geoData.results[0];
              lat = location.latitude;
              lon = location.longitude;
              resolvedCity = location.name;
              resolvedCountry = location.country || "";
              resolvedTimezone = location.timezone || "auto";
            } else {
              try {
                const ipRes = await fetch("https://ipapi.co/json/");
                if (ipRes.ok) {
                  const ipData = await ipRes.json();
                  if (ipData.latitude && ipData.longitude) {
                    lat = ipData.latitude;
                    lon = ipData.longitude;
                    resolvedCity = ipData.city || "Detected City";
                    resolvedCountry = ipData.country_name || "";
                    resolvedTimezone = ipData.timezone || "auto";
                  }
                }
              } catch (ipErr) {
                console.warn("IP geolocation failed, falling back to default.", ipErr);
              }
            }

            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`);
            if (!weatherRes.ok) throw new Error("Weather request failed");
            const weatherData = await weatherRes.json();
            const current = weatherData.current;

            if (!current) throw new Error("Invalid weather payload");
            const { condition, ascii } = getWeatherCondition(current.weather_code);
            const windDir = getWindDirectionStr(current.wind_direction_10m);

            const telemetryOutput = [
              `WEATHER TELEMETRY REPORT: ${resolvedCity.toUpperCase()}${resolvedCountry ? `, ${resolvedCountry.toUpperCase()}` : ""}`,
              `Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E | Timezone: ${resolvedTimezone}`,
              `----------------------------------------------------------------------`,
              `Condition: ${condition}`,
              `Temperature: ${current.temperature_2m}°C (Feels like: ${current.apparent_temperature}°C)`,
              `Humidity: ${current.relative_humidity_2m}% | Cloud Cover: ${current.cloud_cover}%`,
              `Wind Speed: ${current.wind_speed_10m} km/h (Direction: ${current.wind_direction_10m}° ${windDir})`,
              `Precipitation: ${current.precipitation} mm`,
              `----------------------------------------------------------------------`,
              `ASCII Satellite Visualization:`,
              ascii,
              `----------------------------------------------------------------------`
            ];

            const elapsed = Date.now() - startTime;
            if (elapsed < 1600) await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));

            setHistory((prev) => [...prev, ...telemetryOutput, ""]);
          } catch (err) {
            console.error(err);
            const elapsed = Date.now() - startTime;
            if (elapsed < 1600) await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));
            setHistory((prev) => [...prev, "weather: orbital telemetry fetch encountered a connection error.", ""]);
          }
        })();
        return { success: true, newPath: localPath };
      }

      default:
        output = [`sh: command not found: ${cmd}. Type 'help' for command list.`];
        success = false;
        break;
    }

    if (cmd !== "clear") {
      historyOutput.push(`${currentUser.username}@aresos:${localPath}$ ${command}`);
      historyOutput.push(...output);
      historyOutput.push("");
    }

    return { success, newPath };
  };

  const handleCommandExecute = async (commandLine: string) => {
    const parsed = parseCommandLine(commandLine);
    let lastSuccess = true;
    let localPath = currentPath;
    const allNewHistory: string[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const { cmdText, operator } = parsed[i];
      if (!cmdText) continue;

      if (i > 0) {
        const prevOperator = parsed[i - 1].operator;
        if (prevOperator === "&&" && !lastSuccess) continue;
        if (prevOperator === "||" && lastSuccess) continue;
      }

      // Execute single command
      const result = await executeSingleCommand(cmdText, localPath, allNewHistory);
      lastSuccess = result.success;
      localPath = result.newPath;

      // Break if an interactive subprogram starts
      const firstWord = cmdText.trim().toLowerCase().split(/\s+/)[0];
      if (["matrix", "top", "ping", "weather"].includes(firstWord)) {
        break;
      }
    }

    if (allNewHistory.length > 0) {
      setHistory((prev) => [...prev, ...allNewHistory]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        setCommandHistory((prev) => {
          const next = [...prev];
          if (next[next.length - 1] !== command) {
            next.push(command);
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
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
