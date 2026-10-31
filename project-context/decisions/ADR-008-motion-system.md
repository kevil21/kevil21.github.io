# ADR-008 — Motion system

**Status:** accepted · 2026-11-01

## Decision
Motion tokens (`--dur-instant/fast/normal/emphasis/cinematic`, `--ease-standard/enter/exit/spring`,
`--stagger-short/medium`) in `tokens.css`; techniques layered by need:
1. CSS transitions/keyframes for micro-interactions, intro reveals and the trace bars.
2. View Transitions API for route changes, container morphs (project card → page) and the theme switch.
3. Web Animations API for FLIP re-ordering (persona switch, project filters) and the signal-field fade.
4. GSAP + ScrollTrigger for scroll storytelling on project pages (desktop pointer devices only).
Only `transform`, `opacity` and `clip-path` animate on hot paths; effects pause off-screen/hidden.
Under `prefers-reduced-motion` tokens collapse to 0/80 ms, FLIP and GSAP are skipped, the signal
field stays static — no feature is removed (see ADR-012).

## Alternatives
Motion One (smaller) was considered; GSAP chosen for ScrollTrigger's pinning robustness. Lenis smooth
scroll (used by the previous generation) rejected: it fights native scrolling and accessibility.
