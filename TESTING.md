# Testing

Everything below was run on 2026-11-01 on the build machine (macOS 26.7.1, Apple M1 Pro, Node 24.9.0). CI
(`.github/workflows/*.yml`) runs the same commands but has not been executed yet (nothing pushed).

## Commands
| Layer | Command | What it checks |
|---|---|---|
| Types | `npm run check` | `astro check` + `tsc` for the app and the WebWorker tsconfig |
| Lint / format | `npm run lint` · `npm run format:check` | ESLint (TS + Astro), Prettier |
| Tokens | `npm run tokens:lint` (also a unit test) | fails on any literal colour outside `src/styles/tokens` |
| Content | `npx tsx scripts/validate-content.ts` (also a unit test) | schemas, cross-references, fixed counts, info.md only for cert months |
| Unit | `npm test` | Vitest: OKLCH maths, schema, token lint, content, floor plan / rail / quality probe, tour, six simulations, power series, AI (chunks, BM25, RRF, answers, NLP, JD, grounding, tools), eggs, service worker |
| Build + audit | `npm run build` | prebuild (images, ORT, Build Brain) · postbuild (service worker, public-output audit: exclusions + canonical + CNAME) |
| E2E | `npm run test:e2e` | Playwright, 10 projects × 8 specs (foundation, tier0 with JS disabled, hall, panel, operator, eggs, audit, a11y/axe) |
| Lighthouse | `LH_PRESET=desktop npm run lighthouse` · `LH_PRESET=mobile npm run lighthouse` | perf ≥ 0.90, a11y ≥ 0.95, bp ≥ 0.90, SEO ≥ 0.95, CLS ≤ 0.05, TBT ≤ 200 ms on `/`, a machine page, a case study, the résumé |
| 3G | `node scripts/check-3g.mjs` | HTML readable before any 3D bundle on 3G + 4× CPU, 390×844 |
| Frame probe | `hall.spec.ts` "quality probe" | injected slow frames engage a lower profile |
| Full Brain | `node scripts/check-full-brain.mjs` | Google Chrome `--headless=new` on 127.0.0.1: WebGPU adapter, download time, grounded answer, refusal, executed tool, both model sizes |
| Screenshots | `node scripts/screenshots.mjs --pages … [--bay N]` | desktop-dark, desktop-light, pixel7-dark, iphone14-light |

## Playwright matrix
Projects: desktop-light, desktop-dark (Desktop Chrome), pixel7-light, pixel7-dark, iphone14-webkit (dark), small-360
(360×640), landscape (Pixel 7), reduced-motion, a11y-light, a11y-dark (axe on 13 pages, WCAG 2.2 AA + best practice).
Served by `scripts/serve-dist.mjs` (Pages-like) on 127.0.0.1:4441. Chromium exercises the WebGL 2 path (no WebGPU
adapter in Playwright's build); WebKit on this Mac reported a WebGPU adapter.

## Results (final numbers in the release report and `Memory/SIMULATION-ROOM/testing-status.md`)
- Unit: 11 files, 81 tests passing (2026-11-02 audit).
- Build: 25 pages; `✔ service worker: 46 precached entries`; `✔ public-output audit: 171 files clean`.
- Bundle (gzip): first-load JS 20.7 KB total; `three` chunk 226 KB and `mount` 9 KB lazy; Rapier and the AI workers
  lazy; MiniLM 23 MB + ORT 14 MB only when semantic retrieval loads; Qwen 290 / 880 MB only on explicit opt-in.
- 3G run: recruiter strip visible 314 ms · FCP 988 ms · H1 1,105 ms · first Three.js request 1,848 ms · hall ready
  6,614 ms · 3,468 readable characters before any 3D → pass.
- E2E, release build: 340 tests → 336 passed, 1 skipped (WebKit service-worker check), 3 test-side races fixed and
  re-run green (10 projects: desktop-light/dark, pixel7-light/dark, iphone14-webkit, small-360, landscape,
  reduced-motion, a11y-light/dark).
- **Audit re-run, 2026-11-02:** unit 81/81; build clean (25 pages, 46 precached entries, 170 files audited); E2E 386 passed ·
  1 skipped · 1 failed. The failure is `iphone14-webkit` "breaker throws the night shift": the phone HUD sheet's transition
  stalls under WebGPU rendering in this WebKit build; the same test fails 4/4 on the untouched `d213699` build (it passed on
  2026-11-01). Lighthouse desktop 1.00 on all four URLs (TBT ≤ 26 ms, CLS ≤ 0.025); mobile 0.98 / 0.99 / 1.00 / 0.99,
  a11y/bp/SEO 1.00, TBT 0 ms, CLS ≤ 0.007.
- Lighthouse desktop (2026-11-01): perf 1.00 / a11y 1.00 / bp 1.00 / SEO 1.00 on `/`, `/machines/telemetry-refinery/`,
  `/work/a360/`, `/resume/`; CLS ≤ 0.027; TBT ≤ 7 ms. Mobile: perf 0.98 / 0.99 / 0.99 / 0.99, a11y/bp/SEO 1.00,
  CLS ≤ 0.007, TBT ≤ 2 ms, LCP 1.8–2.3 s (simulated). All budgets met.
- Full Brain (Google Chrome 156 `--headless=new`, Apple metal-3, shader-f16): Qwen2.5-0.5B loaded (290 MB, 394 s on
  this connection), model-written cited answer in 1.8 s with groundedness 100 %, decline on an out-of-scope question,
  tool button executed → `/#bay-2`. The 1.5B run is network-bound (880 MB); see the release report for its status.

## What only a human on a device can confirm
Thermals and battery on a real phone, gesture feel (two-finger orbit), haptics (not implemented beyond opt-in design),
sound character on speakers, screen-reader flow end to end, WebGPU on Windows/Linux/Android GPUs and iOS Safari.
Use `npm run preview:lan` and the QR code.
