# ADR-009 — Visual rendering: the signal field

**Status:** accepted · 2026-11-01

## Context
The brief asks for one signature visual representing Kevil's architecture or career, with a static
fallback and live theme colours; no decorative particle noise.

## Decision
The signal field renders the **career-activity series** (`signal-series.json`, computed by the Build
Brain from the real spans and credential dates) as layered waveforms, one lane per span kind plus the
total. Three renderers share tokens and data:
- static inline **SVG** (server-rendered, first paint, no-JS, print, Save-Data, reduced motion);
- **Canvas 2D** for devices without WebGL or with low memory;
- **Three.js** (`THREE.Line` + `ShaderMaterial`, travelling wave + pointer parallax in the vertex
  shader) for capable desktops. DPR capped at 1.5, `powerPreference: 'low-power'`, paused when hidden.
WebGPU rendering was not adopted: WebGPU capacity is reserved for the Full Brain.

## Alternatives
Raw WebGL (more code for the same result), a force-directed graph (explicitly excluded by the brief),
generic particles (rejected: not data-driven).
