# ADR-011 · Simulations are pure TypeScript, shared by the 3D machines and the HTML panels

**Status:** accepted · 2026-11-01 · Scene 4

## Decision
Each machine's behaviour lives in `src/sim/*` as a deterministic, seeded class with `step(dt)`, `setControl`,
`readouts()` and `drain()` (events). It imports nothing from Three.js or the DOM. The 3D assembly
(`src/hall/machines/*`) drives it and reads its state for particles, needles and ribbons; the control panel island
(`src/islands/ControlPanel.tsx`) talks to it through the bus (`src/hall/bus.ts`); on machine pages without a hall,
`src/hall/headless.ts` runs the same sim so the readouts are alive anyway. Thresholds and intervals (31 views, 10-minute
sync, 70-minute overlap, BLOCKED → 10, HIGH_RISK +6, auto-approve < 4, 20 insight types) are constants cited to ledger ids;
all emitted values are sample data and are labelled so in the UI.

## Why
- One source of behaviour for three consumers (3D, panel, Operator narration) — no divergence.
- Unit-testable without a GPU: the sim tests pin the real decision thresholds.
- Deterministic seeds make screenshots and tests reproducible.

## Rejected
- Simulating inside the Three.js update loop only: untestable, unavailable on machine pages and the static tier.
- A real physics-first simulation for everything: the stories are about decisions, not dynamics.
