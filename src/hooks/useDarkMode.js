import { useEffect } from 'react';

/**
 * Forces the light (cream) theme at all times by ensuring `.dark` is never
 * present on <html>, so the app uses the #fcf7f6 background on every device.
 */
export function useDarkMode() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
}