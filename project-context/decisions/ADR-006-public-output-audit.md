# ADR-006 · A post-build public-output audit that fails on the exclusion list and on any non-canonical URL

**Status:** accepted · 2026-11-01 · Scene 1

## Decision
`scripts/verify-public.ts` scans every text file in `dist/` (html, js, json, xml, txt, webmanifest, css, svg, md) for
the patterns in `Memory/SIMULATION-ROOM/fact-ledger.md §I` (phone number, Twitter handle, old canonical, `.docx`,
internal repo and infrastructure names, fictional tenants, mock dashboard numbers, excluded assets, chatbot topics,
local and memory paths, unquantified claims) and requires `<link rel="canonical" href="https://kevilpatel.in/…">` on
every HTML page except 404, and `dist/CNAME` = `kevilpatel.in`. It runs in `postbuild` and in CI.

## Why
- Exclusions are a promise to Kevil's employer and to visitors; a grep is the cheapest guarantee that holds after refactors.
- Vendored chunks are scanned too: a model runtime or a library must not smuggle anything in.

## Rejected
- **Review by eye:** failed in KPOS (phone number in six places).
- **Lint at source only:** the build can still inline content from unexpected places; audit the output.
