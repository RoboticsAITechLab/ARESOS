"use client";

import React from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  targetName: string;
  onClose: () => void;
  onDelete: () => void;
}

export const DeleteConfirmModal: React.FC<
  DeleteConfirmModalProps
> = ({
  isOpen,
  targetName,
  onClose,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{ zIndex: 99999 }}
      className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-rose-900/35 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-rose-400 flex items-center gap-1.5 font-sans">
            ⚠️ Delete File
          </h2>

          <p className="text-[10px] text-zinc-500 leading-normal font-sans">
            Are you sure you want to permanently delete the shortcut{" "}
            <span className="text-white font-bold font-mono">
              "{targetName}"
            </span>{" "}
            from your Desktop?
          </p>
        </div>

        <div className="flex justify-end gap-2 text-xs pt-1.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 font-semibold rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={onDelete}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition cursor-pointer shadow-md shadow-rose-600/10"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
};