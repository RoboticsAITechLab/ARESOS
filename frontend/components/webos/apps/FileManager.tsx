"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";
import { playClickSound, playSuccessSound } from "@/utils/webos/audio";

interface FileManagerProps {
  pid: string;
}

export default function FileManager({ pid }: FileManagerProps) {
  const { 
    root,
    currentPath, 
    listDirectory, 
    changeDirectory, 
    createDirectory, 
    deleteNode, 
    writeFile,
    readFile,
    clipboard,
    copyNode,
    pasteNode,
    renameNode
  } = useFileSystem();

  const { launchApp, addNotification, processes } = useOS();

  // Navigation History Stack states
  const [history, setHistory] = useState<string[]>(["/home/user"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Address Bar Text Editing
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(currentPath);

  // File list states
  const [items, setItems] = useState<{ name: string; type: "file" | "directory"; size?: number; extension?: string; updatedAt?: number; createdAt?: number }[]>([]);
  
  // Multi-Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Search & layout states
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");

  // Category filter tags (All, Folders, Documents, Images, Scripts)
  const [categoryFilter, setCategoryFilter] = useState<"all" | "folders" | "documents" | "images" | "scripts">("all");

  // Sorting columns
  const [sortField, setSortField] = useState<"name" | "type" | "size" | "date">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Sidebar Analytics Tab State

  // Sidebar Analytics Tab State
  const [sidebarTab, setSidebarTab] = useState<"properties" | "analyzer">("properties");

  // File Upload Reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Menu Overlay state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetItem: string | null; // null represents empty background canvas right click
  }>({ isOpen: false, x: 0, y: 0, targetItem: null });

  // Custom Overlay Modals States
  const [createFolderModal, setCreateFolderModal] = useState({ isOpen: false, name: "" });
  const [createFileModal, setCreateFileModal] = useState({ isOpen: false, name: "", type: "txt" });
  const [renameModal, setRenameModal] = useState({ isOpen: false, targetName: "", newName: "" });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, targetNames: [] as string[] });
  const [propertiesModal, setPropertiesModal] = useState({ isOpen: false, targetNode: null as any | null });

  // Sync current path parameter from processes launcher or default
  useEffect(() => {
    const myProcess = processes.find((p) => p.pid === pid);
    const startPathArg = myProcess?.args?.startPath as string | undefined;
    if (startPathArg) {
      const ok = changeDirectory(startPathArg);
      if (ok) {
        setHistory([startPathArg]);
        setHistoryIndex(0);
      }
    }
  }, [pid, processes, changeDirectory]);

  // Load filesystem items inside active directory node
  const loadItems = React.useCallback(() => {
    try {
      const nodes = listDirectory();
      setItems(
        nodes.map((n) => ({
          name: n.name,
          type: n.node.type,
          size: n.node.type === "file" ? (n.node as any).size : undefined,
          extension: n.node.type === "file" ? (n.node as any).extension : undefined,
          createdAt: (n.node as any).createdAt || Date.now(),
          updatedAt: (n.node as any).updatedAt || Date.now(),
        }))
      );
    } catch (e) {
      console.error("Failed to load directory items", e);
    }
  }, [listDirectory]);

  // Reactive items load
  useEffect(() => {
    loadItems();
  }, [currentPath, loadItems]);

  // Clear selections on directory path changes
  useEffect(() => {
    setSelectedItems(new Set());
    setAddressInput(currentPath);
  }, [currentPath]);

  // Close context menus on window clicks
  useEffect(() => {
    const handleOutsideClick = () => {
      if (contextMenu.isOpen) {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [contextMenu.isOpen]);

  // Breadcrumbs Navigation parser
  const getBreadcrumbs = () => {
    const segments = currentPath.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Root (📁)", path: "/" }];
    
    let cumulativePath = "";
    segments.forEach((seg) => {
      cumulativePath += `/${seg}`;
      breadcrumbs.push({ label: seg, path: cumulativePath });
    });

    return breadcrumbs;
  };

  // Helper: Find FSNode relative path segments in Virtual File System root
  const findNodeByPathSegments = (currentNode: any, segments: string[]): any | null => {
    let current: any = currentNode;
    for (const seg of segments) {
      if (current.type !== "directory") return null;
      const next: any | undefined = current.children[seg];
      if (!next) return null;
      current = next;
    }
    return current;
  };

  // VFS Directory Copy Recursion Helper
  const pasteNodeRecursive = (sourceNode: any, destParentPath: string, newName: string) => {
    if (sourceNode.type === "file") {
      const file = sourceNode;
      const destPath = destParentPath === "/" ? `/${newName}` : `${destParentPath}/${newName}`;
      writeFile(destPath, file.content);
    } else if (sourceNode.type === "directory") {
      const dir = sourceNode;
      createDirectory(destParentPath, newName);
      const nextParentPath = destParentPath === "/" ? `/${newName}` : `${destParentPath}/${newName}`;
      Object.entries(dir.children || {}).forEach(([childName, childNode]) => {
        pasteNodeRecursive(childNode, nextParentPath, childName);
      });
    }
  };

  // Internal Navigation router wrapper
  const navigateTo = (targetPath: string) => {
    const ok = changeDirectory(targetPath);
    if (ok) {
      // Clean target absolute path computation
      let segments: string[] = [];
      if (targetPath.startsWith("/")) {
        segments = targetPath.split("/").filter(Boolean);
      } else {
        const currentSegments = currentPath.split("/").filter(Boolean);
        const relativeSegments = targetPath.split("/").filter(Boolean);
        for (const segment of relativeSegments) {
          if (segment === ".") continue;
          if (segment === "..") {
            currentSegments.pop();
          } else {
            currentSegments.push(segment);
          }
        }
        segments = currentSegments;
      }
      const absolutePath = "/" + segments.join("/");

      // Truncate forward history and push new location
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(absolutePath);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      playClickSound();
    } else {
      addNotification("File Explorer", `Could not navigate to path: ${targetPath}`, "error");
    }
  };

  // History Controls
  const handleGoBack = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      changeDirectory(history[nextIndex]);
      setHistoryIndex(nextIndex);
      playClickSound();
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      changeDirectory(history[nextIndex]);
      setHistoryIndex(nextIndex);
      playClickSound();
    }
  };

  const handleGoUp = () => {
    if (currentPath === "/") return;
    navigateTo("..");
  };

  // Address Bar Direct Manual Navigation form submit
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingAddress(false);
    const cleaned = addressInput.trim();
    if (!cleaned || cleaned === currentPath) return;

    const ok = changeDirectory(cleaned);
    if (ok) {
      navigateTo(cleaned);
    } else {
      addNotification("Error", "The directory path specified does not exist in VFS.", "error");
      setAddressInput(currentPath);
    }
  };

  // Item Clicks (supports Multi-Selection via Ctrl/Cmd keys)
  const handleItemClick = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    if (e.ctrlKey || e.metaKey) {
      const newSelected = new Set(selectedItems);
      if (newSelected.has(name)) {
        newSelected.delete(name);
      } else {
        newSelected.add(name);
      }
      setSelectedItems(newSelected);
    } else {
      setSelectedItems(new Set([name]));
    }
  };

  // Double Click / Execute operation
  const handleItemExecute = (name: string, type: "file" | "directory") => {
    if (type === "directory") {
      navigateTo(name);
    } else {
      const fullPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
      if (name.endsWith(".txt") || name.endsWith(".md")) {
        launchApp("text-editor", { filePath: fullPath });
      } else if (name.endsWith(".html")) {
        launchApp("browser", { initialUrl: `vfs://${fullPath}` });
        addNotification("Browser", "Rendered VFS HTML file inside simulated browser.", "info");
      } else {
        addNotification("File Explorer", `No default application registered for extension .${name.split(".").pop() || "unknown"}`, "info");
      }
    }
  };

  // Selection state parameters
  const firstSelectedName = selectedItems.size > 0 ? Array.from(selectedItems)[0] : null;
  const selectedNode = firstSelectedName ? items.find((i) => i.name === firstSelectedName) : null;

  // Clipboard operations (Copy, Cut, Paste)
  const handleCopy = (mode: "copy" | "cut") => {
    if (selectedItems.size === 0) return;
    const paths = Array.from(selectedItems).map((name) => 
      currentPath === "/" ? `/${name}` : `${currentPath}/${name}`
    );
    copyNode(paths, mode);
    addNotification("Clipboard", `Staged ${selectedItems.size} item(s) for ${mode}.`, "info");
    playClickSound();
  };

  const handlePaste = () => {
    if (!clipboard || clipboard.paths.length === 0) return;
    
    const ok = pasteNode(currentPath);
    if (ok) {
      loadItems();
      playSuccessSound();
      addNotification("File Explorer", `Pasted clipboard item(s) into current directory.`, "success");
    } else {
      addNotification("Error", "Paste operation failed.", "error");
    }
  };

  // Bulk Operations
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      targetNames: Array.from(selectedItems),
    });
  };

  const executeBulkDelete = () => {
    let successCount = 0;
    deleteConfirmModal.targetNames.forEach((name) => {
      const targetPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
      const ok = deleteNode(targetPath);
      if (ok) successCount++;
    });
    
    loadItems();
    setSelectedItems(new Set());
    setDeleteConfirmModal({ isOpen: false, targetNames: [] });
    playClickSound();
    addNotification("File Explorer", `Successfully deleted ${successCount} file(s)/folder(s).`, "success");
  };

  // Modal form triggers
  const triggerCreateFolder = () => {
    setCreateFolderModal({ isOpen: true, name: "" });
    playClickSound();
  };

  const executeCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const folderName = createFolderModal.name.trim();
    if (!folderName) return;

    const ok = createDirectory(currentPath, folderName);
    if (ok) {
      loadItems();
      setCreateFolderModal({ isOpen: false, name: "" });
      playSuccessSound();
      addNotification("File Explorer", `Created directory: "${folderName}"`, "success");
    } else {
      addNotification("Error", "Folder name already exists or characters are invalid.", "error");
    }
  };

  const triggerCreateFile = () => {
    setCreateFileModal({ isOpen: true, name: "", type: "txt" });
    playClickSound();
  };

  const executeCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    const fileName = createFileModal.name.trim();
    if (!fileName) return;

    const cleanName = fileName.includes(".") ? fileName : `${fileName}.${createFileModal.type}`;
    const fullPath = currentPath === "/" ? `/${cleanName}` : `${currentPath}/${cleanName}`;

    const ok = writeFile(fullPath, "");
    if (ok) {
      loadItems();
      setCreateFileModal({ isOpen: false, name: "", type: "txt" });
      setSelectedItems(new Set([cleanName]));
      playSuccessSound();
      addNotification("File Explorer", `Created file: "${cleanName}"`, "success");
    } else {
      addNotification("Error", "Could not write file to VFS. Check path validity.", "error");
    }
  };

  const triggerRename = (name: string) => {
    setRenameModal({ isOpen: true, targetName: name, newName: name });
    playClickSound();
  };

  const executeRename = (e: React.FormEvent) => {
    e.preventDefault();
    const oldName = renameModal.targetName;
    const newName = renameModal.newName.trim();
    if (!newName || newName === oldName) {
      setRenameModal({ isOpen: false, targetName: "", newName: "" });
      return;
    }

    const oldFullPath = currentPath === "/" ? `/${oldName}` : `${currentPath}/${oldName}`;
    const ok = renameNode(oldFullPath, newName);
    if (ok) {
      loadItems();
      setSelectedItems(new Set([newName]));
      setRenameModal({ isOpen: false, targetName: "", newName: "" });
      playSuccessSound();
      addNotification("File Explorer", `Renamed "${oldName}" to "${newName}"`, "success");
    } else {
      addNotification("Error", "Rename action failed. Target filename might already exist.", "error");
    }
  };

  const triggerProperties = (item: typeof selectedNode) => {
    if (!item) return;
    const itemPath = currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
    const segments = itemPath.split("/").filter(Boolean);
    const node = findNodeByPathSegments(root, segments);
    
    // Calculate mock MD5 and metadata logs
    const mockHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    
    setPropertiesModal({
      isOpen: true,
      targetNode: {
        name: item.name,
        type: item.type,
        path: itemPath,
        size: item.size || 0,
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
        checksum: mockHash,
        permissions: { read: true, write: true, execute: item.type === "directory" || item.name.endsWith(".js") },
      },
    });
    playClickSound();
  };

  // Browser system imports / VFS Import Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const fullPath = currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      const ok = writeFile(fullPath, text || "");
      if (ok) {
        loadItems();
        setSelectedItems(new Set([file.name]));
        playSuccessSound();
        addNotification("File Explorer", `Imported file: "${file.name}"`, "success");
      } else {
        addNotification("Error", "Import failed.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Clear inputs
  };

  // Single file download export
  const handleFileExport = (name: string) => {
    const fullPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
    const file = readFile(fullPath);
    if (!file) return;

    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    addNotification("File Explorer", `Exported file "${name}" to local download folder.`, "success");
  };

  // Right Click Custom Context Menu
  const handleContextMenu = (e: React.MouseEvent, itemName: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set selection focus on item if right-clicked
    if (itemName) {
      if (!selectedItems.has(itemName)) {
        setSelectedItems(new Set([itemName]));
      }
    } else {
      setSelectedItems(new Set());
    }

    // Capture localized coordinates relative to explorer window
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setContextMenu({
      isOpen: true,
      x,
      y,
      targetItem: itemName,
    });
    playClickSound();
  };

  // Categories Filtering tags mapping
  const filteredItems = items.filter((item) => {
    // 1. Search Query check
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Extension / Directory grouping checks
    if (categoryFilter === "folders") {
      return item.type === "directory";
    }
    if (categoryFilter === "documents") {
      return item.type === "file" && (item.name.endsWith(".txt") || item.name.endsWith(".md") || item.name.endsWith(".pdf"));
    }
    if (categoryFilter === "images") {
      return item.type === "file" && (item.name.endsWith(".png") || item.name.endsWith(".jpg") || item.name.endsWith(".jpeg") || item.name.endsWith(".gif") || item.name.endsWith(".svg") || item.name.endsWith(".webp"));
    }
    if (categoryFilter === "scripts") {
      return item.type === "file" && (item.name.endsWith(".js") || item.name.endsWith(".ts") || item.name.endsWith(".tsx") || item.name.endsWith(".json") || item.name.endsWith(".css") || item.name.endsWith(".html"));
    }
    return true;
  });

  // Sorting Handler
  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA: any = a[sortField === "date" ? "updatedAt" : sortField] || "";
    let valB: any = b[sortField === "date" ? "updatedAt" : sortField] || "";

    if (sortField === "type") {
      // Prioritize directories over files in visual sorting
      valA = a.type === "directory" ? "a_dir" : `b_file_${a.extension || ""}`;
      valB = b.type === "directory" ? "a_dir" : `b_file_${b.extension || ""}`;
    }

    if (typeof valA === "string") {
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }
  });

  // Column head click handler
  const handleSortHeader = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    playClickSound();
  };

  // Resolve visual content preview string
  const getSelectedFilePreview = () => {
    if (!selectedNode || selectedNode.type !== "file") return null;
    const fullPath = currentPath === "/" ? `/${selectedNode.name}` : `${currentPath}/${selectedNode.name}`;
    const file = readFile(fullPath);
    return file ? file.content : "";
  };

  const rawPreviewContent = getSelectedFilePreview();

  // Low level disk Hex Dump analytics
  const getHexDumpBytes = (str: string) => {
    const list = [];
    const limit = Math.min(str.length, 500); // Limit size for renderer performance
    for (let i = 0; i < limit; i += 8) {
      const chunk = str.substring(i, i + 8);
      const hexArr = Array.from(chunk).map((char) =>
        char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")
      );
      const asciiArr = Array.from(chunk).map((char) => {
        const code = char.charCodeAt(0);
        return code >= 32 && code <= 126 ? char : ".";
      });

      list.push({
        offset: i.toString(16).toUpperCase().padStart(4, "0"),
        hex: hexArr.join(" ").padEnd(23, " "),
        ascii: asciiArr.join(""),
      });
    }
    return list;
  };

  const hexBytesList = rawPreviewContent ? getHexDumpBytes(rawPreviewContent) : [];

  // VFS disk allocation usage calculators
  const getVfsUsedBytes = () => {
    try {
      return JSON.stringify(root).length;
    } catch {
      return 0;
    }
  };
  const vfsBytes = getVfsUsedBytes();
  const vfsKb = Number((vfsBytes / 1024).toFixed(1));
  const vfsMaxKb = 5120; // 5MB limit
  const storagePercentage = Math.min(100, Number(((vfsKb / vfsMaxKb) * 100).toFixed(2)));

  // Left sidebar navigations list
  const sidebarLinks = [
    { label: "🖥️ Desktop", path: "/home/user/Desktop" },
    { label: "📂 Documents", path: "/home/user/Documents" },
    { label: "📥 Downloads", path: "/home/user/Downloads" },
    { label: "📁 System Root", path: "/" },
  ];

  // Map file extension emojis/icons
  const getFileIcon = (item: { type: string; name: string }) => {
    if (item.type === "directory") return "📁";
    const name = item.name.toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".md")) return "📝";
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".svg") || name.endsWith(".webp")) return "🖼️";
    if (name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".ogg")) return "🎵";
    if (name.endsWith(".mp4") || name.endsWith(".webm")) return "🎥";
    if (name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".json") || name.endsWith(".html") || name.endsWith(".css")) return "⚙️";
    return "📄";
  };

  return (
    <div className="w-full h-full flex bg-zinc-900 text-zinc-100 select-none overflow-hidden font-sans relative">
      
      {/* Sidebar navigation list */}
      <div className="w-44 bg-zinc-950/45 border-r border-zinc-800/60 p-4 space-y-4 flex-shrink-0 flex flex-col justify-between">
        <div className="space-y-4">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block px-2.5">
            Navigation
          </span>
          <div className="flex flex-col gap-1">
            {sidebarLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigateTo(link.path)}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-xl transition cursor-pointer font-medium ${
                  currentPath === link.path
                    ? "bg-indigo-600/30 text-indigo-200 font-semibold border border-indigo-500/20 shadow-md"
                    : "hover:bg-zinc-850/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* LocalStorage Storage telemetry indicator */}
        <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-1.5 font-mono text-[9px] text-zinc-400">
          <div className="flex justify-between font-semibold">
            <span>Disk Space:</span>
            <span className="text-white">{vfsKb} KB / {vfsMaxKb} KB</span>
          </div>
          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <span className="text-[8px] text-zinc-500 block text-right">{storagePercentage}% allocated</span>
        </div>
      </div>

      {/* Main filesystem section */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        {/* Navigation / address / action toolbar */}
        <header className="border-b border-zinc-850 p-2.5 flex flex-col sm:flex-row items-center gap-2 bg-zinc-950/20 flex-shrink-0">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {/* History stack back/forward */}
            <button
              onClick={handleGoBack}
              disabled={historyIndex === 0}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition text-[10px] border border-zinc-855"
              title="Navigate Back"
            >
              ◀
            </button>
            <button
              onClick={handleGoForward}
              disabled={historyIndex >= history.length - 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition text-[10px] border border-zinc-855"
              title="Navigate Forward"
            >
              ▶
            </button>
            <button
              onClick={handleGoUp}
              disabled={currentPath === "/"}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition text-[10px] border border-zinc-855"
              title="Up one folder level"
            >
              ▲
            </button>
          </div>

          {/* Inline editable Address Path bar */}
          <div className="flex-1 min-w-0 w-full">
            {isEditingAddress ? (
              <form onSubmit={handleAddressSubmit} className="w-full">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onBlur={() => setIsEditingAddress(false)}
                  autoFocus
                  className="w-full bg-zinc-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-xs text-indigo-200 outline-none font-mono"
                />
              </form>
            ) : (
              <div 
                onClick={() => setIsEditingAddress(true)}
                className="w-full flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs text-zinc-400 bg-zinc-950/70 border border-zinc-850/60 px-2.5 py-1 rounded-lg cursor-text hover:bg-zinc-950 transition animate-in fade-in duration-100"
              >
                {getBreadcrumbs().map((crumb, idx) => (
                  <React.Fragment key={crumb.path}>
                    {idx > 0 && <span className="text-[10px] text-zinc-700">/</span>}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo(crumb.path);
                      }}
                      className="hover:text-white transition cursor-pointer font-semibold"
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-shrink-0 justify-end">
            {/* Search Input bar */}
            <div className="relative w-32">
              <input
                type="text"
                placeholder="Filter files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850/80 focus:border-zinc-700/60 rounded-lg pl-6 pr-2 py-1 text-[10px] text-zinc-200 placeholder-zinc-650 outline-none transition"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600">🔍</span>
            </div>

            {/* Layout switch */}
            <button
              onClick={() => {
                setLayoutMode(layoutMode === "grid" ? "list" : "grid");
                playClickSound();
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 border border-zinc-855 transition cursor-pointer text-xs"
              title={layoutMode === "grid" ? "List Details View" : "Icon Grid View"}
            >
              {layoutMode === "grid" ? "📋" : "🖼️"}
            </button>

            {/* Actions list */}
            <button
              onClick={triggerCreateFolder}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 border border-zinc-855 transition cursor-pointer text-xs font-bold text-green-400"
              title="Create Folder"
            >
              📁+
            </button>
            <button
              onClick={triggerCreateFile}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 border border-zinc-855 transition cursor-pointer text-xs font-bold text-blue-400"
              title="Create Text File"
            >
              📄+
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950/40 hover:bg-zinc-800 border border-zinc-855 transition cursor-pointer text-xs"
              title="Import File from host system"
            >
              📥
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </header>

        {/* Filter Categories tags bar */}
        <div className="px-4 py-1.5 bg-zinc-950/20 border-b border-zinc-850/40 flex gap-2 flex-shrink-0 overflow-x-auto scrollbar-none">
          {(["all", "folders", "documents", "images", "scripts"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setCategoryFilter(filter);
                playClickSound();
              }}
              className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                categoryFilter === filter
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Directory Listing Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin relative">
          
          {layoutMode === "grid" ? (
            /* Icon Grid Layout */
            <div className="grid grid-cols-[repeat(auto-fill,minmax(85px,1fr))] auto-rows-[90px] gap-4 content-start">
              {sortedItems.map((item) => {
                const isSelected = selectedItems.has(item.name);
                const isCut = clipboard?.mode === "cut" && clipboard.paths.includes(
                  currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`
                );

                return (
                  <div
                    key={item.name}
                    onClick={(e) => handleItemClick(item.name, e)}
                    onDoubleClick={() => handleItemExecute(item.name, item.type)}
                    onContextMenu={(e) => handleContextMenu(e, item.name)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition duration-150 cursor-pointer relative group text-center border ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500/40 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white/5"
                    } ${isCut ? "opacity-40" : ""}`}
                  >
                    {/* Multi select checkbox toggle */}
                    <div className="absolute top-1 left-1.5 opacity-0 group-hover:opacity-100 transition">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSelected = new Set(selectedItems);
                          if (isSelected) {
                            newSelected.delete(item.name);
                          } else {
                            newSelected.add(item.name);
                          }
                          setSelectedItems(newSelected);
                        }}
                        className="cursor-pointer accent-indigo-600 rounded scale-90"
                      />
                    </div>

                    <span className="text-3.5xl filter drop-shadow select-none mb-1">
                      {getFileIcon(item)}
                    </span>
                    <span className="text-[11px] font-semibold truncate w-full px-1 text-zinc-200">
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List Details view table */
            <table className="w-full text-left text-xs border-collapse select-none">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800/60 pb-1">
                  <th className="py-2 font-bold cursor-pointer hover:text-white" onClick={() => handleSortHeader("name")}>
                    Name {sortField === "name" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="font-bold cursor-pointer hover:text-white" onClick={() => handleSortHeader("type")}>
                    Type {sortField === "type" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="font-bold cursor-pointer hover:text-white" onClick={() => handleSortHeader("size")}>
                    Size {sortField === "size" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="font-bold cursor-pointer hover:text-white" onClick={() => handleSortHeader("date")}>
                    Date Modified {sortField === "date" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const isSelected = selectedItems.has(item.name);
                  const isCut = clipboard?.mode === "cut" && clipboard.paths.includes(
                    currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`
                  );
                  const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-";
                  
                  return (
                    <tr
                      key={item.name}
                      onClick={(e) => handleItemClick(item.name, e)}
                      onDoubleClick={() => handleItemExecute(item.name, item.type)}
                      onContextMenu={(e) => handleContextMenu(e, item.name)}
                      className={`border-b border-zinc-850/50 hover:bg-white/5 transition cursor-pointer ${
                        isSelected ? "bg-indigo-600/15 text-white" : "text-zinc-300"
                      } ${isCut ? "opacity-45" : ""}`}
                    >
                      <td className="py-2.5 flex items-center gap-2.5 font-semibold">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => {
                            const newSelected = new Set(selectedItems);
                            if (isSelected) {
                              newSelected.delete(item.name);
                            } else {
                              newSelected.add(item.name);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="cursor-pointer accent-indigo-600 scale-90"
                        />
                        <span>{getFileIcon(item)}</span>
                        <span className="truncate max-w-[200px]">{item.name}</span>
                      </td>
                      <td>{item.type === "directory" ? "Folder" : `${item.extension?.toUpperCase() || "File"}`}</td>
                      <td className="font-mono text-zinc-400">
                        {item.type === "directory" ? "-" : `${item.size || 0} B`}
                      </td>
                      <td className="text-zinc-500">{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {sortedItems.length === 0 && (
            <div className="col-span-full py-24 text-center text-xs text-zinc-650 font-mono">
              DIRECTORY EMPTY // NO RESULTS MATCH FILTER
            </div>
          )}
        </div>
      </div>

      {/* Selected Item Sidebar Tab details */}
      {selectedNode && (
        <div className="w-60 bg-zinc-950/45 border-l border-zinc-800/60 p-0 flex flex-col justify-between flex-shrink-0 animate-in slide-in-from-right-3 duration-150">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Double tabs navigation headers */}
            <div className="flex border-b border-zinc-850 text-[10px] font-bold">
              <button
                onClick={() => setSidebarTab("properties")}
                className={`flex-1 text-center py-2 transition ${
                  sidebarTab === "properties" 
                    ? "bg-zinc-900 text-white border-b-2 border-indigo-500" 
                    : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-350"
                }`}
              >
                PROPERTIES
              </button>
              <button
                onClick={() => setSidebarTab("analyzer")}
                className={`flex-1 text-center py-2 transition ${
                  sidebarTab === "analyzer" 
                    ? "bg-zinc-900 text-white border-b-2 border-indigo-500" 
                    : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-350"
                }`}
              >
                HEX ANALYZER
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-thin">
              
              {sidebarTab === "properties" ? (
                /* Tab 1: Standard Properties & Visual Previews */
                <div className="space-y-4">
                  {/* File icon header */}
                  <div className="flex flex-col items-center py-3 bg-zinc-900/35 border border-zinc-850 rounded-xl">
                    <span className="text-4xl filter drop-shadow select-none">
                      {getFileIcon(selectedNode)}
                    </span>
                    <span className="text-xs font-bold text-white mt-2 truncate w-full text-center px-3 select-all">
                      {selectedNode.name}
                    </span>
                  </div>

                  {/* Properties log details */}
                  <div className="space-y-2 font-mono text-[9.5px] text-zinc-400">
                    <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                      <span>Type:</span>
                      <span className="text-white capitalize">{selectedNode.type}</span>
                    </div>
                    {selectedNode.type === "file" && (
                      <>
                        <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                          <span>Extension:</span>
                          <span className="text-white uppercase">.{selectedNode.extension || "unknown"}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                          <span>Size:</span>
                          <span className="text-white">{selectedNode.size || 0} B</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                      <span>Modified:</span>
                      <span className="text-white">
                        {selectedNode.updatedAt ? new Date(selectedNode.updatedAt).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </div>

                  {/* File Visual Previews Render block */}
                  {selectedNode.type === "file" && rawPreviewContent !== null && (
                    <div className="space-y-2.5">
                      <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">File Rendering Preview</span>
                      
                      {/* Image Viewer */}
                      {selectedNode.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) ? (
                        <div className="border border-zinc-800 rounded-lg p-2 bg-zinc-950 flex items-center justify-center max-h-36 overflow-hidden">
                          {rawPreviewContent.startsWith("data:image") || rawPreviewContent.startsWith("http") ? (
                            <img 
                              src={rawPreviewContent} 
                              alt="VFS Preview"
                              className="max-h-32 max-w-full object-contain rounded"
                            />
                          ) : (
                            <div className="text-[9px] text-zinc-500 text-center font-mono py-6">
                              🖼️ IMAGE MOCK PREVIEW<br/>
                              <span className="text-[8px] text-zinc-650">No Base64 data available</span>
                            </div>
                          )}
                        </div>
                      ) : selectedNode.name.match(/\.(mp3|wav|ogg)$/i) ? (
                        /* Audio Player Mock */
                        <div className="border border-zinc-800 rounded-lg p-2 bg-zinc-950 space-y-1.5 font-mono text-[9px]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🎵</span>
                            <div className="flex-1 truncate">
                              <span className="text-zinc-200 block truncate">{selectedNode.name}</span>
                              <span className="text-zinc-500 block text-[8px]">Audio Telemetry Playback</span>
                            </div>
                          </div>
                          <div className="bg-zinc-900 border border-zinc-800 rounded p-1 flex justify-between items-center text-zinc-400">
                            <button onClick={() => playSuccessSound()} className="px-1.5 py-0.5 bg-indigo-600/30 text-indigo-200 rounded text-[8px] font-bold hover:bg-indigo-600/50">PLAY</button>
                            <span className="text-[7.5px]">0:00 / 0:15</span>
                          </div>
                        </div>
                      ) : selectedNode.name.endsWith(".md") ? (
                        /* Markdown Markdown rendering style */
                        <div className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-[9px] max-h-36 overflow-y-auto leading-relaxed select-text font-serif text-zinc-300">
                          {rawPreviewContent.split("\n").map((line, idx) => {
                            if (line.startsWith("#")) {
                              return <h1 key={idx} className="font-bold border-b border-zinc-850 text-xs text-white pb-0.5 mb-1.5">{line.replace(/#/g, "").trim()}</h1>;
                            }
                            if (line.startsWith("-") || line.startsWith("*")) {
                              return <li key={idx} className="list-disc ml-3">{line.substring(1).trim()}</li>;
                            }
                            return <p key={idx} className="mb-1">{line}</p>;
                          })}
                        </div>
                      ) : (
                        /* Plain text standard preview box */
                        <div className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-[9px] text-zinc-450 leading-normal max-h-36 overflow-y-auto font-mono scrollbar-none select-text break-words">
                          {rawPreviewContent || <span className="italic text-zinc-650">[Empty file content]</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Retro Cybernetic Hex Dump grid */
                <div className="space-y-2">
                  <span className="text-[8.5px] text-zinc-500 uppercase font-bold tracking-wider">Low-level Hex analyzer</span>
                  {selectedNode.type === "directory" ? (
                    <div className="text-[9px] font-mono text-zinc-650 py-10 text-center">
                      [Hex operations are restricted to file types only]
                    </div>
                  ) : hexBytesList.length === 0 ? (
                    <div className="text-[9px] font-mono text-zinc-650 py-10 text-center">
                      [Null Byte contents found]
                    </div>
                  ) : (
                    <div className="p-2 bg-zinc-950 border border-zinc-850 rounded-lg max-h-96 overflow-y-auto font-mono text-[8.5px] text-indigo-400 space-y-1 select-text scrollbar-thin">
                      <div className="flex border-b border-zinc-850 pb-1 text-zinc-600 font-bold justify-between">
                        <span>Offset</span>
                        <span>Hex Dump</span>
                        <span>ASCII</span>
                      </div>
                      {hexBytesList.map((row) => (
                        <div key={row.offset} className="flex justify-between tracking-tight leading-none">
                          <span className="text-zinc-600 font-bold">{row.offset}</span>
                          <span className="text-zinc-300 font-medium px-1.5">{row.hex}</span>
                          <span className="text-green-500/80 font-bold">{row.ascii}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Core Actions Buttons footer */}
          <div className="p-3 border-t border-zinc-850/60 bg-zinc-950/20 space-y-1.5 flex-shrink-0">
            <button
              onClick={() => handleItemExecute(selectedNode.name, selectedNode.type)}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
            >
              {selectedNode.type === "directory" ? "📂 Open Folder" : "✏️ Open File"}
            </button>
            
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => triggerRename(selectedNode.name)}
                className="py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[10.5px] text-zinc-300 font-semibold rounded-lg transition"
              >
                Rename
              </button>
              <button
                onClick={() => triggerProperties(selectedNode)}
                className="py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[10.5px] text-zinc-300 font-semibold rounded-lg transition"
              >
                Properties
              </button>
            </div>

            {selectedNode.type === "file" && (
              <button
                onClick={() => handleFileExport(selectedNode.name)}
                className="w-full py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[10.5px] text-zinc-300 font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                💾 Export to Host
              </button>
            )}

            <button
              onClick={() => {
                setDeleteConfirmModal({ isOpen: true, targetNames: [selectedNode.name] });
                playClickSound();
              }}
              className="w-full py-1.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-[10.5px] text-rose-350 hover:text-white rounded-lg transition"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Bulk actions Floating Footer bar */}
      {selectedItems.size > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-indigo-500/40 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-4 shadow-xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-xs font-mono font-semibold text-indigo-200">
            Selected: <span className="text-white font-bold">{selectedItems.size}</span> items
          </span>
          
          <div className="h-4 w-px bg-zinc-855" />

          <div className="flex gap-1.5">
            <button
              onClick={() => handleCopy("copy")}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[10px] font-bold text-zinc-200 rounded-lg cursor-pointer transition"
            >
              Copy
            </button>
            <button
              onClick={() => handleCopy("cut")}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-[10px] font-bold text-zinc-200 rounded-lg cursor-pointer transition"
            >
              Cut
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white rounded-lg cursor-pointer transition"
            >
              Delete Bulk
            </button>
            <button
              onClick={() => {
                setSelectedItems(new Set());
                playClickSound();
              }}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded-lg cursor-pointer transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Custom Context Menu Overlay dropdown */}
      {contextMenu.isOpen && (
        <div 
          className="absolute bg-zinc-950/95 border border-zinc-800 rounded-xl py-1 w-44 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-100 font-sans"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetItem ? (
            /* Item context list */
            <>
              <button
                onClick={() => {
                  const target = items.find((i) => i.name === contextMenu.targetItem);
                  if (target) handleItemExecute(target.name, target.type);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white font-semibold transition"
              >
                📂 Open / Run
              </button>
              {items.find((i) => i.name === contextMenu.targetItem)?.type === "directory" && (
                <button
                  onClick={() => {
                    const targetName = contextMenu.targetItem;
                    if (targetName) {
                      const fullPath = currentPath === "/" ? `/${targetName}` : `${currentPath}/${targetName}`;
                      changeDirectory(fullPath);
                      launchApp("terminal");
                    }
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
                >
                  💻 Open in Terminal
                </button>
              )}
              <button
                onClick={() => {
                  handleCopy("copy");
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
              >
                📄 Copy
              </button>
              <button
                onClick={() => {
                  handleCopy("cut");
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
              >
                ✂️ Cut
              </button>
              <button
                onClick={() => {
                  if (contextMenu.targetItem) triggerRename(contextMenu.targetItem);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
              >
                ✏️ Rename
              </button>
              <div className="h-px bg-zinc-850 my-1" />
              <button
                onClick={() => {
                  if (contextMenu.targetItem) {
                    setDeleteConfirmModal({ isOpen: true, targetNames: [contextMenu.targetItem] });
                  }
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-rose-400 hover:bg-rose-600 hover:text-white transition"
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => {
                  const target = items.find((i) => i.name === contextMenu.targetItem);
                  if (target) triggerProperties(target);
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-450 hover:bg-indigo-600 hover:text-white transition"
              >
                ⚙️ Properties
              </button>
            </>
          ) : (
            /* Canvas Empty Context list */
            <>
              <button
                onClick={() => {
                  triggerCreateFolder();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
              >
                📁 New Folder
              </button>
              <button
                onClick={() => {
                  triggerCreateFile();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
              >
                📄 New File
              </button>
              <button
                onClick={() => {
                  handlePaste();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                disabled={!clipboard}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
              >
                📋 Paste Clipboard
              </button>
              <button
                onClick={() => {
                  changeDirectory(currentPath);
                  launchApp("terminal");
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-200 hover:bg-indigo-600 hover:text-white transition"
              >
                💻 Open in Terminal
              </button>
              <div className="h-px bg-zinc-850 my-1" />
              <button
                onClick={() => {
                  loadItems();
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  addNotification("File Explorer", "Refreshed folder directories.", "info");
                  playClickSound();
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-400 hover:bg-indigo-600 hover:text-white transition"
              >
                🔄 Refresh directory
              </button>
              <button
                onClick={() => {
                  const pathSegs = currentPath.split("/").filter(Boolean);
                  const node = findNodeByPathSegments(root, pathSegs);
                  if (node) triggerProperties({ name: "Current Directory", type: "directory", createdAt: node.createdAt, updatedAt: node.updatedAt });
                  setContextMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full text-left px-3.5 py-1.5 text-xs text-zinc-450 hover:bg-indigo-600 hover:text-white transition"
              >
                ⚙️ Properties
              </button>
            </>
          )}
        </div>
      )}

      {/* -------------------- GLASSMORPHISM DIALOG OVERLAYS -------------------- */}

      {/* Modal 1: Create Folder Modal */}
      {createFolderModal.isOpen && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={executeCreateFolder}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">Create New Folder</h2>
              <p className="text-[10px] text-zinc-500">Specify name of directory node to add.</p>
            </div>
            <input
              type="text"
              placeholder="Folder Name"
              value={createFolderModal.name}
              onChange={(e) => setCreateFolderModal((prev) => ({ ...prev, name: e.target.value }))}
              autoFocus
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition"
            />
            <div className="flex justify-end gap-2 text-xs pt-1.5">
              <button
                type="button"
                onClick={() => setCreateFolderModal({ isOpen: false, name: "" })}
                className="px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-850 text-zinc-400 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md shadow-indigo-600/10"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Create File Modal */}
      {createFileModal.isOpen && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={executeCreateFile}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">Create New File</h2>
              <p className="text-[10px] text-zinc-500">Specify name and format selector type.</p>
            </div>
            <input
              type="text"
              placeholder="Filename (e.g. index)"
              value={createFileModal.name}
              onChange={(e) => setCreateFileModal((prev) => ({ ...prev, name: e.target.value }))}
              autoFocus
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition"
            />
            
            {/* Standard format type extensions */}
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Format type</span>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                {["txt", "md", "html"].map((ext) => (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => setCreateFileModal((prev) => ({ ...prev, type: ext }))}
                    className={`py-1 rounded border transition ${
                      createFileModal.type === ext
                        ? "bg-indigo-600/35 border-indigo-500 text-indigo-200 font-bold"
                        : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-350"
                    }`}
                  >
                    .{ext}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setCreateFileModal({ isOpen: false, name: "", type: "txt" })}
                className="px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-850 text-zinc-400 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md shadow-indigo-600/10"
              >
                Create File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Rename Dialog */}
      {renameModal.isOpen && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={executeRename}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">Rename Node Element</h2>
              <p className="text-[10px] text-zinc-500">Provide a new unique label naming for <span className="text-indigo-400 font-mono select-all">"{renameModal.targetName}"</span>.</p>
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
                className="px-3.5 py-1.5 bg-zinc-855 hover:bg-zinc-800 text-zinc-400 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md shadow-indigo-600/10"
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 4: Confirm Delete Dialog */}
      {deleteConfirmModal.isOpen && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-rose-900/35 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                ⚠️ Confirm Node Purge
              </h2>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Are you sure you want to permanently delete the selected {deleteConfirmModal.targetNames.length} item(s) from VFS?
              </p>
            </div>
            
            <div className="max-h-24 overflow-y-auto border border-zinc-850 rounded-lg p-2 bg-zinc-955 font-mono text-[9px] text-zinc-400 space-y-1 scrollbar-none">
              {deleteConfirmModal.targetNames.map((name) => (
                <div key={name} className="truncate">❌ {name}</div>
              ))}
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1.5">
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, targetNames: [] })}
                className="px-3.5 py-1.5 bg-zinc-855 hover:bg-zinc-800 text-zinc-400 font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition cursor-pointer shadow-md shadow-rose-600/10"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Detailed VFS Node Properties info Dialog */}
      {propertiesModal.isOpen && propertiesModal.targetNode && (
        <div className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 font-mono text-[10px] text-zinc-400">
            <div className="space-y-1 font-sans">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                ⚙️ Detailed Properties
              </h2>
              <p className="text-[9.5px] text-zinc-500">Virtual File System diagnostic metadata stats.</p>
            </div>

            <div className="h-px bg-zinc-850 my-2" />

            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">Object Name:</span>
                <span className="text-white font-bold truncate max-w-[150px]">{propertiesModal.targetNode.name}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">VFS Path:</span>
                <span className="text-indigo-400 font-bold truncate max-w-[160px] select-all">{propertiesModal.targetNode.path}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">Node Type:</span>
                <span className="text-white capitalize">{propertiesModal.targetNode.type}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">Sector Size:</span>
                <span className="text-white font-bold">{propertiesModal.targetNode.size} bytes</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">Timestamp Initial:</span>
                <span className="text-white">{new Date(propertiesModal.targetNode.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">Timestamp Modified:</span>
                <span className="text-white">{new Date(propertiesModal.targetNode.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-850/35 pb-1">
                <span className="text-zinc-500">MD5 Checksum:</span>
                <span className="text-white tracking-tighter truncate max-w-[150px] select-all">{propertiesModal.targetNode.checksum}</span>
              </div>
              
              {/* Mock system permissions checklist */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">Permissions flags</span>
                <div className="grid grid-cols-3 gap-1 bg-zinc-955 p-2 border border-zinc-855 rounded-lg">
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
}
