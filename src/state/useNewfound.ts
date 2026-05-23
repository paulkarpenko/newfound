import { create } from 'zustand';
import type {
  Annotation,
  AnnotationType,
  PanelState,
  Span,
  Tier,
  Transform,
} from '@/lib/types';

export type ThemeName = 'light' | 'dark';

/** Tier thresholds in scale-k. Hysteresis is applied at the tier transitions.
 *
 *  k < t1_top   → Tier 1   (overview)
 *  k < t15_top  → Tier 1.5 (abstract — clause cards with span bars)
 *  k < t2_top   → Tier 2   (reading)
 *  otherwise    → Tier 3   (detail)
 */
export const TIER_K = {
  t1_top: 0.22,
  t15_top: 0.55,
  t2_top: 1.35,
};

// Hysteresis: each up-transition needs to cross the next threshold + epsilon.
const HYST = 0.05;

export function tierForScale(k: number, currentTier: Tier): Tier {
  const t1Top = TIER_K.t1_top;
  const t15Top = TIER_K.t15_top;
  const t2Top = TIER_K.t2_top;

  // The "raw" tier for a scale, no hysteresis.
  const raw: Tier = k < t1Top ? 1 : k < t15Top ? 1.5 : k < t2Top ? 2 : 3;

  // Hysteresis is only applied when raw would step UP relative to current
  // (going to a more detailed tier).
  const tiers: Tier[] = [1, 1.5, 2, 3];
  const curIdx = tiers.indexOf(currentTier);
  const rawIdx = tiers.indexOf(raw);
  if (rawIdx <= curIdx) return raw;
  // raw is stepping up — require an extra epsilon past the threshold.
  if (currentTier === 1 && k < t1Top + HYST) return 1;
  if (currentTier === 1.5 && k < t15Top + HYST) return 1.5;
  if (currentTier === 2 && k < t2Top + HYST) return 2;
  return raw;
}

interface NewfoundState {
  transform: Transform;
  tier: Tier;

  selectedSpanId: string | null;
  panels: Map<string, PanelState>;

  facetTypes: Set<AnnotationType>;
  facetEraMin: number | null;
  facetEraMax: number | null;

  /** User-added spans + annotations (in-memory, no backend). */
  userSpans: Span[];
  userAnnotations: Annotation[];

  /** A captured selection waiting for the user to click the "annotate" pill. */
  composerSelection: ComposerSelection | null;
  /** Whether the composer dialog is actually open (after the pill is clicked). */
  composerOpen: boolean;

  /** Open explanation panels, keyed by id. Each panel is a transient
   *  selection-explainer (not persisted as an annotation). Multiple may
   *  be open at once — they stack in lanes adjacent to their clauses. */
  explanations: Map<string, ExplanationState>;

  /** Active clause chat — full-clause "explain this section" chat panel. */
  clauseChat: ClauseChatState | null;

  /** Right-edge question sidebar. Persists across selections; the
   *  conversation history is the "context" that's kept throughout. */
  sidebarOpen: boolean;
  sidebarTurns: SidebarTurn[];

  /** Detail modal — central modal showing all annotations on a span. */
  detailSpanId: string | null;
  /** Initial annotation to scroll into view inside the detail modal. */
  detailFocusAnnotationId: string | null;
  /** Monotonic counter incremented each openDetail — drives the focus pulse. */
  detailFocusToken: number;

  /** Pulse a clause's outline briefly — used by fly-to navigation to draw the eye. */
  pulseClauseId: string | null;
  /** Monotonic counter so repeated pulses on the same clause re-fire the animation. */
  pulseToken: number;

  /** True while the reader is actively panning / zooming. The World container
   * uses this to gate `will-change: transform`, which trades GPU-cached
   * smoothness during interaction for crisp text re-rasterization when idle. */
  interacting: boolean;

  theme: ThemeName;

  setTransform(t: Transform): void;
  setTier(t: Tier): void;
  selectSpan(id: string | null): void;

