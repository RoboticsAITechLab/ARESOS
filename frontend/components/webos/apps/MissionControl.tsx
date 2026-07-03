"use client";

import React, { useState, useEffect, useRef } from "react";
import { playClickSound } from "@/utils/webos/audio";
import { useFileSystem } from "@/hooks/webos/useFileSystem";

// Modular Imports
import { AresOrbitalEngine, OrbitalState } from "./AresOrbital/AresOrbitalEngine";
import { AresOrbitalDataService, SatelliteInfo, SpaceWeatherMetrics, LaunchEvent, CrewMember } from "./AresOrbital/AresOrbitalDataService";
import { TelemetryRecorder, HistoricalRecord } from "./AresOrbital/TelemetryRecorder";
import { OrbitalTracker } from "./AresOrbital/OrbitalTracker";
import { TelemetryPanel } from "./AresOrbital/TelemetryPanel";
import { RadarView } from "./AresOrbital/RadarView";
import { SatelliteCatalog } from "./AresOrbital/SatelliteCatalog";
import { OrbitAnalytics } from "./AresOrbital/OrbitAnalytics";
import { AlertCenter, OrbitalAlert } from "./AresOrbital/AlertCenter";
import { SpaceWeatherPanel } from "./AresOrbital/SpaceWeatherPanel";
import { CrewManifest } from "./AresOrbital/CrewManifest";
import { MissionTimeline } from "./AresOrbital/MissionTimeline";
import { SystemHealth } from "./AresOrbital/SystemHealth";

interface MissionControlProps {
  pid: string;
}

