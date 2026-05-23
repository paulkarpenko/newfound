import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as fm } from 'framer-motion';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { Annotation, AnnotationMedia } from '@/lib/types';
import { TRACKER_RELATION_LABEL } from '@/lib/types';
import { getClause, useMerged } from '@/lib/dataAccess';
import { resolveAnchor } from '@/lib/anchors';
import { useNewfound } from '@/state/useNewfound';
import staticAnnotations from '@/data/annotations.json';

const STATIC_IDS = new Set((staticAnnotations as Annotation[]).map((a) => a.id));

const TYPE_LABEL: Record<string, string> = {
  interpretation: 'interpretation',
  evidence: 'evidence',
  counterpoint: 'counterpoint',
  crossref: 'cross-ref',
  context: 'context',
  media: 'media',
  question: 'question',
  tracker: 'live legal challenge',
  founding: 'founding-era',
};

function youtubeEmbedSrc(src: string): string {
  // Accept full URLs or bare IDs.
  // Examples handled:
  //   https://www.youtube.com/watch?v=ID
  //   https://youtu.be/ID
  //   https://www.youtube.com/embed/ID
  //   ID
  const m =
    src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/) ||
    src.match(/^([A-Za-z0-9_-]{6,})$/);
  const id = m ? m[1] : src;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

