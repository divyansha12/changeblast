import { describe, it, expect } from 'vitest';
import { validateToken, isAuthenticated } from '../src/auth/authUtils.js';

describe('authUtils', () => {
  it('validates bearer token', () => {
    expect(validateToken('bearer_123')).toBe(true);
    expect(validateToken('invalid')).toBe(false);
  });

  it('checks user authentication', () => {
    expect(isAuthenticated({ active: true, token: 'xyz' })).toBe(true);
    expect(isAuthenticated(null)).toBe(false);
  });
});
