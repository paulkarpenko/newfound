import { useEffect, useMemo, useRef, useState } from 'react';
import { getClause, corpusBounds } from '@/lib/dataAccess';
import { PANEL_LANE_GAP } from '@/lib/layout';
import { hasApiKey, streamClaude, type ChatMessage } from '@/lib/claude';
import { useNewfound } from '@/state/useNewfound';

const SYSTEM_PROMPT = `You are a constitutional historian and political theorist helping a curious reader understand a specific clause of the United States Constitution. Your job is to explain WHY this clause exists.

For the seed answer, structure your response in three short, scannable parts (use Markdown-style **bold** headings on their own line, then a paragraph of plain prose — no bullet points):

**The founders' thinking** — Reconstruct the specific arguments the framers, ratifiers, and pamphleteers had in mind when they wrote this. Cite Federalist papers, Madison's notes, Wilson, Hamilton, Adams, Mason, and (when relevant) Anti-Federalist critiques by name and number where appropriate. Make the debate audible.

**The world they were reacting to** — Identify the concrete prior law or governing arrangement this clause was a response to: English common law, the Articles of Confederation, parliamentary abuses, colonial charters, Roman or classical republican precedents, state constitutions. Quote phrases and name documents.

**The highest ideal at stake** — Name the political principle the clause was meant to secure (liberty, separation of powers, federalism, popular sovereignty, due process, etc.) in plain words, and explain why the founders believed THIS textual mechanism would protect THAT principle.

Be specific, concrete, and confident. Do not hedge with "some historians say" — speak as one who has read these sources. Aim for 220–340 words for the seed answer. Use short paragraphs.

For follow-up questions, answer in plain conversational prose without the three-part structure, keeping the same depth and historical specificity.`;

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  /** while true, content is streaming in. */
  streaming?: boolean;
  /** when set, this message is an error notice. */
  error?: boolean;
}

/**
 * World-space size — slightly wider than a regular panel lane so the chat
 * has room to breathe. Overflows the lane by ~60px into the inter-column
 * gap; never bleeds into the next column's text.
 */
const PANEL_W = 360;
const PANEL_H = 520;
/** Height of the title strip inside the clause article (used to anchor leader line). */
const CLAUSE_HEAD_Y_OFFSET = 36;

/**
 * Tethered world-space chat panel. Opens when the reader clicks the "explain"
 * label next to a clause title. Sits in the lane adjacent to the clause's
 * column with a thin leader line back to the title — so even after dragging,
 * the panel always looks like it belongs to its clause. Streams Claude's
 * three-part "why this exists" answer and supports follow-up questions.
 */
