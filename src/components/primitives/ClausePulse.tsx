import { AnimatePresence, motion as fm } from 'framer-motion';
import { useNewfound } from '@/state/useNewfound';

interface ClausePulseProps {
  clauseId: string;
}

/**
 * A short-lived outline drawn over the clause when fly-to navigates to it.
 * The animation fades the outline in and back out over ~1.2 s, drawing the
 * eye to where the viewport just landed. Re-firing on the same clause is
 * handled by keying on `pulseToken`.
 */
export default function ClausePulse({ clauseId }: ClausePulseProps) {
  const pulseId = useNewfound((s) => s.pulseClauseId);
  const token = useNewfound((s) => s.pulseToken);
  const clearPulse = useNewfound((s) => s.clearPulse);
  const active = pulseId === clauseId;

  return (
    <AnimatePresence>
      {active && (
        <fm.span
          key={token}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, times: [0, 0.18, 0.6, 1], ease: 'easeOut' }}
          onAnimationComplete={() => clearPulse(clauseId)}
          style={{
            position: 'absolute',
            inset: -4,
            border: '2px solid var(--nf-focus)',
            borderRadius: 6,
            boxShadow: '0 0 0 4px rgba(47, 93, 151, 0.18)',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}
