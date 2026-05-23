import { useNewfound } from '@/state/useNewfound';

/**
 * Floating "annotate" pill that appears next to a text selection.
 * Lives in screen space (outside the World transform) — clicking it opens
 * the Composer dialog over the selection.
 */
export default function AnnotatePill() {
  const selection = useNewfound((s) => s.composerSelection);
  const composerOpen = useNewfound((s) => s.composerOpen);
  const openComposer = useNewfound((s) => s.openComposer);
  const cancel = useNewfound((s) => s.cancelComposing);

  // Hide once the composer is open (the composer takes over the spot).
  if (!selection || composerOpen) return null;

  // Position the pill at the bottom-right of the selection, with a small
  // offset so it doesn't sit on the text.
  const left = selection.screenX + 6;
  const top = selection.screenY + 6;

  return (
    <div
      data-no-pan
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 60,
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 999,
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        padding: '4px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
      role="toolbar"
      aria-label="Annotate selection"
    >
      <button
        type="button"
        onClick={openComposer}
        onMouseDown={(e) => e.preventDefault()} // don't drop selection
        style={{
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--nf-ink)',
          padding: '4px 10px',
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span aria-hidden style={{ fontSize: 11 }}>＋</span>
        annotate
      </button>
      <button
        type="button"
        onClick={cancel}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="Dismiss annotate pill"
        style={{
          fontSize: 12,
          color: 'var(--nf-ink-soft)',
          padding: '2px 6px',
          borderRadius: 999,
        }}
      >
        ×
      </button>
    </div>
  );
}
