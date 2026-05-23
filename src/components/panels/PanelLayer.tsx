import { useMemo } from 'react';
import { useMerged } from '@/lib/dataAccess';
import { useNewfound } from '@/state/useNewfound';
import { layoutPanels } from './panelLayout';
import Panel from './Panel';
import LeaderLines from './LeaderLines';

const PANEL_HEIGHT = 180; // a stable estimate for lane packing
const PANEL_GAP = 12;

export default function PanelLayer() {
  const panels = useNewfound((s) => s.panels);
  const pinPanel = useNewfound((s) => s.pinPanel);
  const tier = useNewfound((s) => s.tier);
  const transformK = useNewfound((s) => s.transform.k);

  const merged = useMerged();
  const spanIndex = merged.spanIndex;

  const laidOut = useMemo(
    () =>
      layoutPanels({
        panels,
        spans: spanIndex,
        panelHeight: PANEL_HEIGHT,
        gap: PANEL_GAP,
      }),
    [panels, spanIndex],
  );

  // At Tier 1 and 1.5 panels collapse to dot markers at their anchor.
  if (tier === 1 || tier === 1.5) {
    return (
      <>
        {laidOut.map((p) => (
          <span
            key={p.spanId}
            aria-hidden
            style={{
              position: 'absolute',
              left: p.anchorPoint.x - 6,
              top: p.anchorPoint.y - 6,
              width: 12,
              height: 12,
              borderRadius: 999,
              background: 'var(--nf-density-4)',
              border: '1.5px solid var(--nf-canvas)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <LeaderLines laidOut={laidOut} panelHeight={PANEL_HEIGHT} />
      {laidOut.map((p) => {
        const state = panels.get(p.spanId);
        return (
          <Panel
            key={p.spanId}
            laid={p}
            expanded={state?.expanded ?? true}
            panelHeight={PANEL_HEIGHT}
            worldScale={transformK}
            onDragEnd={(spanId, xy) => pinPanel(spanId, xy)}
          />
        );
      })}
    </>
  );
}
