import { describe, it, expect } from 'vitest';
import { getUser } from '../src/users/user.js';

describe('user', () => {
  it('retrieves user for authenticated account', () => {
    const u = getUser({ id: 10, name: 'Alice', active: true, token: 'bearer_123' });
    expect(u.name).toBe('Alice');
  });

  it('throws for unauthenticated account', () => {
    expect(() => getUser({ id: 10, name: 'Alice', active: false })).toThrow('Unauthorized');
  });
});
