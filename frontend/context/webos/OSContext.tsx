"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Process } from "@/types/webos/process";
import { WindowInstance } from "@/types/webos/window";
import { SystemNotification, SystemSettings, SystemUser } from "@/types/webos/system";
import { getAppConfig } from "@/config/webos/apps.config";
import { playNotificationSound } from "@/utils/webos/audio";


interface OSContextType {
  processes: Process[];
  windows: WindowInstance[];
  activePid: string | null;
  settings: SystemSettings;
  notifications: SystemNotification[];
  currentUser: SystemUser;
  isStartMenuOpen: boolean;
  setStartMenuOpen: (open: boolean) => void;
  
  // Process / App Management
  launchApp: (appId: string, args?: Record<string, unknown>) => string | null;
  terminateApp: (pid: string) => void;
  
  // Window Management
  minimizeWindow: (pid: string) => void;
  maximizeWindow: (pid: string) => void;
  focusWindow: (pid: string) => void;
  updateWindowPosition: (pid: string, x: number, y: number) => void;
  updateWindowDimensions: (pid: string, width: number, height: number) => void;
  
  // System Controls
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  updateUser: (newUser: Partial<SystemUser>) => void;
  addNotification: (title: string, message: string, type?: SystemNotification["type"]) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

function generatePid(appId: string): string {
  return `${appId}-${Date.now()}`;
}

export const OSContext = createContext<OSContextType | undefined>(undefined);

export const OSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activePid, setActivePid] = useState<string | null>(null);
  const [isStartMenuOpen, setStartMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  
  const [settings, setSettings] = useState<SystemSettings>({
    theme: "dark",
    wallpaperUrlOrGradient: "url('/wallpapers/default_wallpaper.png')",
    volume: 80,
    brightness: 90,
    wallpaperBrightness: 80,
    maxStorageAllocation: 64,
    crtFilterEnabled: false,
  });

  const [currentUser, setCurrentUser] = useState<SystemUser>({
    username: "guest",
    role: "CLASS-1 ADMINISTRATOR",
    avatarUrl: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings, user, and notifications on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("aresos_system_settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.wallpaperUrlOrGradient === "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)") {
            parsed.wallpaperUrlOrGradient = "url('/wallpapers/default_wallpaper.png')";
          }
          setSettings(parsed);
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }

      const savedUser = localStorage.getItem("aresos_system_user");
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Failed to parse user details", e);
        }
      }

      const savedNotifs = localStorage.getItem("aresos_system_notifications");
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch (e) {
          console.error("Failed to parse notifications", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Save settings on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_system_settings", JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Save user details on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_system_user", JSON.stringify(currentUser));
    }
  }, [currentUser, isLoaded]);

  // Save notifications list on changes
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_system_notifications", JSON.stringify(notifications));
    }
  }, [notifications, isLoaded]);

  const updateUser = (newUser: Partial<SystemUser>) => {
    setCurrentUser((prev) => ({ ...prev, ...newUser }));
  };

  // Track the highest z-index to bring focused windows to front
  const [maxZIndex, setMaxZIndex] = useState(10);

  // Generate a cascading window position
  const getNextWindowPosition = (width: number, height: number) => {
    const defaultX = 60;
    const defaultY = 60;
    const offset = 30;

    if (windows.length === 0) {
      return { x: defaultX, y: defaultY };
    }

    const lastWindow = windows[windows.length - 1];
    let nextX = lastWindow.x + offset;
    let nextY = lastWindow.y + offset;

    // Boundary check (wrap around if it overflows the viewport)
    if (typeof window !== "undefined") {
      if (nextX + width > window.innerWidth - 40) nextX = defaultX;
      if (nextY + height > window.innerHeight - 100) nextY = defaultY;
    }

    return { x: nextX, y: nextY };
  };

  // Launch dynamic process & map it to a window
  const launchApp = (appId: string, args?: Record<string, unknown>) => {
    const config = getAppConfig(appId);
    if (!config) {
      addNotification("Launch Error", `Application '${appId}' not found.`, "error");
      return null;
    }

    // Check if application is single instance and already running
    if (config.isSingleInstance) {
      const existingProcess = processes.find((p) => p.appId === appId);
      if (existingProcess) {
        focusWindow(existingProcess.pid);
        setStartMenuOpen(false);
        return existingProcess.pid;
      }
    }

    const pid = generatePid(appId);
    const newProcess: Process = {
      pid,
      appId,
      title: config.title,
      state: "running",
      args,
    };

    const width = config.defaultWidth || 600;
    const height = config.defaultHeight || 400;
    const { x, y } = getNextWindowPosition(width, height);
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);

    const newWindow: WindowInstance = {
      id: pid,
      pid,
      title: config.title,
      x,
      y,
      width,
      height,
      isMinimized: false,
      isMaximized: false,
      isFocused: true,
      zIndex: nextZ,
    };

    // Unfocus other windows
    setWindows((prev) =>
      prev.map((w) => ({ ...w, isFocused: false })).concat(newWindow)
    );
    setProcesses((prev) => [...prev, newProcess]);
    setActivePid(pid);
    setStartMenuOpen(false);

    return pid;
  };

  // Terminate process & destroy window
  const terminateApp = (pid: string) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
    setWindows((prev) => prev.filter((w) => w.pid !== pid));
    
    if (activePid === pid) {
      // Find another window to focus
      const remaining = windows.filter((w) => w.pid !== pid);
      if (remaining.length > 0) {
        const sorted = [...remaining].sort((a, b) => b.zIndex - a.zIndex);
        const topWindow = sorted[0];
        setActivePid(topWindow.pid);
        setWindows((prev) =>
          prev.map((w) =>
            w.pid === topWindow.pid ? { ...w, isFocused: true } : w
          )
        );
      } else {
        setActivePid(null);
      }
    }
  };

  // Minimize Window
  const minimizeWindow = (pid: string) => {
    setWindows((prev) => {
      const targetWin = prev.find((w) => w.pid === pid);
      if (!targetWin) return prev;

      const willBeMinimized = !targetWin.isMinimized;
      let nextActivePid = activePid;

      if (willBeMinimized) {
        // We are minimizing this window.
        // If it was the active window, we must find the next window to focus.
        if (activePid === pid) {
          const remaining = prev.filter((w) => w.pid !== pid && !w.isMinimized);
          if (remaining.length > 0) {
            const sorted = [...remaining].sort((a, b) => b.zIndex - a.zIndex);
            nextActivePid = sorted[0].pid;
          } else {
            nextActivePid = null;
          }
        }
      } else {
        // We are restoring/unminimizing this window, so it becomes the active window.
        nextActivePid = pid;
      }

      // Update active PID in state
      if (nextActivePid !== activePid) {
        setActivePid(nextActivePid);
      }

      const nextZ = !willBeMinimized ? maxZIndex + 1 : maxZIndex;
      if (!willBeMinimized) {
        setMaxZIndex(nextZ);
      }

      return prev.map((w) => {
        if (w.pid === pid) {
          return {
            ...w,
            isMinimized: willBeMinimized,
            isFocused: !willBeMinimized, // Focused only if we restored it.
            zIndex: !willBeMinimized ? nextZ : w.zIndex,
          };
        }
        return {
          ...w,
          isFocused: w.pid === nextActivePid,
        };
      });
    });
  };

  // Maximize Window
  const maximizeWindow = (pid: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.pid === pid ? { ...w, isMaximized: !w.isMaximized } : w))
    );
    focusWindow(pid);
  };

  // Focus Window
  const focusWindow = (pid: string) => {
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    
    setWindows((prev) =>
      prev.map((w) =>
        w.pid === pid
          ? { ...w, isFocused: true, isMinimized: false, zIndex: nextZ }
          : { ...w, isFocused: false }
      )
    );
    setActivePid(pid);
  };

  // Update position during dragging
  const updateWindowPosition = (pid: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.pid === pid ? { ...w, x, y } : w))
    );
  };

  // Update dimensions during resizing
  const updateWindowDimensions = (pid: string, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.pid === pid ? { ...w, width, height } : w))
    );
  };

  // System settings updates
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Notification management
  const addNotification = (
    title: string,
    message: string,
    type: SystemNotification["type"] = "info"
  ) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    playNotificationSound((settings.volume ?? 80) / 100);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <OSContext.Provider
      value={{
        processes,
        windows,
        activePid,
        settings,
        notifications,
        currentUser,
        isStartMenuOpen,
        setStartMenuOpen,
        launchApp,
        terminateApp,
        minimizeWindow,
        maximizeWindow,
        focusWindow,
        updateWindowPosition,
        updateWindowDimensions,
        updateSettings,
        updateUser,
        addNotification,
        markNotificationAsRead,
        clearNotifications,
      }}
    >
      {children}
    </OSContext.Provider>
  );
};
