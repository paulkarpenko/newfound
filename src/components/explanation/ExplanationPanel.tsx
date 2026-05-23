import { useEffect, useRef, useState } from 'react';
import { getConcept } from '@/lib/concepts';
import { getClause } from '@/lib/dataAccess';
import { hasApiKey, streamClaude } from '@/lib/claude';
import { useNewfound, type ExplanationState } from '@/state/useNewfound';

const LIVE_SYSTEM_PROMPT = `You are a constitutional historian helping a reader understand a specific phrase they just selected from the United States Constitution.

CRITICAL: Your answer must be about the SELECTED PHRASE specifically — not about the surrounding clause as a whole. The clause is provided only so you understand the immediate context. If the selected phrase is a single word or short fragment, explain what that exact word or fragment is doing in this sentence, how it interacts with the words around it, and why the framers chose it. Do not give a general overview of the clause.

Reply in 2–4 short paragraphs of plain prose — no lists, no headings, no preamble. Define legal terms in everyday language, name the principle at stake, and where useful note the historical precedent the founders were drawing on. Be specific and confident; do not hedge with "some scholars argue." Aim for 90–160 words.`;

interface Props {
  explanation: ExplanationState;
  /** World-space top-left, computed by ExplanationLayer's lane packer. */
  x: number;
  y: number;
  width: number;
}

/**
 * Transient world-anchored panel that explains a single selected phrase.
 * One per open ExplanationState — the parent ExplanationLayer reads the
 * full collection, packs them into lanes, and renders one of these per
 * laid-out slot. Each panel manages its own live-stream and chatbox.
 *
 * Position comes from props (lane-packed). Drag updates `pinnedAt` in
 * the store, after which the layout treats this panel as escaped — its
 * pinnedAt overrides the lane cursor.
 */
