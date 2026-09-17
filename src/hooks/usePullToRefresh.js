import { useState, useEffect, useRef } from 'react';

/**
 * Reusable pull-to-refresh hook.
 * @param {Function} onRefresh - async/sync callback invoked when the user pulls past the threshold.
 * @returns {{ pullDistance: number, isRefreshing: boolean }}
 */
export function usePullToRefresh(onRefresh) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { pullDistanceRef.current = pullDistance; }, [pullDistance]);

  useEffect(() => {
    const el = document.documentElement;

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (touchStartY.current === null) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && el.scrollTop === 0) {
        setPullDistance(Math.min(delta * 0.4, 70));
      }
    };

    const onTouchEnd = async () => {
      if (pullDistanceRef.current > 50) {
        setIsRefreshing(true);
        try {
          await onRefreshRef.current?.();
        } finally {
          setTimeout(() => setIsRefreshing(false), 800);
        }
      }
      setPullDistance(0);
      touchStartY.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return { pullDistance, isRefreshing };
}