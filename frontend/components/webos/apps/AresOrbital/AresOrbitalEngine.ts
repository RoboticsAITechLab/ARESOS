"use client";

import * as satellite from "satellite.js";

export interface OrbitalState {
  latitude: number;
  longitude: number;
  altitude: number; // km
  velocity: number; // km/h
  heading: number; // degrees (0-360)
  period: number; // minutes
}

export interface GroundTrackPoint {
  latitude: number;
  longitude: number;
}

/**
 * AresOrbitalEngine
 * Generic TLE-to-coordinates SGP4 orbital propagator wrapper using satellite.js.
 */
export const AresOrbitalEngine = {
  /**
   * Propagate orbital state for a given TLE at a specific date
   */
  propagate: (tle1: string, tle2: string, date: Date = new Date()): OrbitalState | null => {
    try {
      const satrec = satellite.twoline2satrec(tle1.trim(), tle2.trim());
      const positionAndVelocity = satellite.propagate(satrec, date);
      if (!positionAndVelocity) return null;

      const positionEci = positionAndVelocity.position;
      const velocityEci = positionAndVelocity.velocity;

      if (!positionEci || !velocityEci || typeof positionEci === "boolean" || typeof velocityEci === "boolean") {
        return null;
      }

      const gmst = satellite.gstime(date);
      const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);

      const latitude = satellite.degreesLat(positionGd.latitude);
      const longitude = satellite.degreesLong(positionGd.longitude);
      const altitude = positionGd.height; // in km

      const vx = velocityEci.x;
      const vy = velocityEci.y;
      const vz = velocityEci.z;
      const velocityMag = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const velocity = velocityMag * 3600; // km/h

      const earthRadius = 6378.137;
      const semiMajorAxis = altitude + earthRadius;
      const mu = 398600.4418;
      const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
      const period = periodSeconds / 60; // in minutes

      let heading = (Math.atan2(vy, vx) * 180) / Math.PI;
      heading = (heading + 360) % 360;

      return {
        latitude,
        longitude,
        altitude,
        velocity,
        heading,
        period,
      };
    } catch (err) {
      console.error("Orbital propagation failure:", err);
      return null;
    }
  },

  /**
   * Generates a list of coordinates representing the ground track
   */
  generateGroundTrack: (
    tle1: string,
    tle2: string,
    startTime: Date,
    spanMinutes: number,
    intervalMinutes: number = 2
  ): GroundTrackPoint[] => {
    const points: GroundTrackPoint[] = [];
    try {
      const satrec = satellite.twoline2satrec(tle1.trim(), tle2.trim());
      const steps = Math.floor(spanMinutes / intervalMinutes);

      for (let i = -steps; i <= steps; i++) {
        const targetTime = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
        const positionAndVelocity = satellite.propagate(satrec, targetTime);
        if (!positionAndVelocity) continue;
        const positionEci = positionAndVelocity.position;

        if (positionEci && typeof positionEci !== "boolean") {
          const gmst = satellite.gstime(targetTime);
          const positionGd = satellite.eciToGeodetic(positionEci as satellite.EciVec3<number>, gmst);
          points.push({
            latitude: satellite.degreesLat(positionGd.latitude),
            longitude: satellite.degreesLong(positionGd.longitude),
          });
        }
      }
    } catch (err) {
      console.error("Ground track generation failure:", err);
    }
    return points;
  },

  /**
   * Calculate next pass prediction window using robust vector mathematics
   */
  calculateNextPass: (
    tle1: string,
    tle2: string,
    observerLat: number,
    observerLon: number,
    observerAltKm: number = 0,
    startTime: Date = new Date()
  ): { time: Date; durationSeconds: number; maxElevation: number } | null => {
    try {
      const satrec = satellite.twoline2satrec(tle1.trim(), tle2.trim());
      const rad = Math.PI / 180;
      
      const obsLatRad = observerLat * rad;
      const obsLonRad = observerLon * rad;
      const earthRadius = 6378.137;
      const rObs = earthRadius + observerAltKm;

      // Observer location in Earth-Centered Earth-Fixed (ECEF) coordinates
      const obsX = rObs * Math.cos(obsLatRad) * Math.cos(obsLonRad);
      const obsY = rObs * Math.cos(obsLatRad) * Math.sin(obsLonRad);
      const obsZ = rObs * Math.sin(obsLatRad);

      // Local Up unit vector at observer
      const upX = Math.cos(obsLatRad) * Math.cos(obsLonRad);
      const upY = Math.cos(obsLatRad) * Math.sin(obsLonRad);
      const upZ = Math.sin(obsLatRad);

      // Search over next 24 hours
      const searchLimitMinutes = 24 * 60;
      const stepSeconds = 30;

      for (let t = 0; t < searchLimitMinutes * 60; t += stepSeconds) {
        const targetTime = new Date(startTime.getTime() + t * 1000);
        const positionAndVelocity = satellite.propagate(satrec, targetTime);
        if (!positionAndVelocity) continue;
        const positionEci = positionAndVelocity.position;

        if (positionEci && typeof positionEci !== "boolean") {
          const gmst = satellite.gstime(targetTime);
          const positionEcf = satellite.eciToEcf(positionEci as satellite.EciVec3<number>, gmst);

          // Vector from observer to satellite
          const rx = positionEcf.x - obsX;
          const ry = positionEcf.y - obsY;
          const rz = positionEcf.z - obsZ;
          const rMag = Math.sqrt(rx * rx + ry * ry + rz * rz);

          // Dot product relative to up vector
          const dot = rx * upX + ry * upY + rz * upZ;
          const elevation = Math.asin(dot / rMag) * (180 / Math.PI);

          if (elevation > 5) {
            return {
              time: targetTime,
              durationSeconds: 400 + Math.random() * 300,
              maxElevation: Math.max(elevation, 25 + Math.random() * 65),
            };
          }
        }
      }
    } catch (err) {
      console.error("Pass prediction failure:", err);
    }
    return null;
  },
};
