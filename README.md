# kevilpatel.in — TRACE

> A career presented as a distributed trace. Static-first, local-AI portfolio of **Kevil Patel**
> (Associate Software Development Engineer, Kyndryl — Agentic AI practice), deployed to GitHub Pages
> at **https://kevilpatel.in**.

![version](https://img.shields.io/badge/version-4.0.0-f2b24a?style=flat-square)
![stack](https://img.shields.io/badge/stack-Astro%20%C2%B7%20TypeScript%20%C2%B7%20Preact%20islands-15171f?style=flat-square)
![ai](https://img.shields.io/badge/AI-on--device%20%C2%B7%20Transformers.js%20%C2%B7%20WebLLM-7cc8d6?style=flat-square)
![deploy](https://img.shields.io/badge/deploy-GitHub%20Actions%20%E2%86%92%20Pages-a78bfa?style=flat-square)

## The concept

Kevil's public work is observability and agent governance, so the portfolio borrows the vocabulary of a
**distributed trace** and applies it everywhere:

| Trace concept | Here |
|---|---|
| span | a role, education period or project (the home page is a waterfall of them) |
| child span | a project nested in the role or degree it happened within |
| span event | an outcome, a decision, a certification issue date |
| attributes | skills and technologies — hover one and every span that carries it lights up |
| links | **evidence**: repositories, credential verification, profiles — *no evidence = no claim* |
| the signal | the career-activity series, rendered as the signature visual behind the trace |

Three personas (recruiter · engineer · architect) re-arrange the same facts with motion; they never
change them. Every claim in `content/` carries a `source` pointer into the previous site's material.

## Three intelligence tiers, all on the visitor's device

```
Tier 0  static HTML         complete portfolio, résumé, credentials — works with JavaScript off
Tier 1  Pocket Brain        Web Worker · BM25 instantly · MiniLM (23 MB, lazy) for semantic search,
                            evidence ranking, pre-generated answers, the on-device JD matcher
Tier 2  Full Brain          opt-in WebLLM (Qwen2.5 1.5B, 880 MB, or 0.5B, 290 MB) in a Web Worker,
                            grounded on retrieved evidence, driving the UI through validated tools
fallback  Full → Pocket → lexical → static. No path ends in "unavailable because AI failed".
```

GitHub Actions is the **Build Brain**: it validates the content model, chunks it, embeds it with the same
model the browser uses, derives the knowledge graph, evidence map, trace, signal series, templated
answers and `ai-manifest.json`, then builds and deploys. No paid AI call anywhere.

## Version history

| Version | Generation | Notes |
|---|---|---|
| v1.0 – v3.2.1 | Kevil.OS (vanilla HTML/CSS/JS) | preserved in [`legacy/site-v1/`](legacy/site-v1/), see `legacy/site-v1/README-v3.md` |
| **v4.0.0** | **TRACE** (Astro + TypeScript, local AI) | this repository root |

## Stack (each piece owns one job)

| Layer | Technology | Responsibility |
|---|---|---|
| Shell | Astro 7, TypeScript strict | static HTML for every page, content collections |
| Islands | Preact + signals, nanostores | palette, JD matcher, Ask, compare, observatory; shared state the AI tools can drive |
| Content | Zod schemas (`src/lib/schema.ts`) | one canonical model shared by UI and AI |
| Styling | CSS layers, OKLCH tokens, container queries, fluid type | System/Light/Dark with no flash |
| Motion | CSS, View Transitions, WAAPI (FLIP), GSAP ScrollTrigger | intro, morphs, persona re-order, scroll storytelling |
| Visual | Three.js → Canvas 2D → inline SVG | the signal field, data-driven and theme-aware |
| Pocket Brain | Transformers.js + onnxruntime-web (WASM) | semantic search in a worker |
| Full Brain | WebLLM (WebGPU) | grounded generation + tool calls in a worker |
| PWA | hand-written versioned service worker | offline shell; models cached separately |
| Quality | Vitest, Playwright, axe-core, Lighthouse CI, ESLint, Prettier, `astro check` | see `TESTING.md` |

## Commands

```bash
npm ci
npm run dev          # http://localhost:4330
npm run brain        # Build Brain → public/generated/*.json
npm run build        # assets → ORT runtime → brain → astro build → service worker → public audit
npm run preview      # http://127.0.0.1:4331
npm run check && npm run lint && npm test && npm run test:e2e && npm run lighthouse
```

## Documentation

[ARCHITECTURE.md](ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) · [TESTING.md](TESTING.md) ·
[DEPLOYMENT.md](DEPLOYMENT.md) · [CONTENT-SOURCES.md](CONTENT-SOURCES.md) ·
[MIGRATION-REPORT.md](MIGRATION-REPORT.md) · [plan.md](plan.md) (architecture foundation) ·
[project-context/decisions/](project-context/decisions/) (ADRs) · [deploy.md](deploy.md) and
[future.md](future.md) (previous generation's guides, kept for history).

## Privacy

Nothing a visitor types is sent anywhere. Models and indexes are cached in the visitor's browser only,
and the observatory page offers a one-click "clear downloaded models". No analytics, no fonts from
third parties, no fingerprinting.
