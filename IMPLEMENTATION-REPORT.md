# Final implementation report — Evidence Atlas

Date: 2026-10-31. **Local implementation delivered with explicit verification limits. Not deployed; full definition of done is not certified.** This documentation phase only inspected sources and edited documentation. Final runtime/performance results belong to the parallel QA reports.

## 1. Project location

`/Users/kevil/Library/CloudStorage/OneDrive-kyndryl/Desktop/Misc/Resume/kevilpatel-next`

This is the standalone Astro app. The historical `kevilpatel/plan.md` remains a reference, not the new build root. No Git operation, source/config/test edit or deployment was performed in this documentation phase.

## 2. Memory location

`/Users/kevil/Library/CloudStorage/OneDrive-kyndryl/Desktop/Misc/Resume/Memory/kevilpatel-next`

Private engineering handoff lives there; root docs, `docs/` and `project-context/` provide the app's implementation documentation. Neither is imported into public knowledge or website output. QA retains ownership of testing/performance/known-issues/session-quality records.

## 3. Concept

**Evidence Atlas** is an editorial workspace linking projects to source-provided evidence. Four domains—observability, governance, intelligence, craft—organize nine projects. Recruiter/engineer/architect lenses change emphasis, not facts. A contextual inspector, real project routes, comparison, local evidence retrieval and an honest runtime observatory replace simulated dashboards and a chatbot-first presentation.

## 4. Source discovery

