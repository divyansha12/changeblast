import path from 'node:path';
import picomatch from 'picomatch';
import { DEFAULT_TEST_PATTERNS } from '../scanner/project-scanner.js';
import { normalizePath, toRelativePath } from '../utils/file-utils.js';

/**
 * Creates a predicate to test if a file is a test file.
 * @param {string[]} [testPatterns] 
 * @returns {(filePath: string, rootDir: string) => boolean}
 */
export function createTestFileMatcher(testPatterns = DEFAULT_TEST_PATTERNS) {
  const matcher = picomatch(testPatterns, { dot: true });

  return (filePath, rootDir) => {
    const rel = rootDir ? toRelativePath(rootDir, filePath) : normalizePath(filePath);
    return matcher(rel);
  };
}

/**
 * Finds test files that conventionally correspond to a source file by name.
 * Examples:
 * - src/auth/login.js -> tests/login.test.js, src/auth/__tests__/login.test.js, src/auth/login.spec.js
 * 
 * @param {string} sourceFile - Absolute path to source file.
 * @param {string[]} allTestFiles - Absolute paths of all discovered test files.
 * @param {string} rootDir - Root directory.
 * @returns {string[]} Matching test file paths.
 */
export function findConventionalTestsForFile(sourceFile, allTestFiles, rootDir) {
  const baseName = path.basename(sourceFile, path.extname(sourceFile));
  const relSource = toRelativePath(rootDir, sourceFile);

  const matched = [];

  for (const testFile of allTestFiles) {
    const testBaseName = path.basename(testFile);
    const relTest = toRelativePath(rootDir, testFile);

    // 1. Matches base name (e.g. login.test.js or login.spec.ts for login.js)
    if (
      testBaseName.startsWith(`${baseName}.test.`) ||
      testBaseName.startsWith(`${baseName}.spec.`)
    ) {
      matched.push(testFile);
      continue;
    }

    // 2. Mirrors folder structure in /tests or /__tests__
    // e.g. src/auth/login.js -> tests/auth/login.test.js
    const srcWithoutExt = relSource.replace(/\.[^/.]+$/, '');
    const cleanSrcPath = srcWithoutExt.replace(/^(src|lib)\//, '');

    if (relTest.includes(cleanSrcPath)) {
      matched.push(testFile);
    }
  }

  return Array.from(new Set(matched));
}
