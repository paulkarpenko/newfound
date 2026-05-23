import { useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import { allClauses, allSections, getClause, useMerged } from '@/lib/dataAccess';
import { densityBucket, densityColor } from '@/lib/density';
import { centerOn } from '@/lib/flyto';
import { useNewfound } from '@/state/useNewfound';
import { useSearchParams } from 'react-router-dom';

interface ClauseOutlineProps {
  zoomRef: { behavior: ZoomBehavior<HTMLDivElement, unknown> | null; element: HTMLDivElement | null };
}

/**
 * Keyboard-accessible navigation that does not require the plane.
 * A reader can Tab through clauses, Enter to fly to one.
 *
 * Visually a slim sidebar that can be toggled open.
 */
export default function ClauseOutline({ zoomRef }: ClauseOutlineProps) {
  const [open, setOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const merged = useMerged();
  const pulseClause = useNewfound((s) => s.pulseClause);
  const max = merged.maxClauseCount;
  const sections = allSections();

  const flyToClause = (clauseId: string) => {
    if (!zoomRef.element || !zoomRef.behavior) return;
    const clause = getClause(clauseId);
    if (!clause) return;
    const rect = zoomRef.element.getBoundingClientRect();
    const cx = clause.world.x + clause.world.width / 2;
    const cy = clause.world.y + clause.world.height / 2;
    const target = centerOn({ x: cx, y: cy }, { width: rect.width, height: rect.height }, 1);
    select(zoomRef.element)
      .transition()
      .duration(420)
      .ease(easeCubicInOut)
      .call(zoomRef.behavior.transform as never, zoomIdentity.translate(target.x, target.y).scale(target.k));
    setSearchParams({ focus: clauseId }, { replace: true });
    // Pulse the destination so the eye catches it as the view settles.
    pulseClause(clauseId);
  };

  return (
    <>
      <button
        type="button"
        data-no-pan
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close outline' : 'Open outline'}
        aria-expanded={open}
        className="font-smallcaps absolute left-4 top-4 z-30"
        style={{
          background: 'var(--nf-panel)',
          color: 'var(--nf-ink)',
          border: '1px solid var(--nf-rule)',
          borderRadius: 4,
          padding: '6px 10px',
        }}
      >
        outline
      </button>

      {open && (
        <aside
          data-no-pan
          aria-label="Clause outline"
          className="absolute left-4 top-16 z-30"
          style={{
            width: 280,
            maxHeight: '70vh',
            background: 'var(--nf-panel)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <ScrollArea.Root style={{ maxHeight: '70vh', overflow: 'hidden' }}>
            <ScrollArea.Viewport style={{ maxHeight: '70vh' }}>
              {sections.map((s) => (
                <div key={s.id} style={{ borderBottom: '1px solid var(--nf-rule-soft)' }}>
                  <div
                    style={{
                      padding: '8px 12px 4px',
                      background: 'var(--nf-panel-deep)',
                    }}
                  >
                    <p
                      className="font-smallcaps"
                      style={{ color: 'var(--nf-ink-soft)' }}
                    >
                      {s.title}
                    </p>
                    {s.subtitle && (
                      <p
                        style={{
                          fontFamily: 'Source Serif 4, serif',
                          fontStyle: 'italic',
                          fontSize: 11,
                          color: 'var(--nf-ink-whisper)',
                        }}
                      >
                        {s.subtitle}
                      </p>
                    )}
                  </div>
                  {s.clauseIds.map((cid) => {
                    const c = getClause(cid);
                    if (!c) return null;
                    const count = merged.clauseAnnotationCount(c.id);
                    const bucket = densityBucket(count, max);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => flyToClause(c.id)}
                        className="nf-outline-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 12px',
                          width: '100%',
                          textAlign: 'left',
                          fontFamily: 'Source Serif 4, serif',
                          fontSize: 12.5,
                          color: 'var(--nf-ink)',
                          transition: 'background 120ms ease-out, color 120ms ease-out',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            background: densityColor(bucket),
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, fontStyle: c.heading ? 'italic' : 'normal' }}>
                          {c.heading ?? c.citation}
                        </span>
                        {count > 0 && (
                          <span
                            style={{
                              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                              fontSize: 10,
                              color: 'var(--nf-ink-whisper)',
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" style={{ width: 4 }}>
              <ScrollArea.Thumb style={{ background: 'var(--nf-rule)', borderRadius: 2 }} />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </aside>
      )}

      {/* Visually hidden but always-keyboard-reachable list — guarantees a
          keyboard path even without opening the visible outline. */}
      <ul
        style={{
          position: 'absolute',
          left: -10000,
          top: 0,
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
        }}
        aria-label="All clauses"
      >
        {allClauses().map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => flyToClause(c.id)}>
              {c.citation}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
