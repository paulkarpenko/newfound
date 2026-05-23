import { useEffect, useMemo, useRef, useState } from 'react';
import { hasApiKey, streamClaude, type ChatMessage } from '@/lib/claude';
import { Markdown } from '@/lib/markdown';
import { useNewfound } from '@/state/useNewfound';
import type { SidebarTurn } from '@/state/useNewfound';

const SIDEBAR_SYSTEM_PROMPT = `You are a constitutional historian and political theorist in conversation with a reader of the United States Constitution. You receive context blocks (marked "[Context]") describing the phrase the reader just selected from a clause; treat them as background, not as questions to answer. Then answer the reader's actual question in plain conversational prose — 2–5 short paragraphs, no headings, no lists. Be specific and confident; name founders, Federalist papers, prior English/colonial law, and state constitutional analogues when relevant. Remember earlier turns in the conversation — reference them when the reader builds on a prior thread.`;

const SIDEBAR_W = 420;

/**
 * Right-edge conversation rail. Opens when the reader asks the first
 * question from the small ExplanationPanel. The conversation persists
 * across selections — each new "ask" appends a context block + the
 * question to the same transcript, so the model keeps the full thread.
 *
 * The sidebar autonomously fires off a stream whenever the most recent
 * turn is an un-answered user message. State (turns + open flag) lives
 * in the store so the sidebar survives unmounts (it doesn't unmount, but
 * the pattern keeps ExplanationPanel's submit handler a one-liner).
 */
export default function QuestionSidebar() {
  const open = useNewfound((s) => s.sidebarOpen);
  const close = useNewfound((s) => s.closeSidebar);
  const clear = useNewfound((s) => s.clearSidebar);
  const turns = useNewfound((s) => s.sidebarTurns);
  const append = useNewfound((s) => s.appendSidebarTurn);
  const update = useNewfound((s) => s.updateSidebarTurn);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Set of user-turn ids we've already kicked off a response for. */
  const respondedRef = useRef<Set<string>>(new Set());

  // ESC closes (but doesn't clear — re-open to continue the thread).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Stream a response whenever the most recent turn is an unhandled user message.
  useEffect(() => {
    if (turns.length === 0) return;
    const last = turns[turns.length - 1];
    if (last.role !== 'user') return;
    if (respondedRef.current.has(last.id)) return;
    if (!hasApiKey()) {
      respondedRef.current.add(last.id);
      append({
        id: `a-${last.id}`,
        role: 'assistant',
        content: 'VITE_ANTHROPIC_API_KEY is not set in .env.local — paste your key and restart vite to enable answers.',
        error: true,
      });
      return;
    }

    respondedRef.current.add(last.id);
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);

    const assistantId = `a-${last.id}`;
    append({ id: assistantId, role: 'assistant', content: '', streaming: true });

    // Build the conversation history Claude sees. Context blocks are sent
    // as user-role messages prefixed with [Context] so the model treats
    // them as background, not questions. We then collapse adjacent
    // same-role messages — Anthropic's /messages endpoint requires
    // strictly alternating user/assistant turns, so a context block
    // followed by a question (both user) would 400 without merging.
    const raw: ChatMessage[] = turns
      .filter((t) => !t.error && (t.role !== 'assistant' || !t.streaming))
      .map((t) => {
        if (t.role === 'context') {
          const cite = t.citation ? `from ${t.citation}` : '';
          const phrase = t.exact ? `"${t.exact}"` : '';
          const body = t.content ? `\n${t.content}` : '';
          return {
            role: 'user' as const,
            content: `[Context] Reader selected ${phrase} ${cite}.${body}`.trim(),
          };
        }
        return { role: t.role as 'user' | 'assistant', content: t.content };
      });
    const history: ChatMessage[] = [];
    for (const m of raw) {
      const prev = history[history.length - 1];
      if (prev && prev.role === m.role) {
        history[history.length - 1] = {
          role: prev.role,
          content: `${prev.content}\n\n${m.content}`,
        };
      } else {
        history.push(m);
      }
    }

    (async () => {
      try {
        for await (const chunk of streamClaude(history, {
          system: SIDEBAR_SYSTEM_PROMPT,
          maxTokens: 900,
          signal: controller.signal,
        })) {
          update(assistantId, { content: appendChunk(turns, assistantId, chunk) });
        }
        update(assistantId, { streaming: false });
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : String(err);
        update(assistantId, { content: msg, streaming: false, error: true });
      } finally {
        setSending(false);
      }
    })();

    // NOTE: no cleanup that aborts `controller`. This effect re-runs every
    // time `turns` changes, including the `append()` we just made above —
    // returning an aborter would kill our own in-flight stream. Explicit
    // close/clear/ESC handlers abort via abortRef instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns]);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns]);

  const visible = useMemo(
    () => turns.filter((t) => t.role !== 'user' || !t.content.startsWith('[Context]')),
    [turns],
  );

  if (!open) {
    if (turns.length === 0) return null;
    // Collapsed pill — re-opens the thread without losing context.
    return (
      <button
        type="button"
        data-no-pan
        onClick={() => useNewfound.getState().openSidebar()}
        aria-label="Re-open question thread"
        style={{
          position: 'fixed',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '10px 8px',
          writingMode: 'vertical-rl',
          background: 'var(--nf-panel)',
          color: 'var(--nf-focus)',
          border: '1px solid var(--nf-focus)',
          borderRight: 'none',
          borderRadius: '6px 0 0 6px',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          textTransform: 'lowercase',
          letterSpacing: '0.16em',
          fontSize: 11,
          fontWeight: 600,
          zIndex: 70,
          boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
          cursor: 'pointer',
        }}
      >
        questions · {visible.filter((t) => t.role === 'user').length}
      </button>
    );
  }

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    append({
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: text,
    });
  };

  return (
    <aside
      data-no-pan
      data-panel-scrollable
      aria-label="Question thread"
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_W,
        background: 'var(--nf-panel)',
        borderLeft: '1px solid var(--nf-focus)',
        boxShadow: '-12px 0 32px rgba(0,0,0,0.10)',
        zIndex: 75,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--nf-rule)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--nf-panel-deep)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--nf-focus)',
            }}
          >
            questions
          </p>
          <p
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontSize: 12,
              color: 'var(--nf-ink-soft)',
              margin: '2px 0 0',
            }}
          >
            context held across selections
          </p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              respondedRef.current.clear();
              clear();
            }}
            aria-label="Clear thread"
            style={{
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              textTransform: 'lowercase',
              letterSpacing: '0.08em',
              fontSize: 11,
              color: 'var(--nf-ink-soft)',
              padding: '4px 8px',
            }}
          >
            clear
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            close();
          }}
          aria-label="Close sidebar"
          style={{ fontSize: 18, color: 'var(--nf-ink-soft)', padding: '4px 8px', lineHeight: 1 }}
        >
          ×
        </button>
      </header>

      <div
        ref={transcriptRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '14px 16px',
          background: 'var(--nf-canvas)',
        }}
      >
        {turns.length === 0 ? (
          <p
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--nf-ink-whisper)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Ask a question here, or select text in the document and use the
            "explain" pill to start a thread anchored to a phrase.
          </p>
        ) : (
          turns.map((t) => <TurnBubble key={t.id} turn={t} />)
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{
          borderTop: '1px solid var(--nf-rule)',
          padding: 12,
          background: 'var(--nf-panel-deep)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={
            hasApiKey()
              ? 'Continue the thread…'
              : 'Set VITE_ANTHROPIC_API_KEY in .env.local to ask questions.'
          }
          disabled={!hasApiKey()}
          style={{
            flex: 1,
            background: 'var(--nf-canvas)',
            color: 'var(--nf-ink)',
            border: '1px solid var(--nf-rule)',
            borderRadius: 3,
            padding: '8px 10px',
            fontFamily: 'Source Serif 4, serif',
            fontSize: 13,
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending || !hasApiKey()}
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: 10,
            fontWeight: 600,
            padding: '8px 14px',
            background: input.trim() && !sending && hasApiKey() ? 'var(--nf-focus)' : 'var(--nf-panel)',
            color: input.trim() && !sending && hasApiKey() ? '#fff' : 'var(--nf-ink-whisper)',
            border: '1px solid var(--nf-focus)',
            borderRadius: 3,
            cursor: input.trim() && !sending && hasApiKey() ? 'pointer' : 'not-allowed',
            alignSelf: 'stretch',
          }}
        >
          {sending ? '…' : 'ask'}
        </button>
      </form>
    </aside>
  );
}

