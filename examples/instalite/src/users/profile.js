import { getUser } from './user.js';

export function getProfile(user) {
  const u = getUser(user);
  return {
    ...u,
    bio: 'Software engineer building cool things.'
  };
}
