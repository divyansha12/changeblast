import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { runAnalysis } from '../index.js';
import { printTerminalReport } from '../reporters/terminal.js';
import { printJsonReport } from '../reporters/json.js';
import { generateInitialConfigContent } from '../config/config-loader.js';
import { executeTests } from '../runner/test-runner.js';

export function createCLI() {
  const program = new Command();

  program
    .name('changeblast')
    .description('Know what your code changes affect. Run smarter tests with AST-based test impact analysis.')
    .version('1.0.0');

  // Command: analyze
  program
    .command('analyze')
    .description('Analyze modified code and report affected tests')
    .option('-b, --base <branch>', 'Git base branch or commit to compare against (e.g. main, origin/main)')
    .option('-s, --staged', 'Only analyze staged Git changes', false)
    .option('-e, --explain', 'Show detailed dependency impact chains explaining why each test was selected', false)
    .option('-j, --json', 'Output results in JSON format for CI/CD consumption', false)
    .option('-c, --cwd <dir>', 'Project root directory to analyze', process.cwd())
    .action(async (options) => {
      try {
        const result = await runAnalysis({
          cwd: options.cwd,
          base: options.base,
          stagedOnly: options.staged
        });

        if (options.json) {
          printJsonReport(result);
        } else {
          printTerminalReport(result, { explain: options.explain });
        }
      } catch (err) {
        console.error(chalk.red(`\n❌ ChangeBlast Error: ${err.message}\n`));
        process.exit(1);
      }
    });

  // Command: run
  program
    .command('run')
    .description('Analyze changes and automatically execute the recommended tests')
    .option('-b, --base <branch>', 'Git base branch or commit to compare against')
    .option('-s, --staged', 'Only analyze staged Git changes', false)
    .option('-e, --explain', 'Show detailed dependency impact chains before execution', false)
    .option('-f, --framework <framework>', 'Test runner framework ("vitest" | "jest" | "auto")')
    .option('-c, --cwd <dir>', 'Project root directory', process.cwd())
    .action(async (options) => {
      try {
        const result = await runAnalysis({
          cwd: options.cwd,
          base: options.base,
          stagedOnly: options.staged
        });

        // Always print terminal report
        printTerminalReport(result, { explain: options.explain });

        const recommendedFiles = result.recommendedTests.map(t => t.relativeFile);
        const exitCode = await executeTests(recommendedFiles, {
          rootDir: result.rootDir,
          framework: options.framework || result.config.testFramework,
          customCommand: result.config.runCommand
        });

        process.exit(exitCode);
      } catch (err) {
        console.error(chalk.red(`\n❌ ChangeBlast Error: ${err.message}\n`));
        process.exit(1);
      }
    });

  // Command: init
  program
    .command('init')
    .description('Initialize a changeblast.config.js configuration file')
    .option('-c, --cwd <dir>', 'Directory to initialize config in', process.cwd())
    .action((options) => {
      const targetPath = path.join(options.cwd, 'changeblast.config.js');
      if (fs.existsSync(targetPath)) {
        console.log(chalk.yellow(`\n⚠️  Configuration file already exists at: ${targetPath}\n`));
        return;
      }

      fs.writeFileSync(targetPath, generateInitialConfigContent(), 'utf-8');
      console.log(chalk.green(`\n✅ Created ChangeBlast configuration at: ${chalk.bold('changeblast.config.js')}\n`));
    });

  // Default action if no subcommand is given
  program.action(() => {
    program.help();
  });

  return program;
}
