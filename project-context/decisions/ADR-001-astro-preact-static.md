# ADR-001 · Astro 7 static output with Preact islands

**Status:** accepted · 2026-11-01 · Scene 1

## Decision
Astro 7.4.4, `output: 'static'`, TypeScript strict. Interactivity only in Preact 11 islands (`src/islands/`) where state
lives; everything else is server-rendered HTML. Global behaviour (shortcuts, bottom-bar actions, theme start) is bound in
`src/scripts/shell.ts` outside any island so it works before hydration.

## Why
- Tier 0 is the content: case studies, résumé, machine twins must be interview-quality with JavaScript disabled.
- GitHub Pages is static; islands keep first-load JS small (budget < 300 KB compressed before the 3D bundle).
- Preact is 4 KB and the Three.js hall does not need a framework at all; it mounts on a plain canvas.

## Rejected
- **SvelteKit / Next.js static export:** heavier runtime, hydration of whole routes; Pages has no server.
- **Solid islands:** equally small; Preact chosen for the larger ecosystem and TRACE's proven `@astrojs/preact 6.1.1` setup.
- **Plain TS with no framework (Atlas):** fine for small widgets, painful for the Operator console and panels.
