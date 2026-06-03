import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as fm } from 'framer-motion';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { Annotation, AnnotationMedia } from '@/lib/types';
import { TRACKER_RELATION_LABEL } from '@/lib/types';
import { getClause, useMerged } from '@/lib/dataAccess';
import { resolveAnchor } from '@/lib/anchors';
import { useNewfound } from '@/state/useNewfound';
import { useAuth } from '@/state/useAuth';
import {
  categoryColor,
  categoryLabel,
  effectiveVotes,
  score,
  spanCategory,
} from '@/lib/discussion';
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
  const addAnnotationToSpan = useNewfound((s) => s.addAnnotationToSpan);
  const voteAnnotation = useNewfound((s) => s.voteAnnotation);
  const myVotes = useNewfound((s) => s.myVotes);
  const user = useAuth((s) => s.user);
  const openAuthModal = useAuth((s) => s.openAuthModal);
  const merged = useMerged();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Transient highlight on the focused annotation — pulses briefly on open,
  // then fades away so the modal sits in a neutral resting state.
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  // Top-level comment composer toggle.
  const [composingTop, setComposingTop] = useState(false);

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

  const category = spanCategory(annotations, myVotes);

  // Build the thread: top-level comments (no parentId) sorted by score,
  // each with its replies sorted by score.
  const repliesByParent = new Map<string, Annotation[]>();
  for (const a of annotations) {
    if (!a.parentId) continue;
    const arr = repliesByParent.get(a.parentId) ?? [];
    arr.push(a);
    repliesByParent.set(a.parentId, arr);
  }
  const scoreOf = (a: Annotation) => score(effectiveVotes(a, myVotes[a.id]));
  const topLevel = annotations
    .filter((a) => !a.parentId)
    .sort((x, y) => scoreOf(y) - scoreOf(x));

  const addReply = (parentId: string, text: string) => {
    if (!user) return;
    const id = `user-reply-${Math.random().toString(36).slice(2, 10)}`;
    addAnnotationToSpan(span.id, {
      id,
      spanId: span.id,
      type: 'interpretation',
      parentId,
      userId: user.id,
      contributor: { name: user.name || user.username, descriptor: `@${user.username}` },
      era: new Date().getFullYear(),
      body: text,
      votes: { up: 0, down: 0 },
    });
  };

  // Add a top-level comment to THIS span, keeping the discussion unified
  // rather than spawning a separate span for the same quote.
  const addComment = (text: string) => {
    if (!user) return;
    const id = `user-comment-${Math.random().toString(36).slice(2, 10)}`;
    addAnnotationToSpan(span.id, {
      id,
      spanId: span.id,
      type: 'interpretation',
      userId: user.id,
      contributor: { name: user.name || user.username, descriptor: `@${user.username}` },
      era: new Date().getFullYear(),
      body: text,
      votes: { up: 0, down: 0 },
    });
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontStyle: 'normal',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    background: categoryColor(category),
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  {categoryLabel(category)}
                </span>
                <span>
                  {topLevel.length} comment{topLevel.length === 1 ? '' : 's'} ·{' '}
                  {annotations.filter((a) => !STATIC_IDS.has(a.id)).length} added in this session
                </span>
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
          <div style={{ marginTop: 12 }}>
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  closeDetail();
                  openAuthModal('login');
                }}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 11,
                  padding: '6px 12px',
                  background: 'var(--nf-focus)',
                  color: '#fff',
                  borderRadius: 2,
                }}
              >
                sign in to join the discussion
              </button>
            ) : composingTop ? (
              <ReplyBox
                topLevel
                onSubmit={(text) => {
                  addComment(text);
                  setComposingTop(false);
                }}
                onCancel={() => setComposingTop(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setComposingTop(true)}
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 11,
                  padding: '6px 12px',
                  background: 'var(--nf-focus)',
                  color: '#fff',
                  borderRadius: 2,
                }}
              >
                + add a comment
              </button>
            )}
          </div>
        </header>

        <ScrollArea.Root type="auto" style={{ minHeight: 0, flex: 1 }}>
          <ScrollArea.Viewport
            ref={viewportRef}
            data-panel-scrollable
            style={{ height: '100%', width: '100%' }}
          >
            <div style={{ padding: '16px 20px 24px' }}>
              {topLevel.map((a) => (
                <DiscussionThread
                  key={a.id}
                  annotation={a}
                  replies={(repliesByParent.get(a.id) ?? [])
                    .slice()
                    .sort((x, y) => scoreOf(y) - scoreOf(x))}
                  myVotes={myVotes}
                  onVote={voteAnnotation}
                  onDelete={removeAnnotation}
                  onReply={addReply}
                  canReply={Boolean(user)}
                  onRequireAuth={() => openAuthModal('login')}
                  isUser={(id) => !STATIC_IDS.has(id)}
                  pulse={
                    pulsingId === a.id
                      ? { token: focusToken, onDone: () => setPulsingId(null) }
                      : null
                  }
                />
              ))}
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

