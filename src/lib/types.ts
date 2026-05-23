export type AnnotationType =
  | 'interpretation'
  | 'evidence'
  | 'counterpoint'
  | 'crossref'
  | 'context'
  | 'media'
  | 'question'
  | 'tracker';

export const ANNOTATION_TYPES: AnnotationType[] = [
  'interpretation',
  'evidence',
  'counterpoint',
  'crossref',
  'context',
  'media',
  'question',
  'tracker',
];

/**
 * Crosswalk relations between an external action (e.g. a Trump administration
 * executive action) and the constitutional text it touches.
 */
export type TrackerRelation =
  | 'goes_against'
  | 'ignores'
  | 'aims_to_contravene'
  | 'risks_contravention';

export const TRACKER_RELATION_LABEL: Record<TrackerRelation, string> = {
  goes_against: 'goes against',
  ignores: 'ignores',
  aims_to_contravene: 'aims to contravene',
  risks_contravention: 'risks contravention',
};

/** W3C Web Annotation Data Model selectors. */
export type Selector =
  | { type: 'TextQuoteSelector'; exact: string; prefix?: string; suffix?: string }
  | { type: 'TextPositionSelector'; start: number; end: number };

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Section {
  id: string;
  kind: 'preamble' | 'article' | 'amendment';
  ordinal: number;
  title: string;
  subtitle?: string;
  clauseIds: string[];
}

export interface Clause {
  id: string;
  sectionId: string;
  citation: string;
  heading?: string;
  text: string;
  /** Filled by layout.ts at module load. */
  world: WorldRect;
}

export interface Span {
  id: string;
  clauseId: string;
  selector: Selector[];
  annotationIds: string[];
}

export interface AnnotationMedia {
  /** youtube: src is either a full URL or a bare video ID; the detail modal embeds it. */
  kind: 'image' | 'map' | 'link' | 'youtube';
  src: string;
  caption: string;
}

export interface Annotation {
  id: string;
  spanId: string;
  type: AnnotationType;
  contributor: { name: string; descriptor: string };
  era: number;
  body: string;
  media?: AnnotationMedia;
  parentId?: string;
  /** Tracker-only fields — populated when type === 'tracker'. */
  relation?: TrackerRelation;
  externalLink?: string;
  actionGroup?: string;
  issueArea?: string;
}

export interface PanelState {
  spanId: string;
  open: boolean;
  /** when set, the reader dragged it — escapes lane layout */
  pinnedAt?: { x: number; y: number };
  side: 'left' | 'right';
  /** per-panel: when true, the panel shows full annotation bodies.
   * Independent of zoom tier — each panel toggles independently. */
  expanded: boolean;
}

/** Semantic-zoom tier.
 *   1   — colored clause blocks (overview / map of attention)
 *   1.5 — clause cards with abstract span bars (still bound to text positions)
 *   2   — full text + compact panels (reading)
 *   3   — full text + expanded panels (detail)
 */
export type Tier = 1 | 1.5 | 2 | 3;

export interface Transform {
  x: number;
  y: number;
  k: number;
}
