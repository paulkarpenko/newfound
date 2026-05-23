import type { Selector } from './types';

/**
 * W3C Web Annotation selector resolution.
 *
 *  1. Try TextPositionSelector — accept if the slice matches the quote
 *     (when a quote selector is present).
 *  2. Fall back to TextQuoteSelector, disambiguating by prefix/suffix
 *     among multiple occurrences.
 *
 * Returns null if neither resolves.
 */
export function resolveAnchor(
  selectors: Selector[],
  text: string,
): { start: number; end: number; matched: 'position' | 'quote' } | null {
  const position = selectors.find(
    (s): s is Extract<Selector, { type: 'TextPositionSelector' }> =>
      s.type === 'TextPositionSelector',
  );
  const quote = selectors.find(
    (s): s is Extract<Selector, { type: 'TextQuoteSelector' }> =>
      s.type === 'TextQuoteSelector',
  );

  if (position) {
    const { start, end } = position;
    if (
      start >= 0 &&
      end <= text.length &&
      start < end &&
      (!quote || text.slice(start, end) === quote.exact)
    ) {
      return { start, end, matched: 'position' };
    }
  }

  if (quote) {
    const { exact, prefix, suffix } = quote;
    const candidates: number[] = [];
    let i = -1;
    while ((i = text.indexOf(exact, i + 1)) !== -1) candidates.push(i);

    for (const idx of candidates) {
      const before = text.slice(Math.max(0, idx - (prefix?.length ?? 0)), idx);
      const after = text.slice(idx + exact.length, idx + exact.length + (suffix?.length ?? 0));
      const prefixOK = !prefix || prefix.length === 0 || before.endsWith(prefix);
      const suffixOK = !suffix || suffix.length === 0 || after.startsWith(suffix);
      if (prefixOK && suffixOK) {
        return { start: idx, end: idx + exact.length, matched: 'quote' };
      }
    }
    if (candidates.length > 0) {
      const idx = candidates[0];
      return { start: idx, end: idx + exact.length, matched: 'quote' };
    }
  }

  return null;
}
