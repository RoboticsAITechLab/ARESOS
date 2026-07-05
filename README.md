# ARESOS 🌌

ARESOS is a browser-based mission-control workspace inspired by spacecraft consoles, operating systems, and retro-futuristic interfaces. It combines a terminal, virtual filesystem, procedural audio engine, and custom applications inside a desktop environment built with Next.js.

👉 **[Launch ARESOS Live Dashboard](https://aresos.vercel.app/)**

---

## Why I Built This

I wanted to explore how far a browser could be pushed toward feeling like a real operating system. ARESOS started as a terminal experiment and gradually evolved into a mission-control workspace with a virtual filesystem, procedural audio, custom applications, and interactive learning tools.

---

## Features

- **Terminal with custom commands**: Supports directory traversal, environment variables, piping, and interactive shell utilities.
- **Persistent virtual filesystem**: Structured tree state node architecture synced directly to browser localStorage.
- **Procedural audio engine**: Generates chimes, clicks, static, and alarms on-the-fly via the Web Audio API without static assets.
- **Multi-window desktop environment**: Dynamic draggable, resizable window frames with automatic tiling grid positioning constraints.
- **Equation Racers arcade game**: 2D canvas space racer game built with custom physics and mathematical expression solving gameplay.
- **Whiteboard and math workspace**: Canvas area for drawing math equations, converting drawings to text, and resolving steps.
- **Theme system**: Custom aesthetics featuring crimson command HUD styles, scanlines, and dot grid backgrounds.

---

## How It Works

### Virtual Filesystem
ARESOS implements a custom reactive directory tree node map. Every directory operation (`mkdir`, `cd`, `write`, `rm`) updates the global React state and serializes automatically to local storage, securing files across page refreshes.

### Procedural Audio Engine
Oscillator nodes are initialized, filtered, and scheduled dynamically via the browser's Web Audio API. Exponential frequency and gain ramps simulate analog sweeps, static, and button clicks without loading heavy static media assets.

### Shell Parser
A custom lexical scanner parses user input to execute commands. The parser resolves sequential piping (`|`), logical combinations (`&&`, `||`), and redirection operations on the virtual filesystem directory tree nodes.

---

## Screenshots

### Desktop Workspace
![Desktop Workspace](frontend/public/screenshots/desktop_workspace.png)

### Terminal
![Terminal](frontend/public/screenshots/terminal.png)

### Mission Console
![Mission Console](frontend/public/screenshots/mission_console.png)

### Equation Racers
![Equation Racers](frontend/public/screenshots/equation_racers.png)

---

## Run Locally

Initialize and run the dev server locally:

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

*Made with passion by Ankit Kumar.*
