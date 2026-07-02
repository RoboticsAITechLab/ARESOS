import React from "react";
import { SpaceWeatherMetrics } from "./AresOrbitalDataService";

interface SpaceWeatherPanelProps {
  weather: SpaceWeatherMetrics | null;
}

export const SpaceWeatherPanel: React.FC<SpaceWeatherPanelProps> = ({ weather }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 text-xs space-y-3">
      <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/10">
        🌞 NOAA SPACE WEATHER & SOLAR METRICS
      </div>

      {weather ? (
        <div className="space-y-3">
          {/* Primary dials */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#0b1329]/50 border border-cyan-500/15 p-2 rounded">
              <div className="text-cyan-400/50 block">GEOMAGNETIC KP-INDEX</div>
              <div className="text-lg text-white font-bold font-mono mt-0.5">
                KP-{weather.kpIndex}
                <span className="text-[9px] text-cyan-400 font-normal ml-1.5">
                  ({weather.kpIndex >= 4 ? "STORM STATE" : "QUIET"})
                </span>
              </div>
            </div>

            <div className="bg-[#0b1329]/50 border border-cyan-500/15 p-2 rounded">
              <div className="text-cyan-400/50 block">SOLAR WIND SPEED</div>
              <div className="text-lg text-white font-bold font-mono mt-0.5">
                {Math.round(weather.solarWindSpeed)} <span className="text-xs font-normal">KM/S</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-[10px]">
            <div className="border-t border-cyan-500/10 pt-2">
              <span className="text-cyan-400/50 block">MAGNETIC STORM LEVEL</span>
              <span className="text-white font-bold font-mono uppercase">{weather.geomagneticStorm}</span>
            </div>
            <div className="border-t border-cyan-500/10 pt-2">
              <span className="text-cyan-400/50 block">SOLAR RADIATION MONITOR</span>
              <span className="text-white font-bold font-mono uppercase">{weather.solarRadiation}</span>
            </div>
            <div className="border-t border-cyan-500/10 pt-2">
              <span className="text-cyan-400/50 block">NOAA SPACE SCALE SCALE</span>
              <span className={`font-bold font-mono uppercase text-xs ${
                weather.kpIndex >= 5 ? "text-red-400" : weather.kpIndex >= 3 ? "text-yellow-400" : "text-emerald-400"
              }`}>{weather.noaaAlertLevel}</span>
            </div>
          </div>

          <div className="text-[8px] text-cyan-400/40 border-t border-cyan-500/5 pt-2">
            FEED: {weather.source} | REFRESH: 10S
          </div>
        </div>
      ) : (
        <div className="text-rose-400 font-bold uppercase py-6 text-center">
          SPACE WEATHER DATA UNAVAILABLE
        </div>
      )}
    </div>
  );
};
