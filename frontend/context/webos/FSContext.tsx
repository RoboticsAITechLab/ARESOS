"use client";

import React, { createContext, useState, useRef, useEffect, ReactNode } from "react";
import { FSDirectory, FSNode, FSFile } from "@/types/webos/fs";
import { useOS } from "@/hooks/webos/useOS";

interface FSContextType {
  root: FSDirectory;
  currentPath: string;
  listDirectory: (path?: string) => { name: string; node: FSNode }[];
  readFile: (filePath: string) => FSFile | null;
  writeFile: (filePath: string, content: string | Uint8Array) => boolean;
  createDirectory: (dirPath: string, name: string) => boolean;
  deleteNode: (nodePath: string) => boolean;
  changeDirectory: (targetPath: string) => boolean;
  clipboard: { paths: string[]; mode: "copy" | "cut" } | null;
  copyNode: (paths: string[], mode: "copy" | "cut") => void;
  pasteNode: (targetDirPath: string) => boolean;
  renameNode: (nodePath: string, newName: string) => boolean;
  formatFileSystem: () => void;
}

export const FSContext = createContext<FSContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "aresos_vfs_root";

const INITIAL_FS: FSDirectory = {
  name: "/",
  type: "directory",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  children: {
    home: {
      name: "home",
      type: "directory",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: {
        user: {
          name: "user",
          type: "directory",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: {
            Desktop: {
              name: "Desktop",
              type: "directory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: {
                "Welcome.txt": {
                  name: "Welcome.txt",
                  type: "file",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  content: "Welcome to ARESOS WebOS!\n\nThis is a modular web desktop environment running on Next.js, React 19, and Tailwind CSS.\n\nYou can use the Terminal, open the Notepad, run the File Explorer, or browse the web.",
                  size: 215,
                  extension: "txt",
                },
                "README.md": {
                  name: "README.md",
                  type: "file",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  content: "# ARESOS Web OS\n\nFeatures:\n- Virtual File System (VFS) with persistent LocalStorage\n- Multi-window drag & resize manager\n- Integrated Terminal & File Manager\n- Rich glassmorphism desktop elements",
                  size: 200,
                  extension: "md",
                },
              },
            },
            Documents: {
              name: "Documents",
              type: "directory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: {
                "project_ideas.txt": {
                  name: "project_ideas.txt",
                  type: "file",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  content: "1. Build an advanced terminal command engine\n2. Add multi-user logins\n3. Connect custom WebSocket backends",
                  size: 105,
                  extension: "txt",
                },
              },
            },
            Downloads: {
              name: "Downloads",
              type: "directory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: {},
            },
          },
        },
      },
    },
    bin: {
      name: "bin",
      type: "directory",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: {},
    },
  },
};

