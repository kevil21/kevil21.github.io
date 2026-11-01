# Architecture

Static Astro 7 site, TypeScript strict, Preact islands only where state lives. Three tiers of experience share one
content model:

1. **Tier 0 — HTML.** Every page (hall, 6 machine pages, 9 case studies, résumé, certifications, contact, Operator
   shell, notebook, offline, 404) renders complete without JavaScript. Machine pages are HTML twins with a real form.
2. **Tier 1 — islands + simulations.** Control panels (`src/islands/ControlPanel.tsx`) drive pure-TypeScript
   simulations (`src/sim/*`) through a nanostores bus (`src/hall/bus.ts`). On machine pages the sims run headless.
3. **Tier 2 — the hall.** `src/hall/loader.ts` (~1 KB in the page bundle) feature-detects, then lazily imports
   `mount.ts`: `WebGPURenderer` (WebGL 2 when no adapter), the procedural kit of parts, six live machines, ceiling
   cables, the power meter, rail + free walk, adaptive quality, opening, tour, sound, eggs.

```
content/*.json  ──Zod──▶ pages (Astro) ──▶ dist/ (HTML first)
      │                                   ▲
      └──Build Brain (scripts/build-knowledge.ts)──▶ public/generated/{knowledge,answer,skill-graph,semantic}-index.json, ai-manifest.json
                                                      │
 browser:  shell.ts (shortcuts, actions) · theme/store.ts · islands ◀── bus ──▶ sim/* ◀── hall/machines/* ◀── mount.ts
           ai/runtime/router.ts ──▶ workers/pocket.worker.ts (BM25 + MiniLM + JD + NLP) · workers/llm.worker.ts (WebLLM)
```

## Directories
- `src/content/` — the content model (profile, experience, education, certifications, projects, decisions, skills,
  machines, events, case-study Markdown). `src/lib/schema.ts` requires a source pointer on every claim.
- `src/styles/tokens/` — the only place literal colours exist (OKLCH, fill/ink pairs, dark/light/night); motion and
  type tokens. `src/theme/` — pre-paint script, store, OKLCH→sRGB bridge for 3D/canvas/SVG.
- `src/hall/` — layout numbers, state, capability, quality probe, rail, free walk, scene, kit, machines, cables,
  power meter, sound, tour, eggs, loader, mount, headless sim runner.
- `src/sim/` — RefinerySim, SorterSim, ForecastSim, WorkbenchSim, CalibrationSim, FoundationsSim (deterministic, seeded).
- `src/ai/` — config (pins), knowledge (BM25/RRF/vectors), chunks, answers, nlp, jd, grounding, tools (Zod),
  protocol, workers, runtime (pocket/full clients, router, executors, lens).
- `src/islands/` — ThemeToggle, HallHud, ControlPanel, Operator, LensToggle, Toast.
- `scripts/` — build-knowledge, copy-ort, prepare-assets, import-assets, validate-content, lint-tokens,
  verify-public, build-service-worker, serve-dist, lan-preview, screenshots, check-3g, check-full-brain.
- `project-context/decisions/` — ADR-001 … ADR-014.

## Key contracts
- **Theme:** `data-theme` set pre-paint; every non-CSS colour read through `tokenColor()`; `sr:themechange` re-applies.
- **State is the only mutation path:** HUD, panels, Operator tools and the 3D all go through nanostores
  (`hall`, `railProgress`, `controls`, `readouts`, `tour`, `mapOpen`, `themePref`, `lens`).
- **Shell bindings outside islands:** `data-action` clicks and global keys work before hydration.
- **Workers validate before downloading:** the semantic index must match `id@revision`; GPU errors are fatal → Pocket.
- **No request blocks first render:** fonts preloaded with metric-matched fallbacks; 3D, models and indexes are lazy.

## Hosting constraints (GitHub Pages)
No response headers (no CSP/COOP/COEP → WASM single-threaded), root path required (`public/CNAME`, root-path guard in
`deploy.yml`), service worker generated after the build and never intercepting `/models/`.
