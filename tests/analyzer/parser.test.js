import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseFileDependencies } from '../../src/analyzer/parser.js';

describe('TypeScript AST Parser', () => {
  const rootDir = path.resolve('examples/instalite');

  it('parses static ESM imports correctly', () => {
    const filePath = path.resolve(rootDir, 'src/auth/login.js');
    const result = parseFileDependencies(filePath, rootDir);

    expect(result.rawImports).toContain('./authUtils.js');
    expect(result.resolvedDependencies.some(d => d.endsWith('authUtils.js'))).toBe(true);
  });

  it('handles files with no imports', () => {
    const filePath = path.resolve(rootDir, 'src/auth/authUtils.js');
    const result = parseFileDependencies(filePath, rootDir);

    expect(result.rawImports).toHaveLength(0);
    expect(result.resolvedDependencies).toHaveLength(0);
  });

  it('parses multi-hop imports across subdirectories', () => {
    const filePath = path.resolve(rootDir, 'src/users/user.js');
    const result = parseFileDependencies(filePath, rootDir);

    expect(result.rawImports).toContain('../auth/authUtils.js');
    expect(result.resolvedDependencies.some(d => d.endsWith('authUtils.js'))).toBe(true);
  });
});
