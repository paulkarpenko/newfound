import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import { allClauses, corpusBounds, useMerged } from '@/lib/dataAccess';
import { densityBucket, densityColor } from '@/lib/density';
import { useNewfound } from '@/state/useNewfound';

interface MinimapProps {
  zoomRef: { behavior: ZoomBehavior<HTMLDivElement, unknown> | null; element: HTMLDivElement | null };
}

const MAP_WIDTH = 96;
const MAP_HEIGHT = 220;

/**
 * A small map showing the whole corpus with each clause as a thin block
 * tinted by its annotation density. Overlaid is the viewport rectangle
 * (in world space → minimap space). Clicking flies the viewport.
 */
export default function Minimap({ zoomRef }: MinimapProps) {
  const transform = useNewfound((s) => s.transform);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = zoomRef.element;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setViewport({ width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [zoomRef.element]);

  const bounds = corpusBounds();
  const scaleX = MAP_WIDTH / bounds.width;
  const scaleY = MAP_HEIGHT / bounds.height;
  const scale = Math.min(scaleX, scaleY);
  // World-space top-left where the minimap origin sits.
  const offsetX = (MAP_WIDTH - bounds.width * scale) / 2 - bounds.x * scale;
  const offsetY = 0 - bounds.y * scale;

  // Compute the visible-world rect, then map to minimap pixels.
  const visW = viewport.width / transform.k;
  const visH = viewport.height / transform.k;
  const visX = -transform.x / transform.k;
  const visY = -transform.y / transform.k;

  const vpRect = {
    x: offsetX + visX * scale,
    y: offsetY + visY * scale,
    w: visW * scale,
    h: visH * scale,
  };

  const merged = useMerged();
  const max = merged.maxClauseCount;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!zoomRef.element || !zoomRef.behavior) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // Reverse the mapping to world coords.
    const wx = (px - offsetX) / scale;
    const wy = (py - offsetY) / scale;
    const k = transform.k;
    const tx = viewport.width / 2 - wx * k;
    const ty = viewport.height / 2 - wy * k;
    select(zoomRef.element)
      .transition()
      .duration(380)
      .ease(easeCubicInOut)
      .call(zoomRef.behavior.transform as never, zoomIdentity.translate(tx, ty).scale(k));
  };

  return (
    <div
      ref={containerRef}
      data-no-pan
      role="region"
      aria-label="Minimap of the corpus"
      onPointerDown={onPointerDown}
      className="pointer-events-auto absolute bottom-4 right-4 z-30"
      style={{
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: 'crosshair',
      }}
    >
      <svg width={MAP_WIDTH} height={MAP_HEIGHT}>
        {/* Clause blocks tinted by density. */}
        {allClauses().map((c) => {
          const count = merged.clauseAnnotationCount(c.id);
          const bucket = densityBucket(count, max);
          return (
            <rect
              key={c.id}
              x={offsetX + c.world.x * scale}
              y={offsetY + c.world.y * scale}
              width={c.world.width * scale}
              height={c.world.height * scale}
              fill={densityColor(bucket)}
              fillOpacity={bucket === 0 ? 0.45 : 0.9}
            />
          );
        })}
        {/* Viewport rectangle. */}
        <rect
          x={vpRect.x}
          y={vpRect.y}
          width={vpRect.w}
          height={vpRect.h}
          fill="none"
          stroke="var(--nf-focus)"
          strokeWidth={1.5}
          strokeOpacity={0.85}
        />
      </svg>
    </div>
  );
}
