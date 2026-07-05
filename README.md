# 🔴 ARESOS // Orbital Intelligence Workspace

**What if a real mission control room had a retro-futuristic makeover and lived in your browser?**

That's ARESOS. A student-built operating system that proves you don't need a GPU cluster to create something genuinely *cool*. Just React, some custom code, and a lot of late-night tweaking.

![ARESOS Dashboard](frontend/public/screenshots/boot_screen.png)

---

## 🚀 Try It Now

**[→ Launch ARESOS](https://aresos.vercel.app/)** | Password: `1462007`

No installation. No drama. Just click and explore.

---

## ✨ Why ARESOS Exists

I wanted to build something that felt like **real mission control** (think SpaceX, NASA control rooms) but with that nostalgic 80s sci-fi aesthetic. Not because it's trendy, but because those old interfaces *actually worked better* — minimal distractions, maximum information density, glowing indicators you can read from across the room.

Plus, I was learning React, Canvas, audio synthesis, and file systems all at once. Why not throw them all into one chaotic, beautiful project?

---

## 🎮 What's Actually Inside

### Terminal Shell
Type commands like you're hacking into the mainframe:
- Real POSIX-like operations (`ls`, `cd`, `cat`, `mkdir`, `zip`)
- Pipes and logical operators (`&&`, `||`)
- Custom commands like `neofetch`, `matrix`, `htop`
- Everything persists in your browser — yes, really

### Procedural Audio Synthesizer
Tired of loading heavy audio files? ARESOS generates all its sounds on-the-fly. Sonar sweeps, sci-fi chimes, retro beeps — all crafted with Web Audio API oscillators and filters. It's like music from the future, if the future was 1984.

### Virtual Filesystem (VFS)
A real file tree structure that actually works. Save files. Create folders. Write code. Everything syncs to localStorage. Your digital workspace that travels with you.

### Equation Racers
An educational arcade game where math equations become racing cars. Custom physics, shop system for skins, and a surprisingly addictive "study while you play" vibe.

### Math Whiteboard
Draw equations on canvas → parser understands them → step-by-step solver guides you. It's like having a tutor made of pixels.

---

## 🖥️ How to Run It

### Local Setup
```bash
cd frontend
npm install
npm run dev
```

Then open **[http://localhost:3000](http://localhost:3000)** and start exploring.

### Change Login Password
Create `frontend/.env`:
```env
NEXT_PUBLIC_LOGIN_PASSWORD="your_password_here"
```

---

## 🎨 Design Philosophy

**Retro doesn't mean outdated.** It means intentional.

Modern UIs are sleek but forgettable. Retro-futuristic is *memorable* — the red glow, the grid background, the way buttons pulse when you hover over them. There's personality here. This isn't another generic web app template.

Every animation, every color choice, every glow effect is deliberate. It's what I imagine a real control room engineer from the 80s would design if they had React.

---

## 🛠️ Technical Deep Dive

### The VFS Engine
Instead of faking a file system, ARESOS implements a proper tree structure with React Context state management. Every file operation updates localStorage instantly. This means:
- Your work actually persists
- No refresh-and-lose panic
- Real file operations like `mv`, `rm`, `cp` work

### Audio Without Assets
Why bundle 100KB of audio files? Web Audio API lets us synthesize sounds with:
- Oscillator nodes stacked for harmonics
- Low-pass filters for richness
- Exponential ramps for natural frequency sweeps

Result: Immersive soundscape in <5KB of code.

### Command Parsing
Custom lexical scanner that understands:
- Pipes: `neofetch | grep "CPU"`
- Logical operators: `cmd1 && cmd2 || cmd3`
- Redirection: `echo "hello" > file.txt`

It's a tiny shell, but it actually works.

---

## 🚀 What's Coming

- **Live rover telemetry** (real ESP32 integration)
- **Multi-user sessions** (collaborate in mission control)
- **Custom shell scripting** (automation playground)
- **Theme editor** (design your own control room)

---

## 📚 Built With

- **React & Next.js** — The core engine
- **Framer Motion** — Buttery smooth animations
- **Phaser 3** — Game physics for Equation Racers
- **Web Audio API** — All our synthesized sounds
- **Satellite.js** — Orbital mechanics (because why not?)
- **Hack Club Stardance** — The platform to ship wild ideas

---

## 🎯 This is Intentionally NOT a Real OS

ARESOS won't compile kernels or manage hardware. It's *optimized for learning* what mission control interfaces look like, how to structure complex state in React, and how to make retro-futuristic UI that doesn't feel like a Figma template.

If you're building something serious and need an actual OS, check out Linux. If you want to explore what happens when you merge sci-fi aesthetics with modern web tech, you're in the right place.

---

## 💬 Why I Love This Project

1. **It's genuinely unique** — Not another CRUD app, not another portfolio piece
2. **It taught me a ton** — State management, canvas rendering, audio synthesis, file systems
3. **It looks insanely good** — The red glow, the scanlines, the way panels lift on hover
4. **It actually works** — Terminal commands aren't mocked, files really persist, audio really synthesizes

---

## 📸 Screenshots

[Your feature images here]

---

## 🤝 Contributing

Found a bug? Want to add a feature? This is a learning project, so issues and PRs are absolutely welcome.

---

## 📜 License

MIT — Use it, remix it, build on it.

---

**Made by Ankit Kumar at 3 AM while thinking about what 80s space missions would look like with React.**

🚀 [Deploy your own fork](https://vercel.com/new/clone?repository-url=https://github.com/RoboticsAITechLab/ARESOS) • [GitHub](https://github.com/RoboticsAITechLab/ARESOS) • [Visit Dashboard](https://aresos.vercel.app/)