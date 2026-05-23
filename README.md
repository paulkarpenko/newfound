# Newfound

> An infinite, pannable, zoomable plane for reading a canonical text and the layers of meaning that have settled on it. The first corpus is the **Constitution of the United States**.

## Philosophy

A foundational text is best read like territory, not like a document. The corpus sits in one continuous world space; you pan across it and zoom into it the way you'd move around a map. Zooming is **semantic** — each scale shows a different representation, not the same one scaled. Zoomed out, you see *where* the country has spent its attention; zoomed in, you read *what* it has said. Annotations from many traditions sit beside the text rather than on top of it, anchored to specific phrases with thin leader lines, and many can be open at once without becoming spaghetti. Newfound is a calm reading environment for a small canon (~7,500 words) and the centuries of argument around it.

## Key features

- **Three semantic zoom tiers** — colored clause blocks (overview) → clause cards with abstract span bars (mid) → full text with annotation panels (reading & detail). Crossfaded with hysteresis so they don't flicker.
- **Density heatmap** shared at every scale: a 6-step warm ramp colors clauses, span underlines, and the minimap identically.
- **Many panels at once** — auto-laid-out in margin lanes on the side nearer the text, draggable to pin anywhere, connected back to their phrase by a curved leader line.
- **Annotations in three layers**, all unified under one type system: editorial seed annotations on six richly-seeded clauses (Preamble, Commerce, Necessary & Proper, 1A, 2A, 14A §1), a crosswalk of ~70 contemporary legal challenges from the Just Security litigation tracker to the constitutional text they touch, and any annotations you add in-session.
- **YouTube embeds** in the detail modal, **delete** controls for what you authored, and an **"open in tracker"** deep link with text-fragment highlighting for tracker entries.
- **Reader contributions** — at zoom ≥ 80%, drag-select any text to reveal an *annotate* pill, click to compose a new annotation that anchors via W3C `TextQuoteSelector`.
- **Outline sidebar** with flyto-and-pulse, **minimap** with viewport rect, **facet filter** that dims non-matching annotations everywhere consistently.
- **Light / dark themes**, full keyboard nav, `prefers-reduced-motion` honored, WCAG AA contrast.

## How to use it

- **Pan** by dragging empty plane; **zoom** with wheel / pinch (anchored to the cursor), or the `+ / −` chrome.
- **Click** any underlined phrase to open its annotation panel; **hover** for a preview.
- **Drag a panel header** to pin it anywhere on the plane; **chevron** to expand/collapse; **×** to close.
- **Click any annotation row** to open the central detail modal with full bodies, embedded video where present, and delete controls for your own.
- **Add an annotation**: zoom in past 80%, drag-select text, click the **+ annotate** pill, write, submit. Lives in-session (no backend in v1).
- **Deep link** to any clause: `/?focus=art-1-sec-8-cl-3` (Commerce), `/?focus=amend-2-cl-1` (2A), etc. — ids are in `src/data/constitution.json`.

## Run it

Requires Node 18+ (the repo pins Node 20 via `.nvmrc`).

```sh
nvm use            # picks up .nvmrc
npm install
npm run dev        # vite dev server
npm run build      # tsc + vite build
```

Visit the URL Vite prints (default `http://localhost:5173`).

## Stack

Vite + React 18 + TypeScript · d3-zoom (cursor-anchored pan/zoom) · Radix primitives (restyled) · Tailwind · Framer Motion (functional transitions only) · Zustand. One `#world` container holds the entire transform; text stays DOM at every scale so selection and screen readers work normally. `will-change: transform` toggles with interaction so text re-rasterizes crisply when you stop moving.
