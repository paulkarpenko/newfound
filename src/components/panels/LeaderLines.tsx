import { useNewfound } from '@/state/useNewfound';
import { corpusBounds } from '@/lib/selectors';
import { useSpanPositions } from '@/state/useSpanPositions';
import type { LaidOutPanel } from './panelLayout';

interface LeaderLinesProps {
  laidOut: LaidOutPanel[];
  panelHeight: number;
  hidden?: boolean;
}

/**
 * SVG layer inside #world. One thin curve per panel from the *span's actual
 * DOM position* (recorded in useSpanPositions when each SpanInline mounts)
 * to the nearest edge of its panel. If the DOM position isn't registered
 * yet (e.g. Tier 1, where text doesn't render), we fall back to the
 * approximated anchorPoint that came from panelLayout.
 *
 * Stroke width counter-scales 1/k so the line stays a constant thickness
 * in screen space regardless of zoom.
 */
export default function LeaderLines({ laidOut, panelHeight, hidden }: LeaderLinesProps) {
  const k = useNewfound((s) => s.transform.k);
  const selectedSpanId = useNewfound((s) => s.selectedSpanId);
  const positions = useSpanPositions((s) => s.positions);
  const bounds = corpusBounds();

  if (hidden) return null;

  const strokePx = 1.25 / k;

  return (
    <svg
      width={bounds.width}
      height={bounds.height + 800}
      style={{
        position: 'absolute',
        left: bounds.x,
        top: 0,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {laidOut.map((p) => {
        // Prefer the measured DOM position of the span; fall back to the
        // panel-layout anchor.
        const pos = positions.get(p.spanId);
        let ax: number;
        let ay: number;
        if (pos) {
          // Originate from the lane-side edge of the span itself.
          ax = (p.side === 'left' ? pos.x : pos.x + pos.width) - bounds.x;
          ay = pos.y + pos.height / 2;
        } else {
          ax = p.anchorPoint.x - bounds.x;
          ay = p.anchorPoint.y;
        }

        const panelMidY = p.y + panelHeight / 2;
        // The panel edge nearer the text.
        const bx = (p.side === 'left' ? p.x + p.width : p.x) - bounds.x;
        const by = panelMidY;
        const cx = p.side === 'left' ? (ax + bx) / 2 - 40 : (ax + bx) / 2 + 40;
        const cy = (ay + by) / 2;
        const d = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
        const selected = selectedSpanId === p.spanId;
        return (
          <g key={p.spanId}>
            <path
              d={d}
              fill="none"
              stroke="var(--nf-density-3)"
              strokeWidth={strokePx * (selected ? 1.8 : 1)}
              strokeOpacity={selected ? 0.95 : 0.55}
            />
            <circle cx={ax} cy={ay} r={2.5 / k} fill="var(--nf-density-3)" />
          </g>
        );
      })}
    </svg>
  );
}
