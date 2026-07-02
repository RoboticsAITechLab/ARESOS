"use client";

export interface HistoricalRecord {
  noradId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: string;
}

/**
 * TelemetryRecorder
 * Manages caching, log storage, and playback retrieval for orbital telemetry records
 * using the system local storage and VFS structure.
 */
export const TelemetryRecorder = {
  /**
   * Log a new telemetry point
   */
  record: (
    noradId: number,
    lat: number,
    lon: number,
    alt: number,
    vel: number,
    writeFileFn?: (path: string, content: string) => boolean
  ): void => {
    try {
      const storageKey = `aresos_telemetry_${noradId}_log`;
      const rawData = localStorage.getItem(storageKey);
      let logs: HistoricalRecord[] = [];

      if (rawData) {
        try {
          logs = JSON.parse(rawData);
        } catch (e) {
          logs = [];
        }
      }

      // Append new coordinate point
      logs.push({
        noradId,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        velocity: vel,
        timestamp: new Date().toISOString(),
      });

      // Filter retention limits: Keep up to 360 points (approx 1 hour at 10s intervals)
      if (logs.length > 360) {
        logs.shift();
      }

      // Write to localStorage for fast lookup
      localStorage.setItem(storageKey, JSON.stringify(logs));

      // Also write to Virtual File System if helper is present
      if (writeFileFn) {
        const vfsPath = `/home/user/Documents/telemetry_${noradId}_log.json`;
        writeFileFn(vfsPath, JSON.stringify(logs, null, 2));
      }
    } catch (err) {
      console.error("Telemetry recording error:", err);
    }
  },

  /**
   * Retrieve historical log records
   */
  getHistory: (noradId: number): HistoricalRecord[] => {
    try {
      const rawData = localStorage.getItem(`aresos_telemetry_${noradId}_log`);
      if (rawData) {
        return JSON.parse(rawData);
      }
    } catch (e) {
      console.error("History read error", e);
    }
    return [];
  },

  /**
   * Clear all telemetry history logs
   */
  clearHistory: (noradId: number): void => {
    localStorage.removeItem(`aresos_telemetry_${noradId}_log`);
  }
};
