"use client";

import React, { useState, useEffect } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";

interface FileManagerProps {
  pid: string;
}

export default function FileManager({ pid }: FileManagerProps) {
  const { currentPath, listDirectory, changeDirectory, createDirectory, deleteNode, writeFile } = useFileSystem();
  const { launchApp, addNotification } = useOS();
  const [items, setItems] = useState<{ name: string; type: "file" | "directory" }[]>([]);

  const loadItems = () => {
    try {
      const nodes = listDirectory();
      setItems(
        nodes.map((n) => ({
          name: n.name,
          type: n.node.type,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadItems();
  }, [currentPath]);

  // Back button navigation (cd ..)
  const handleGoBack = () => {
    if (currentPath === "/") return;
    changeDirectory("..");
  };

  const handleItemClick = (name: string, type: "file" | "directory") => {
    if (type === "directory") {
      changeDirectory(name);
    } else {
      // Check file extension or default to Notepad
      if (name.endsWith(".txt") || name.endsWith(".md")) {
        const fullPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
        launchApp("text-editor", { filePath: fullPath });
      } else {
        addNotification("File Explorer", `No handler app registered for this file.`, "info");
      }
    }
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter new folder name:");
    if (name) {
      const ok = createDirectory(currentPath, name);
      if (ok) {
        loadItems();
        addNotification("File System", `Folder '${name}' created.`, "success");
      } else {
        addNotification("Error", "Folder already exists.", "error");
      }
    }
  };

  const handleCreateFile = () => {
    const name = prompt("Enter new text file name (e.g., test.txt):");
    if (name) {
      const fullPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
      const ok = writeFile(fullPath, "");
      if (ok) {
        loadItems();
        addNotification("File System", `File '${name}' created.`, "success");
      } else {
        addNotification("Error", "Could not create file.", "error");
      }
    }
  };

  const handleDeleteItem = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete '${name}'?`)) {
      const targetPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
      const ok = deleteNode(targetPath);
      if (ok) {
        loadItems();
        addNotification("File System", `Deleted '${name}'.`, "success");
      } else {
        addNotification("Error", "Could not delete file/folder.", "error");
      }
    }
  };

  // Sidebar Shortcut links
  const sidebarLinks = [
    { label: "🖥️ Desktop", path: "/home/user/Desktop" },
    { label: "📂 Documents", path: "/home/user/Documents" },
    { label: "📥 Downloads", path: "/home/user/Downloads" },
    { label: "📁 Root (/)", path: "/" },
  ];

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none">
      {/* Sidebar navigation */}
      <div className="w-44 bg-zinc-950/40 border-r border-zinc-800/60 p-4 space-y-5 flex-shrink-0">
        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">
          Shortcuts
        </div>
        <div className="flex flex-col gap-1.5">
          {sidebarLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => changeDirectory(link.path)}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                currentPath === link.path
                  ? "bg-indigo-600/30 text-indigo-200 font-semibold"
                  : "hover:bg-zinc-800/50 text-zinc-300"
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Files Display Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navigation Toolbar */}
        <div className="h-12 border-b border-zinc-800/60 px-4 flex items-center justify-between gap-4 bg-zinc-950/20 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Back button */}
            <button
              onClick={handleGoBack}
              disabled={currentPath === "/"}
              className="p-1.5 rounded-lg hover:bg-zinc-800/80 active:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-sm"
              title="Go Up"
            >
              ⬅️
            </button>

            {/* Path text display */}
            <span className="text-xs font-mono bg-zinc-950/80 border border-zinc-800 px-3 py-1 rounded-lg text-zinc-300 truncate flex-1 select-all">
              {currentPath}
            </span>
          </div>

          {/* Quick Actions (Create file/folder) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCreateFolder}
              className="p-1.5 hover:bg-zinc-800 text-xs rounded-lg border border-zinc-800 cursor-pointer transition flex items-center gap-1"
              title="New Folder"
            >
              📁<span>+</span>
            </button>
            <button
              onClick={handleCreateFile}
              className="p-1.5 hover:bg-zinc-800 text-xs rounded-lg border border-zinc-800 cursor-pointer transition flex items-center gap-1"
              title="New Text File"
            >
              📄<span>+</span>
            </button>
          </div>
        </div>

        {/* Directory Contents Icons */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] auto-rows-[90px] gap-4 content-start">
          {items.map((item) => (
            <div
              key={item.name}
              onDoubleClick={() => handleItemClick(item.name, item.type)}
              className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition duration-150 cursor-pointer relative group text-center"
            >
              <span className="text-3xl filter drop-shadow select-none mb-1">
                {item.type === "directory" ? "📁" : "📄"}
              </span>
              <span className="text-[11px] font-medium truncate w-full px-1 text-zinc-200">
                {item.name}
              </span>

              {/* Trash/delete action button on hover */}
              <button
                onClick={(e) => handleDeleteItem(item.name, e)}
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded bg-red-500/80 hover:bg-red-500 text-[8px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-100 cursor-pointer"
                title="Delete item"
              >
                ✕
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div className="col-span-full py-16 text-center text-xs text-zinc-500 font-mono">
              Folder is empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
