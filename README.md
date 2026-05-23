# Newfound

> An infinite, pannable, zoomable plane for reading a canonical text and the things people have written around it. The first corpus is the **Constitution of the United States**.

Newfound treats a foundational text the way a maps interface treats territory. The corpus is laid out once in world space. You pan across it, zoom in to read individual clauses, and zoom out to see where attention has gathered. The same span of words can carry many annotations — interpretive voices, historical evidence, contemporary legal challenges — each in its own floating panel anchored back to the text with a leader line.

It is built to be a calm reading environment for a small canon (~7,500 words) plus the layers of meaning that have settled on it.

---

## What you can do

- **Read the entire Constitution** in three columns: the original document (Preamble + Articles I–VII) on the left, the Bill of Rights in the middle, the remaining Amendments on the right.
- **Pan and zoom freely** like a map. The corpus is one continuous plane; nothing reflows when you move around it.
- **See where the country has spent its attention.** A density heatmap colors the most-annotated passages — visible at every scale, using the same color ramp throughout.
- **Open many annotation panels at once.** Each annotated phrase carries its own panel that floats in the margin nearest the text and connects back via a thin leader line.
- **Drag a panel anywhere** to pin it to a custom spot on the plane.
- **Select text and add your own annotation** at zoom levels where reading is possible.
- **Read every annotation in full,** including embedded YouTube media, in a central detail view.
- **See contemporary legal challenges** to specific constitutional clauses — the system includes a crosswalk of ~70 links from the Just Security litigation tracker of Trump-administration actions to the constitutional text those actions touch.

---

## The three zoom tiers

Zoom is **semantic**. Each level shows a different *representation* of the corpus, not the same one scaled up or down. Threshold transitions cross-fade with hysteresis so they don't flicker:

| Tier | Scale | What you see |
|---|---|---|
| **1 — Overview** | k &lt; ~0.22 | Each clause as a colored block. The shade encodes annotation density on a 6-step warm ramp. The Bill of Rights and the densely-litigated Take Care / Appropriations clauses light up. Click a block to fly to it. |
| **1.5 — Abstract** | ~0.22 ≤ k &lt; ~0.55 | Clause cards with the structure of the underlying text preserved as faint baselines. Each annotated span shows as a colored bar at the line and column where it lives. Click a card to fly to it. |
| **2 — Reading** | ~0.55 ≤ k &lt; ~1.35 | Full canonical text in serious serif. Annotated phrases carry colored underlines whose weight scales with the count. Hover for a quick preview; click to open a panel. |
| **3 — Detail** | k ≥ ~1.35 | Same as Reading, but panels default to expanded with the full annotation bodies in scrollable form. |

A small chrome in the upper right shows the current tier and zoom percent.

---

## Interface, briefly

- **Outline (top-left button)** — a sidebar listing every section and clause. Click any clause to fly to it. The fly-to highlights the target with a brief blue pulse so the eye catches the landing.
- **Filter (top-center)** — toggle annotation types (interpretation, evidence, counterpoint, cross-ref, context, media, question, tracker). Non-matching annotations dim everywhere consistently.
- **Zoom chrome (top-right)** — `+` / `−`, `fit` to frame the whole corpus, `dk` / `lt` to switch themes.
- **Minimap (bottom-right)** — the whole corpus tinted by density with a viewport rectangle. Click anywhere to fly there.
- **Legend (bottom-left)** — what the density colors mean.

---

## How to use it

### Move around

- **Pan**: click-and-drag on empty plane, or use a trackpad two-finger scroll.
- **Zoom**: wheel / pinch toward the cursor, or the `+` / `−` buttons (which anchor zoom to the screen center).
- **Fly to a clause**: open the outline, click any entry — or click any Tier-1 block or Tier-1.5 card.
- **Fit everything**: hit `fit` to frame the whole corpus.

When you scroll the wheel over a scrollable panel, it scrolls the panel; everywhere else it zooms the plane. When text is selected and the "annotate" pill is showing, wheel-zoom is suppressed so the page doesn't lurch.

### Open and arrange panels

