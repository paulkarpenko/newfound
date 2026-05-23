/**
 * Annotation-density encoding — used IDENTICALLY at every tier
 * (Tier-1 blocks, Tier-2 underlines, minimap tint).
 *
 * Six buckets via CSS custom properties so themes can swap the ramp.
 */

export type DensityBucket = 0 | 1 | 2 | 3 | 4 | 5;

const BUCKET_VARS = [
  '--nf-density-0',
  '--nf-density-1',
  '--nf-density-2',
  '--nf-density-3',
  '--nf-density-4',
  '--nf-density-5',
] as const;

const BUCKET_LABELS = [
  'untouched',
  'lightly annotated',
  'somewhat annotated',
  'well annotated',
  'heavily annotated',
  'most annotated',
] as const;

/** Map an annotation count to a bucket. Globally normalized — pass max if known. */
export function densityBucket(count: number, max: number): DensityBucket {
  if (count <= 0) return 0;
  const t = max > 0 ? count / max : 0;
  // Compress with sqrt so a few well-annotated clauses do not flatten the rest.
  const s = Math.sqrt(t);
  if (s < 0.2) return 1;
  if (s < 0.4) return 2;
  if (s < 0.6) return 3;
  if (s < 0.8) return 4;
  return 5;
}

export function densityColor(bucket: DensityBucket): string {
  return `var(${BUCKET_VARS[bucket]})`;
}

export function densityLabel(bucket: DensityBucket): string {
  return BUCKET_LABELS[bucket];
}

/** Underline weight for a Tier-2 span — paired with color so encoding is redundant. */
export function densityUnderlineWeight(bucket: DensityBucket): number {
  return 1 + bucket * 0.6;
}
