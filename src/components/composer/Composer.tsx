import { useEffect, useRef, useState } from 'react';
import { getClause, corpusBounds } from '@/lib/dataAccess';
import { PANEL_LANE_GAP, PANEL_LANE_WIDTH } from '@/lib/layout';
import { useNewfound } from '@/state/useNewfound';
import { useAuth } from '@/state/useAuth';

/**
 * Annotation composer — world-anchored next to the selected text, with a
 * leader line back to the anchor, and draggable by its header (same model
 * as the explanation panels). Only two inputs: the note itself and an
 * optional YouTube link. Authorship is taken from the signed-in account;
 * anonymous readers are shown a sign-in prompt instead of the form.
 */
export default function Composer() {
  const selection = useNewfound((s) => s.composerSelection);
  const composerOpen = useNewfound((s) => s.composerOpen);
  const cancel = useNewfound((s) => s.cancelComposing);
  const add = useNewfound((s) => s.addSpanAndAnnotation);
  const k = useNewfound((s) => s.transform.k);

  const user = useAuth((s) => s.user);
  const openAuthModal = useAuth((s) => s.openAuthModal);

  const [body, setBody] = useState('');
  const [youtube, setYoutube] = useState('');
  const [pinnedAt, setPinnedAt] = useState<{ x: number; y: number } | null>(null);

  const dragRef = useRef<{
    startClient: { x: number; y: number };
    startPanel: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (composerOpen && selection) {
      setBody('');
      setYoutube('');
      setPinnedAt(null);
    }
  }, [composerOpen, selection]);

  useEffect(() => {
    if (!composerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composerOpen, cancel]);

  if (!composerOpen || !selection) return null;
  const clause = getClause(selection.clauseId);
  if (!clause) return null;

  const side: 'left' | 'right' =
    selection.worldX - clause.world.x < clause.world.width / 2 ? 'left' : 'right';

  const panelW = PANEL_LANE_WIDTH;
  const panelHeight = 280; // estimate for vertical centering on the anchor
  const defaultX =
    side === 'left'
      ? clause.world.x - PANEL_LANE_GAP - PANEL_LANE_WIDTH
      : clause.world.x + clause.world.width + PANEL_LANE_GAP;
  const defaultY = selection.worldY - panelHeight / 2;
  const panelX = pinnedAt?.x ?? defaultX;
  const panelY = pinnedAt?.y ?? defaultY;

  // Leader line in the world SVG (positioned at corpus bounds).
  const bounds = corpusBounds();
  const ax = selection.worldX - bounds.x;
  const ay = selection.worldY;
  const bx = (side === 'left' ? panelX + panelW : panelX) - bounds.x;
  const by = panelY + panelHeight / 2;
  const cx = side === 'left' ? (ax + bx) / 2 - 40 : (ax + bx) / 2 + 40;
  const cy = (ay + by) / 2;
  const d = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  const strokePx = 1.25 / Math.max(0.001, k);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('[data-composer-button]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startPanel: { x: panelX, y: panelY },
      moved: false,
    };
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    const dref = dragRef.current;
    if (!dref) return;
    const dxScreen = e.clientX - dref.startClient.x;
    const dyScreen = e.clientY - dref.startClient.y;
    if (!dref.moved && Math.hypot(dxScreen, dyScreen) > 3) dref.moved = true;
    if (!dref.moved) return;
    const scale = Math.max(0.001, k);
    setPinnedAt({
      x: dref.startPanel.x + dxScreen / scale,
      y: dref.startPanel.y + dyScreen / scale,
    });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed || !user) return;
    const id = `user-${Math.random().toString(36).slice(2, 10)}`;
    const spanId = `user-span-${id}`;
    const annoId = `user-anno-${id}`;
    const yt = youtube.trim();
    add(
      {
        id: spanId,
        clauseId: selection.clauseId,
        selector: [
          {
            type: 'TextQuoteSelector',
            exact: selection.exact,
            prefix: selection.prefix,
            suffix: selection.suffix,
          },
        ],
        annotationIds: [],
      },
      {
        id: annoId,
        spanId,
        type: 'interpretation',
        contributor: { name: user.name || user.username, descriptor: `@${user.username}` },
        userId: user.id,
        era: new Date().getFullYear(),
        body: trimmed,
        votes: { up: 0, down: 0 },
        ...(yt ? { media: { kind: 'youtube' as const, src: yt, caption: '' } } : {}),
      },
      side,
    );
  };

  return (
    <>
      <svg
        width={bounds.width}
        height={bounds.height + 800}
        style={{ position: 'absolute', left: bounds.x, top: 0, pointerEvents: 'none', zIndex: 9 }}
        aria-hidden
      >
        <path d={d} fill="none" stroke="var(--nf-focus)" strokeWidth={strokePx * 1.4} strokeOpacity={0.7} />
        <circle cx={ax} cy={ay} r={2.5 / Math.max(0.001, k)} fill="var(--nf-focus)" />
      </svg>

      <div
        data-no-pan
        data-panel-scrollable
        role="dialog"
        aria-label="Add an annotation"
        style={{
          position: 'absolute',
          left: panelX,
          top: panelY,
          width: panelW,
          background: 'var(--nf-panel)',
          border: '1px solid var(--nf-focus)',
          borderRadius: 4,
          boxShadow: '0 10px 32px rgba(0,0,0,0.20), 0 0 0 1px rgba(47, 93, 151, 0.18)',
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        <header
          onPointerDown={onHeaderPointerDown}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={onHeaderPointerUp}
          style={{
            padding: '10px 12px',
            background: 'var(--nf-panel-deep)',
            borderBottom: '1px solid var(--nf-rule)',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <p className="font-smallcaps">annotate</p>
          <button
            type="button"
            data-composer-button
            onClick={(e) => {
              e.stopPropagation();
              cancel();
            }}
            aria-label="Cancel"
            style={{ fontSize: 14, color: 'var(--nf-ink-soft)', padding: 4, lineHeight: 1 }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: 12, display: 'grid', gap: 10 }}>
          <blockquote
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontStyle: 'italic',
              fontSize: 12.5,
              color: 'var(--nf-ink-whisper)',
              borderLeft: '2px solid var(--nf-rule)',
              paddingLeft: 8,
              margin: 0,
            }}
          >
            "{selection.exact.length > 90 ? `${selection.exact.slice(0, 90)}…` : selection.exact}"
          </blockquote>

          {!user ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <p style={{ fontFamily: 'Source Serif 4, serif', fontSize: 13.5, lineHeight: 1.5, color: 'var(--nf-ink)', margin: 0 }}>
                Sign in to add your annotation. Your name will be shown for attribution.
              </p>
              <button
                type="button"
                data-composer-button
                onClick={() => {
                  cancel();
                  openAuthModal('login');
                }}
                style={{
                  justifySelf: 'start',
                  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '7px 14px',
                  background: 'var(--nf-focus)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                sign in
              </button>
            </div>
          ) : (
            <>
              <label style={{ display: 'grid', gap: 4 }}>
                <span className="font-smallcaps">your annotation</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  autoFocus
                  rows={4}
                  placeholder="What does this passage mean — or do — that the reader should see?"
                  style={{
                    background: 'var(--nf-canvas)',
                    color: 'var(--nf-ink)',
                    border: '1px solid var(--nf-rule)',
                    borderRadius: 2,
                    padding: 8,
                    fontFamily: 'Source Serif 4, serif',
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span className="font-smallcaps">youtube link (optional)</span>
                <input
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  style={{
                    background: 'var(--nf-canvas)',
                    color: 'var(--nf-ink)',
                    border: '1px solid var(--nf-rule)',
                    borderRadius: 2,
                    padding: '6px 8px',
                    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--nf-ink-whisper)' }}>
                  as <strong style={{ color: 'var(--nf-ink-soft)' }}>{user.name || user.username}</strong>
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    data-composer-button
                    onClick={cancel}
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, padding: '6px 10px', color: 'var(--nf-ink-soft)' }}
                  >
                    cancel
                  </button>
                  <button
                    type="button"
                    data-composer-button
                    onClick={submit}
                    disabled={!body.trim()}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11,
                      padding: '6px 12px',
                      background: body.trim() ? 'var(--nf-focus)' : 'var(--nf-panel-deep)',
                      color: body.trim() ? '#fff' : 'var(--nf-ink-whisper)',
                      borderRadius: 2,
                      cursor: body.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    add annotation
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 10, color: 'var(--nf-ink-whisper)', fontStyle: 'italic', textAlign: 'right', margin: 0 }}>
                Newfound has no backend — annotations live in this session only.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
