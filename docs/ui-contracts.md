# Evidence Atlas — progressive UI and local intelligence contract

The UI is static Astro HTML plus modular browser TypeScript. There is no hydrated framework or client-side route replacement. Optional local intelligence now includes a Pocket worker, consent-gated semantic/Full models, JD matching and allowlisted tools; it never replaces static content. Canonical facts still come exclusively from `content/portfolio.json` through `src/lib/content.ts`. Runtime details and measured limits: [AI runtime](ai-runtime.md), [model ADR](model-adr.md).

## Files and ownership

| File | Responsibility |
| --- | --- |
| `src/layouts/Layout.astro` | Document/head/SEO/JSON-LD, blocking prepaint theme, portrait rail, command surface, global status, shell entry |
| `src/components/Command.astro` | Search form, input, submit, preset destinations, result/status container, named AI controls landmark and optional download consent |
| `src/components/PersonaControl.astro` | Recruiter/engineer/architect buttons with stable IDs in data attributes |
| `src/components/ProjectReading.astro` | Canonical summary, all three perspectives, technologies, citations and linked skills |
| `src/components/EvidenceLinks.astro` | Real evidence anchors, never JS-only citations |
| `src/scripts/shell.ts` | Theme and persona UI, disclosures, print, history-restored preferences, search bootstrap |
| `src/scripts/atlas.ts` | Fixed domain membership topology, filters/view, project selection and inspector |
| `src/scripts/comparison.ts` | Two-project selection and query-parameter browser history |
| `src/scripts/state.ts` | Session persona, text-only live announcements, state events |
| `src/scripts/motion.ts` | Cancellable WAAPI FLIP/reveal; no content gate or animation loop |
| `src/scripts/search.ts` | Lazy validated generated-index fetch and deterministic whole-token search |
| `src/scripts/contracts.ts` | Pure `AtlasRequest` union and `parseRequest(value, projectIds)` state-only boundary |
| `src/ai/runtime.ts` | Synchronous command interception, lifecycle/consent, canonical rendering, local JD and runtime observatory |
| `src/ai/tools/` | Strict model/deterministic tool schemas, canonical destinations and explicit model-action confirmation |
| `src/ai/workers/` | Independent Pocket retrieval and optional real semantic inference; separate Full constrained selection worker |
| `src/lib/routes.ts` | Browser-safe `documentHref(kind, id)`, domains/personas, editorial domain labels |
| `src/lib/presentation.ts` | Build-time evidence/skill joins and HTML-safe JSON serialization |
| `src/styles/workspace.css` | Components, responsive atlas, print, safe native route transitions |

Keep `src/lib/knowledge.ts` (Node crypto) and `presentation.ts` out of browser imports. Import content types with `import type`. The home page’s `#atlas-data` is a build-generated public JSON payload of canonical projects, their explicit evidence/skills, and journeys; it is not a model prompt or editable alternate source.

## Routes / no-JS baseline

- `/`: four domain groups, nine projects, source-linked cards, default A360 inspector, three complete editorial journeys (`#journey-recruiter`, `#journey-engineer`, `#journey-architect`).
- `/projects/[id]/`: nine static dossiers using exact canonical project IDs. Every perspective is visible without JS; enhancement selects one with a reversible “Show all perspectives” control.
- `/evidence/#<evidenceId>`: all 37 source excerpts. `/evidence/#<skillId>`: all 47 skills. `#excerpts` and `#skills` are section anchors. Reciprocal reference links are generated from knowledge documents.
- `/experience/`: `#profile`, `#experience`, `#education`, `#achievements`, `#contact`, plus every canonical experience/education/achievement ID.
- `/credentials/#<certificationId>`: all ten exact credential records and verification caveats.
- `/resume/`: canonical printable HTML. `/assets/kevil-patel-resume.md`: canonical generated download. Print/PDF uses the browser, not a fake PDF download.
- `/architecture/`: `#project-architectures`, canonical decision IDs, `#runtime`, `#build-brain`, `#pocket-runtime`, `#full-runtime`, `#distribution`, `#dns-resolution`, `#job-description`, `#observatory`. JD is enhanced locally only; disabled without JS with static evidence links. Intended distribution topology is not a deployment claim.
- `/compare/?left=<projectId>&right=<projectId>`: enhanced pair selection. Without JS all nine dossiers remain visible, regardless of query parameters. Duplicate IDs are refused; invalid initial IDs fall back to a valid distinct pair. Submit pushes history; Back/Forward restores the pair. Canonical URL deliberately omits the query.
- `/search/`: full static catalog grouped by kind and anchored by document ID. No-JS search submits here; a server does not interpret `q`. The complete catalog remains browsable. Unlike the enhanced in-memory search, native GET submission puts `q` in the URL/history and sends it to the static host; do not paste sensitive text.
- `/404.html`: useful noindex recovery page. Sitemap lists all 17 indexable pages, excludes 404.
- `/offline/`: additional noindex offline help and 503 recovery body. The original 18 HTML outputs remain; total is now 19. The sitemap also excludes offline help.

