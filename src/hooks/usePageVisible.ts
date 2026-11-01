import { useEffect, useState } from 'react';

export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

export function maxDpr(): number {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
}
