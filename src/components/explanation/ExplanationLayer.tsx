import { useEffect, useMemo } from 'react';
import { corpusBounds } from '@/lib/dataAccess';
import { useNewfound } from '@/state/useNewfound';
import ExplanationPanel from './ExplanationPanel';
import { layoutExplanations } from './explanationLayout';

const PANEL_HEIGHT = 440; // estimate used for lane stacking
const PANEL_GAP = 14;

/**
 * Plural layer for selection-explain panels. Reads every open
 * explanation from the store, packs them into lanes adjacent to their
 * clauses (same spatial rules as annotation panels), and renders one
 * positioned ExplanationPanel per entry plus a shared SVG holding all
 * the leader lines.
 *
 * Lives inside the World transform — pan/zoom moves the panels with
 * the text, like everything else in the plane.
 */
export default function ExplanationLayer() {
  const explanations = useNewfound((s) => s.explanations);
  const closeAll = useNewfound((s) => s.closeAllExplanations);
  const k = useNewfound((s) => s.transform.k);

  const laidOut = useMemo(
    () => layoutExplanations({ explanations, panelHeight: PANEL_HEIGHT, gap: PANEL_GAP }),
    [explanations],
  );

  // ESC closes them all — multi-panel makes "close the focused one" ambiguous,
  // so the bulk action is the predictable affordance.
  useEffect(() => {
    if (explanations.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [explanations.size, closeAll]);

  if (explanations.size === 0) return null;
  const bounds = corpusBounds();
  const strokePx = 1.25 / Math.max(0.001, k);
  const dotR = 2.5 / Math.max(0.001, k);

  return (
    <>
      {/* Shared SVG carrying all leader lines. One per panel; each
          connects its selection anchor to the nearest panel edge. */}
      <svg
        width={bounds.width}
        height={bounds.height + 800}
        style={{
          position: 'absolute',
          left: bounds.x,
          top: 0,
          pointerEvents: 'none',
          zIndex: 7,
          overflow: 'visible',
        }}
        aria-hidden
      >
        {laidOut.map((p) => {
          const ax = p.anchor.x - bounds.x;
          const ay = p.anchor.y;
          const bx =
            (p.side === 'left' ? p.x + p.width : p.x) - bounds.x;
          const by = p.y + PANEL_HEIGHT / 2;
          const cx = p.side === 'left' ? (ax + bx) / 2 - 40 : (ax + bx) / 2 + 40;
          const cy = (ay + by) / 2;
          const d = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
          return (
            <g key={p.id}>
              <path
                d={d}
                fill="none"
                stroke="var(--nf-focus)"
                strokeWidth={strokePx * 1.4}
                strokeOpacity={0.7}
              />
              <circle cx={ax} cy={ay} r={dotR} fill="var(--nf-focus)" />
            </g>
          );
        })}
      </svg>

      {laidOut.map((p) => {
        const explanation = explanations.get(p.id);
        if (!explanation) return null;
        return (
          <ExplanationPanel
            key={p.id}
            explanation={explanation}
            x={p.x}
            y={p.y}
            width={p.width}
          />
        );
      })}
    </>
  );
}
