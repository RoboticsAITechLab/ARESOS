"use client";

import React, { useState } from "react";
import { CrewMember } from "./AresOrbitalDataService";

interface CrewManifestProps {
  crew: CrewMember[];
}

export const CrewManifest: React.FC<CrewManifestProps> = ({ crew }) => {
  const [selectedAstro, setSelectedAstro] = useState<CrewMember | null>(null);

  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 text-xs overflow-hidden">
      <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/10 mb-2">
        🧑‍🚀 ACTIVE ORBITAL CREW ON STATION ({crew.length})
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {crew.length > 0 ? (
          crew.map((member, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedAstro(member)}
              className="w-full bg-[#0e172a] hover:bg-[#1e293b] hover:border-cyan-400/40 border border-cyan-500/10 px-3 py-2 rounded flex items-center justify-between whitespace-nowrap transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <div>
                  <div className="font-bold text-white leading-tight">{member.name}</div>
                  <div className="text-[9px] text-cyan-400/40">{member.role}</div>
                </div>
              </div>
              <span className="text-[9px] text-cyan-400/60 uppercase font-mono">{member.agency}</span>
            </button>
          ))
        ) : (
          <div className="text-rose-400 font-bold text-center py-8 uppercase">
            CREW DATA UNAVAILABLE
          </div>
        )}
      </div>

      {/* Astronaut Detail Modal Overlay */}
      {selectedAstro && (
        <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1527] border border-cyan-500/40 max-w-sm w-full p-4 rounded-lg shadow-2xl relative text-xs">
            <button
              onClick={() => setSelectedAstro(null)}
              className="absolute top-2 right-2 text-cyan-400/60 hover:text-white px-2 py-0.5 border border-cyan-500/20 rounded font-mono"
            >
              CLOSE [X]
            </button>
            <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-2 mb-3">
              <span className="text-2xl">👩‍🚀</span>
              <div>
                <h4 className="text-white font-bold text-sm leading-none">{selectedAstro.name}</h4>
                <span className="text-[10px] text-cyan-400/60">{selectedAstro.agency} OPERATIONALS</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[9px] text-cyan-400/40 block">STATION DEPLOYMENT ROLE</span>
                <span className="text-white font-bold">{selectedAstro.role}</span>
              </div>
              <div>
                <span className="text-[9px] text-cyan-400/40 block">MISSION DURATION</span>
                <span className="text-white font-bold">{selectedAstro.duration}</span>
              </div>
              <div>
                <span className="text-[9px] text-cyan-400/40 block">MISSION BRIEF / BIO</span>
                <p className="text-[10px] text-cyan-400/80 leading-relaxed mt-0.5">
                  {selectedAstro.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
