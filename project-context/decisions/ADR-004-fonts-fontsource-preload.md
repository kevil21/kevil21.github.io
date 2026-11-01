# ADR-004 · Self-hosted Bricolage Grotesque + IBM Plex Mono via Fontsource, preloaded, metric-matched fallbacks

**Status:** accepted · 2026-11-01 · Scene 1

## Decision
Display: Bricolage Grotesque (variable). Readouts, plaques, code: IBM Plex Mono 400/500. Both from Fontsource
(no third-party requests), the latin woff2 files preloaded in `Base.astro`, with `@font-face` fallbacks
(`Bricolage Fallback`, `Plex Mono Fallback`) carrying `size-adjust`/`ascent-override` so text does not reflow.

## Why
- Inherited: font preload took TRACE project pages from CLS 0.146 to 0.000.
- No Google Fonts (privacy, no header control on Pages, render-blocking).
- Bricolage's character suits a laboratory signage voice without being a tic of a previous generation (KPOS used
  Syncopate/Space Grotesk; Atlas used system fonts).

## Rejected
- **System fonts only (Atlas):** zero cost, but the hall needs a voice.
- **Google Fonts CDN:** third-party request and no control over caching headers.
