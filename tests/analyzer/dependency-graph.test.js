import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../src/analyzer/dependency-graph.js';

describe('DependencyGraph', () => {
  it('correctly tracks forward dependencies and reverse dependents', () => {
    const graph = new DependencyGraph();

    // login.js imports authUtils.js
    graph.addDependency('login.js', 'authUtils.js');

    // Forward: what does login.js depend on?
    expect(graph.getDependencies('login.js').has('authUtils.js')).toBe(true);

    // Reverse: what depends on authUtils.js?
    expect(graph.getDependents('authUtils.js').has('login.js')).toBe(true);
  });

  it('handles multiple dependents', () => {
    const graph = new DependencyGraph();

    graph.addDependency('login.js', 'authUtils.js');
    graph.addDependency('user.js', 'authUtils.js');

    const dependents = graph.getDependents('authUtils.js');
    expect(dependents.size).toBe(2);
    expect(dependents.has('login.js')).toBe(true);
    expect(dependents.has('user.js')).toBe(true);
  });

  it('handles cyclic dependencies without errors', () => {
    const graph = new DependencyGraph();

    graph.addDependency('a.js', 'b.js');
    graph.addDependency('b.js', 'a.js');

    expect(graph.getDependencies('a.js').has('b.js')).toBe(true);
    expect(graph.getDependencies('b.js').has('a.js')).toBe(true);
  });
});
