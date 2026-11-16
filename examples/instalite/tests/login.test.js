import { describe, it, expect } from 'vitest';
import { login } from '../src/auth/login.js';

describe('login', () => {
  it('logs in user successfully', () => {
    const res = login('alice', 'secret', 'bearer_123');
    expect(res.loggedIn).toBe(true);
  });

  it('fails with invalid token', () => {
    expect(() => login('alice', 'secret', 'bad_token')).toThrow('Invalid authentication token');
  });
});
