# ARESOS 🌌 — Advanced Sci-Fi Web Operating System

[![Next.js](https://img.shields.95/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.95/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.95/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.95/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

ARESOS (ARES Operating System) is a premium, highly interactive, and visually stunning web-based operating system designed for student mission control. It features immersive animations, browser-synthesized soundscapes, an active virtual filesystem, and a full suite of productive desktop utility applications.

> [!TIP]
> Visit the project locally to experience the custom Web Audio API chimes and desktop window transitions in real-time.

---

## 🔮 Key Features

### 1. Immersive Sci-Fi Entryway
*   **Mainframe Initialization Boot Screen:** Features a triple-nested rotating SVG reactor core loader, diagnostic sensor grids mapping system RAM allocation, live clock trackers, and scrolling logging sequences resolving to a sweeping startup chime.
*   **Biometric Retinal Scanner Login:** Interactive radar eye lock-card with laser scanning lines, auto-scrolling decryption matrices, and validation logs that play high-frequency pulse sweeps and grant system access with a pleasant chime chord.

### 2. Desktop Environment & Navigation
*   **macOS-style Centered Dock:** Centered floating glassmorphic dock supporting magnification on hover, active process status dots, notification counters, and springy **bouncing icon animations** on launch.
*   **Slide & Shrink Window Minimize:** Double-clicking title bars or clicking minimize scales windows down to `0.01` and slides them smoothly straight into the Dock area using custom transform transitions.
*   **Z-Index Window Layering:** Focus system that automatically surfaces active window layers to the front while maintaining standard coordinates, drag limits, and borders.
*   **High Performance Drag & Resize:** Disables position/dimension transition properties during dragging or resizing to maintain a fluid 60 FPS with zero layout stutter.
*   **Global Status Menu Bar:** macOS-style top lockbar tracking local connection indicators, clock timers, volume nodes, and system menu drops.

### 3. Integrated Web Audio API Synthesizer
*   No external asset `.mp3` files needed. All sounds are generated procedurally on-the-fly using browser oscillators, lowpass filters, and exponential ramps:
    *   **Startup Sweep:** Heavy sawtooth lowpass frequency sweep overlaid with an E-major chime triad.
    *   **Scanner Ping:** Fast triangle frequency sweeps simulating biometric eye sonar.
    *   **Granted Chord:** ASCending sine arpeggio resolving to a C-major chord.
    *   **System Click:** Subtle click beep feedback for buttons and terminal submissions.
*   All audio is wired to the volume controls inside the Notification Center.

### 4. Built-in Applications Catalog

| Application | Description | Features |
| :--- | :--- | :--- |
| **💻 Terminal** | Inline Command CLI Shell | Blinking block cursor `█`, hidden input focus bindings, command history memory logs (ArrowUp/Down), virtual shell nodes command execution (`ls`, `cd`, `cat`, `mkdir`, `rm`, `neofetch`, `theme`). |
| **📒 Text Editor** | Windows Notepad replica | Document explorer sidebar mapping `/home/user/Documents` (Physics, Maths, Ideas), menus (File, Edit, Format for wrapping & font scaling), cursor coordinates line/column metrics status bar. |
| **📁 File Explorer** | Graphical directory tree | VFS folder/file creation and deletion, list navigators. |
| **⚙️ Settings** | Controls center configuration | Custom tab panels (Appearance themes, Wallpaper gradients, profile editor, storage disk space summary, about stats card). |
| **🔔 Notifications** | Full-height control center drawer | Pomodoro focus sessions timers (with desktop notification logging), daily target checklist, brightness sliders, and checkmarked OS system alerts list. |
| **⏰ System Clock** | Live timezone clocks & stopwatch | Multi-world time zone trackers, laps logger. |
| **📅 Calendar** | Monthly scheduler | Highlights and lists scheduling slots (including Ankit's birthday!). |
| **✅ Todo App** | Checklist task manager | Add, toggle, and prune custom chores lists. |
| **🧮 Calculator** | Mathematical scratchpad | Responsive arithmetic layout pad. |
| **🌐 Web Browser** | iframe website bookmark navigator | Load address URL requests with google search query fail-safes. |

---

## 🛠️ Tech Stack & Architecture

*   **Framework:** Next.js (App Router, Turbopack bundle compiler)
*   **Runtime:** React 19 & TypeScript
*   **Styling:** Vanilla Tailwind CSS + Custom CSS Keyframe modules
*   **Audio Synthesis:** Web Audio API Oscillators, BiquadFilters & GainNodes
*   **Virtual Filesystem (VFS):** Tree-structured node directory map persisted directly to `localStorage`

---

## 🚀 Getting Started

To launch ARESOS on your local system, follow these steps:

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm or yarn package managers

### Installation & Run
1. Navigate into the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the local development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

---

## 📂 Project Directory Structure

```text
ARESOS/
├── frontend/
│   ├── app/                # Next.js main routes page layout
│   ├── components/         # Desktop workspace widgets & apps
│   │   └── webos/
│   │       ├── apps/       # Built-in Apps (Terminal, Notepad, Settings, etc.)
│   │       └── core/       # OS Layouts (Window, Taskbar, Boot, Login)
│   ├── config/             # Dynamic application registries
│   ├── context/            # React Contexts (OS settings and FileSystem VFS states)
│   ├── hooks/              # Custom context wrapper hooks (useOS, useFileSystem)
│   ├── public/             # Static public resources
│   ├── types/              # TypeScript typings & schemas
│   └── utils/              # Helper utilities (Web Audio API synthetics)
└── README.md               # Main project documentation
```

---

## 🎨 Theme Gradients Settings
ARESOS includes built-in desktop backdrop themes that can be selected in the Settings dashboard:
*   **Dark Space:** Slate black with dark indigo accents.
*   **Light Mode:** Premium clean white slate layout.
*   **Midnight Aurora:** Emerald sweeps and dark violet nodes.
*   **Neon Neon:** High contrast violet gradients.

---
Developed by **Ankit Kumar** // *Mission Control for Students*
