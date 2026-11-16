import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';
import { isSupportedSourceFile, normalizePath, toRelativePath } from '../utils/file-utils.js';

export const DEFAULT_EXCLUDES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/out/**'
];

export const DEFAULT_TEST_PATTERNS = [
  '**/*.test.[jt]s',
  '**/*.test.[jt]sx',
  '**/*.spec.[jt]s',
  '**/*.spec.[jt]sx',
  '**/__tests__/**/*.[jt]s',
  '**/__tests__/**/*.[jt]sx'
];

/**
 * Scans a project directory to discover all source and test files.
 * 
 * @param {string} rootDir - Root directory to scan.
 * @param {Object} [options]
 * @param {string[]} [options.exclude] - Glob patterns to ignore.
 * @param {string[]} [options.testPatterns] - Glob patterns that identify test files.
 * @returns {{ sourceFiles: string[], testFiles: string[], allFiles: string[] }}
 */
export function scanProject(rootDir, options = {}) {
  const excludePatterns = options.exclude && options.exclude.length > 0
    ? options.exclude
    : DEFAULT_EXCLUDES;

  const testPatterns = options.testPatterns && options.testPatterns.length > 0
    ? options.testPatterns
    : DEFAULT_TEST_PATTERNS;

  const isExcluded = picomatch(excludePatterns, { dot: true });
  const isTest = picomatch(testPatterns, { dot: true });

  const sourceFiles = [];
  const testFiles = [];
  const allFiles = [];

  function traverse(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = toRelativePath(rootDir, fullPath);

      // Check if excluded
      if (isExcluded(relativePath) || isExcluded(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && isSupportedSourceFile(fullPath)) {
        allFiles.push(fullPath);

        if (isTest(relativePath)) {
          testFiles.push(fullPath);
        } else {
          sourceFiles.push(fullPath);
        }
      }
    }
  }

  traverse(rootDir);

  return {
    sourceFiles,
    testFiles,
    allFiles
  };
}
