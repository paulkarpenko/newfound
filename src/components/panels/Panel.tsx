import { useRef } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { getClause } from '@/lib/dataAccess';
import { useMerged } from '@/lib/dataAccess';
import { resolveAnchor } from '@/lib/anchors';
import { TRACKER_RELATION_LABEL } from '@/lib/types';
import { useNewfound } from '@/state/useNewfound';
import type { LaidOutPanel } from './panelLayout';

interface PanelProps {
  laid: LaidOutPanel;
  /** Per-panel expanded state, driven by store. */
  expanded: boolean;
  panelHeight: number;
  onDragEnd(spanId: string, worldXY: { x: number; y: number } | null): void;
  worldScale: number;
}

const TYPE_LABEL: Record<string, string> = {
  interpretation: 'interpretation',
  evidence: 'evidence',
  counterpoint: 'counterpoint',
  crossref: 'cross-ref',
  context: 'context',
  media: 'media',
  question: 'question',
  tracker: 'tracker',
};

export default function Panel({ laid, expanded, panelHeight, onDragEnd, worldScale }: PanelProps) {
  const merged = useMerged();
  const span = merged.getSpan(laid.spanId);
  const annotations = span ? merged.annotationsForSpan(span.id) : [];
  const closePanel = useNewfound((s) => s.closePanel);
  const togglePanelExpanded = useNewfound((s) => s.togglePanelExpanded);
  const selectSpan = useNewfound((s) => s.selectSpan);
  const selectedSpanId = useNewfound((s) => s.selectedSpanId);
  const facetTypes = useNewfound((s) => s.facetTypes);
  const facetEraMin = useNewfound((s) => s.facetEraMin);
  const facetEraMax = useNewfound((s) => s.facetEraMax);

  const dragRef = useRef<{
    startWorld: { x: number; y: number };
    startClient: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  if (!span) return null;
  const clause = getClause(span.clauseId);
  const resolved = clause ? resolveAnchor(span.selector, clause.text) : null;
  const quote = resolved && clause ? clause.text.slice(resolved.start, resolved.end) : '';

  const filtered = annotations.filter((a) => {
    if (facetTypes.size > 0 && !facetTypes.has(a.type)) return false;
    if (facetEraMin !== null && a.era < facetEraMin) return false;
    if (facetEraMax !== null && a.era > facetEraMax) return false;
    return true;
  });

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement;
    // Header buttons (close, expand toggle) handle their own clicks; don't drag.
    if (targetEl.closest('[data-panel-button]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startWorld: { x: laid.x, y: laid.y },
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
    };
    selectSpan(span.id);
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dxScreen = e.clientX - d.startClient.x;
    const dyScreen = e.clientY - d.startClient.y;
    if (!d.moved && Math.hypot(dxScreen, dyScreen) > 3) d.moved = true;
    if (!d.moved) return;
    const dxWorld = dxScreen / worldScale;
    const dyWorld = dyScreen / worldScale;
    onDragEnd(span.id, { x: d.startWorld.x + dxWorld, y: d.startWorld.y + dyWorld });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (d && !d.moved) {
      selectSpan(span.id);
    }
  };

  const selected = selectedSpanId === laid.spanId;

  return (
    <div
      data-no-pan
      // When the panel is expanded its content can be scrolled; mark it so
      // d3-zoom passes the wheel event through to native scroll instead of
      // consuming it for plane zoom. Compact panels (no scroll content)
      // leave the wheel free to drive zoom as the reader expects.
      {...(expanded ? { 'data-panel-scrollable': '' } : {})}
      role="dialog"
      aria-label={`Annotations on "${quote}"`}
      style={{
        position: 'absolute',
        left: laid.x,
        top: laid.y,
        width: laid.width,
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        boxShadow: selected
          ? '0 6px 24px rgba(0,0,0,0.10), 0 0 0 1px var(--nf-focus)'
          : '0 2px 10px rgba(0,0,0,0.05)',
        opacity: selectedSpanId && !selected ? 0.85 : 1,
        zIndex: selected ? 5 : 2,
        maxHeight: expanded ? undefined : panelHeight,
        overflow: 'hidden',
        transition: 'opacity 150ms ease-out, box-shadow 150ms ease-out',
      }}
    >
      <header
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        style={{
          padding: '8px 10px',
          background: 'var(--nf-panel-deep)',
          borderBottom: '1px solid var(--nf-rule)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: 10,
            color: 'var(--nf-ink-soft)',
          }}
        >
          {annotations.length} on
        </span>
        <span
          style={{
            fontFamily: 'Source Serif 4, serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--nf-ink)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          "{quote}"
        </span>
        <button
          type="button"
          data-panel-button
          aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            togglePanelExpanded(span.id);
          }}
          style={{
            color: 'var(--nf-ink-soft)',
            fontSize: 12,
            lineHeight: 1,
            padding: 4,
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 180ms ease-out',
          }}
        >
          ⌄
        </button>
        <button
          type="button"
          data-panel-button
          aria-label="Close panel"
          onClick={(e) => {
            e.stopPropagation();
            closePanel(span.id);
          }}
          style={{ color: 'var(--nf-ink-soft)', fontSize: 14, lineHeight: 1, padding: 4 }}
        >
          ×
        </button>
      </header>

      {expanded ? (
        <ExpandedBody spanId={span.id} annotations={filtered} totalCount={filtered.length} />
      ) : (
        <CompactBody spanId={span.id} annotations={filtered.slice(0, 3)} totalCount={filtered.length} />
      )}
    </div>
  );
}

function CompactBody({
  spanId,
  annotations,
  totalCount,
}: {
  spanId: string;
  annotations: import('@/lib/types').Annotation[];
  totalCount: number;
}) {
  const openDetail = useNewfound((s) => s.openDetail);
  return (
    <div style={{ padding: '4px 6px' }}>
      {annotations.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(spanId, a.id);
          }}
          aria-label={`Open ${a.contributor.name}'s annotation in detail view`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            width: '100%',
            textAlign: 'left',
            borderRadius: 3,
            transition: 'background 120ms ease-out',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--nf-panel-deep)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: `var(--nf-type-${a.type})`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--nf-ink)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {a.contributor.name}
          </span>
          {a.media?.kind === 'youtube' && (
            <span
              aria-hidden
              title="includes video"
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                fontSize: 9,
                color: 'var(--nf-ink-soft)',
                border: '1px solid var(--nf-rule)',
                borderRadius: 2,
                padding: '0 4px',
              }}
            >
              ▶
            </span>
          )}
          <span
            style={{
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              fontSize: 10,
              color: 'var(--nf-ink-whisper)',
              flexShrink: 0,
            }}
          >
            {a.era}
          </span>
        </button>
      ))}
      {totalCount > annotations.length && (
        <p style={{ fontSize: 10, color: 'var(--nf-ink-whisper)', fontStyle: 'italic', marginTop: 4, padding: '0 8px' }}>
          + {totalCount - annotations.length} more · expand to read
        </p>
      )}
    </div>
  );
}