## Command interception

The common search form is `[data-command-form]`; its input is `[data-command-input]` (ID `atlas-command`, max 200 characters). Ctrl/Cmd K focuses it. Submit and the Azure/AI presets emit a **cancelable** `CustomEvent` named **`atlas:command` on `document`**, with `detail: { version: 1, query: string }` (trimmed, capped at 200).

The intelligence integration synchronously calls `event.preventDefault()` for recognized natural-language command prefixes/questions. It respects existing cancellation. Without cancellation, the original keyword search executes. A new command invalidates previous pending renders even when intercepted; `fallbackSearch()` explicitly invokes the original search without redispatching. Do not log, persist, or upload `query` by attaching an observer. Architecture/Résumé/JD/Compare presets are real navigation links, not text-search aliases.

`[data-search-panel]`, `[data-search-results]`, `[data-search-status]`, `[data-search-close]` are stable. Search uses `textContent`/created elements, never user-controlled HTML. Escape from the form or results closes and returns focus. Failures link to the static index. Matching requires every normalized query token; title hits sort first, then IDs resolve ties. There are no relevance percentages or generated answers.

The fetched `/generated/search-index.json` must have `schemaVersion: 1` and a `contentHash` matching `body[data-content-hash]`. Malformed document fields and unsafe IDs are refused. Always read the runtime attribute rather than hardcoding a documentation snapshot hash.

## State-only requests

Dispatch a `CustomEvent` named **`atlas:request` on `document`** with one of the exact `detail` shapes below. These are objects, not strings. Extra keys are rejected, including an extra `version` property. Contract version 1 is identified by readiness/state/command events.

| Exact request detail | Supported surface |
| --- | --- |
| `{ type: 'set-persona', persona: 'recruiter' \| 'engineer' \| 'architect' }` | Every page |
| `{ type: 'filter-domain', domain: 'all' \| 'observability' \| 'governance' \| 'intelligence' \| 'craft' }` | `/` |
| `{ type: 'filter-projects', projectIds: <unique known IDs[]> }` | `/`; additive canonical subset filter, empty allowed; domain/All work resets subset |
| `{ type: 'set-view', view: 'map' \| 'list' }` | `/` |
| `{ type: 'select-project', projectId: <known ID> }` | `/`; reveals its domain if filtered out |
| `{ type: 'compare-projects', left: <known ID>, right: <different known ID> }` | `/compare/` |

Invalid, unknown, or inapplicable requests are no-ops; no result is fabricated. Use ordinary route navigation for requests on another surface. No request accepts arbitrary URLs, CSS selectors, code, shell commands, network mutations, or untrusted model output. `src/ai/tools/` now supplies a separate strict tool schema and executor. Explicit deterministic user requests can execute directly; model suggestions require confirmation. This state event is not itself the model trust boundary. Initial `/?projects=id,id` accepts only a validated canonical subset; no user question/JD is put in that URL.

## Readiness / state notifications

`atlas:ready` is emitted on `document` with `{ version: 1, surface: 'shell' | 'atlas' | 'comparison' }` after that module installs listeners. Each document emits its own readiness after native navigation. Register integrations early, or check `html[data-shell-ready="true"]` and `#project-map[data-atlas-ready="true"]`; comparison is ready when `[data-compare-form]` is not hidden. Shell and atlas initialization are idempotent.

`atlas:statechange` emits `{ version: 1, type, ...fields }`:

- `theme`: `preference: system|light|dark`, `resolved: light|dark`.
- `persona`: `persona`.
- `selection`: `projectId`, `domain`.
- `filter`: `domain`, `projectIds` (visible canonical IDs, not a score).
- `view`: `view`.
- `comparison`: `projectIds: [left, right]`.

`atlas:personachange` is an internal document notification with `{ persona }` used to synchronize the atlas and reading panels. Prefer `atlas:request` for changes rather than firing this notification directly.

`atlas:runtime` emits `{ version: 1, ...snapshot }` after intelligence state updates. The snapshot includes tier/path, worker states, selected/loaded model(s), retrieved IDs, fallback reason, successful inference count, last measured durations, cache state, hashes, theme/persona/motion and on-demand capabilities. It includes no query, JD or generated prose. Unknown capability/measurement values remain null or explicitly not measured. Do not turn this local diagnostic event into applicant/query telemetry.

## Stable DOM hooks / focus

