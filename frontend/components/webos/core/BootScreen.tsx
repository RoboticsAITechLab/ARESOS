"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useOS } from "@/hooks/webos/useOS";
import { playBootSound } from "@/utils/webos/audio";
import { logoPaths } from "./logoPaths";

interface BootScreenProps {
  onComplete: () => void;
}

type BootStage =
  | "start"
  | "orbit"
  | "nodes"
  | "core"
  | "shape"
  | "brand"
  | "logs"
  | "ready"
  | "transition";

const BOOT_MESSAGES = [
  { text: "Initializing kernel...", id: "kernel" },
  { text: "Loading virtual filesystem...", id: "vfs" },
  { text: "Starting desktop services...", id: "desktop" },
  { text: "Restoring user session...", id: "session" },
  { text: "System ready.", id: "ready" },
];

const visibleCountMap: Record<BootStage, number> = {
  start: 0,
  orbit: 0,
  nodes: 0,
  core: 0,
  shape: 0,
  brand: 0,
  logs: 4,
  ready: 5,
  transition: 5,
};

const stageOrder: Record<BootStage, number> = {
  start: 0,
  orbit: 1,
  nodes: 2,
  core: 3,
  shape: 4,
  brand: 5,
  logs: 6,
  ready: 7,
  transition: 8,
};

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const { settings } = useOS();
  const [stage, setStage] = useState<BootStage>("start");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let activeTimer: NodeJS.Timeout | null = null;
    let currentIndex = 0;

    const timeline = [
      { stage: "orbit" as BootStage, delay: 120 },
      { stage: "nodes" as BootStage, delay: 260 },
      { stage: "core" as BootStage, delay: 320 },
      { stage: "shape" as BootStage, delay: 380 },
      { stage: "brand" as BootStage, delay: 400 },
      {
        stage: "logs" as BootStage,
        delay: 500,
        action: () => {
          try {
            playBootSound((settings?.volume ?? 80) / 100);
          } catch (err) {
            console.warn("Boot audio chime failed to play:", err);
          }
        },
      },
      { stage: "ready" as BootStage, delay: 800 },
      { stage: "transition" as BootStage, delay: 100 },
      {
        stage: "transition" as BootStage,
        delay: 360,
        action: () => onComplete(),
      },
    ];

    const runNextStep = () => {
      if (currentIndex >= timeline.length) return;
      const step = timeline[currentIndex];

      activeTimer = setTimeout(() => {
        setStage(step.stage);
        if (step.action) step.action();
        currentIndex++;
        runNextStep();
      }, step.delay);
    };

    runNextStep();

    return () => {
      if (activeTimer) clearTimeout(activeTimer);
    };
  }, [onComplete, settings?.volume]);

  const currentStep = stageOrder[stage];
  const visibleCount = visibleCountMap[stage];
  const brandVisible = currentStep >= stageOrder.brand;
  const logsVisible = stage === "logs" || stage === "ready" || stage === "transition";

  return (
    <div className="fixed inset-0 z-[99999] flex h-dvh w-screen select-none flex-col items-center justify-center overflow-hidden bg-[#050505] px-6 text-zinc-200">
      <motion.div
        className="flex w-full flex-col items-center justify-center"
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: stage === "transition" ? 0 : 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width: "min(88vw, 62vh, 38rem)",
            height: "min(88vw, 62vh, 38rem)",
          }}
          animate={{
            scale: stage === "ready" && !shouldReduceMotion ? 1.008 : 1,
          }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        >
          <svg
            viewBox="0 0 1254 1254"
            className="h-full w-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.g
              animate={{
                opacity: currentStep >= stageOrder.orbit ? 0.58 : 0.32,
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: "easeOut" }}
            >
              {logoPaths.orbitRing.map((p, i) => (
                <path key={`orbit-${i}`} fill={p.fill} d={p.d} stroke="none" />
              ))}
            </motion.g>

            <motion.g
              animate={{
                opacity: currentStep >= stageOrder.nodes ? 0.64 : 0.34,
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
            >
              {logoPaths.leftNode.map((p, i) => (
                <path key={`left-${i}`} fill={p.fill} d={p.d} stroke="none" />
              ))}
              {logoPaths.rightNode.map((p, i) => (
                <path key={`right-${i}`} fill={p.fill} d={p.d} stroke="none" />
              ))}
            </motion.g>

            <motion.g
              animate={{
                opacity: currentStep >= stageOrder.shape ? 1 : 0.82,
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut" }}
            >
              {logoPaths.mainAShape.map((p, i) => (
                <path key={`a-${i}`} fill={p.fill} d={p.d} stroke="none" />
              ))}
            </motion.g>

            <motion.g
              transform="translate(250.8 294) scale(0.6)"
              animate={{
                opacity: currentStep >= stageOrder.core ? 0.58 : 0.28,
              }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
            >
              {logoPaths.centerCore.map((p, i) => (
                <path key={`core-${i}`} fill={p.fill} d={p.d} stroke="none" />
              ))}
            </motion.g>
          </svg>
        </motion.div>

        <motion.div
          className="mt-[-clamp(1.25rem,4.5vh,2.35rem)] text-center"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: brandVisible && stage !== "transition" ? 1 : 0, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
        >
          <p className="text-[clamp(0.9rem,2vh,1.1rem)] font-semibold uppercase tracking-[0.34em] text-zinc-200">
            ARESOS
          </p>
        </motion.div>

        <motion.div
          className="mt-[clamp(0.8rem,2.2vh,1.2rem)] flex min-h-[5.25rem] w-full max-w-[21rem] flex-col gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: logsVisible && stage !== "transition" ? 1 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
          aria-live="polite"
          aria-label="System startup"
        >
          {BOOT_MESSAGES.slice(0, visibleCount).map((msg, index) => {
            const isLatest = index === visibleCount - 1;
            const isDone = !isLatest || stage === "ready" || stage === "transition";

            return (
              <motion.p
                key={msg.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
                className={`font-mono text-[12px] leading-relaxed tracking-normal ${
                  isDone ? "text-zinc-600" : "text-zinc-300"
                }`}
              >
                {msg.text}
              </motion.p>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
};
