import dynamic from "next/dynamic";
import { AppConfig } from "@/types/webos/process";

// Dynamically import application components to optimize bundle size and prevent SSR issues
export const REGISTERED_APPS: AppConfig[] = [
  {
    id: "terminal",
    title: "TERMINAL",
    icon: "TERM",
    component: dynamic(() => import("@/components/webos/apps/Terminal"), {
      ssr: false,
    }),
    defaultWidth: 600,
    defaultHeight: 400,
    isSingleInstance: false,
  },
  {
    id: "file-manager",
    title: "ARES FILE SYSTEM",
    icon: "FILES",
    component: dynamic(() => import("@/components/webos/apps/FileManager"), {
      ssr: false,
    }),
    defaultWidth: 700,
    defaultHeight: 450,
    isSingleInstance: false,
  },
  {
    id: "settings",
    title: "SYSTEM CONFIG",
    icon: "SYS",
    component: dynamic(() => import("@/components/webos/apps/SettingsApp"), {
      ssr: false,
    }),
    defaultWidth: 500,
    defaultHeight: 450,
    isSingleInstance: true,
  },
  {
    id: "browser",
    title: "NET LINK",
    icon: "NET",
    component: dynamic(() => import("@/components/webos/apps/Browser"), {
      ssr: false,
    }),
    defaultWidth: 800,
    defaultHeight: 500,
    isSingleInstance: false,
  },
  {
    id: "text-editor",
    title: "MISSION LOG",
    icon: "NOTE",
    component: dynamic(() => import("@/components/webos/apps/TextEditor"), {
      ssr: false,
    }),
    defaultWidth: 500,
    defaultHeight: 400,
    isSingleInstance: false,
  },
  {
    id: "calendar",
    title: "SECTOR CALENDAR",
    icon: "DATE",
    component: dynamic(() => import("@/components/webos/apps/CalendarApp"), {
      ssr: false,
    }),
    defaultWidth: 650,
    defaultHeight: 420,
    isSingleInstance: false,
  },
  {
    id: "todo",
    title: "TASK BOARD",
    icon: "TASK",
    component: dynamic(() => import("@/components/webos/apps/TodoApp"), {
      ssr: false,
    }),
    defaultWidth: 460,
    defaultHeight: 400,
    isSingleInstance: false,
  },
  {
    id: "calculator",
    title: "CALC CORE",
    icon: "CALC",
    component: dynamic(() => import("@/components/webos/apps/Calculator"), {
      ssr: false,
    }),
    defaultWidth: 320,
    defaultHeight: 460,
    isSingleInstance: false,
  },
  {
    id: "clock",
    title: "TIME CORE",
    icon: "TIME",
    component: dynamic(() => import("@/components/webos/apps/ClockApp"), {
      ssr: false,
    }),
    defaultWidth: 500,
    defaultHeight: 380,
    isSingleInstance: false,
  },
  {
    id: "equation-realms",
    title: "MISSION REALMS",
    icon: "REAL",
    component: dynamic(() => import("@/components/webos/apps/EquationRealms"), {
      ssr: false,
    }),
    defaultWidth: 800,
    defaultHeight: 600,
    isSingleInstance: true,
  },
  {
    id: "equation-racers",
    title: "EQUATION RACERS",
    icon: "RACE",
    component: dynamic(() => import("@/components/webos/apps/EquationRacers"), {
      ssr: false,
    }),
    defaultWidth: 850,
    defaultHeight: 600,
    isSingleInstance: true,
  },
  {
    id: "neon-duel",
    title: "NEON DUEL",
    icon: "DUEL",
    component: dynamic(() => import("@/components/webos/apps/NeonDuel"), {
      ssr: false,
    }),
    defaultWidth: 900,
    defaultHeight: 650,
    isSingleInstance: true,
  },
  {
    id: "music-player",
    title: "AUDIO CORE",
    icon: "AUDIO",
    component: dynamic(() => import("@/components/webos/apps/MusicPlayer"), {
      ssr: false,
    }),
    defaultWidth: 700,
    defaultHeight: 480,
    isSingleInstance: true,
  },
  {
    id: "pixel-paint",
    title: "FIELD PAINT",
    icon: "PAINT",
    component: dynamic(() => import("@/components/webos/apps/PixelPaint"), {
      ssr: false,
    }),
    defaultWidth: 720,
    defaultHeight: 520,
    isSingleInstance: false,
  },
  {
    id: "mission-control",
    title: "MISSION CONSOLE",
    icon: "MCON",
    component: dynamic(() => import("@/components/webos/apps/MissionControl"), {
      ssr: false,
    }),
    defaultWidth: 850,
    defaultHeight: 550,
    isSingleInstance: true,
  },
];

export const getAppConfig = (id: string): AppConfig | undefined => {
  return REGISTERED_APPS.find((app) => app.id === id);
};
