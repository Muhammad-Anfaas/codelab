import { useEffect, useState } from 'react';

const STORAGE_KEY = 'codelab-theme';

// Some browsers/privacy settings block localStorage entirely and THROW on
// access. The theme is a nicety, so every storage call is wrapped: if
// storage is unavailable we just fall back to the light theme.
function readSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked — the theme simply won't persist across reloads.
  }
}

function getInitialTheme() {
  const saved = readSavedTheme();
  if (saved === 'light' || saved === 'dark') return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Light/dark theme. Applied as <html data-theme="…">, which index.css
 * reacts to. The choice is remembered in localStorage when available.
 * (index.html also sets the attribute before React loads, to avoid a flash.)
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggleTheme };
}
