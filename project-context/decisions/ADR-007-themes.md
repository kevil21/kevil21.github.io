# ADR-007 — Semantic System/Light/Dark themes

Status: accepted, locally implemented · 2026-10-31.

## Context

Editorial light/dark palettes must stay consistent across pages, generated artwork and optional controls without a wrong-theme flash.

## Decision

Centralize literal colors in `themes.css` using `light-dark()` and `color-scheme`. Apply guarded stored preference with a blocking prepaint script; follow OS changes in System mode. Store only the explicit theme preference, separately from persona.

## Alternatives

Per-component color literals; dark-only design; post-hydration theme switching; external design-system dependency.

## Rationale

Semantic tokens align content, status, focus and artwork; local CSS/system stacks fit the no-framework shell.

## Consequences

Warm ivory/dark ink, violet selection and teal evidence signals are shared. Denied storage falls back safely. Backgrounds do not interpolate through low-contrast states; color is not the only status cue.

## Risks

Browser CSS support and changing UI surfaces can affect contrast. Token tests do not guarantee every rendered state or manual accessibility requirement.

## Validation

`Layout.astro`, `shell.ts`, theme/token styles and palette/restoration tests implement the contract. [TESTING](../../TESTING.md) distinguishes recorded Chromium/axe coverage from physical/manual review.