function MediaBlock({ media }: { media: AnnotationMedia }) {
  if (media.kind === 'youtube') {
    return (
      <figure style={{ margin: '12px 0 0', width: '100%' }}>
        <div
          style={{
            position: 'relative',
            paddingTop: '56.25%',
            background: 'var(--nf-panel-deep)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid var(--nf-rule)',
          }}
        >
          <iframe
            src={youtubeEmbedSrc(media.src)}
            title={media.caption}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
          />
        </div>
        {media.caption && (
          <figcaption
            style={{
              marginTop: 6,
              fontSize: 11,
              fontStyle: 'italic',
              color: 'var(--nf-ink-whisper)',
            }}
          >
            {media.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  if (media.kind === 'image') {
    return (
      <figure style={{ margin: '12px 0 0' }}>
        <img src={media.src} alt={media.caption} style={{ maxWidth: '100%', borderRadius: 3 }} />
        <figcaption style={{ marginTop: 6, fontSize: 11, fontStyle: 'italic', color: 'var(--nf-ink-whisper)' }}>
          {media.caption}
        </figcaption>
      </figure>
    );
  }
  if (media.kind === 'link') {
    return (
      <p style={{ marginTop: 8 }}>
        <a
          href={media.src}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--nf-focus)', fontSize: 12 }}
        >
          ↗ {media.caption || media.src}
        </a>
      </p>
    );
  }
  return null;
}

export default function AnnotationDetailModal() {
  const spanId = useNewfound((s) => s.detailSpanId);
  const focusId = useNewfound((s) => s.detailFocusAnnotationId);
  const focusToken = useNewfound((s) => s.detailFocusToken);
  const closeDetail = useNewfound((s) => s.closeDetail);
  const removeAnnotation = useNewfound((s) => s.removeAnnotation);
  const startComposing = useNewfound((s) => s.startComposing);
  const openComposer = useNewfound((s) => s.openComposer);
  const merged = useMerged();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Transient highlight on the focused annotation — pulses briefly on open,
  // then fades away so the modal sits in a neutral resting state.
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  useEffect(() => {
    if (!spanId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spanId, closeDetail]);

  // Scroll to focus annotation on open + trigger the pulse. Re-fires on every
  // openDetail call (via focusToken) so clicking the same annotation again
  // re-pulses.
  useEffect(() => {
    if (!spanId || !focusId) return;
    setPulsingId(focusId);
    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-annotation-id="${focusId}"]`) as HTMLElement | null;
      if (el && viewportRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spanId, focusId, focusToken]);

  if (!spanId) return null;
  const span = merged.getSpan(spanId);
  const clause = span ? getClause(span.clauseId) : undefined;
  if (!span || !clause) return null;
  const annotations = merged.annotationsForSpan(span.id);
  const resolved = resolveAnchor(span.selector, clause.text);
  const quote = resolved ? clause.text.slice(resolved.start, resolved.end) : '';

  const onAddAnother = () => {
    // Open the composer with this span's quote pre-filled, anchored to the
    // same selector. Bypasses the pill flow because we already know the
    // target span.
    const cx = clause.world.x + clause.world.width / 2;
    const cy = clause.world.y + clause.world.height / 2;
    startComposing({
      clauseId: clause.id,
      exact: quote,
      prefix: resolved ? clause.text.slice(Math.max(0, resolved.start - 20), resolved.start) : '',
      suffix: resolved ? clause.text.slice(resolved.end, resolved.end + 20) : '',
      screenX: window.innerWidth / 2,
      screenY: 120,
      worldX: cx,
      worldY: cy,
    });
    openComposer();
    closeDetail();
  };

  return (
    <div
      data-no-pan
      data-panel-scrollable
      role="dialog"
      aria-modal="true"
      aria-label={`Annotations on "${quote}"`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0, 0, 0, 0.36)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4vh 2vw',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDetail();
      }}
    >
      <div
        style={{
          width: 'min(820px, 92vw)',
          maxHeight: '92vh',
          background: 'var(--nf-panel)',
          border: '1px solid var(--nf-rule)',
          borderRadius: 6,
          boxShadow: '0 24px 60px rgba(0,0,0,0.30)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--nf-rule)',
            background: 'var(--nf-panel-deep)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p className="font-smallcaps">{clause.citation}</p>
              <h2
                style={{
                  fontFamily: 'Source Serif 4, serif',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: 'var(--nf-ink)',
                  margin: '4px 0 0',
                  lineHeight: 1.35,
                }}
              >
                "{quote}"
              </h2>
              <p
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: 'var(--nf-ink-whisper)',
                  fontStyle: 'italic',
                }}
              >
                {annotations.length} annotation{annotations.length === 1 ? '' : 's'} ·
                {' '}
                {annotations.filter((a) => !STATIC_IDS.has(a.id)).length} added in this session
              </p>
            </div>
            <button
              type="button"
              onClick={closeDetail}
              aria-label="Close detail view"
              style={{
                fontSize: 20,
                color: 'var(--nf-ink-soft)',
                padding: '4px 8px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onAddAnother}
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 11,
                padding: '6px 12px',
                background: 'var(--nf-density-4)',
                color: '#fff',
                borderRadius: 2,
              }}
            >
              + add another annotation
            </button>
          </div>
        </header>

        <ScrollArea.Root type="auto" style={{ minHeight: 0, flex: 1 }}>
          <ScrollArea.Viewport
            ref={viewportRef}
            data-panel-scrollable
            style={{ height: '100%', width: '100%' }}
          >
            <div style={{ padding: '16px 20px 24px' }}>
              {annotations.map((a) => {
                const isPulsing = pulsingId === a.id;
                const userOwned = !STATIC_IDS.has(a.id);
                return (
                  <article
                    key={a.id}
                    data-annotation-id={a.id}
                    style={{
                      position: 'relative',
                      padding: '14px 12px',
                      borderTop: '1px solid var(--nf-rule-soft)',
                    }}
                  >
                    {/* Transient pulse overlay — draws the eye to the
                        annotation that was just clicked, then fades. */}
                    <AnimatePresence>
                      {isPulsing && (
                        <fm.span
                          key={focusToken}
                          aria-hidden
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 1, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 1.1,
                            times: [0, 0.18, 0.6, 1],
                            ease: 'easeOut',
                          }}
                          onAnimationComplete={() => setPulsingId(null)}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'var(--nf-panel-deep)',
                            borderRadius: 3,
                            boxShadow: '0 0 0 2px var(--nf-focus)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                    </AnimatePresence>
                    <div style={{ position: 'relative' }}>
                    <header style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        aria-hidden
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: `var(--nf-type-${a.type})`,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="font-smallcaps"
                        style={{ color: `var(--nf-type-${a.type})`, fontWeight: 500 }}
                      >
                        {TYPE_LABEL[a.type]}
                      </span>
                      {a.type === 'tracker' && a.relation && (
                        <span
                          style={{
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: 10,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: '#fff',
                            background: 'var(--nf-type-tracker)',
                            borderRadius: 2,
                            padding: '2px 6px',
                          }}
                        >
                          {TRACKER_RELATION_LABEL[a.relation]}
                        </span>
                      )}
                      {a.type === 'tracker' && a.issueArea && (
                        <span
                          className="font-smallcaps"
                          style={{ color: 'var(--nf-ink-whisper)' }}
                        >
                          {a.issueArea}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--nf-ink-whisper)' }}>{a.era}</span>
                      {userOwned && (
                        <button
                          type="button"
                          onClick={() => removeAnnotation(a.id)}
                          aria-label="Delete this annotation"
                          style={{
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: 10,
                            color: 'var(--nf-stance-contests, var(--nf-type-counterpoint))',
                            padding: '2px 6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                          }}
                        >
                          delete
                        </button>
                      )}
                    </header>
                    <p
                      style={{
                        marginTop: 6,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--nf-ink)',
                      }}
                    >
                      {a.contributor.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--nf-ink-whisper)',
                        fontStyle: 'italic',
                        marginBottom: 8,
                      }}
                    >
                      {a.contributor.descriptor}
                      {userOwned && (
                        <span style={{ marginLeft: 8, color: 'var(--nf-density-4)' }}>· added by you</span>
                      )}
                    </p>
                    <p
                      style={{
                        fontFamily: 'Source Serif 4, serif',
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: 'var(--nf-ink)',
                      }}
                    >
                      {a.body}
                    </p>
                    {a.media && <MediaBlock media={a.media} />}
                    {a.type === 'tracker' && a.externalLink && (
                      <p style={{ marginTop: 10 }}>
                        <a
                          href={a.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            color: 'var(--nf-type-tracker)',
                            border: '1px solid var(--nf-type-tracker)',
                            padding: '4px 10px',
                            borderRadius: 2,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          open in tracker
                          <span aria-hidden>↗</span>
                        </a>
                      </p>
                    )}
                    </div>
                  </article>
                );
              })}
              {annotations.length === 0 && (
                <p
                  style={{
                    padding: '24px 0',
                    fontStyle: 'italic',
                    color: 'var(--nf-ink-whisper)',
                    textAlign: 'center',
                  }}
                >
                  No annotations on this excerpt. Add the first one above.
                </p>
              )}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" style={{ width: 6, padding: 1 }}>
            <ScrollArea.Thumb style={{ background: 'var(--nf-rule)', borderRadius: 3 }} />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>
    </div>
  );
}
