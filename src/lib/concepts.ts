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
 *  1. Concepts attached to the same clause are preferred.
 *  2. Among those, the trigger whose substring most closely matches the
 *     selection wins (longest trigger that the selection contains or that
 *     contains the selection).
 *  3. If no clause-specific concept matches, fall back to the clause's
 *     first concept (treating it as the "default" for that clause).
 *  4. If the clause has no concepts at all, return null and let the caller
 *     surface a graceful fallback.
 */
export function findConcept(clauseId: string, selection: string): Concept | null {
  const candidates = BY_CLAUSE.get(clauseId) ?? [];
  if (candidates.length === 0) return null;

  const sel = selection.toLowerCase().trim();
  if (!sel) return candidates[0];

  let best: { concept: Concept; score: number } | null = null;
  for (const c of candidates) {
    for (const trig of c.triggers) {
      const t = trig.toLowerCase();
      let score = 0;
      if (sel.includes(t)) score = t.length;
      else if (t.includes(sel)) score = sel.length;
      // Soft partial overlap — count consecutive shared characters from
      // the start as a tiebreaker for very short selections.
      if (score === 0) {
        let i = 0;
        while (i < sel.length && i < t.length && sel[i] === t[i]) i += 1;
        if (i >= 4) score = i / 2; // weak signal, halved
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { concept: c, score };
      }
    }
  }
  if (best) return best.concept;

  // No trigger fit — show the clause's first concept as a fallback so the
  // reader still gets a useful explanation.
  return candidates[0];
}

export function conceptsForClause(clauseId: string): Concept[] {
  return BY_CLAUSE.get(clauseId) ?? [];
}

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id);
}
