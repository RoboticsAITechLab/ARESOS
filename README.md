# ARESOS 🌌

A retro-futuristic student mission control operating system running entirely in your browser.

![ARESOS Boot Screen](frontend/public/screenshots/boot_screen.png)

## Deployed Workspace

👉 **[Launch ARESOS Deployed Dashboard](https://aresos.vercel.app/)**
*(Default access password: `1462007`)*

---

## ⚡ Quick Start

Experience the workstation locally in under a minute:

```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🚀 Key Features

*   **Custom Shell Interpreter**: A functional terminal shell supporting POSIX-like file operations (`ls`, `cd`, `cat`, `mkdir`, `zip`), environment variables, and pipes.
*   **Procedural Audio Synthesizer**: Immersive audio generated on-the-fly via the Web Audio API (zero static audio assets).
*   **Virtual Filesystem (VFS)**: A custom directory tree structures state engine synced directly to your browser's local storage.
*   **Equation Racers Arcade**: An educational canvas math racing game with custom physics and dynamic skin customization shops.
*   **Math whiteboard & solver**: Draw math expressions on the canvas and get step-by-step guidance directly from our custom parser layout.

---

## 🛠️ How It Works

### 1. The Virtual Filesystem (VFS)
Unlike basic mocked terminals, ARESOS uses a tree node map to represent files and folders. The state is fully reactive, managed via a React Context, and serialized to `localStorage` on any modification. This ensures your code files, custom drawings, and scripts survive page refreshes.

### 2. Procedural Audio Engine
To keep bundle sizes small and avoid loading lag, ARESOS generates all chimes, ticks, and sonar sweeps procedurally. Using the browser's native `AudioContext`, we stack oscillator nodes, apply low-pass filters, and schedule exponential frequency ramps to produce rich retro sci-fi soundscapes.

### 3. Shell Parser
The terminal parses commands using a custom lexical scanner that resolves pipes (`|`), logical combinations (`&&`, `||`), and input redirection. Commands like `neofetch`, `htop`, and `matrix` operate on system states computed in real-time.

---

## ⚙️ Local Configuration

ARESOS loads configuration through standard environment variables. To change defaults:

1. Create a `frontend/.env` file.
2. Override variables:
   ```env
   NEXT_PUBLIC_LOGIN_PASSWORD="your_custom_password"
   ```

---

## 💎 Credits & Libraries

*   **Next.js & React**: Core application structure and rendering layer.
*   **Framer Motion**: Fluid window minimization, desktop magnification dock, and boot animations.
*   **Phaser**: High-performance rendering pipeline for the Equation Racers game canvas.
*   **Satellite.js**: Real-time orbital projection logic.
*   **Hack Club Stardance**: Providing the platform to ship this prototype!

---

*Made with passion by Ankit Kumar.*
