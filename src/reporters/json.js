/**
 * Outputs the impact analysis results as formatted JSON.
 * Ideal for CI/CD pipelines, GitHub Actions, and script consumption.
 * 
 * @param {Object} analysisResult 
 * @param {Object} [options]
 */
export function printJsonReport(analysisResult, options = {}) {
  const jsonOutput = {
    changeblastVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    ...analysisResult
  };

  const formatted = JSON.stringify(jsonOutput, null, 2);
  console.log(formatted);
  return formatted;
}
