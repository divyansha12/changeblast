import { execSync } from 'node:child_process';
import path from 'node:path';
import { normalizePath } from '../utils/file-utils.js';

/**
 * Checks if the specified directory is inside a Git repository.
 * @param {string} cwd 
 * @returns {boolean}
 */
export function isGitRepository(cwd = process.cwd()) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the Git root directory.
 * @param {string} cwd 
 * @returns {string}
 */
export function getGitRoot(cwd = process.cwd()) {
  const root = execSync('git rev-parse --show-toplevel', {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  return normalizePath(root);
}

/**
 * Parses Git diff --name-status output into a structured array of changes.
 * @param {string} diffOutput 
 * @param {string} gitRoot 
 * @param {string} cwd 
 * @returns {Array<{ path: string, status: 'modified'|'added'|'deleted'|'renamed', oldPath?: string }>}
 */
function parseDiffOutput(diffOutput, gitRoot, cwd) {
  if (!diffOutput || !diffOutput.trim()) {
    return [];
  }

  const lines = diffOutput.trim().split('\n');
  const results = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    const statusFlag = parts[0].trim();

    let status = 'modified';
    let rawFilePath = parts[1];
    let rawOldPath = undefined;

    if (statusFlag.startsWith('A')) {
      status = 'added';
      rawFilePath = parts[1];
    } else if (statusFlag.startsWith('D')) {
      status = 'deleted';
      rawFilePath = parts[1];
    } else if (statusFlag.startsWith('R')) {
      status = 'renamed';
      rawOldPath = parts[1];
      rawFilePath = parts[2];
    } else if (statusFlag.startsWith('M')) {
      status = 'modified';
      rawFilePath = parts[1];
    }

    if (!rawFilePath) continue;

    // Resolve path relative to cwd
    const absPath = path.resolve(gitRoot, rawFilePath);
    const relToCwd = normalizePath(path.relative(cwd, absPath));

    let oldPathRel = undefined;
    if (rawOldPath) {
      const oldAbs = path.resolve(gitRoot, rawOldPath);
      oldPathRel = normalizePath(path.relative(cwd, oldAbs));
    }

    results.push({
      path: relToCwd,
      status,
      ...(oldPathRel ? { oldPath: oldPathRel } : {})
    });
  }

  return results;
}

/**
 * Parses git status --porcelain output to detect untracked files.
 * @param {string} porcelainOutput 
 * @param {string} gitRoot 
 * @param {string} cwd 
 * @returns {Array<{ path: string, status: 'added' }>}
 */
function parseUntrackedOutput(porcelainOutput, gitRoot, cwd) {
  if (!porcelainOutput || !porcelainOutput.trim()) {
    return [];
  }

  const lines = porcelainOutput.trim().split('\n');
  const results = [];

  for (const line of lines) {
    if (line.startsWith('?? ')) {
      const rawPath = line.substring(3).trim();
      const absPath = path.resolve(gitRoot, rawPath);
      const relToCwd = normalizePath(path.relative(cwd, absPath));
      results.push({
        path: relToCwd,
        status: 'added'
      });
    }
  }

  return results;
}

/**
 * Detects all changed files in the repository.
 * 
 * Supports:
 * - Unstaged changes (working tree vs staging)
 * - Staged changes (staged vs HEAD)
 * - Untracked new files
 * - Base branch comparison (e.g. `--base main` or `--base origin/main`)
 * 
 * @param {Object} options
 * @param {string} [options.base] - Git branch or commit to compare against (e.g. 'main', 'origin/main').
 * @param {boolean} [options.stagedOnly] - If true, only checks staged changes.
 * @param {string} [options.cwd] - Working directory (defaults to process.cwd()).
 * @returns {Array<{ path: string, status: 'modified'|'added'|'deleted'|'renamed', oldPath?: string }>}
 */
export function getChangedFiles(options = {}) {
  const cwd = options.cwd || process.cwd();

  if (!isGitRepository(cwd)) {
    throw new Error(`The directory "${cwd}" is not a Git repository. ChangeBlast requires Git to detect code modifications.`);
  }

  const gitRoot = getGitRoot(cwd);
  const changedMap = new Map();

  const addChanges = (changes) => {
    for (const item of changes) {
      changedMap.set(item.path, item);
    }
  };

  try {
    if (options.base) {
      // Compare current HEAD / working tree against base branch
      let baseRef = options.base;
      // Try baseRef directly; if not found, try origin/baseRef
      try {
        execSync(`git rev-parse --verify ${baseRef}`, { cwd, stdio: 'ignore' });
      } catch {
        baseRef = `origin/${baseRef}`;
      }

      // Changes between base and working tree
      const baseDiff = execSync(`git -c core.quotepath=false diff --name-status ${baseRef}`, {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      addChanges(parseDiffOutput(baseDiff, gitRoot, cwd));

      // Also pick up untracked files
      const porcelain = execSync('git -c core.quotepath=false status --porcelain', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      addChanges(parseUntrackedOutput(porcelain, gitRoot, cwd));
    } else if (options.stagedOnly) {
      // Only staged changes
      const stagedDiff = execSync('git -c core.quotepath=false diff --cached --name-status', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      addChanges(parseDiffOutput(stagedDiff, gitRoot, cwd));
    } else {
      // Default: Check working tree (both unstaged & staged) + untracked files
      const unstagedDiff = execSync('git -c core.quotepath=false diff --name-status', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      addChanges(parseDiffOutput(unstagedDiff, gitRoot, cwd));

      const stagedDiff = execSync('git -c core.quotepath=false diff --cached --name-status', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      addChanges(parseDiffOutput(stagedDiff, gitRoot, cwd));

      const porcelain = execSync('git -c core.quotepath=false status --porcelain', {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      addChanges(parseUntrackedOutput(porcelain, gitRoot, cwd));
    }
  } catch (err) {
    throw new Error(`Failed to execute Git diff: ${err.message}`);
  }

  return Array.from(changedMap.values());
}
