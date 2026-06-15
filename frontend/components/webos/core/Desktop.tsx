"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { Window } from "./Window";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { REGISTERED_APPS } from "@/config/webos/apps.config";

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

  // Modals for Desktop file operations
  const [renameModal, setRenameModal] = useState({ isOpen: false, targetName: "", newName: "" });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, targetName: "" });
  const [propertiesModal, setPropertiesModal] = useState({ isOpen: false, targetNode: null as any | null });

  // Load files from virtual desktop directory
  const refreshDesktopFiles = React.useCallback(() => {
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
  }, [listDirectory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshDesktopFiles();
    }, 0);
    // Refresh desktop icons every time a filesystem change might occur
    const interval = setInterval(refreshDesktopFiles, 1500);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
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

  // Handle double clicking desktop shortcut
  const handleDoubleClickShortcut = (name: string, type: string) => {
    if (type === "directory") {
      launchApp("file-manager", { startPath: `/home/user/Desktop/${name}` });
    } else {
      if (name.endsWith(".txt") || name.endsWith(".md")) {
        launchApp("text-editor", { filePath: `/home/user/Desktop/${name}` });
      } else {
        addNotification("Open File", `No default app handler for this file type.`, "warning");
      }
    }
  };

  // Modals trigger methods
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
          createdAt: Date.now() - 36000000,
          updatedAt: Date.now() - 36000000,
          checksum: "-",
          permissions: { read: true, write: false, execute: true }
        }
      });
    } else {
      const fullPath = `/home/user/Desktop/${name}`;
      const items = listDirectory("/home/user/Desktop");
      const found = items.find((i) => i.name === name);
      if (found) {
        const mockHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        setPropertiesModal({
          isOpen: true,
          targetNode: {
            name: found.name,
            type: found.node.type,
            path: fullPath,
            size: found.node.type === "file" ? (found.node as any).size : 0,
            createdAt: (found.node as any).createdAt || Date.now(),
            updatedAt: (found.node as any).updatedAt || Date.now(),
            checksum: found.node.type === "file" ? mockHash : "-",
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

    const oldFullPath = `/home/user/Desktop/${oldName}`;
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
    const fullPath = `/home/user/Desktop/${name}`;
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
              const existing = listDirectory("/home/user/Desktop");
              const existingNames = new Set(existing.map((item) => item.name));
              while (existingNames.has(fileName)) {
                fileName = `New Text Document (${counter}).txt`;
                counter++;
              }
            } catch (e) {
              console.error(e);
            }
            const path = `/home/user/Desktop/${fileName}`;
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
              const existing = listDirectory("/home/user/Desktop");
              const existingNames = new Set(existing.map((item) => item.name));
              while (existingNames.has(folderName)) {
                folderName = `${baseName} (${counter})`;
                counter++;
              }
            } catch (e) {
              console.error(e);
            }
            const ok = createDirectory("/home/user/Desktop", folderName);
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
              const ok = pasteNode("/home/user/Desktop");
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
            changeDirectory("/home/user/Desktop");
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
          copyNode([`/home/user/Desktop/${targetName}`], "copy");
          addNotification("Clipboard", `Copied "${targetName}" to VFS clipboard.`, "info");
        },
      },
      {
        label: "Cut",
        icon: "✂️",
        action: () => {
          copyNode([`/home/user/Desktop/${targetName}`], "cut");
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
          changeDirectory(`/home/user/Desktop/${targetName}`);
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
      className="flex-1 w-full h-full relative overflow-hidden p-6 select-none bg-zinc-950"
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

      {/* Grid of Desktop Files/Folders Shortcuts */}
      <div
        id="desktop-grid"
        className="absolute top-6 left-6 bottom-16 right-6 grid grid-flow-col auto-cols-[100px] grid-rows-[repeat(auto-fill,100px)] gap-4 justify-start items-start pointer-events-none z-10"
      >
        {/* Default App Shortcuts */}
        {REGISTERED_APPS.map((app) => (
          <div
            key={app.id}
            onDoubleClick={() => launchApp(app.id)}
            onContextMenu={(e) => handleContextMenu(e, app.id, "app")}
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
            onContextMenu={(e) => handleContextMenu(e, file.name, file.type as "file" | "directory")}
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

      {windows.map((win) => {
        const parts = win.pid.split("-");
        const appId = parts.slice(0, -1).join("-");
        const config = REGISTERED_APPS.find((app) => app.id === appId);
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
      {renameModal.isOpen && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <form 
            onSubmit={executeRename}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">Rename Node Element</h2>
              <p className="text-[10px] text-zinc-500 font-sans">Provide a new unique label naming for <span className="text-indigo-400 font-mono select-all">"{renameModal.targetName}"</span>.</p>
            </div>
            <input
              type="text"
              value={renameModal.newName}
              onChange={(e) => setRenameModal((prev) => ({ ...prev, newName: e.target.value }))}
              autoFocus
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition"
            />
            <div className="flex justify-end gap-2 text-xs pt-1.5">
              <button
                type="button"
                onClick={() => setRenameModal({ isOpen: false, targetName: "", newName: "" })}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteConfirmModal.isOpen && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-zinc-900 border border-rose-900/35 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 font-sans">
                ⚠️ Confirm Node Purge
              </h2>
              <p className="text-[10px] text-zinc-500 leading-normal font-sans">
                Are you sure you want to permanently delete the shortcut <span className="text-white font-bold font-mono">"{deleteConfirmModal.targetName}"</span> from your Desktop?
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1.5">
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, targetName: "" })}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition cursor-pointer shadow-md shadow-rose-600/10"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {propertiesModal.isOpen && propertiesModal.targetNode && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 font-mono text-[10px] text-zinc-400">
            <div className="space-y-1 font-sans">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                ⚙️ Detailed Properties
              </h2>
              <p className="text-[9.5px] text-zinc-500">Virtual File System diagnostic metadata stats.</p>
            </div>

            <div className="h-px bg-zinc-800 my-2" />

            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                <span className="text-zinc-500">Object Name:</span>
                <span className="text-white font-bold truncate max-w-[150px]">{propertiesModal.targetNode.name}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                <span className="text-zinc-500">VFS Path:</span>
                <span className="text-indigo-400 font-bold truncate max-w-[160px] select-all">{propertiesModal.targetNode.path}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                <span className="text-zinc-500">Node Type:</span>
                <span className="text-white capitalize">{propertiesModal.targetNode.type}</span>
              </div>
              {propertiesModal.targetNode.type !== "System Application Shortcut" && (
                <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                  <span className="text-zinc-500">Sector Size:</span>
                  <span className="text-white font-bold">{propertiesModal.targetNode.size} bytes</span>
                </div>
              )}
              <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                <span className="text-zinc-500">Timestamp Initial:</span>
                <span className="text-white">{new Date(propertiesModal.targetNode.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                <span className="text-zinc-500">Timestamp Modified:</span>
                <span className="text-white">{new Date(propertiesModal.targetNode.updatedAt).toLocaleString()}</span>
              </div>
              {propertiesModal.targetNode.checksum !== "-" && (
                <div className="flex justify-between border-b border-zinc-800/35 pb-1">
                  <span className="text-zinc-500">MD5 Checksum:</span>
                  <span className="text-white tracking-tighter truncate max-w-[150px] select-all">{propertiesModal.targetNode.checksum}</span>
                </div>
              )}
              
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Permissions flags</span>
                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-2 border border-zinc-800 rounded-lg">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={propertiesModal.targetNode.permissions.read} readOnly className="accent-indigo-600 scale-90" />
                    <span>Read</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={propertiesModal.targetNode.permissions.write} readOnly className="accent-indigo-600 scale-90" />
                    <span>Write</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={propertiesModal.targetNode.permissions.execute} readOnly className="accent-indigo-600 scale-90" />
                    <span>Exec</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPropertiesModal({ isOpen: false, targetNode: null })}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold rounded-lg transition font-sans text-xs cursor-pointer"
              >
                Close properties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

