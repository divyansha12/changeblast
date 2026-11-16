import path from 'node:path';
import { normalizePath, toRelativePath } from '../utils/file-utils.js';
import { findConventionalTestsForFile } from '../analyzer/test-discovery.js';

/**
 * Analyzes the transitive impact of changed files using the dependency graph.
 * 
 * Traverses reverse dependents using Breadth-First Search (BFS) to identify:
 * 1. Directly and transitively affected source files.
 * 2. Directly and transitively affected test files.
 * 3. Exact dependency impact chains for full explainability.
 * 
 * @param {Object} params
 * @param {Array<{ path: string, status?: string }>} params.changedFiles
 * @param {import('../analyzer/dependency-graph.js').DependencyGraph} params.graph
 * @param {string[]} params.allTestFiles - Absolute paths of all test files.
 * @param {string} params.rootDir - Project root directory.
 * @returns {Object} Structured impact analysis result.
 */
export function analyzeImpact({ changedFiles, graph, allTestFiles, rootDir }) {
  const testFileSet = new Set(allTestFiles.map(f => normalizePath(f)));
  const affectedSourceFiles = new Set();
  const testImpactMap = new Map(); // testFile -> { reasons: Set<string>, chains: Array<string[]> }

  // Normalize changed files into absolute paths
  const resolvedChanged = changedFiles.map(cf => {
    const absPath = path.isAbsolute(cf.path) ? cf.path : path.resolve(rootDir, cf.path);
    return {
      absPath: normalizePath(absPath),
      relativePath: toRelativePath(rootDir, absPath),
      status: cf.status || 'modified'
    };
  });

  for (const changed of resolvedChanged) {
    const startFile = changed.absPath;
    const relStart = changed.relativePath;

    // Case 1: The modified file is itself a test file
    if (testFileSet.has(startFile)) {
      if (!testImpactMap.has(startFile)) {
        testImpactMap.set(startFile, { reasons: new Set(), chains: [] });
      }
      const record = testImpactMap.get(startFile);
      record.reasons.add(`Test file was directly ${changed.status}`);
      record.chains.push([relStart]);
      continue;
    }

    // Case 2: Source file modified -> BFS on reverse dependents
    // Queue stores: { currentFile, chainSoFar }
    const queue = [{ current: startFile, chain: [relStart] }];
    const visitedInThisRun = new Set([startFile]);

    while (queue.length > 0) {
      const { current, chain } = queue.shift();
      const dependents = graph.getDependents(current);

      for (const dependent of dependents) {
        if (visitedInThisRun.has(dependent)) {
          continue; // Cycle detection / already visited in this traversal
        }
        visitedInThisRun.add(dependent);

        const relDep = toRelativePath(rootDir, dependent);
        const newChain = [...chain, relDep];

        if (testImpactSetOrFile(testFileSet, dependent)) {
          // Reached a test file!
          if (!testImpactMap.has(dependent)) {
            testImpactMap.set(dependent, { reasons: new Set(), chains: [] });
          }
          const record = testImpactMap.get(dependent);
          const hops = newChain.length - 1;
          const reasonText = hops === 1
            ? `Directly imports modified file: ${relStart}`
            : `Transitively imports ${relStart} (${hops} hops away)`;
          
          record.reasons.add(reasonText);
          record.chains.push(newChain);
        } else {
          // It's another source module affected by the change
          affectedSourceFiles.add(dependent);
          queue.push({ current: dependent, chain: newChain });
        }
      }
    }

    // Safety fallback: Conventional naming match (e.g. user.js -> user.test.js)
    const conventionalTests = findConventionalTestsForFile(startFile, allTestFiles, rootDir);
    for (const convTest of conventionalTests) {
      const normConv = normalizePath(convTest);
      const relConv = toRelativePath(rootDir, convTest);
      if (!testImpactMap.has(normConv)) {
        testImpactMap.set(normConv, {
          reasons: new Set([`Conventional test match for modified file: ${relStart}`]),
          chains: [[relStart, `(convention) -> ${relConv}`]]
        });
      }
    }
  }

  // Format recommended tests
  const recommendedTests = [];
  for (const [absTestFile, info] of testImpactMap.entries()) {
    recommendedTests.push({
      file: absTestFile,
      relativeFile: toRelativePath(rootDir, absTestFile),
      reasons: Array.from(info.reasons),
      impactChains: info.chains
    });
  }

  // Identify unrelated tests (all known tests NOT in recommended)
  const recommendedSet = new Set(recommendedTests.map(t => t.file));
  const unrelatedTests = allTestFiles
    .map(f => normalizePath(f))
    .filter(f => !recommendedSet.has(f))
    .map(f => toRelativePath(rootDir, f));

  // Compute metrics
  const totalTests = allTestFiles.length;
  const skippedCount = unrelatedTests.length;
  const percentageSkipped = totalTests > 0
    ? `${((skippedCount / totalTests) * 100).toFixed(1)}%`
    : '0%';

  return {
    changedFiles: resolvedChanged.map(c => ({ path: c.relativePath, status: c.status })),
    affectedSourceFiles: Array.from(affectedSourceFiles).map(f => toRelativePath(rootDir, f)),
    recommendedTests,
    unrelatedTests,
    summary: {
      totalChangedFiles: resolvedChanged.length,
      totalAffectedSources: affectedSourceFiles.size,
      totalRecommendedTests: recommendedTests.length,
      totalUnrelatedTests: unrelatedTests.length,
      totalProjectTests: totalTests,
      percentageSkipped
    }
  };
}

function testImpactSetOrFile(testSet, filePath) {
  return testSet.has(normalizePath(filePath));
}
