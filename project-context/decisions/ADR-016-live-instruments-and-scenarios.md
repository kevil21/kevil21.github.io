# ADR-016 · Live instruments: sims publish chart specs; every machine has a scenario; the floor-plan card folds

**Status:** accepted · 2026-11-02 · v5.1.0

## Decision
1. **Sims describe their instruments as data.** `Sim.viz()` returns `VizSpec[]` (`src/viz/spec.ts`): plain, JSON-able
   descriptions (`lines`, `columns`, `bars`, `heat`, `stages`, `waterfall`, `gauge`). The sims keep their traces in fixed-size
   `Ring` buffers sampled on *simulated* time, so the specs are deterministic per seed and unit-tested in Node. Nothing
   in `src/sim/` or `src/viz/spec.ts` touches the DOM or Three.js.
2. **One renderer.** `src/viz/Charts.tsx` draws specs as SVG or HTML with theme tokens only (`src/styles/viz.css`). Each
   chart is a `<figure>` with a `role="img"` label and a "Data table" `<details>` generated from the same spec
   (`tableOf`), so a chart is never the only way to read its numbers. No chart library, no new dependency.
3. **Publishing.** Whoever runs the sim (`hall/mount.ts` with 3D, `hall/headless.ts` without) publishes specs to the
   `visuals` store about twice a second; `ControlPanel` renders them under "Live instruments · sample data".
4. **A scenario per machine**, an ordinary persistent select in `machines.json` (so the Operator's `setControl` validates
   it with no extra code): Refinery `steady | late-arrivals | tenant-surge`, Sorter `single | rotate`, Forecast
   `live | backtest`, Workbench `fresh | replay`, Calibration `issuers | timeline`; Foundations gets a `playback` toggle
   ("run the years"). Each scenario changes what the sim *does*, not just what is drawn, and each is built only from
   shapes already in the fact ledger (overlap window and deterministic ids, guardrail scoring, rolling cross-validation,
   idempotent document ids, issue months from `info.md`, the real hall-power series).
5. **Floor-plan card.** On desktop the card folds into a chip (`Floor plan · <where you are>`) after the visitor selects
   anything in it or walks to another bay by any means, and opens on mouse hover, on the chip (a disclosure button, so
   touch and keyboard work), and while focus is inside; Escape folds it. It closes after a short delay when the pointer
   leaves. The Map button / M key pins it open. On phones the sheet is unchanged except that it closes after a stop is picked.

## Why
- "More simulations and more to see while they run" without a charting dependency, without a second source of truth, and
  without a blocking main-thread cost: specs are small arrays; charts update at ~2 Hz only for panels that exist.
- Scenarios are where the ledger's decisions become visible (late documents caught by the 70-minute overlap; the same
  records re-ingested without growing the index; guardrails before the rubric; the model against a naive baseline fold by fold).
- The card covered the 3D on every desktop frame; folding on selection keeps the map one hover away (WCAG 1.4.13:
  dismissible with Escape, hoverable, persistent until the pointer leaves or focus moves out).

## Rejected
- A charting library (D3, Chart.js, uPlot): bundle weight and theming against OKLCH tokens for seven simple shapes.
- Canvas charts: no text twin, no theme tokens through CSS.
- Drawing charts inside the 3D scene: not readable on a phone, not accessible.
- Hiding the card on hover-out only: keyboard and touch visitors would have no way to open it.

## Consequences
- New sims must implement `viz()`; `tests/unit/viz.test.ts` fails if a machine publishes fewer than three instruments,
  duplicate ids, non-finite numbers, heat cells outside 0..1, or a scenario in `machines.json` its sim refuses.
- Axe covers the six machine pages and every chart with its table open (`tests/e2e/a11y.spec.ts`).
