import { useEffect, useRef, type RefObject } from 'react';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { useNewfound } from '@/state/useNewfound';

export interface PlaneZoomHandle {
  behavior: ZoomBehavior<HTMLDivElement, unknown> | null;
  element: HTMLDivElement | null;
}

interface UsePlaneZoomOptions {
  scaleExtent?: [number, number];
  initial?: { x: number; y: number; k: number };
}

/**
 * d3-zoom on a div. Pan + zoom + zoom-to-cursor + touch. Writes the transform
 * into the Zustand store on every zoom event. Returns a handle so callers can
 * drive fly-to animations via the behavior.
 */
export function usePlaneZoom(
  ref: RefObject<HTMLDivElement>,
  opts: UsePlaneZoomOptions = {},
): PlaneZoomHandle {
  const handleRef = useRef<PlaneZoomHandle>({ behavior: null, element: null });
  const setTransform = useNewfound((s) => s.setTransform);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent(opts.scaleExtent ?? [0.15, 4])
      .filter((event: Event) => {
        const me = event as MouseEvent;
        // Block secondary-button drags everywhere.
        if (me.button !== undefined && me.button > 0) return false;

        const target = event.target as HTMLElement | null;

        // When the reader has captured a text selection waiting for the
        // "annotate" pill, suppress zoom so the page does not lurch under
        // them while they consider the action.
        const state = useNewfound.getState();
        const annotateActive = Boolean(state.composerSelection) && !state.composerOpen;

        // WHEEL events: zoom the plane by default, but if the wheel is inside
        // a panel (or any other element opting into native scroll), let the
        // browser handle the scroll. Also suppress wheel-zoom while the
        // annotate pill is showing.
        if (event.type === 'wheel') {
          if (target?.closest?.('[data-panel-scrollable]')) return false;
          if (annotateActive) return false;
          return true;
        }

        // Touch / dblclick zoom — allow anywhere except while the annotate
        // pill is showing.
        if (
          event.type === 'touchstart' ||
          event.type === 'touchmove' ||
          event.type === 'touchend' ||
          event.type === 'dblclick'
        ) {
          if (annotateActive) return false;
          return true;
        }

        // PAN events (mousedown / pointerdown): block on opt-out zones so a
        // drag on a panel header, chrome button, or selectable span text does
        // not initiate a pan.
        if (target?.closest?.('[data-no-pan]')) return false;
        if (target && target.isContentEditable) return false;
        return true;
      })
      .on('start', () => {
        useNewfound.getState().setInteracting(true);
      })
      .on('zoom', (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        const { x, y, k } = event.transform;
        setTransform({ x, y, k });
      })
      .on('end', () => {
        useNewfound.getState().setInteracting(false);
      });

    const sel = select(el);
    sel.call(behavior);
    // Apply initial transform without an event.
    if (opts.initial) {
      const init = zoomIdentity
        .translate(opts.initial.x, opts.initial.y)
        .scale(opts.initial.k);
      behavior.transform(sel, init);
    }

    handleRef.current = { behavior, element: el };

    return () => {
      sel.on('.zoom', null);
      handleRef.current = { behavior: null, element: null };
    };
    // We intentionally do NOT depend on opts.initial — only mount-time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, setTransform]);

  return handleRef.current;
}
