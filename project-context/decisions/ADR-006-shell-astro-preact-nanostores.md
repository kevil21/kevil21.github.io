# ADR-006 — Shell: Astro + Preact islands + nanostores

**Status:** accepted · 2026-11-01

## Context
plan.md requires a static-first site (Tier 0 must be complete HTML) with rich interactive features
(command palette, JD matcher, AI chat, trace interactions) and shared state across them (persona,
theme, selected span, filters) that the AI's tool executor can also drive.

## Decision
- **Astro 7** renders every page to static HTML at build time; content lives in content collections.
- **Preact + @preact/signals** power the few stateful islands (palette, JD matcher, Ask, compare,
  observatory, theme/persona controls). Everything else is plain HTML with small `<script>` modules
  (trace controller, filters, story).
- **nanostores** hold cross-island state. Islands subscribe; the tool executor mutates stores, never
  the DOM, so an AI action and a user action produce identical UI motion.
- Astro `<ClientRouter />` provides View Transitions for route changes.

## Alternatives
- Next.js / SvelteKit: SPA-first, heavier hydration, no benefit for a content site.
- Pure Web Components: verbose for forms/streaming chat; no shared-state story.
- React: larger than Preact for the same island set.

## Consequences
Hydration is limited to islands (`client:idle`/`client:visible`/`client:load` chosen per island);
the home page ships no framework JS until the palette hydrates on idle.
