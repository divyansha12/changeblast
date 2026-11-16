export function validateToken(token) {
  return Boolean(token && token.startsWith('bearer_'));
}

export function isAuthenticated(user) {
  return Boolean(user && user.active && user.token);
}
