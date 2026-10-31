# ADR-005 — Canonical evidence is factual output

Status: accepted, locally implemented · 2026-10-31.

## Context

Portfolio evidence is source-provided, not independently verified; fluent generation could add unjustified skills, years or outcomes.

## Decision

Render canonical excerpts by validated IDs. Full selects at most six unique IDs from Pocket's candidate subset, with bounded strict JSON and no extra prose. Skill-project edges require shared evidence. JD similarity can yield Related, never Strong Evidence, proficiency, years or a fit score.

## Alternatives

Free-form answers with citations appended afterward; prompt-only grounding; confidence percentages from similarity.

## Rationale

Validation and exact text rendering constrain factual output more strongly than instructions alone.

## Consequences

Abstention is legitimate. Profile/résumé documents without citation fields are excluded from prepared answers. Source caveats remain visible; open engineering questions are not personal decisions.

## Risks

An exact excerpt can still be irrelevant, outdated or false. Hashes and schemas do not certify employer/issuer truth.

## Validation

`grounding.ts`, `corpus.ts`, `retrieval.ts`, `runtime.ts` and negative tests cover ID/shape/join boundaries. [Content policy](../../CONTENT-SOURCES.md) and [TESTING](../../TESTING.md) retain relevance and independent-verification limits.