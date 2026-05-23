import { create } from 'zustand';

export interface SpanRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface State {
  positions: Map<string, SpanRect>;
  setPosition(spanId: string, rect: SpanRect): void;
  clearPosition(spanId: string): void;
}

/**
 * Per-span world-space DOM rect. Set by each <SpanInline> on mount / resize;
 * read by LeaderLines so connectors emerge from the actual span position
 * rather than the clause's center.
 */
export const useSpanPositions = create<State>((set) => ({
  positions: new Map(),
  setPosition: (spanId, rect) =>
    set((s) => {
      const cur = s.positions.get(spanId);
      if (
        cur &&
        cur.x === rect.x &&
        cur.y === rect.y &&
        cur.width === rect.width &&
        cur.height === rect.height
      ) {
        return s;
      }
      const next = new Map(s.positions);
      next.set(spanId, rect);
      return { positions: next };
    }),
  clearPosition: (spanId) =>
    set((s) => {
      if (!s.positions.has(spanId)) return s;
      const next = new Map(s.positions);
      next.delete(spanId);
      return { positions: next };
    }),
}));
