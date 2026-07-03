# ARESOS v2.1.0 Release Notes

Welcome to the official release of ARESOS v2.1.0. This release integrates an advanced AI Math Notes Solver whiteboard subsystem and custom result inspection panels directly into the sci-fi themed WebOS environment.

## Major Features

- **Gemini-Powered Math Notes Solver**: Write or type mathematical expressions on the whiteboard canvas and instantly solve them using direct Gemini AI integration (`gemini-2.5-flash` or newer).
- **Solution Details Side Panel**: View recognized equations, step-by-step mathematical reasoning, saved variables, and graphable functions in a dedicated sliding sidebar panel.
- **Speech Synthesis Narration**: High-fidelity procedural narration of equation solving steps via Web Speech APIs.
- **Standard PKZIP Subsystem**: Dynamic ZIP and unzip compatibility. Safely reads standard PKZIP signatures (`50 4B 03 04`) and extracts Store (method 0) and Deflate (method 8) compressed files directly into the virtual filesystem.
- **Advanced Shell Parser**: Full parenthesis grouping, command chaining (`&&`, `||`, `;`), piping (`|`), standard/error redirection (`>`, `>>`, `<`, `2>`, `2>>`), and history bang expansion (`!!`, `!n`).
- **Unified VFS Storage**: Virtual Filesystem supports writing and retrieving raw binary payloads persisted in `localStorage`.

## Verification Summary

ARESOS v2.1.0 has been fully verified. All AI endpoints, canvas drawing modes, sliding panel states, and standard OS tools compile and function correctly under continuous dev server execution.

## Known Limitations

- **Simulated Processes & Runtimes**: Development environments (`gcc`, `clang`, `python`), VCS systems (`git`), and networking tools (`ssh`, `scp`) operate in sandboxed simulation modes.
- **Background Jobs**: Persistent job scheduling is simulated and does not support spawning real background processing loops yet.

## Future Direction

Milestones for upcoming versions focus on upgrading runtime environments from simulated to webassembly sandboxes (e.g. Pyodide C-Python runtime) and integrating real package hosting channels.

---

## 📚 Navigation Directory
- **[Main README](README.md)** | **[System Architecture](ARCHITECTURE.md)** | **[Command Reference](COMMANDS.md)** | **[Changelog](CHANGELOG.md)** | **[Roadmap Goals](ROADMAP.md)**
