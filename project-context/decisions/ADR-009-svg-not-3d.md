# ADR-009 — Purposeful SVG, no 3D engine

Status: accepted, locally implemented · 2026-10-31.

## Context

Nine projects need navigable organization and evidence, not a spatial simulation or GPU prerequisite.

## Decision

Use HTML project cards grouped into four editorial domains, with deterministic event-driven SVG membership lines. List mode uses the same nodes. Do not add Three.js/WebGL, force simulation, shader backgrounds or random inter-project edges.

## Alternatives

3D project world; force-directed graph; dashboard simulation; plain list only.

## Rationale

SVG supplies a distinctive visual hierarchy while HTML retains meaning, focus, links and mobile reflow. 3D adds rendering, accessibility and device cost without a task requiring depth or physics. This is design rationale, not a measured performance comparison.

## Consequences

Edges mean domain membership only; evidence/skill links require explicit canonical joins. No panning, hover or graph gesture is required to read a project.

## Risks

Decorative lines can be misread as dataflow unless labeled. Geometry must update with reflow without becoming a continuous loop.

## Validation

`index.astro`, `atlas.ts`, `workspace.css` and map/list/resize/no-JS tests establish the implementation. [TESTING](../../TESTING.md) retains physical-device/manual limitations.