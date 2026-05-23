import { useNewfound } from '@/state/useNewfound';

interface Props {
  clauseId: string;
}

/**
 * Quiet affordance shown to the right of every clause title. Opens the
 * ClauseChatPanel — a draggable chat seeded with the founders' reasoning
 * for why the clause exists. Reads as a label, not a button, until hover.
 */
export default function ClauseExplainButton({ clauseId }: Props) {
  const openClauseChat = useNewfound((s) => s.openClauseChat);
  const active = useNewfound((s) => s.clauseChat?.clauseId === clauseId);

  return (
    <button
      type="button"
      data-no-pan
      onClick={(e) => {
        e.stopPropagation();
        openClauseChat(clauseId);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label="Explain why this section exists"
      aria-pressed={active}
      style={{
        flexShrink: 0,
        marginTop: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        textTransform: 'lowercase',
        letterSpacing: '0.04em',
        fontSize: 11,
        fontWeight: 400,
        color: active ? 'var(--nf-focus)' : 'var(--nf-ink-whisper)',
        background: 'transparent',
        border: 'none',
        padding: '2px 4px',
        cursor: 'pointer',
        opacity: active ? 1 : 0.7,
        transition: 'color 120ms ease-out, opacity 120ms ease-out',
      }}
      onMouseEnter={(e) => {
        if (active) return;
        (e.currentTarget as HTMLElement).style.color = 'var(--nf-focus)';
        (e.currentTarget as HTMLElement).style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        (e.currentTarget as HTMLElement).style.color = 'var(--nf-ink-whisper)';
        (e.currentTarget as HTMLElement).style.opacity = '0.7';
      }}
    >
      <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>?</span>
      explain
    </button>
  );
}