  openPanel(spanId: string, side?: 'left' | 'right'): void;
  closePanel(spanId: string): void;
  pinPanel(spanId: string, at: { x: number; y: number } | null): void;
  setPanelSide(spanId: string, side: 'left' | 'right'): void;
  togglePanelExpanded(spanId: string): void;
  setPanelExpanded(spanId: string, expanded: boolean): void;

  toggleFacetType(t: AnnotationType): void;
  setFacetEra(min: number | null, max: number | null): void;
  clearFacets(): void;

  addSpanAndAnnotation(
    span: Span,
    annotation: Annotation,
    side: 'left' | 'right',
    options?: { openPanel?: boolean },
  ): void;
  addAnnotationToSpan(spanId: string, annotation: Annotation): void;
  removeAnnotation(annotationId: string): void;

  startComposing(selection: ComposerSelection): void;
  cancelComposing(): void;
  openComposer(): void;
  closeComposer(): void;

  openDetail(spanId: string, focusAnnotationId?: string | null): void;
  closeDetail(): void;

  openExplanation(state: ExplanationState): void;
  closeExplanation(id: string): void;
  closeAllExplanations(): void;
  pinExplanation(id: string, at: { x: number; y: number } | null): void;

  openClauseChat(clauseId: string): void;
  closeClauseChat(): void;
  pinClauseChat(at: { x: number; y: number } | null): void;

  openSidebar(): void;
  closeSidebar(): void;
  clearSidebar(): void;
  appendSidebarTurn(turn: SidebarTurn): void;
  updateSidebarTurn(id: string, patch: Partial<SidebarTurn>): void;

  pulseClause(id: string): void;
  clearPulse(id: string): void;

  setInteracting(value: boolean): void;

  setTheme(t: ThemeName): void;
}

/**
 * State of an "explain this" popover — a transient world-anchored panel
 * showing a Feynman-style explanation of the selected concept. Not persisted
 * as an annotation; cleared via closeExplanation().
 */
export interface ExplanationState {
  /** Stable identifier (derived from clauseId + selected phrase) so re-selecting
   *  the same phrase reuses the existing panel rather than opening a duplicate. */
  id: string;
  clauseId: string;
  exact: string;
  /** Anchor context — used to persist a TextQuoteSelector if the reader
   *  decides to save this selection as an annotation note. */
  prefix?: string;
  suffix?: string;
  /** world-space anchor (where the selection sits) */
  worldX: number;
  worldY: number;
  /** which side of the column the panel should pop into */
  side: 'left' | 'right';
  /** id from concepts.json — optional; missing means stream a live answer instead. */
  conceptId?: string;
  /** when the reader drags the panel, its world position is fixed here. */
  pinnedAt?: { x: number; y: number };
}

/**
 * Clause-level chat. Opened by the "explain" button next to a clause title;
 * the chat panel streams a Claude-authored explanation of why the clause
 * exists and supports follow-up questions. Screen-space, draggable.
 */
export interface ClauseChatState {
  clauseId: string;
  /** screen-space top-left, in pixels. */
  pinnedAt?: { x: number; y: number };
}

/**
 * One turn in the question sidebar conversation. The sidebar streams
 * Claude responses by appending an `assistant` turn with `streaming: true`
 * and patching its content as deltas arrive.
 */
export interface SidebarTurn {
  id: string;
  /** 'note' is a reader-authored take saved on a selection — sent to Claude
   *  as background (like context), but rendered as the reader's own voice
   *  and does NOT trigger a Claude response on its own. */
  role: 'user' | 'assistant' | 'context' | 'note';
  content: string;
  streaming?: boolean;
  error?: boolean;
  /** For 'context' and 'note' turns: a citation chip shown above the prose. */
  citation?: string;
  /** For 'context' and 'note' turns: the exact phrase the user selected. */
  exact?: string;
}

