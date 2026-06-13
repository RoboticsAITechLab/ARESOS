"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { Window } from "./Window";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { REGISTERED_APPS } from "@/config/webos/apps.config";

export const Desktop: React.FC = () => {
  const { windows, launchApp, settings, updateSettings, addNotification } = useOS();
  const { listDirectory, createDirectory, writeFile } = useFileSystem();
  
  const [desktopFiles, setDesktopFiles] = useState<{ name: string; type: string }[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  // Load files from virtual desktop directory
  const refreshDesktopFiles = () => {
    try {
      const files = listDirectory("/home/user/Desktop");
      setDesktopFiles(
        files.map((f) => ({
          name: f.name,
          type: f.node.type,
        }))
      );
    } catch (e) {
      console.error("Failed to load desktop files", e);
    }
  };

  useEffect(() => {
    refreshDesktopFiles();
    // Refresh desktop icons every time a filesystem change might occur
    const interval = setInterval(refreshDesktopFiles, 1500);
    return () => clearInterval(interval);
  }, []);

  // Handle Desktop Right-Click
  const handleContextMenu = (e: React.MouseEvent) => {
    // Only trigger on desktop backdrop, not child items
    const target = e.target as HTMLElement;
    if (target.id === "desktop-backdrop" || target.id === "desktop-grid") {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        isOpen: true,
      });
    }
  };

  // Actions for Context Menu
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: "Create New Text File",
      icon: "📄",
      action: () => {
        const name = prompt("Enter file name (e.g. notes.txt):", "untitled.txt");
        if (name) {
          const path = `/home/user/Desktop/${name}`;
          const ok = writeFile(path, "");
          if (ok) {
            refreshDesktopFiles();
            addNotification("File Created", `Created text file ${name} on Desktop.`, "success");
          } else {
            addNotification("Error", "Could not create file.", "error");
          }
        }
      },
    },
    {
      label: "Create New Folder",
      icon: "📁",
      action: () => {
        const name = prompt("Enter folder name:", "New Folder");
        if (name) {
          const ok = createDirectory("/home/user/Desktop", name);
          if (ok) {
            refreshDesktopFiles();
            addNotification("Folder Created", `Created folder ${name} on Desktop.`, "success");
          } else {
            addNotification("Error", "Folder already exists or directory not found.", "error");
          }
        }
      },
    },
    {
      label: "Open Terminal",
      icon: "💻",
      divider: true,
      action: () => {
        launchApp("terminal");
      },
    },
    {
      label: "Change Wallpaper",
      icon: "🎨",
      action: () => {
        const gradients = [
          "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
          "linear-gradient(135deg, #180828 0%, #280818 50%, #081828 100%)",
          "linear-gradient(135deg, #050508 0%, #0b1528 70%, #1e1b4b 100%)",
          "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
        ];
        const currentIdx = gradients.indexOf(settings.wallpaperUrlOrGradient);
        const nextIdx = (currentIdx + 1) % gradients.length;
        updateSettings({ wallpaperUrlOrGradient: gradients[nextIdx] });
        addNotification("System Settings", "Desktop wallpaper updated successfully.", "info");
      },
    },
  ];

  // Handle double clicking desktop shortcut
  const handleDoubleClickShortcut = (name: string, type: string) => {
    if (type === "directory") {
      launchApp("file-manager", { initialPath: `/home/user/Desktop/${name}` });
    } else {
      if (name.endsWith(".txt") || name.endsWith(".md")) {
        launchApp("text-editor", { filePath: `/home/user/Desktop/${name}` });
      } else {
        addNotification("Open File", `No default app handler for this file type.`, "warning");
      }
    }
  };

  return (
    <div
      id="desktop-backdrop"
      onContextMenu={handleContextMenu}
      style={{
        backgroundImage: settings.wallpaperUrlOrGradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="flex-1 w-full h-full relative overflow-hidden p-6 select-none"
    >
      {/* Grid of Desktop Files/Folders Shortcuts */}
      <div
        id="desktop-grid"
        className="absolute top-6 left-6 bottom-16 right-6 grid grid-flow-col auto-cols-[100px] grid-rows-[repeat(auto-fill,100px)] gap-4 justify-start items-start pointer-events-none"
      >
        {/* Default App Shortcuts */}
        {REGISTERED_APPS.map((app) => (
          <div
            key={app.id}
            onDoubleClick={() => launchApp(app.id)}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-zinc-100 hover:bg-white/10 active:bg-white/20 transition duration-150 cursor-pointer pointer-events-auto group select-none text-center"
          >
            <div className="text-3.5xl mb-1 filter drop-shadow group-hover:scale-105 transition-transform duration-100 select-none">
              {app.icon}
            </div>
            <span className="text-xs font-medium truncate w-full filter drop-shadow-md text-shadow">
              {app.title}
            </span>
          </div>
        ))}

        {/* VFS Desktop files & folders */}
        {desktopFiles.map((file) => (
          <div
            key={file.name}
            onDoubleClick={() => handleDoubleClickShortcut(file.name, file.type)}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-zinc-100 hover:bg-white/10 active:bg-white/20 transition duration-150 cursor-pointer pointer-events-auto group select-none text-center"
          >
            <div className="text-3.5xl mb-1 filter drop-shadow group-hover:scale-105 transition-transform duration-100 select-none">
              {file.type === "directory" ? "📁" : "📄"}
            </div>
            <span className="text-xs font-medium truncate w-full filter drop-shadow-md text-shadow">
              {file.name}
            </span>
          </div>
        ))}
      </div>

      {/* Render open process windows */}
      {windows.map((win) => {
        const config = REGISTERED_APPS.find((app) => app.id === win.pid.split("-")[0]);
        if (!config) return null;
        
        const AppComponent = config.component;
  
        return (
          <Window key={win.id} windowState={win}>
            <AppComponent pid={win.pid} />
          </Window>
        );
      })}

      {/* Custom Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        items={contextMenuItems}
      />
    </div>
  );
};
