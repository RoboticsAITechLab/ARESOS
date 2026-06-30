"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface Track {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  lyrics?: string;
}

const DEFAULT_LYRICS_1 = 
  "System initialization complete\n" +
  "Syncing quantum audio frequency\n" +
  "Alpha wave delta decay factor: a = b + g * d\n" +
  "E equals m c squared: energy bounds\n" +
  "Faraday induction: curl of E is minus partial B partial t\n" +
  "Planck constant limits: h-bar constant vector\n" +
  "Matrix stream established: resonance loop";

const DEFAULT_LYRICS_2 =
  "Resonating through the hyperdrive grid\n" +
  "Omega frequency threshold reached: w = 2 * pi * f\n" +
  "Schrodinger wave function collapse: psi squared\n" +
  "Thermodynamics entropy delta S is greater than zero\n" +
  "Light speed bound: lambda times nu is c\n" +
  "Infinite limits: limit as x approaches infinity of one over x is zero";

const DEFAULT_PLAYLIST: Track[] = [
  { 
    id: "synth-1", 
    title: "Lofi Synthwave BGM", 
    artist: "Lofi Girl", 
    youtubeId: "4xDzrJKXOOY",
    lyrics: DEFAULT_LYRICS_1
  },
  { 
    id: "synth-2", 
    title: "Resonance", 
    artist: "HOME", 
    youtubeId: "8GW6sLrK40k",
    lyrics: DEFAULT_LYRICS_2
  },
  { 
    id: "synth-3", 
    title: "Sunset Highway", 
    artist: "Neon Retro", 
    youtubeId: "2MH-g1H0X_g",
    lyrics: "Driving down the cyber grid\nGrid lines: x squared plus y squared equals r squared\nHyperdrive booster: delta v approach\nSunset wavelength: lambda equals seven hundred nanometers"
  }
];

const GREEK_MAP: Record<string, string> = {
  a: "α", b: "β", c: "ψ", d: "δ", e: "ε", f: "φ", g: "γ", h: "η", 
  i: "ι", j: "ξ", k: "κ", l: "λ", m: "μ", n: "ν", o: "ο", p: "π", 
  q: "θ", r: "ρ", s: "σ", t: "τ", u: "υ", v: "ν", w: "ω", x: "ξ", 
  y: "ψ", z: "ζ"
};

const MATH_SYMBOLS = ["π", "Σ", "Ω", "Δ", "∞", "∫", "√", "∂", "∇", "ψ", "Φ", "Ξ", "λ", "μ", "σ", "ℏ"];

