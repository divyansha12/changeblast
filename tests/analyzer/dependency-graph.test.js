import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../src/analyzer/dependency-graph.js';

describe('DependencyGraph Edge Cases', () => {
  it('correctly tracks forward dependencies and reverse dependents', () => {
    const graph = new DependencyGraph();

    // login.js imports authUtils.js
    graph.addDependency('login.js', 'authUtils.js');

    expect(graph.getDependencies('login.js').has('authUtils.js')).toBe(true);
    expect(graph.getDependents('authUtils.js').has('login.js')).toBe(true);
  });

  it('handles diamond dependencies correctly', () => {
    const graph = new DependencyGraph();

    // D is base utility.
    // B and C import D.
    // A imports B and C.
    graph.addDependency('B', 'D');
    graph.addDependency('C', 'D');
    graph.addDependency('A', 'B');
    graph.addDependency('A', 'C');

    const dependentsOfD = graph.getDependents('D');
    expect(dependentsOfD.size).toBe(2);
    expect(dependentsOfD.has('B')).toBe(true);
    expect(dependentsOfD.has('C')).toBe(true);

    expect(graph.getDependents('B').has('A')).toBe(true);
    expect(graph.getDependents('C').has('A')).toBe(true);
  });

  it('handles multiple circular dependencies without infinite loops', () => {
    const graph = new DependencyGraph();

    graph.addDependency('A', 'B');
    graph.addDependency('B', 'C');
    graph.addDependency('C', 'A'); // Cycle 1

    graph.addDependency('X', 'Y');
    graph.addDependency('Y', 'X'); // Cycle 2

    expect(graph.getNodeCount()).toBe(5);
    expect(graph.getEdgeCount()).toBe(5);
  });

  it('serializes graph cleanly to JSON', () => {
    const graph = new DependencyGraph();
    graph.addDependency('A', 'B');

    const json = graph.toJSON();
    expect(json.nodes).toContain('A');
    expect(json.nodes).toContain('B');
    expect(json.dependencies['A']).toEqual(['B']);
    expect(json.dependents['B']).toEqual(['A']);
  });
});
