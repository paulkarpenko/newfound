import type { Clause, Section, WorldRect } from './types';

/**
 * One-time world-space layout pass over the corpus.
 *
 *  - Reading column width: 620 world-units.
 *  - The corpus is distributed horizontally into N columns:
 *      col 0 — Preamble + Articles I–VII
 *      col 1 — Bill of Rights (Amendments 1–10)
 *      col 2 — Amendments 11–27
 *    so the reader can see the whole document at Tier 1 without scrolling
 *    a single ribbon.
 *  - Within a column, clauses stack vertically with a fixed gap; sections
 *    have a larger gap.
 */

export const READING_COLUMN_WIDTH = 620;
export const READING_LINE_HEIGHT = 32;
export const CHARS_PER_LINE = 60;
export const CLAUSE_GAP = 36;
export const SECTION_GAP = 110;
export const TOP_PAD = 80;
export const HEADING_HEIGHT = 56;

export const PANEL_LANE_WIDTH = 300;
export const PANEL_LANE_GAP = 40;

/** Horizontal slot per column = lane + gap + text + gap + lane + inter-col gap. */
export const COLUMN_OUTER_WIDTH =
  PANEL_LANE_WIDTH + PANEL_LANE_GAP + READING_COLUMN_WIDTH + PANEL_LANE_GAP + PANEL_LANE_WIDTH;
export const INTER_COLUMN_GAP = 120;

/** X of the reading column for column index `col`. */
export function columnX(col: number): number {
  // Column 0 places its reading text at x=0 so left lane is negative.
  return col * (COLUMN_OUTER_WIDTH + INTER_COLUMN_GAP);
}

export function laneX(col: number, side: 'left' | 'right'): number {
  const cx = columnX(col);
  return side === 'left'
    ? cx - PANEL_LANE_GAP - PANEL_LANE_WIDTH
    : cx + READING_COLUMN_WIDTH + PANEL_LANE_GAP;
}

/** Assign each section to a column. */
export function columnForSection(section: Section): number {
  if (section.kind === 'preamble' || section.kind === 'article') return 0;
  if (section.kind === 'amendment' && section.ordinal <= 10) return 1;
  return 2;
}

export function estimateClauseHeight(text: string, hasHeading: boolean): number {
  const lines = Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
  const body = lines * READING_LINE_HEIGHT;
  const head = hasHeading ? HEADING_HEIGHT : 0;
  return head + body + 26;
}

/** Returns clauseId → world rect, with clauses partitioned across columns. */
export function layoutCorpus(
  sections: Section[],
  clauses: Clause[],
): Map<string, WorldRect> {
  const clauseIndex = new Map(clauses.map((c) => [c.id, c]));
  const out = new Map<string, WorldRect>();

  // Track each column's bottom Y as we lay sections out.
  const colCursor = new Map<number, number>();
  // Track which sections we've already laid out per column (for section gaps).
  const colSectionsSeen = new Map<number, number>();

  for (const section of sections) {
    const col = columnForSection(section);
    const x = columnX(col);

    let y = colCursor.get(col) ?? TOP_PAD;
    if ((colSectionsSeen.get(col) ?? 0) > 0) y += SECTION_GAP - CLAUSE_GAP;
    colSectionsSeen.set(col, (colSectionsSeen.get(col) ?? 0) + 1);

    for (const cid of section.clauseIds) {
      const c = clauseIndex.get(cid);
      if (!c) continue;
      const h = estimateClauseHeight(c.text, Boolean(c.heading));
      out.set(c.id, { x, y, width: READING_COLUMN_WIDTH, height: h });
      y += h + CLAUSE_GAP;
    }

    colCursor.set(col, y);
  }

  return out;
}

/** Approximate world-space y of a character offset within a clause. */
export function offsetToWorldY(clause: Clause, charOffset: number): number {
  const lineIndex = Math.floor(charOffset / CHARS_PER_LINE);
  const headOffset = clause.heading ? HEADING_HEIGHT : 0;
  return clause.world.y + headOffset + lineIndex * READING_LINE_HEIGHT + READING_LINE_HEIGHT / 2;
}

/** Corpus extent: spans every laid-out column + lane on either side. */
export function corpusExtent(clauses: Clause[]): { left: number; right: number; bottom: number } {
  let left = Infinity;
  let right = -Infinity;
  let bottom = 0;
  for (const c of clauses) {
    const colLeft = c.world.x - PANEL_LANE_GAP - PANEL_LANE_WIDTH;
    const colRight = c.world.x + c.world.width + PANEL_LANE_GAP + PANEL_LANE_WIDTH;
    if (colLeft < left) left = colLeft;
    if (colRight > right) right = colRight;
    const b = c.world.y + c.world.height;
    if (b > bottom) bottom = b;
  }
  if (!Number.isFinite(left)) left = 0;
  if (!Number.isFinite(right)) right = 0;
  return { left, right, bottom: bottom + TOP_PAD };
}