// ---- threaded discussion pieces ----------------------------------------

interface ThreadProps {
  annotation: Annotation;
  replies: Annotation[];
  myVotes: Record<string, 1 | -1>;
  onVote(id: string, dir: 1 | -1): void;
  onDelete(id: string): void;
  onReply(parentId: string, text: string): void;
  canReply: boolean;
  onRequireAuth(): void;
  isUser(id: string): boolean;
  pulse: { token: number; onDone(): void } | null;
}

function DiscussionThread({
  annotation,
  replies,
  myVotes,
  onVote,
  onDelete,
  onReply,
  canReply,
  onRequireAuth,
  isUser,
  pulse,
}: ThreadProps) {
  const [replying, setReplying] = useState(false);
  return (
    <article
      data-annotation-id={annotation.id}
      style={{ position: 'relative', padding: '14px 12px', borderTop: '1px solid var(--nf-rule-soft)' }}
    >
      <AnimatePresence>
        {pulse && (
          <fm.span
            key={pulse.token}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, times: [0, 0.18, 0.6, 1], ease: 'easeOut' }}
            onAnimationComplete={pulse.onDone}
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
        <AnnotationCard
          annotation={annotation}
          myVote={myVotes[annotation.id]}
          onVote={onVote}
          canDelete={isUser(annotation.id)}
          onDelete={onDelete}
          isUserComment={isUser(annotation.id)}
        />

        <div style={{ marginLeft: 38, marginTop: 6, display: 'flex', gap: 14 }}>
          <button
            type="button"
            onClick={() => {
              if (!canReply) {
                onRequireAuth();
                return;
              }
              setReplying((v) => !v);
            }}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: 'var(--nf-ink-soft)',
              padding: 0,
            }}
          >
            {replying ? 'cancel' : 'reply'}
          </button>
          {replies.length > 0 && (
            <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: 'var(--nf-ink-whisper)' }}>
              {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>

        {replying && canReply && (
          <ReplyBox
            onSubmit={(text) => {
              onReply(annotation.id, text);
              setReplying(false);
            }}
            onCancel={() => setReplying(false)}
          />
        )}

        {replies.length > 0 && (
          <div
            style={{
              marginLeft: 38,
              marginTop: 10,
              paddingLeft: 12,
              borderLeft: '2px solid var(--nf-rule-soft)',
              display: 'grid',
              gap: 12,
            }}
          >
            {replies.map((r) => (
              <AnnotationCard
                key={r.id}
                annotation={r}
                myVote={myVotes[r.id]}
                onVote={onVote}
                canDelete={isUser(r.id)}
                onDelete={onDelete}
                isUserComment={isUser(r.id)}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

interface CardProps {
  annotation: Annotation;
  myVote?: 1 | -1;
  onVote(id: string, dir: 1 | -1): void;
  canDelete: boolean;
  onDelete(id: string): void;
  isUserComment: boolean;
  compact?: boolean;
}

function AnnotationCard({ annotation: a, myVote, onVote, canDelete, onDelete, isUserComment, compact }: CardProps) {
  const v = effectiveVotes(a, myVote);
  const s = score(v);
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <VoteControl up={myVote === 1} down={myVote === -1} score={s} onVote={(dir) => onVote(a.id, dir)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          {!isUserComment && (
            <>
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
              <span className="font-smallcaps" style={{ color: `var(--nf-type-${a.type})`, fontWeight: 500 }}>
                {TYPE_LABEL[a.type]}
              </span>
            </>
          )}
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
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--nf-ink)',
            }}
          >
            {a.contributor.name}
          </span>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: 'var(--nf-ink-whisper)' }}>
            {a.contributor.descriptor}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--nf-ink-whisper)' }}>{a.era}</span>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(a.id)}
              aria-label="Delete"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 10,
                color: 'var(--nf-type-counterpoint)',
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
            marginTop: 4,
            fontFamily: 'Source Serif 4, serif',
            fontSize: compact ? 14 : 15,
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
    </div>
  );
}

