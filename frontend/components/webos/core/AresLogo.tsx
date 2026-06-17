"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { logoPaths } from "./logoPaths";

interface AresLogoProps {
  className?: string;
  /** Fade-in on mount (boot entrance). Login uses false for seamless handoff. */
  entrance?: boolean;
  /** Very subtle core pulse — login idle only */
  pulse?: boolean;
}

export const AresLogo: React.FC<AresLogoProps> = ({
  className = "",
  entrance = true,
  pulse = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const showPulse = pulse && !shouldReduceMotion;

  const svg = (
    <svg
      viewBox="0 0 1254 1254"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full select-none pointer-events-none"
      aria-hidden
    >
      {logoPaths.mainAShape.map((p, i) => (
        <path key={`a-${i}`} fill={p.fill} d={p.d} />
      ))}
      <g>
        {logoPaths.orbitRing.map((p, i) => (
          <path key={`orbit-${i}`} fill={p.fill} d={p.d} opacity="0.82" />
        ))}
        {logoPaths.leftNode.map((p, i) => (
          <path key={`left-${i}`} fill={p.fill} d={p.d} opacity="0.86" />
        ))}
        {logoPaths.rightNode.map((p, i) => (
          <path key={`right-${i}`} fill={p.fill} d={p.d} opacity="0.86" />
        ))}
      </g>
      <motion.g
        style={{ transformOrigin: "627px 735px", transformBox: "view-box" }}
        transform="translate(188.1 220.5) scale(0.7)"
        opacity="0.72"
        animate={showPulse ? { scale: [1, 1.015, 1] } : undefined}
        transition={
          showPulse
            ? { repeat: Infinity, duration: 4, ease: "easeInOut" }
            : undefined
        }
      >
        {logoPaths.centerCore.map((p, i) => (
          <path key={`core-${i}`} fill={p.fill} d={p.d} />
        ))}
      </motion.g>
    </svg>
  );

  if (!entrance || shouldReduceMotion) {
    return (
      <div className={`flex items-center justify-center ${className}`}>{svg}</div>
    );
  }

  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      initial={{ opacity: 0.1, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {svg}
    </motion.div>
  );
};
