# ADR-003 · Content collections with a mandatory source pointer and a presentation label on every claim

**Status:** accepted · 2026-11-01 · Scene 1

## Decision
All facts live in Astro content collections (`src/content/*.json`, case studies in Markdown) validated by Zod schemas in
`src/lib/schema.ts`. A `claim` is `{ text, source, ledger?, label }` where `source` must match
`KPOS/<path>#L<n>[-L<m>]` or `info.md#L<n>` and `label ∈ public | resume | site-case-study | info-md | sample`.
The UI renders the label as "as stated in résumé", "as stated in the previous site's case study", "[source: info.md]" or
a "sample" tag. Ledger ids (`F-…`) link each claim to `Memory/SIMULATION-ROOM/fact-ledger.md`.

## Why
- Non-negotiable 5: everything is true, every fact traces to KPOS, sample data is labelled.
- A schema failure at build time is cheaper than a wrong fact in production.
- The Operator's retrieval chunks are generated from the same collections, so citations are the same pointers.

## Rejected
- **One big `portfolio.json` (Atlas):** harder to diff and review per fact family.
- **Markdown-only content:** prose is fine for case studies, but structured facts need typed fields for machines and the Operator.
- **Free-text sources:** unverifiable; the regex forces a file and line.
