import path from 'node:path';
import { getChangedFiles } from './git/changed-files.js';
import { scanProject } from './scanner/project-scanner.js';
import { parseFileDependencies } from './analyzer/parser.js';
import { DependencyGraph } from './analyzer/dependency-graph.js';
import { analyzeImpact } from './impact/impact-analyzer.js';
import { loadConfig } from './config/config-loader.js';

export { DependencyGraph } from './analyzer/dependency-graph.js';
export { scanProject } from './scanner/project-scanner.js';
export { parseFileDependencies } from './analyzer/parser.js';
export { analyzeImpact } from './impact/impact-analyzer.js';
export { getChangedFiles } from './git/changed-files.js';
export { loadConfig } from './config/config-loader.js';
export { executeTests } from './runner/test-runner.js';

/**
 * Runs full ChangeBlast test impact analysis.
 * 
 * 1. Loads configuration
 * 2. Detects modified files via Git
 * 3. Scans all project JS/TS files
 * 4. Extracts AST dependencies and builds the DependencyGraph
 * 5. Runs transitive BFS impact analysis
 * 
 * @param {Object} options
 * @param {string} [options.cwd] - Target project root directory
 * @param {string} [options.base] - Git base branch/ref to compare against
 * @param {boolean} [options.stagedOnly] - Check only staged Git changes
 * @param {string[]} [options.changedFiles] - Explicit list of changed files (bypasses Git)
 * @returns {Promise<Object>}
 */
export async function runAnalysis(options = {}) {
  const rootDir = path.resolve(options.cwd || process.cwd());
  const config = await loadConfig(rootDir);

  // 1. Detect changed files
  let changes = [];
  if (options.changedFiles && options.changedFiles.length > 0) {
    changes = options.changedFiles.map(f => ({ path: f, status: 'modified' }));
  } else {
    changes = getChangedFiles({
      cwd: rootDir,
      base: options.base,
      stagedOnly: options.stagedOnly
    });
  }

  // 2. Discover project files
  const { sourceFiles, testFiles, allFiles } = scanProject(rootDir, {
    exclude: config.exclude,
    testPatterns: config.testPatterns
  });

  // 3. Build the Dependency Graph using TypeScript AST
  const graph = new DependencyGraph();
  const warnings = [];

  // Register all nodes
  for (const file of allFiles) {
    graph.addNode(file);
  }

  // Parse dependencies for all files
  for (const file of allFiles) {
    const { resolvedDependencies, unsupportedPatterns } = parseFileDependencies(file, rootDir);
    for (const dep of resolvedDependencies) {
      graph.addDependency(file, dep);
    }
    if (unsupportedPatterns && unsupportedPatterns.length > 0) {
      for (const pattern of unsupportedPatterns) {
        warnings.push({
          file: path.relative(rootDir, file),
          warning: pattern
        });
      }
    }
  }

  // 4. Run Impact Analysis
  const analysisResult = analyzeImpact({
    changedFiles: changes,
    graph,
    allTestFiles: testFiles,
    rootDir
  });

  return {
    ...analysisResult,
    warnings,
    config,
    rootDir
  };
}
