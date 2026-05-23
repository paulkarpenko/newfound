import { useEffect, useState, type ReactNode } from 'react';
import { useNewfound } from '@/state/useNewfound';

interface WorldProps {
  children: ReactNode;
}

/**
 * The single transformed inner layer. Pan/zoom mutates only this element's
 * CSS transform — never re-layouts the text inside.
 *
 * We read transform from the store. d3-zoom drives the store via usePlaneZoom.
 *
 * Selecting the transform via subscribeWithSelector would be ideal for the
 * tightest update path; for v1 we let React reconcile — well within budget at
 * a ~7,500-word corpus.
 */
export default function World({ children }: WorldProps) {
  const transform = useNewfound((s) => s.transform);
  const interacting = useNewfound((s) => s.interacting);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // `will-change: transform` promotes the world into its own GPU layer for
  // smooth panning, but the compositor rasterizes that layer once at the
  // layer's natural size and then scales the cached bitmap — so text turns
  // blurry above 1× zoom. We toggle the hint: on during active interaction
  // (so pan/zoom stays smooth) and off when idle (so the browser re-paints
  // text at the actual scale and stays crisp).
  return (
    <div
      id="world"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        transformOrigin: '0 0',
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
        willChange: interacting ? 'transform' : 'auto',
        opacity: ready ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}
