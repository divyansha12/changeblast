import { validateToken } from './authUtils.js';

export function login(username, password, token) {
  if (!username || !password) {
    throw new Error('Invalid credentials');
  }
  if (!validateToken(token)) {
    throw new Error('Invalid authentication token');
  }
  return { username, loggedIn: true };
}
