# ADR-002 · OKLCH semantic tokens with fill / ink pairs, three theme variants, one bridge

**Status:** accepted · 2026-11-01 · Scene 1

## Decision
Every colour is a semantic OKLCH custom property in `src/styles/tokens/color.css`, the only file allowed to hold a
literal colour (enforced by `scripts/lint-tokens.ts`, run in unit tests). Each accent has a **fill** token (surfaces,
lamps, particles, materials) and an **ink** token (text-safe, ≥ 4.5:1 in its theme). Themes: `dark` (default),
`light` (warm paper, daylit lab), `night` (egg: deeper dark). Resolution happens pre-paint in an inline ES5 script;
`src/theme/store.ts` keeps it live and re-applies after View Transition swaps. Non-CSS surfaces read tokens only through
`src/theme/bridge.ts`, which converts OKLCH → sRGB and invalidates on `sr:themechange`. The `theme-color` meta values are
derived at build time from the same file (`src/theme/meta.ts`), never typed by hand.

## Why
- Inherited lesson (TRACE D-11): fill and text tokens must be separate or light-theme text fails contrast.
- Shaders and particles cannot read CSS; one bridge with one converter keeps them honest and live.
- Night shift as a third variant of the same tokens costs one block of CSS, not a second design.

## Rejected
- **HSL tokens:** perceptually uneven; the same lightness reads differently per hue.
- **Hand-typed hex for theme-color:** drifts from the tokens (happened on KPOS); computed instead.
- **Canvas-based colour probe** for the bridge: works but clips to sRGB silently and costs a canvas; math is explicit and tested.
