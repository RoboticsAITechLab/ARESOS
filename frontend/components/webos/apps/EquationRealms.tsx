"use client";

import React, { useEffect, useRef, useState } from "react";
import { EventBus } from "@/games/equation-realms/systems/EventBus";
import { Item } from "@/games/equation-realms/systems/Item";

interface EquationRealmsProps {
  pid: string;
}

export default function EquationRealms({ pid }: EquationRealmsProps) {
  const gameRef = useRef<any>(null);
  const containerId = `eq-realms-container-${pid}`;

  // UI Panels states
  const [showInventory, setShowInventory] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

  // RPG state variables synced from Phaser
  const [inventory, setInventory] = useState<(Item | null)[]>(Array(24).fill(null));
  const [equipped, setEquipped] = useState<Record<string, Item | null>>({
    weapon: null, helmet: null, chest: null, legs: null, boots: null, ring: null, amulet: null
  });
  const [coins, setCoins] = useState(0);
  const [playerStats, setPlayerStats] = useState<any>({ attack: 16, defense: 5, health: 100, speed: 180, criticalChance: 5 });

  // Tooltip & Selected Item state
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    let active = true;

    const startPhaser = async () => {
      try {
        const { initGame } = await import("@/games/equation-realms");
        if (active) {
          gameRef.current = initGame(containerId);

          // Get initial data from scene if already running, or wait for events
          setupSyncListeners();
        }
      } catch (err) {
        console.error("Equation Realms: Failed to initialize Phaser engine", err);
      }
    };

    const setupSyncListeners = () => {
      // Sync toggle panels
      EventBus.on("toggle_inventory", () => {
        setShowInventory((prev) => !prev);
      });

      EventBus.on("toggle_equipment", () => {
        setShowEquipment((prev) => !prev);
      });

      // Sync data changes
      EventBus.on("inventory_changed", (items: (Item | null)[]) => {
        setInventory([...items]);
        // Update selection reference if inventory items changed
        if (selectedSlotIndex !== null) {
          setSelectedItem(items[selectedSlotIndex]);
        }
      });

      EventBus.on("equipment_changed", (equippedMap: Record<string, Item | null>) => {
        setEquipped({ ...equippedMap });
      });

      EventBus.on("coins_changed", (coinsVal: number) => {
        setCoins(coinsVal);
      });

      EventBus.on("player_stats_recalculated", (stats: any) => {
        setPlayerStats({ ...stats });
      });

      // Request initial state trigger (will respond if scene is ready)
      // MainWorldScene auto-saves/recalculates stats on boot which fires these events
    };

    startPhaser();

    return () => {
      active = false;
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch (e) {
          console.error("Equation Realms: Error destroying Phaser instance", e);
        }
        gameRef.current = null;
      }
      EventBus.clear();
    };
  }, [containerId]);

  // Click handler: Left click selects/inspects item
  const handleItemLeftClick = (item: Item | null, index: number) => {
    setSelectedSlotIndex(index);
    setSelectedItem(item);
  };

  // Right click handler (Context Menu): Equip/Use item
  const handleItemRightClick = (e: React.MouseEvent, item: Item | null, index: number) => {
    e.preventDefault(); // Prevent standard browser menu
    if (!item) return;

    if (item.type === "weapon" || item.type === "armor") {
      EventBus.emit("react_equip_item", item, index);
    }
  };

  // Unequip item slot handler
  const handleUnequipItem = (e: React.MouseEvent, slotName: string) => {
    e.preventDefault();
    if (!equipped[slotName]) return;
    EventBus.emit("react_unequip_item", slotName);
  };

  // Trigger inventory sorting in Phaser
  const triggerSort = () => {
    EventBus.emit("react_sort_inventory");
  };

  // Rarity Colors config
  const rarityColors: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    common: { border: "border-zinc-700", bg: "bg-zinc-800/40", text: "text-zinc-400", glow: "shadow-none" },
    uncommon: { border: "border-emerald-600/80", bg: "bg-emerald-950/20", text: "text-emerald-400", glow: "shadow-emerald-500/10 shadow-sm" },
    rare: { border: "border-blue-600/80", bg: "bg-blue-950/20", text: "text-blue-400", glow: "shadow-blue-500/10 shadow-sm" },
    epic: { border: "border-purple-600/80", bg: "bg-purple-950/20", text: "text-purple-400", glow: "shadow-purple-500/15 shadow-sm" },
    legendary: { border: "border-amber-500/90", bg: "bg-amber-950/35", text: "text-amber-400", glow: "shadow-amber-500/25 shadow-md animate-pulse" },
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 select-none overflow-hidden relative">
      {/* Top Header Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-xxs font-mono flex-shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-sm shadow-indigo-500/50" />
          <span className="font-extrabold text-zinc-200 tracking-wider">EQUATION REALMS RPG v1.0</span>
          <span className="text-zinc-600">|</span>
          <span className="text-amber-400 font-bold">💰 {coins} Coins</span>
        </div>
        <div className="text-zinc-500 flex gap-4">
          <span>Toggle: <kbd className="bg-zinc-800 px-1 rounded text-zinc-300">I</kbd> Inventory | <kbd className="bg-zinc-800 px-1 rounded text-zinc-300">E</kbd> Equipment</span>
          <span className="hidden sm:inline">Actions: <span className="text-indigo-400 font-sans font-bold">L-Click</span> Info / <span className="text-indigo-400 font-sans font-bold">R-Click</span> Equip</span>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 w-full h-full relative" style={{ minHeight: 0 }}>
        {/* Phaser Canvas Container */}
        <div id={containerId} className="w-full h-full absolute inset-0 bg-[#0f0f13] z-0" />

        {/* ================= INVENTORY SCREEN OVERLAY ================= */}
        {showInventory && (
          <div className="absolute right-4 top-4 bottom-4 w-76 bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 rounded-xl shadow-2xl p-4 flex flex-col z-10 transition-all select-none animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-2 mb-3">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">Bag Inventory</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={triggerSort}
                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[9px] font-bold text-zinc-400 hover:text-white rounded-md cursor-pointer transition"
                  title="Sort inventory by rarity and type"
                >
                  SORT
                </button>
                <button
                  onClick={() => setShowInventory(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs font-bold cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Grid display */}
            <div className="flex-1 grid grid-cols-4 gap-2 content-start overflow-y-auto mb-3 scrollbar-thin">
              {inventory.map((item, idx) => {
                const styles = item ? rarityColors[item.rarity] : rarityColors.common;
                const isSelected = selectedSlotIndex === idx;

                return (
                  <div
                    key={`slot-${idx}`}
                    onClick={() => handleItemLeftClick(item, idx)}
                    onContextMenu={(e) => handleItemRightClick(e, item, idx)}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center relative cursor-pointer transition ${
                      styles.border
                    } ${styles.bg} ${styles.glow} ${
                      isSelected ? "ring-2 ring-indigo-500 border-indigo-500 scale-105" : "hover:border-zinc-600 hover:bg-zinc-800/20"
                    }`}
                  >
                    {item ? (
                      <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center">
                        {/* Procedural text icon */}
                        <span className="text-[14px]">
                          {item.type === "weapon" ? "⚔️" : item.type === "armor" ? "🛡️" : item.type === "consumable" ? "🧪" : "📦"}
                        </span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="absolute bottom-0.5 right-1 text-[8px] font-bold font-mono bg-zinc-950/80 px-1 rounded text-zinc-300">
                            x{item.quantity}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-zinc-700 font-mono">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Item Tooltip Panel */}
            <div className="h-32 bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between text-left font-mono">
              {selectedItem ? (
                <>
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className={`text-[11px] font-bold truncate uppercase ${rarityColors[selectedItem.rarity].text}`}>
                        {selectedItem.name}
                      </span>
                      <span className="text-[8px] font-bold text-zinc-500 tracking-wider">
                        {selectedItem.type.toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Item Stats attributes list */}
                    {selectedItem.stats && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5 text-[9px] text-zinc-400">
                        {Object.entries(selectedItem.stats).map(([stat, val]) => (
                          <div key={stat} className="flex justify-between border-b border-zinc-850/40">
                            <span className="capitalize">{stat.replace("Chance", "")}:</span>
                            <span className="text-white font-bold">+{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-zinc-500 border-t border-zinc-850/60 pt-1 mt-auto">
                    <span>Value: <span className="text-amber-400 font-bold">{selectedItem.value}g</span></span>
                    <span className="text-[8px] text-indigo-400 italic">R-Click to equip</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-zinc-600 text-center font-mono">
                  Select an item to inspect stats.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= EQUIPMENT OVERLAY PANEL ================= */}
        {showEquipment && (
          <div className="absolute left-4 top-4 bottom-4 w-76 bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 rounded-xl shadow-2xl p-4 flex flex-col z-10 transition-all select-none animate-in slide-in-from-left duration-250">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-2 mb-3">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">Equipped Gear</span>
              <button
                onClick={() => setShowEquipment(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-bold cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            {/* Layout slots grid */}
            <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto mb-3 scrollbar-thin pr-1">
              {[
                { slot: "helmet", label: "Helmet slot", icon: "🪖" },
                { slot: "amulet", label: "Amulet slot", icon: "📿" },
                { slot: "weapon", label: "Weapon slot", icon: "⚔️" },
                { slot: "chest", label: "Chest armor", icon: "👕" },
                { slot: "legs", label: "Leg armor", icon: "👖" },
                { slot: "boots", label: "Boots slot", icon: "🥾" },
                { slot: "ring", label: "Ring slot", icon: "💍" },
              ].map((itemSlot) => {
                const item = equipped[itemSlot.slot];
                const styles = item ? rarityColors[item.rarity] : rarityColors.common;

                return (
                  <div
                    key={itemSlot.slot}
                    onContextMenu={(e) => handleUnequipItem(e, itemSlot.slot)}
                    className={`h-11 rounded-lg border flex items-center justify-between p-2 cursor-pointer transition ${
                      styles.border
                    } ${styles.bg} ${
                      item ? "hover:bg-zinc-800/20" : "hover:border-zinc-700 bg-zinc-950/40 border-dashed"
                    }`}
                    title={item ? `${item.name}\nRight-click to unequip` : `Empty ${itemSlot.slot} slot`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm flex-shrink-0">{itemSlot.icon}</span>
                      <div className="min-w-0 flex flex-col">
                        <span className={`text-[10px] truncate font-mono ${item ? styles.text + " font-bold" : "text-zinc-650 font-normal"}`}>
                          {item ? item.name : `Empty ${itemSlot.label}`}
                        </span>
                        {item && item.stats && (
                          <span className="text-[8px] text-zinc-500 font-mono truncate">
                            {Object.entries(item.stats)
                              .map(([k, v]) => `+${v} ${k.substr(0, 3)}`)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {item && (
                      <button
                        onClick={(e) => handleUnequipItem(e, itemSlot.slot)}
                        className="text-[8px] text-zinc-500 hover:text-rose-400 font-bold bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded cursor-pointer transition"
                      >
                        UNEQUIP
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recalculated Stats panel summary */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-3 text-left font-mono text-xxs flex-shrink-0">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block border-b border-zinc-850 pb-1 mb-1.5">
                Calculated Final Stats
              </span>
              <div className="space-y-1 text-zinc-300">
                <div className="flex justify-between">
                  <span>Attack:</span> <span className="text-white font-bold">{playerStats.attack}</span>
                </div>
                <div className="flex justify-between">
                  <span>Defense:</span> <span className="text-white font-bold">{playerStats.defense}</span>
                </div>
                <div className="flex justify-between">
                  <span>Health Pool:</span> <span className="text-white font-bold">{playerStats.health}</span>
                </div>
                <div className="flex justify-between">
                  <span>Move Speed:</span> <span className="text-white font-bold">{playerStats.speed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Crit Chance:</span> <span className="text-white font-bold">{playerStats.criticalChance}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
