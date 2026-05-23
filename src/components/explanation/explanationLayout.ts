import { getClause } from '@/lib/dataAccess';
import { PANEL_LANE_GAP, PANEL_LANE_WIDTH } from '@/lib/layout';
import type { ExplanationState } from '@/state/useNewfound';

export interface LaidOutExplanation {
  id: string;
  /** computed world-space top-left of the panel */
  x: number;
  y: number;
  width: number;
  side: 'left' | 'right';
  /** world-space anchor on the text (where the leader line originates) */
  anchor: { x: number; y: number };
  pinned: boolean;
}

interface LayoutInput {
  explanations: Map<string, ExplanationState>;
  panelHeight: number;
  gap: number;
}

/**
 * Margin-lane packing for explain panels — same model as the annotation
 * panel layout. Each panel anchors at its selection's world Y, in the
 * lane adjacent to its clause's column. Per-(column,side) cursors track
 * the next available Y so panels never overlap each other within the
 * explain layer. If the preferred side fills up, the next panel for the
 * same column overflows to the other side. Pinned panels (dragged)
 * escape the lane entirely and sit at their pinnedAt coords.
 *
 * NOTE: explain panels share lane geometry with annotation panels but
 * are laid out independently — they may overlap with annotation panels
 * in the same column. The visual distinction (focus-blue border + leader
 * line) keeps them legible.
 */
export function layoutExplanations({
  explanations,
  panelHeight,
  gap,
}: LayoutInput): LaidOutExplanation[] {
  interface Item {
    exp: ExplanationState;
    anchor: { x: number; y: number };
    clauseLeft: number;
    clauseRight: number;
  }
  const items: Item[] = [];

  for (const [, e] of explanations) {
    const clause = getClause(e.clauseId);
    if (!clause) continue;
    items.push({
      exp: e,
      anchor: { x: e.worldX, y: e.worldY },
      clauseLeft: clause.world.x,
      clauseRight: clause.world.x + clause.world.width,
    });
  }

  // Top-to-bottom layout so cursors accumulate correctly.
  items.sort((a, b) => a.anchor.y - b.anchor.y);

  const cursors = new Map<string, number>();
  const cursorKey = (left: number, side: 'left' | 'right') => `${Math.round(left)}|${side}`;

  const out: LaidOutExplanation[] = [];

  for (const it of items) {
    if (it.exp.pinnedAt) {
      out.push({
        id: it.exp.id,
        x: it.exp.pinnedAt.x,
        y: it.exp.pinnedAt.y,
        width: PANEL_LANE_WIDTH,
        side: it.exp.side,
        anchor: it.anchor,
        pinned: true,
      });
      continue;
    }

    const preferred = it.exp.side;
    const other: 'left' | 'right' = preferred === 'left' ? 'right' : 'left';
    const desiredY = it.anchor.y - panelHeight / 2;

    const place = (side: 'left' | 'right'): LaidOutExplanation => {
      const x =
        side === 'left'
          ? it.clauseLeft - PANEL_LANE_GAP - PANEL_LANE_WIDTH
          : it.clauseRight + PANEL_LANE_GAP;
      const key = cursorKey(it.clauseLeft, side);
      const cursor = cursors.get(key) ?? -Infinity;
      const y = Math.max(desiredY, cursor + gap);
      cursors.set(key, y + panelHeight);
      return {
        id: it.exp.id,
        x,
        y,
        width: PANEL_LANE_WIDTH,
        side,
        anchor: it.anchor,
        pinned: false,
      };
    };

    const preferredKey = cursorKey(it.clauseLeft, preferred);
    const preferredCursor = cursors.get(preferredKey) ?? -Infinity;
    const preferredY = Math.max(desiredY, preferredCursor + gap);
    const otherKey = cursorKey(it.clauseLeft, other);
    const otherCursor = cursors.get(otherKey) ?? -Infinity;
    const otherY = Math.max(desiredY, otherCursor + gap);

    if (preferredY - desiredY > 180 && otherY < preferredY) {
      out.push(place(other));
    } else {
      out.push(place(preferred));
    }
  }

  return out;
}
