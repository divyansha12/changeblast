# ChangeBlast 🚀

> Know what your code changes affect. Run smarter tests.

ChangeBlast is an open-source test impact analysis tool for JavaScript and TypeScript codebases. It automatically identifies which tests are affected by modified files using Git and AST-based dependency graphs.

## Features

- **Git-Powered Detection**: Identifies unstaged, staged, and branch-level changes.
- **AST Dependency Graph**: Uses the TypeScript Compiler API to parse imports (`import`, `require`, dynamic imports, re-exports).
- **Transitive Impact Traversal**: Recommends tests through direct and multi-hop dependency chains.
- **Explainable Analysis**: Visualizes the exact causal path from source edit to test file.
- **Test Runner Integration**: Direct execution support for Vitest and Jest.
- **CI-Ready**: Emits structured JSON for automated pipelines and GitHub Actions.

## Installation

```bash
npm install --save-dev changeblast
```

Or run directly with npx:

```bash
npx changeblast analyze
```

## Usage

### 1. Analyze Working Changes
```bash
npx changeblast analyze
```

### 2. Compare Against a Git Branch
```bash
npx changeblast analyze --base main
```

### 3. Inspect Impact Chains (`--explain`)
```bash
npx changeblast analyze --explain
```

### 4. Output JSON for CI/CD
```bash
npx changeblast analyze --json
```

### 5. Run Only the Recommended Tests
```bash
npx changeblast run --base main
```

## Configuration

Initialize an optional configuration file:

```bash
npx changeblast init
```

Example `changeblast.config.js`:

```javascript
export default {
  testFramework: 'auto', // 'vitest' | 'jest' | 'auto'
  testPatterns: [
    '**/*.test.[jt]s',
    '**/*.test.[jt]sx',
    '**/*.spec.[jt]s',
    '**/*.spec.[jt]sx'
  ],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**'
  ]
};
```

## License

MIT © Divyansha Singh
