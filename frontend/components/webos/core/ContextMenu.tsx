"use client";
const CONTEXT_MENU_Z_INDEX = 9999;

import React, { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: string;
  divider?: boolean;
  disabled?: boolean;
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

  // Close menu when user clicks outside
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
        zIndex: CONTEXT_MENU_Z_INDEX,
      }}
      className="absolute w-48 rounded-none border border-[rgba(214,58,58,0.32)] bg-[#050607]/95 py-1 text-[#f3dada] shadow-xl backdrop-blur-xl select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {item.divider && <div className="my-1 border-t border-[rgba(214,58,58,0.18)]" />}
          <button
            onClick={() => {
              if (item.disabled) return;
              item.action();
              onClose();
            }}
            disabled={item.disabled}
            className={`flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs transition-colors duration-75 hover:bg-[rgba(214,58,58,0.12)] active:bg-[rgba(214,58,58,0.18)] ${
              item.disabled ? "opacity-30 pointer-events-none" : ""
            }`}
          >
            {item.icon && <span className="text-sm">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
