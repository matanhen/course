import { useEffect } from 'react';

/**
 * Syncs Tailwind's `.dark` class on <html> with the OS prefers-color-scheme.
 * This app is already dark-themed, but this hook ensures the Tailwind dark
 * variants respond correctly to the iOS/Android system setting.
 */
export function useDarkMode() {
  useEffect(() => {
    const applyScheme = (dark) => {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyScheme(mq.matches);

    const handler = (e) => applyScheme(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
}