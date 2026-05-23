import type { Transition } from 'framer-motion';

/** Functional transitions only — never ambient. */
export const motion: Record<'crossfade' | 'emerge' | 'micro' | 'flyto', Transition> = {
  crossfade: { duration: 0.22, ease: 'easeOut' },
  emerge: { duration: 0.28, ease: 'easeOut' },
  micro: { duration: 0.18, ease: 'easeOut' },
  flyto: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
