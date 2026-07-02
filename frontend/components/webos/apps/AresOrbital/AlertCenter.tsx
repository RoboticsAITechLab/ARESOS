import React from "react";

export interface OrbitalAlert {
  id: string;
  level: "GREEN" | "YELLOW" | "ORANGE" | "RED";
  title: string;
  message: string;
  timestamp: string;
}

interface AlertCenterProps {
  alerts: OrbitalAlert[];
}

export const AlertCenter: React.FC<AlertCenterProps> = ({ alerts }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#070d1e]/80 border border-cyan-500/20 rounded p-3 text-xs overflow-hidden">
      <div className="text-xs text-cyan-300 font-bold uppercase tracking-wider pb-1 border-b border-cyan-500/10 mb-2 flex justify-between items-center">
        <span>⚠️ TACTICAL ALERTS & ADVISORIES</span>
        <span className="text-[10px] text-cyan-400/40">LEVEL: ACTIVE</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-2 rounded border text-[10px] flex items-start gap-2 ${
                alert.level === "RED"
                  ? "bg-red-500/10 border-red-500/35 text-red-300 animate-pulse"
                  : alert.level === "ORANGE"
                  ? "bg-amber-500/10 border-amber-500/35 text-amber-300"
                  : alert.level === "YELLOW"
                  ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-300"
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              }`}
            >
              <span className="text-[11px] leading-none mt-0.5">
                {alert.level === "RED" ? "🚨" : alert.level === "ORANGE" ? "🔸" : alert.level === "YELLOW" ? "⚠️" : "✓"}
              </span>
              <div className="flex-1">
                <div className="flex justify-between font-bold">
                  <span>{alert.title}</span>
                  <span className="text-[8px] font-normal opacity-70">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[9px] opacity-90 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-emerald-400/70 py-4 uppercase">
            ✓ ALL SYSTEMS OPERATIONAL - ZERO WARNINGS
          </div>
        )}
      </div>
    </div>
  );
};
