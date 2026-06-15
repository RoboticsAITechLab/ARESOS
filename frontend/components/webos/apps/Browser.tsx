"use client";

import React, { useState, useEffect } from "react";
import { useOS } from "@/hooks/webos/useOS";

interface Tab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
}

interface Bookmark {
  label: string;
  url: string;
}

interface BrowserProps {
  pid: string;
}

const DEFAULT_URL = "https://www.wikipedia.org";
const SEARCH_ENGINE_URL = "https://www.google.com/search?igu=1";

export default function Browser({ pid }: BrowserProps) {
  const { addNotification } = useOS();

  // Tab Manager States
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: "tab-initial",
      title: "Wikipedia",
      url: DEFAULT_URL,
      history: [DEFAULT_URL],
      historyIndex: 0,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-initial");

  // Address Bar Inputs (keeps input independent from active tab url to allow typing)
  const [addressInput, setAddressInput] = useState(DEFAULT_URL);

  // Bookmarks List State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarksLoaded, setIsBookmarksLoaded] = useState(false);

  // Refresh trigger helper
  const [refreshKey, setRefreshKey] = useState(0);

  // Curated list of sites that work natively in iframes
  const iframeFriendlySites = [
    { label: "Wikipedia", url: "https://www.wikipedia.org" },
    { label: "Google", url: "https://www.google.com/search?igu=1" },
    { label: "DuckDuckGo HTML", url: "https://html.duckduckgo.com/html" },
    { label: "Archive.org", url: "https://archive.org" },
  ];

  // Helper to extract clean domain name for tab titles
  const getDomainName = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString);
      let hostname = urlObj.hostname;
      if (hostname.startsWith("www.")) {
        hostname = hostname.substring(4);
      }
      if (urlString.includes("google.com/search")) {
        const queryParam = urlObj.searchParams.get("q");
        return queryParam ? `Search: ${queryParam}` : "Google Search";
      }
      return hostname;
    } catch {
      let hostname = urlString;
      if (hostname.includes("://")) {
        hostname = hostname.split("://")[1];
      }
      hostname = hostname.split("/")[0];
      return hostname || "New Tab";
    }
  };

  // Synchronize bookmark states from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aresos_browser_bookmarks");
      if (saved) {
        try {
          setBookmarks(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse browser bookmarks", e);
          setBookmarks(iframeFriendlySites);
        }
      } else {
        setBookmarks(iframeFriendlySites);
      }
      setIsBookmarksLoaded(true);
    }
  }, []);

  // Save bookmarks on changes
  useEffect(() => {
    if (isBookmarksLoaded && typeof window !== "undefined") {
      localStorage.setItem("aresos_browser_bookmarks", JSON.stringify(bookmarks));
    }
  }, [bookmarks, isBookmarksLoaded]);

  // Synchronize address bar input with active tab URL shifts
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  useEffect(() => {
    if (activeTab) {
      setAddressInput(activeTab.url);
    }
  }, [activeTabId, activeTab]);

  // Navigation: Go to specified target URL
  const navigateTo = (target: string) => {
    let finalUrl = target.trim();
    if (!finalUrl) return;

    // Detect if input is search query instead of direct URL
    const isSearchQuery =
      !finalUrl.includes(".") || 
      finalUrl.includes(" ") || 
      (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://") && !/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(finalUrl));

    if (isSearchQuery) {
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&igu=1`;
    } else if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          const updatedHistory = t.history.slice(0, t.historyIndex + 1);
          updatedHistory.push(finalUrl);
          return {
            ...t,
            url: finalUrl,
            title: getDomainName(finalUrl),
            history: updatedHistory,
            historyIndex: updatedHistory.length - 1,
          };
        }
        return t;
      })
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(addressInput);
  };

  // Tab operations
  const openNewTab = (urlToOpen = SEARCH_ENGINE_URL) => {
    const newId = `tab-${Date.now()}`;
    const newTab: Tab = {
      id: newId,
      title: getDomainName(urlToOpen),
      url: urlToOpen,
      history: [urlToOpen],
      historyIndex: 0,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Prevent closing the last tab

    const indexToClose = tabs.findIndex((t) => t.id === tabId);
    const updatedTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(updatedTabs);

    if (activeTabId === tabId) {
      const nextActiveIndex = indexToClose > 0 ? indexToClose - 1 : 0;
      setActiveTabId(updatedTabs[nextActiveIndex].id);
    }
  };

  // Navigation controls
  const handleGoBack = () => {
    if (activeTab.historyIndex > 0) {
      const prevIndex = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[prevIndex];
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url: prevUrl, title: getDomainName(prevUrl), historyIndex: prevIndex }
            : t
        )
      );
    }
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextIndex = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[nextIndex];
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, url: nextUrl, title: getDomainName(nextUrl), historyIndex: nextIndex }
            : t
        )
      );
    }
  };

  const handleGoHome = () => {
    navigateTo(SEARCH_ENGINE_URL);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Bookmark Toggle action
  const isBookmarked = bookmarks.some((bm) => bm.url === activeTab.url);

  const toggleBookmark = () => {
    if (isBookmarked) {
      setBookmarks((prev) => prev.filter((bm) => bm.url !== activeTab.url));
      addNotification("Browser", "Bookmark removed.", "info");
    } else {
      const label = prompt("Enter bookmark label:", activeTab.title);
      if (label) {
        setBookmarks((prev) => [...prev, { label: label.trim(), url: activeTab.url }]);
        addNotification("Browser", `Added bookmark: "${label}"`, "success");
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 select-none overflow-hidden font-sans">
      
      {/* 1. Tab Bar strip */}
      <div className="h-9 bg-zinc-950 flex items-center px-2.5 gap-1.5 flex-shrink-0 select-none overflow-x-auto scrollbar-none border-b border-zinc-900">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`h-7 px-3 flex items-center gap-2 rounded-t-lg text-xxs font-bold cursor-pointer transition max-w-[120px] select-none ${
                isActive
                  ? "bg-zinc-900 text-white border-t-2 border-indigo-500"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40"
              }`}
            >
              <span className="truncate flex-1">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="w-3.5 h-3.5 rounded-full hover:bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 hover:text-white"
                  title="Close tab"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        
        {/* Open new tab */}
        <button
          onClick={() => openNewTab()}
          className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white cursor-pointer transition flex-shrink-0"
          title="New Tab"
        >
          +
        </button>
      </div>

      {/* 2. Navigation address bar toolbar */}
      <div className="h-11 border-b border-zinc-850 px-4 flex items-center gap-3 bg-zinc-900 flex-shrink-0">
        {/* Nav Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoBack}
            disabled={activeTab.historyIndex <= 0}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-xs"
            title="Back"
          >
            ◀
          </button>
          <button
            onClick={handleGoForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer text-xs"
            title="Forward"
          >
            ▶
          </button>
          <button
            onClick={handleRefresh}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 transition cursor-pointer text-xs"
            title="Refresh"
          >
            🔄
          </button>
          <button
            onClick={handleGoHome}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-zinc-800 transition cursor-pointer text-xs"
            title="Home"
          >
            🏠
          </button>
        </div>

        {/* Address Input Field */}
        <form onSubmit={handleFormSubmit} className="flex-1 relative flex items-center">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-200 outline-none transition font-medium"
            placeholder="Search Google or type web URL..."
          />
          {/* Bookmark toggle star indicator */}
          <button
            type="button"
            onClick={toggleBookmark}
            className={`absolute right-2.5 hover:scale-125 transition cursor-pointer text-xs ${
              isBookmarked ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            ★
          </button>
        </form>

        <button
          onClick={handleFormSubmit}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs font-bold text-white rounded-lg transition cursor-pointer shadow-md shadow-indigo-600/10"
        >
          Go
        </button>
      </div>

      {/* 3. Bookmarks bar */}
      <div className="h-7.5 border-b border-zinc-850 px-4 flex items-center gap-3 bg-zinc-950/20 text-[10px] text-zinc-500 flex-shrink-0 overflow-x-auto scrollbar-none">
        <span className="font-extrabold uppercase tracking-wider text-zinc-650 flex-shrink-0">Bookmarks:</span>
        {bookmarks.map((bm) => (
          <button
            key={bm.url}
            onClick={() => {
              setAddressInput(bm.url);
              navigateTo(bm.url);
            }}
            className="hover:text-white transition cursor-pointer bg-zinc-900/60 border border-zinc-850/50 px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0 font-medium"
          >
            <span>🌐</span>
            <span>{bm.label}</span>
          </button>
        ))}
        {bookmarks.length === 0 && (
          <span className="italic text-zinc-600 font-medium text-[9px]">Click the ★ icon to add shortcuts.</span>
        )}
      </div>

      {/* 4. Main iframe window container */}
      <div className="flex-1 bg-white relative">
        <iframe
          key={`${activeTab.id}-${refreshKey}`}
          src={activeTab.url}
          title={`browser-tab-${activeTab.id}`}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        {/* Sandboxing Warning banner */}
        <div className="absolute bottom-2.5 right-2.5 max-w-[280px] p-2 bg-zinc-950/90 backdrop-blur-md rounded-lg border border-zinc-800/60 shadow text-[9px] text-zinc-400 select-none pointer-events-none font-medium leading-normal">
          ⚠️ Search Google directly or enter links. Note: Some secure portals (like GitHub, YouTube) block frames due to security policies.
        </div>
      </div>
    </div>
  );
}
