import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../src/analyzer/dependency-graph.js';
import { analyzeImpact } from '../../src/impact/impact-analyzer.js';

describe('Impact Analyzer Unit & Edge Cases', () => {
  const rootDir = '/mock/project';

  it('directly recommends modified test files', () => {
    const graph = new DependencyGraph();
    const testFile = '/mock/project/tests/foo.test.js';
    graph.addNode(testFile);

    const result = analyzeImpact({
      changedFiles: [{ path: 'tests/foo.test.js', status: 'modified' }],
      graph,
      allTestFiles: [testFile],
      rootDir
    });

    expect(result.recommendedTests.length).toBe(1);
    expect(result.recommendedTests[0].relativeFile).toBe('tests/foo.test.js');
    expect(result.recommendedTests[0].reasons[0]).toContain('directly modified');
  });

  it('handles isolated modified files with no dependents gracefully', () => {
    const graph = new DependencyGraph();
    const srcFile = '/mock/project/src/orphan.js';
    const testFile = '/mock/project/tests/unrelated.test.js';

    graph.addNode(srcFile);
    graph.addNode(testFile);

    const result = analyzeImpact({
      changedFiles: [{ path: 'src/orphan.js', status: 'modified' }],
      graph,
      allTestFiles: [testFile],
      rootDir
    });

    expect(result.recommendedTests.length).toBe(0);
    expect(result.unrelatedTests).toContain('tests/unrelated.test.js');
    expect(result.summary.percentageSkipped).toBe('100.0%');
  });

  it('terminates BFS cleanly in cyclic dependency chains', () => {
    const graph = new DependencyGraph();
    const fileA = '/mock/project/src/a.js';
    const fileB = '/mock/project/src/b.js';
    const testA = '/mock/project/tests/a.test.js';

    // Cycle: a <-> b
    graph.addDependency(fileA, fileB);
    graph.addDependency(fileB, fileA);
    // test imports a
    graph.addDependency(testA, fileA);

    const result = analyzeImpact({
      changedFiles: [{ path: 'src/b.js', status: 'modified' }],
      graph,
      allTestFiles: [testA],
      rootDir
    });

    // Modifying b reaches a (via cycle), which reaches a.test.js!
    expect(result.recommendedTests.length).toBe(1);
    expect(result.recommendedTests[0].relativeFile).toBe('tests/a.test.js');
  });
});