export default function ClauseChatPanel() {
  const chat = useNewfound((s) => s.clauseChat);
  const close = useNewfound((s) => s.closeClauseChat);
  const pin = useNewfound((s) => s.pinClauseChat);
  const k = useNewfound((s) => s.transform.k);

  const clauseId = chat?.clauseId ?? null;
  const clause = useMemo(() => (clauseId ? getClause(clauseId) : undefined), [clauseId]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // ESC closes.
  useEffect(() => {
    if (!chat) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        abortRef.current?.abort();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chat, close]);

  // Whenever the targeted clause changes, reset the transcript and re-seed.
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setSending(false);
    if (!clause) return;
    if (!hasApiKey()) {
      setMessages([
        {
          role: 'assistant',
          content: noKeyMessage(clause.citation, clause.heading),
          error: true,
        },
      ]);
      return;
    }

    const seedPrompt = buildSeedPrompt(clause.citation, clause.heading, clause.text);
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    setMessages([{ role: 'assistant', content: '', streaming: true }]);

    (async () => {
      try {
        for await (const chunk of streamClaude(
          [{ role: 'user', content: seedPrompt }],
          { system: SYSTEM_PROMPT, maxTokens: 1100, signal: controller.signal },
        )) {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              next[next.length - 1] = { ...last, content: last.content + chunk };
            }
            return next;
          });
        }
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          const msg = err instanceof Error ? err.message : String(err);
          if (last && last.role === 'assistant' && last.streaming) {
            next[next.length - 1] = { role: 'assistant', content: msg, error: true };
          } else {
            next.push({ role: 'assistant', content: msg, error: true });
          }
          return next;
        });
      } finally {
        setSending(false);
      }
    })();

    return () => controller.abort();
  }, [clause]);

  // Auto-scroll transcript as content streams in.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Drag handling — pointer events on the header move pinnedAt in world coords.
  const dragRef = useRef<{
    startClient: { x: number; y: number };
    startPanel: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  if (!chat || !clause) return null;

  // Default world-space position: right lane of the clause column, vertically
  // aligned to the clause's title. Falls back to left if the right would
  // overflow the corpus.
  const bounds = corpusBounds();
  const defaultSide: 'left' | 'right' =
    clause.world.x + clause.world.width + PANEL_LANE_GAP + PANEL_W <
    bounds.x + bounds.width + PANEL_W /* allow slight overhang */
      ? 'right'
      : 'left';
  const defaultX =
    defaultSide === 'right'
      ? clause.world.x + clause.world.width + PANEL_LANE_GAP
      : clause.world.x - PANEL_LANE_GAP - PANEL_W;
  const defaultY = clause.world.y;
  const panelX = chat.pinnedAt?.x ?? defaultX;
  const panelY = chat.pinnedAt?.y ?? defaultY;

  // Leader line geometry. Anchor at the title-edge of the clause; terminate
  // at the nearest vertical edge of the panel, halfway down the header.
  const anchorOnRight = panelX >= clause.world.x + clause.world.width / 2;
  const ax = anchorOnRight
    ? clause.world.x + clause.world.width - 16
    : clause.world.x + 16;
  const ay = clause.world.y + CLAUSE_HEAD_Y_OFFSET;
  const bx = anchorOnRight ? panelX : panelX + PANEL_W;
  const by = panelY + 30;
  // S-curve control points so the line eases out horizontally then settles
  // into the panel — feels like a wire, not a slash.
  const dx = bx - ax;
  const c1x = ax + dx * 0.55;
  const c1y = ay;
  const c2x = bx - dx * 0.55;
  const c2y = by;
  const leaderD = `M ${ax} ${ay} C ${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}`;
  const strokePx = 1.25 / Math.max(0.001, k);
  const dotR = 3 / Math.max(0.001, k);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('[data-chat-button]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startClient: { x: e.clientX, y: e.clientY },
      startPanel: { x: panelX, y: panelY },
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
    const scale = Math.max(0.001, k);
    pin({
      x: d.startPanel.x + dxScreen / scale,
      y: d.startPanel.y + dyScreen / scale,
    });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!hasApiKey()) return;
    setInput('');
    const history: ChatMessage[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));
    const userMsg: Msg = { role: 'user', content: text };
    const placeholder: Msg = { role: 'assistant', content: '', streaming: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);

    (async () => {
      try {
        for await (const chunk of streamClaude(
          [...history, { role: 'user', content: text }],
          { system: SYSTEM_PROMPT, maxTokens: 900, signal: controller.signal },
        )) {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              next[next.length - 1] = { ...last, content: last.content + chunk };
            }
            return next;
          });
        }
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          const msg = err instanceof Error ? err.message : String(err);
          if (last && last.role === 'assistant' && last.streaming) {
            next[next.length - 1] = { role: 'assistant', content: msg, error: true };
          } else {
            next.push({ role: 'assistant', content: msg, error: true });
          }
          return next;
        });
      } finally {
        setSending(false);
      }
    })();
  };

  return (
    <>
      {/* Leader line — lives in its own world-space SVG canvas spanning the
          full corpus. Renders behind the panel but above the text. */}
      <svg
        width={bounds.width}
        height={bounds.height + 800}
        style={{
          position: 'absolute',
          left: bounds.x,
          top: 0,
          pointerEvents: 'none',
          zIndex: 11,
          overflow: 'visible',
        }}
        aria-hidden
      >
        <path
          d={shiftPath(leaderD, -bounds.x, 0)}
          fill="none"
          stroke="var(--nf-focus)"
          strokeWidth={strokePx * 1.4}
          strokeOpacity={0.55}
        />
        <circle
          cx={ax - bounds.x}
          cy={ay}
          r={dotR}
          fill="var(--nf-focus)"
        />
      </svg>

      <div
        data-no-pan
        data-panel-scrollable
        role="dialog"
        aria-label={`Explain ${clause.citation}${clause.heading ? ' — ' + clause.heading : ''}`}
        style={{
          position: 'absolute',
          left: panelX,
          top: panelY,
          width: PANEL_W,
          height: PANEL_H,
          background: 'var(--nf-panel)',
          border: '1px solid var(--nf-focus)',
          borderRadius: 6,
          boxShadow: '0 18px 50px rgba(0,0,0,0.22), 0 0 0 1px rgba(47, 93, 151, 0.18)',
          zIndex: 12,
          display: 'flex',
          flexDirection: 'column',
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
            alignItems: 'center',
            gap: 8,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <span aria-hidden style={{ color: 'var(--nf-focus)', fontSize: 14, lineHeight: 1 }}>?</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--nf-focus)',
              }}
            >
              why this exists
            </p>
            <p
              style={{
                fontFamily: 'Source Serif 4, serif',
                fontSize: 13,
                color: 'var(--nf-ink)',
                margin: '1px 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`${clause.citation}${clause.heading ? ' — ' + clause.heading : ''}`}
            >
              {clause.citation}
              {clause.heading ? <> — <em>{clause.heading}</em></> : null}
            </p>
          </div>
          <button
            type="button"
            data-chat-button
            onClick={(e) => {
              e.stopPropagation();
              abortRef.current?.abort();
              close();
            }}
            aria-label="Close explanation chat"
            style={{ fontSize: 16, color: 'var(--nf-ink-soft)', padding: '4px 8px', lineHeight: 1 }}
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
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          style={{
            borderTop: '1px solid var(--nf-rule)',
            padding: 10,
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
                ? 'Ask a follow-up…'
                : 'Set VITE_ANTHROPIC_API_KEY in .env.local to ask follow-ups.'
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
            data-chat-button
            disabled={!input.trim() || sending || !hasApiKey()}
            style={{
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: 10,
              fontWeight: 600,
              padding: '8px 12px',
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
      </div>
    </>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === 'user') {
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
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 14 }}>
      <p
        style={{
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          fontSize: 9,
          fontWeight: 600,
          color: msg.error ? '#a23' : 'var(--nf-ink-soft)',
          marginBottom: 4,
        }}
      >
        {msg.error ? 'note' : 'claude'}
      </p>
      <RenderedProse text={msg.content} error={Boolean(msg.error)} />
      {msg.streaming && (
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
  );
}

/** Render assistant prose with **bold** lines treated as small section headers. */
function RenderedProse({ text, error }: { text: string; error: boolean }) {
  if (error) {
    return (
      <p
        style={{
          fontFamily: 'Source Serif 4, serif',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#a23',
          margin: 0,
          fontStyle: 'italic',
        }}
      >
        {text}
      </p>
    );
  }
  const blocks = text.split(/\n{2,}/);
  return (
    <div>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        const headerMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
        if (headerMatch) {
          return (
            <h4
              key={i}
              style={{
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--nf-focus)',
                margin: i === 0 ? '0 0 6px' : '14px 0 6px',
              }}
            >
              {headerMatch[1]}
            </h4>
          );
        }
        return (
          <p
            key={i}
            style={{
              fontFamily: 'Source Serif 4, serif',
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'var(--nf-ink)',
              margin: i === 0 ? '0 0 8px' : '0 0 8px',
            }}
          >
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={key++} style={{ fontWeight: 700, color: 'var(--nf-ink)' }}>
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Translate every M/C coord pair in an SVG path by (dx, dy). */
function shiftPath(d: string, dx: number, dy: number): string {
  return d.replace(/([MC])\s*([^MCZ]+)/g, (_, cmd, rest) => {
    const nums = rest.trim().split(/[ ,]+/).map(Number);
    const shifted = nums.map((n: number, i: number) => (i % 2 === 0 ? n + dx : n + dy));
    return `${cmd} ${shifted.join(' ')} `;
  });
}

function buildSeedPrompt(citation: string, heading: string | undefined, text: string): string {
  const title = heading ? `${citation} — ${heading}` : citation;
  return `Explain why this clause exists. Treat me as a thoughtful general reader who has not studied constitutional history in depth.

Clause: ${title}

Text: "${text}"

Give me the three-part seed answer described in your instructions.`;
}

function noKeyMessage(citation: string, heading?: string): string {
  const title = heading ? `${citation} — ${heading}` : citation;
  return `Live explanation is not available — \`VITE_ANTHROPIC_API_KEY\` is not set in \`.env.local\`.

To enable: copy \`.env.example\` to \`.env.local\`, paste your Anthropic API key, and restart \`vite\`.

You asked about ${title}. Once the key is set, the panel will stream a three-part answer: the founders' thinking, the prior law they reacted to, and the political ideal at stake.`;
}
