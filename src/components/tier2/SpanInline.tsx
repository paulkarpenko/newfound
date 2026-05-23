import { useEffect, useRef } from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import type { Span } from '@/lib/types';
import { getClause, useMerged } from '@/lib/dataAccess';
import {
  densityBucket,
  densityColor,
  densityLabel,
  densityUnderlineWeight,
} from '@/lib/density';
import { useNewfound } from '@/state/useNewfound';
import { useSpanPositions } from '@/state/useSpanPositions';

interface SpanInlineProps {
  span: Span;
  children: string;
}

/**
 * Choose which lane the panel should open into — the side of the column
 * nearer the span's horizontal center. This way a phrase on the left side
 * of the reading column opens a panel into the LEFT lane, and vice-versa.
 */
function sideForSpan(spanEl: HTMLElement | null): 'left' | 'right' {
  if (!spanEl) return 'right';
  const article = spanEl.closest('[data-clause-id]') as HTMLElement | null;
  if (!article) return 'right';
  const articleRect = article.getBoundingClientRect();
  const spanRect = spanEl.getBoundingClientRect();
  const spanCenter = spanRect.left + spanRect.width / 2;
  const articleCenter = articleRect.left + articleRect.width / 2;
  return spanCenter < articleCenter ? 'left' : 'right';
}

export default function SpanInline({ span, children }: SpanInlineProps) {
  const selectedSpanId = useNewfound((s) => s.selectedSpanId);
  const openPanel = useNewfound((s) => s.openPanel);
  const facetTypes = useNewfound((s) => s.facetTypes);
  const facetEraMin = useNewfound((s) => s.facetEraMin);
  const facetEraMax = useNewfound((s) => s.facetEraMax);
  const setPosition = useSpanPositions((s) => s.setPosition);
  const clearPosition = useSpanPositions((s) => s.clearPosition);

  const ref = useRef<HTMLSpanElement>(null);
  const merged = useMerged();

  const annotations = merged.annotationsForSpan(span.id);
  const matching = annotations.filter((a) => {
    if (facetTypes.size > 0 && !facetTypes.has(a.type)) return false;
    if (facetEraMin !== null && a.era < facetEraMin) return false;
    if (facetEraMax !== null && a.era > facetEraMax) return false;
    return true;
  });

  const max = merged.maxClauseCount;
  const bucket = densityBucket(annotations.length, Math.max(max, 8));
  const weight = densityUnderlineWeight(bucket);
  const color = densityColor(bucket);
  const selected = selectedSpanId === span.id;
  const dimmed = facetTypes.size + (facetEraMin !== null ? 1 : 0) + (facetEraMax !== null ? 1 : 0) > 0
    ? matching.length === 0
    : false;

  // Measure the span's actual DOM position and convert to world coords by
  // looking up its parent <article data-clause-id>'s offset position.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clause = getClause(span.clauseId);
    if (!clause) return;

    const measure = () => {
      const article = el.closest('[data-clause-id]') as HTMLElement | null;
      if (!article) return;
      // Use offset rectangles — these are in CSS pixels of the world container,
      // which is 1:1 with world units before the parent transform.
      const articleRect = article.getBoundingClientRect();
      const spanRect = el.getBoundingClientRect();
      // Convert screen-pixel offset back to world units by dividing by the
      // article's current screen-to-world scale.
      const k = articleRect.width / (clause.world.width || articleRect.width || 1);
      const localX = (spanRect.left - articleRect.left) / k;
      const localY = (spanRect.top - articleRect.top) / k;
      setPosition(span.id, {
        x: clause.world.x + localX,
        y: clause.world.y + localY,
        width: spanRect.width / k,
        height: spanRect.height / k,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearPosition(span.id);
    };
  }, [span.id, span.clauseId, setPosition, clearPosition]);

  return (
    <HoverCard.Root openDelay={200} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <span
          ref={ref}
          data-no-pan
          data-span-id={span.id}
          role="button"
          tabIndex={0}
          aria-label={`${children}. ${annotations.length} annotation${annotations.length === 1 ? '' : 's'}, ${densityLabel(bucket)}. Press Enter to open panel.`}
          onClick={(e) => {
            e.stopPropagation();
            openPanel(span.id, sideForSpan(ref.current));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPanel(span.id, sideForSpan(ref.current));
            }
          }}
          style={{
            cursor: 'pointer',
            borderBottom: `${weight}px solid ${color}`,
            paddingBottom: 1,
            background: selected ? 'var(--nf-density-1)' : 'transparent',
            transition: 'background 150ms ease-out',
            opacity: dimmed ? 0.25 : 1,
          }}
        >
          {children}
        </span>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="start"
          sideOffset={8}
          data-no-pan
          className="z-50"
        >
          <div
            style={{
              background: 'var(--nf-panel)',
              color: 'var(--nf-ink)',
              border: '1px solid var(--nf-rule)',
              borderRadius: 4,
              padding: '10px 12px',
              maxWidth: 320,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              pointerEvents: 'auto',
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontSize: 10,
                color: 'var(--nf-ink-soft)',
                marginBottom: 6,
              }}
            >
              {annotations.length} annotation{annotations.length === 1 ? '' : 's'} · click to open
            </p>
            {annotations.slice(0, 2).map((a) => (
              <div key={a.id} style={{ marginBottom: 6 }}>
                <p
                  style={{
                    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                    fontSize: 11,
                    fontWeight: 500,
                    color: `var(--nf-type-${a.type})`,
                  }}
                >
                  {a.contributor.name}
                </p>
                <p
                  style={{
                    fontFamily: 'Source Serif 4, serif',
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: 'var(--nf-ink)',
                  }}
                >
                  {a.body.length > 130 ? `${a.body.slice(0, 130)}…` : a.body}
                </p>
              </div>
            ))}
            {annotations.length > 2 && (
              <p
                style={{
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  fontSize: 10,
                  color: 'var(--nf-ink-whisper)',
                  fontStyle: 'italic',
                }}
              >
                + {annotations.length - 2} more
              </p>
            )}
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
