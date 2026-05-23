import type { ZoomBehavior } from 'd3-zoom';
import { allClauses, allSections, getClause } from '@/lib/dataAccess';
import AbstractClauseBlock from './AbstractClauseBlock';

interface AbstractCorpusProps {
  zoomRef: { behavior: ZoomBehavior<HTMLDivElement, unknown> | null; element: HTMLDivElement | null };
}

/**
 * Tier 1.5 — clause cards across the multi-column layout.
 * Renders section headings and one card per clause.
 */
export default function AbstractCorpus({ zoomRef }: AbstractCorpusProps) {
  return (
    <div aria-label="Constitution corpus, abstract view" style={{ position: 'absolute', top: 0, left: 0 }}>
      {allSections().map((s) => {
        const clauses = s.clauseIds.map((id) => getClause(id)).filter((c): c is NonNullable<typeof c> => Boolean(c));
        if (clauses.length === 0) return null;
        const first = clauses[0];
        return (
          <div key={s.id} style={{ position: 'absolute', left: first.world.x, top: first.world.y - 36 }}>
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
      {allClauses().map((c) => (
        <AbstractClauseBlock key={c.id} clause={c} zoomRef={zoomRef} />
      ))}
    </div>
  );
}
