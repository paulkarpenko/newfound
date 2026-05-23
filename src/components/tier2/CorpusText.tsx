import { allClauses } from '@/lib/dataAccess';
import ClauseBlock from './ClauseBlock';

/**
 * The reading column — every clause positioned absolutely at its world rect.
 * Text stays DOM (selectable, accessible) at all tiers; pan/zoom transforms
 * the parent World wrapper only.
 */
export default function CorpusText() {
  const clauses = allClauses();
  return (
    <div aria-label="Constitution of the United States">
      {clauses.map((c) => (
        <ClauseBlock key={c.id} clause={c} />
      ))}
    </div>
  );
}
