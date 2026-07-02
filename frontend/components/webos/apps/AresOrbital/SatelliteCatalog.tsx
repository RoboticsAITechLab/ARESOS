"use client";

import React, { useState, useEffect } from "react";
import { SatelliteInfo, AresOrbitalDataService } from "./AresOrbitalDataService";

interface SatelliteCatalogProps {
  onSelectSatellite: (satellite: SatelliteInfo) => void;
  selectedSatelliteId: number;
}

const GROUPS = [
  { id: "stations", label: "Space Stations" },
  { id: "weather", label: "Weather Satellites" },
  { id: "science", label: "Science & Research" },
  { id: "starlink", label: "Starlink Constellation" }
];

export const SatelliteCatalog: React.FC<SatelliteCatalogProps> = ({
  onSelectSatellite,
  selectedSatelliteId,
}) => {
  const [activeGroup, setActiveGroup] = useState("stations");
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customNorad, setCustomNorad] = useState("");
  const [customTle1, setCustomTle1] = useState("");
  const [customTle2, setCustomTle2] = useState("");

  // Load catalog group TLE elements dynamically from CelesTrak
  useEffect(() => {
    const loadGroup = async () => {
      setLoading(true);
      setError(null);
      const list = await AresOrbitalDataService.fetchCatalogGroup(activeGroup);
      if (list.length > 0) {
        setSatellites(list);
      } else {
        setSatellites([]);
        setError("CATALOG DATA UNAVAILABLE");
      }
      setLoading(false);
    };
    loadGroup();
  }, [activeGroup]);

  const filtered = satellites.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.noradId.toString().includes(searchTerm)
  );

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNorad || !customTle1 || !customTle2) return;
    
    const customItem: SatelliteInfo = {
      name: `CUSTOM OBJ (${customNorad})`,
      noradId: parseInt(customNorad, 10),
      tle1: customTle1.trim(),
      tle2: customTle2.trim(),
      category: "User Target"
    };

    onSelectSatellite(customItem);
    setCustomNorad("");
    setCustomTle1("");
    setCustomTle2("");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 overflow-hidden text-xs">
      <div className="text-xs text-cyan-300 font-bold mb-2 pb-1 border-b border-cyan-500/20 uppercase tracking-wider">
        🛰️ ORBITAL OBJECT CATALOG
      </div>

      {/* Group Navigation */}
      <div className="flex flex-wrap gap-1 mb-2 bg-black/30 p-1 border border-cyan-500/10 rounded">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(g.id)}
            className={`px-2 py-0.5 rounded text-[9px] transition-all uppercase ${
              activeGroup === g.id
                ? "bg-cyan-500/20 border border-cyan-500/30 text-white"
                : "text-cyan-400/50 hover:text-cyan-300"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="FILTER BY NAME OR NORAD ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-black/40 border border-cyan-500/30 rounded p-1.5 mb-3 text-cyan-400 font-mono focus:outline-none focus:border-cyan-400"
      />

      {/* Target list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[140px] scrollbar-thin scrollbar-thumb-cyan-500/20">
        {loading ? (
          <div className="text-cyan-400/50 text-center py-4 animate-pulse">QUERYING CELESTRAK SERVERS...</div>
        ) : error ? (
          <div className="text-rose-400 font-bold text-center py-4 uppercase">{error}</div>
        ) : filtered.length > 0 ? (
          filtered.map((sat) => (
            <button
              key={sat.noradId}
              onClick={() => onSelectSatellite(sat)}
              className={`w-full text-left p-1.5 rounded border transition-all flex items-center justify-between ${
                sat.noradId === selectedSatelliteId
                  ? "bg-cyan-500/20 border-cyan-400 text-white"
                  : "bg-black/20 border-cyan-500/10 text-cyan-400/80 hover:bg-cyan-500/5 hover:border-cyan-500/30"
              }`}
            >
              <div>
                <div className="font-bold uppercase tracking-wide truncate max-w-[180px]">{sat.name}</div>
                <div className="text-[8px] text-cyan-400/40">NORAD: {sat.noradId}</div>
              </div>
              <span className="text-[9px] font-bold opacity-75">{sat.noradId === selectedSatelliteId ? "ACTIVE" : "TRACK"}</span>
            </button>
          ))
        ) : (
          <div className="text-cyan-400/50 text-center py-4">NO OBJECTS MATCH SEARCH FILTER</div>
        )}
      </div>

      {/* Custom TLE Input Form */}
      <form onSubmit={handleAddCustom} className="mt-3 pt-2.5 border-t border-cyan-500/10 space-y-1.5">
        <div className="text-[9px] text-cyan-400/60 font-bold uppercase">Manual Target Entry</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="NORAD ID"
            value={customNorad}
            onChange={(e) => setCustomNorad(e.target.value)}
            className="bg-black/30 border border-cyan-500/20 rounded p-1 text-[9px] text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <input
          type="text"
          placeholder="TLE LINE 1"
          value={customTle1}
          onChange={(e) => setCustomTle1(e.target.value)}
          className="w-full bg-black/30 border border-cyan-500/20 rounded p-1 text-[8px] text-white focus:outline-none focus:border-cyan-500 font-mono"
        />
        <input
          type="text"
          placeholder="TLE LINE 2"
          value={customTle2}
          onChange={(e) => setCustomTle2(e.target.value)}
          className="w-full bg-black/30 border border-cyan-500/20 rounded p-1 text-[8px] text-white focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          type="submit"
          className="w-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-white rounded py-0.5 text-[9px] font-bold transition-all uppercase"
        >
          Inject Coordinate Parameters
        </button>
      </form>
    </div>
  );
};
