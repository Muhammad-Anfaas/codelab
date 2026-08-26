// Deliberately simple: the backend will do the authoritative validation.
// This only catches obvious typos before a request is made.
export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
