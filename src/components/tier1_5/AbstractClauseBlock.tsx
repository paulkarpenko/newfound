import { zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import type { Clause } from '@/lib/types';
import { useMerged } from '@/lib/dataAccess';
import { resolveAnchor } from '@/lib/anchors';
import {
  CHARS_PER_LINE,
  HEADING_HEIGHT,
  READING_LINE_HEIGHT,
} from '@/lib/layout';
import { densityBucket, densityColor } from '@/lib/density';
import { centerOn } from '@/lib/flyto';
import { useNewfound } from '@/state/useNewfound';
import ClausePulse from '@/components/primitives/ClausePulse';

interface AbstractClauseBlockProps {
  clause: Clause;
  zoomRef: { behavior: ZoomBehavior<HTMLDivElement, unknown> | null; element: HTMLDivElement | null };
}

/**
 * Tier 1.5 — clause card. Citation + heading on top; the body area shows
 * each annotated Span as a colored bar at the line where it sits in the
 * underlying text. Width is proportional to the span's character count,
 * color is its density. The text itself is hidden; the bars preserve the
 * spatial relationship to it.
 *
 * Clicking the card flies in to reading zoom.
 */
export default function AbstractClauseBlock({ clause, zoomRef }: AbstractClauseBlockProps) {
  const merged = useMerged();
  const max = merged.maxClauseCount;
  const spans = merged.spansForClause(clause.id);
  const pulseClause = useNewfound((s) => s.pulseClause);

  const onFly = () => {
    if (!zoomRef.element || !zoomRef.behavior) return;
    const rect = zoomRef.element.getBoundingClientRect();
    const cx = clause.world.x + clause.world.width / 2;
    const cy = clause.world.y + clause.world.height / 2;
    const target = centerOn({ x: cx, y: cy }, { width: rect.width, height: rect.height }, 1);
    select(zoomRef.element)
      .transition()
      .duration(420)
      .ease(easeCubicInOut)
      .call(zoomRef.behavior.transform as never, zoomIdentity.translate(target.x, target.y).scale(target.k));
    pulseClause(clause.id);
  };

  // Body area Y starts after the header.
  const headerH = clause.heading ? HEADING_HEIGHT : 32;
  const bodyTop = headerH;
  // Number of wrapped lines as estimated by layout.
  const lineCount = Math.max(1, Math.ceil(clause.text.length / CHARS_PER_LINE));
  const bodyH = lineCount * READING_LINE_HEIGHT;

  // For each span, compute (lineIndex, startCol, endCol) within the wrap.
  const bars = spans.flatMap((s) => {
    const resolved = resolveAnchor(s.selector, clause.text);
    if (!resolved) return [];
    const count = merged.annotationsForSpan(s.id).length;
    const bucket = densityBucket(count, Math.max(max, 8));
    // Split across wrapped lines.
    const out: Array<{ line: number; col0: number; col1: number; bucket: typeof bucket; spanId: string }> = [];
    let cursor = resolved.start;
    while (cursor < resolved.end) {
      const line = Math.floor(cursor / CHARS_PER_LINE);
      const lineStart = line * CHARS_PER_LINE;
      const nextLine = lineStart + CHARS_PER_LINE;
      const segEnd = Math.min(resolved.end, nextLine);
      const col0 = cursor - lineStart;
      const col1 = segEnd - lineStart;
      out.push({ line, col0, col1, bucket, spanId: s.id });
      cursor = segEnd;
    }
    return out;
  });

  return (
    <button
      type="button"
      data-no-pan
      onClick={onFly}
      aria-label={`${clause.citation}${clause.heading ? ` — ${clause.heading}` : ''}. Click to read.`}
      style={{
        position: 'absolute',
        left: clause.world.x,
        top: clause.world.y,
        width: clause.world.width,
        height: clause.world.height,
        background: 'var(--nf-canvas)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        padding: 0,
        textAlign: 'left',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px 4px' }}>
        <p
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--nf-ink-soft)',
          }}
        >
          {clause.citation}
        </p>
        {clause.heading && (
          <h2
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontSize: 15,
              fontStyle: 'italic',
              color: 'var(--nf-ink)',
              margin: '2px 0 0',
            }}
          >
            {clause.heading}
          </h2>
        )}
      </div>

      {/* Body area: faint baseline rules for each wrapped line, with span bars on top. */}
      <div
        style={{
          position: 'relative',
          marginTop: 4,
          height: bodyH,
          padding: '0 14px',
        }}
      >
        {/* Faint baselines — the structure of the underlying text. */}
        {Array.from({ length: lineCount }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              top: i * READING_LINE_HEIGHT + READING_LINE_HEIGHT / 2 - bodyTop + bodyTop,
              height: 2,
              background: 'var(--nf-rule-soft)',
              borderRadius: 1,
              opacity: 0.6,
            }}
          />
        ))}

        <ClausePulse clauseId={clause.id} />

        {/* Span bars — colored, positioned at line + column. */}
        {bars.map((b, i) => {
          const lineW = clause.world.width - 28; // minus card padding both sides
          const colW = lineW / CHARS_PER_LINE;
          const left = 14 + b.col0 * colW;
          const width = Math.max(8, (b.col1 - b.col0) * colW);
          const top = b.line * READING_LINE_HEIGHT + READING_LINE_HEIGHT / 2 - 3;
          return (
            <div
              key={`${b.spanId}-${i}`}
              aria-hidden
              style={{
                position: 'absolute',
                left,
                width,
                top,
                height: 6,
                background: densityColor(b.bucket),
                borderRadius: 1,
                boxShadow: '0 0 0 1px var(--nf-canvas)',
              }}
            />
          );
        })}
      </div>
    </button>
  );
}
