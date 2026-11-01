import { useEffect, useState } from 'react';
import type { Settings } from '../persistence/repository';

export function useReducedMotion(pref: Settings['reducedMotion']): boolean {
  const [system, setSystem] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return pref === 'on' ? true : pref === 'off' ? false : system;
}
