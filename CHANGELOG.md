# Changelog

All notable changes to this project will be documented in this file.

## [v2.1.0] - 2026-07-03

### Added
- **AI Math Notes Solver**: Integrated direct whiteboard canvas image submission to Gemini AI (`gemini-2.5-flash` or newer) to provide highly precise scientific and mathematical equation calculations.
- **Solution Details Side Panel**: Designed a dynamic sliding side panel that displays the recognized equation, final result, step-by-step math explanations, saved variables, and graph functions separately from the canvas.
- **Auto-Activation UI**: The Solution Details panel automatically pops open upon a successful whiteboard solver action, with clear states for loading, caching, rate limiting, and canvas clearing.

### Changed
- **Bypassed Local OCR**: Removed the slower client-side Tesseract.js OCR and local solver heuristic for the primary solver pathway, sending the raw whiteboard canvas image directly to Gemini AI.

## [v2.0.0] - 2026-06-16

### Added
- **Advanced Shell Parser**: Supports full command line tokenization, subshells, parenthesis grouping, command chaining (`&&`, `||`, `;`), and command history bang expansion (`!!`, `!n`).
- **Pipes and Redirections**: Standard piping (`|`), output redirection (`>`, `>>`), input redirection (`<`), and error redirection (`2>`, `2>>`).
- **Environment Variables and Aliases**: Full support for `export`, `unset`, `alias`, and `unalias` commands.
- **ZIP Subsystem Engine**: Implement a real virtual ZIP archive engine supporting native ARESOS JSON archives and external binary PKZIP files (`PK\x03\x04` signature) with Store (method 0) and Deflate (method 8) compression.
- **Archive Utilities**: Dynamic `unzip`, list mode (`unzip -l`), and metadata inspection (`zipinfo`).
- **VFS Binary Support**: Integrated binary `Uint8Array` / `ArrayBuffer` data handling in the VFS read/write pipeline.

### Fixed
- **VFS Synchronization**: Resolved states desynchronizing upon directory navigation or command chains.
- **Redirection Handling Bugs**: Corrected file stream write/append overrides during stdout/stderr piping.
- **Archive Extraction Issues**: Fixed directory path restoration boundaries, and implemented file overwrite protection prompts (`replace? [y/n]`) and force overrides (`-o`).
- **Filesystem Utility Correctness**: Fixed `cp` reporting incorrect recursive directory messages when copying simple files, and restricted renaming nonexistent nodes in `mv`.
