import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { runAnalysis } from '../../src/index.js';

describe('InstaLite Integration Test', () => {
  const rootDir = path.resolve('examples/instalite');

  it('correctly isolates tests when authUtils.js is modified', async () => {
    const result = await runAnalysis({
      cwd: rootDir,
      changedFiles: ['src/auth/authUtils.js']
    });

    const recommended = result.recommendedTests.map(t => t.relativeFile);
    const unrelated = result.unrelatedTests;

    // authUtils, login, user, and profile tests must be recommended!
    expect(recommended).toContain('tests/authUtils.test.js');
    expect(recommended).toContain('tests/login.test.js');
    expect(recommended).toContain('tests/user.test.js');
    expect(recommended).toContain('tests/profile.test.js');

    // posts and payment tests must be safely skipped!
    expect(unrelated).toContain('tests/posts.test.js');
    expect(unrelated).toContain('tests/payment.test.js');

    expect(recommended.length).toBe(4);
    expect(unrelated.length).toBe(2);
    expect(result.summary.percentageSkipped).toBe('33.3%');
  });

  it('correctly recommends only posts.test.js when posts.js is modified', async () => {
    const result = await runAnalysis({
      cwd: rootDir,
      changedFiles: ['src/posts/posts.js']
    });

    const recommended = result.recommendedTests.map(t => t.relativeFile);
    const unrelated = result.unrelatedTests;

    expect(recommended).toEqual(['tests/posts.test.js']);
    expect(unrelated.length).toBe(5);
    expect(result.summary.percentageSkipped).toBe('83.3%');
  });

  it('provides full impact chains with explainable path', async () => {
    const result = await runAnalysis({
      cwd: rootDir,
      changedFiles: ['src/auth/authUtils.js']
    });

    const profileTest = result.recommendedTests.find(t => t.relativeFile === 'tests/profile.test.js');
    expect(profileTest).toBeDefined();

    // Verify chain traces: authUtils -> user -> profile -> profile.test
    const chain = profileTest.impactChains[0];
    expect(chain[0]).toBe('src/auth/authUtils.js');
    expect(chain).toContain('src/users/user.js');
    expect(chain).toContain('src/users/profile.js');
    expect(chain[chain.length - 1]).toBe('tests/profile.test.js');
  });
});
