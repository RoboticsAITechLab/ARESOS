import React from "react";
import { OrbitalState } from "./AresOrbitalEngine";

interface TelemetryPanelProps {
  telemetry: OrbitalState | null;
  satelliteName: string;
  source: string;
  timestamp: string;
  refreshRate: string;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  satelliteName,
  source,
  timestamp,
  refreshRate,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-xs">
      
      {/* Target Identifier Card */}
      <div className="bg-[#0b1329]/60 border border-cyan-500/20 p-3 rounded col-span-1 md:col-span-2">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-[9px] text-cyan-400/50 uppercase">Active Target Tracker</div>
            <div className="text-sm font-bold text-white font-mono tracking-wider">{satelliteName}</div>
          </div>
          <div className="text-right text-[9px] text-cyan-400/40">
            <div>REFRESH: {refreshRate}</div>
            <div>STAMP: {timestamp || "N/A"}</div>
          </div>
        </div>
      </div>

      {/* Lat/Lon Card */}
      <div className="bg-[#0b1329]/60 border border-cyan-500/20 p-2.5 rounded">
        <div className="text-[9px] text-cyan-400/50 mb-1">GEODETIC POSITION</div>
        {telemetry ? (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>LATITUDE:</span>
              <span className="text-white font-bold">{telemetry.latitude.toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span>LONGITUDE:</span>
              <span className="text-white font-bold">{telemetry.longitude.toFixed(4)}°</span>
            </div>
          </div>
        ) : (
          <div className="text-rose-400 font-bold uppercase">DATA UNAVAILABLE</div>
        )}
      </div>

      {/* Speed & Altitude Card */}
      <div className="bg-[#0b1329]/60 border border-cyan-500/20 p-2.5 rounded">
        <div className="text-[9px] text-cyan-400/50 mb-1">ORBIT METRICS</div>
        {telemetry ? (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>ALTITUDE:</span>
              <span className="text-white font-bold">{Math.round(telemetry.altitude).toLocaleString()} KM</span>
            </div>
            <div className="flex justify-between">
              <span>VELOCITY:</span>
              <span className="text-white font-bold">{Math.round(telemetry.velocity).toLocaleString()} KM/H</span>
            </div>
          </div>
        ) : (
          <div className="text-rose-400 font-bold uppercase">DATA UNAVAILABLE</div>
        )}
      </div>

      {/* Orbital Period & Azimuth */}
      <div className="bg-[#0b1329]/60 border border-cyan-500/20 p-2.5 rounded col-span-1 md:col-span-2">
        <div className="text-[9px] text-cyan-400/50 mb-1">VECTOR TRAJECTORY</div>
        {telemetry ? (
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-cyan-400/60 block">HEADING AZIMUTH</span>
              <span className="text-white font-bold">{telemetry.heading.toFixed(1)}° ({telemetry.heading >= 180 ? "WESTBOUND" : "EASTBOUND"})</span>
            </div>
            <div>
              <span className="text-cyan-400/60 block">ORBITAL PERIOD</span>
              <span className="text-white font-bold">{telemetry.period.toFixed(2)} MIN</span>
            </div>
          </div>
        ) : (
          <div className="text-rose-400 font-bold uppercase">DATA UNAVAILABLE</div>
        )}
      </div>

      <div className="text-[9px] text-cyan-500/40 text-left col-span-1 md:col-span-2 pl-1">
        SOURCE DATA FEED: {source}
      </div>

    </div>
  );
};
