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
  const [ready, setReady] = useState(false);

  // First mount: the parent Plane sets an initial transform; wait one tick
  // before showing to avoid a flash at (0,0,1).
  useEffect(() => {
    setReady(true);
  }, []);

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
        willChange: 'transform',
        opacity: ready ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}
