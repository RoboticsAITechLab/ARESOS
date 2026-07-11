"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { Window } from "./Window";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { REGISTERED_APPS } from "@/config/webos/apps.config";
import { RenameModal } from "@/components/webos/RenameModal";
import { DeleteConfirmModal } from "./DeleteConfirmModel";
import { PropertiesModal } from "./PropertiesModal";
import { PropertyNode } from "@/types/webos/property";

const MODAL_Z_INDEX = 99999;


const DESKTOP_SYSTEM_APPS = [
  "terminal",
  "file-manager",
  "mission-control",
  "settings",
  "equation-racers",
  "text-editor",
];

export const Desktop: React.FC = () => {
  const { windows, launchApp, settings, updateSettings, addNotification } = useOS();
  const { listDirectory, createDirectory, writeFile, clipboard, copyNode, pasteNode, renameNode, deleteNode, changeDirectory } = useFileSystem();

  const [desktopFiles, setDesktopFiles] = useState<{ name: string; type: string }[]>([]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    isOpen: boolean;
    targetName: string | null;
    targetType: "file" | "directory" | "app" | null;
  }>({
    x: 0,
    y: 0,
    isOpen: false,
    targetName: null,
    targetType: null,
  });

  // Desktop file operations
  const [renameModal, setRenameModal] = useState({ isOpen: false, targetName: "", newName: "" });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, targetName: "" });


  const [propertiesModal, setPropertiesModal] =
    useState<{
      isOpen: boolean;
      targetNode: PropertyNode | null;
    }>({
      isOpen: false,
      targetNode: null,
    });


  // get desktop path 
  const DESKTOP_PATH = "/home/user/Desktop";

  // Load files from virtual desktop 
  const refreshDesktopFiles = React.useCallback(() => {
    try {
      const files = listDirectory(DESKTOP_PATH);
      setDesktopFiles(
        files.map((f) => ({
          name: f.name,
          type: f.node.type,
        }))
      );
    } catch (e) {
      console.error("Failed to load desktop files", e);
    }
  }, [listDirectory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshDesktopFiles();
    }, 0);
    // Refresh desktop icons every time a filesystem change might occur
    refreshDesktopFiles();
    return () => {
      clearTimeout(timer);
    };
  }, [refreshDesktopFiles]);

  // Handle Desktop Right-Click
  const handleContextMenu = (e: React.MouseEvent, targetName: string | null = null, targetType: "file" | "directory" | "app" | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    // If it's a click on empty desktop space, only trigger if target is backdrop or grid
    if (!targetName) {
      const target = e.target as HTMLElement;
      if (target.id !== "desktop-backdrop" && target.id !== "desktop-grid") {
        return;
      }
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true,
      targetName,
      targetType,
    });
  };


  const fullPath = `${DESKTOP_PATH}/${name}`;

  // Handle double clicking desktop shortcut
  const handleDoubleClickShortcut = (name: string, type: string) => {
    if (type === "directory") {
      launchApp("file-manager", { startPath: `${fullPath}` });
    } else {
      if (name.endsWith(".txt") || name.endsWith(".md")) {
        launchApp("text-editor", { filePath: `${fullPath}` });
      } else {
        addNotification("Open File", `No default app handler for this file type.`, "warning");
      }
    }
  };

  // Modals trigger 
  const triggerProperties = (name: string, type: "file" | "directory" | "app") => {
    if (type === "app") {
      const config = REGISTERED_APPS.find((app) => app.id === name);
      setPropertiesModal({
        isOpen: true,
        targetNode: {
          name: config?.title || name,
          type: "System Application Shortcut",
          path: `aresos://apps/${name}`,
          size: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          permissions: { read: true, write: false, execute: true }
        }
      });
    } else {
      const fullPath = `fullPath`;
      const items = listDirectory(DESKTOP_PATH);
      const found = items.find((i) => i.name === name);
      if (found) {

        setPropertiesModal({
          isOpen: true,
          targetNode: {
            name: found.name,
            type: found.node.type,
            path: fullPath,
            size: found.node.type === "file" ? (found.node).size : 0,
            createdAt: (found.node).createdAt || Date.now(),
            updatedAt: (found.node).updatedAt || Date.now(),
            permissions: { read: true, write: true, execute: found.node.type === "directory" }
          }
        });
      }
    }
  };

  const executeRename = (e: React.FormEvent) => {
    e.preventDefault();
    const oldName = renameModal.targetName;
    const newName = renameModal.newName.trim();
    if (!newName || newName === oldName) {
      setRenameModal({ isOpen: false, targetName: "", newName: "" });
      return;
    }

    const oldFullPath = `${DESKTOP_PATH}/${oldName}`;
    const ok = renameNode(oldFullPath, newName);
    if (ok) {
      refreshDesktopFiles();
      setRenameModal({ isOpen: false, targetName: "", newName: "" });
      addNotification("System Shell", `Renamed "${oldName}" to "${newName}" on Desktop.`, "success");
    } else {
      addNotification("Error", "Rename action failed. Target filename might already exist.", "error");
    }
  };

  const executeDelete = () => {
    const name = deleteConfirmModal.targetName;
    if (!name) return;
    const fullPath = `${DESKTOP_PATH}/${name}`;
    const ok = deleteNode(fullPath);
    if (ok) {
      refreshDesktopFiles();
      setDeleteConfirmModal({ isOpen: false, targetName: "" });
      addNotification("System Shell", `Deleted "${name}" from Desktop.`, "success");
    } else {
      addNotification("Error", "Could not delete file/folder.", "error");
    }
  };

  // Right-Click Context Menu items logic (dynamic configuration)
  const getContextMenuItems = (): ContextMenuItem[] => {
    const { targetName, targetType } = contextMenu;

    if (!targetName) {
      return [
        {
          label: "Refresh Desktop",
          icon: "🔄",
          divider: true,
          action: () => {
            refreshDesktopFiles();
            addNotification("System", "Desktop refreshed.", "info");
          },
        },
        {
          label: "Create New Text File",
          icon: "📄",
          action: () => {
            let baseName = "New Text Document.txt";
            let fileName = baseName;
            let counter = 2;
            try {
              const existing = listDirectory(DESKTOP_PATH);
              const existingNames = new Set(existing.map((item) => item.name));
              while (existingNames.has(fileName)) {
                fileName = `New Text Document (${counter}).txt`;
                counter++;
              }
            } catch (e) {
              console.error(e);
            }
            const path = `${DESKTOP_PATH}/${fileName}`;
            const ok = writeFile(path, "");
            if (ok) {
              refreshDesktopFiles();
              addNotification("File Created", `Created text file "${fileName}" on Desktop.`, "success");
            }
          },
        },
        {
          label: "Create New Folder",
          icon: "📁",
          action: () => {
            let baseName = "New Folder";
            let folderName = baseName;
            let counter = 2;
            try {
              const existing = listDirectory(DESKTOP_PATH);
              const existingNames = new Set(existing.map((item) => item.name));
              while (existingNames.has(folderName)) {
                folderName = `${baseName} (${counter})`;
                counter++;
              }
            } catch (e) {
              console.error(e);
            }
            const ok = createDirectory(DESKTOP_PATH, folderName);
            if (ok) {
              refreshDesktopFiles();
              addNotification("Folder Created", `Created folder "${folderName}" on Desktop.`, "success");
            }
          },
        },
        {
          label: "Paste Clipboard",
          icon: "📋",
          divider: true,
          disabled: !clipboard,
          action: () => {
            if (clipboard) {
              const ok = pasteNode(DESKTOP_PATH);
              if (ok) {
                refreshDesktopFiles();
                addNotification("Clipboard", "Pasted items on Desktop.", "success");
              }
            }
          },
        },
        {
          label: "Open in Terminal",
          icon: "💻",
          action: () => {
            changeDirectory(DESKTOP_PATH);
            launchApp("terminal");
          },
        },
        {
          label: "Change Wallpaper",
          icon: "🎨",
          action: () => {
            const gradients = [
              "url('/wallpapers/default_wallpaper.png')",
              "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
              "linear-gradient(135deg, #180828 0%, #280818 50%, #081828 100%)",
              "linear-gradient(135deg, #050508 0%, #0b1528 70%, #1e1b4b 100%)",
              "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
            ];
            const currentIdx = gradients.indexOf(settings.wallpaperUrlOrGradient);
            const nextIdx = (currentIdx + 1) % gradients.length;
            updateSettings({ wallpaperUrlOrGradient: gradients[nextIdx] });
            addNotification("System Settings", "Wallpaper changed", "info");
          },
        },
      ];
    }

    if (targetType === "app") {
      return [
        {
          label: `Open ${targetName.toUpperCase()}`,
          icon: "⚡",
          divider: true,
          action: () => {
            launchApp(targetName);
          },
        },
        {
          label: "Properties",
          icon: "⚙️",
          action: () => {
            triggerProperties(targetName, "app");
          },
        },
      ];
    }

    const menuItems = [
      {
        label: "Open",
        icon: "📂",
        divider: true,
        action: () => {
          if (targetType) handleDoubleClickShortcut(targetName, targetType);
        },
      },
      {
        label: "Copy",
        icon: "📄",
        action: () => {
          copyNode([`${DESKTOP_PATH}/${targetName}`], "copy");
          addNotification("Clipboard", `Copied "${targetName}" to VFS clipboard.`, "info");
        },
      },
      {
        label: "Cut",
        icon: "✂️",
        action: () => {
          copyNode([`${DESKTOP_PATH}/${targetName}`], "cut");
          addNotification("Clipboard", `Cut "${targetName}" to VFS clipboard.`, "info");
        },
      },
      {
        label: "Rename",
        icon: "✏️",
        action: () => {
          setRenameModal({ isOpen: true, targetName, newName: targetName });
        },
      },
      {
        label: "Delete",
        icon: "🗑️",
        action: () => {
          setDeleteConfirmModal({ isOpen: true, targetName });
        },
      },
    ];

    if (targetType === "directory") {
      menuItems.push({
        label: "Open in Terminal",
        icon: "💻",
        action: () => {
          changeDirectory(`${DESKTOP_PATH}/${targetName}`);
          launchApp("terminal");
        },
      });
    }

    menuItems.push({
      label: "Properties",
      icon: "⚙️",
      action: () => {
        if (targetType) triggerProperties(targetName, targetType);
      },
    });

    return menuItems;
  };

  const contextMenuItems = getContextMenuItems();

  return (
    <div
      id="desktop-backdrop"
      onContextMenu={(e) => handleContextMenu(e, null)}
      className="relative h-full w-full overflow-hidden select-none bg-[#050607] p-6"
    >
      {/* Exclusive wallpaper background layer with brightness filter */}
      <div
        className="absolute inset-0 z-0 transition-all duration-300 pointer-events-none"
        style={{
          backgroundImage: settings.wallpaperUrlOrGradient,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `brightness(${settings.wallpaperBrightness ?? 100}%)`,
        }}
      />

      <div className="orbital-grid" />
      <div className="orbital-radar" />


      {/* PERMANENT ORBITAL MISSION HUD OVERLAYS */}
      <div className="hidden md:flex absolute inset-0 z-0 flex-col justify-between p-8 font-mono select-none pointer-events-none text-red-500/25">
        {/* Top Section */}
        <div className="flex justify-between w-full">

        </div>



        {/* Center Target Crosshair Overlay */}
        <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none opacity-20">
          <div className="flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-red-500/50">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border border-dotted border-red-500/50">
              <div className="h-4 w-4 rounded-full border border-red-500/70" />
            </div>
          </div>
          <div className="absolute h-[1px] w-60 bg-red-500/40" />
          <div className="absolute h-60 w-[1px] bg-red-500/40" />
        </div>

      </div>

      {/* Grid of Desktop Files/Folders Shortcuts */}
      <div
        id="desktop-grid"
        className="absolute top-16 md:top-36 left-4 right-4 md:left-6 md:right-6 bottom-24 grid grid-cols-3 sm:grid-cols-4 md:grid-flow-col md:auto-cols-[120px] md:grid-rows-[repeat(auto-fill,110px)] md:grid-cols-none gap-3 justify-items-center md:justify-start items-start pointer-events-none z-10 overflow-y-auto md:overflow-y-visible"
      >


        {/* System Apps shortcuts */}
        {DESKTOP_SYSTEM_APPS.map((appId) => {
          const app = REGISTERED_APPS.find((a) => a.id === appId);
          if (!app) return null;
          return (
            <div
              key={app.id}
              onDoubleClick={() => launchApp(app.id)}
              onContextMenu={(e) => handleContextMenu(e, app.id, "app")}
              className="flex flex-col items-center justify-center w-full max-w-[100px] h-[96px] md:max-w-none md:h-auto border border-[rgba(214,58,58,0.14)] bg-black/10 p-2 text-center text-[#f3dada] transition duration-150 cursor-pointer pointer-events-auto group select-none hover:border-[rgba(214,58,58,0.35)] hover:bg-[rgba(214,58,58,0.08)]"
            >
              <div className="mb-1 text-[12px] font-semibold tracking-[0.22em] text-[#ffdddd] select-none">
                {app.icon}
              </div>
              <span className="w-full truncate border-t border-[rgba(214,58,58,0.12)] pt-2 text-[10px] font-medium tracking-[0.22em]">
                {app.title}
              </span>
            </div>
          );
        })}

        {/* VFS Desktop files & folders */}
        {desktopFiles.map((file) => (
          <div
            key={file.name}
            onDoubleClick={() => handleDoubleClickShortcut(file.name, file.type)}
            onContextMenu={(e) => handleContextMenu(e, file.name, file.type as "file" | "directory")}
            className="flex flex-col items-center justify-center w-full max-w-[100px] h-[96px] md:max-w-none md:h-auto border border-[rgba(214,58,58,0.14)] bg-black/10 p-2 text-center text-[#f3dada] transition duration-150 cursor-pointer pointer-events-auto group select-none hover:border-[rgba(214,58,58,0.35)] hover:bg-[rgba(214,58,58,0.08)]"
          >
            <div className="mb-1 text-[12px] font-semibold tracking-[0.22em] text-[#ffdddd] select-none">
              {file.type === "directory" ? "DIR" : "DAT"}
            </div>
            <span className="w-full truncate border-t border-[rgba(214,58,58,0.12)] pt-2 text-[10px] font-medium tracking-[0.22em]">
              {file.name}
            </span>
          </div>
        ))}
      </div>

      {windows.map((win) => {
        const config = REGISTERED_APPS.find((app) => win.pid.startsWith(app.id));
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


      {/* Modals for Desktop file operations */}
     <RenameModal
     isOpen={renameModal.isOpen}
     targetName={renameModal.targetName}
     value={renameModal.newName}
     onChange={(value) =>
      setRenameModal((prev) => ({
        ...prev,
        newName: value,
      }))
    }
    onClose={() =>
      setRenameModal({
        isOpen: false,
        targetName: "",
        newName: "",
      })
    }
    onSubmit={executeRename}
  />
  
  <DeleteConfirmModal
  isOpen={deleteConfirmModal.isOpen}
  targetName={deleteConfirmModal.targetName}
  onClose={() =>
    setDeleteConfirmModal({
      isOpen: false,
      targetName: "",
    })
  }
  onDelete={executeDelete}
/>

      <PropertiesModal
        isOpen={propertiesModal.isOpen}
        node={propertiesModal.targetNode}
        onClose={() =>
          setPropertiesModal({
            isOpen: false,
            targetNode: null,
          })
        }
      />
    </div>
  );
};