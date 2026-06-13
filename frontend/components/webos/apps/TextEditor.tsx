"use client";

import React, { useState, useEffect } from "react";
import { useFileSystem } from "@/hooks/webos/useFileSystem";
import { useOS } from "@/hooks/webos/useOS";

interface TextEditorProps {
  pid: string;
}

export default function TextEditor({ pid }: TextEditorProps) {
  const { addNotification, processes } = useOS();
  const { listDirectory, readFile, writeFile, deleteNode } = useFileSystem();

  const myProcess = processes.find((p) => p.pid === pid);
  const filePathArg = myProcess?.args?.filePath as string | undefined;

  const [notesList, setNotesList] = useState<string[]>([]);
  const [notesDir, setNotesDir] = useState("/home/user/Documents");
  const [selectedNote, setSelectedNote] = useState<string>("");
  const [content, setContent] = useState("");
  const [isModified, setIsModified] = useState(false);

  // Formatting settings (Windows Notepad configurations)
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState<"xs" | "sm" | "base">("sm");

  // Menu Dropdown states
  const [activeMenu, setActiveMenu] = useState<"file" | "edit" | "format" | null>(null);

  // Cursor coordinates
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Handle open file from process argument on mount
  useEffect(() => {
    if (filePathArg) {
      const lastSlashIdx = filePathArg.lastIndexOf("/");
      if (lastSlashIdx !== -1) {
        const dir = filePathArg.substring(0, lastSlashIdx) || "/";
        const file = filePathArg.substring(lastSlashIdx + 1);
        setNotesDir(dir);
        setSelectedNote(file);
        return;
      }
    }
    setNotesDir("/home/user/Documents");
    setSelectedNote("Physics.txt");
  }, [filePathArg]);

  // Prepopulate VFS notes if empty on load
  const initDefaultNotes = () => {
    try {
      if (notesDir !== "/home/user/Documents") return;
      const existing = listDirectory(notesDir);
      const txtFiles = existing.filter((item) => item.name.endsWith(".txt") || item.name.endsWith(".md"));

      if (txtFiles.length === 0) {
        writeFile(`${notesDir}/Physics.txt`, "Physics study notes:\n- Quantum core synchronization rate: stable\n- Core energy thresholds: 1.28V normal\n- Thermal dispersion rate: coefficient 0.12\n\nNotes: Check core sync drift values.");
        writeFile(`${notesDir}/Maths.txt`, "Calculus revisions:\n- Limits and derivatives mapping equations\n- Quantum field equations integrations\n- Multi-dimensional matrix multiplications.");
        writeFile(`${notesDir}/Projects.txt`, "ARESOS WebOS tasks tracker:\n- Done: move Git workspace root\n- Done: add Advanced BootScreen\n- Done: configure Retinal scan Login\n- Todo: complete clean macOS desktop");
        writeFile(`${notesDir}/Ideas.txt`, "Cybernetic project ideas:\n1. Integrate live terminal scripts runner\n2. Add multi-user logins encryption\n3. Connect custom WebSocket grids.");
      }
    } catch (e) {
      console.error("Failed to initialize default notes VFS entries", e);
    }
  };

  const loadNotesCatalog = () => {
    try {
      const items = listDirectory(notesDir);
      const filtered = items
        .filter((item) => item.node.type === "file" && (item.name.endsWith(".txt") || item.name.endsWith(".md")))
        .map((item) => item.name);
      setNotesList(filtered);
    } catch (e) {
      console.error("Failed to list VFS notes catalog", e);
    }
  };

  // Setup and dynamic refresh of files list
  useEffect(() => {
    initDefaultNotes();
    loadNotesCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDir, listDirectory]);

  // Load note contents when selection or folder changes
  useEffect(() => {
    if (!selectedNote) {
      setContent("");
      setIsModified(false);
      return;
    }

    const path = `${notesDir}/${selectedNote}`;
    const file = readFile(path);
    if (file) {
      setContent(file.content);
      setIsModified(false);
    } else {
      setContent("");
      setIsModified(false);
    }
  }, [selectedNote, notesDir, readFile]);

  const handleSave = () => {
    if (!selectedNote) return;

    const path = `${notesDir}/${selectedNote}`;
    const ok = writeFile(path, content);
    if (ok) {
      setIsModified(false);
      addNotification("Notepad", `Successfully saved changes to '${selectedNote}'.`, "success");
    } else {
      addNotification("Error", "Failed to save file.", "error");
    }
    setActiveMenu(null);
  };

  const handleCreateNew = () => {
    const name = prompt("Enter note name (e.g. Science.txt):");
    if (!name) return;

    const fileName = name.endsWith(".txt") || name.endsWith(".md") ? name : `${name}.txt`;
    const fullPath = `${notesDir}/${fileName}`;

    const ok = writeFile(fullPath, "");
    if (ok) {
      loadNotesCatalog();
      setSelectedNote(fileName);
      setContent("");
      setIsModified(false);
      addNotification("Notepad", `Created note '${fileName}'.`, "success");
    } else {
      addNotification("Error", "Could not create note.", "error");
    }
    setActiveMenu(null);
  };

  const handleDeleteNote = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete '${name}'?`)) {
      const fullPath = `${notesDir}/${name}`;
      const ok = deleteNode(fullPath);
      if (ok) {
        loadNotesCatalog();
        addNotification("Notepad", `Deleted note '${name}'.`, "success");
        if (selectedNote === name) {
          setSelectedNote("");
          setContent("");
          setIsModified(false);
        }
      }
    }
  };

  // Cursor coordinates selector monitor
  const handleTextareaSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const text = textarea.value;
    const selectionIndex = textarea.selectionStart;

    const segment = text.substring(0, selectionIndex);
    const lines = segment.split("\n");
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;

    setCursorPos({ line: currentLine, col: currentCol });
  };

  // Close menus when clicking backdrop
  const toggleMenu = (menu: "file" | "edit" | "format") => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  return (
    <div
      onClick={() => setActiveMenu(null)}
      className="w-full h-full flex bg-zinc-900 text-zinc-300 font-mono text-xs select-none relative"
    >
      {/* 1. Sidebar catalog layout (Notepad notes index) */}
      <div className="w-40 bg-zinc-950/40 border-r border-zinc-800/60 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-zinc-850 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
            Notes Index
          </span>
          <button
            onClick={handleCreateNew}
            className="w-5 h-5 rounded hover:bg-zinc-800 text-[13px] font-bold text-zinc-300 flex items-center justify-center cursor-pointer transition"
            title="Create New Note"
          >
            +
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin">
          {notesList.map((name) => (
            <div
              key={name}
              onClick={() => setSelectedNote(name)}
              className={`px-3 py-1.5 flex justify-between items-center group cursor-pointer transition ${
                selectedNote === name
                  ? "bg-zinc-800 text-white font-semibold"
                  : "hover:bg-zinc-800/40 text-zinc-400"
              }`}
            >
              <span className="truncate flex-1 pr-1.5">{name.replace(/\.[^/.]+$/, "")}</span>
              <button
                onClick={(e) => handleDeleteNote(name, e)}
                className="text-[9px] text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                title="Delete note"
              >
                ✕
              </button>
            </div>
          ))}
          {notesList.length === 0 && (
            <div className="text-center text-[10px] text-zinc-600 py-10 font-mono">
              Empty catalog
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Notepad view pane */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top ribbon menu buttons (classic file/edit options) */}
        <div className="h-6 border-b border-zinc-850 bg-zinc-950/20 px-2 flex items-center gap-1.5 text-[11px] relative flex-shrink-0">
          
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu("file");
              }}
              className={`px-2 py-0.5 rounded hover:bg-zinc-800 cursor-pointer ${
                activeMenu === "file" ? "bg-zinc-850 text-white" : ""
              }`}
            >
              File
            </button>
            {activeMenu === "file" && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-[99]"
              >
                <button
                  onClick={handleCreateNew}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px]"
                >
                  New Note
                </button>
                <button
                  onClick={handleSave}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] border-t border-zinc-850"
                >
                  Save (💾)
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu("edit");
              }}
              className={`px-2 py-0.5 rounded hover:bg-zinc-800 cursor-pointer ${
                activeMenu === "edit" ? "bg-zinc-850 text-white" : ""
              }`}
            >
              Edit
            </button>
            {activeMenu === "edit" && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 z-[99]"
              >
                <button
                  onClick={() => {
                    setContent("");
                    setIsModified(true);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px]"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    if (selectedNote) {
                      const file = readFile(`${notesDir}/${selectedNote}`);
                      if (file) setContent(file.content);
                    }
                    setIsModified(false);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] border-t border-zinc-850"
                >
                  Reset note
                </button>
              </div>
            )}
          </div>

          {/* Format Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu("format");
              }}
              className={`px-2 py-0.5 rounded hover:bg-zinc-800 cursor-pointer ${
                activeMenu === "format" ? "bg-zinc-850 text-white" : ""
              }`}
            >
              Format
            </button>
            {activeMenu === "format" && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-6 w-40 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1.5 z-[99] space-y-1"
              >
                <button
                  onClick={() => {
                    setWordWrap(!wordWrap);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-zinc-800 cursor-pointer text-[10px] flex justify-between items-center"
                >
                  <span>Word Wrap</span>
                  {wordWrap && <span className="text-emerald-400">✓</span>}
                </button>
                <div className="border-t border-zinc-850 my-1" />
                <div className="px-3 text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Font Size</div>
                {(["xs", "sm", "base"] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setFontSize(sz);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-4 py-0.5 hover:bg-zinc-800 cursor-pointer text-[9px] flex justify-between items-center"
                  >
                    <span className="capitalize">{sz === "xs" ? "Small" : sz === "sm" ? "Medium" : "Large"}</span>
                    {fontSize === sz && <span className="text-emerald-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Text Area typing canvas */}
        <div className="flex-1 bg-zinc-950 p-0 relative">
          <textarea
            autoFocus
            wrap={wordWrap ? "on" : "off"}
            value={content}
            onKeyUp={handleTextareaSelection}
            onMouseUp={handleTextareaSelection}
            onClick={handleTextareaSelection}
            onChange={(e) => {
              setContent(e.target.value);
              setIsModified(true);
              handleTextareaSelection(e);
            }}
            className={`w-full h-full bg-transparent p-4 outline-none border-none resize-none focus:ring-0 focus:outline-none text-zinc-200 select-text overflow-auto font-mono ${
              fontSize === "xs" ? "text-xxs" : fontSize === "sm" ? "text-xs" : "text-sm"
            }`}
            placeholder="Type notes content here..."
          />
        </div>

        {/* Status bar (classic Windows Notepad status bar) */}
        <div className="h-5 bg-zinc-950 border-t border-zinc-850 px-3.5 flex items-center justify-between text-[10px] text-zinc-500 select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>Encoding: UTF-8</span>
            <span>|</span>
            <span className={isModified ? "text-yellow-600/70" : "text-zinc-600"}>
              {isModified ? "Modifications Unsaved" : "Synced"}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span>100%</span>
            <span>Windows (CRLF)</span>
          </div>
        </div>

      </div>
    </div>
  );
}
