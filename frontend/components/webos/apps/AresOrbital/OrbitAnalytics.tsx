import React from "react";
import { HistoricalRecord } from "./TelemetryRecorder";

interface OrbitAnalyticsProps {
  history: HistoricalRecord[];
}

export const OrbitAnalytics: React.FC<OrbitAnalyticsProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center border border-cyan-500/20 bg-black/30 rounded p-4 text-cyan-400/50 text-xs">
        <span>📶 AWAITING ORBITAL DATA LOGS...</span>
      </div>
    );
  }

  // Find min/max altitude and velocity in logs to scale the SVG
  const altitudes = history.map((h) => h.altitude);
  const velocities = history.map((h) => h.velocity);

  const minAlt = Math.min(...altitudes) - 2;
  const maxAlt = Math.max(...altitudes) + 2;
  const minVel = Math.min(...velocities) - 50;
  const maxVel = Math.max(...velocities) + 50;

  const altRange = maxAlt - minAlt || 1;
  const velRange = maxVel - minVel || 1;

  // Generate SVG coordinates for altitude
  const width = 360;
  const height = 80;

  const altPoints = history
    .map((record, index) => {
      const x = (index / (history.length - 1)) * width;
      // Invert Y axis
      const y = height - ((record.altitude - minAlt) / altRange) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const velPoints = history
    .map((record, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - ((record.velocity - minVel) / velRange) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 text-xs space-y-3">
      <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/10">
        📈 ORBITAL PROFILE ANALYTICS (1-HOUR)
      </div>

      {/* Altitude Graph */}
      <div>
        <div className="flex justify-between text-[10px] text-cyan-400/60 mb-1">
          <span>ALTITUDE DEV (KM)</span>
          <span className="text-white font-bold">MIN: {Math.round(minAlt)} / MAX: {Math.round(maxAlt)}</span>
        </div>
        <div className="relative border border-cyan-500/10 bg-black/40 rounded overflow-hidden h-20 w-full">
          {/* Grids */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 pointer-events-none">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-cyan-500/5" />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              points={altPoints}
            />
          </svg>
        </div>
      </div>

      {/* Velocity Graph */}
      <div>
        <div className="flex justify-between text-[10px] text-cyan-400/60 mb-1">
          <span>VELOCITY SCATTER (KM/H)</span>
          <span className="text-white font-bold">MIN: {Math.round(minVel).toLocaleString()} / MAX: {Math.round(maxVel).toLocaleString()}</span>
        </div>
        <div className="relative border border-cyan-500/10 bg-black/40 rounded overflow-hidden h-20 w-full">
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 pointer-events-none">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-cyan-500/5" />
            ))}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            <polyline
              fill="none"
              stroke="#eab308"
              strokeWidth="1.5"
              points={velPoints}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
