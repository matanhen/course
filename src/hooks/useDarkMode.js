import { useEffect } from 'react';

/**
 * Forces Tailwind's `.dark` class on <html> at all times so the app always
 * uses the black background theme on every device.
 */
export function useDarkMode() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
}