# ADR-015 — Content model, sources and exclusions

**Status:** accepted · 2026-11-01

- Canonical content is Astro content collections under `content/`, validated by Zod schemas in
  `src/lib/schema.ts` that are shared with the Build Brain (`scripts/lib/load-content.ts`).
- The only content source is the `KPOS` clone (`site/index.html`, `site/app.js`,
  `site/Kevil_Resume_2026.md`, `Kevil_Resume_12.docx`, `site/assets`). Every claim carries a
  `source` pointer; `validateKnowledge` rejects dangling references.
- Recorded deviation: certification **issue months** come from `Resume/info.md` (Kevil's LinkedIn
  export) because KPOS only records expiry months; each is marked `issuedSource: Resume/info.md`.
- Exclusions (enforced by `scripts/verify-public.ts` on `dist/`): phone number, private Drive links,
  internal Kyndryl repository names and naming patterns, mock KPI values, fake GitHub data, the
  `.docx` download, the inconsistent Twitter handle.
- Conflicts between sources are resolved in `CONTENT-SOURCES.md` and never guessed; two project
  dates that disagree are left undated and shown as "within <parent span>".
- Self-reported résumé metrics are published verbatim, marked `selfReported`, rendered with an
  "as stated in résumé" pill, and may be cited but never extrapolated by the AI.
