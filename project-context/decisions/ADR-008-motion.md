# ADR-008 — Native, DOM-first motion

Status: accepted, locally implemented · 2026-10-31.

## Context

Reordering and selection need continuity without boot gates, animation libraries or an idle rendering loop.

## Decision

Apply DOM state immediately, then native WAAPI FLIP to surviving displaced elements and short reveals. Enhance normal route navigation with CSS view transitions where supported. Use shared duration/easing tokens and track cancelable animation handles.

## Alternatives

GSAP/Lenis or a general animation framework; continuous canvas simulation; no motion.

## Rationale

Small native effects explain changes without introducing a router or making animation a content dependency.

## Consequences

Cancel on interruption, hidden document, pagehide and preference changes. SVG redraw is scheduled by state/geometry changes. No scroll hijack, automatic carousel, fake packet traffic or content initially hidden for animation.

## Risks

Layout reads during FLIP and browser transition support need regression coverage. Configured 120/240ms effects are not measured responsiveness guarantees.

## Validation

`motion.ts`, `atlas.ts`, comparison/shell integration and CSS define behavior. Missing-WAAPI/reduced-motion/rapid-state tests are separate from settled screenshots. [TESTING](../../TESTING.md); see [ADR-015](ADR-015-reduced-motion.md).