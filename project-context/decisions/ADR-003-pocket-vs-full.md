# ADR-003 — Independent Pocket, constrained Full

Status: accepted implementation; Full hardware validation open · 2026-10-31.

## Context

Portfolio access cannot wait for a large generative model, and stronger compute must not create unsupported facts.

## Decision

Default Pocket is lexical/alias/concept retrieval in a lazy worker. Explicit MiniLM consent adds learned semantic retrieval. Full is a separate Qwen worker that generates constrained selections from Pocket's retrieved IDs, never a free-form portfolio essay. JD remains in Pocket/main-thread matching.

## Alternatives

One mandatory LLM; labeling deterministic vectors as learned; generative JD/prose; no fallback worker separation.

## Rationale

Independent paths keep lexical/JD usable during optional loading and bound what generation can affect.

## Consequences

Full → Pocket → main-thread lexical → deterministic/static fallback. Navigation unloads workers; consent is not silently restored. Authored personas remain the factual reading views.

## Risks

Extra lifecycle/state coordination; small-model relevance and GPU execution cannot be assumed from schemas or API presence.

## Validation

`runtime.ts`, both workers and `retrieval.ts` implement the separation. Real Pocket/MiniLM and mocked Full cases are distinguished in [TESTING](../../TESTING.md); no genuine Full success claimed.