import { zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition';
import { easeCubicInOut } from 'd3-ease';
import { corpusBounds } from '@/lib/selectors';
import { fitTransform } from '@/lib/flyto';
import { useNewfound } from '@/state/useNewfound';

interface ChromeProps {
  zoomRef: { behavior: ZoomBehavior<HTMLDivElement, unknown> | null; element: HTMLDivElement | null };
}

export default function Chrome({ zoomRef }: ChromeProps) {
  const transform = useNewfound((s) => s.transform);
  const tier = useNewfound((s) => s.tier);
  const theme = useNewfound((s) => s.theme);
  const setTheme = useNewfound((s) => s.setTheme);

  const applyScaleBy = (factor: number) => {
    if (!zoomRef.element || !zoomRef.behavior) return;
    const el = zoomRef.element;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    // Anchor zoom on the viewport center via d3-zoom's scaleBy.
    select(el)
      .transition()
      .duration(220)
      .ease(easeCubicInOut)
      .call(zoomRef.behavior.scaleBy as never, factor, [cx, cy]);
  };

  const fit = () => {
    if (!zoomRef.element || !zoomRef.behavior) return;
    const el = zoomRef.element;
    const rect = el.getBoundingClientRect();
    const t = fitTransform(corpusBounds(), { width: rect.width, height: rect.height }, 60);
    const id = zoomIdentity.translate(t.x, t.y).scale(t.k);
    select(el)
      .transition()
      .duration(420)
      .ease(easeCubicInOut)
      .call(zoomRef.behavior.transform as never, id);
  };

  return (
    <div
      data-no-pan
      className="pointer-events-auto absolute right-4 top-4 z-30 flex flex-col gap-2"
      style={{ width: 48 }}
    >
      <ChromeButton aria-label="Zoom in" onClick={() => applyScaleBy(1.4)}>+</ChromeButton>
      <ChromeButton aria-label="Zoom out" onClick={() => applyScaleBy(1 / 1.4)}>−</ChromeButton>
      <ChromeButton aria-label="Fit corpus to screen" onClick={fit} small>fit</ChromeButton>
      <ChromeButton
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        small
      >
        {theme === 'light' ? 'dk' : 'lt'}
      </ChromeButton>
      <div
        className="font-smallcaps mt-2 text-center"
        style={{ color: 'var(--nf-ink-whisper)' }}
        aria-live="polite"
      >
        T{tier} · {Math.round(transform.k * 100)}%
      </div>
    </div>
  );
}

interface ChromeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  small?: boolean;
}

function ChromeButton({ small, children, ...rest }: ChromeButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex items-center justify-center transition-colors ${small ? 'h-8 text-[10px] uppercase tracking-[0.18em]' : 'h-10 text-[18px]'}`}
      style={{
        background: 'var(--nf-panel)',
        color: 'var(--nf-ink)',
        border: '1px solid var(--nf-rule)',
        borderRadius: 4,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}
