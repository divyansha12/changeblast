import { isAuthenticated } from '../auth/authUtils.js';

export function getUser(user) {
  if (!isAuthenticated(user)) {
    throw new Error('Unauthorized');
  }
  return { id: user.id, name: user.name };
}
