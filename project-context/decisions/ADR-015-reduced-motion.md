# ADR-015 — Reduced motion changes effects, not AI

Status: accepted, locally implemented · 2026-10-31.

## Context

The earlier plan connected reduced motion to a static-only tier. A visual accessibility preference does not imply weak hardware or refusal of local search/inference.

## Decision

Honor `prefers-reduced-motion` through zero-duration tokens, immediate DOM updates, cancellation of WAAPI handles and disabled native route-transition animations. Do not add reduced motion to AI capability exclusions.

## Alternatives

Disable all AI/interactive features; ignore the preference; only read the preference once on initial load.

## Rationale

Preserve information and useful tools while removing movement. Motion and compute eligibility solve different problems.

## Consequences

Selection, focus, search, JD and separately consented models remain available subject to their actual capabilities. Runtime observatory reports motion state without using it as a model gate.

## Risks

New CSS animations or future capability checks could accidentally violate the separation. Preference changes during active effects need regression tests.

## Validation

`tokens.css`, `workspace.css`, `motion.ts` and `capabilities.ts` confirm the separation; dynamic reduced-motion/missing-WAAPI cases exist. [TESTING](../../TESTING.md) retains manual/device limits; model hardware success is unrelated.