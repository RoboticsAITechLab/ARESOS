"use client";

import React, { useState } from "react";
import { OSProvider } from "@/context/webos/OSContext";
import { FSProvider } from "@/context/webos/FSContext";
import { Desktop } from "@/components/webos/core/Desktop";
import { Taskbar } from "@/components/webos/core/Taskbar";
import { StartMenu } from "@/components/webos/core/StartMenu";
import { NotificationCenter } from "@/components/webos/core/NotificationCenter";
import { MenuBar } from "@/components/webos/core/MenuBar";
import { useOS } from "@/hooks/webos/useOS";

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
  const [isNotifOpen, setNotifOpen] = useState(false);
  const { settings } = useOS();

  const isCrt = settings?.crtFilterEnabled ?? false;

  return (
    <div className={isCrt ? "crt-screen relative w-screen h-[100dvh] overflow-hidden" : "relative w-screen h-[100dvh] overflow-hidden"}>
      {isCrt && <div className="crt-overlay" />}
      <div className="orbital-grid" />
      <div className="orbital-radar" />
      
      <main className="flex flex-col w-full h-[100dvh] overflow-hidden select-none relative font-mono animate-in fade-in duration-500">
        {/* Mission-control status bar */}
        <MenuBar />

        {/* Desktop Workspace (contains wallpapers, shortcuts, open windows) */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col">
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
    </div>
  );
}
