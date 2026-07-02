"use client";

import React from "react";
import { LaunchEvent } from "./AresOrbitalDataService";

interface MissionTimelineProps {
  launches: LaunchEvent[];
}

export const MissionTimeline: React.FC<MissionTimelineProps> = ({ launches }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 text-xs overflow-hidden">
      <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/10 mb-2">
        📅 ORBITAL MISSION TIMELINE & EVENTS
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {launches.length > 0 ? (
          launches.map((launch, idx) => (
            <div
              key={idx}
              className="bg-[#0b1329]/50 border border-cyan-500/10 p-2.5 rounded text-[10px]"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-white uppercase">{launch.name}</span>
                <span className="text-[9px] text-yellow-400 font-mono">
                  {new Date(launch.net).toLocaleDateString()}
                </span>
              </div>
              <div className="text-cyan-400/60 mb-1">
                ORGANIZER: {launch.lsp_name} | SITE: {launch.pad_name}
              </div>
              <p className="text-[9px] text-cyan-400/80 leading-normal">
                {launch.mission_desc}
              </p>
            </div>
          ))
        ) : (
          <div className="text-rose-400 font-bold text-center py-8 uppercase">
            MISSION TIMELINE UNAVAILABLE
          </div>
        )}
      </div>
    </div>
  );
};
