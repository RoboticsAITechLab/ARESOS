import React from "react";
import { OrbitalState } from "./AresOrbitalEngine";

interface RadarViewProps {
  telemetry: OrbitalState | null;
  userCoords: { latitude: number; longitude: number } | null;
  satelliteName: string;
}

export const RadarView: React.FC<RadarViewProps> = ({
  telemetry,
  userCoords,
  satelliteName,
}) => {
  if (!userCoords) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/40 border border-cyan-500/20 rounded p-6 text-center">
        <span className="text-3xl mb-2">📡</span>
        <div className="text-rose-400 font-bold tracking-widest text-sm uppercase">
          HOME STATION NOT CONFIGURED
        </div>
        <p className="text-[10px] text-cyan-400/50 mt-1 max-w-xs">
          Enable Geolocation access to calculate real-time bearing, elevation angle, and line-of-sight passes.
        </p>
      </div>
    );
  }

  // Calculate distance
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get bearing
  const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  let distance = 0;
  let bearing = 0;
  let rx = 0;
  let ry = 0;

  if (telemetry) {
    distance = getDistance(userCoords.latitude, userCoords.longitude, telemetry.latitude, telemetry.longitude);
    bearing = getBearing(userCoords.latitude, userCoords.longitude, telemetry.latitude, telemetry.longitude);

    // Scale mapping range (max range 12,000 km)
    const radarMaxKm = 12000;
    const scaledDistance = Math.min(1, distance / radarMaxKm);

    // Convert to 2D Cartesian offset inside radar circle
    const angleRad = ((bearing - 90) * Math.PI) / 180;
    rx = Math.cos(angleRad) * scaledDistance;
    ry = Math.sin(angleRad) * scaledDistance;
  }

  const inSight = distance < 800;

  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/85 border border-cyan-500/25 rounded overflow-hidden">
      <div className="flex justify-between items-center bg-[#0d1527] border-b border-cyan-500/20 px-3 py-1.5 text-xs">
        <span className="text-cyan-300 font-bold">🧭 GROUND-TO-SPACE SENSOR RADAR</span>
        <span className="text-white text-[10px]">AZIMUTH: {telemetry ? `${Math.round(bearing)}°` : "LOCKING..."}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-black/40 min-h-[220px]">
        {/* Radar Ring Visuals */}
        <div className="relative w-48 h-48 rounded-full border border-cyan-500/30 flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full border border-cyan-500/20" />
          <div className="absolute w-24 h-24 rounded-full border border-cyan-500/20" />
          <div className="absolute w-12 h-12 rounded-full border border-cyan-500/10" />

          {/* Compass Axis Lines */}
          <div className="absolute h-full w-[0.5px] bg-cyan-500/15" />
          <div className="absolute w-full h-[0.5px] bg-cyan-500/15" />

          {/* Radar Sweep Animation */}
          <div className="absolute inset-0 rounded-full border border-transparent border-t-cyan-500/30 animate-spin" style={{ animationDuration: "3s" }} />

          {/* Card Direction Labels */}
          <span className="absolute top-1 text-[9px] text-cyan-500/60 font-bold">N</span>
          <span className="absolute right-1.5 text-[9px] text-cyan-500/60 font-bold">E</span>
          <span className="absolute bottom-1 text-[9px] text-cyan-500/60 font-bold">S</span>
          <span className="absolute left-1.5 text-[9px] text-cyan-500/60 font-bold">W</span>

          {/* User Station Pin */}
          <div className="absolute w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e] animate-pulse" />

          {/* Target Blip Positioned on Radar */}
          {telemetry && (
            <div
              className="absolute w-3 h-3 bg-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_10px_#06b6d4] transition-all duration-1000"
              style={{
                transform: `translate(${rx * 90}px, ${ry * 90}px)`,
              }}
            >
              <span className="text-[6px] text-black font-bold">🛰️</span>
              <span className="absolute top-3.5 whitespace-nowrap text-[8px] text-cyan-300 font-bold bg-[#030712]/90 px-1 border border-cyan-500/20 rounded">
                {satelliteName} ({Math.round(distance)} km)
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 text-center space-y-0.5">
          <div className={`text-xs font-bold ${inSight ? "text-emerald-400" : "text-cyan-400/80"}`}>
            VISIBILITY: {inSight ? "LINE OF SIGHT VISIBLE" : "HORIZON ACQUISITION RANGE"}
          </div>
          <div className="text-[8px] text-cyan-400/40 max-w-[280px] leading-normal">
            Radar range projection mapped at 12,000 km maximum horizon radius centered on Home Station coordinates.
          </div>
        </div>
      </div>
    </div>
  );
};
