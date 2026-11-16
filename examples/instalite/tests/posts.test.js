import { describe, it, expect } from 'vitest';
import { createPost } from '../src/posts/posts.js';

describe('posts', () => {
  it('creates a new post', () => {
    const post = createPost('Hello World', 'First post content');
    expect(post.title).toBe('Hello World');
    expect(post.likes).toBe(0);
  });
});
