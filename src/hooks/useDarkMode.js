import { useEffect } from 'react';

/**
 * Syncs the app theme with the OS color scheme. Adds the `dark` class to
 * <html> when the system prefers dark mode, and removes it otherwise.
 * Defaults to light mode when no preference is reported.
 */
export function useDarkMode() {
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (isDark) => {
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply(mql.matches);
    const handler = (event) => apply(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
}