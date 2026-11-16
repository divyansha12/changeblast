import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import chalk from 'chalk';

/**
 * Detects whether the project uses Vitest or Jest.
 * @param {string} rootDir 
 * @returns {'vitest' | 'jest'}
 */
export function detectTestFramework(rootDir = process.cwd()) {
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.vitest) return 'vitest';
      if (deps.jest) return 'jest';
    } catch {
      // Fallback
    }
  }

  // Check lockfiles or config files
  if (
    fs.existsSync(path.join(rootDir, 'vitest.config.ts')) ||
    fs.existsSync(path.join(rootDir, 'vitest.config.js'))
  ) {
    return 'vitest';
  }

  if (
    fs.existsSync(path.join(rootDir, 'jest.config.ts')) ||
    fs.existsSync(path.join(rootDir, 'jest.config.js'))
  ) {
    return 'jest';
  }

  return 'vitest'; // Default to vitest
}

/**
 * Executes the recommended tests using the detected or configured test runner.
 * 
 * @param {string[]} testFilePaths - List of test file paths relative to rootDir
 * @param {Object} options
 * @param {string} [options.framework] - 'vitest' | 'jest' | 'auto'
 * @param {string} [options.rootDir] - Root directory
 * @param {string} [options.customCommand] - Custom execution command template
 * @returns {Promise<number>} Exit code
 */
export function executeTests(testFilePaths, options = {}) {
  const rootDir = options.rootDir || process.cwd();

  if (!testFilePaths || testFilePaths.length === 0) {
    console.log(chalk.yellow('\nℹ No tests to execute. Your changes do not affect any known test files.\n'));
    return Promise.resolve(0);
  }

  let framework = options.framework;
  if (!framework || framework === 'auto') {
    framework = detectTestFramework(rootDir);
  }

  let command;
  let args;

  if (options.customCommand) {
    const parts = options.customCommand.split(' ');
    command = parts[0];
    args = [...parts.slice(1), ...testFilePaths];
  } else if (framework === 'vitest') {
    command = 'npx';
    args = ['vitest', 'run', ...testFilePaths];
  } else if (framework === 'jest') {
    command = 'npx';
    args = ['jest', ...testFilePaths];
  } else {
    command = 'npx';
    args = ['vitest', 'run', ...testFilePaths];
  }

  console.log(chalk.bold.cyan(`\n🚀 Executing ${testFilePaths.length} recommended test(s) via ${framework}:`));
  console.log(chalk.dim(`$ ${command} ${args.join(' ')}\n`));

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: isWindows
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`\n❌ Failed to spawn test runner: ${err.message}`));
      resolve(1);
    });
  });
}
