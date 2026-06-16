# ARESOS Development Roadmap

This document outlines the planned future milestones for the ARESOS WebOS project. These items represent future enhancements and are not yet implemented.

## [v2.1.0] - Planned Upgrades

- **Secure Python Execution Sandbox**: Replace the simulated REPL with a browser-based Python compilation runtime (e.g. Pyodide / WebAssembly).
- **Secure Node.js Execution Sandbox**: Support sandboxed JS script evaluation within the terminal context.
- **Improved Package Management**: Connect `arespkg` to a real JSON package registry to allow loading external widgets dynamically.
- **Persistent Background Jobs**: Integrate full background process management instead of the current task control simulation.

## [v3.0.0] - Future Architecture

- **Multi-user Environments**: True separation of user workspaces, config caches, and local configurations.
- **Permissions & Ownership Model**: Introduce a standard POSIX-like owner/group/other file access permissions system.
- **Full Shell Scripting**: Support executing `.sh` script files containing chains, variables, loops, and conditional statements.
- **Advanced Process Scheduler**: Implement a simulated CPU scheduler with active job control and signal handling (SIGKILL, SIGTERM, SIGINT).
- **Virtual Networking Stack**: Support sandboxed virtual networking channels for inter-workspace SSH, scp, and HTTP client requests.