/** A pending text selection captured by the composer. */
export interface ComposerSelection {
  clauseId: string;
  exact: string;
  prefix: string;
  suffix: string;
  /** Screen-space rect of the selection (for placing the pill / composer). */
  screenX: number;
  screenY: number;
  /** World-space anchor for the new span. */
  worldX: number;
  worldY: number;
}

export const useNewfound = create<NewfoundState>((set) => ({
  transform: { x: 0, y: 0, k: 1 },
  tier: 2,
  selectedSpanId: null,
  panels: new Map(),
  facetTypes: new Set(),
  facetEraMin: null,
  facetEraMax: null,
  userSpans: [],
  userAnnotations: [],
  composerSelection: null,
  composerOpen: false,
  detailSpanId: null,
  detailFocusAnnotationId: null,
  detailFocusToken: 0,
  explanations: new Map(),
  clauseChat: null,
  sidebarOpen: false,
  sidebarTurns: [],
  pulseClauseId: null,
  pulseToken: 0,
  interacting: false,
  theme: 'light',

  setTransform: (t) =>
    set((s) => ({ transform: t, tier: tierForScale(t.k, s.tier) })),
  setTier: (t) => set({ tier: t }),

  selectSpan: (id) => set({ selectedSpanId: id }),

  openPanel: (spanId, side) =>
    set((s) => {
      const next = new Map(s.panels);
      const existing = next.get(spanId);
      next.set(spanId, {
        spanId,
        open: true,
        pinnedAt: existing?.pinnedAt,
        side: side ?? existing?.side ?? 'right',
        // Default to expanded so the reader sees the annotation immediately.
        // Preserve a returning panel's last-chosen state.
        expanded: existing?.expanded ?? true,
      });
      return { panels: next, selectedSpanId: spanId };
    }),
  closePanel: (spanId) =>
    set((s) => {
      const next = new Map(s.panels);
      next.delete(spanId);
      return {
        panels: next,
        selectedSpanId: s.selectedSpanId === spanId ? null : s.selectedSpanId,
      };
    }),
  pinPanel: (spanId, at) =>
    set((s) => {
      const next = new Map(s.panels);
      const existing = next.get(spanId);
      if (!existing) return { panels: next };
      next.set(spanId, { ...existing, pinnedAt: at ?? undefined });
      return { panels: next };
    }),
  setPanelSide: (spanId, side) =>
    set((s) => {
      const next = new Map(s.panels);
      const existing = next.get(spanId);
      if (!existing) return { panels: next };
      next.set(spanId, { ...existing, side });
      return { panels: next };
    }),

  togglePanelExpanded: (spanId) =>
    set((s) => {
      const next = new Map(s.panels);
      const existing = next.get(spanId);
      if (!existing) return { panels: next };
      next.set(spanId, { ...existing, expanded: !existing.expanded });
      return { panels: next };
    }),
  setPanelExpanded: (spanId, expanded) =>
    set((s) => {
      const next = new Map(s.panels);
      const existing = next.get(spanId);
      if (!existing) return { panels: next };
      next.set(spanId, { ...existing, expanded });
      return { panels: next };
    }),

  toggleFacetType: (t) =>
    set((s) => {
      const next = new Set(s.facetTypes);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { facetTypes: next };
    }),
  setFacetEra: (min, max) => set({ facetEraMin: min, facetEraMax: max }),
  clearFacets: () =>
    set({ facetTypes: new Set(), facetEraMin: null, facetEraMax: null }),

  addSpanAndAnnotation: (span, annotation, side, options) =>
    set((s) => {
      const openPanel = options?.openPanel !== false;
      const nextSpans = [
        ...s.userSpans,
        {
          ...span,
          annotationIds: [...span.annotationIds, annotation.id],
        },
      ];
      const nextAnnotations = [...s.userAnnotations, annotation];
      const nextPanels = new Map(s.panels);
      if (openPanel) {
        nextPanels.set(span.id, {
          spanId: span.id,
          open: true,
          side,
          expanded: true,
        });
      }
      return {
        userSpans: nextSpans,
        userAnnotations: nextAnnotations,
        panels: nextPanels,
        selectedSpanId: openPanel ? span.id : s.selectedSpanId,
        composerSelection: null,
        composerOpen: false,
      };
    }),

  addAnnotationToSpan: (spanId, annotation) =>
    set((s) => {
      // Find the span — either in user spans or in static spans.
      const userIdx = s.userSpans.findIndex((sp) => sp.id === spanId);
      let nextUserSpans = s.userSpans;
      if (userIdx >= 0) {
        nextUserSpans = s.userSpans.map((sp) =>
          sp.id === spanId ? { ...sp, annotationIds: [...sp.annotationIds, annotation.id] } : sp,
        );
      }
      // For static spans we just add the annotation; the merged data layer
      // groups annotations by spanId regardless of whether the span is
      // "owned" by user.
      const nextAnnotations = [...s.userAnnotations, annotation];
      return {
        userSpans: nextUserSpans,
        userAnnotations: nextAnnotations,
      };
    }),

  removeAnnotation: (annotationId) =>
    set((s) => ({
      userAnnotations: s.userAnnotations.filter((a) => a.id !== annotationId),
      userSpans: s.userSpans.map((sp) => ({
        ...sp,
        annotationIds: sp.annotationIds.filter((id) => id !== annotationId),
      })),
    })),

  startComposing: (selection) =>
    set({ composerSelection: selection, composerOpen: false }),
  cancelComposing: () =>
    set({ composerSelection: null, composerOpen: false }),
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),

  openDetail: (spanId, focusAnnotationId) =>
    set((s) => ({
      detailSpanId: spanId,
      detailFocusAnnotationId: focusAnnotationId ?? null,
      detailFocusToken: s.detailFocusToken + 1,
    })),
  closeDetail: () =>
    set({ detailSpanId: null, detailFocusAnnotationId: null }),

  openExplanation: (state) =>
    set((s) => {
      const next = new Map(s.explanations);
      // If a panel for this id already exists, preserve its pinned position
      // so re-clicking explain on the same phrase doesn't jump it back.
      const existing = next.get(state.id);
      next.set(state.id, { ...state, pinnedAt: existing?.pinnedAt ?? state.pinnedAt });
      return { explanations: next, composerSelection: null, composerOpen: false };
    }),
  closeExplanation: (id) =>
    set((s) => {
      const next = new Map(s.explanations);
      next.delete(id);
      return { explanations: next };
    }),
  closeAllExplanations: () => set({ explanations: new Map() }),
  pinExplanation: (id, at) =>
    set((s) => {
      const existing = s.explanations.get(id);
      if (!existing) return s;
      const next = new Map(s.explanations);
      next.set(id, { ...existing, pinnedAt: at ?? undefined });
      return { explanations: next };
    }),

  openClauseChat: (clauseId) => set({ clauseChat: { clauseId } }),
  closeClauseChat: () => set({ clauseChat: null }),
  pinClauseChat: (at) =>
    set((s) =>
      s.clauseChat ? { clauseChat: { ...s.clauseChat, pinnedAt: at ?? undefined } } : s,
    ),

  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  clearSidebar: () => set({ sidebarTurns: [] }),
  appendSidebarTurn: (turn) =>
    set((s) => ({ sidebarTurns: [...s.sidebarTurns, turn] })),
  updateSidebarTurn: (id, patch) =>
    set((s) => ({
      sidebarTurns: s.sidebarTurns.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  pulseClause: (id) =>
    set((s) => ({ pulseClauseId: id, pulseToken: s.pulseToken + 1 })),
  clearPulse: (id) =>
    set((s) => (s.pulseClauseId === id ? { pulseClauseId: null } : s)),

  setInteracting: (value) => set({ interacting: value }),

  setTheme: (t) => set({ theme: t }),
}));
