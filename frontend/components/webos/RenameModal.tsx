"use client";

import React from "react";

interface RenameModalProps {
  isOpen: boolean;
  targetName: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  targetName,
  value,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-white">
            Rename File
          </h2>

          <p className="text-[10px] text-zinc-500 font-sans">
            Rename File{" "}
            <span className="text-indigo-400 font-mono select-all">
              "{targetName}"
            </span>
            .
          </p>
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          required
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white outline-none transition"
        />

        <div className="flex justify-end gap-2 text-xs pt-1.5">
          <button
            type="button"
            onClick={onClose}
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
  );
};