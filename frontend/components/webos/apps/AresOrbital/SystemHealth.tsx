import React from "react";
import { AresOrbitalDataService } from "./AresOrbitalDataService";

interface SystemHealthProps {
  metrics: typeof AresOrbitalDataService.metrics;
  orbitEngineLatency: number;
  mapEngineStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
  storageStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
}

export const SystemHealth: React.FC<SystemHealthProps> = ({
  metrics,
  orbitEngineLatency,
  mapEngineStatus,
  storageStatus,
}) => {
  const getStatusColor = (status: "ONLINE" | "DEGRADED" | "OFFLINE") => {
    if (status === "ONLINE") return "text-emerald-400";
    if (status === "DEGRADED") return "text-amber-400";
    return "text-red-400";
  };

  const getStatusBg = (status: "ONLINE" | "DEGRADED" | "OFFLINE") => {
    if (status === "ONLINE") return "bg-emerald-500/10 border-emerald-500/20";
    if (status === "DEGRADED") return "bg-amber-500/10 border-amber-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const services = [
    { name: "TELEMETRY API", ...metrics.telemetry },
    { name: "ORBIT ENGINE", status: "ONLINE" as const, latency: orbitEngineLatency, errorCount: 0, lastSuccess: new Date(), lastFailure: null },
    { name: "SPACE WEATHER FEED", ...metrics.weather },
    { name: "CREW FEED API", ...metrics.crew },
    { name: "TIMELINE FEED", ...metrics.timeline },
    { name: "SATELLITE CATALOG", ...metrics.catalog },
    { name: "MAP RENDERER", status: mapEngineStatus, latency: 0, errorCount: 0, lastSuccess: new Date(), lastFailure: null },
    { name: "STORAGE LAYER", status: storageStatus, latency: 0, errorCount: 0, lastSuccess: new Date(), lastFailure: null },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 text-xs overflow-hidden">
      <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/10 mb-2">
        🖥️ SYSTEM OPERATIONS HEALTH CENTER
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {services.map((svc) => (
          <div
            key={svc.name}
            className={`p-2 rounded border flex flex-col justify-between text-[9px] ${getStatusBg(svc.status)}`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-white uppercase">{svc.name}</span>
              <span className={`font-bold font-mono ${getStatusColor(svc.status)}`}>
                {svc.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1 text-[8px] text-cyan-400/60 font-mono">
              <div>LATENCY: <span className="text-white">{svc.latency}ms</span></div>
              <div>ERRORS: <span className="text-white">{svc.errorCount}</span></div>
              <div className="col-span-2">
                LAST OK: <span className="text-white">
                  {svc.lastSuccess ? new Date(svc.lastSuccess).toLocaleTimeString() : "NEVER"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
