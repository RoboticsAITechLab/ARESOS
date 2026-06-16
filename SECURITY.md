# Security Policy

## Supported Versions

Only the current main release branch is supported with security updates:

| Version | Supported |
| ------- | --------- |
| v2.x    | ✅ Yes     |
| v1.x    | ❌ No      |

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT open a public issue. Instead, report it privately to our team:

- **Email**: `security@roboticsaitechlab.org` (Placeholder for maintainer review)
- **Response Time**: We aim to investigate and respond within 48 hours.

## Scope & Sandboxing

ARESOS runs entirely in the browser context as a simulated WebOS:
- The command line shells (Python REPL, Node, Bash compilation toolchains) are simulated.
- File systems are sandboxed inside browser `localStorage` (VFS).
- Any security vulnerabilities reported should concern scope escapes, virtual sandbox bypasses, or data leakages crossing host-guest boundaries.
