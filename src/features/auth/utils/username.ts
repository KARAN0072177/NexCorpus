const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_REGEX.test(username);
}