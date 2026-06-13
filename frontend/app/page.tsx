"use client";

import React, { useState } from "react";
import { OSProvider } from "@/context/webos/OSContext";
import { FSProvider } from "@/context/webos/FSContext";
import { Desktop } from "@/components/webos/core/Desktop";
import { Taskbar } from "@/components/webos/core/Taskbar";
import { StartMenu } from "@/components/webos/core/StartMenu";
import { NotificationCenter } from "@/components/webos/core/NotificationCenter";
import { BootScreen } from "@/components/webos/core/BootScreen";
import { LoginScreen } from "@/components/webos/core/LoginScreen";

export default function Home() {
  return (
    <OSProvider>
      <FSProvider>
        <WebOSLayout />
      </FSProvider>
    </OSProvider>
  );
}

function WebOSLayout() {
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(true);
  const [isNotifOpen, setNotifOpen] = useState(false);

  if (isBooting) {
    return <BootScreen onComplete={() => setIsBooting(false)} />;
  }

  if (isLoggingIn) {
    return <LoginScreen onSuccess={() => setIsLoggingIn(false)} />;
  }

  return (
    <main className="flex flex-col w-screen h-screen overflow-hidden select-none relative font-sans animate-in fade-in duration-500">
      {/* Desktop Workspace (contains wallpapers, shortcuts, open windows) */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
        <Desktop />
      </div>

      {/* Start Menu Overlay */}
      <StartMenu />

      {/* Slide-out Notification Drawer */}
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setNotifOpen(false)}
      />

      {/* Taskbar Panel (anchored at the bottom) */}
      <Taskbar onToggleNotifications={() => setNotifOpen(!isNotifOpen)} />
    </main>
  );
}