- **Hover** an underlined phrase to peek at its top annotations in a hover card.
- **Click** the underline to open the panel. Panels open into the lane (left or right) nearer the phrase, and stack downward so they never overlap.
- **Expand / collapse** with the chevron in the panel header. Each panel toggles independently.
- **Drag a panel** by its header to pin it anywhere on the plane.
- **Close** with the ×.

The phrase the panel is anchored to stays connected by a thin curved leader line that emerges from the actual position of the span (not the middle of the clause).

### Read in detail

Any annotation row in a panel is clickable. Clicking opens the **detail modal** — a centered overlay listing every annotation on that excerpt, scrolled to and briefly highlighting the one you clicked. The detail view shows:

- The full annotation body
- The contributor (and a "added by you" tag if you wrote it)
- **YouTube embeds** for `media`-type annotations that carry a video
- A "delete" control for annotations you added in this session
- For tracker entries: the relation (`goes against` / `ignores` / `aims to contravene` / `risks contravention`), the issue area, and an **"open in tracker ↗"** button that jumps to the Just Security page with the action's name highlighted via a text fragment
- A **`+ add another annotation`** button to compose a new annotation on the same excerpt

Press `Esc` or click the backdrop to close.

### Add your own annotation

Newfound is read-mostly, but you can author annotations on any excerpt during a session (in-memory only — there's no backend in v1).

1. Zoom to **80% or more** (the threshold where selection becomes possible).
2. Drag-select any text in a clause.
3. A small **"+ annotate"** pill appears at the end of your selection.
4. Click it. A composer dialog appears with the quoted excerpt at the top.
5. Write the annotation body, pick a type, optionally fill in your name / descriptor / era, hit **add annotation**.
6. The new panel opens on the side closer to your selection, with your annotation visible. You can delete it later from the detail modal.

Press `Esc` to cancel at any time.

### Deep links

The viewport state is URL-addressable. Open `/?focus=art-1-sec-8-cl-3` (or any clause id) to land already framed on that clause. The Commerce Clause is `art-1-sec-8-cl-3`; the Necessary and Proper Clause is `art-1-sec-8-cl-18`; the Second Amendment is `amend-2-cl-1`; the Fourteenth Amendment §1 is `amend-14-cl-1`; the full set is in `src/data/constitution.json`.

---

## What's in the corpus

### Canonical text

The full Constitution: the Preamble, all seven Articles (with Article I §8 broken into its eighteen individually-addressable enumerated powers), and all twenty-seven Amendments. ~7,500 words. Source-of-record text was normalized against the National Archives transcription.

### Annotations

The annotation layer has three kinds of content, all stored under the same `Annotation` model:

1. **Editorial seed annotations** on six richly-annotated clauses:
   - the Preamble
   - the Commerce Clause (Art. I §8 cl. 3)
   - the Necessary and Proper Clause (Art. I §8 cl. 18)
   - the First Amendment (with sub-spans for establishment, free exercise, speech, press, assembly)
   - the Second Amendment (with sub-spans for "well regulated Militia" and "to keep and bear Arms")
   - the Fourteenth Amendment §1 (with sub-spans for citizenship, privileges or immunities, due process, equal protection)

   ~65 annotations across seven traditions — founding-era voices, judicial opinions, scholarly commentary, historical context, civic testimony, and resonant cultural references. Where readings genuinely oppose each other (the Second Amendment especially) each side is presented in its strongest form; Newfound never editorializes which reading is right.

2. **Live legal challenges (tracker layer)** — a crosswalk of ~70 links from the Just Security litigation tracker of Trump-administration executive actions to the constitutional text those actions touch. Each tracker entry carries:
   - The action group (e.g. "Birthright Citizenship (Executive Order 14160)")
   - A constitutional relation: `goes against`, `ignores`, `aims to contravene`, or `risks contravention`
   - A clause-specific reasoning sentence
   - A link out to the live tracker

   The cluster lights up the Take Care Clause, the Appropriations Clause, the Fifth Amendment, the Suspension Clause, and the First Amendment. Their density on the heatmap reflects where the contemporary fight is concentrated.

3. **Reader annotations** — anything you add in this session. They live in memory and disappear on refresh (no backend).

### Anchoring

Every annotation anchors via [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) selectors (`TextQuoteSelector` + `TextPositionSelector`), so spans re-anchor robustly even when the surrounding markup changes around them.

---

## Accessibility

- Full keyboard navigation. The outline sidebar gives a keyboard path to every clause; Tab moves through anchored spans; Enter opens panels.
- Every density encoding is **redundant** (paired with weight, shape, or position so it survives grayscale and color-blindness) and exposes its bucket value via `aria-label`.
- `prefers-reduced-motion` is honored: fly-to becomes instant, crossfades collapse, the pulse highlight becomes static.
- The corpus is real, selectable, semantic HTML throughout — text remains DOM at every zoom level so screen readers and Find-in-Page work normally.

---

## Stack

- **Vite + React 18 + TypeScript**
- **d3-zoom** for the pan / zoom transform (cursor-anchored zoom, touch, pinch, drag)
- **Radix UI primitives** — HoverCard, Popover, ScrollArea, ToggleGroup, VisuallyHidden — fully restyled
- **Tailwind CSS** for the design system
- **Framer Motion** for functional transitions only (tier crossfades, fly-to, pulse highlights)
- **Zustand** for global state

The transform applies to one `#world` container; text rendering stays in the DOM at all zoom levels. `will-change: transform` is gated on whether you're actively pan/zooming, so text re-rasterizes crisply when the view is idle.

---

## Running locally

Requires Node **18 or newer** (Vite 5). The repo pins Node 20 via `.nvmrc`.

```sh
nvm use            # picks up .nvmrc
npm install
npm run dev        # vite dev server
npm run build      # tsc + vite build
npm run typecheck  # tsc --noEmit
```

Then visit the URL Vite prints (default `http://localhost:5173`).

To land directly on a particular clause, append `?focus=<clauseId>` — e.g. `/?focus=preamble-cl-1`, `/?focus=amend-2-cl-1`, `/?focus=art-1-sec-8-cl-3`.

---

## Project layout

```
src/
  main.tsx
  App.tsx
  routes/
    Reader.tsx                  # the only route — the plane
  components/
    plane/                      # World transform, Chrome, Minimap, Legend, FacetFilter
    tier1/OverviewBlocks.tsx    # tier 1: colored clause blocks
    tier1_5/AbstractClauseBlock # tier 1.5: clause cards with abstract span bars
    tier2/CorpusText, ClauseBlock, SpanInline  # tier 2/3 reading
    panels/                     # PanelLayer, Panel, panelLayout (lane packing), LeaderLines
    composer/                   # AnnotatePill + Composer dialog
    detail/AnnotationDetailModal
    a11y/ClauseOutline
    primitives/ClausePulse      # one-shot fly-to highlight
  lib/
    types.ts                    # Annotation, Span, Clause, Tier, etc.
    layout.ts                   # one-time world-space layout pass (3 columns)
    density.ts                  # the shared density color scale
    anchors.ts                  # W3C selector resolution
    dataAccess.ts               # merges seed + tracker + user data via useMerged()
    selectors.ts                # static getters used by non-React contexts
    usePlaneZoom.ts             # d3-zoom hook
    flyto.ts                    # fly-to interpolator
  state/
    useNewfound.ts              # global store
    useSpanPositions.ts         # per-span DOM rect registry for leader lines
  data/
    constitution.json
    spans.json
    annotations.json
    tracker.json                # legal-challenges crosswalk → constitutional text
  styles/
    index.css
    theme.css
  motion/
    tokens.ts                   # crossfade/emerge/micro/flyto only — no ambient motion
```

The data layer is deliberately uniform: every annotation — whether seeded editorial commentary, a tracker entry expanded from `tracker.json`, or something a reader just composed — flows through the same `useMerged()` hook and the same `Annotation` shape. The UI only branches on `type === 'tracker'` for the relation pill and the external link.

---

## Status

v1 is read-mostly. The full data model accepts contributions, but there's no backend in this build — added annotations live in-session and clear on refresh. The tracker layer is seeded with 28 of the 141 action records from the Just Security crosswalk (the higher-confidence tranche the source markdown enumerated in full); adding more is just an append to `src/data/tracker.json`.
