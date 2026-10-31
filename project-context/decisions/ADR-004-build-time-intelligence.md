# ADR-004 — Build-time public knowledge

Status: accepted, locally implemented · 2026-10-31.

## Context

The public corpus changes with authored content, not per visitor. Repeating normalization and evidence embedding for each visitor is unnecessary.

## Decision

Generate ten versioned public JSON artifacts and a canonical Markdown résumé at build time. Use real pinned MiniLM q8 CPU embeddings, source-derived prepared answers and explicit evidence joins. Do not generate a new biography with an LLM.

## Alternatives

Runtime corpus embedding; hosted vector database; hand-maintained duplicate indexes; synthetic placeholder embeddings.

## Rationale

Shared work belongs in the build. Content/corpus/vector hashes let consumers reject mismatched artifacts without a runtime database.

## Consequences

Cold builds download pinned public assets; model cache can be reused, but embeddings are recomputed. `content-manifest.json` hashes nine siblings, excluding itself. Current runtime answers use excerpts, not the prepared-answer artifact.

## Risks

Network/model availability can block a cold build. Cross-platform floating-point/font differences are not a bit-identical-build guarantee.

## Validation

`build-knowledge.ts`, `build-semantic.ts`, `knowledge.ts` and parity tests/audit define the contract. Real build inference is recorded in [TESTING](../../TESTING.md); hosted CI remains unverified.