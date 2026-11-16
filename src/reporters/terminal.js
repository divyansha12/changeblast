import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Renders a visually polished terminal report for ChangeBlast.
 * 
 * @param {Object} analysisResult - Output from analyzeImpact()
 * @param {Object} options
 * @param {boolean} [options.explain] - Whether to show detailed dependency impact chains
 * @param {string} [options.projectName] - Optional project title
 */
export function printTerminalReport(analysisResult, options = {}) {
  const {
    changedFiles,
    affectedSourceFiles,
    recommendedTests,
    unrelatedTests,
    summary
  } = analysisResult;

  // 1. Header Banner
  const title = chalk.bold.cyan('CHANGEBLAST') + ' ' + chalk.gray('•') + ' ' + chalk.white('Test Impact Analysis');
  const subtitle = chalk.dim('Know what your code changes affect. Run smarter tests.');
  
  console.log('\n' + boxen(`${title}\n${subtitle}`, {
    padding: { top: 0, bottom: 0, left: 2, right: 2 },
    margin: 0,
    borderStyle: 'round',
    borderColor: 'cyan'
  }));

  // 2. Changed Files Section
  console.log('\n' + chalk.bold.white('📦 CHANGES DETECTED'));
  console.log(chalk.gray('─'.repeat(50)));

  if (changedFiles.length === 0) {
    console.log(chalk.yellow('  No file changes detected in working tree or against base branch.'));
  } else {
    for (const change of changedFiles) {
      let badge = chalk.bgBlue.black(' MOD ');
      if (change.status === 'added') badge = chalk.bgGreen.black(' ADD ');
      if (change.status === 'deleted') badge = chalk.bgRed.white(' DEL ');
      if (change.status === 'renamed') badge = chalk.bgMagenta.black(' REN ');

      console.log(`  ${badge} ${chalk.white(change.path)}`);
    }
  }

  // 3. Impact Overview
  console.log('\n' + chalk.bold.white('🎯 IMPACT SUMMARY'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Affected source modules : ${chalk.yellow.bold(summary.totalAffectedSources)}`);
  console.log(`  Recommended test files  : ${chalk.green.bold(summary.totalRecommendedTests)}`);
  console.log(`  Unrelated test files    : ${chalk.dim(summary.totalUnrelatedTests)}`);
  if (summary.totalProjectTests > 0) {
    console.log(`  Test suite reduction    : ${chalk.cyan.bold(summary.percentageSkipped)} saved`);
  }

  // 4. Recommended Tests Section
  console.log('\n' + chalk.bold.green('🧪 RECOMMENDED TESTS'));
  console.log(chalk.gray('─'.repeat(50)));

  if (recommendedTests.length === 0) {
    console.log(chalk.dim('  No tests affected by these changes.'));
  } else {
    for (const test of recommendedTests) {
      console.log(`  ${chalk.green('✓')} ${chalk.bold.white(test.relativeFile)}`);

      if (options.explain) {
        for (const reason of test.reasons) {
          console.log(`    ${chalk.dim('• Reason:')} ${chalk.yellow(reason)}`);
        }
        for (const chain of test.impactChains) {
          const formattedChain = chain
            .map((item, idx) => {
              if (idx === 0) return chalk.yellow(item);
              if (idx === chain.length - 1) return chalk.green.bold(item);
              return chalk.cyan(item);
            })
            .join(` ${chalk.dim('──▶')} `);
          console.log(`    ${chalk.dim('• Impact Chain:')} ${formattedChain}`);
        }
        console.log('');
      }
    }
  }

  // 5. Unrelated Tests Section
  if (unrelatedTests.length > 0) {
    console.log('\n' + chalk.bold.gray('💤 UNRELATED TESTS (SAFELY SKIPPED)'));
    console.log(chalk.gray('─'.repeat(50)));
    for (const test of unrelatedTests) {
      console.log(`  ${chalk.gray('-')} ${chalk.dim(test)}`);
    }
  }

  console.log('\n' + chalk.gray('─'.repeat(50)));
  if (!options.explain && recommendedTests.length > 0) {
    console.log(chalk.dim('💡 Tip: Run with ') + chalk.cyan('--explain') + chalk.dim(' to inspect full dependency chains.'));
  }
  console.log(chalk.dim('✨ Analysis completed successfully.\n'));
}
