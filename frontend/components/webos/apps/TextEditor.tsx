"use client";

import React, { useState, useEffect } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";

interface TextEditorProps {
  pid: string;
}

export default function TextEditor({ pid }: TextEditorProps) {
  const { processes, addNotification } = useOS();
  const { readFile, writeFile } = useFileSystem();

  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isModified, setIsModified] = useState(false);

  // Load process arguments
  useEffect(() => {
    const proc = processes.find((p) => p.pid === pid);
    if (proc?.args?.filePath) {
      const path = proc.args.filePath as string;
      setFilePath(path);
      
      const file = readFile(path);
      if (file) {
        setContent(file.content);
        setIsModified(false);
      }
    }
  }, [pid, processes, readFile]);

  const handleSave = () => {
    let targetPath = filePath;
    if (!targetPath) {
      const inputPath = prompt("Enter full file path to save (e.g. /home/user/Desktop/notes.txt):", "/home/user/Desktop/notes.txt");
      if (!inputPath) return;
      targetPath = inputPath;
    }

    const ok = writeFile(targetPath, content);
    if (ok) {
      setFilePath(targetPath);
      setIsModified(false);
      addNotification("Notepad", `File saved successfully to ${targetPath}.`, "success");
    } else {
      addNotification("Error", "Could not save file. Path folder does not exist.", "error");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 font-mono text-zinc-300">
      {/* File Action Ribbon */}
      <div className="h-10 border-b border-zinc-900 bg-zinc-950/45 px-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xxs text-white font-bold rounded cursor-pointer transition flex items-center gap-1"
          >
            💾 <span>Save</span>
          </button>
          <button
            onClick={() => {
              if (isModified && !confirm("Discard unsaved changes?")) return;
              setFilePath(null);
              setContent("");
              setIsModified(false);
            }}
            className="px-3 py-1 hover:bg-zinc-800 text-xxs text-zinc-400 font-bold rounded cursor-pointer border border-zinc-800 transition"
          >
            📄 New File
          </button>
        </div>

        {/* Path Display */}
        <span className="text-xxs font-mono text-zinc-500 truncate max-w-[200px]">
          {filePath ? `${filePath}${isModified ? " *" : ""}` : "Unsaved Document *"}
        </span>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 p-0 relative">
        <textarea
          autoFocus
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setIsModified(true);
          }}
          className="w-full h-full bg-transparent p-4 text-xs font-mono outline-none border-none resize-none focus:ring-0 focus:outline-none text-zinc-200 select-text"
          placeholder="Start typing text here..."
        />
      </div>

      {/* Footer Info line */}
      <div className="h-6 bg-zinc-950/60 border-t border-zinc-900 px-3 flex items-center justify-between text-[10px] text-zinc-500 select-none flex-shrink-0">
        <span>Characters: {content.length}</span>
        <span>Notepad Engine v1.0</span>
      </div>
    </div>
  );
}