export const FSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings, addNotification } = useOS();

  const [root, setRoot] = useState<FSDirectory>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved) as FSDirectory;
        } catch (e) {
          console.error("Failed to parse virtual file system from storage, using default", e);
        }
      }
    }
    return INITIAL_FS;
  });

  const rootRef = useRef<FSDirectory>(root);
  useEffect(() => {
    rootRef.current = root;
  }, [root]);

  const [currentPath, _setCurrentPath] = useState<string>("/home/user");
  const currentPathRef = useRef<string>(currentPath);

  const setCurrentPath = (path: string) => {
    currentPathRef.current = path;
    _setCurrentPath(path);
  };

  const calculateFolderSize = (node: FSNode): number => {
    if (node.type === "file") {
      return node.binaryData ? node.binaryData.length : (typeof node.content === "string" ? node.content.length : 0);
    }
    if (node.type === "directory" && node.children) {
      return Object.values(node.children).reduce(
        (sum, child) => sum + calculateFolderSize(child),
        0
      );
    }
    return 0;
  };

  const formatFileSystem = () => {
    rootRef.current = INITIAL_FS;
    setRoot(INITIAL_FS);
    setCurrentPath("/home/user");
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem("aresos_todo_items");
      localStorage.removeItem("aresos_calendar_events");
      localStorage.removeItem("aresos_browser_bookmarks");
      localStorage.removeItem("aresos_terminal_history");
      localStorage.removeItem("aresos_notification_goals");
    }
  };

  // Save to localStorage on changes
  const saveFileSystem = (newRoot: FSDirectory) => {
    rootRef.current = newRoot;
    setRoot(newRoot);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRoot));
    }
  };

  // Helper to split a path into segment arrays
  const parsePath = (path: string): string[] => {
    const absolutePath = path.startsWith("/") ? path : `${currentPathRef.current}/${path}`;
    return absolutePath.split("/").filter(Boolean);
  };

  // Helper to navigate the directory tree to find a node at a path
  const findNode = (rootNode: FSDirectory, segments: string[]): FSNode | null => {
    let current: FSNode = rootNode;

    for (const segment of segments) {
      if (current.type !== "directory") return null;
      const next: FSNode | undefined = current.children[segment];
      if (!next) return null;
      current = next;
    }

    return current;
  };

  // List directory elements
  const listDirectory = (path?: string) => {
    const targetPath = path !== undefined ? path : currentPathRef.current;
    const segments = parsePath(targetPath);
    const node = findNode(rootRef.current, segments);

    if (node && node.type === "directory") {
      return Object.entries(node.children).map(([name, child]) => ({
        name,
        node: child,
      }));
    }
    return [];
  };

  // Read file contents
  const readFile = (filePath: string): FSFile | null => {
    const segments = parsePath(filePath);
    const node = findNode(rootRef.current, segments);
    if (node && node.type === "file") {
      // Re-hydrate binaryData from plain object or string if needed
      if (node.binaryData && !(node.binaryData instanceof Uint8Array)) {
        node.binaryData = new Uint8Array(Object.values(node.binaryData));
      } else if (!node.binaryData && (node.extension === "zip" || node.name.endsWith(".zip"))) {
        const arr = new Uint8Array(node.content.length);
        for (let i = 0; i < node.content.length; i++) {
          arr[i] = node.content.charCodeAt(i) & 0xff;
        }
        node.binaryData = arr;
      }
      return node;
    }
    return null;
  };

  // Write file contents (creates file if not exists)
  const writeFile = (filePath: string, content: string | Uint8Array): boolean => {
    const segments = parsePath(filePath);
    if (segments.length === 0) return false;

    const fileName = segments[segments.length - 1];
    const parentSegments = segments.slice(0, -1);

    // Clone root to avoid state mutation issues
    const newRoot = JSON.parse(JSON.stringify(rootRef.current)) as FSDirectory;
    const parentNode = findNode(newRoot, parentSegments);

    if (parentNode && parentNode.type === "directory") {
      const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
      const existing = parentNode.children[fileName];

      let contentStr = "";
      let binData: Uint8Array | undefined;

      if (content instanceof Uint8Array) {
        binData = content;
        for (let i = 0; i < content.length; i++) {
          contentStr += String.fromCharCode(content[i]);
        }
      } else {
        contentStr = content;
        if (content.startsWith("PK\x03\x04") || content.startsWith("PK\u0003\u0004") || fileName.endsWith(".zip")) {
          binData = new Uint8Array(content.length);
          for (let i = 0; i < content.length; i++) {
            binData[i] = content.charCodeAt(i) & 0xff;
          }
        }
      }

      parentNode.children[fileName] = {
        name: fileName,
        type: "file",
        createdAt: existing ? existing.createdAt : Date.now(),
        updatedAt: Date.now(),
        content: contentStr,
        size: binData ? binData.length : contentStr.length,
        extension: ext,
        binaryData: binData,
      };

      // Check storage allocation limit
      const newSize = calculateFolderSize(newRoot);
      const limitBytes = (settings?.maxStorageAllocation || 64) * 1024 * 1024;
      if (newSize > limitBytes) {
        addNotification(
          "Storage Limit Exceeded",
          `Cannot write file. Virtual filesystem size would exceed allocation limit of ${settings?.maxStorageAllocation || 64} MB.`,
          "error"
        );
        return false;
      }

      saveFileSystem(newRoot);
      return true;
    }

    return false;
  };

  // Create new directory
  const createDirectory = (dirPath: string, name: string): boolean => {
    const segments = parsePath(dirPath);
    const newRoot = JSON.parse(JSON.stringify(rootRef.current)) as FSDirectory;
    const parentNode = findNode(newRoot, segments);

    if (parentNode && parentNode.type === "directory") {
      if (parentNode.children[name]) {
        return false; // Already exists
      }

      parentNode.children[name] = {
        name,
        type: "directory",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: {},
      };

      saveFileSystem(newRoot);
      return true;
    }

    return false;
  };

  // Delete file or folder
  const deleteNode = (nodePath: string): boolean => {
    const segments = parsePath(nodePath);
    if (segments.length === 0) return false;

    const nodeName = segments[segments.length - 1];
    const parentSegments = segments.slice(0, -1);

    const newRoot = JSON.parse(JSON.stringify(rootRef.current)) as FSDirectory;
    const parentNode = findNode(newRoot, parentSegments);

    if (parentNode && parentNode.type === "directory") {
      if (parentNode.children[nodeName]) {
        delete parentNode.children[nodeName];
        saveFileSystem(newRoot);
        return true;
      }
    }

    return false;
  };

  // Change directory path navigation
  const changeDirectory = (targetPath: string): boolean => {
    // Standard Unix navigation logic support
    let segments: string[] = [];
    
    if (targetPath.startsWith("/")) {
      segments = targetPath.split("/").filter(Boolean);
    } else {
      const currentSegments = currentPathRef.current.split("/").filter(Boolean);
      const relativeSegments = targetPath.split("/").filter(Boolean);

      for (const segment of relativeSegments) {
        if (segment === ".") {
          continue;
        } else if (segment === "..") {
          currentSegments.pop();
        } else {
          currentSegments.push(segment);
        }
      }
      segments = currentSegments;
    }

    const node = findNode(rootRef.current, segments);
    if (node && node.type === "directory") {
      const absolutePath = "/" + segments.join("/");
      setCurrentPath(absolutePath);
      return true;
    }

    return false;
  };

  const [clipboard, setClipboard] = useState<{ paths: string[]; mode: "copy" | "cut" } | null>(null);

  const copyNode = (paths: string[], mode: "copy" | "cut") => {
    setClipboard({ paths, mode });
  };

  const pasteNodeRecursive = (sourceNode: FSNode, destParentPath: string, newName: string, newRoot: FSDirectory) => {
    const segments = destParentPath.split("/").filter(Boolean);
    const parentNode = findNode(newRoot, segments);

    if (parentNode && parentNode.type === "directory") {
      if (sourceNode.type === "file") {
        const file = sourceNode as FSFile;
        parentNode.children[newName] = {
          ...file,
          name: newName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else if (sourceNode.type === "directory") {
        const dir = sourceNode as FSDirectory;
        const newDir: FSDirectory = {
          name: newName,
          type: "directory",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: {},
        };
        parentNode.children[newName] = newDir;
        
        const nextParentPath = destParentPath === "/" ? `/${newName}` : `${destParentPath}/${newName}`;
        Object.entries(dir.children || {}).forEach(([childName, childNode]) => {
          pasteNodeRecursive(childNode, nextParentPath, childName, newRoot);
        });
      }
    }
  };

  const pasteNode = (targetDirPath: string): boolean => {
    if (!clipboard || clipboard.paths.length === 0) return false;

    const newRoot = JSON.parse(JSON.stringify(rootRef.current)) as FSDirectory;
    let successCount = 0;

    clipboard.paths.forEach((sourcePath) => {
      const sourceSegments = sourcePath.split("/").filter(Boolean);
      if (sourceSegments.length === 0) return;
      const originalName = sourceSegments[sourceSegments.length - 1];

      const sourceNode = findNode(rootRef.current, sourceSegments);
      if (!sourceNode) return;

      const targetSegments = targetDirPath.split("/").filter(Boolean);
      const targetDirNode = findNode(newRoot, targetSegments);
      if (!targetDirNode || targetDirNode.type !== "directory") return;

      // Handle duplicate names
      let pasteName = originalName;
      let counter = 1;
      
      if (clipboard.mode === "copy") {
        while (targetDirNode.children[pasteName]) {
          const dotIdx = originalName.lastIndexOf(".");
          if (dotIdx !== -1) {
            pasteName = `${originalName.substring(0, dotIdx)} (Copy ${counter})${originalName.substring(dotIdx)}`;
          } else {
            pasteName = `${originalName} (Copy ${counter})`;
          }
          counter++;
        }
      }

      pasteNodeRecursive(sourceNode, targetDirPath, pasteName, newRoot);
      
      if (clipboard.mode === "cut") {
        const sourceParentSegments = sourceSegments.slice(0, -1);
        const sourceParentNode = findNode(newRoot, sourceParentSegments);
        if (sourceParentNode && sourceParentNode.type === "directory") {
          delete sourceParentNode.children[originalName];
        }
      }
      successCount++;
    });

    if (successCount > 0) {
      // Check storage allocation limit before saving
      const newSize = calculateFolderSize(newRoot);
      const limitBytes = (settings?.maxStorageAllocation || 64) * 1024 * 1024;
      if (newSize > limitBytes) {
        addNotification(
          "Storage Limit Exceeded",
          `Cannot paste items. Virtual filesystem size would exceed allocation limit of ${settings?.maxStorageAllocation || 64} MB.`,
          "error"
        );
        return false;
      }

      saveFileSystem(newRoot);
      if (clipboard.mode === "cut") {
        setClipboard(null);
      }
      return true;
    }
    return false;
  };

  const renameNode = (nodePath: string, newName: string): boolean => {
    const segments = nodePath.split("/").filter(Boolean);
    if (segments.length === 0) return false;

    const oldName = segments[segments.length - 1];
    const parentSegments = segments.slice(0, -1);

    const newRoot = JSON.parse(JSON.stringify(rootRef.current)) as FSDirectory;
    const parentNode = findNode(newRoot, parentSegments);

    if (parentNode && parentNode.type === "directory") {
      const node = parentNode.children[oldName];
      if (node) {
        if (parentNode.children[newName]) {
          return false; // Name already exists in this folder
        }
        node.name = newName;
        node.updatedAt = Date.now();
        parentNode.children[newName] = node;
        delete parentNode.children[oldName];
        saveFileSystem(newRoot);
        return true;
      }
    }
    return false;
  };

  return (
    <FSContext.Provider
      value={{
        root,
        currentPath,
        listDirectory,
        readFile,
        writeFile,
        createDirectory,
        deleteNode,
        changeDirectory,
        clipboard,
        copyNode,
        pasteNode,
        renameNode,
        formatFileSystem,
      }}
    >
      {children}
    </FSContext.Provider>
  );
};
