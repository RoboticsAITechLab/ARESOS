"use client";

import React from "react";
import { PropertyNode } from "@/types/webos/property";

interface PropertiesModalProps {
  isOpen: boolean;
  node: PropertyNode | null;
  onClose: () => void;
}

export const PropertiesModal: React.FC<
  PropertiesModalProps
> = ({
  isOpen,
  node,
  onClose,
}) => {
  if (!isOpen || !node) return null;

  return (
    <div
      style={{ zIndex: 99999 }}
      className="absolute inset-0 bg-zinc-950/65 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-80 max-w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 font-mono text-[10px] text-zinc-400">

        {/* Header */}

        <div className="space-y-1 font-sans">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            ⚙️ Properties
          </h2>
          <p className="text-[9.5px] text-zinc-500">
            File Information.
          </p>
        </div>

        <div className="h-px bg-zinc-800 my-2" />


        <div className="space-y-2.5">

          <div className="flex justify-between border-b border-zinc-800/35 pb-1">
            <span className="text-zinc-500">
              Object Name:
            </span>
            <span className="text-white font-bold truncate max-w-[150px]">
              {node.name}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800/35 pb-1">
            <span className="text-zinc-500">
              VFS Path:
            </span>
            <span className="text-indigo-400 font-bold truncate max-w-[160px] select-all">
              {node.path}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800/35 pb-1">
            <span className="text-zinc-500">
              Node Type:
            </span>
            <span className="text-white capitalize">
              {node.type}
            </span>
          </div>

          {node.type !== "System Application Shortcut" && (
            <div className="flex justify-between border-b border-zinc-800/35 pb-1">
              <span className="text-zinc-500">
                Sector Size:
              </span>
              <span className="text-white font-bold">
                {node.size} bytes
              </span>
            </div>
          )}

          <div className="flex justify-between border-b border-zinc-800/35 pb-1">
            <span className="text-zinc-500">
              Timestamp Initial:
            </span>
            <span className="text-white">
              {new Date(node.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-800/35 pb-1">
            <span className="text-zinc-500">
              Timestamp Modified:
            </span>
            <span className="text-white">
              {new Date(node.updatedAt).toLocaleString()}
            </span>
          </div>

          {/* Permissions */}

          <div className="space-y-1">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block font-sans">
              Permissions Flags
            </span>

            <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-2 border border-zinc-800 rounded-lg">

              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={node.permissions.read}
                  readOnly
                />
                <span>Read</span>
              </label>

              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={node.permissions.write}
                  readOnly
                />
                <span>Write</span>
              </label>

              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={node.permissions.execute}
                  readOnly
                />
                <span>Exec</span>
              </label>

            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold rounded-lg transition text-xs cursor-pointer"
          >
            Close Properties
          </button>
        </div>

      </div>
    </div>
  );
};