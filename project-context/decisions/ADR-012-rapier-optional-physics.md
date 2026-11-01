# ADR-012 · Rapier physics is optional, lazy, and never on the phone profile

**Status:** accepted · 2026-11-01 · Scene 4

## Decision
`@dimforge/rapier3d-compat` (0.21.0, Apache-2.0, WASM inlined by the compat build) is imported dynamically by
`src/hall/physics.ts` only when the quality profile is `medium` or `high`. It gives the Policy Sorter's cards a real
drop onto the belt. Every physics use has a scripted fallback (a parabolic drop) that runs when loading fails or on the
`phone` profile, so no interaction and no story depends on physics (prompt: welcome, never required). The chunk is
split (`manualChunks: rapier`) and loads after the hall is already running.

## Why
- Physics makes the levers and cards feel like instruments; the cost is a ~2 MB chunk that phones should not pay.
- `rapier3d-compat` needs no WASM MIME configuration on GitHub Pages (the WASM is base64 inside the JS).

## Rejected
- cannon-es: lighter, but unmaintained and less stable contacts.
- Hand-rolled verlet only: fine for particles, poor for rigid cards and levers.
- Always-on physics: breaks the phone budget.
