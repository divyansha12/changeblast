import { describe, it, expect } from 'vitest';
import { getProfile } from '../src/users/profile.js';

describe('profile', () => {
  it('loads profile for user', () => {
    const prof = getProfile({ id: 10, name: 'Alice', active: true, token: 'bearer_123' });
    expect(prof.bio).toBeDefined();
    expect(prof.name).toBe('Alice');
  });
});
