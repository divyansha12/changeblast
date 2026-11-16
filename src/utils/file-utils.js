import path from 'node:path';
import fs from 'node:fs';

const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];

/**
 * Normalizes file path to forward slashes for cross-platform consistency.
 * @param {string} filePath 
 * @returns {string}
 */
export function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Converts an absolute path to a project-relative path.
 * @param {string} rootDir 
 * @param {string} absolutePath 
 * @returns {string}
 */
export function toRelativePath(rootDir, absolutePath) {
  const rel = path.relative(rootDir, absolutePath);
  return normalizePath(rel);
}

/**
 * Checks if a file has a supported JavaScript or TypeScript extension.
 * @param {string} filePath 
 * @returns {boolean}
 */
export function isSupportedSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Resolves a module specifier (relative import) against the importing file's directory.
 * Handles missing extensions (.js, .ts, etc.) and index files.
 * 
 * @param {string} importingFilePath - Absolute path of the file containing the import.
 * @param {string} importSpecifier - The import string, e.g. './authUtils' or '../user'
 * @param {string} rootDir - Project root directory.
 * @returns {string|null} - Absolute path of resolved file, or null if external/unresolvable.
 */
export function resolveImportPath(importingFilePath, importSpecifier, rootDir) {
  // Ignore non-relative external packages (e.g. 'react', 'lodash', '@types/node')
  if (!importSpecifier.startsWith('.') && !importSpecifier.startsWith('/')) {
    return null;
  }

  const baseDir = path.dirname(importingFilePath);
  const targetPath = path.resolve(baseDir, importSpecifier);

  // 1. Direct exact file match
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath;
  }

  // 2. Try supported extensions
  for (const ext of SUPPORTED_EXTENSIONS) {
    const candidate = `${targetPath}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  // 3. Try TypeScript specific extension mappings (e.g. import './foo.js' where file is './foo.ts')
  const currentExt = path.extname(targetPath);
  if (currentExt === '.js') {
    const tsCandidate = targetPath.slice(0, -3) + '.ts';
    if (fs.existsSync(tsCandidate) && fs.statSync(tsCandidate).isFile()) {
      return tsCandidate;
    }
    const tsxCandidate = targetPath.slice(0, -3) + '.tsx';
    if (fs.existsSync(tsxCandidate) && fs.statSync(tsxCandidate).isFile()) {
      return tsxCandidate;
    }
  }

  // 4. Try directory index files (e.g. './components' -> './components/index.ts')
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    for (const ext of SUPPORTED_EXTENSIONS) {
      const indexCandidate = path.join(targetPath, `index${ext}`);
      if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
        return indexCandidate;
      }
    }
  }

  return null;
}
