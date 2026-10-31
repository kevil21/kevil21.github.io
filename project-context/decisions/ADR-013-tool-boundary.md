# ADR-013 — Agentic tool boundary

**Status:** accepted · 2026-11-01

The Full Brain may only request the ten tools in `src/ai/tools/registry.ts` (plan.md §8's seven plus
`showEvidence`, `compareProjects`, `resetWorkspace`). Each tool has a Zod schema; ids must match a
strict slug pattern and are checked against the known node ids injected by the page. Model output is
parsed for JSON tool objects, validated, limited to three per answer, and stripped from the visible
text. Tool calls are rendered as buttons — **nothing executes without the visitor's click**. The
executor mutates nanostores or navigates to canonical routes only; it never touches arbitrary DOM,
never evaluates code, never fetches. Pre-generated answers may carry tool calls too, validated by the
same path.
