import { densityColor, densityLabel, type DensityBucket } from '@/lib/density';

/**
 * Density legend — visible at every tier so the encoding is always interpretable.
 * Color is paired with weight in the same key the rest of the app uses,
 * so the encoding survives grayscale and color-blindness.
 */
export default function Legend() {
  const buckets: DensityBucket[] = [0, 1, 2, 3, 4, 5];
  return (
    <div
      role="region"
      aria-label="Annotation density legend"
      className="font-smallcaps flex items-center gap-2 px-3 py-2"
      style={{
        background: 'var(--nf-panel)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        boxShadow: '0 1px 0 var(--nf-rule)',
      }}
    >
      <span style={{ color: 'var(--nf-ink-soft)' }}>density</span>
      <span aria-hidden style={{ color: 'var(--nf-ink-whisper)' }}>·</span>
      <div className="flex items-stretch gap-0.5">
        {buckets.map((b) => (
          <div
            key={b}
            title={densityLabel(b)}
            aria-label={densityLabel(b)}
            style={{
              width: 18,
              height: 4 + b * 1.5,
              background: densityColor(b),
              alignSelf: 'end',
            }}
          />
        ))}
      </div>
      <span style={{ color: 'var(--nf-ink-whisper)', marginLeft: 4 }}>
        untouched → most annotated
      </span>
    </div>
  );
}
