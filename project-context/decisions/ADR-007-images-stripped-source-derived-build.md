# ADR-007 · Committed metadata-free source images, responsive variants derived at build

**Status:** accepted · 2026-11-01 · Scene 2

## Decision
`scripts/import-assets.ts` copies the publishable KPOS images into `assets-source/` once, re-encoding through sharp with
EXIF orientation applied and **all metadata dropped** (photo1/photo2 carried GPS coordinates). `assets-source/` is
committed so CI can build without the KPOS clone. `scripts/prepare-assets.ts` (prebuild) derives AVIF/WebP/JPEG|PNG at
fixed widths into `public/images/derived/` (gitignored) with deterministic names.

## Why
- Privacy: GPS EXIF must never reach the public site; stripping at import makes the committed bytes already clean.
- CI builds in GitHub Actions have no `../KPOS`; the repo must be self-sufficient.
- Deterministic names let templates reference images without a manifest.

## Rejected
- **Astro `<Image>` from `src/assets`:** fine for single images, but it would re-process on every build and the GPS strip
  would depend on remembering `withMetadata` everywhere.
- **Committing derived images:** churn and size; derivation is 2 s.
