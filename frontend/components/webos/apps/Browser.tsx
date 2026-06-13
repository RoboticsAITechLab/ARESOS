"use client";

import React, { useState } from "react";

interface BrowserProps {
  pid: string;
}

export default function Browser({ pid }: BrowserProps) {
  const [url, setUrl] = useState("https://www.wikipedia.org");
  const [iframeUrl, setIframeUrl] = useState("https://www.wikipedia.org");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = url.trim();
    if (!target) return;

    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }

    setUrl(target);
    setIframeUrl(target);
  };

  const bookmarks = [
    { label: "Wikipedia", url: "https://www.wikipedia.org" },
    { label: "Google", url: "https://www.google.com/search?igu=1" }, // Google search frame parameter
    { label: "Bing", url: "https://www.bing.com" },
    { label: "Yahoo", url: "https://search.yahoo.com" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900 select-none">
      {/* Navigation address bar toolbar */}
      <div className="h-12 border-b border-zinc-800/60 px-4 flex items-center gap-3 bg-zinc-950/20 flex-shrink-0">
        {/* Navigation Mock Buttons */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <button className="p-1 hover:bg-zinc-800 rounded opacity-50 cursor-not-allowed" title="Back">
            ⬅️
          </button>
          <button className="p-1 hover:bg-zinc-800 rounded opacity-50 cursor-not-allowed" title="Forward">
            ➡️
          </button>
          <button
            onClick={() => setIframeUrl("")}
            className="p-1 hover:bg-zinc-800 rounded cursor-pointer"
            title="Refresh Frame"
          >
            🔄
          </button>
        </div>

        {/* Address input */}
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-800/50 rounded-lg px-3.5 py-1 text-xs text-zinc-200 outline-none transition"
          />
        </form>

        {/* Go button */}
        <button
          onClick={handleSubmit}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-xs text-white rounded-lg transition cursor-pointer font-medium"
        >
          Go
        </button>
      </div>

      {/* Bookmarks Bar */}
      <div className="h-8 border-b border-zinc-850 px-4 flex items-center gap-4 bg-zinc-950/45 text-[10px] text-zinc-400 flex-shrink-0">
        <span className="font-bold text-zinc-500 uppercase tracking-wide">Bookmarks:</span>
        {bookmarks.map((bm) => (
          <button
            key={bm.label}
            onClick={() => {
              setUrl(bm.url);
              setIframeUrl(bm.url);
            }}
            className="hover:text-indigo-400 transition cursor-pointer"
          >
            🌐 {bm.label}
          </button>
        ))}
      </div>

      {/* Web Frame Display Panel */}
      <div className="flex-1 bg-white relative">
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            title={`browser-${pid}`}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 text-zinc-500 flex items-center justify-center font-mono text-xs">
            Reloading page frame...
          </div>
        )}

        {/* Sandboxing Warning Overlay Banner */}
        <div className="absolute bottom-2.5 right-2.5 max-w-[240px] p-2 bg-zinc-950/85 backdrop-blur-md rounded border border-zinc-800/60 shadow text-[9px] text-zinc-400 select-none pointer-events-none">
          ⚠️ Note: Some sites deny rendering inside iframe frames due to security policies (X-Frame-Options).
        </div>
      </div>
    </div>
  );
}
