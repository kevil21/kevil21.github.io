# Architecture

The foundation is [`plan.md`](plan.md) (§1–§18). This document records how it is **implemented** in
this repository. Decisions are in [`project-context/decisions/`](project-context/decisions/).

## 1. Request lifecycle (plan.md §5)

```
visitor opens kevilpatel.in
  └─ GoDaddy DNS (A → GitHub Pages, www CNAME) ─ GitHub Pages serves dist/ over HTTPS
       └─ Tier 0: static HTML renders immediately (theme resolved by an inline pre-paint script)
            ├─ islands hydrate on idle/visible (palette, Ask, JD matcher, observatory, compare)
            ├─ capability engine (feature detection only) → renderTier, fullBrainEligible
            ├─ Pocket worker: BM25 over knowledge-index.json at once; MiniLM lazily → semantic
            └─ Full Brain (opt-in click): WebLLM in a worker → grounded answer + validated tool calls
```

Ask flow: `router.ask()` → Pocket `search()` (retrieve + rank, lexical or fused semantic) →
if Full Brain ready: `buildSystemPrompt(persona, chunks)` → stream tokens → `extractToolCalls` →
citations resolved to chunks → answer + evidence + tool buttons. Otherwise: templated answer with
evidence, or ranked evidence, or "The portfolio does not demonstrate that."

## 2. Repository layout (plan.md §15, adapted)

```
content/            canonical content collections (profile, experience, projects, skills, technologies,
                    certifications, education, decisions, evidence, journeys) — every claim has a source
src/
  lib/schema.ts     Zod schemas shared by Astro collections and the Build Brain
  lib/knowledge/    graph, spans (trace), signal series, chunks, validation, routes, dates
  lib/stores/       nanostores: theme, persona, ui (selection, filters, toasts), ai, motion
  ai/protocol.ts    message and index types shared by UI, Build Brain and workers
  ai/runtime/       capability.ts, router.ts, pocket-client.ts, full-client.ts
  ai/pocket/        lexical (BM25), semantic (cosine + RRF), jd-match, answers, embedder-config
  ai/full/          models.ts (catalogue), grounding.ts (prompt + citations)
  ai/tools/         registry.ts (Zod schemas), executor.ts (state-only effects)
  ai/workers/       pocket.worker.ts, llm.worker.ts
  components/       Astro components (trace waterfall, span details, evidence list, rail, …)
  islands/          Preact islands
  features/         plain-TS progressive enhancement (trace controller, filters, story, signal field)
  layouts/, pages/, styles/ (layers: reset, tokens, base, layout, components, utilities)
scripts/            build-knowledge (Build Brain), lib/embed, lib/answers, prepare-assets, copy-ort,
                    build-service-worker, verify-public, validate-content, screenshots
public/             CNAME, robots, manifest, icons, generated/ (Build Brain output), models/ort/ (runtime)
project-context/    ADRs
legacy/site-v1/     previous generation, not deployed
tests/unit, tests/e2e
```

## 3. Content model and knowledge graph

`KnowledgeData` (plain data) → `buildGraph` (112 nodes: profile, experience, project, skill,
technology, certification, education, decision, evidence; 205 typed edges: parent, uses-skill,
uses-tech, tech-of, validates, decided-in, evidenced-by) → `buildTrace` (15 span rows + credentials
lane on a monthly axis; undated children inherit their parent's extent) → `buildSignalSeries`
(activity per month per span kind) → `buildChunks` (105 retrievable evidence units with `source`).
`validateKnowledge` fails the build on any dangling reference.

## 4. Build Brain outputs (`public/generated/`)

`knowledge-index.json` (nodes, edges, chunks) · `semantic-index.json` (384-d L2-normalised vectors,
base64) · `answer-index.json` (templated Q&A + evidence ids + optional tool calls) · `skill-graph.json`
· `evidence-map.json` · `trace.json` · `signal-series.json` · `personas.json` · `ai-manifest.json`
(version `4.0.0+<content-hash>`, embedder pin, Full Brain catalogue, tool names). The worker refuses a
semantic index whose version or model pin does not match the knowledge index.

## 5. Tiers and fallbacks (plan.md §4, §11)

| Failure | Behaviour |
|---|---|
| JavaScript off | Tier 0: every page, résumé and credential renders; links work |
| Worker cannot start | Pocket client builds the BM25 index in the main thread (`lexical-inline`) |
| Embedder download fails / Save-Data / touch device | lexical search; semantic can be enabled on demand |
| No WebGPU / low memory / low storage | Full Brain not offered; blockers shown in the observatory |
| Model load or generation error | router falls back to Pocket for that answer; fatal GPU errors unload the model |
| Offline | service worker serves cached pages and `/offline/`; indexes cached on use; models only if cached |

## 6. Tool boundary (plan.md §8, ADR-013)

Ten tools with Zod schemas; ids checked against the page's known node ids; at most three calls per
answer; rendered as buttons; executor mutates stores or navigates to canonical routes. The same stores
drive user interactions, so an AI action and a human action animate identically.

## 7. Theme, motion, visual

See ADR-007/008/009 and `Memory/TRACE/{theme,motion,visual}-system.md` (outside the repo). All colours
are tokens; renderers re-read them on `tracethemechange`; reduced motion changes animation only.

## 8. Delivery

GitHub Actions (`deploy.yml`): install → check/lint/format/unit → `npm run build` (assets → ORT copy →
Build Brain → Astro → service worker → public audit) → Playwright smoke (desktop, mobile, reduced
motion, axe) → `configure-pages` + root-path guard → upload `dist/` → `deploy-pages`. Manual runs via
`workflow_dispatch`. `validate.yml` runs the full matrix and Lighthouse CI on pull requests.
