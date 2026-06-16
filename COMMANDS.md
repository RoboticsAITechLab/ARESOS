# ARESOS Command Reference

This document catalogs every command available in the ARESOS terminal shell, along with its implementation status, syntax, and examples.

---

## Filesystem Commands

### `ls`
- **Description**: List directory contents.
- **Syntax**: `ls [path]`
- **Example**: `ls /home/user/Desktop`
- **Status**: Implemented

### `cd`
- **Description**: Change directory.
- **Syntax**: `cd [path]`
- **Example**: `cd ..`
- **Status**: Implemented

### `pwd`
- **Description**: Print working directory.
- **Syntax**: `pwd`
- **Example**: `pwd`
- **Status**: Implemented

### `cat`
- **Description**: Print file content.
- **Syntax**: `cat [file]`
- **Example**: `cat README.md`
- **Status**: Implemented

### `touch`
- **Description**: Create empty files.
- **Syntax**: `touch [file]`
- **Example**: `touch notes.txt`
- **Status**: Implemented

### `write`
- **Description**: Write content to files.
- **Syntax**: `write [file] [content]`
- **Example**: `write test.txt hello world`
- **Status**: Implemented

### `mkdir`
- **Description**: Create directories.
- **Syntax**: `mkdir [directory]`
- **Example**: `mkdir project`
- **Status**: Implemented

### `rm`
- **Description**: Delete files or directories.
- **Syntax**: `rm [path]`
- **Example**: `rm old_file.txt`
- **Status**: Implemented

### `cp`
- **Description**: Copy files or directories recursively.
- **Syntax**: `cp [source] [destination]`
- **Example**: `cp notes.txt backup.txt`
- **Status**: Implemented

### `mv`
- **Description**: Move or rename files/directories.
- **Syntax**: `mv [source] [destination]`
- **Example**: `mv old.txt new.txt`
- **Status**: Implemented

### `find`
- **Description**: Search for files matching filters.
- **Syntax**: `find [name]`
- **Example**: `find *.txt`
- **Status**: Implemented

### `tree`
- **Description**: Display hierarchical folder structure.
- **Syntax**: `tree [path]`
- **Example**: `tree /home/user`
- **Status**: Implemented

---

## Utility Commands

### `echo`
- **Description**: Print arguments to standard output.
- **Syntax**: `echo [text]`
- **Example**: `echo $USER`
- **Status**: Implemented

### `clear`
- **Description**: Clear the console screen.
- **Syntax**: `clear`
- **Example**: `clear`
- **Status**: Implemented

### `theme`
- **Description**: Customize UI visual themes.
- **Syntax**: `theme [theme-name]`
- **Example**: `theme midnight-aurora`
- **Status**: Implemented

### `neofetch`
- **Description**: Display aesthetic system specs.
- **Syntax**: `neofetch`
- **Example**: `neofetch`
- **Status**: Implemented

### `calc`
- **Description**: Compute mathematical equations.
- **Syntax**: `calc [expression]`
- **Example**: `calc (12 + 8) * 5`
- **Status**: Implemented

### `weather`
- **Description**: Satellite atmospheric reports.
- **Syntax**: `weather [city]`
- **Example**: `weather London`
- **Status**: Implemented (Real API integrations)

### `ping`
- **Description**: Query DNS coordinates and ping target.
- **Syntax**: `ping [host]`
- **Example**: `ping google.com`
- **Status**: Implemented (Real DNS lookup, simulated ping sequence)

### `matrix`
- **Description**: Launch Matrix digital rain effect.
- **Syntax**: `matrix`
- **Example**: `matrix`
- **Status**: Implemented

---

## Text Processing

### `grep`
- **Description**: Pattern match text in lines.
- **Syntax**: `grep [pattern] [file]`
- **Example**: `grep Features README.md`
- **Status**: Implemented

### `head`
- **Description**: Print starting lines of files.
- **Syntax**: `head -n [lines] [file]`
- **Example**: `head -n 5 README.md`
- **Status**: Implemented

