import type { PanelState, Span } from '@/lib/types';
import { PANEL_LANE_WIDTH, PANEL_LANE_GAP } from '@/lib/layout';
import { getClause } from '@/lib/selectors';
import { resolveAnchor } from '@/lib/anchors';
import { offsetToWorldY } from '@/lib/layout';

export interface LaidOutPanel {
  spanId: string;
  /** computed world-space top-left of the panel */
  x: number;
  y: number;
  width: number;
  side: 'left' | 'right';
  /** world-space anchor point — the point a leader line should originate from on the text */
  anchorPoint: { x: number; y: number };
  pinned: boolean;
}

interface LayoutInput {
  panels: Map<string, PanelState>;
  spans: Map<string, Span>;
  panelHeight: number;
  gap: number;
}

/**
 * Margin-lane packing.
 *
 * Each panel anchors at its span's world Y, in the lane adjacent to its
 * clause's column. Per-column / per-side cursors track the next available
 * Y so panels never overlap. When the preferred side's anchor would
 * overlap a panel above, we push down; when one side fills, the next
 * panel for the same column overflows to the other side.
 *
 * Pinned panels (dragged) escape the lane and sit at their pinnedAt coords.
 */
export function layoutPanels({
  panels,
  spans,
  panelHeight,
  gap,
}: LayoutInput): LaidOutPanel[] {
  // Resolve every open panel to its anchor and its clause's column position.
  interface Item {
    panel: PanelState;
    span: Span;
    anchor: { x: number; y: number };
    /** x of the right edge of the clause text — used to find lane x. */
    clauseLeft: number;
    clauseRight: number;
  }
  const items: Item[] = [];

  for (const [spanId, p] of panels) {
    if (!p.open) continue;
    const span = spans.get(spanId);
    if (!span) continue;
    const clause = getClause(span.clauseId);
    if (!clause) continue;
    const resolved = resolveAnchor(span.selector, clause.text);
    if (!resolved) continue;
    const anchorY = offsetToWorldY(clause, resolved.start);
    const anchorX = clause.world.x + clause.world.width / 2;
    items.push({
      panel: p,
      span,
      anchor: { x: anchorX, y: anchorY },
      clauseLeft: clause.world.x,
      clauseRight: clause.world.x + clause.world.width,
    });
  }

  // Sort by anchor Y so we lay out top to bottom.
  items.sort((a, b) => a.anchor.y - b.anchor.y);

  // Per-(clauseLeft + side) cursor tracking the next free Y.
  const cursors = new Map<string, number>();
  const cursorKey = (left: number, side: 'left' | 'right') => `${Math.round(left)}|${side}`;

  const out: LaidOutPanel[] = [];

  for (const it of items) {
    if (it.panel.pinnedAt) {
      out.push({
        spanId: it.panel.spanId,
        x: it.panel.pinnedAt.x,
        y: it.panel.pinnedAt.y,
        width: PANEL_LANE_WIDTH,
        side: it.panel.side,
        anchorPoint: it.anchor,
        pinned: true,
      });
      continue;
    }

    const preferred = it.panel.side;
    const other: 'left' | 'right' = preferred === 'left' ? 'right' : 'left';
    const desiredY = it.anchor.y - panelHeight / 2;

    const place = (side: 'left' | 'right'): LaidOutPanel => {
      const x =
        side === 'left'
          ? it.clauseLeft - PANEL_LANE_GAP - PANEL_LANE_WIDTH
          : it.clauseRight + PANEL_LANE_GAP;
      const key = cursorKey(it.clauseLeft, side);
      const cursor = cursors.get(key) ?? -Infinity;
      const y = Math.max(desiredY, cursor + gap);
      cursors.set(key, y + panelHeight);
      return {
        spanId: it.panel.spanId,
        x,
        y,
        width: PANEL_LANE_WIDTH,
        side,
        anchorPoint: it.anchor,
        pinned: false,
      };
    };

    // Try preferred side. If it would push way past the anchor (lane is full
    // for this stretch), overflow to the other side.
    const preferredKey = cursorKey(it.clauseLeft, preferred);
    const preferredCursor = cursors.get(preferredKey) ?? -Infinity;
    const preferredY = Math.max(desiredY, preferredCursor + gap);
    const otherKey = cursorKey(it.clauseLeft, other);
    const otherCursor = cursors.get(otherKey) ?? -Infinity;
    const otherY = Math.max(desiredY, otherCursor + gap);

    // Overflow when the preferred side has wandered > 180 world-units below
    // the anchor and the other side is closer to the anchor.
    if (preferredY - desiredY > 180 && otherY < preferredY) {
      out.push(place(other));
    } else {
      out.push(place(preferred));
    }
  }

  return out;
}
