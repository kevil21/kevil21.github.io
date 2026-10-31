# Testing

| Layer | Tool | Command | What it covers |
|---|---|---|---|
| Types | `astro check`, `tsc` (app + worker configs) | `npm run check` | strict TypeScript everywhere incl. workers |
| Lint / format | ESLint 10 (typescript-eslint, eslint-plugin-astro), Prettier | `npm run lint`, `npm run format:check` | |
| Content | Zod + `validateKnowledge` | `npm run brain` / `tsx scripts/validate-content.ts` | schema, dangling references, duplicate ids, journeys |
| Unit | Vitest | `npm test` | graph, trace, signal determinism, chunks, dates, BM25, answer matching, JD buckets, tool validation, grounding |
| End-to-end | Playwright (desktop-light/dark, mobile Pixel 7 light/dark, WebKit iPhone, reduced-motion, a11y-light/dark) | `npm run test:e2e` | pre-paint theme, persistence, no literal colours, Tier 0 without JS, SEO files, 404, trace highlight/select/sheet, persona FLIP, project filters via URL, palette, Ask (pocket path, evidence, tool button), not-demonstrated answer, JD matcher, worker-failure fallback, no auto model download, observatory, motion tokens, View Transition attribute persistence |
| Accessibility | axe-core (WCAG 2.2 A/AA + best-practice) on 17 pages × both themes | `npm run test:a11y` | plus 24px target and visible-focus checks |
| Performance | Lighthouse CI (desktop preset, budgets: perf ≥ 0.9, a11y ≥ 0.95, SEO ≥ 0.95, CLS ≤ 0.1, TBT ≤ 300 ms) | `npm run lighthouse` | home, A360, résumé, JD matcher |
| Visual | `scripts/screenshots.mjs` | `npm run shots` | 14 pages × 4 configurations, console errors, horizontal overflow |
| Public output | `scripts/verify-public.ts` | part of `npm run build` | exclusion list, canonical URL |

## What cannot run in CI (and how it was checked)
- **Full Brain on real WebGPU.** Playwright's bundled Chromium exposes no WebGPU adapter, so CI covers the
  Full Brain through unit tests (grounding, tool extraction/validation) and the fallback path only.
  Locally, Google Chrome with `--headless=new` exposes an adapter on a secure context, and
  `node scripts/check-full-brain.mjs` (with `MODEL=compact|recommended`) downloads the model, verifies
  progress/cancel UI, grounded generation, citations, tool buttons and the observatory cache tile.
  Both Qwen2.5 models were verified this way on an Apple GPU (results in `Memory/TRACE/testing-status.md`).
- **Real iOS/Android devices and screen readers.** WebKit/iPhone emulation and axe run in CI; physical
  device checks are a release-checklist item for Kevil.

Only results that were actually executed are recorded; see `Memory/TRACE/testing-status.md`.
