import { useMemo } from 'react';
import constitutionData from '@/data/constitution.json';
import spansData from '@/data/spans.json';
import annotationsData from '@/data/annotations.json';
import trackerData from '@/data/tracker.json';
import federalistData from '@/data/federalist.json';
import type {
  Annotation,
  Clause,
  Section,
  Span,
  TrackerRelation,
} from './types';
import { corpusExtent, layoutCorpus } from './layout';
import { resolveAnchor } from './anchors';
import { useNewfound } from '@/state/useNewfound';

interface TrackerProvision {
  ref: string;
  clauseId: string;
  quote: { exact: string; prefix?: string; suffix?: string };
  concept: string;
}
interface TrackerActionLink {
  ref: string;
  relation: TrackerRelation;
  reasoning: string;
}
interface TrackerAction {
  id: string;
  issueArea: string;
  actionGroup: string;
  /** Optional override; usually derived from trackerBaseUrl + action group. */
  externalLink?: string;
  era: number;
  links: TrackerActionLink[];
}
interface TrackerFile {
  metadata: {
    project: string;
    asOf: string;
    actionSpine: string;
    trackerBaseUrl: string;
    rule: string;
  };
  provisions: TrackerProvision[];
  actions: TrackerAction[];
}

/**
 * Build a URL to the Just Security tracker page with a text fragment that
 * highlights the action group's name on load (Chrome / Edge / Firefox /
 * recent Safari). The base page filters its rows in-place via DataTables,
 * so there is no per-row anchor — the text fragment is the closest
 * practical deep link.
 */
