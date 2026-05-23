import { useEffect, useState } from 'react';
import { ANNOTATION_TYPES, type AnnotationType } from '@/lib/types';
import { getClause } from '@/lib/dataAccess';
import { useNewfound } from '@/state/useNewfound';

const TYPE_LABEL: Record<AnnotationType, string> = {
  interpretation: 'interpretation',
  evidence: 'evidence',
  counterpoint: 'counterpoint',
  crossref: 'cross-ref',
  context: 'context',
  media: 'media',
  question: 'question',
  // `tracker` and `founding` are system-only types; readers can't author one
  // through the composer.
  tracker: 'tracker',
  founding: 'founding',
};

const SELECTABLE_TYPES: AnnotationType[] = ANNOTATION_TYPES.filter(
  (t) => t !== 'tracker' && t !== 'founding',
);

/**
 * Annotation composer. Opens when the AnnotatePill is clicked. Positions
 * itself in screen space near the captured selection.
 */
export default function Composer() {
  const selection = useNewfound((s) => s.composerSelection);
  const composerOpen = useNewfound((s) => s.composerOpen);
  const cancel = useNewfound((s) => s.cancelComposing);
  const add = useNewfound((s) => s.addSpanAndAnnotation);

  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnotationType>('interpretation');
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [era, setEra] = useState(new Date().getFullYear());

  useEffect(() => {
    if (composerOpen && selection) {
      setBody('');
      setName('');
      setDescriptor('');
      setEra(new Date().getFullYear());
      setType('interpretation');
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

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const id = `user-${Math.random().toString(36).slice(2, 10)}`;
    const spanId = `user-span-${id}`;
    const annoId = `user-anno-${id}`;
    const clause = getClause(selection.clauseId);
    let side: 'left' | 'right' = 'right';
    if (clause) {
      const localX = selection.worldX - clause.world.x;
      side = localX < clause.world.width / 2 ? 'left' : 'right';
    }
    add(
      {
        id: spanId,
        clauseId: selection.clauseId,
        selector: [
          { type: 'TextQuoteSelector', exact: selection.exact, prefix: selection.prefix, suffix: selection.suffix },
        ],
        annotationIds: [],
      },
      {
        id: annoId,
        spanId,
        type,
        contributor: {
          name: name.trim() || 'Anonymous contributor',
          descriptor: descriptor.trim() || 'Newfound reader',
        },
        era,
        body: trimmed,
      },
      side,
    );
  };

  // Position the composer in screen space near the selection. Clamp to viewport.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const composerW = 380;
  let left = selection.screenX - composerW / 2;
  left = Math.max(12, Math.min(vw - composerW - 12, left));
  let top = selection.screenY + 12;
  top = Math.min(vh - 480, top);

  return (
    <div
      data-no-pan
      role="dialog"
      aria-label="Add an annotation"
      aria-modal="false"
      style={{
        position: 'fixed',
        left,
        top,
        width: composerW,
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        boxShadow: '0 14px 40px rgba(0,0,0,0.20)',
        zIndex: 70,
      }}
    >
      <header
        style={{
          padding: '10px 12px',
          background: 'var(--nf-panel-deep)',
          borderBottom: '1px solid var(--nf-rule)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <p className="font-smallcaps">new annotation</p>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel composer"
          style={{ fontSize: 14, color: 'var(--nf-ink-soft)', padding: 4 }}
        >
          ×
        </button>
      </header>

      <div style={{ padding: 12, display: 'grid', gap: 10 }}>
        <blockquote
          style={{
            fontFamily: 'Source Serif 4, serif',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--nf-ink)',
            borderLeft: '2px solid var(--nf-density-3)',
            paddingLeft: 8,
            margin: 0,
          }}
        >
          "{selection.exact}"
        </blockquote>

        <label style={{ display: 'grid', gap: 4 }}>
          <span className="font-smallcaps">your annotation</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoFocus
            rows={4}
            style={{
              background: 'var(--nf-canvas)',
              color: 'var(--nf-ink)',
              border: '1px solid var(--nf-rule)',
              borderRadius: 2,
              padding: 8,
              fontFamily: 'Source Serif 4, serif',
              fontSize: 13,
              lineHeight: 1.5,
              resize: 'vertical',
            }}
            placeholder="What does this passage mean — or do — that the reader should see?"
          />
        </label>

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="font-smallcaps">type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AnnotationType)}
              style={{
                background: 'var(--nf-canvas)',
                color: 'var(--nf-ink)',
                border: '1px solid var(--nf-rule)',
                borderRadius: 2,
                padding: '6px 8px',
                fontSize: 12,
              }}
            >
              {SELECTABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="font-smallcaps">era (year)</span>
            <input
              type="number"
              value={era}
              onChange={(e) => setEra(Number(e.target.value) || new Date().getFullYear())}
              style={{
                background: 'var(--nf-canvas)',
                color: 'var(--nf-ink)',
                border: '1px solid var(--nf-rule)',
                borderRadius: 2,
                padding: '6px 8px',
                fontSize: 12,
              }}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 4 }}>
          <span className="font-smallcaps">your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="optional"
            style={{
              background: 'var(--nf-canvas)',
              color: 'var(--nf-ink)',
              border: '1px solid var(--nf-rule)',
              borderRadius: 2,
              padding: '6px 8px',
              fontSize: 12,
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span className="font-smallcaps">descriptor (role, source)</span>
          <input
            value={descriptor}
            onChange={(e) => setDescriptor(e.target.value)}
            placeholder="e.g. lawyer, historian, reader from St. Louis"
            style={{
              background: 'var(--nf-canvas)',
              color: 'var(--nf-ink)',
              border: '1px solid var(--nf-rule)',
              borderRadius: 2,
              padding: '6px 8px',
              fontSize: 12,
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={cancel}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 11,
              padding: '6px 10px',
              color: 'var(--nf-ink-soft)',
            }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!body.trim()}
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 11,
              padding: '6px 12px',
              background: body.trim() ? 'var(--nf-density-4)' : 'var(--nf-panel-deep)',
              color: body.trim() ? '#fff' : 'var(--nf-ink-whisper)',
              borderRadius: 2,
              cursor: body.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            add annotation
          </button>
        </div>

        <p style={{ fontSize: 10, color: 'var(--nf-ink-whisper)', fontStyle: 'italic', textAlign: 'right' }}>
          Newfound v1 has no backend — your annotation lives in this session only.
        </p>
      </div>
    </div>
  );
}
