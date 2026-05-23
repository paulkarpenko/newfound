import { zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import { allClauses, allSections, getClause } from '@/lib/dataAccess';
import { useMerged } from '@/lib/dataAccess';
import { useNewfound } from '@/state/useNewfound';
import { densityBucket, densityColor, densityLabel } from '@/lib/density';
import { centerOn } from '@/lib/flyto';

interface OverviewBlocksProps {
  zoomRef: { behavior: ZoomBehavior<HTMLDivElement, unknown> | null; element: HTMLDivElement | null };
}

/**
 * Tier 1 — colored clause blocks at world rects. NOT shrunken text.
 * A reader sees the map of attention: which clauses the community has
 * worked over, which lie untouched.
 *
 * Clicking flies the viewport to that clause at reading zoom.
 */
export default function OverviewBlocks({ zoomRef }: OverviewBlocksProps) {
  const merged = useMerged();
  const max = merged.maxClauseCount;
  const sections = allSections();
  const pulseClause = useNewfound((s) => s.pulseClause);

  const onSelect = (clauseId: string) => {
    if (!zoomRef.element || !zoomRef.behavior) return;
    const clause = getClause(clauseId);
    if (!clause) return;
    const rect = zoomRef.element.getBoundingClientRect();
    const cx = clause.world.x + clause.world.width / 2;
    const cy = clause.world.y + clause.world.height / 2;
    const target = centerOn({ x: cx, y: cy }, { width: rect.width, height: rect.height }, 1);
    select(zoomRef.element)
      .transition()
      .duration(520)
      .ease(easeCubicInOut)
      .call(zoomRef.behavior.transform as never, zoomIdentity.translate(target.x, target.y).scale(target.k));
    pulseClause(clauseId);
  };

  return (
    <div aria-label="Corpus overview" style={{ position: 'absolute', top: 0, left: 0 }}>
      {sections.map((s) => {
        const clauses = s.clauseIds.map((id) => getClause(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
        if (clauses.length === 0) return null;
        const first = clauses[0];
        return (
          <div key={s.id} style={{ position: 'absolute', left: first.world.x, top: first.world.y - 40 }}>
            <span
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontSize: 11,
                color: 'var(--nf-ink-soft)',
              }}
            >
              {s.title}
              {s.subtitle ? ` · ${s.subtitle}` : ''}
            </span>
          </div>
        );
      })}

      {allClauses().map((c) => {
        const count = merged.clauseAnnotationCount(c.id);
        const bucket = densityBucket(count, max);
        return (
          <button
            type="button"
            key={c.id}
            data-no-pan
            onClick={() => onSelect(c.id)}
            aria-label={`${c.citation}${c.heading ? ` — ${c.heading}` : ''}. ${count} annotation${count === 1 ? '' : 's'}, ${densityLabel(bucket)}.`}
            style={{
              position: 'absolute',
              left: c.world.x,
              top: c.world.y,
              width: c.world.width,
              height: c.world.height,
              background: densityColor(bucket),
              opacity: bucket === 0 ? 0.55 : 0.95,
              border: '1px solid var(--nf-rule)',
              borderRadius: 4,
              cursor: 'pointer',
              padding: 12,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'transform 150ms ease-out, filter 150ms ease-out',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.filter = 'brightness(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.filter = '';
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontWeight: 500,
                fontSize: 10,
                color: bucket >= 3 ? '#fff' : 'var(--nf-ink-soft)',
              }}
            >
              {c.citation}
            </span>
            {c.heading && (
              <span
                style={{
                  fontFamily: 'Source Serif 4, serif',
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: bucket >= 3 ? '#fff' : 'var(--nf-ink)',
                }}
              >
                {c.heading}
              </span>
            )}
            {count > 0 && (
              <span
                style={{
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: bucket >= 3 ? 'rgba(255,255,255,0.85)' : 'var(--nf-ink-soft)',
                  marginTop: 'auto',
                }}
              >
                {count} annotation{count === 1 ? '' : 's'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
