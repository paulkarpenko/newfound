import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { ANNOTATION_TYPES, type AnnotationType } from '@/lib/types';
import { useNewfound } from '@/state/useNewfound';

const TYPE_LABEL: Record<AnnotationType, string> = {
  interpretation: 'interp',
  evidence: 'evid',
  counterpoint: 'counter',
  crossref: 'xref',
  context: 'context',
  media: 'media',
  question: 'question',
  tracker: 'tracker',
  founding: 'founding',
};

/**
 * Subtle facet filter — dims non-matching spans + panels everywhere.
 * Lives in screen-space (outside #world) so it doesn't scale with zoom.
 */
export default function FacetFilter() {
  const facetTypes = useNewfound((s) => s.facetTypes);
  const toggleFacetType = useNewfound((s) => s.toggleFacetType);
  const clearFacets = useNewfound((s) => s.clearFacets);

  return (
    <div
      data-no-pan
      role="group"
      aria-label="Annotation type filter"
      className="pointer-events-auto absolute left-1/2 top-4 z-30 -translate-x-1/2"
      style={{
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        padding: '4px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span className="font-smallcaps mr-1">filter</span>
      <ToggleGroup.Root
        type="multiple"
        value={[...facetTypes]}
        onValueChange={(value) => {
          const next = new Set(value as AnnotationType[]);
          const cur = facetTypes;
          for (const t of ANNOTATION_TYPES) {
            if (next.has(t) !== cur.has(t)) toggleFacetType(t);
          }
        }}
        className="flex gap-1"
      >
        {ANNOTATION_TYPES.map((t) => (
          <ToggleGroup.Item
            key={t}
            value={t}
            aria-label={`Filter to ${t} annotations`}
            className="font-smallcaps inline-flex items-center gap-1 px-2 py-1"
            style={{
              background: facetTypes.has(t) ? 'var(--nf-panel-deep)' : 'transparent',
              color: facetTypes.has(t) ? 'var(--nf-ink)' : 'var(--nf-ink-soft)',
              border: '1px solid var(--nf-rule-soft)',
              borderRadius: 2,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: `var(--nf-type-${t})`,
              }}
            />
            {TYPE_LABEL[t]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      {facetTypes.size > 0 && (
        <button
          type="button"
          onClick={clearFacets}
          className="font-smallcaps ml-1 underline-offset-4 hover:underline"
          style={{ color: 'var(--nf-ink-soft)' }}
        >
          clear
        </button>
      )}
    </div>
  );
}
