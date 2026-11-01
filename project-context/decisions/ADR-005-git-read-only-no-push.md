# ADR-005 · The agent never writes to git; Kevil reviews, commits and pushes

**Status:** accepted · 2026-11-01 · process

## Decision
The build agent runs only read-only git commands. Nothing is added, committed, pushed, rebased or branched by it.
`new_dev` is the working branch; Kevil commits with his `github-personal` identity. `gh` on this machine is logged in
as a different account and is never used for repository writes. DNS and GitHub Settings are never touched.

## Why
- The prompt's non-negotiable 6 and operating rules.
- Earlier generations recorded the same rule; KPOS briefly let agents commit and that was reversed.

## Consequences
- The final report lists the exact review/commit/push commands.
- Workflows (`deploy.yml`, `validate.yml`) are written but never executed by the agent.
