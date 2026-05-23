import conceptsData from '@/data/concepts.json';

export interface Concept {
  id: string;
  clauseId: string;
  triggers: string[];
  title: string;
  explanation: string;
}

const CONCEPTS: Concept[] = (conceptsData as { concepts: Concept[] }).concepts;
const BY_CLAUSE = new Map<string, Concept[]>();
for (const c of CONCEPTS) {
  const arr = BY_CLAUSE.get(c.clauseId) ?? [];
  arr.push(c);
  BY_CLAUSE.set(c.clauseId, arr);
}

/**
 * Find the best concept to explain the user's selection.
 *
 * Only returns a concept when one of its triggers genuinely overlaps the
 * selection (the selection contains the trigger, or the trigger contains
 * the selection). Returns null otherwise — the caller then falls back to
 * live mode, which streams a Claude answer about the actual selected
 * phrase. We do NOT fall back to the clause's first concept on a miss:
 * that produces canned, off-topic explanations.
 */
export function findConcept(clauseId: string, selection: string): Concept | null {
  const candidates = BY_CLAUSE.get(clauseId) ?? [];
  if (candidates.length === 0) return null;

  const sel = selection.toLowerCase().trim();
  if (!sel) return null;

  // Require a meaningful overlap. A 1–2 character "match" (e.g. selection
  // "we" inside trigger "we the people") would be noise; cap the lower
  // bound at 4 chars to keep matches recognizably on-topic.
  const MIN_OVERLAP = 4;

  let best: { concept: Concept; score: number } | null = null;
  for (const c of candidates) {
    for (const trig of c.triggers) {
      const t = trig.toLowerCase();
      let score = 0;
      if (sel.includes(t) && t.length >= MIN_OVERLAP) score = t.length;
      else if (t.includes(sel) && sel.length >= MIN_OVERLAP) score = sel.length;
      if (score > 0 && (!best || score > best.score)) {
        best = { concept: c, score };
      }
    }
  }
  return best?.concept ?? null;
}

export function conceptsForClause(clauseId: string): Concept[] {
  return BY_CLAUSE.get(clauseId) ?? [];
}

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}
