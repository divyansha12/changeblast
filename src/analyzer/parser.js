import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { resolveImportPath } from '../utils/file-utils.js';

/**
 * Determines TypeScript ScriptKind based on file extension.
 * @param {string} filePath 
 * @returns {ts.ScriptKind}
 */
function getScriptKind(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    default:
      return ts.ScriptKind.Unknown;
  }
}

/**
 * Parses a JavaScript or TypeScript file and extracts all local dependencies.
 * 
 * Supports:
 * - ES6 static imports (named, default, namespace, side-effect)
 * - ES6 re-exports (export ... from './foo')
 * - CommonJS require calls (require('./foo'))
 * - Dynamic import calls (import('./foo'))
 * 
 * @param {string} filePath - Absolute path of the file to parse.
 * @param {string} rootDir - Root directory of the project.
 * @returns {{
 *   filePath: string,
 *   resolvedDependencies: string[],
 *   rawImports: string[],
 *   hasDynamicImports: boolean
 * }}
 */
export function parseFileDependencies(filePath, rootDir) {
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return {
      filePath,
      resolvedDependencies: [],
      rawImports: [],
      hasDynamicImports: false
    };
  }

  const scriptKind = getScriptKind(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
    scriptKind
  );

  const rawImports = [];
  const resolvedDependencies = new Set();
  const unsupportedPatterns = [];
  let hasDynamicImports = false;

  function handleSpecifier(specifier) {
    if (typeof specifier !== 'string') return;
    rawImports.push(specifier);

    const resolved = resolveImportPath(filePath, specifier, rootDir);
    if (resolved) {
      resolvedDependencies.add(resolved);
    }
  }

  function walk(node) {
    // 1. Static Import Declaration: import ... from './foo'
    if (ts.isImportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        handleSpecifier(node.moduleSpecifier.text);
      }
    }

    // 2. Export Declaration with Module Specifier: export { x } from './foo'
    else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        handleSpecifier(node.moduleSpecifier.text);
      }
    }

    // 3. Dynamic Import or require() calls
    else if (ts.isCallExpression(node)) {
      // Dynamic import: import('./foo') or import(variable)
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        hasDynamicImports = true;
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          handleSpecifier(arg.text);
        } else {
          unsupportedPatterns.push('Dynamic import with non-literal expression');
        }
      }
      // CommonJS require: require('./foo') or require(variable)
      else if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require'
      ) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          handleSpecifier(arg.text);
        } else if (arg) {
          unsupportedPatterns.push('CommonJS require with non-literal expression');
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(sourceFile);

  return {
    filePath,
    resolvedDependencies: Array.from(resolvedDependencies),
    rawImports,
    hasDynamicImports,
    unsupportedPatterns
  };
}
