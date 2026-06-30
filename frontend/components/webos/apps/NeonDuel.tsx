"use client";

import React, { useState, useEffect, useRef } from "react";
import { NeonDuelEngine, AudioSynth, ShipType, ArenaTheme, AIDifficulty } from "@/games/neon-duel/NeonDuelEngine";

interface NeonDuelProps {
  pid: string;
}

interface LeaderboardEntry {
  winner: string;
  p1Score: number;
  p2Score: number;
  date: string;
}

interface ShipSkin {
  id: string;
  name: string;
  p1Color: string;
  p2Color: string;
  cost: number;
  description: string;
}

const SHIP_SKINS: ShipSkin[] = [
  { id: "default", name: "Default Neon", p1Color: "#06b6d4", p2Color: "#ec4899", cost: 0, description: "Classic Cyan & Pink battle colors" },
  { id: "vaporwave", name: "Vaporwave Retro", p1Color: "#ff71ce", p2Color: "#b967ff", cost: 150, description: "Retro-synth Hot Pink & Purple" },
  { id: "matrix", name: "Matrix Overload", p1Color: "#39ff14", p2Color: "#00ff87", cost: 250, description: "Cyber-hacker radioactive greens" },
  { id: "solar", name: "Solar Flare", p1Color: "#ff5e00", p2Color: "#ffea00", cost: 350, description: "High-temperature Star Flare colors" },
  { id: "plasma", name: "Plasma Shield", p1Color: "#9d4edd", p2Color: "#e2e8f0", cost: 500, description: "Supercharged violet & chrome aura" }
];

