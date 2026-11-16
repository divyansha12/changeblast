import { describe, it, expect } from 'vitest';
import { loadConfig, generateInitialConfigContent, DEFAULT_CONFIG } from '../../src/config/config-loader.js';

describe('Config Loader', () => {
  it('returns default config when no config file exists', async () => {
    const config = await loadConfig('/tmp');
    expect(config.testFramework).toBe('auto');
    expect(config.exclude).toEqual(DEFAULT_CONFIG.exclude);
    expect(config.testPatterns).toEqual(DEFAULT_CONFIG.testPatterns);
  });

  it('generates valid initial config file content with export default', () => {
    const content = generateInitialConfigContent();
    expect(content).toContain('export default');
    expect(content).toContain('testFramework');
    expect(content).toContain('testPatterns');
  });
});
