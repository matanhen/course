import { useEffect } from 'react';

/**
 * Syncs Tailwind's `.dark` class on <html> with the OS prefers-color-scheme.
 * Android always uses dark mode (mandatory requirement). iOS and web respect
 * the system preference.
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

    const isAndroid =
      typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

    if (isAndroid) {
      applyScheme(true);
      return;
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyScheme(mq.matches);

    const handler = (e) => applyScheme(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
}