function trackerActionUrl(base: string, actionGroup: string): string {
  // Use up to the first parenthetical (strip "(EO 14160)" etc.) so the
  // highlighted phrase reads cleanly on page.
  const phrase = actionGroup.split(/\s*\(/)[0].trim().slice(0, 80);
  return `${base}#:~:text=${encodeURIComponent(phrase)}`;
}

// ---- Federalist Papers --------------------------------------------------

interface FederalistPaper {
  num: number;
  author: 'Hamilton' | 'Madison' | 'Jay' | string;
  title: string;
  era: number;
}
interface FederalistAnnotation {
  paper: number;
  clauseId: string;
  quote: { exact: string; prefix?: string; suffix?: string };
  body: string;
}
interface FederalistFile {
  metadata: { source: string; publishedRange: string; asOf: string; urlPattern: string };
  papers: FederalistPaper[];
  annotations: FederalistAnnotation[];
}

function federalistUrl(pattern: string, num: number): string {
  return pattern.replace('{NN}', num.toString().padStart(2, '0'));
}

// ---- Static foundations (the corpus does not change at runtime) ---------

const SECTIONS = (constitutionData as { sections: Section[] }).sections;
const RAW_CLAUSES = (constitutionData as { clauses: Omit<Clause, 'world'>[] }).clauses;
const SEED_SPANS = spansData as Span[];
const SEED_ANNOTATIONS = annotationsData as Annotation[];
const TRACKER = trackerData as TrackerFile;
const FEDERALIST = federalistData as FederalistFile;

const LAYOUT = layoutCorpus(
  SECTIONS,
  RAW_CLAUSES.map((c) => ({ ...c, world: { x: 0, y: 0, width: 0, height: 0 } })),
);
const CLAUSES: Clause[] = RAW_CLAUSES.map((c) => ({
  ...c,
  world: LAYOUT.get(c.id) ?? { x: 0, y: 0, width: 0, height: 0 },
}));

const SECTION_INDEX = new Map(SECTIONS.map((s) => [s.id, s]));
const CLAUSE_INDEX = new Map(CLAUSES.map((c) => [c.id, c]));
const EXTENT = corpusExtent(CLAUSES);

/**
 * Expand the tracker crosswalk into spans + annotations.
 *
 *  - Each provision becomes (at most) one span. Where an existing seed span
 *    already covers the same range on the same clause, that span is reused
 *    so the underline density reflects both layers.
 *  - Each action × link becomes one annotation of type 'tracker', attached
 *    to the provision's span.
 *
 * Result is appended to the seed spans/annotations and from then on flows
 * through the same merged-data path that user-added entries use.
 */
function expandTracker(): { spans: Span[]; annotations: Annotation[] } {
  const seedByClause = new Map<string, Span[]>();
  for (const s of SEED_SPANS) {
    const arr = seedByClause.get(s.clauseId) ?? [];
    arr.push(s);
    seedByClause.set(s.clauseId, arr);
  }

  const spansByRef = new Map<string, Span>();
  const outSpans: Span[] = [];

  for (const p of TRACKER.provisions) {
    const clause = CLAUSE_INDEX.get(p.clauseId);
    if (!clause) continue;

    const selector = [
      { type: 'TextQuoteSelector' as const, exact: p.quote.exact, prefix: p.quote.prefix, suffix: p.quote.suffix },
    ];
    const resolved = resolveAnchor(selector, clause.text);
    if (!resolved) {
      // eslint-disable-next-line no-console
      console.warn(`[tracker] provision ${p.ref} could not anchor "${p.quote.exact}" in ${p.clauseId}`);
      continue;
    }

    // Look for an existing seed span on the same clause covering the same range.
    const existing = (seedByClause.get(p.clauseId) ?? []).find((sp) => {
      const r = resolveAnchor(sp.selector, clause.text);
      return r && r.start === resolved.start && r.end === resolved.end;
    });

    if (existing) {
      spansByRef.set(p.ref, existing);
    } else {
      const id = `tracker-span-${p.ref}`;
      const span: Span = {
        id,
        clauseId: p.clauseId,
        selector,
        annotationIds: [],
      };
      spansByRef.set(p.ref, span);
      outSpans.push(span);
    }
  }

  const base = TRACKER.metadata.trackerBaseUrl;
  const outAnnotations: Annotation[] = [];
  for (const action of TRACKER.actions) {
    const externalLink = action.externalLink ?? trackerActionUrl(base, action.actionGroup);
    for (const link of action.links) {
      const span = spansByRef.get(link.ref);
      if (!span) continue;
      const annoId = `tracker-${action.id}--${link.ref}`;
      const annotation: Annotation = {
        id: annoId,
        spanId: span.id,
        type: 'tracker',
        contributor: {
          name: action.actionGroup,
          descriptor: action.issueArea,
        },
        era: action.era,
        body: link.reasoning,
        relation: link.relation,
        externalLink,
        actionGroup: action.actionGroup,
        issueArea: action.issueArea,
      };
      outAnnotations.push(annotation);
      span.annotationIds.push(annoId);
    }
  }

  return { spans: outSpans, annotations: outAnnotations };
}

/**
 * Expand the Federalist Papers crosswalk into spans + annotations.
 * Same structural pattern as the tracker layer — provisions become spans
 * (reusing any equivalent seed/tracker span), and each paper × clause
 * mapping becomes one annotation of type 'founding'.
 */
function expandFederalist(extraSpans: Span[]): { spans: Span[]; annotations: Annotation[] } {
  // Combine every span already known (seed + tracker) so we can reuse them
  // wherever the Federalist mapping points to identical text.
  const existingByClause = new Map<string, Span[]>();
  for (const s of [...SEED_SPANS, ...extraSpans]) {
    const arr = existingByClause.get(s.clauseId) ?? [];
    arr.push(s);
    existingByClause.set(s.clauseId, arr);
  }

  const paperByNum = new Map(FEDERALIST.papers.map((p) => [p.num, p]));

  const outSpans: Span[] = [];
  const outAnnotations: Annotation[] = [];
  // Local cache of synthetic spans we've already created in this pass —
  // multiple paper mappings can land on the same (clauseId, quote) pair.
  const syntheticByKey = new Map<string, Span>();

  for (const m of FEDERALIST.annotations) {
    const paper = paperByNum.get(m.paper);
    if (!paper) {
      // eslint-disable-next-line no-console
      console.warn(`[federalist] unknown paper ${m.paper}`);
      continue;
    }
    const clause = CLAUSE_INDEX.get(m.clauseId);
    if (!clause) {
      // eslint-disable-next-line no-console
      console.warn(`[federalist] paper ${m.paper}: unknown clauseId ${m.clauseId}`);
      continue;
    }
    const selector = [
      { type: 'TextQuoteSelector' as const, exact: m.quote.exact, prefix: m.quote.prefix, suffix: m.quote.suffix },
    ];
    const resolved = resolveAnchor(selector, clause.text);
    if (!resolved) {
      // eslint-disable-next-line no-console
      console.warn(`[federalist] paper ${m.paper}: could not anchor "${m.quote.exact}" in ${m.clauseId}`);
      continue;
    }

    // Reuse an existing span when one covers the same range.
    const existing = (existingByClause.get(m.clauseId) ?? []).find((sp) => {
      const r = resolveAnchor(sp.selector, clause.text);
      return r && r.start === resolved.start && r.end === resolved.end;
    });
    let span: Span;
    if (existing) {
      span = existing;
    } else {
      const key = `${m.clauseId}|${resolved.start}|${resolved.end}`;
      const cached = syntheticByKey.get(key);
      if (cached) {
        span = cached;
      } else {
        span = {
          id: `fed-span-${m.clauseId}-${resolved.start}-${resolved.end}`,
          clauseId: m.clauseId,
          selector,
          annotationIds: [],
        };
        syntheticByKey.set(key, span);
        outSpans.push(span);
      }
    }

    const annoId = `federalist-${m.paper}--${span.id}`;
    const annotation: Annotation = {
      id: annoId,
      spanId: span.id,
      type: 'founding',
      contributor: {
        name: `Federalist No. ${m.paper} (${paper.author})`,
        descriptor: paper.title,
      },
      era: paper.era,
      body: m.body,
      media: {
        kind: 'link',
        src: federalistUrl(FEDERALIST.metadata.urlPattern, m.paper),
        caption: `Read Federalist No. ${m.paper} at the Avalon Project (Yale Law School)`,
      },
    };
    outAnnotations.push(annotation);
    span.annotationIds.push(annoId);
  }

  return { spans: outSpans, annotations: outAnnotations };
}

const EXPANDED_TRACKER = expandTracker();
const EXPANDED_FEDERALIST = expandFederalist(EXPANDED_TRACKER.spans);
const STATIC_SPANS = [
  ...SEED_SPANS,
  ...EXPANDED_TRACKER.spans,
  ...EXPANDED_FEDERALIST.spans,
];
const STATIC_ANNOTATIONS = [
  ...SEED_ANNOTATIONS,
  ...EXPANDED_TRACKER.annotations,
  ...EXPANDED_FEDERALIST.annotations,
];

// ---- Static getters -----------------------------------------------------

export function allSections(): Section[] {
  return SECTIONS;
}
export function allClauses(): Clause[] {
  return CLAUSES;
}
export function getSection(id: string | null | undefined): Section | undefined {
  return id ? SECTION_INDEX.get(id) : undefined;
}
export function getClause(id: string | null | undefined): Clause | undefined {
  return id ? CLAUSE_INDEX.get(id) : undefined;
}
export function corpusBounds() {
  return {
    x: EXTENT.left,
    y: 0,
    width: Math.max(1, EXTENT.right - EXTENT.left),
    height: EXTENT.bottom,
  };
}
export function defaultClauseId(): string {
  return 'preamble-cl-1';
}
export function neighborClauses(clauseId: string): { prev?: Clause; next?: Clause } {
  const flat: string[] = [];
  for (const s of SECTIONS) flat.push(...s.clauseIds);
  const i = flat.indexOf(clauseId);
  if (i < 0) return {};
  return {
    prev: i > 0 ? CLAUSE_INDEX.get(flat[i - 1]) : undefined,
    next: i < flat.length - 1 ? CLAUSE_INDEX.get(flat[i + 1]) : undefined,
  };
}

// ---- Merged (static + user-added) lookups ------------------------------

export interface MergedData {
  spans: Span[];
  annotations: Annotation[];
  spanIndex: Map<string, Span>;
  annotationsBySpan: Map<string, Annotation[]>;
  spansByClause: Map<string, Span[]>;
  countByClause: Map<string, number>;
  maxClauseCount: number;

  spansForClause(clauseId: string): Span[];
  annotationsForSpan(spanId: string): Annotation[];
  clauseAnnotationCount(clauseId: string): number;
  getSpan(spanId: string | null | undefined): Span | undefined;
  getAnnotation(id: string): Annotation | undefined;
}

function buildMerged(userSpans: Span[], userAnnotations: Annotation[]): MergedData {
  const spans = [...STATIC_SPANS, ...userSpans];
  const annotations = [...STATIC_ANNOTATIONS, ...userAnnotations];

  const spanIndex = new Map(spans.map((s) => [s.id, s]));
  const annotationIndex = new Map(annotations.map((a) => [a.id, a]));
  const annotationsBySpan = new Map<string, Annotation[]>();
  for (const a of annotations) {
    const arr = annotationsBySpan.get(a.spanId) ?? [];
    arr.push(a);
    annotationsBySpan.set(a.spanId, arr);
  }
  const spansByClause = new Map<string, Span[]>();
  for (const s of spans) {
    const arr = spansByClause.get(s.clauseId) ?? [];
    arr.push(s);
    spansByClause.set(s.clauseId, arr);
  }
  const countByClause = new Map<string, number>();
  for (const c of CLAUSES) {
    let n = 0;
    for (const s of spansByClause.get(c.id) ?? []) n += s.annotationIds.length;
    countByClause.set(c.id, n);
  }
  const maxClauseCount = Math.max(0, ...countByClause.values());

  return {
    spans,
    annotations,
    spanIndex,
    annotationsBySpan,
    spansByClause,
    countByClause,
    maxClauseCount,
    spansForClause: (clauseId) => spansByClause.get(clauseId) ?? [],
    annotationsForSpan: (spanId) => annotationsBySpan.get(spanId) ?? [],
    clauseAnnotationCount: (clauseId) => countByClause.get(clauseId) ?? 0,
    getSpan: (id) => (id ? spanIndex.get(id) : undefined),
    getAnnotation: (id) => annotationIndex.get(id),
  };
}

/**
 * Hook that returns merged static + user-added data. React-reactive: every
 * consumer rerenders when user-added items change.
 */
export function useMerged(): MergedData {
  const userSpans = useNewfound((s) => s.userSpans);
  const userAnnotations = useNewfound((s) => s.userAnnotations);
  return useMemo(() => buildMerged(userSpans, userAnnotations), [userSpans, userAnnotations]);
}

/** Non-reactive snapshot — useful from non-React contexts (panel layout etc). */
export function snapshotMerged(): MergedData {
  const state = useNewfound.getState();
  return buildMerged(state.userSpans, state.userAnnotations);
}