Historical discovery records the full plan-first, recursive KPOS-Memory-second, raw-KPOS-third sequence. Final documentation reread the plan, canonical content, raw résumé and relevant legacy index/script matches, plus actual schema, build, UI, AI, SW and workflow implementation. It did not rerun the historical harness, claim a new Explore execution or remeasure prior reference checksums. [Migration discovery](MIGRATION-REPORT.md#discovery-versus-current-inspection) distinguishes those scopes.

## 5. Migration

Public résumé/portfolio excerpts were sanitized into one canonical JSON graph; a genuine headshot became local build input and six responsive derivatives. [Content sources](CONTENT-SOURCES.md) records the complete inventory and allowlist. Excluded: phone/private/internal material, unvalidated outcome/scale counts, randomized KPIs/heatmaps, legacy games/CDNs/shaders/overlay code and guessed repositories. Associate title is consistent but awaits owner confirmation; credentials retain verification caveats. VIT 2021–2025 is not a conflict or an incomplete-degree issue. [Migration report](MIGRATION-REPORT.md) maps each category to actual routes.

## 6. Stack and responsibilities

| Technology | Implemented responsibility / selection rationale |
| --- | --- |
| Astro 7.4.4 | Static HTML routes/layout/metadata; no mandatory SSR or hydrated framework |
| TypeScript 6.0.3 | Typed browser/build code; separate DOM and WebWorker programs; compatible with installed checker/linter |
| Zod 4.6.7 + JSON | Shared canonical cross-link validation and strict runtime trust boundaries; no duplicate Astro Collection source |
| Native CSS/SVG/WAAPI | Tokenized editorial UI, meaningful membership topology and optional cancellable motion without 3D/animation CDN |
| Transformers.js 4.3.2 | Real pinned MiniLM q8 CPU build inference and optional browser WASM embeddings |
| WebLLM 0.2.87 | Lazy Qwen WebGPU constrained generation, capability/consent gated; not hardware-certified |
| Sharp 0.35.5 | Genuine image derivatives, metadata stripping and palette-derived artwork |
| esbuild 0.28.2 / YAML 2.9.1 | SW bundling and local workflow contract parsing |
| Vitest 5.0.5 / Playwright 1.64.1 / axe 4.14.0 | Unit/contract and Chromium/browser-accessibility verification; scope limits in TESTING |
| Node 24 / npm 11 / GitHub Actions / Pages | Standalone build and defined future static delivery; no live hosting claim |

Versions describe inspected pinned dependencies, not a recommendation to upgrade. [Architecture](ARCHITECTURE.md) maps broad proposed directories to real compact modules instead of empty stubs.

## 7. Visual and motion system

The signature is a portrait/navigation rail, purposeful project topology and source inspector, with readable dossiers rather than modal-only case studies. Native WAAPI applies DOM-first FLIP and small reveals; view transitions enhance native document navigation where supported. Motion cancels on interruption, hidden document, pagehide and reduced-motion changes. There is no idle rendering loop, scroll hijack, entrance gate or mandatory 3D. Configured durations are not performance measurements. Narrow screens stack the same content and provide explicit inspector focus/return navigation.

## 8. Theme system

`themes.css` centralizes warm ivory/dark ink palettes, violet interaction and teal evidence/status tokens. `tokens.css` defines type, spacing, focus, targets and motion. `Layout.astro` applies stored System/Light/Dark preference before paint; shell code follows OS changes in System mode and handles denied storage. Theme persists in localStorage, persona in sessionStorage. Existing automated palette/axe and restoration checks are recorded, not rerun here; physical/manual/browser limits remain. Backgrounds do not tween through low-contrast intermediate colors.

## 9. Architecture

Canonical JSON → shared validation/Build Brain → static pages/knowledge/assets → versioned PWA snapshot → optional local workers. Ten generated JSON artifacts include real semantic vectors, evidence/skill joins, prepared source-derived answers and hashes. The runtime currently selects canonical excerpts, not prepared-answer prose. `src/ai/runtime.ts` orchestrates consent, commands, failure and observatory state; `src/pwa/` separately owns static offline updates/cache state. The intended domain is `kevilpatel.in`; DNS and Pages configuration are unverified. No backend, required secret or `.env` is needed. See [ARCHITECTURE.md](ARCHITECTURE.md).

## 10. AI

Default Pocket is genuine worker execution of **lexical/alias/concept logic, not learned inference**. Optional `Xenova/all-MiniLM-L6-v2` q8 provides real 384-D mean-pooled normalized embeddings; real build and browser WASM inference were validated. It has about 23 MB weights plus about 14 MB WASM and other assets.

Full uses pinned Qwen2.5-0.5B q4f16 with **277,996,288 weight bytes**, plus tokenizer/compiler/runtime. It is **generative constrained evidence selection, not a free-form portfolio essay**. Output is bounded strict JSON from Pocket's retrieved IDs; displayed factual text is canonical, and model action suggestions require confirmation. A pasted JD never goes to Full. Capability guards cover secure context, worker/WASM/cache, adapter/f16, Save-Data, coarse pointer and known resource limits. Reduced motion does not disable AI.

Queries/JD remain ephemeral in the enhanced path; native no-JS GET has the documented URL/host privacy exception. Assets may be downloaded from disclosed public model hosts after consent; no query inference API is used. Failure falls through to Pocket, main-thread lexical, deterministic search and static links. [Detailed model ADR](docs/model-adr.md) records immutable revisions, real payload sizes, runtime APIs and limitations. No successful Full GPU inference is claimed.

## 11. Desktop versus mobile

The content and capabilities do not depend on a desktop-only route. At 650px map groups can use two columns; at 1000px the identity rail is sticky; at 1380px the inspector becomes a side column. Below that it stacks. Touch controls and explicit inspect/return paths avoid hover-only meaning and tiny graph panning. Full is conservatively blocked on coarse pointers/Save-Data and unsuitable known resources; it is not guaranteed merely because the screen is wide. Pocket/static reading remain independent. Physical mobile validation is still open.

## 12. Validation

[TESTING.md](TESTING.md) records the historical baseline once and maps actual suites/commands. [QA quality report](docs/quality-report.md) and [QA performance report](docs/performance.md) own current results and supersede older phase counts; a pending/missing report is not success. Previous local acceptance recorded install, strict checks, lint, units, production build/public audit and Chromium/axe, including genuine MiniLM and SW offline behavior. Full capability was blocked and recorded as a skip; mocked Full checks are separate. No new test or performance execution occurred in this docs phase. No unsupported benchmark, field CWV, universal accessibility or deployed-success claim is made.

## 13. Known limitations

Genuine Full hardware/compiler/allocation/inference; learned/Full offline reload; physical devices/manual screen readers/other browsers/true zoom; constrained memory/network and calibrated retrieval quality; current issuer/employer/link/photo approval; hosted workflows and production smoke/rollback checks remain open. Pages cannot provide arbitrary custom response headers; no COOP/COEP or header CSP is claimed. Browser eviction and first-ever offline access cannot be guaranteed. The AI manifest's stale `serviceWorker: false` field is documented, not silently fixed during a docs-only task. [Review register](project-context/known-issues.md) and QA reports track follow-up.

## 14. Deployment

The plan names `kevil21/portfolio`; **its identity, permissions and live settings were not verified here**. After owner authorization, this project's source contents belong at the repository root, including `.github/workflows` and project-local headshot input—not nested inside a second project folder and not alongside private Memory in the publication artifact.

Read-only PR/manual validation runs locked installation, real Build Brain, checks, Chromium E2E and public audit. Main push/manual release repeats gates, configures already-enabled Pages without enablement, rejects nonempty `base_path`, uploads only audited `dist/`, then uses the separate `github-pages` environment/OIDC deployment job. The intended custom-domain root is `kevilpatel.in`. **Normal application releases require no DNS change.** One-time ownership/Pages/environment/DNS/HTTPS verification is a separate authorized setup step, not performed by the workflow or this phase. Complete artifact rollback and post-deploy smoke checks are in [DEPLOYMENT.md](DEPLOYMENT.md). No Git, upload, Pages setting, DNS or deployment action was taken.

## 15. Interview pack

[docs/INTERVIEW-PACK.md](docs/INTERVIEW-PACK.md) contains a 30-second pitch, two-minute walkthrough, five technical talking points and ten grounded questions/answers. It explicitly distinguishes implemented code, real MiniLM validation, mocked Full checks and missing hardware/production evidence. Use it instead of the older plan's “deployed” summary.