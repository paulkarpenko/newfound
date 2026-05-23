import { useEffect, useRef, useState } from 'react';
import { getConcept } from '@/lib/concepts';
import { getClause, corpusBounds } from '@/lib/dataAccess';
import { PANEL_LANE_GAP, PANEL_LANE_WIDTH } from '@/lib/layout';
import { hasApiKey, streamClaude } from '@/lib/claude';
import { useNewfound } from '@/state/useNewfound';

const LIVE_SYSTEM_PROMPT = `You are a constitutional historian helping a reader understand a specific phrase they just selected from the United States Constitution. Reply in 2–4 short paragraphs of plain prose — no lists, no headings, no preamble. Define legal terms in everyday language, name the principle at stake, and where useful note the historical precedent the founders were drawing on. Be specific and confident; do not hedge with "some scholars argue." Aim for 90–160 words.`;

/**
 * Transient world-anchored panel that explains the selected text in
 * plain language. Connected to the anchor by a thin leader line drawn
 * inline. Dismissed with × or Escape.
 *
 * Unlike annotation panels, the explanation is not persisted in any data
 * model — it lives only as `explanation` state in the store and disappears
 * when the reader closes it or makes a new selection.
 */
export default function ExplanationPanel() {
  const explanation = useNewfound((s) => s.explanation);
  const close = useNewfound((s) => s.closeExplanation);
  const pin = useNewfound((s) => s.pinExplanation);
  const k = useNewfound((s) => s.transform.k);

  useEffect(() => {
    if (!explanation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [explanation, close]);

  const dragRef = useRef<{
    startClient: { x: number; y: number };
    startPanel: { x: number; y: number };
    moved: boolean;
  } | null>(null);

  const concept = explanation?.conceptId ? getConcept(explanation.conceptId) : undefined;
  const clause = explanation ? getClause(explanation.clauseId) : undefined;

  // Live-mode stream — runs when there's no static concept and we have an API key.
  const liveMode = Boolean(explanation && !concept);
  const [liveText, setLiveText] = useState('');
  const [liveStreaming, setLiveStreaming] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveAbortRef = useRef<AbortController | null>(null);

  // Re-seed the live stream whenever the targeted selection changes.
  // Keyed off exact + clauseId so re-selecting the same phrase doesn't refetch.
  const liveKey = liveMode
    ? `${explanation!.clauseId}::${explanation!.exact}`
    : null;
  useEffect(() => {
    liveAbortRef.current?.abort();
    setLiveText('');
    setLiveError(null);
    setLiveStreaming(false);
    if (!liveKey || !explanation || !clause) return;
    if (!hasApiKey()) {
      setLiveError(
        'Live explanation needs VITE_ANTHROPIC_API_KEY in .env.local. Restart vite after editing.',
      );
      return;
    }
    const controller = new AbortController();
    liveAbortRef.current = controller;
    setLiveStreaming(true);
    const prompt = `Clause: ${clause.citation}${clause.heading ? ' — ' + clause.heading : ''}
Full text: "${clause.text}"

The reader selected this phrase: "${explanation.exact}"

Explain what this phrase means and why it matters, briefly.`;
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

  if (!explanation || !clause) return null;

  // Panel lane position — adjacent to the clause's column, side from state.
  // When the reader has dragged the panel, pinnedAt overrides.
  const panelW = PANEL_LANE_WIDTH;
  const panelHeight = 320; // estimated; the panel itself sizes to content
  const defaultPanelX =
    explanation.side === 'left'
      ? clause.world.x - PANEL_LANE_GAP - PANEL_LANE_WIDTH
      : clause.world.x + clause.world.width + PANEL_LANE_GAP;
  const defaultPanelY = explanation.worldY - panelHeight / 2;
  const panelX = explanation.pinnedAt?.x ?? defaultPanelX;
  const panelY = explanation.pinnedAt?.y ?? defaultPanelY;

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('[data-explanation-button]')) return;
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
    // World-space delta — divide screen delta by the current zoom scale.
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

  // Leader line geometry in the world's own SVG (positioned at corpus bounds).
  const bounds = corpusBounds();
  const ax = explanation.worldX - bounds.x;
  const ay = explanation.worldY;
  const bx = (explanation.side === 'left' ? panelX + panelW : panelX) - bounds.x;
  const by = panelY + panelHeight / 2;
  const cx = explanation.side === 'left' ? (ax + bx) / 2 - 40 : (ax + bx) / 2 + 40;
  const cy = (ay + by) / 2;
  const d = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
  const strokePx = 1.25 / Math.max(0.001, k);

  return (
    <>
      <svg
        width={bounds.width}
        height={bounds.height + 800}
        style={{
          position: 'absolute',
          left: bounds.x,
          top: 0,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <path
          d={d}
          fill="none"
          stroke="var(--nf-focus)"
          strokeWidth={strokePx * 1.4}
          strokeOpacity={0.7}
        />
        <circle cx={ax} cy={ay} r={2.5 / Math.max(0.001, k)} fill="var(--nf-focus)" />
      </svg>

      <div
        data-no-pan
        data-panel-scrollable
        role="dialog"
        aria-label={`Explanation: ${concept ? concept.title : explanation.exact}`}
        style={{
          position: 'absolute',
          left: panelX,
          top: panelY,
          width: panelW,
          background: 'var(--nf-panel)',
          border: '1px solid var(--nf-focus)',
          borderRadius: 4,
          boxShadow: '0 8px 28px rgba(0,0,0,0.18), 0 0 0 1px rgba(47, 93, 151, 0.18)',
          zIndex: 8,
          overflow: 'hidden',
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
          <span
            className="font-smallcaps"
            style={{ color: 'var(--nf-focus)', flex: 1 }}
          >
            {liveMode ? '? live' : '? plain English'}
          </span>
          <button
            type="button"
            data-explanation-button
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close explanation"
            style={{ fontSize: 14, color: 'var(--nf-ink-soft)', padding: 4, lineHeight: 1 }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: '10px 12px 12px', maxHeight: 460, overflow: 'auto' }}>
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
      </div>
    </>
  );
}
