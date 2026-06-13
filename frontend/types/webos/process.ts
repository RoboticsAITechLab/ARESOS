import React from "react";

export type ProcessState = "running" | "suspended" | "terminated";

export interface AppConfig {
  id: string; // E.g., "terminal", "file-manager"
  title: string;
  icon: string; // Lucide icon name or emoji or path
  component: React.ComponentType<{ pid: string }>; // Component to render inside window
  defaultWidth?: number;
  defaultHeight?: number;
  isSingleInstance?: boolean;
}

export interface Process {
  pid: string; // Unique process identifier (UUID or numeric string)
  appId: string; // Maps to AppConfig.id
  title: string; // Can be customized dynamically (e.g. Terminal - home)
  state: ProcessState;
  args?: Record<string, unknown>; // Launch arguments
}
