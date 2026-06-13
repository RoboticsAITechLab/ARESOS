import dynamic from "next/dynamic";
import { AppConfig } from "@/types/webos/process";

// Dynamically import application components to optimize bundle size and prevent SSR issues
export const REGISTERED_APPS: AppConfig[] = [
  {
    id: "terminal",
    title: "Terminal",
    icon: "💻", // Emoji or Lucide icon class
    component: dynamic(() => import("@/components/webos/apps/Terminal"), {
      ssr: false,
    }),
    defaultWidth: 600,
    defaultHeight: 400,
    isSingleInstance: false,
  },
  {
    id: "file-manager",
    title: "File Explorer",
    icon: "📁",
    component: dynamic(() => import("@/components/webos/apps/FileManager"), {
      ssr: false,
    }),
    defaultWidth: 700,
    defaultHeight: 450,
    isSingleInstance: false,
  },
  {
    id: "settings",
    title: "Settings",
    icon: "⚙️",
    component: dynamic(() => import("@/components/webos/apps/SettingsApp"), {
      ssr: false,
    }),
    defaultWidth: 500,
    defaultHeight: 450,
    isSingleInstance: true,
  },
  {
    id: "browser",
    title: "Web Browser",
    icon: "🌐",
    component: dynamic(() => import("@/components/webos/apps/Browser"), {
      ssr: false,
    }),
    defaultWidth: 800,
    defaultHeight: 500,
    isSingleInstance: false,
  },
  {
    id: "text-editor",
    title: "Notepad",
    icon: "📝",
    component: dynamic(() => import("@/components/webos/apps/TextEditor"), {
      ssr: false,
    }),
    defaultWidth: 500,
    defaultHeight: 400,
    isSingleInstance: false,
  },
  {
    id: "calendar",
    title: "Calendar",
    icon: "📅",
    component: dynamic(() => import("@/components/webos/apps/CalendarApp"), {
      ssr: false,
    }),
    defaultWidth: 650,
    defaultHeight: 420,
    isSingleInstance: false,
  },
  {
    id: "todo",
    title: "Todo checklist",
    icon: "✅",
    component: dynamic(() => import("@/components/webos/apps/TodoApp"), {
      ssr: false,
    }),
    defaultWidth: 460,
    defaultHeight: 400,
    isSingleInstance: false,
  },
  {
    id: "calculator",
    title: "Calculator",
    icon: "🧮",
    component: dynamic(() => import("@/components/webos/apps/Calculator"), {
      ssr: false,
    }),
    defaultWidth: 320,
    defaultHeight: 460,
    isSingleInstance: false,
  },
  {
    id: "clock",
    title: "System Clock",
    icon: "⏰",
    component: dynamic(() => import("@/components/webos/apps/ClockApp"), {
      ssr: false,
    }),
    defaultWidth: 500,
    defaultHeight: 380,
    isSingleInstance: false,
  },
];

export const getAppConfig = (id: string): AppConfig | undefined => {
  return REGISTERED_APPS.find((app) => app.id === id);
};
