# ADR-015 · The hall follows soft navigation; buttons are pulses, not stored values; shortcuts have an off-switch

**Status:** accepted · 2026-11-02 · Audit of `simulation_dev`

## Decision
1. **Hall lifecycle.** The site uses Astro's ClientRouter, so a page change is a soft swap and a module script runs once
   per session. `src/hall/loader.ts` starts the hall on every `astro:page-load` and disposes it on
   `astro:before-swap` (renderer, listeners, timers, hall stores). Leaving the hall page frees the GPU; coming back
   mounts a fresh scene. The opening plays once per session (`sessionStorage`), later visits start lit.
2. **Controls are persistent or momentary.** Persistent controls (range, select, toggle) live in the bus map and are
   applied by a diffing applier that only pushes changed values. Momentary controls (`approve`, `run-overlays`,
   `run-incidents`, `run-assets`, `print`, `sync-now`) are events: `setControlValue` turns a `true` into a pulse for
   subscribers and never stores it. A button therefore fires once per press, survives re-seeding and soft navigation
   without re-firing, and `resetFloor` cannot replay old presses. `machines.json` marks them `kind: 'button'`; a unit
   test keeps the two lists identical. The bus is DOM-free so it is unit-tested in plain Node.
3. **The approval lever is a button**, and it only does something while a plan waits at the human gate. Pressing it at
   any other time is reported as ignored and does not pre-approve the next plan.
4. **Character-key shortcuts can be switched off** (WCAG 2.1.4). The footer carries a "Keyboard shortcuts: on/off"
   button (also on the floor plan); the choice persists. Arrow keys, Home/End and Escape are not character keys and stay.
5. **Tool arguments are validated** against `machines.json` before the executor touches the bus: unknown control,
   wrong type or invalid select option is refused with a narrated reason; ranges are clamped.

## Why
- The first four were real defects found by reading and testing the build: stale hall after navigation, buttons stored as
  `true` and replayed, a lever that could be armed in advance, and single-letter shortcuts with no way out.
- Each rule is enforced by a unit or e2e test so it cannot regress silently.

## Rejected
- Reloading the page on every navigation (`data-astro-reload`): throws away the shared-element transitions and the warm cache.
- Keeping the hall mounted off-page: holds a WebGL context and the render loop for no visible benefit.
- Pulses through DOM `CustomEvent`s in the bus: made the store untestable without a DOM environment.
