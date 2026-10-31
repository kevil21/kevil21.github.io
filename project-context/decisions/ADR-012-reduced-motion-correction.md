# ADR-012 — Correction to plan.md §3: reduced motion never removes AI

**Status:** accepted · 2026-11-01 · supersedes the "Reduced Motion Requested? → Tier 0" edge in plan.md §3

## Decision
`prefers-reduced-motion` is an accessibility preference about animation, not a capability signal. It
is excluded from the capability engine entirely. Under reduced motion the site swaps cinematic
motion for short fades or instant changes (tokens collapse, FLIP/GSAP skipped, signal field static)
while every feature — Pocket Brain, Full Brain, JD matcher, tools, observatory — stays available.
No meaning may exist only inside an animation (e.g. architecture stages are always all visible).

## Verification
`tests/e2e/motion.spec.ts` runs in a `reducedMotion: 'reduce'` project and asserts the palette,
highlighting and AI features work with the reduced token values.