- `button[data-persona]` and `button[data-theme-choice]` are controls; **do not select all `[data-persona]` to set button ARIA**: `<html>` also exposes the current persona as state.
- Atlas: `[data-domain-filter]`, `[data-atlas-view]`, `[data-domain]`, `[data-project-item]`, `[data-project]`, `[data-inspect]`, `[data-topology]`.
- Inspector: `[data-inspector]` / `#inspector`, `[data-inspector-title]`, `-domain`, `-summary`, `-lens`, `-perspective`, `-quote`, `-source`, `-evidence`, `-skills`, `-link`, `-compare` (each prefixed `data-inspector`).
- Reading: `[data-reading-project]`, `[data-perspective]`, `[data-show-perspectives]`.
- Compare: `[data-compare-form]`, `[data-compare-select="left"]`, `[data-compare-select="right"]`, `[data-comparison]`, `[data-compare-project]`, `[data-compare-status]`.
- Global announcements: `[data-atlas-status]`; use `announce()` rather than accumulating toasts.
- Intelligence: `[data-ai-controls]` (hidden without JS; `data-ready="true"` after initialization), `[data-semantic-consent]`, `[data-full-consent]`, `[data-semantic-enable]`, `[data-full-enable]`, `[data-ai-cancel]`, `[data-ai-unload]`, `[data-ai-clear-cache]`, `[data-ai-status]`.
- Local JD: `[data-jd-form]`, `[data-jd-input]`, `[data-jd-submit]`, `[data-jd-clear]`, `[data-jd-status]`, `[data-jd-results]`, `[data-jd-level]`. No input field name or upload; max 12,000 characters and 60 clauses. Model-free matching remains available while semantic weights load.
- Observatory: `[data-observatory]`, `[data-observatory-refresh]`. Only refresh/Full opt-in requests GPU/storage capabilities. Static runtime description remains readable without JS.

Explicit Inspect actions on narrow screens focus/scroll to the stacked inspector, which has a return-to-projects link. Filters/persona changes never steal focus. On wide screens the inspector is a native keyboard-scrollable aside, not an overlay. Hover is decorative only. All content remains in HTML when enhancement is absent; no animation initializes content as invisible.

## Offline integration (phases 9/11)

`src/pwa/client.ts` registers the generated SW after load/idle. `[data-offline-controls]`, `[data-offline-status]`, `[data-offline-check]`, `[data-offline-clear]`, `[data-offline-update]`, `[data-offline-refresh]` and `[data-offline-observatory]` expose registration, separate offline-only clear, explicit all-tab refresh, and measured state. Controls are hidden without JS. The additive document event `atlas:offline` has `schemaVersion: 1`, registration phase, page/controller version, controlled/waiting flags, measured cache count/completion, bounded recent public routes, online hint and safe error text. It contains no questions/JD/model output. It does not modify the existing `atlas:runtime` contract. See [offline policy](offline.md) for lifecycle, exclusions and limitations.

## Persistence / motion / later-phase boundaries

- `localStorage['atlas:theme']`: only `system|light|dark`; blocking inline prepaint reads it. Explicit preference wins over OS; System follows OS changes. CSS `light-dark()` provides the no-JS fallback. Storage failures retain in-memory functionality.
- `sessionStorage['atlas:persona']`: only the three persona IDs. No query/JD persistence. Back navigation re-reads preferences without replacing facts.
- Persona order follows canonical journeys with stable canonical fallback order. Domain edges mean membership only; skill joins require an evidence record naming both project and skill.
- WAAPI handles are canceled on interruption, reduced-motion change, hidden document and pagehide. SVG redraws only on state/resize/geometry changes. Native cross-document CSS view transitions do not install an SPA router. Reduced motion disables route pseudo-element animations too.
- `ai-manifest.json` reports implemented Pocket, optional consent/capability-gated models, canonical grounding and fallback behavior. Its stale `serviceWorker: false` field does not represent the separate PWA implementation; use `offline-manifest.json` and `atlas:offline` for that state. Full implementation is not proof of successful GPU inference: the recorded Chromium probe has no adapter. Query/JD stays ephemeral; model assets may persist in separate scoped caches. Static offline caching covers public pages, initial assets, knowledge and model-free Pocket only; learned/Full offline reload is unverified. No environment credentials are required.

## Test entry points

`npm run validate` runs workflow/Brain/strict/static/unit/build/public checks; E2E is separate. [TESTING.md](../TESTING.md) owns the test map and historical baseline; QA's [quality](quality-report.md) and [performance](performance.md) reports own current results. The real MiniLM test uses actual pinned model/tokenizer/WASM with local asset transport, not mocked inference. Full-only lifecycle mocks are separately labeled. Explicit `ATLAS_REAL_FULL=1` permits the separately authorized manual large-model attempt on capable hardware; otherwise only its capability probe runs. No `.env` is needed. The harness uses Astro `--ignore-lock`, an isolated available port and no reuse of an existing preview. Physical-device/screen-reader, additional browsers, field Core Web Vitals, calibrated semantic relevance and genuine Full hardware validation remain separate evidence requirements.