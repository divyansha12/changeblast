import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { parseFileDependencies } from '../../src/analyzer/parser.js';

describe('TypeScript AST Parser Edge Cases', () => {
  const rootDir = path.resolve('examples/instalite');
  const tempDir = path.resolve('tests/fixtures');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('parses static ESM imports correctly', () => {
    const filePath = path.resolve(rootDir, 'src/auth/login.js');
    const result = parseFileDependencies(filePath, rootDir);

    expect(result.rawImports).toContain('./authUtils.js');
    expect(result.resolvedDependencies.some(d => d.endsWith('authUtils.js'))).toBe(true);
  });

  it('parses CommonJS require() calls', () => {
    const fixturePath = path.join(tempDir, 'cjs.js');
    const targetPath = path.join(tempDir, 'target.js');
    fs.writeFileSync(targetPath, 'module.exports = {};');
    fs.writeFileSync(fixturePath, 'const t = require("./target.js");');

    const result = parseFileDependencies(fixturePath, tempDir);
    expect(result.rawImports).toContain('./target.js');
    expect(result.resolvedDependencies).toContain(targetPath);
  });

  it('parses dynamic import() string literals', () => {
    const fixturePath = path.join(tempDir, 'dyn.js');
    const targetPath = path.join(tempDir, 'target.js');
    fs.writeFileSync(fixturePath, 'async function run() { await import("./target.js"); }');

    const result = parseFileDependencies(fixturePath, tempDir);
    expect(result.hasDynamicImports).toBe(true);
    expect(result.resolvedDependencies).toContain(targetPath);
  });

  it('flags unsupported non-literal dynamic imports with a warning', () => {
    const fixturePath = path.join(tempDir, 'dyn_var.js');
    fs.writeFileSync(fixturePath, 'const name = "target"; import(name);');

    const result = parseFileDependencies(fixturePath, tempDir);
    expect(result.hasDynamicImports).toBe(true);
    expect(result.unsupportedPatterns.length).toBeGreaterThan(0);
  });

  it('parses TypeScript type-only imports and re-exports', () => {
    const fixturePath = path.join(tempDir, 'reexport.ts');
    const targetPath = path.join(tempDir, 'target.ts');
    fs.writeFileSync(targetPath, 'export interface User { id: string; }');
    fs.writeFileSync(fixturePath, 'export { User } from "./target.ts";');

    const result = parseFileDependencies(fixturePath, tempDir);
    expect(result.rawImports).toContain('./target.ts');
    expect(result.resolvedDependencies).toContain(targetPath);
  });
});
