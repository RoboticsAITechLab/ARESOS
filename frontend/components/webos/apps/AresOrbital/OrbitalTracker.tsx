import React, { useEffect, useRef } from "react";
import { OrbitalState } from "./AresOrbitalEngine";

interface OrbitalTrackerProps {
  telemetry: OrbitalState | null;
  trackHistory: { latitude: number; longitude: number }[];
  predictedPath: { latitude: number; longitude: number }[];
  userCoords: { latitude: number; longitude: number } | null;
  loading: boolean;
  selectedSatelliteName: string;
}

export const OrbitalTracker: React.FC<OrbitalTrackerProps> = ({
  telemetry,
  trackHistory,
  predictedPath,
  userCoords,
  loading,
  selectedSatelliteName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Vector Map Continents
    const continents = [
      [
        { x: 0.05, y: 0.12 }, { x: 0.18, y: 0.10 }, { x: 0.28, y: 0.18 }, 
        { x: 0.32, y: 0.15 }, { x: 0.36, y: 0.22 }, { x: 0.32, y: 0.28 },
        { x: 0.25, y: 0.30 }, { x: 0.24, y: 0.42 }, { x: 0.20, y: 0.46 },
        { x: 0.17, y: 0.40 }, { x: 0.12, y: 0.35 }, { x: 0.14, y: 0.30 },
        { x: 0.08, y: 0.28 }
      ],
      [
        { x: 0.24, y: 0.47 }, { x: 0.28, y: 0.50 }, { x: 0.32, y: 0.52 }, 
        { x: 0.34, y: 0.60 }, { x: 0.32, y: 0.70 }, { x: 0.29, y: 0.85 }, 
        { x: 0.26, y: 0.87 }, { x: 0.24, y: 0.75 }, { x: 0.22, y: 0.62 },
        { x: 0.23, y: 0.52 }
      ],
      [
        { x: 0.44, y: 0.40 }, { x: 0.50, y: 0.38 }, { x: 0.56, y: 0.41 }, 
        { x: 0.60, y: 0.48 }, { x: 0.58, y: 0.62 }, { x: 0.54, y: 0.75 }, 
        { x: 0.51, y: 0.77 }, { x: 0.48, y: 0.65 }, { x: 0.46, y: 0.55 },
        { x: 0.43, y: 0.48 }
      ],
      [
        { x: 0.42, y: 0.32 }, { x: 0.45, y: 0.22 }, { x: 0.50, y: 0.18 }, 
        { x: 0.58, y: 0.14 }, { x: 0.70, y: 0.11 }, { x: 0.84, y: 0.12 }, 
        { x: 0.92, y: 0.20 }, { x: 0.90, y: 0.32 }, { x: 0.84, y: 0.42 },
        { x: 0.80, y: 0.48 }, { x: 0.75, y: 0.45 }, { x: 0.72, y: 0.38 },
        { x: 0.68, y: 0.45 }, { x: 0.64, y: 0.40 }, { x: 0.58, y: 0.40 },
        { x: 0.53, y: 0.44 }, { x: 0.48, y: 0.36 }
      ],
      [
        { x: 0.78, y: 0.62 }, { x: 0.86, y: 0.61 }, { x: 0.88, y: 0.68 }, 
        { x: 0.86, y: 0.75 }, { x: 0.79, y: 0.76 }, { x: 0.76, y: 0.70 }
      ],
      [
        { x: 0.33, y: 0.08 }, { x: 0.40, y: 0.09 }, { x: 0.38, y: 0.16 }, 
        { x: 0.34, y: 0.15 }
      ],
      [
        { x: 0.68, y: 0.40 }, { x: 0.70, y: 0.40 }, { x: 0.69, y: 0.44 }, 
        { x: 0.67, y: 0.43 }
      ]
    ];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Day/Night Terminator Line Calculation
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const declination = 23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 80));
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const lst = (utcHours + utcMinutes / 60) * 15;
    const subsolarLon = 180 - lst;

    // Create night shadow path
    ctx.beginPath();
    const shadowPoints: {x: number, y: number}[] = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lonRad = (lon * Math.PI) / 180;
      const subsolarLonRad = (subsolarLon * Math.PI) / 180;
      const latRad = Math.atan(-Math.cos(lonRad - subsolarLonRad) / Math.tan((declination * Math.PI) / 180));
      const lat = (latRad * 180) / Math.PI;

      const px = ((lon + 180) / 360) * canvas.width;
      const py = ((90 - lat) / 180) * canvas.height;
      shadowPoints.push({ x: px, y: py });
    }

    // Connect and draw terminator shadow
    if (shadowPoints.length > 0) {
      ctx.moveTo(shadowPoints[0].x, shadowPoints[0].y);
      for (let i = 1; i < shadowPoints.length; i++) {
        ctx.lineTo(shadowPoints[i].x, shadowPoints[i].y);
      }

      // Close polygon depending on season
      if (declination > 0) {
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
      } else {
        ctx.lineTo(canvas.width, 0);
        ctx.lineTo(0, 0);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(8, 16, 40, 0.42)";
      ctx.fill();
    }

    // Draw continents
    ctx.fillStyle = "rgba(6, 182, 212, 0.05)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.16)";
    ctx.lineWidth = 1;

    continents.forEach(polygon => {
      ctx.beginPath();
      polygon.forEach((pt, idx) => {
        const px = pt.x * canvas.width;
        const py = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Grid lines
    ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
    ctx.lineWidth = 0.5;
    const numLines = 12;
    for (let i = 1; i < numLines; i++) {
      const x = (canvas.width / numLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let i = 1; i < numLines; i++) {
      const y = (canvas.height / numLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw user location
    if (userCoords) {
      const ux = ((userCoords.longitude + 180) / 360) * canvas.width;
      const uy = ((90 - userCoords.latitude) / 180) * canvas.height;
      ctx.beginPath();
      ctx.arc(ux, uy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "#fb7185";
      ctx.fill();
      ctx.fillStyle = "#fda4af";
      ctx.font = "9px monospace";
      ctx.fillText("📡 HOME STATION", ux + 8, uy - 4);
    }

    // Draw Orbit Path History
    if (trackHistory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1.5;
      const firstPt = trackHistory[0];
      const getX = (lon: number) => ((lon + 180) / 360) * canvas.width;
      const getY = (lat: number) => ((90 - lat) / 180) * canvas.height;

      ctx.moveTo(getX(firstPt.longitude), getY(firstPt.latitude));
      for (let i = 1; i < trackHistory.length; i++) {
        const pt = trackHistory[i];
        if (Math.abs(pt.longitude - trackHistory[i - 1].longitude) > 180) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(getX(pt.longitude), getY(pt.latitude));
        } else {
          ctx.lineTo(getX(pt.longitude), getY(pt.latitude));
        }
      }
      ctx.stroke();
    }

    // Draw Predicted Future Trajectory
    if (predictedPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(234, 179, 8, 0.65)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      
      const getX = (lon: number) => ((lon + 180) / 360) * canvas.width;
      const getY = (lat: number) => ((90 - lat) / 180) * canvas.height;
      
      ctx.moveTo(getX(predictedPath[0].longitude), getY(predictedPath[0].latitude));
      for (let i = 1; i < predictedPath.length; i++) {
        const pt = predictedPath[i];
        if (Math.abs(pt.longitude - predictedPath[i - 1].longitude) > 180) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(getX(pt.longitude), getY(pt.latitude));
        } else {
          ctx.lineTo(getX(pt.longitude), getY(pt.latitude));
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Active Satellite Target
    if (telemetry) {
      const x = ((telemetry.longitude + 180) / 360) * canvas.width;
      const y = ((90 - telemetry.latitude) / 180) * canvas.height;

      const pulseRadius = (Date.now() % 1500) / 75;
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius + 6, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(34, 211, 238, ${Math.max(0, 1 - pulseRadius / 20)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#22d3ee";
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px monospace";
      ctx.fillText(`🛰️ ${selectedSatelliteName}`, x + 10, y - 6);
    }
  }, [telemetry, trackHistory, predictedPath, userCoords, selectedSatelliteName]);

  return (
    <div className="flex flex-col h-full bg-[#070d1e]/85 border border-cyan-500/25 rounded overflow-hidden">
      <div className="flex justify-between items-center bg-[#0d1527] border-b border-cyan-500/20 px-3 py-1.5 text-xs">
        <span className="text-cyan-300 font-bold">🗺️ REAL-TIME TELEMETRY TRACKER GRID</span>
        <span className="text-[10px] text-yellow-400 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> PREDICTED ORBIT TRACK
        </span>
      </div>
      <div className="flex-1 relative bg-black/40 min-h-[220px]">
        <canvas 
          ref={canvasRef}
          width={560}
          height={320}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-cyan-400 font-bold">
            <span className="animate-pulse">PROPAGATING SGP4 ORBIT STATE...</span>
          </div>
        )}
      </div>
    </div>
  );
};
