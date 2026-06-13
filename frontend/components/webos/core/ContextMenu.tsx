"use client";

import React, { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: string;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  items,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        top: `${y}px`,
        left: `${x}px`,
        zIndex: 9999,
      }}
      className="absolute w-48 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-lg shadow-xl py-1 text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.divider && <div className="border-t border-zinc-800/80 my-1" />}
          <button
            onClick={() => {
              item.action();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-zinc-800/80 active:bg-zinc-700 text-xs flex items-center gap-2 cursor-pointer transition-colors duration-75"
          >
            {item.icon && <span className="text-sm">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
