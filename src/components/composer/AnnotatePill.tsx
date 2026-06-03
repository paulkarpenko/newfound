import { findConcept } from '@/lib/concepts';
import { getClause } from '@/lib/dataAccess';
import { useNewfound } from '@/state/useNewfound';
import { useAuth } from '@/state/useAuth';

/**
 * Floating selection toolbar that appears next to a text selection. Two
 * actions: "annotate" opens the composer (a new annotation); "explain"
 * opens a transient Feynman-style explanation panel.
 */
export default function AnnotatePill() {
  const selection = useNewfound((s) => s.composerSelection);
  const composerOpen = useNewfound((s) => s.composerOpen);
  const openComposer = useNewfound((s) => s.openComposer);
  const openExplanation = useNewfound((s) => s.openExplanation);
  const cancel = useNewfound((s) => s.cancelComposing);
  const isAuthed = useAuth((s) => s.status === 'authed');
  const openAuthModal = useAuth((s) => s.openAuthModal);

  if (!selection || composerOpen) return null;

  const left = selection.screenX + 6;
  const top = selection.screenY + 6;

  // Only signed-in readers can annotate. Anonymous readers get a sign-in
  // prompt instead; the selection is dismissed so the modal isn't obscured.
  const onAnnotate = () => {
    if (!isAuthed) {
      cancel();
      openAuthModal('login');
      return;
    }
    openComposer();
  };

  const onExplain = () => {
    // If a static concept matches, hand it to the panel — fast, free, offline.
    // Otherwise open the panel with no conceptId; it falls back to streaming
    // a live Claude explanation of the selected phrase. Either way, the click
    // always does something.
    const concept = findConcept(selection.clauseId, selection.exact);
    const clause = getClause(selection.clauseId);
    const side: 'left' | 'right' =
      clause && selection.worldX - clause.world.x < clause.world.width / 2
        ? 'left'
        : 'right';
    // Stable id keyed off (clauseId, exact phrase). Re-clicking explain on
    // the same selection reuses the existing panel rather than opening a
    // duplicate; different selections produce distinct ids that stack in
    // the lane.
    const id = `exp-${selection.clauseId}-${hashStr(selection.exact)}`;
    openExplanation({
      id,
      clauseId: selection.clauseId,
      exact: selection.exact,
      prefix: selection.prefix,
      suffix: selection.suffix,
      worldX: selection.worldX,
      worldY: selection.worldY,
      side,
      conceptId: concept?.id,
    });
  };

  // ...stable short hash to derive ids from selection text.
  function hashStr(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

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
      aria-label="Annotate or explain selection"
    >
      <PillButton
        onClick={onAnnotate}
        ariaLabel="Annotate the selected text"
        glyph="＋"
        label="annotate"
      />
      <span aria-hidden style={{ width: 1, height: 16, background: 'var(--nf-rule)', margin: '0 2px' }} />
      <PillButton
        onClick={onExplain}
        ariaLabel="Explain the selected text in plain language"
        label="explain"
        accent
      />
      <button
        type="button"
        onClick={cancel}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="Dismiss selection toolbar"
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

interface PillButtonProps {
  onClick: () => void;
  ariaLabel: string;
  glyph?: string;
  label: string;
  accent?: boolean;
}

function PillButton({ onClick, ariaLabel, glyph, label, accent }: PillButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // don't drop selection
      aria-label={ariaLabel}
      style={{
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        fontSize: 10,
        fontWeight: 600,
        color: accent ? 'var(--nf-focus)' : 'var(--nf-ink)',
        padding: '4px 10px',
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {glyph && <span aria-hidden style={{ fontSize: 11 }}>{glyph}</span>}
      {label}
    </button>
  );
}
