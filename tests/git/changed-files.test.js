import { describe, it, expect } from 'vitest';
import { isGitRepository, getGitRoot } from '../../src/git/changed-files.js';

describe('Git Change Detection', () => {
  it('correctly identifies current project as a git repository', () => {
    expect(isGitRepository(process.cwd())).toBe(true);
  });

  it('correctly returns the git root directory', () => {
    const root = getGitRoot(process.cwd());
    expect(root).toBeDefined();
    expect(root.endsWith('changeblast')).toBe(true);
  });

  it('returns false for non-git directories', () => {
    expect(isGitRepository('/tmp')).toBe(false);
  });
});
