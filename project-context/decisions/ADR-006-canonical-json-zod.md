# ADR-006 — One canonical JSON/Zod graph

Status: accepted, locally implemented · 2026-10-31.

## Context

Pages, résumé, Node build tools, tests and browser knowledge need the same interlinked records and validation rules.

## Decision

Author career content in `content/portfolio.json`; eagerly parse with shared `portfolioSchema` through `src/lib/content.ts`. Validate global IDs, bounded strict records, reciprocal evidence joins and publication restrictions. Runtime corpus/protocol schemas remain separate trust-boundary validators, not competing content sources.

## Alternatives

Astro Content Collections; split per-category JSON/Markdown; hardcoded component data; a CMS/database.

## Rationale

One small cross-linked graph is directly usable by non-Astro tools. Content Collections would add loading integration without an additional authoring requirement and could duplicate validation if maintained separately. They remain a viable future editorial option, not an inferior technology.

## Consequences

Atomic shared validation and derived types; no `content.config.ts` collection layer. Larger editorial growth may justify a different authoring workflow, while preserving one canonical validation authority.

## Risks

Single-file edits can conflict. Structural validation cannot approve claims; regex publication guards are defense-in-depth rather than complete DLP.

## Validation

Read `src/lib/{schema,content,knowledge,resume}.ts`, canonical JSON and schema/knowledge tests. [CONTENT-SOURCES](../../CONTENT-SOURCES.md) governs review; [TESTING](../../TESTING.md) owns validation scope.