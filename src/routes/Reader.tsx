import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion as fm, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { motion as tokens } from '@/motion/tokens';
import Chrome from '@/components/plane/Chrome';
import Minimap from '@/components/plane/Minimap';
import Legend from '@/components/plane/Legend';
import FacetFilter from '@/components/plane/FacetFilter';
import World from '@/components/plane/World';
import OverviewBlocks from '@/components/tier1/OverviewBlocks';
import AbstractCorpus from '@/components/tier1_5/AbstractCorpus';
import CorpusText from '@/components/tier2/CorpusText';
import PanelLayer from '@/components/panels/PanelLayer';
import Composer from '@/components/composer/Composer';
import AnnotatePill from '@/components/composer/AnnotatePill';
import AnnotationDetailModal from '@/components/detail/AnnotationDetailModal';
import ClauseOutline from '@/components/a11y/ClauseOutline';
import { useNewfound } from '@/state/useNewfound';
import { usePlaneZoom } from '@/lib/usePlaneZoom';
import { corpusBounds, defaultClauseId, getClause } from '@/lib/selectors';
import { centerOn, fitTransform, flyTo } from '@/lib/flyto';

/**
 * The single route. Owns the plane + chrome + content layers (tier-conditioned
 * with crossfades). The World only renders text/panels/leader-lines;
 * Plane chrome lives outside the world transform.
 */
export default function Reader() {
  const tier = useNewfound((s) => s.tier);
  const transform = useNewfound((s) => s.transform);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const handle = usePlaneZoom(surfaceRef, { scaleExtent: [0.15, 3.6] });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [searchParams] = useSearchParams();

  useLayoutEffect(() => {
    if (!surfaceRef.current) return;
    const measure = () => {
      if (!surfaceRef.current) return;
      const r = surfaceRef.current.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(surfaceRef.current);
    return () => ro.disconnect();
  }, []);

  // Initial transform — fly to ?focus= or fit corpus.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (!handle.behavior || !handle.element) return;
    initialized.current = true;
    const focus = searchParams.get('focus') ?? defaultClauseId();
    const clause = getClause(focus);
    if (clause) {
      const cx = clause.world.x + clause.world.width / 2;
      const cy = clause.world.y + clause.world.height / 2;
      flyTo(handle.element, handle.behavior, centerOn({ x: cx, y: cy }, size, 1), 0);
    } else {
      flyTo(handle.element, handle.behavior, fitTransform(corpusBounds(), size, 80), 0);
    }
  }, [handle.behavior, handle.element, size, searchParams]);

  return (
    <div
      ref={surfaceRef}
      className="plane-surface relative h-screen w-screen overflow-hidden"
      style={{ background: 'var(--nf-plane)' }}
    >
      <World>
        <AnimatePresence>
          {tier === 1 && (
            <fm.div
              key="tier1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tokens.crossfade}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <OverviewBlocks zoomRef={handle} />
            </fm.div>
          )}
          {tier === 1.5 && (
            <fm.div
              key="tier15"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tokens.crossfade}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <AbstractCorpus zoomRef={handle} />
            </fm.div>
          )}
          {(tier === 2 || tier === 3) && (
            <fm.div
              key="tier23"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tokens.crossfade}
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <CorpusText />
            </fm.div>
          )}
        </AnimatePresence>

        {/* Panels & leader lines render at every tier (collapsed to dots in T1). */}
        <PanelLayer />
      </World>

      {/* Screen-space surfaces that should not scale with the plane. */}
      <AnnotatePill />
      <Composer />
      <AnnotationDetailModal />

      {/* Screen-space chrome. */}
      <Chrome zoomRef={handle} />
      <Minimap zoomRef={handle} />
      <ClauseOutline zoomRef={handle} />
      <FacetFilter />

      <div data-no-pan className="pointer-events-auto absolute bottom-4 left-4 z-30">
        <Legend />
      </div>

      <span className="sr-only" aria-live="polite">
        Tier {tier}. Zoom {Math.round(transform.k * 100)} percent.
      </span>
    </div>
  );
}
