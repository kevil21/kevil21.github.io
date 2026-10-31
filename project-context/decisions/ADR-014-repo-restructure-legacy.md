# ADR-014 — Repository restructure and the legacy move

**Status:** accepted · 2026-11-01

## Context
`origin/main` served Kevil.OS v3.2.1 from `./site`. The `fable_dev` branch started from `plan.md`
alone and has no common ancestor with `main`.

## Decision
- The new application lives at the repository root following plan.md §15 (`content/`, `src/`,
  `scripts/`, `public/`, `project-context/`), with `legacy/` added.
- The previous generation is preserved as `legacy/site-v1/` (copied from the live v3.2.1 tree) and
  is **not deployed**: `deploy.yml` uploads `dist/`, and `legacy/` is excluded from linting, type
  checking and formatting.
- `plan.md`, `README.md` (rewritten, history preserved in `legacy/site-v1/README.md`), `deploy.md`,
  `future.md` and the `.docx` are kept; the `.docx` stays untracked by `.gitignore` as before.
- Git operations (add/commit/push, branch changes) are performed by Kevil, never by the agent.
