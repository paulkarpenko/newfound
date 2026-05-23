import { useMemo, useRef } from 'react';
import type { Clause } from '@/lib/types';
import { resolveAnchor } from '@/lib/anchors';
import { useMerged } from '@/lib/dataAccess';
import { useNewfound } from '@/state/useNewfound';
import ClausePulse from '@/components/primitives/ClausePulse';
import SpanInline from './SpanInline';
import ClauseExplainButton from '@/components/explanation/ClauseExplainButton';

interface ClauseBlockProps {
  clause: Clause;
}

interface Segment {
  kind: 'text' | 'span';
  text: string;
  spanId?: string;
}

function buildSegments(
  clause: Clause,
  spans: ReturnType<typeof useMerged>['spansForClause'] extends (...args: never) => infer R ? R : never,
): Segment[] {
  const ranges: Array<{ start: number; end: number; spanId: string }> = [];
  for (const s of spans) {
    const resolved = resolveAnchor(s.selector, clause.text);
    if (!resolved) continue;
    ranges.push({ start: resolved.start, end: resolved.end, spanId: s.id });
  }
  ranges.sort((a, b) => a.start - b.start);
  const filtered: typeof ranges = [];
  let cursor = -1;
  for (const r of ranges) {
    if (r.start >= cursor) {
      filtered.push(r);
      cursor = r.end;
    }
  }
  const out: Segment[] = [];
  let c = 0;
  for (const r of filtered) {
    if (r.start > c) out.push({ kind: 'text', text: clause.text.slice(c, r.start) });
    out.push({ kind: 'span', text: clause.text.slice(r.start, r.end), spanId: r.spanId });
    c = r.end;
  }
  if (c < clause.text.length) out.push({ kind: 'text', text: clause.text.slice(c) });
  return out;
}

export default function ClauseBlock({ clause }: ClauseBlockProps) {
  const merged = useMerged();
  const spans = useMemo(() => merged.spansForClause(clause.id), [merged, clause.id]);
  const segments = useMemo(() => buildSegments(clause, spans), [clause, spans]);
  const spanIndex = useMemo(() => new Map(spans.map((s) => [s.id, s])), [spans]);
  const startComposing = useNewfound((s) => s.startComposing);
  const transformK = useNewfound((s) => s.transform.k);
  const articleRef = useRef<HTMLElement>(null);

  // Selection is only practical at high zoom. Below this threshold, drag on
  // the clause text pans the plane; at or above it, the article opts out of
  // pan and native text selection works.
  const SELECT_K = 0.8;
  const selectable = transformK >= SELECT_K;

  /**
   * On selection within this clause, capture the selected text. The
   * AnnotatePill component picks this up and offers a click → open composer.
   * Uses TextQuoteSelector + prefix/suffix to re-anchor later.
   */
  const onSelection = () => {
    if (!selectable) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const article = articleRef.current;
    if (!article || !article.contains(range.commonAncestorContainer)) return;
    const exact = sel.toString().trim();
    if (exact.length < 2) return;
    const idx = clause.text.indexOf(exact);
    if (idx < 0) return;
    const prefix = clause.text.slice(Math.max(0, idx - 20), idx);
    const suffix = clause.text.slice(idx + exact.length, idx + exact.length + 20);

    const rect = range.getBoundingClientRect();
    const articleRect = article.getBoundingClientRect();
    const k = articleRect.width / (clause.world.width || articleRect.width || 1);
    const localX = (rect.right - articleRect.left) / k;
    const localY = (rect.top + rect.height / 2 - articleRect.top) / k;

    startComposing({
      clauseId: clause.id,
      exact,
      prefix,
      suffix,
      worldX: clause.world.x + localX,
      worldY: clause.world.y + localY,
      // Place the pill just below the right edge of the selection,
      // in screen coords. The pill is rendered in screen space.
      screenX: rect.right,
      screenY: rect.bottom,
    });
  };

  return (
    <article
      ref={articleRef}
      data-clause-id={clause.id}
      onMouseUp={onSelection}
      aria-label={`${clause.citation}${clause.heading ? ` — ${clause.heading}` : ''}`}
      // At k>=SELECT_K the article opts out of pan so the browser's native
      // text-selection drag works. Below that, pan is allowed and selection
      // is not.
      {...(selectable ? { 'data-no-pan': '' } : {})}
      style={{
        position: 'absolute',
        left: clause.world.x,
        top: clause.world.y,
        width: clause.world.width,
        background: 'var(--nf-canvas)',
        padding: '16px 18px',
        border: '1px solid var(--nf-rule-soft)',
        borderRadius: 2,
        userSelect: selectable ? 'text' : 'none',
        cursor: selectable ? 'text' : 'grab',
      }}
    >
      <header
        style={{
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid var(--nf-rule-soft)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--nf-focus)',
            }}
          >
            {clause.citation}
          </p>
          {clause.heading && (
            <h2
              style={{
                fontFamily: 'Source Serif 4, serif',
                fontSize: 26,
                fontWeight: 600,
                fontStyle: 'normal',
                color: 'var(--nf-ink)',
                margin: '4px 0 0',
                lineHeight: 1.15,
                letterSpacing: '-0.005em',
              }}
            >
              {clause.heading}
            </h2>
          )}
        </div>
        <ClauseExplainButton clauseId={clause.id} />
      </header>
      <p
        style={{
          fontFamily: 'Source Serif 4, serif',
          fontSize: 17,
          lineHeight: '28px',
          color: 'var(--nf-ink)',
          margin: 0,
        }}
      >
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
          const span = spanIndex.get(seg.spanId!);
          if (!span) return <span key={i}>{seg.text}</span>;
          return (
            <SpanInline key={i} span={span}>
              {seg.text}
            </SpanInline>
          );
        })}
      </p>
      <ClausePulse clauseId={clause.id} />
    </article>
  );
}