/**
 * Append a chunk to the streaming assistant turn. Reads the current
 * content from the latest store snapshot so we don't lose deltas to
 * stale closures.
 */
function appendChunk(_prev: SidebarTurn[], id: string, chunk: string): string {
  const turns = useNewfound.getState().sidebarTurns;
  const t = turns.find((x) => x.id === id);
  return (t?.content ?? '') + chunk;
}

function TurnBubble({ turn }: { turn: SidebarTurn }) {
  if (turn.role === 'context') {
    return (
      <div
        style={{
          margin: '0 0 12px',
          padding: '8px 10px',
          background: 'var(--nf-panel-deep)',
          borderLeft: '2px solid var(--nf-focus)',
          borderRadius: '0 3px 3px 0',
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--nf-focus)',
            margin: 0,
          }}
        >
          context · {turn.citation ?? 'selection'}
        </p>
        {turn.exact && (
          <p
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontStyle: 'italic',
              fontSize: 12,
              color: 'var(--nf-ink-soft)',
              margin: '4px 0 0',
              lineHeight: 1.5,
            }}
          >
            "{turn.exact.length > 160 ? turn.exact.slice(0, 160) + '…' : turn.exact}"
          </p>
        )}
      </div>
    );
  }
  if (turn.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div
          style={{
            maxWidth: '88%',
            background: 'var(--nf-focus)',
            color: '#fff',
            borderRadius: '10px 10px 2px 10px',
            padding: '8px 12px',
            fontFamily: 'Source Serif 4, serif',
            fontSize: 13.5,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {turn.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <p
        style={{
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontSize: 9,
          fontWeight: 600,
          color: turn.error ? '#a23' : 'var(--nf-ink-soft)',
          marginBottom: 4,
        }}
      >
        {turn.error ? 'note' : 'claude'}
      </p>
      {turn.error ? (
        <p
          style={{
            fontFamily: 'Source Serif 4, serif',
            fontSize: 13.5,
            lineHeight: 1.6,
            color: '#a23',
            fontStyle: 'italic',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {turn.content}
        </p>
      ) : (
        <div style={{ position: 'relative' }}>
          <Markdown
            text={turn.content}
            baseStyle={{
              fontFamily: 'Source Serif 4, serif',
              fontSize: 13.5,
              color: 'var(--nf-ink)',
            }}
          />
          {turn.streaming && (
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
        </div>
      )}
    </div>
  );
}