export default function ExplanationPanel({ explanation, x, y, width }: Props) {
  const close = useNewfound((s) => s.closeExplanation);
  const pin = useNewfound((s) => s.pinExplanation);
  const appendSidebarTurn = useNewfound((s) => s.appendSidebarTurn);
  const openSidebar = useNewfound((s) => s.openSidebar);
  const sidebarTurns = useNewfound((s) => s.sidebarTurns);
  const addSpanAndAnnotation = useNewfound((s) => s.addSpanAndAnnotation);
  const addAnnotationToSpan = useNewfound((s) => s.addAnnotationToSpan);
  const k = useNewfound((s) => s.transform.k);

  const [question, setQuestion] = useState('');
  const [note, setNote] = useState('');
  /** When set, "saved ✓" indicator is shown until the timer clears it. */
  const [justSaved, setJustSaved] = useState(false);

  const dragRef = useRef<{
    startClient: { x: number; y: number };
    startPanel: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const concept = explanation.conceptId ? getConcept(explanation.conceptId) : undefined;
  const clause = getClause(explanation.clauseId);

  // Live-mode stream — runs when there's no static concept and we have an API key.
  const liveMode = Boolean(!concept);
  const [liveText, setLiveText] = useState('');
  const [liveStreaming, setLiveStreaming] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveAbortRef = useRef<AbortController | null>(null);

  // Keyed off id + (clauseId, exact) so re-clicking explain on the same
  // phrase reuses an existing panel and does not refetch.
  const liveKey = liveMode ? `${explanation.id}::${explanation.clauseId}::${explanation.exact}` : null;
  useEffect(() => {
    liveAbortRef.current?.abort();
    setLiveText('');
    setLiveError(null);
    setLiveStreaming(false);
    if (!liveKey || !clause) return;
    if (!hasApiKey()) {
      setLiveError(
        'Live explanation needs VITE_ANTHROPIC_API_KEY in .env.local. Restart vite after editing.',
      );
      return;
    }
    const controller = new AbortController();
    liveAbortRef.current = controller;
    setLiveStreaming(true);
    const prompt = `Surrounding clause (for context only): ${clause.citation}${clause.heading ? ' — ' + clause.heading : ''}
Full clause text: "${clause.text}"

THE READER SELECTED THIS EXACT PHRASE: "${explanation.exact}"

Explain what this exact selected phrase means and why it matters. Stay focused on the phrase itself — do not summarize the whole clause.`;
    (async () => {
      try {
        for await (const chunk of streamClaude(
          [{ role: 'user', content: prompt }],
          { system: LIVE_SYSTEM_PROMPT, maxTokens: 480, signal: controller.signal },
        )) {
          setLiveText((prev) => prev + chunk);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setLiveError(err instanceof Error ? err.message : String(err));
      } finally {
        setLiveStreaming(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  if (!clause) return null;

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('[data-explanation-button]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startPanel: { x, y },
      moved: false,
    };
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dxScreen = e.clientX - d.startClient.x;
    const dyScreen = e.clientY - d.startClient.y;
    if (!d.moved && Math.hypot(dxScreen, dyScreen) > 3) d.moved = true;
    if (!d.moved) return;
    // World-space delta — divide screen delta by the current zoom scale.
    const scale = Math.max(0.001, k);
    pin(explanation.id, {
      x: d.startPanel.x + dxScreen / scale,
      y: d.startPanel.y + dyScreen / scale,
    });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  /**
   * Persist the reader's take. Two things happen, both quietly:
   *
   *  1. The take is saved as a user-authored annotation on this selection
   *     (so it joins the corpus's annotation layer and contributes to the
   *     density underline). If a user-span for this exact phrase already
   *     exists, the annotation attaches to it. We pass `openPanel: false`
   *     so saving does not pop a separate annotation panel over the text.
   *
   *  2. The take is mirrored into the sidebar as a 'note' turn, paired
   *     with a context block. This is the visible feedback that the save
   *     succeeded, and the take then participates as background in any
   *     follow-up questions the reader asks Claude.
   */
  const saveNote = () => {
    const body = note.trim();
    if (!body || !clause) return;

    // (1) Persist as annotation — quietly, no panel pop-up.
    const spanId = `user-span-from-explain-${explanation.id}`;
    const annoId = `user-anno-${spanId}-${Date.now().toString(36)}`;
    const annotation = {
      id: annoId,
      spanId,
      type: 'interpretation' as const,
      contributor: { name: 'You', descriptor: 'reader note' },
      era: new Date().getFullYear(),
      body,
    };
    const state = useNewfound.getState();
    const existing = state.userSpans.find((sp) => sp.id === spanId);
    if (existing) {
      addAnnotationToSpan(spanId, annotation);
    } else {
      addSpanAndAnnotation(
        {
          id: spanId,
          clauseId: explanation.clauseId,
          selector: [
            {
              type: 'TextQuoteSelector',
              exact: explanation.exact,
              prefix: explanation.prefix,
              suffix: explanation.suffix,
            },
          ],
          annotationIds: [],
        },
        annotation,
        explanation.side,
        { openPanel: false },
      );
    }

    // (2) Surface in the sidebar conversation thread.
    const citation = clause.heading
      ? `${clause.citation} — ${clause.heading}`
      : clause.citation;
    const lastContextId = [...sidebarTurns].reverse().find((t) => t.role === 'context')?.id;
    const ctxKey = `ctx-${explanation.clauseId}-${hashStr(explanation.exact)}`;
    if (lastContextId !== ctxKey) {
      appendSidebarTurn({
        id: ctxKey,
        role: 'context',
        content: '',
        citation,
        exact: explanation.exact,
      });
    }
    appendSidebarTurn({
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'note',
      content: body,
      citation,
      exact: explanation.exact,
    });
    openSidebar();

    setNote('');
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
  };

  /**
   * Submit a question — opens the sidebar and seeds it with a context
   * block (which clause + which phrase) followed by the question. The
   * sidebar autonomously streams Claude's reply.
   */
  const submitQuestion = () => {
    const text = question.trim();
    if (!text || !clause) return;
    const citation = clause.heading
      ? `${clause.citation} — ${clause.heading}`
      : clause.citation;
    // Avoid emitting a duplicate context block when the reader fires
    // multiple questions on the same selection within one session.
    const lastContextId = [...sidebarTurns].reverse().find((t) => t.role === 'context')?.id;
    const ctxKey = `ctx-${explanation.clauseId}-${hashStr(explanation.exact)}`;
    if (lastContextId !== ctxKey) {
      appendSidebarTurn({
        id: ctxKey,
        role: 'context',
        content: '',
        citation,
        exact: explanation.exact,
      });
    }
    appendSidebarTurn({
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
    });
    openSidebar();
    setQuestion('');
  };

  return (
    <div
      data-no-pan
      data-panel-scrollable
      role="dialog"
      aria-label={`Explanation: ${concept ? concept.title : explanation.exact}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-focus)',
        borderRadius: 4,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18), 0 0 0 1px rgba(47, 93, 151, 0.18)',
        zIndex: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        style={{
          padding: '10px 12px 8px',
          background: 'var(--nf-panel-deep)',
          borderBottom: '1px solid var(--nf-rule)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <span className="font-smallcaps" style={{ color: 'var(--nf-focus)', flex: 1 }}>
          {liveMode ? 'live' : 'plain English'}
        </span>
        <button
          type="button"
          data-explanation-button
          onClick={(e) => {
            e.stopPropagation();
            close(explanation.id);
          }}
          aria-label="Close explanation"
          style={{ fontSize: 14, color: 'var(--nf-ink-soft)', padding: 4, lineHeight: 1 }}
        >
          ×
        </button>
      </header>

      <div style={{ padding: '10px 12px 12px', maxHeight: 360, overflow: 'auto' }}>
        <blockquote
          style={{
            fontFamily: 'Source Serif 4, serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--nf-ink-whisper)',
            borderLeft: '2px solid var(--nf-rule)',
            paddingLeft: 8,
            margin: '0 0 10px',
          }}
        >
          "{explanation.exact.length > 80 ? `${explanation.exact.slice(0, 80)}…` : explanation.exact}"
        </blockquote>

        {concept ? (
          <>
            <h3
              style={{
                fontFamily: 'Source Serif 4, serif',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--nf-ink)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}
            >
              {concept.title}
            </h3>
            <p
              style={{
                fontFamily: 'Source Serif 4, serif',
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--nf-ink)',
                margin: 0,
              }}
            >
              {concept.explanation}
            </p>
          </>
        ) : liveError ? (
          <p
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontSize: 13,
              lineHeight: 1.55,
              color: '#a23',
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            {liveError}
          </p>
        ) : (
          <p
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'var(--nf-ink)',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {liveText}
            {liveStreaming && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 14,
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  background: 'var(--nf-focus)',
                  animation: 'nf-cursor-blink 1s steps(2, end) infinite',
                }}
              />
            )}
          </p>
        )}

        <p
          style={{
            marginTop: 10,
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            fontSize: 10,
            fontStyle: 'italic',
            color: 'var(--nf-ink-whisper)',
            textAlign: 'right',
          }}
        >
          {concept ? 'an explanation, not the text itself' : 'live answer — verify before citing'}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveNote();
        }}
        style={{
          borderTop: '1px solid var(--nf-rule)',
          padding: '6px 8px',
          background: 'var(--nf-panel-deep)',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveNote();
            }
          }}
          placeholder="your take on this passage…"
          aria-label="Save your take on this passage as an annotation"
          style={{
            flex: 1,
            background: 'var(--nf-canvas)',
            color: 'var(--nf-ink)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 3,
            padding: '5px 8px',
            fontFamily: 'Source Serif 4, serif',
            fontSize: 12.5,
            lineHeight: 1.4,
            outline: 'none',
            minHeight: 28,
          }}
        />
        <button
          type="submit"
          data-explanation-button
          disabled={!note.trim()}
          aria-label="Save your take as an annotation"
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            textTransform: 'lowercase',
            letterSpacing: '0.1em',
            fontSize: 10,
            fontWeight: 600,
            padding: '5px 9px',
            background: 'transparent',
            color: note.trim() ? 'var(--nf-ink)' : 'var(--nf-ink-whisper)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 3,
            cursor: note.trim() ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
            minWidth: 56,
          }}
        >
          {justSaved ? '✓ saved' : 'save'}
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuestion();
        }}
        style={{
          borderTop: '1px solid var(--nf-rule)',
          padding: 8,
          background: 'var(--nf-panel-deep)',
          display: 'flex',
          gap: 6,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitQuestion();
            }
          }}
          rows={1}
          placeholder="Ask a follow-up about this phrase…"
          style={{
            flex: 1,
            background: 'var(--nf-canvas)',
            color: 'var(--nf-ink)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 3,
            padding: '6px 8px',
            fontFamily: 'Source Serif 4, serif',
            fontSize: 12.5,
            lineHeight: 1.45,
            resize: 'none',
            outline: 'none',
            minHeight: 32,
            maxHeight: 96,
          }}
        />
        <button
          type="submit"
          data-explanation-button
          disabled={!question.trim()}
          aria-label="Ask in sidebar"
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            textTransform: 'lowercase',
            letterSpacing: '0.12em',
            fontSize: 10,
            fontWeight: 600,
            padding: '6px 10px',
            background: question.trim() ? 'var(--nf-focus)' : 'var(--nf-panel)',
            color: question.trim() ? '#fff' : 'var(--nf-ink-whisper)',
            border: '1px solid var(--nf-focus)',
            borderRadius: 3,
            cursor: question.trim() ? 'pointer' : 'not-allowed',
            alignSelf: 'stretch',
          }}
        >
          ask
        </button>
      </form>
    </div>
  );
}

/** Stable short hash for memoizing context-turn ids. */
function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
