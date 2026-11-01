# ADR-014 · The router grounds every sentence and always has a deterministic answer to fall back to

**Status:** accepted · 2026-11-01 · Scene 7

## Decision
`src/ai/runtime/router.ts` runs the visible plan (understand → retrieve → verify → act → explain). The deterministic
path is computed first on every question: declined topics, evidence floor, scripted answer (citations are chunk ids)
or extractive answer (top chunks, each its own citation), tool proposals validated by the Zod registry. Only when the
Full tier is ready does the model run, over the top-5 evidence, with a system prompt demanding [n] on every sentence
and at most one JSON tool line. `ground()` drops uncited sentences and reads the tool line; if nothing cited survives,
or the model refuses, the deterministic answer is shown with a note. Tool calls never execute without a click.

## Why
- Inherited: the 0.5B model sometimes returns JSON only (TRACE K-01) and the 1.5B once mis-attributed a decision (K-10).
  Grounding by construction, not by trust.
- Recruiters get an answer in milliseconds whether or not a model is present; the model only improves prose.
- Trust gauges need real numbers: cited ÷ total sentences and cited ÷ retrieved chunks are computable for every answer.

## Rejected
- Model-first with retrieval as context only: unverifiable sentences would reach the page.
- Letting the model execute tools: the brief forbids it; buttons with previews instead.
- A hosted judge model for grounding: no paid APIs.