export default function MusicPlayer() {
  const { settings, updateSettings, addNotification } = useOS();
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Custom Add Form States
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newLyrics, setNewLyrics] = useState("");

  // Playback timer (simulated in seconds)
  const [playbackTime, setPlaybackTime] = useState(0);

  // Download Simulation States
  const [downloadingTrack, setDownloadingTrack] = useState<Track | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadPhase, setDownloadPhase] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const playbackTimerRef = useRef<any>(null);

  // Load / Save playlist
  useEffect(() => {
    const saved = localStorage.getItem("aresos_music_playlist");
    if (saved) {
      try {
        setPlaylist(JSON.parse(saved));
      } catch (e) {
        setPlaylist(DEFAULT_PLAYLIST);
      }
    } else {
      setPlaylist(DEFAULT_PLAYLIST);
      localStorage.setItem("aresos_music_playlist", JSON.stringify(DEFAULT_PLAYLIST));
    }
  }, []);

  const savePlaylist = (updated: Track[]) => {
    setPlaylist(updated);
    localStorage.setItem("aresos_music_playlist", JSON.stringify(updated));
  };

  const currentTrack = playlist[currentTrackIndex] || null;

  // Track playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying]);

  // Reset timer on song change
  useEffect(() => {
    setPlaybackTime(0);
  }, [currentTrackIndex]);

  // Convert normal text lyric string to Greek/Math symbol string
  const convertTextToGreekSymbols = (text: string): string => {
    return text
      .split("")
      .map((char) => {
        const lower = char.toLowerCase();
        return GREEK_MAP[lower] || char;
      })
      .join("");
  };

  // Get active lyric line based on timer
  const getActiveLyric = (): string => {
    if (!currentTrack || !currentTrack.lyrics) {
      return "σψσταμ αψταvψ = c  Δt"; // default sci-fi noise
    }
    const lines = currentTrack.lyrics.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return "σψσταμ αψταvψ";
    const lineIndex = Math.floor(playbackTime / 4) % lines.length; // switch line every 4 seconds
    return lines[lineIndex];
  };

  // Visualizer Animation rendering math/physics symbols & reactive lyrics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const colsCount = 18;
    const colWidth = width / colsCount;
    const columnHeights = Array(colsCount).fill(10);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Get current lyric text and its Greek representation
      const rawLyric = getActiveLyric();
      const greekLyric = convertTextToGreekSymbols(rawLyric);

      // 1. Draw Columns of Random Reacting Math Symbols
      for (let c = 0; c < colsCount; c++) {
        if (isPlaying) {
          const target = Math.random() * (height - 35) + 10;
          columnHeights[c] += (target - columnHeights[c]) * 0.22;
        } else {
          columnHeights[c] += (6 - columnHeights[c]) * 0.1;
        }

        const colHeight = columnHeights[c];
        const x = c * colWidth + colWidth / 2;

        const symbolSize = 12;
        const count = Math.ceil(colHeight / (symbolSize + 2));

        for (let i = 0; i < count; i++) {
          const charCode = (c * 7 + i * 3) % MATH_SYMBOLS.length;
          const symbol = MATH_SYMBOLS[charCode];
          const y = height - (i * (symbolSize + 3)) - 5;

          const ratio = i / Math.max(1, count);
          let color = "#4f46e5"; // Indigo bottom
          if (ratio > 0.75) {
            color = "#00ffff"; // Cyan top
          } else if (ratio > 0.35) {
            color = "#ff00ff"; // Pink mid
          }

          ctx.save();
          ctx.font = `bold ${symbolSize}px monospace`;
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          if (isPlaying) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = color;
          }

          ctx.fillText(symbol, x, y);
          ctx.restore();
        }
      }

      // 2. Draw Reactive Overlay of Math/Greek Lyrics
      if (isPlaying) {
        ctx.save();
        const baseSize = 15;
        const bounceOffset = Math.sin(performance.now() * 0.008) * 4;
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";
        ctx.fillStyle = "#ffffff";
        
        ctx.font = `bold ${baseSize}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Display translated Greek symbol lyric line
        ctx.fillText(greekLyric, width / 2, height * 0.35 + bounceOffset);

        // Display original English text lyric line underneath in small font
        ctx.font = `bold 10px monospace`;
        ctx.fillStyle = "#ec4899";
        ctx.shadowColor = "#ec4899";
        ctx.fillText(rawLyric.toUpperCase(), width / 2, height * 0.35 + 20 + bounceOffset);

        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [isPlaying, currentTrackIndex, playlist, playbackTime]);

  const handlePlayPause = () => {
    if (playlist.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIdx);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIdx);
    setIsPlaying(true);
  };

  const handleTrackSelect = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : "";
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = extractYoutubeId(newUrl.trim());
    if (!parsedId) {
      addNotification("Music Player", "Invalid YouTube URL format", "error");
      return;
    }

    const title = newTitle.trim() || `YouTube Track (${parsedId})`;
    const artist = newArtist.trim() || "Unknown Artist";

    const newTrack: Track = {
      id: `custom-${Date.now()}`,
      title,
      artist,
      youtubeId: parsedId,
      lyrics: newLyrics.trim() || "No custom equations provided\nx squared plus y squared equals r squared"
    };

    const updated = [...playlist, newTrack];
    savePlaylist(updated);
    
    // Select the new track
    setCurrentTrackIndex(updated.length - 1);
    setIsPlaying(true);

    addNotification("Music Player", `Added track: ${title}`, "success");

    setNewTitle("");
    setNewArtist("");
    setNewUrl("");
    setNewLyrics("");
  };

  const handleDeleteTrack = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = playlist.filter((_, idx) => idx !== index);
    savePlaylist(updated);
    
    if (currentTrackIndex >= updated.length) {
      setCurrentTrackIndex(Math.max(0, updated.length - 1));
    }
    
    if (updated.length === 0) {
      setIsPlaying(false);
    }
    
    addNotification("Music Player", "Track removed from playlist", "info");
  };

  // Simulate Cyberpunk Audio Decryptor & File Downloader
  const handleDownloadSimulation = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadingTrack) return;

    setDownloadingTrack(track);
    setDownloadProgress(0);
    setDownloadPhase("ESTABLISHING SECURE COMMS LINK...");

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        
        if (next >= 100) {
          clearInterval(interval);
          setDownloadPhase("PACKING RETRO MP3 VESSEL...");
          
          setTimeout(() => {
            // Trigger actual simulated file generation and download
            const audioData = new Uint8Array([82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69]);
            const blob = new Blob([audioData], { type: "audio/mp3" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${track.title.replace(/\s+/g, "_")}.mp3`;
            link.click();

            addNotification("Music Player", `Successfully downloaded ${track.title}`, "success");
            setDownloadingTrack(null);
          }, 600);

          return 100;
        }

        // Set different phases based on progress
        if (next < 30) setDownloadPhase("DECRYPTING YOUTUBE AUDIO CONTAINER...");
        else if (next < 70) setDownloadPhase(`DOWNLOADING BITSTREAM FLUID: ${next}%`);
        else setDownloadPhase("INJECTING RETRO SYNTH METADATA...");

        return next;
      });
    }, 150);
  };

  return (
    <div className="w-full h-full bg-[#03000a] text-white flex flex-col font-mono p-4 border border-indigo-900/40 relative overflow-hidden select-none">
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#08001a_1px,transparent_1px),linear-gradient(to_bottom,#08001a_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-25 pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center z-10 border-b border-indigo-900/60 pb-3 mb-4">
        <div>
          <h2 className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
            NEON SYNTH PLAYER
          </h2>
          <p className="text-[10px] text-cyan-400 tracking-widest">CYBERPUNK AUDIO TERMINAL</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-pink-500 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded">
            {isPlaying ? "PLAYING" : "STANDBY"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1 overflow-hidden min-h-0 z-10">
        
        {/* Left Side: Visualizer, Video monitor, and Player controls */}
        <div className="md:col-span-3 flex flex-col gap-4 min-h-0">
          
          {/* Visualizer Display Screen */}
          <div className="flex-1 bg-black/60 rounded-xl border border-indigo-950/80 p-3 flex flex-col justify-between relative overflow-hidden">
            
            {/* Visualizer Wave Canvas */}
            <canvas ref={canvasRef} className="w-full h-24 mt-4 flex-1" />

            {/* Embed Video Monitor */}
            <div className="absolute top-2 right-2 w-28 h-16 border border-cyan-500/30 rounded-lg overflow-hidden bg-black shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center justify-center">
              {currentTrack && isPlaying ? (
                <iframe
                  src={`https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=1&loop=1&playlist=${currentTrack.youtubeId}&mute=0&controls=0&modestbranding=1&enablejsapi=1`}
                  className="w-full h-full scale-[1.3] pointer-events-none"
                  allow="autoplay"
                />
              ) : (
                <span className="text-[8px] text-slate-500 font-bold uppercase">No Feed</span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-indigo-955/60 pt-2.5">
              {currentTrack ? (
                <div className="truncate pr-24">
                  <div className="text-xs font-bold text-cyan-400 truncate">{currentTrack.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{currentTrack.artist}</div>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-500">PLAYLIST EMPTY</div>
              )}
              <div className="text-[10px] font-bold text-pink-500 animate-pulse">
                {isPlaying ? "LIVE FEED" : "PAUSED"}
              </div>
            </div>
          </div>

          {/* Player controls */}
          <div className="bg-[#090514]/80 border border-indigo-955/40 p-3.5 rounded-xl flex flex-col gap-3">
            
            {/* Audio Buttons */}
            <div className="flex justify-center items-center gap-6">
              <button
                onClick={handlePrev}
                className="p-2.5 bg-indigo-955/20 border border-indigo-500/20 hover:border-cyan-400 hover:text-cyan-400 rounded-lg transition cursor-pointer"
              >
                ⏮
              </button>
              <button
                onClick={handlePlayPause}
                className={`p-4 rounded-full transition cursor-pointer font-bold text-xl flex items-center justify-center w-14 h-14 ${
                  isPlaying 
                    ? "bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]" 
                    : "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                }`}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button
                onClick={handleNext}
                className="p-2.5 bg-indigo-955/20 border border-indigo-500/20 hover:border-cyan-400 hover:text-cyan-400 rounded-lg transition cursor-pointer"
              >
                ⏭
              </button>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">VOL</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                className="flex-1 accent-cyan-400 bg-indigo-955/80 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <span className="text-xs font-bold text-cyan-400 w-8 text-right">{settings.volume}%</span>
            </div>
          </div>

        </div>

        {/* Right Side: Playlist and Add Form */}
        <div className="md:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Playlist Container */}
          <div className="flex-1 bg-slate-955/10 border border-indigo-955/40 rounded-xl p-3 flex flex-col min-h-0">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest block mb-2">CYBER PLAYLIST</span>
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
              {playlist.length === 0 ? (
                <div className="text-center text-slate-600 text-xs italic mt-8">No tracks in list.</div>
              ) : (
                playlist.map((track, idx) => {
                  const isActive = idx === currentTrackIndex;
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackSelect(idx)}
                      className={`w-full text-left p-2 rounded-lg border text-xs flex justify-between items-center transition cursor-pointer ${
                        isActive 
                          ? "bg-indigo-955/35 border-cyan-400/80 text-cyan-300"
                          : "bg-black/40 border-transparent hover:bg-indigo-955/20 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold truncate">{track.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{track.artist}</div>
                      </div>
                      
                      <div className="flex gap-2 flex-shrink-0">
                        {/* Download button */}
                        <button
                          onClick={(e) => handleDownloadSimulation(track, e)}
                          title="Download Track"
                          className="hover:text-emerald-400 p-1 text-slate-500 transition cursor-pointer"
                        >
                          ⬇️
                        </button>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteTrack(idx, e)}
                          title="Remove Track"
                          className="hover:text-rose-500 p-1 text-slate-500 transition cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Custom YouTube Loader Form */}
          <form onSubmit={handleAddTrack} className="bg-slate-955/10 border border-indigo-955/40 p-3 rounded-xl flex flex-col gap-2 overflow-y-auto pr-1">
            <label className="text-[10px] text-slate-400 font-bold tracking-widest">ADD YOUTUBE COMMS TRACK</label>
            <input
              type="text"
              placeholder="YouTube URL / Link"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="bg-black/60 border border-indigo-950/80 text-[10px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 w-full"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Song Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-black/60 border border-indigo-950/80 text-[10px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Artist Name"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                className="bg-black/60 border border-indigo-950/80 text-[10px] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
              />
            </div>
            <textarea
              placeholder="Track Equations / Lyrics (one phrase per line)"
              value={newLyrics}
              onChange={(e) => setNewLyrics(e.target.value)}
              rows={2}
              className="bg-black/60 border border-indigo-950/80 text-[9px] px-2.5 py-1 rounded-lg focus:outline-none focus:border-cyan-500 w-full resize-none font-mono"
            />
            <button
              type="submit"
              className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              ➕ LOAD INTO PLAYLIST
            </button>
          </form>

        </div>

      </div>

      {/* DOWNLOAD PROGRESS MODAL */}
      {downloadingTrack && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 font-mono border border-cyan-500/20">
          <div className="w-full max-w-sm bg-slate-900/90 border border-cyan-500/40 p-6 rounded-2xl text-center shadow-2xl backdrop-blur-xl relative">
            <h3 className="text-sm font-black text-cyan-400 tracking-widest mb-1 uppercase">
              CYBER DECRYPTOR & EXTRACTOR
            </h3>
            <p className="text-[10px] text-slate-400 mb-6 truncate">{downloadingTrack.title}</p>
            
            <div className="w-full bg-slate-950 border border-cyan-950 h-6 rounded-full overflow-hidden relative mb-4">
              <div 
                style={{ width: `${downloadProgress}%` }}
                className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 h-full transition-all duration-150"
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-difference">
                {downloadProgress}%
              </span>
            </div>

            <div className="text-[10px] text-emerald-400 uppercase tracking-widest animate-pulse h-4 mb-6">
              {downloadPhase}
            </div>

            {/* External downloader fallback link */}
            <a
              href={`https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${downloadingTrack.youtubeId}&f=mp3`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-indigo-400 hover:text-indigo-300 underline font-bold"
            >
              Real MP3 conversion link (External)
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