export default function MissionControl({ pid: _pid }: MissionControlProps) {
  const [activeTab, setActiveTab] = useState<"tracker" | "systems" | "weather">("tracker");
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteInfo>({
    name: "ISS (ZARYA)",
    noradId: 25544,
    tle1: "1 25544U 98067A   26183.56586884  .00014603  00000-0  26388-3 0  9990",
    tle2: "2 25544  51.6394 286.3533 0005703 125.4379 337.8920 15.49830541575017",
    category: "Space Stations"
  });

  const [telemetry, setTelemetry] = useState<OrbitalState | null>(null);
  const [trackHistory, setTrackHistory] = useState<HistoricalRecord[]>([]);
  const [predictedPath, setPredictedPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherMetrics | null>(null);
  const [launches, setLaunches] = useState<LaunchEvent[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [alerts, setAlerts] = useState<OrbitalAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [audioComms, setAudioComms] = useState<boolean>(false);
  const [metrics, setMetrics] = useState(AresOrbitalDataService.metrics);

  const { writeFile } = useFileSystem();
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Sync Geolocation
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => setUserCoords({ latitude: 29.5606, longitude: -95.0848 }) // JSC Houston fallback
      );
    } else {
      setUserCoords({ latitude: 29.5606, longitude: -95.0848 });
    }
  }, []);

  // Sync APIs: 10s interval
  const syncAPIs = async () => {
    const freshTle = await AresOrbitalDataService.fetchTLE(selectedSatellite.noradId);
    if (freshTle) setSelectedSatellite(freshTle);

    const weatherData = await AresOrbitalDataService.fetchSpaceWeather();
    setSpaceWeather(weatherData);

    const crewData = await AresOrbitalDataService.fetchCrew();
    setCrew(crewData);

    const launchData = await AresOrbitalDataService.fetchTimeline();
    setLaunches(launchData);

    setMetrics({ ...AresOrbitalDataService.metrics });
    setLoading(false);
  };

  useEffect(() => {
    syncAPIs();
    const interval = setInterval(syncAPIs, 10000);
    return () => clearInterval(interval);
  }, [selectedSatellite.noradId]);

  // Interpolate / Propagate locally: 1s interval
  useEffect(() => {
    const propagateLocal = () => {
      const state = AresOrbitalEngine.propagate(selectedSatellite.tle1, selectedSatellite.tle2);
      if (state) {
        setTelemetry(state);
        // Write to Telemetry Recorder VFS
        TelemetryRecorder.record(
          selectedSatellite.noradId,
          state.latitude,
          state.longitude,
          state.altitude,
          state.velocity,
          (path, content) => writeFile(path, content)
        );

        // Fetch logs
        setTrackHistory(TelemetryRecorder.getHistory(selectedSatellite.noradId));

        // Generate predicted path for next orbit (90 minutes)
        const futurePoints = AresOrbitalEngine.generateGroundTrack(
          selectedSatellite.tle1,
          selectedSatellite.tle2,
          new Date(),
          90
        );
        setPredictedPath(futurePoints);
      }
    };

    propagateLocal();
    const timer = setInterval(propagateLocal, 1000);
    return () => clearInterval(timer);
  }, [selectedSatellite]);

  // Alert updates from active feeds
  useEffect(() => {
    const activeAlerts: OrbitalAlert[] = [];
    if (spaceWeather && spaceWeather.kpIndex >= 4) {
      activeAlerts.push({
        id: "alert-kp",
        level: "ORANGE",
        title: "HIGH GEOMAGNETIC ACTIVITY",
        message: `NOAA Alert: Geomagnetic storms active. Kp Index at ${spaceWeather.kpIndex}. Satellites monitor drag updates.`,
        timestamp: new Date().toISOString(),
      });
    }
    if (metrics.telemetry.status === "OFFLINE") {
      activeAlerts.push({
        id: "alert-sensor",
        level: "RED",
        title: "DATA CONNECTOR LINK LOST",
        message: "Severe downlink interruptions. Reverting to SGP4 mathematical orbit model prediction.",
        timestamp: new Date().toISOString(),
      });
    }
    setAlerts(activeAlerts);
  }, [spaceWeather, metrics]);

  // Audio Static
  const handleAudioCommsToggle = () => {
    playClickSound();
    if (audioComms) {
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch (e) {}
        noiseNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioComms(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1000;

        const gain = ctx.createGain();
        gain.gain.value = 0.015;

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noiseSource.start();

        noiseNodeRef.current = noiseSource;
        setAudioComms(true);
      } catch (err) {
        console.error("Audio Context Init Failed", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch (e) {}
      }
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#030712]/85 text-cyan-400 font-mono text-sm select-none p-4 overflow-hidden border border-cyan-500/30 backdrop-blur-md rounded-lg">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-cyan-500/20 pb-3 mb-3 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛰️</span>
          <div>
            <div className="font-bold tracking-widest text-cyan-300">ARES ORBITAL INTEL</div>
            <div className="text-xs text-cyan-400/60">INTELLIGENT COMMAND INTERFACE</div>
          </div>
        </div>

        {/* Tab Selection & Future Module Slots */}
        <div className="flex flex-wrap items-center gap-1 bg-black/40 p-1 border border-cyan-500/20 rounded text-xs">
          <button onClick={() => { playClickSound(); setActiveTab("tracker"); }} className={`px-2.5 py-1 rounded transition-all ${activeTab === "tracker" ? "bg-cyan-500/20 text-white border border-cyan-500/40" : "text-cyan-400/60 hover:text-cyan-300"}`}>MAP TRACKER</button>
          <button onClick={() => { playClickSound(); setActiveTab("systems"); }} className={`px-2.5 py-1 rounded transition-all ${activeTab === "systems" ? "bg-cyan-500/20 text-white border border-cyan-500/40" : "text-cyan-400/60 hover:text-cyan-300"}`}>CATALOG & LOGS</button>
          <button onClick={() => { playClickSound(); setActiveTab("weather"); }} className={`px-2.5 py-1 rounded transition-all ${activeTab === "weather" ? "bg-cyan-500/20 text-white border border-cyan-500/40" : "text-cyan-400/60 hover:text-cyan-300"}`}>WEATHER & OPS</button>
          
          {/* Reserved hooks for Future Expansion Modules */}
          <span className="text-[10px] text-cyan-500/20 px-1 hover:text-cyan-500/50 cursor-help" title="ROVER FLEET - INTELLIGENCE CORE EXPANSION REQUIRED">[ROVER]</span>
          <span className="text-[10px] text-cyan-500/20 px-1 hover:text-cyan-500/50 cursor-help" title="DRONE FLEET - MODULE SHELL INACTIVE">[DRONE]</span>
          <span className="text-[10px] text-cyan-500/20 px-1 hover:text-cyan-500/50 cursor-help" title="AI COGNITIVE OPERATIONS - DISCONNECTED">[AI OPS]</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button onClick={handleAudioCommsToggle} className={`px-2 py-0.5 border text-[10px] rounded transition-all ${audioComms ? "bg-cyan-500/20 border-cyan-400 text-white animate-pulse" : "border-cytan-500/40 text-cyan-400/80 hover:bg-cyan-500/10"}`}>📻 STATIC {audioComms ? "ON" : "OFF"}</button>
        </div>
      </div>

      {/* Dynamic Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden min-h-0">
        {activeTab === "tracker" && (
          <>
            <div className="lg:col-span-2 flex flex-col gap-3 h-full overflow-hidden">
              <OrbitalTracker telemetry={telemetry} trackHistory={trackHistory} predictedPath={predictedPath} userCoords={userCoords} loading={loading} selectedSatelliteName={selectedSatellite.name} />
            </div>
            <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
              <TelemetryPanel telemetry={telemetry} satelliteName={selectedSatellite.name} source={metrics.catalog.status === "ONLINE" ? "CELESTRAK LIVE" : "VFS CACHED TLE"} timestamp={metrics.catalog.lastSuccess?.toLocaleTimeString() || "N/A"} refreshRate="1.0s (SGP4)" />
              <RadarView telemetry={telemetry} userCoords={userCoords} satelliteName={selectedSatellite.name} />
            </div>
          </>
        )}

        {activeTab === "systems" && (
          <>
            <div className="lg:col-span-1 flex flex-col h-full">
              <SatelliteCatalog onSelectSatellite={(sat) => { playClickSound(); setSelectedSatellite(sat); }} selectedSatelliteId={selectedSatellite.noradId} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-3 h-full overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
                <OrbitAnalytics history={trackHistory} />
                <AlertCenter alerts={alerts} />
              </div>
            </div>
          </>
        )}

        {activeTab === "weather" && (
          <>
            <div className="lg:col-span-1 flex flex-col gap-3 h-full">
              <SpaceWeatherPanel weather={spaceWeather} />
              <SystemHealth metrics={metrics} orbitEngineLatency={1} mapEngineStatus="ONLINE" storageStatus="ONLINE" />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 h-full overflow-y-auto pr-1">
              <CrewManifest crew={crew} />
              <MissionTimeline launches={launches} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
