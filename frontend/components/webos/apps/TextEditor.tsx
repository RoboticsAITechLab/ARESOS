"use client";

import React, { useState, useEffect, useRef } from "react";
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

  // Layout tabs: Edit vs Live Markdown Preview
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");

  // Formatting settings (Windows Notepad configurations)
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState<"xs" | "sm" | "base">("sm");
  const [fontFamily, setFontFamily] = useState<"mono" | "sans" | "serif">("mono");
  const [editorTheme, setEditorTheme] = useState<"dark" | "light" | "terminal" | "hacker" | "midnight">("dark");

  // Menu Dropdown states
  const [activeMenu, setActiveMenu] = useState<"file" | "edit" | "format" | "theme" | null>(null);

  // Find & Replace Panel States
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [searchIndex, setSearchIndex] = useState(-1);

  // Cursor coordinates
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleRenameNote = () => {
    if (!selectedNote) return;
    const name = prompt(`Rename '${selectedNote}' to:`, selectedNote);
    if (!name || name === selectedNote) return;

    const fileName = name.endsWith(".txt") || name.endsWith(".md") ? name : `${name}.txt`;
    const fullOldPath = `${notesDir}/${selectedNote}`;
    const fullNewPath = `${notesDir}/${fileName}`;

    // Read old contents
    const oldFile = readFile(fullOldPath);
    const oldContent = oldFile ? oldFile.content : "";

    // Write new file, delete old file
    const writeOk = writeFile(fullNewPath, oldContent);
    if (writeOk) {
      deleteNode(fullOldPath);
      loadNotesCatalog();
      setSelectedNote(fileName);
      addNotification("Notepad", `Renamed note to '${fileName}'.`, "success");
    } else {
      addNotification("Error", "Failed to rename note.", "error");
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

  // Keyboard Shortcuts Listener within editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl + S (Save)
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    // Ctrl + F (Find)
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      setShowFindReplace((prev) => !prev);
    }
  };

  // Find & Replace Actions
  const handleFindNext = () => {
    if (!findText) return;
    const lowerContent = content.toLowerCase();
    const lowerFind = findText.toLowerCase();

    let nextIdx = lowerContent.indexOf(lowerFind, searchIndex + 1);
    if (nextIdx === -1) {
      // Wrap around to beginning
      nextIdx = lowerContent.indexOf(lowerFind, 0);
    }

    if (nextIdx !== -1) {
      setSearchIndex(nextIdx);
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(nextIdx, nextIdx + findText.length);
        const segment = content.substring(0, nextIdx);
        const lines = segment.split("\n");
        setCursorPos({
          line: lines.length,
          col: lines[lines.length - 1].length + 1,
        });
      }
    } else {
      addNotification("Notepad", `No matches found for "${findText}"`, "info");
    }
  };

  const handleReplace = () => {
    if (searchIndex === -1 || !findText) return;
    const before = content.substring(0, searchIndex);
    const after = content.substring(searchIndex + findText.length);
    const newContent = before + replaceText + after;
    setContent(newContent);
    setIsModified(true);
    // Move index past replacement
    setSearchIndex(searchIndex + replaceText.length - 1);
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const escapedFind = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escapedFind, "gi");
    const newContent = content.replace(regex, replaceText);
    setContent(newContent);
    setIsModified(true);
    addNotification("Notepad", `All occurrences of "${findText}" replaced.`, "success");
  };

  const toggleMenu = (menu: "file" | "edit" | "format" | "theme") => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  // Statistics counters
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTime = Math.ceil(wordCount / 200);

  // Markdown Custom Parser Renderer
  const renderMarkdownPreview = () => {
    if (!content) {
      return <div className="text-zinc-500 italic p-6">Empty document. Start typing in Edit mode!</div>;
    }

    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeContent: string[] = [];

    return (
      <div className="max-w-none text-zinc-300 select-text space-y-3 font-sans p-6 overflow-y-auto h-full scrollbar-thin">
        {lines.map((line, idx) => {
          if (line.trim().startsWith("```")) {
            if (inCodeBlock) {
              inCodeBlock = false;
              const codeString = codeContent.join("\n");
              codeContent = [];
              return (
                <pre
                  key={idx}
                  className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/60 font-mono text-xs overflow-x-auto text-emerald-400 my-2"
                >
                  <code>{codeString}</code>
                </pre>
              );
            } else {
              inCodeBlock = true;
              return null;
            }
          }

          if (inCodeBlock) {
            codeContent.push(line);
            return null;
          }

          // Headers
          if (line.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-xl font-extrabold text-white border-b border-zinc-800 pb-1 pt-2">
                {line.substring(2)}
              </h1>
            );
          }
          if (line.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-lg font-bold text-white pt-2">
                {line.substring(3)}
              </h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-base font-semibold text-white pt-1">
                {line.substring(4)}
              </h3>
            );
          }

          // Lists
          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            return (
              <li key={idx} className="ml-4 list-disc text-xs text-zinc-300">
                {line.trim().substring(2)}
              </li>
            );
          }

          const numMatch = line.trim().match(/^\d+\.\s+/);
          if (numMatch) {
            return (
              <li key={idx} className="ml-4 list-decimal text-xs text-zinc-300">
                {line.trim().substring(numMatch[0].length)}
              </li>
            );
          }

          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          // Bold parsing
          let formattedLine: React.ReactNode = line;
          if (line.includes("**")) {
            const parts = line.split("**");
            formattedLine = parts.map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="text-white font-bold">
                  {part}
                </strong>
              ) : (
                part
              )
            );
          }

          return (
            <p key={idx} className="text-xs leading-relaxed text-zinc-300">
              {formattedLine}
            </p>
          );
        })}
      </div>
    );
  };

  // Editor Themes styling mapping
  const themeStyles = {
    dark: {
      wrapper: "bg-zinc-900 text-zinc-300 border-zinc-800/60",
      editorBg: "bg-zinc-950 text-zinc-200 placeholder-zinc-650",
      toolbarBg: "bg-zinc-950/20 text-zinc-300",
      sidebarBg: "bg-zinc-950/40 text-zinc-400 border-zinc-800/60",
    },
    light: {
      wrapper: "bg-zinc-100 text-zinc-700 border-zinc-200",
      editorBg: "bg-white text-zinc-850 placeholder-zinc-400",
      toolbarBg: "bg-zinc-200/30 text-zinc-700",
      sidebarBg: "bg-zinc-200/50 text-zinc-600 border-zinc-250",
    },
    terminal: {
      wrapper: "bg-zinc-950 text-emerald-400 border-zinc-900",
      editorBg: "bg-black text-emerald-300 placeholder-emerald-950/40",
      toolbarBg: "bg-black/60 text-emerald-400",
      sidebarBg: "bg-black/45 text-emerald-400/80 border-zinc-900",
    },
    hacker: {
      wrapper: "bg-zinc-950 text-amber-500 border-zinc-900",
      editorBg: "bg-black text-amber-400 placeholder-amber-950/40",
      toolbarBg: "bg-black/60 text-amber-500",
      sidebarBg: "bg-black/45 text-amber-400 border-zinc-900",
    },
    midnight: {
      wrapper: "bg-slate-900 text-indigo-200 border-indigo-950/40",
      editorBg: "bg-slate-950 text-indigo-100 placeholder-indigo-950/30",
      toolbarBg: "bg-slate-950/35 text-indigo-300",
      sidebarBg: "bg-slate-950/50 text-indigo-300/80 border-indigo-950/40",
    },
  };

  const activeTheme = themeStyles[editorTheme];

  const fontClasses = {
    mono: "font-mono",
    sans: "font-sans",
    serif: "font-serif",
  };

  return (
    <div
      onClick={() => setActiveMenu(null)}
      onKeyDown={handleEditorKeyDown}
      tabIndex={0}
      className={`w-full h-full flex font-mono text-xs select-none relative focus:outline-none ${activeTheme.wrapper}`}
    >
      {/* 1. Sidebar catalog layout (Notepad files list) */}
      <div className={`w-40 border-r flex flex-col flex-shrink-0 ${activeTheme.sidebarBg}`}>
        <div className="p-3 border-b border-zinc-800/60 flex items-center justify-between">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
            Notes Index
          </span>
          <button
            onClick={handleCreateNew}
            className="w-5 h-5 rounded hover:bg-zinc-800/50 text-xs font-bold flex items-center justify-center cursor-pointer transition text-zinc-300 hover:text-white"
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
                  ? "bg-zinc-800/60 text-white font-semibold"
                  : "hover:bg-zinc-800/20 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="truncate flex-1 pr-1.5">{name.replace(/\.[^/.]+$/, "")}</span>
              <button
                onClick={(e) => handleDeleteNote(name, e)}
                className="text-[9px] text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                title="Delete note"
              >
                ✕
              </button>
            </div>
          ))}
          {notesList.length === 0 && (
            <div className="text-center text-[10px] text-zinc-650 py-10">
              Empty catalog
            </div>
          )}
        </div>
      </div>

      {/* 2. Main editor panel */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top ribbon menu buttons (classic file/edit options) */}
        <div className={`h-6 border-b border-zinc-800/60 px-2 flex items-center justify-between text-[11px] relative flex-shrink-0 ${activeTheme.toolbarBg}`}>
          
          <div className="flex items-center gap-1.5">
            {/* File Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu("file");
                }}
                className={`px-2 py-0.5 rounded hover:bg-zinc-800/65 cursor-pointer transition ${
                  activeMenu === "file" ? "bg-zinc-800 text-white" : ""
                }`}
              >
                File
              </button>
              {activeMenu === "file" && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-6 w-36 bg-zinc-900 border border-zinc-800/60 rounded-lg shadow-xl py-1 z-[99] text-zinc-300"
                >
                  <button
                    onClick={handleCreateNew}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px]"
                  >
                    New Note
                  </button>
                  <button
                    onClick={handleSave}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] border-t border-zinc-800/40"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleRenameNote}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] border-t border-zinc-800/40"
                  >
                    Rename Note
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
                className={`px-2 py-0.5 rounded hover:bg-zinc-800/65 cursor-pointer transition ${
                  activeMenu === "edit" ? "bg-zinc-800 text-white" : ""
                }`}
              >
                Edit
              </button>
              {activeMenu === "edit" && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-6 w-36 bg-zinc-900 border border-zinc-800/60 rounded-lg shadow-xl py-1 z-[99] text-zinc-300"
                >
                  <button
                    onClick={() => {
                      setShowFindReplace((prev) => !prev);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] flex justify-between items-center"
                  >
                    <span>Find & Replace</span>
                    <span className="text-[8px] text-zinc-500 font-mono">Ctrl+F</span>
                  </button>
                  <button
                    onClick={() => {
                      setContent("");
                      setIsModified(true);
                      setActiveMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] border-t border-zinc-800/40 text-rose-400"
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
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] border-t border-zinc-800/40"
                  >
                    Reset Changes
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
                className={`px-2 py-0.5 rounded hover:bg-zinc-800/65 cursor-pointer transition ${
                  activeMenu === "format" ? "bg-zinc-800 text-white" : ""
                }`}
              >
                Format
              </button>
              {activeMenu === "format" && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-6 w-40 bg-zinc-900 border border-zinc-800/60 rounded-lg shadow-xl py-1.5 z-[99] space-y-1 text-zinc-300"
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
                  
                  <div className="border-t border-zinc-800/40 my-1" />
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

                  <div className="border-t border-zinc-800/40 my-1" />
                  <div className="px-3 text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Font Family</div>
                  {(["mono", "sans", "serif"] as const).map((fam) => (
                    <button
                      key={fam}
                      onClick={() => {
                        setFontFamily(fam);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-4 py-0.5 hover:bg-zinc-800 cursor-pointer text-[9px] flex justify-between items-center"
                    >
                      <span className="capitalize">{fam === "mono" ? "Monospace" : fam === "sans" ? "Sans-Serif" : "Serif"}</span>
                      {fontFamily === fam && <span className="text-emerald-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu("theme");
                }}
                className={`px-2 py-0.5 rounded hover:bg-zinc-800/65 cursor-pointer transition ${
                  activeMenu === "theme" ? "bg-zinc-800 text-white" : ""
                }`}
              >
                Theme
              </button>
              {activeMenu === "theme" && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-6 w-36 bg-zinc-900 border border-zinc-800/60 rounded-lg shadow-xl py-1 z-[99] text-zinc-300"
                >
                  {(["dark", "light", "terminal", "hacker", "midnight"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setEditorTheme(t);
                        setActiveMenu(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 cursor-pointer text-[10px] flex justify-between items-center"
                    >
                      <span className="capitalize">{t}</span>
                      {editorTheme === t && <span className="text-emerald-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Edit / Markdown Preview Tabs */}
          <div className="flex bg-zinc-900 border border-zinc-800/60 p-0.5 rounded-lg mr-2">
            <button
              onClick={() => setEditorTab("edit")}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer transition ${
                editorTab === "edit" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setEditorTab("preview")}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer transition ${
                editorTab === "preview" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Find & Replace Overlay Drawer */}
        {showFindReplace && (
          <div className="bg-zinc-900 border-b border-zinc-800/60 px-4 py-2 flex flex-wrap gap-3 items-center justify-between text-[11px] animate-in slide-in-from-top-2 duration-150 text-zinc-200">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span>Find:</span>
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs outline-none focus:border-zinc-700 w-32"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span>Replace:</span>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs outline-none focus:border-zinc-700 w-32"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleFindNext}
                className="bg-zinc-800 hover:bg-zinc-750 px-2.5 py-1 rounded cursor-pointer transition text-[10px] font-bold"
              >
                Find Next
              </button>
              <button
                onClick={handleReplace}
                className="bg-zinc-850 hover:bg-zinc-800 px-2.5 py-1 rounded cursor-pointer transition text-[10px] font-bold"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                className="bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded cursor-pointer transition text-[10px] font-bold"
              >
                Replace All
              </button>
              <button
                onClick={() => setShowFindReplace(false)}
                className="text-zinc-500 hover:text-zinc-300 px-1.5 transition text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Text Area typing canvas or markdown preview */}
        <div className={`flex-1 relative ${activeTheme.editorBg}`}>
          {editorTab === "edit" ? (
            <textarea
              ref={textareaRef}
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
              className={`w-full h-full bg-transparent p-4 outline-none border-none resize-none focus:ring-0 focus:outline-none select-text overflow-auto ${
                fontClasses[fontFamily]
              } ${
                fontSize === "xs" ? "text-xxs" : fontSize === "sm" ? "text-xs" : "text-sm"
              }`}
              placeholder="Type content notes here (Supports Markdown formatting in Preview mode)..."
            />
          ) : (
            <div className="w-full h-full overflow-y-auto">
              {renderMarkdownPreview()}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="h-5 bg-zinc-950 border-t border-zinc-850 px-3.5 flex items-center justify-between text-[10px] text-zinc-500 select-none flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>Encoding: UTF-8</span>
            <span>|</span>
            <span className={isModified ? "text-amber-500 font-bold" : "text-zinc-650 font-bold"}>
              {isModified ? "Modified" : "Synced"}
            </span>
          </div>

          <div className="flex items-center gap-5">
            <span>Words: {wordCount}</span>
            <span>Chars: {charCount}</span>
            <span>Read: {readTime} min</span>
            <span>|</span>
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </div>
        </div>

      </div>
    </div>
  );
}















