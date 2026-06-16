# ARESOS v2.0.0 Release Notes

Welcome to the official release of ARESOS v2.0.0. This release establishes robust POSIX-compatible shell capabilities and dynamic binary ZIP archiving tools for our sci-fi themed WebOS environment.

## Major Features

- **Standard PKZIP Subsystem**: Dynamic ZIP and unzip compatibility. Safely reads standard PKZIP signatures (`50 4B 03 04`) and extracts Store (method 0) and Deflate (method 8) compressed files directly into the virtual filesystem using browser decompressors.
- **Advanced Shell Parser**: Full parenthesis grouping, command chaining (`&&`, `||`, `;`), piping (`|`), standard/error redirection (`>`, `>>`, `<`, `2>`, `2>>`), and history bang expansion (`!!`, `!n`).
- **Unified VFS Storage**: The Virtual Filesystem now supports writing and retrieving raw `Uint8Array` binary payloads seamlessly alongside text, fully persisted in `localStorage`.

## Verification Summary

ARESOS v2.0.0 has been fully verified against our automated integration test suite containing 19 distinct regression test categories (file/directory copying logic, variable expansion isolation, redirection stream order, binary PKZIP parsing, history bang expansions, etc.). All 19 tests compiled and passed successfully.

## Known Limitations

- **Simulated Processes & Runtimes**: Development environments (`gcc`, `clang`, `python`, `node`, `npm`), VCS systems (`git`), package managers (`arespkg`), and most networking tools (`ssh`, `scp`, `nslookup`, `traceroute`) operate in sandboxed simulation modes.
- **Background Jobs**: Persistent job scheduling is simulated and does not support spawning real background processing loops yet.
- **htop Alerts**: The process termination helper in `htop` may display "top terminated" instead of "htop terminated".

## Future Direction

Milestones for upcoming versions focus on upgrading runtime environments from simulated to webassembly sandboxes (e.g. Pyodide C-Python runtime) and integrating real package hosting channels.

---

## 📚 Navigation Directory
- **[Main README](README.md)** | **[System Architecture](ARCHITECTURE.md)** | **[Command Reference](COMMANDS.md)** | **[Changelog](CHANGELOG.md)** | **[Roadmap Goals](ROADMAP.md)**