export default function NeonDuel({ pid }: NeonDuelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<NeonDuelEngine | null>(null);
  const audioRef = useRef<AudioSynth | null>(null);
  const requestRef = useRef<number | null>(null);

  // Game UI States
  const [screen, setScreen] = useState<"menu" | "config" | "playing" | "gameover">("menu");
  const [gameMode, setGameMode] = useState<"solo" | "duo">("solo");
  const [p1Type, setP1Type] = useState<ShipType>("interceptor");
  const [p2Type, setP2Type] = useState<ShipType>("interceptor");
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("normal");
  const [showShop, setShowShop] = useState(false);
  const [credits, setCredits] = useState(0);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(["default"]);
  const [selectedSkinId, setSelectedSkinId] = useState<string>("default");
  const [arenaTheme, setArenaTheme] = useState<ArenaTheme>("cybergrid");
  const [p1Hp, setP1Hp] = useState(3);
  const [p2Hp, setP2Hp] = useState(3);
  const [p1MaxHp, setP1MaxHp] = useState(3);
  const [p2MaxHp, setP2MaxHp] = useState(3);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timerStr, setTimerStr] = useState("02:00");
  const [statusMsg, setStatusMsg] = useState("");
  const [winnerStr, setWinnerStr] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [soundMuted, setSoundMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [ytBgmUrl, setYtBgmUrl] = useState("");
  const [ytVideoId, setYtVideoId] = useState("");

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "";
  };

  const handleYtBgmChange = (url: string) => {
    setYtBgmUrl(url);
    const id = extractYoutubeId(url);
    setYtVideoId(id);
    if (id && audioRef.current) {
      audioRef.current.stopBGM();
    } else if (!id && audioRef.current && !musicMuted) {
      audioRef.current.startBGM();
    }
  };

  // Initialize Audio Synth
  useEffect(() => {
    audioRef.current = new AudioSynth();
    
    // Load leaderboard
    const saved = localStorage.getItem("neon_duel_leaderboard");
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // Load credits
    const savedCredits = localStorage.getItem("neon_duel_credits");
    if (savedCredits) setCredits(parseInt(savedCredits));

    // Load unlocked skins
    const savedSkins = localStorage.getItem("neon_duel_unlocked_skins");
    if (savedSkins) {
      try {
        setUnlockedSkins(JSON.parse(savedSkins));
      } catch (e) {
        console.error(e);
      }
    }

    // Load selected skin
    const savedSelected = localStorage.getItem("neon_duel_selected_skin");
    if (savedSelected) setSelectedSkinId(savedSelected);

    return () => {
      if (audioRef.current) {
        audioRef.current.cleanup();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Sync mute state to audio synth
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setMute(soundMuted);
    }
  }, [soundMuted]);

  // Main game loop runner
  const gameLoop = () => {
    if (engineRef.current && screen === "playing" && countdown === null) {
      engineRef.current.update();
      engineRef.current.draw();
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (screen === "playing" && countdown === null) {
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [screen, countdown]);

  const selectMode = (mode: "solo" | "duo") => {
    setGameMode(mode);
    setScreen("config");
  };

  const setShipDesign = (player: 1 | 2, type: ShipType) => {
    if (player === 1) setP1Type(type);
    else setP2Type(type);
  };

  const startCountdown = (callback: () => void) => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev <= 1) {
          clearInterval(interval);
          callback();
          return null;
        }
        return prev - 1;
      });
    }, 800);
  };

  const launchGame = () => {
    setScreen("playing");
    setStatusMsg("INITIALIZING CYBER-DUEL");

    const currentSkin = SHIP_SKINS.find(s => s.id === selectedSkinId) || SHIP_SKINS[0];

    startCountdown(() => {
      setStatusMsg("DUEL ACTIVE");
      if (canvasRef.current && audioRef.current) {
        const engine = new NeonDuelEngine(
          canvasRef.current,
          {
            mode: gameMode,
            theme: arenaTheme,
            p1Type,
            p2Type,
            aiDifficulty,
            p1Color: currentSkin.p1Color,
            p2Color: currentSkin.p2Color,
          },
          audioRef.current,
          {
             onGameOver: (winner, s1, s2) => {
               setWinnerStr(winner);
               setP1Score(s1);
               setP2Score(s2);
               setScreen("gameover");
 
               // Award credits
               const isP1Winner = winner === "PLAYER 1";
               const creditsEarned = isP1Winner ? 50 : 20;
               setCredits((prev) => {
                 const next = prev + creditsEarned;
                 localStorage.setItem("neon_duel_credits", next.toString());
                 return next;
               });

              // Save to leaderboard
              const newEntry: LeaderboardEntry = {
                winner,
                p1Score: s1,
                p2Score: s2,
                date: new Date().toLocaleDateString(),
              };
              setLeaderboard((prev) => {
                const updated = [newEntry, ...prev].slice(0, 10);
                localStorage.setItem("neon_duel_leaderboard", JSON.stringify(updated));
                return updated;
              });
            },
            onTimerUpdate: (timeStr) => {
              setTimerStr(timeStr);
            },
            onScoreUpdate: (s1, s2) => {
              setP1Score(s1);
              setP2Score(s2);
            },
            onHpUpdate: (h1, h2) => {
              setP1Hp(h1);
              setP2Hp(h2);
            },
            onStatusMsg: (msg) => {
              setStatusMsg(msg);
              setTimeout(() => setStatusMsg(""), 3000);
            },
          }
        );

        setP1MaxHp(p1Type === "goliath" ? 4 : 3);
        setP2MaxHp(p2Type === "goliath" ? 4 : 3);
        engineRef.current = engine;

        // Start BGM
        if (!musicMuted && audioRef.current && !ytVideoId) {
          audioRef.current.startBGM();
        }

        // Setup Key listeners
        const handleKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e.key);
        const handleKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e.key);

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        engineRef.current.cleanupListeners = () => {
          window.removeEventListener("keydown", handleKeyDown);
          window.removeEventListener("keyup", handleKeyUp);
        };
      }
    });
  };

  // Clean up engine components on screen changes
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        if ((engineRef.current as any).cleanupListeners) {
          (engineRef.current as any).cleanupListeners();
        }
        engineRef.current.audio.stopBGM();
      }
    };
  }, [screen]);

  const toggleSound = () => {
    setSoundMuted((prev) => !prev);
  };

  const toggleMusic = () => {
    setMusicMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        if (next) audioRef.current.stopBGM();
        else if (screen === "playing") audioRef.current.startBGM();
      }
      return next;
    });
  };

  const showMainMenu = () => {
    if (engineRef.current) {
      engineRef.current.audio.stopBGM();
    }
    setScreen("menu");
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#05050a] text-white relative font-sans overflow-hidden select-none">
      
      {/* Sound Controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10">
        <button
          onClick={toggleMusic}
          className={`p-2 hover:bg-white/10 rounded-md transition duration-200 ${
            musicMuted ? "text-slate-500" : "text-cyan-400"
          }`}
          title="Toggle Synthwave Music"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </button>
        <button
          onClick={toggleSound}
          className={`p-2 hover:bg-white/10 rounded-md transition duration-200 ${
            soundMuted ? "text-slate-500" : "text-cyan-400"
          }`}
          title="Toggle SFX"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            {soundMuted ? (
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 3.28-2 6.09-4.87 7.25l1.09 1.09C18.99 18.72 21 15.6 21 12s-2.01-6.72-4.78-8.34l-1.09 1.09C17 5.91 19 8.72 19 12zM3 9v6h4l5 5V4L7 9H3z" />
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            )}
          </svg>
        </button>
      </div>

      {/* Hidden YouTube Player */}
      {ytVideoId && !musicMuted && (
        <iframe
          src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&loop=1&playlist=${ytVideoId}`}
          className="absolute opacity-0 pointer-events-none w-1 h-1"
          allow="autoplay"
        />
      )}

      {/* 1. MAIN MENU SCREEN */}
      {screen === "menu" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-zinc-950 to-black px-4 overflow-y-auto">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none"></div>

          <div className="text-center mb-8 relative">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <h1 className="text-5xl md:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 uppercase animate-pulse select-none font-mono">
              NEON DUEL
            </h1>
            <p className="text-cyan-400 tracking-[0.3em] font-semibold text-xs md:text-sm mt-2 font-mono">
              CYBERPUNK ARENA COMBAT
            </p>
          </div>

          <div className="w-full max-w-md flex flex-col gap-4 z-10 px-4">
            <button
              onClick={() => selectMode("solo")}
              className="group relative overflow-hidden bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border-2 border-cyan-500/60 p-5 rounded-xl transition duration-300 transform hover:scale-102 flex items-center justify-between"
            >
              <div className="text-left">
                <span className="font-bold text-lg md:text-xl tracking-wider text-cyan-400 flex items-center gap-2 font-mono">
                  SOLO PLAY
                </span>
                <p className="text-xs text-slate-400 mt-1">Fight the adaptive Cyber-AI</p>
              </div>
              <span className="text-cyan-400 text-xl font-bold">→</span>
            </button>

            <button
              onClick={() => selectMode("duo")}
              className="group relative overflow-hidden bg-gradient-to-r from-pink-950/40 to-slate-900/60 border-2 border-pink-500/60 p-5 rounded-xl transition duration-300 transform hover:scale-102 flex items-center justify-between"
            >
              <div className="text-left">
                <span className="font-bold text-lg md:text-xl tracking-wider text-pink-400 flex items-center gap-2 font-mono">
                  LOCAL DUO
                </span>
                <p className="text-xs text-slate-400 mt-1">1v1 combat on a single device</p>
              </div>
              <span className="text-pink-400 text-xl font-bold">→</span>
            </button>

            {/* Shop Button */}
            <button
              onClick={() => setShowShop(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-purple-950/40 to-slate-900/60 border-2 border-purple-500/60 p-4 rounded-xl transition duration-300 transform hover:scale-[1.02] flex items-center justify-between cursor-pointer"
            >
              <div className="text-left flex items-center gap-3">
                <span className="text-xl">🎨</span>
                <div className="text-left">
                  <span className="font-bold text-sm tracking-wider text-purple-400 font-mono block">
                    SHIP COSMETICS SHOP
                  </span>
                  <p className="text-[9px] text-slate-400">Spend cyber-credits to unlock premium ship skins</p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-400 font-mono bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded">
                {credits} CR
              </span>
            </button>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
              <div className="bg-slate-900/40 border border-white/5 p-3 rounded-lg">
                <span className="text-cyan-400 font-bold block mb-1">P1 CONTROLS</span>
                <span className="text-slate-300">
                  Move: <b className="text-white font-semibold">WASD</b>
                  <br />
                  Shoot: <b className="text-white font-semibold">Space / V</b>
                </span>
              </div>
              <div className="bg-slate-900/40 border border-white/5 p-3 rounded-lg">
                <span className="text-pink-400 font-bold block mb-1">P2/AI CONTROLS</span>
                <span className="text-slate-300">
                  Move: <b className="text-white font-semibold">Arrows</b>
                  <br />
                  Shoot: <b className="text-white font-semibold">Enter / M</b>
                </span>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="mt-4 bg-slate-950/80 border border-white/10 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2 flex items-center gap-2 font-mono">
                🏆 Cyber Leaderboard
              </h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-sm text-slate-300 font-mono">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No matches simulated yet.</p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={index} className="flex justify-between border-b border-white/5 py-1 text-xs">
                      <span>{entry.winner} WIN</span>
                      <span className="text-slate-400">
                        ({entry.p1Score} - {entry.p2Score}) {entry.date}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIGURATION SCREEN */}
      {screen === "config" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/95 px-4 overflow-y-auto font-mono">
          <div className="w-full max-w-2xl bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tracking-wider text-center mb-6">
              PREPARE COMBATANTS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* P1 Configuration */}
              <div className="bg-black/50 p-4 rounded-xl border border-cyan-500/30 flex flex-col items-center">
                <span className="text-sm font-bold text-cyan-400 mb-3 tracking-widest">
                  PLAYER 1 (CYAN)
                </span>
                <div className="flex gap-2 mb-4 w-full justify-center">
                  <button
                    onClick={() => setShipDesign(1, "interceptor")}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                      p1Type === "interceptor"
                        ? "bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300"
                        : "bg-slate-900 border border-slate-700 text-slate-400"
                    }`}
                  >
                    INTERCEPTOR
                  </button>
                  <button
                    onClick={() => setShipDesign(1, "goliath")}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                      p1Type === "goliath"
                        ? "bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300"
                        : "bg-slate-900 border border-slate-700 text-slate-400"
                    }`}
                  >
                    GOLIATH
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 text-center italic">
                  {p1Type === "interceptor"
                    ? "Interceptor: Nimble, faster speed, quick cooldown."
                    : "Goliath: Heavily armored, more health, slower recharge, hits harder."}
                </div>
              </div>

              {/* P2 Configuration / AI Difficulty */}
              <div className="bg-black/50 p-4 rounded-xl border border-pink-500/30 flex flex-col items-center">
                <span className="text-sm font-bold text-pink-400 mb-3 tracking-widest">
                  {gameMode === "solo" ? "CYBER-AI (PINK)" : "PLAYER 2 (PINK)"}
                </span>

                {gameMode === "solo" && (
                  <div className="w-full mb-3">
                    <label className="block text-center text-xs text-slate-400 mb-1">
                      INTELLIGENCE
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["easy", "normal", "hard"] as AIDifficulty[]).map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setAiDifficulty(diff)}
                          className={`py-1 text-[10px] rounded font-semibold border ${
                            aiDifficulty === diff
                              ? "bg-pink-500/20 border-pink-400 text-pink-300"
                              : "bg-slate-950 border-slate-800 text-slate-400"
                          }`}
                        >
                          {diff.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 w-full justify-center mb-4">
                  <button
                    onClick={() => setShipDesign(2, "interceptor")}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                      p2Type === "interceptor"
                        ? "bg-pink-500/20 border-2 border-pink-400 text-pink-300"
                        : "bg-slate-900 border border-slate-700 text-slate-400"
                    }`}
                  >
                    INTERCEPTOR
                  </button>
                  <button
                    onClick={() => setShipDesign(2, "goliath")}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                      p2Type === "goliath"
                        ? "bg-pink-500/20 border-2 border-pink-400 text-pink-300"
                        : "bg-slate-900 border border-slate-700 text-slate-400"
                    }`}
                  >
                    GOLIATH
                  </button>
                </div>
              </div>
            </div>

            {/* Arena Theme Selector */}
            <div className="mb-6">
              <span className="text-xs font-bold text-slate-400 block text-center mb-2 tracking-widest">
                SELECT ARENA DECAY ZONE
              </span>
              <div className="grid grid-cols-3 gap-3">
                {(["cybergrid", "hyperdrive", "abyss"] as ArenaTheme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setArenaTheme(theme)}
                    className={`py-2 px-3 rounded text-xs font-semibold border transition ${
                      arenaTheme === theme
                        ? "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    {theme.replace("grid", " grid").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom BGM Input */}
            <div className="mb-6 font-mono text-left">
              <span className="text-xs font-bold text-slate-400 block text-center mb-2 tracking-widest">
                CUSTOM SOUNDTRACK (YOUTUBE URL)
              </span>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytBgmUrl}
                onChange={(e) => handleYtBgmChange(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500 w-full"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={showMainMenu}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-bold tracking-wider text-sm transition"
              >
                BACK TO MENU
              </button>
              <button
                onClick={launchGame}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white rounded-xl font-extrabold tracking-widest text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition"
              >
                LAUNCH DUEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN GAME SCREEN */}
      {screen === "playing" && (
        <div className="w-full h-full flex flex-col items-center justify-between p-4 bg-[#020205]">
          
          {/* Header Display */}
          <div className="w-full max-w-5xl flex justify-between items-center z-10 font-mono">
            {/* P1 HP */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xs font-bold text-cyan-400 tracking-wider">CYAN PILOT</span>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: p1MaxHp }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-2 rounded transition-all duration-300 ${
                        i < p1Hp
                          ? "bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,1)]"
                          : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded font-bold text-cyan-400 text-xl">
                {p1Score}
              </div>
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className="font-bold text-2xl tracking-widest text-slate-300">{timerStr}</div>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-yellow-400 h-4">
                {statusMsg}
              </div>
            </div>

            {/* P2 HP */}
            <div className="flex items-center gap-3">
              <div className="bg-pink-500/10 border border-pink-500/30 px-3 py-1 rounded font-bold text-pink-400 text-xl">
                {p2Score}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-pink-400 tracking-wider">
                  {gameMode === "solo" ? "AI MATRIX" : "PINK PILOT"}
                </span>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: p2MaxHp }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-6 h-2 rounded transition-all duration-300 ${
                        i < p2Hp
                          ? "bg-pink-400 shadow-[0_0_5px_rgba(236,72,153,1)]"
                          : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Arena Canvas Container */}
          <div className="flex-1 w-full max-w-5xl relative flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              className="w-full h-full max-h-[75vh] border border-slate-800 rounded-2xl bg-black shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            />

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-2xl">
                <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-500 font-mono">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. GAME OVER SCREEN */}
      {screen === "gameover" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4 font-mono">
          <div className="w-full max-w-md bg-zinc-950 border-2 border-slate-800 p-8 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-36 h-36 bg-pink-500/10 rounded-full blur-3xl"></div>

            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-400 tracking-wider mb-2">
              SYSTEM SHUTDOWN
            </h2>
            <p className="text-slate-400 text-sm tracking-wide mb-6">
              MATCH CONCLUDED: <b className="text-yellow-400">{winnerStr} WIN</b>
            </p>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-6">
              <div className="flex justify-around items-center">
                <div>
                  <span className="text-xs text-cyan-400 block">P1 SCORE</span>
                  <span className="text-3xl font-bold">{p1Score}</span>
                </div>
                <div className="text-slate-600 text-xl font-bold">vs</div>
                <div>
                  <span className="text-xs text-pink-400 block">
                    {gameMode === "solo" ? "AI SCORE" : "P2 SCORE"}
                  </span>
                  <span className="text-3xl font-bold">{p2Score}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={launchGame}
                className="py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white rounded-xl font-extrabold tracking-wider text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={showMainMenu}
                className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl font-bold tracking-wider text-sm text-slate-400 hover:text-white transition"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP MODAL */}
      {showShop && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 px-4 overflow-y-auto font-mono">
          <div className="w-full max-w-xl bg-slate-900/80 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-xl relative">
            <button 
              onClick={() => setShowShop(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-center mb-1 uppercase tracking-widest">
              Cyber Ship Shop
            </h2>
            <div className="text-center text-xs text-slate-400 mb-6">
              ACCUMULATED CREDITS: <span className="text-purple-400 font-bold">{credits} CR</span>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {SHIP_SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isSelected = selectedSkinId === skin.id;

                const handleBuyOrEquip = () => {
                  if (isUnlocked) {
                    setSelectedSkinId(skin.id);
                    localStorage.setItem("neon_duel_selected_skin", skin.id);
                  } else {
                    if (credits >= skin.cost) {
                      const nextCredits = credits - skin.cost;
                      setCredits(nextCredits);
                      localStorage.setItem("neon_duel_credits", nextCredits.toString());

                      const nextUnlocked = [...unlockedSkins, skin.id];
                      setUnlockedSkins(nextUnlocked);
                      localStorage.setItem("neon_duel_unlocked_skins", JSON.stringify(nextUnlocked));

                      setSelectedSkinId(skin.id);
                      localStorage.setItem("neon_duel_selected_skin", skin.id);
                    } else {
                      alert("Insufficient Cyber-Credits!");
                    }
                  }
                };

                return (
                  <div key={skin.id} className="flex justify-between items-center bg-black/50 p-3.5 rounded-xl border border-white/5 hover:border-purple-500/20 transition">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">{skin.name}</span>
                        <div className="flex gap-1">
                          <span style={{ backgroundColor: skin.p1Color }} className="w-3.5 h-2 rounded-sm" />
                          <span style={{ backgroundColor: skin.p2Color }} className="w-3.5 h-2 rounded-sm" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{skin.description}</p>
                    </div>
                    
                    <button
                      onClick={handleBuyOrEquip}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                        isSelected 
                          ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                          : isUnlocked 
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            : "bg-purple-500 hover:bg-purple-400 text-black font-bold"
                      }`}
                    >
                      {isSelected ? "EQUIPPED" : isUnlocked ? "EQUIP" : `BUY: ${skin.cost} CR`}
                    </button>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setShowShop(false)}
              className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              BACK TO GAME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
