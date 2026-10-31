# ADR-007 — Theme system

**Status:** accepted · 2026-11-01

## Decision
- Three-state preference (`system | light | dark`) stored in `localStorage['trace:theme']`; resolution
  order saved → `prefers-color-scheme`. An inline script in `<head>` sets `data-theme`, `color-scheme`
  and `theme-color` **before first paint**; a `matchMedia` listener keeps `system` live.
- All colours are semantic custom properties defined in `src/styles/themes.css` (OKLCH), covering
  backgrounds, surfaces, text levels, borders, focus, selection, links, span kinds, status, evidence,
  AI states, code, overlays, shadows, skeletons, disabled, charts, scrollbars.
- Canvas/WebGL/SVG renderers read tokens via `getComputedStyle` and re-read on `tracethemechange`.
- The switch is a View Transition circular reveal (fade under reduced motion).
- An e2e test scans every stylesheet rule for literal hex colours outside token definitions and the
  print stylesheet.

## Alternatives
`light-dark()` CSS function only (no manual override persistence); Tailwind theme classes (adds a
dependency for a problem CSS custom properties solve directly).
