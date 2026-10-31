# ADR-016 — Self-hosted fonts

**Status:** accepted · 2026-11-01

Bricolage Grotesque (variable: `opsz`, `wdth`, `wght`) for display and body, IBM Plex Mono 400/500 for
identifiers, dates and code, both self-hosted through Fontsource (latin subsets, `font-display: swap`).
No third-party font request leaves the visitor's browser (privacy boundary, plan.md §14) and the
fonts are hashed, cached and precached by the service worker. Alternative: system font stack only
(rejected: the brief asks for a distinctive, deliberate visual system).