### `tail`
- **Description**: Print ending lines of files.
- **Syntax**: `tail -n [lines] [file]`
- **Example**: `tail -n 5 README.md`
- **Status**: Implemented

### `wc`
- **Description**: Count lines, words, or characters.
- **Syntax**: `wc [-l | -w | -c] [file]`
- **Example**: `wc -l README.md`
- **Status**: Implemented

---

## Archive Subsystem

### `zip`
- **Description**: Archive files/directories recursively.
- **Syntax**: `zip [archive.zip] [sources...]`
- **Example**: `zip backup.zip notes.txt src`
- **Status**: Implemented (creates VFS archive node)

### `unzip`
- **Description**: Extract ZIP archives. Supports list mode (`-l`) and force overwrite (`-o`).
- **Syntax**: `unzip [-l | -o] [archive.zip]`
- **Example**: `unzip -o backup.zip`
- **Status**: Implemented (supports standard PKZIP and ARESOS JSON archives)

### `zipinfo`
- **Description**: Display archive metadata.
- **Syntax**: `zipinfo [archive.zip]`
- **Example**: `zipinfo backup.zip`
- **Status**: Implemented (supports standard PKZIP and ARESOS JSON archives)

---

## Process & Diagnostics

### `ps`
- **Description**: List running system processes.
- **Syntax**: `ps`
- **Example**: `ps`
- **Status**: Implemented

### `kill`
- **Description**: Terminate active processes by ID.
- **Syntax**: `kill [pid]`
- **Example**: `kill 12`
- **Status**: Implemented

### `htop`
- **Description**: Interactive CPU and process monitor.
- **Syntax**: `htop`
- **Example**: `htop`
- **Status**: Implemented

### `diskusage`
- **Description**: Inspect filesystem storage allocations.
- **Syntax**: `diskusage`
- **Example**: `diskusage`
- **Status**: Implemented

### `meminfo`
- **Description**: View memory statistics.
- **Syntax**: `meminfo`
- **Example**: `meminfo`
- **Status**: Implemented

### `cpuinfo`
- **Description**: View CPU hardware specs.
- **Syntax**: `cpuinfo`
- **Example**: `cpuinfo`
- **Status**: Implemented

---

## Environment & Aliases

### `export`
- **Description**: Set environment variables.
- **Syntax**: `export [key=value]`
- **Example**: `export USER=ankit`
- **Status**: Implemented

### `unset`
- **Description**: Remove environment variables.
- **Syntax**: `unset [key]`
- **Example**: `unset USER`
- **Status**: Implemented

### `alias`
- **Description**: Create command aliases.
- **Syntax**: `alias [alias_name]='[command]'`
- **Example**: `alias ll='ls -la'`
- **Status**: Implemented

### `unalias`
- **Description**: Remove command aliases.
- **Syntax**: `unalias [alias_name]`
- **Example**: `unalias ll`
- **Status**: Implemented

### `history`
- **Description**: View past executed shell commands.
- **Syntax**: `history`
- **Example**: `history`
- **Status**: Implemented

---

## Simulated Commands

The following commands provide simulated mock/sandbox behavior:

- **`gcc` / `clang`**: Simulated compiler toolchain.
- **`python`**: Simulated sandbox Python REPL.
- **`node`**: Simulated sandbox NodeJS REPL.
- **`npm`**: Simulated node package synchronization.
- **`git`**: Simulated version control status and log.
- **`ssh`**: Simulated terminal session agent.
- **`scp`**: Simulated cryptographic file transfer.
- **`curl` / `wget`**: Simulated network requests/downloads.
- **`nslookup`**: Simulated DNS lookup utility.
- **`traceroute`**: Simulated network packet tracing.
- **`netstat`**: Simulated port network monitor.
- **`arespkg`**: Simulated software package installer.
- **`jobs` / `bg` / `fg` / `nohup`**: Simulated job execution handlers.
