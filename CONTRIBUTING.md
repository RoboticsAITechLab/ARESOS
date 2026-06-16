# Contributing to ARESOS

Thank you for contributing to ARESOS! Follow these practical guidelines to get started.

## Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/RoboticsAITechLab/ARESOS.git
   cd ARESOS
   ```
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run local development server:
   ```bash
   npm run dev
   ```

## Development Workflow

- Always create a new branch from `main`:
  ```bash
  git checkout -b feature/your-feature-name
  ```
- Make incremental commits with clean descriptions.
- Ensure the development server compiles cleanly before submitting changes.

## Coding Conventions

- **Language**: TypeScript (strict type checking enabled).
- **Styling**: Tailwind CSS combined with custom vanilla CSS variables for custom themes.
- **VFS Node Access**: Avoid using node.js `fs` or other host filesystem APIs. Always interface via the virtual filesystem context (`readFile`, `writeFile`, `createDirectory`, etc.).

## Testing Expectations

- To run shell and command regression tests:
  ```bash
  npx ts-node -r tsconfig-paths/register runTests.ts
  ```
- Any new features must include companion tests or be verified against the existing suite.

## Pull Request Process

1. Push your branch to remote origin.
2. Open a Pull Request targeting `main`.
3. Provide a clear description of changes, including manual testing proofs (e.g. screenshots/CLI outputs).
4. Request a review from the maintainers.