function VoteControl({
  up,
  down,
  score: s,
  onVote,
}: {
  up: boolean;
  down: boolean;
  score: number;
  onVote(dir: 1 | -1): void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        width: 28,
        flexShrink: 0,
        paddingTop: 2,
      }}
    >
      <VoteArrow dir={1} active={up} onClick={() => onVote(1)} />
      <span
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          color: up ? 'var(--nf-disc-popular)' : down ? 'var(--nf-disc-controversial)' : 'var(--nf-ink-soft)',
          lineHeight: 1.1,
        }}
      >
        {s}
      </span>
      <VoteArrow dir={-1} active={down} onClick={() => onVote(-1)} />
    </div>
  );
}

function VoteArrow({ dir, active, onClick }: { dir: 1 | -1; active: boolean; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 1 ? 'Upvote' : 'Downvote'}
      aria-pressed={active}
      style={{
        lineHeight: 0,
        padding: 2,
        color: active
          ? dir === 1
            ? 'var(--nf-disc-popular)'
            : 'var(--nf-disc-controversial)'
          : 'var(--nf-ink-whisper)',
        cursor: 'pointer',
      }}
    >
      <svg width="14" height="9" viewBox="0 0 14 9" aria-hidden style={{ transform: dir === 1 ? 'none' : 'rotate(180deg)' }}>
        <path d="M7 0 L14 9 L0 9 Z" fill="currentColor" />
      </svg>
    </button>
  );
}

function ReplyBox({
  onSubmit,
  onCancel,
  topLevel,
}: {
  onSubmit(text: string): void;
  onCancel(): void;
  topLevel?: boolean;
}) {
  const [text, setText] = useState('');
  return (
    <div style={{ marginLeft: topLevel ? 0 : 38, marginTop: topLevel ? 0 : 8, display: 'grid', gap: 6 }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) onSubmit(text.trim());
          }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Write a reply…"
        style={{
          background: 'var(--nf-canvas)',
          color: 'var(--nf-ink)',
          border: '1px solid var(--nf-rule)',
          borderRadius: 3,
          padding: '8px 10px',
          fontFamily: 'Source Serif 4, serif',
          fontSize: 14,
          lineHeight: 1.5,
          resize: 'vertical',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: '5px 10px', color: 'var(--nf-ink-soft)' }}
        >
          cancel
        </button>
        <button
          type="button"
          onClick={() => text.trim() && onSubmit(text.trim())}
          disabled={!text.trim()}
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 11,
            fontWeight: 600,
            padding: '5px 12px',
            background: text.trim() ? 'var(--nf-focus)' : 'var(--nf-panel-deep)',
            color: text.trim() ? '#fff' : 'var(--nf-ink-whisper)',
            borderRadius: 3,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          reply
        </button>
      </div>
    </div>
  );
}
