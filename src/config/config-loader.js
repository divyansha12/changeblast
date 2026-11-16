import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_EXCLUDES, DEFAULT_TEST_PATTERNS } from '../scanner/project-scanner.js';

export const DEFAULT_CONFIG = {
  testFramework: 'auto', // 'vitest' | 'jest' | 'auto'
  testPatterns: DEFAULT_TEST_PATTERNS,
  exclude: DEFAULT_EXCLUDES,
  runCommand: null
};

/**
 * Loads ChangeBlast configuration from the project directory.
 * Searches for:
 * 1. changeblast.config.js
 * 2. changeblast.config.mjs
 * 3. changeblast.config.json
 * 4. package.json "changeblast" key
 * 
 * @param {string} rootDir 
 * @returns {Promise<typeof DEFAULT_CONFIG>}
 */
export async function loadConfig(rootDir = process.cwd()) {
  const possibleFiles = [
    'changeblast.config.js',
    'changeblast.config.mjs',
    'changeblast.config.json'
  ];

  for (const filename of possibleFiles) {
    const fullPath = path.join(rootDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        if (filename.endsWith('.json')) {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_CONFIG, ...parsed };
        } else {
          // Dynamic ESM import
          const fileUrl = pathToFileURL(fullPath).href;
          const imported = await import(fileUrl);
          const config = imported.default || imported;
          return { ...DEFAULT_CONFIG, ...config };
        }
      } catch (err) {
        console.warn(`[ChangeBlast] Warning: Failed to parse ${filename}: ${err.message}`);
      }
    }
  }

  // Check package.json
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.changeblast) {
        return { ...DEFAULT_CONFIG, ...pkg.changeblast };
      }
    } catch {
      // Ignore package.json read errors
    }
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Generates content for an initial changeblast.config.js file.
 * @returns {string}
 */
export function generateInitialConfigContent() {
  return `/** @type {import('changeblast').Config} */
export default {
  // Test framework: 'vitest', 'jest', or 'auto' (detects from package.json)
  testFramework: 'auto',

  // Glob patterns identifying test files
  testPatterns: [
    '**/*.test.[jt]s',
    '**/*.test.[jt]sx',
    '**/*.spec.[jt]s',
    '**/*.spec.[jt]sx',
    '**/__tests__/**/*.[jt]s',
    '**/__tests__/**/*.[jt]sx'
  ],

  // Directories and files to exclude from analysis
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**'
  ]
};
`;
}
