import { zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import type { WorldRect } from './types';
import { prefersReducedMotion } from '@/motion/tokens';

interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Compute the zoom transform that fits a world-space rect into the viewport,
 * with padding. Used for "fit corpus" and fly-to-clause.
 */
export function fitTransform(
  rect: WorldRect,
  viewport: ViewportSize,
  pad = 80,
): { x: number; y: number; k: number } {
  const availW = Math.max(1, viewport.width - pad * 2);
  const availH = Math.max(1, viewport.height - pad * 2);
  const k = Math.min(availW / rect.width, availH / rect.height);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    x: viewport.width / 2 - cx * k,
    y: viewport.height / 2 - cy * k,
    k,
  };
}

/**
 * Compute the transform that centers a world-space point at a given scale.
 * Used when flying to a clause at "reading zoom".
 */
export function centerOn(
  worldPoint: { x: number; y: number },
  viewport: ViewportSize,
  k: number,
): { x: number; y: number; k: number } {
  return {
    x: viewport.width / 2 - worldPoint.x * k,
    y: viewport.height / 2 - worldPoint.y * k,
    k,
  };
}

/**
 * Animate d3-zoom to a target transform.
 * Respects prefers-reduced-motion — instant under that setting.
 */
export function flyTo<TElement extends Element>(
  element: TElement,
  behavior: ZoomBehavior<TElement, unknown>,
  target: { x: number; y: number; k: number },
  durationMs = 500,
): void {
  const t: ZoomTransform = zoomIdentity.translate(target.x, target.y).scale(target.k);
  const sel = select(element);
  if (prefersReducedMotion()) {
    behavior.transform(sel, t);
    return;
  }
  // d3-transition extends d3-selection's prototype with .transition().
  sel
    .transition()
    .duration(durationMs)
    .ease(easeCubicInOut)
    .call(behavior.transform as never, t);
}
