# Changelog

All notable changes to this project will be documented in this file.

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
