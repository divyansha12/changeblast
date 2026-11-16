import { normalizePath } from '../utils/file-utils.js';

/**
 * Bi-directional Dependency Graph.
 * 
 * Tracks both:
 * 1. Forward dependencies (what does file A import?)
 * 2. Reverse dependents (what files import file A?)
 * 
 * Reverse dependents are crucial for Test Impact Analysis:
 * When file A changes, we traverse its dependents backwards to discover
 * all affected modules and tests.
 */
export class DependencyGraph {
  constructor() {
    /** @type {Set<string>} */
    this.nodes = new Set();

    /** @type {Map<string, Set<string>>} Forward: file -> files it imports */
    this.dependencies = new Map();

    /** @type {Map<string, Set<string>>} Reverse: file -> files that import it */
    this.dependents = new Map();
  }

  /**
   * Adds a node (file) to the graph.
   * @param {string} file 
   */
  addNode(file) {
    const norm = normalizePath(file);
    if (!this.nodes.has(norm)) {
      this.nodes.add(norm);
      this.dependencies.set(norm, new Set());
      this.dependents.set(norm, new Set());
    }
  }

  /**
   * Adds a directed dependency edge: `fromFile` imports `toFile`.
   * Automatically updates reverse dependents: `toFile` is imported by `fromFile`.
   * 
   * @param {string} fromFile 
   * @param {string} toFile 
   */
  addDependency(fromFile, toFile) {
    const normFrom = normalizePath(fromFile);
    const normTo = normalizePath(toFile);

    this.addNode(normFrom);
    this.addNode(normTo);

    this.dependencies.get(normFrom).add(normTo);
    this.dependents.get(normTo).add(normFrom);
  }

  /**
   * Returns the set of files directly imported by `file`.
   * @param {string} file 
   * @returns {Set<string>}
   */
  getDependencies(file) {
    const norm = normalizePath(file);
    return this.dependencies.get(norm) || new Set();
  }

  /**
   * Returns the set of files that directly import `file`.
   * @param {string} file 
   * @returns {Set<string>}
   */
  getDependents(file) {
    const norm = normalizePath(file);
    return this.dependents.get(norm) || new Set();
  }

  /**
   * Checks if a file exists in the graph.
   * @param {string} file 
   * @returns {boolean}
   */
  hasNode(file) {
    return this.nodes.has(normalizePath(file));
  }

  /**
   * Total number of nodes (files) in the graph.
   * @returns {number}
   */
  getNodeCount() {
    return this.nodes.size;
  }

  /**
   * Total number of dependency relationships (edges) in the graph.
   * @returns {number}
   */
  getEdgeCount() {
    let count = 0;
    for (const deps of this.dependencies.values()) {
      count += deps.size;
    }
    return count;
  }

  /**
   * Exports the graph to a serializable object.
   */
  toJSON() {
    const forwardObj = {};
    const reverseObj = {};

    for (const [key, set] of this.dependencies.entries()) {
      forwardObj[key] = Array.from(set);
    }
    for (const [key, set] of this.dependents.entries()) {
      reverseObj[key] = Array.from(set);
    }

    return {
      nodes: Array.from(this.nodes),
      dependencies: forwardObj,
      dependents: reverseObj
    };
  }
}
