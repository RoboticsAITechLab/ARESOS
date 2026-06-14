"use client";

import React, { createContext, useState, ReactNode } from "react";
import { FSDirectory, FSNode, FSFile } from "@/types/webos/fs";

interface FSContextType {
  root: FSDirectory;
  currentPath: string;
  listDirectory: (path?: string) => { name: string; node: FSNode }[];
  readFile: (filePath: string) => FSFile | null;
  writeFile: (filePath: string, content: string) => boolean;
  createDirectory: (dirPath: string, name: string) => boolean;
  deleteNode: (nodePath: string) => boolean;
  changeDirectory: (targetPath: string) => boolean;
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
  const [currentPath, setCurrentPath] = useState<string>("/home/user");

  // Save to localStorage on changes
  const saveFileSystem = (newRoot: FSDirectory) => {
    setRoot(newRoot);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newRoot));
    }
  };

  // Helper to split a path into segment arrays
  const parsePath = (path: string): string[] => {
    const absolutePath = path.startsWith("/") ? path : `${currentPath}/${path}`;
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
    const targetPath = path !== undefined ? path : currentPath;
    const segments = parsePath(targetPath);
    const node = findNode(root, segments);

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
    const node = findNode(root, segments);
    if (node && node.type === "file") {
      return node;
    }
    return null;
  };

  // Write file contents (creates file if not exists)
  const writeFile = (filePath: string, content: string): boolean => {
    const segments = parsePath(filePath);
    if (segments.length === 0) return false;

    const fileName = segments[segments.length - 1];
    const parentSegments = segments.slice(0, -1);

    // Clone root to avoid state mutation issues
    const newRoot = JSON.parse(JSON.stringify(root)) as FSDirectory;
    const parentNode = findNode(newRoot, parentSegments);

    if (parentNode && parentNode.type === "directory") {
      const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
      const existing = parentNode.children[fileName];

      parentNode.children[fileName] = {
        name: fileName,
        type: "file",
        createdAt: existing ? existing.createdAt : Date.now(),
        updatedAt: Date.now(),
        content,
        size: content.length,
        extension: ext,
      };

      saveFileSystem(newRoot);
      return true;
    }

    return false;
  };

  // Create new directory
  const createDirectory = (dirPath: string, name: string): boolean => {
    const segments = parsePath(dirPath);
    const newRoot = JSON.parse(JSON.stringify(root)) as FSDirectory;
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

    const newRoot = JSON.parse(JSON.stringify(root)) as FSDirectory;
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
      const currentSegments = currentPath.split("/").filter(Boolean);
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

    const node = findNode(root, segments);
    if (node && node.type === "directory") {
      const absolutePath = "/" + segments.join("/");
      setCurrentPath(absolutePath);
      return true;
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
      }}
    >
      {children}
    </FSContext.Provider>
  );
};