function ExpandedBody({
  spanId,
  annotations,
  totalCount,
}: {
  spanId: string;
  annotations: import('@/lib/types').Annotation[];
  totalCount: number;
}) {
  const openDetail = useNewfound((s) => s.openDetail);

  if (annotations.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, fontStyle: 'italic', color: 'var(--nf-ink-whisper)' }}>
        No annotations match the current facet filter.
      </div>
    );
  }
  return (
    <ScrollArea.Root style={{ height: 360, overflow: 'hidden' }} type="auto">
      <ScrollArea.Viewport
        // Marker on the actual scroll viewport — d3-zoom uses this to know
        // the wheel event should scroll, not zoom.
        data-panel-scrollable
        style={{ height: '100%', width: '100%' }}
      >
        <div>
          {annotations.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDetail(spanId, a.id);
              }}
              aria-label={`Open ${a.contributor.name}'s annotation in detail view`}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderTop: '1px solid var(--nf-rule-soft)',
                cursor: 'pointer',
                transition: 'background 120ms ease-out',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--nf-panel-deep)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <header style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: `var(--nf-type-${a.type})`,
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontSize: 10,
                    color: `var(--nf-type-${a.type})`,
                    fontWeight: 500,
                  }}
                >
                  {TYPE_LABEL[a.type]}
                </span>
                {a.type === 'tracker' && a.relation && (
                  <span
                    style={{
                      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#fff',
                      background: 'var(--nf-type-tracker)',
                      borderRadius: 2,
                      padding: '1px 5px',
                    }}
                  >
                    {TRACKER_RELATION_LABEL[a.relation]}
                  </span>
                )}
                {a.media?.kind === 'youtube' && (
                  <span
                    aria-hidden
                    title="includes video"
                    style={{
                      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                      fontSize: 9,
                      color: 'var(--nf-ink-soft)',
                      border: '1px solid var(--nf-rule)',
                      borderRadius: 2,
                      padding: '0 4px',
                    }}
                  >
                    ▶ video
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--nf-ink-whisper)' }}>{a.era}</span>
              </header>
              <p
                style={{
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: 'var(--nf-ink)',
                  marginBottom: 2,
                }}
              >
                {a.contributor.name}
              </p>
              <p style={{ fontSize: 10, color: 'var(--nf-ink-whisper)', fontStyle: 'italic', marginBottom: 6 }}>
                {a.contributor.descriptor}
              </p>
              <p
                style={{
                  fontFamily: 'Source Serif 4, serif',
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: 'var(--nf-ink)',
                }}
              >
                {a.body}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        style={{ width: 6, padding: 1, background: 'transparent' }}
      >
        <ScrollArea.Thumb style={{ background: 'var(--nf-rule)', borderRadius: 3 }} />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
      {totalCount === 0 && (
        <p style={{ padding: 10, fontSize: 11, color: 'var(--nf-ink-whisper)', fontStyle: 'italic' }}>
          No annotations match the current facet filter.
        </p>
      )}
    </ScrollArea.Root>
  );
}
