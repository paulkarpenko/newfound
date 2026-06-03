import type { Annotation } from './types';

/**
 * Discussion signals + category encoding.
 *
 * Each annotation carries vote counts. The local reader can cast one vote
 * (up or down) per annotation; that vote is layered on top of the base
 * counts. A span's underline color reflects the *character* of its
 * discussion (popular, controversial, hotly debated …) rather than raw
 * volume — so the document reads as a heat-map of where the argument is.
 */

export type Vote = 1 | -1;

export interface VoteCounts {
  up: number;
  down: number;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Base (pre-personal-vote) counts. User-authored annotations start empty.
 * Seed/system annotations get stable synthetic counts derived from their
 * id, so the discussion coloring is legible without a backend.
 */
export function baseVotes(a: Annotation): VoteCounts {
  if (a.votes) return a.votes;
  if (a.id.startsWith('user-')) return { up: 0, down: 0 };
  const h = hash(a.id);
  return { up: h % 41, down: Math.floor((h / 7) % 23) };
}

export function effectiveVotes(a: Annotation, myVote?: Vote): VoteCounts {
  const b = baseVotes(a);
  if (myVote === 1) return { up: b.up + 1, down: b.down };
  if (myVote === -1) return { up: b.up, down: b.down + 1 };
  return b;
}

export function score(v: VoteCounts): number {
  return v.up - v.down;
}

export function engagement(v: VoteCounts): number {
  return v.up + v.down;
}

/** 0 (one-sided) … 1 (evenly split). Only meaningful past a small floor. */
export function controversy(v: VoteCounts): number {
  const total = v.up + v.down;
  if (total < 6) return 0;
  const lo = Math.min(v.up, v.down);
  const hi = Math.max(v.up, v.down);
  return hi > 0 ? lo / hi : 0;
}

export type DiscussionCategory =
  | 'quiet'
  | 'emerging'
  | 'popular'
  | 'debated'
  | 'controversial';

/**
 * Derive a span's discussion category from all of its annotations
 * (top-level comments and replies alike).
 */
export function spanCategory(
  annotations: Annotation[],
  myVotes: Record<string, Vote>,
): DiscussionCategory {
  if (annotations.length === 0) return 'quiet';

  const replies = annotations.filter((a) => a.parentId).length;

  let totalEngagement = 0;
  let totalScore = 0;
  let contentionSum = 0;
  let contentionWeight = 0;
  for (const a of annotations) {
    const v = effectiveVotes(a, myVotes[a.id]);
    const e = engagement(v);
    totalEngagement += e;
    totalScore += score(v);
    contentionSum += controversy(v) * e;
    contentionWeight += e;
  }
  const avgContention = contentionWeight > 0 ? contentionSum / contentionWeight : 0;
  const volume = annotations.length + replies;

  if (totalEngagement < 8 && annotations.length <= 1) return 'quiet';
  if (avgContention >= 0.6 && totalEngagement >= 12) return 'controversial';
  if (replies >= 3 || volume >= 6) return 'debated';
  if (totalScore >= 25) return 'popular';
  return 'emerging';
}

const CATEGORY_VARS: Record<DiscussionCategory, string> = {
  quiet: '--nf-disc-quiet',
  emerging: '--nf-disc-emerging',
  popular: '--nf-disc-popular',
  debated: '--nf-disc-debated',
  controversial: '--nf-disc-controversial',
};

const CATEGORY_LABELS: Record<DiscussionCategory, string> = {
  quiet: 'quiet',
  emerging: 'emerging',
  popular: 'popular',
  debated: 'hotly debated',
  controversial: 'controversial',
};

export function categoryColor(c: DiscussionCategory): string {
  return `var(${CATEGORY_VARS[c]})`;
}

export function categoryLabel(c: DiscussionCategory): string {
  return CATEGORY_LABELS[c];
}

/** Underline weight, paired with color so the encoding is redundant. */
export function categoryUnderlineWeight(c: DiscussionCategory): number {
  if (c === 'quiet') return 1.2;
  if (c === 'emerging') return 1.7;
  if (c === 'popular') return 2.4;
  return 2.8; // debated / controversial — loudest
}
