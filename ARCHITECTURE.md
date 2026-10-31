# Evidence Atlas — implemented architecture

As of 2026-10-31: **local implementation delivered with explicit verification limits; not deployed.** This describes code, not the broader illustrative plan. [Implementation report](IMPLEMENTATION-REPORT.md) · [Testing](TESTING.md) · [ADRs](project-context/architecture.md#decision-register).

## System boundaries

Evidence Atlas is an Astro static portfolio with progressive browser enhancements. It has no runtime application server, database, hosted inference endpoint, authentication service, analytics, or required environment credentials. Azure/GCP/AWS products in portfolio project descriptions are subject matter, not dependencies of this site.

The flow is: reviewed public sources → canonical JSON → Zod validation → Build Brain and asset preparation → Astro HTML → hash-versioned static snapshot → optional browser tools/inference. GitHub Actions definitions prepare and gate a future Pages artifact; no hosted workflow or production delivery is established by their presence. DNS resolves the intended domain to its host; it is not an application-data processing hop.

## Content and build

- `content/portfolio.json` is the only authored career-content source. `src/lib/content.ts` eagerly parses it with `src/lib/schema.ts`. Strict bounded records, global IDs, public HTTPS destinations, reciprocal evidence links, and publication guardrails fail closed. Schema validity is not independent verification of a career claim.
- One JSON/Zod graph is shared by Astro pages, Node generators, tests and browser-safe types. Astro Content Collections would introduce another loading/validation layer without solving an additional authoring need for this small, interconnected dataset. Separate runtime corpus/message schemas validate trust boundaries; they are not alternate career sources.
- `scripts/prepare-assets.ts` uses the project-local genuine headshot to generate full-frame, metadata-stripped derivatives, palette-derived PNG artwork and the web manifest. No sibling file is a build input.
- `scripts/build-knowledge.ts` and `src/lib/knowledge.ts` generate normalized search documents, prepared source-derived answers, explicit skill edges, evidence references and manifests. `scripts/build-semantic.ts` performs real pinned MiniLM q8 CPU inference on evidence title + text; no random/synthetic embeddings.
- Ten JSON files are produced: `knowledge-index`, `answer-index`, `skill-graph`, `evidence-map`, `journeys`, `search-index`, `pocket-corpus`, `semantic-index`, `ai-manifest`, `content-manifest` (all `.json`). The content manifest hashes its nine siblings, not itself. Hashes/schema versions detect mismatched artifacts; arrays retain editorial order.
- The Markdown résumé is generated separately from the same canonical content. `answer-index.json` is a build artifact, **not** the runtime answer engine: current Pocket/Full results render canonical evidence excerpts. Profile/résumé knowledge documents have no invented citations and are excluded from prepared answers.
- `npm run build` invokes asset preparation via `prebuild`, knowledge generation and Astro, then `postbuild` generates the SW snapshot. Cold builds need pinned model downloads; cached builds still perform CPU embedding inference. Stable generation is not a promise of bit-identical inference/artwork across all operating systems or dependency changes.

## Static and progressive presentation

`Layout.astro` owns HTML metadata, canonical/OG/JSON-LD, prepaint theme, portrait rail, command area, public fallback corpus and shell entry. Astro renders 19 HTML outputs: home, nine project dossiers, evidence/skills, experience/profile, credentials, résumé, architecture/JD/observatory, comparison, search, 404 and offline help. The sitemap contains the 17 indexable routes; 404 and offline are noindex.

All career records and all three authored perspectives remain reachable without JavaScript. Search then provides a browsable catalog rather than server-side query evaluation. Print/PDF is browser printing; the download is Markdown, not a supplied PDF. `src/scripts/` enhances the HTML with whole-token search, persona ordering, project filtering/inspection, two-project comparison/history and lifecycle-aware native motion. No React hydration, SPA router or virtual filesystem is installed.

The four domains are observability, governance, intelligence and craft. SVG edges represent domain membership only, not runtime traffic or inferred project-to-project dependencies. Project/skill links require explicit evidence joins. System/Light/Dark use semantic CSS tokens, blocking prepaint preference application and guarded storage. Desktop uses a sticky rail at 1000px and side inspector at 1380px; smaller widths stack the same content. Motion is DOM-first WAAPI FLIP/reveal and progressive native view transitions, with no idle animation loop. Reduced motion changes effects, not AI eligibility.

## Runtime intelligence and trust

| Path | Actual responsibility | Boundary |
| --- | --- | --- |
| Static / deterministic | Complete HTML and whole-token catalog search | No model needed; static catalog survives script/index failure |
| Default Pocket | Lazy worker; token, alias and hand-authored concept retrieval; conservative JD matching | **Not learned embeddings**; no SDK/weights loaded for ordinary queries |
| Optional semantic | MiniLM q8 query embeddings in the Pocket worker, one-thread WASM; cosine retrieval against build vectors | Separate consent; matching revision/tokenizer/pooling/normalization; similarity never proves skill strength |
| Optional Full | Separate WebLLM worker; Qwen generates constrained evidence-ID selections from Pocket's candidates | Not a free-form portfolio essay/chatbot; genuine GPU inference remains unverified |

`runtime.ts` synchronously intercepts eligible cancelable commands; explicit deterministic tools bypass generation. Pocket returns at most six candidate excerpts. Full receives those excerpts and a bounded question, not a pasted JD. Strict output parsing permits at most six unique retrieved evidence IDs and two tools, rejects extra keys/prose/unknown IDs and actions without evidence, and revalidates on the main thread. Factual output uses canonical excerpts via `textContent`; model suggestions require confirmation. This bounds fabrication, but cannot guarantee relevance or independently establish source truth.

The eleven tools in `src/ai/tools/` navigate known sections, open/filter/compare projects, highlight skills, open résumé, switch persona, show evidence/experience/architecture and reset workspace. There is no arbitrary URL, selector, HTML, code execution, filesystem, cloud mutation or autonomous planning loop. The executor applies validated state requests or canonical local navigation. See [UI contracts](docs/ui-contracts.md) for exact events and [runtime](docs/ai-runtime.md) for request limits, cancellation and observatory fields.

Failure order: Full → Pocket → bounded main-thread lexical matching → deterministic search/static catalog. Worker termination and operation tokens suppress stale responses. Semantic loading does not block independent lexical/JD matching. No model silently loads after navigation; consent is page-local.

## Capability, model and privacy boundaries

Full eligibility checks secure context, Worker/WASM, Cache API, WebGPU adapter and shader-f16; Save-Data/coarse pointer, explicitly low device memory or insufficient estimated storage block it. Unknown values stay unknown. No check guarantees GPU allocation. MiniLM is about 23 MB of weights plus about 14 MB WASM and other assets; Full weights alone are 277,996,288 bytes, with tokenizer/compiler/runtime additional. Immutable revisions, libraries, APIs and caveats are in [the model ADR](docs/model-adr.md).

Enhanced query/JD text is ephemeral: no upload, analytics, URL serialization or deliberate persistence. Native no-JS GET search is an exception: `q` reaches URL/history/static host. Model hosts see artifact fetches/network metadata, not query/JD contents. Theme uses localStorage; persona uses sessionStorage; comparison/filter URLs contain canonical IDs. Local runtime/offline diagnostic events are not visitor telemetry and must not be repurposed as such.

## Offline and release

`src/pwa/` and `scripts/build-service-worker.ts` implement a finite same-origin snapshot of HTML, initial dependencies, approved assets, knowledge and model-free Pocket. Dynamic model imports/weights/WASM are excluded from precaching. Install is all-or-nothing with hash checks; version-matched HTML is network-first with a 2.5s bound; assets are cache-first. Unknown paths remain 404; missing known offline pages return 503 recovery content. Explicit update acceptance refreshes all Atlas tabs; old generations remain until clients acknowledge. Static and model cache clearing are separate. [Offline policy](docs/offline.md) defines exact budgets and lifecycle.

One stale metadata field remains: `ai-manifest.json` is generated with `serviceWorker: false`. It is not the PWA capability authority. Use the implemented PWA code, `offline-manifest.json` and `atlas:offline` state. This documentation records the discrepancy without editing QA-excluded code.

The intended repository in the plan is `kevil21/portfolio`, **not verified/configured by this phase**. Its root must contain this project's contents, not a nested `kevilpatel-next/` folder. The release workflow tests and uploads only `dist/`, requires origin-root hosting, and separates read-only validation from Pages/OIDC deployment permissions. Normal releases do not alter DNS. See [deployment](DEPLOYMENT.md) and [security](SECURITY.md).

## Actual structure versus the broader directory proposal

| Proposed responsibility | Actual location | Why compressed |
| --- | --- | --- |
| Separate profile/projects/skills/etc. content folders | `content/portfolio.json`, `src/lib/schema.ts` | One cross-linked authoring graph and shared tooling validation |
| AI runtime/capability/router/fallback folders | `src/ai/{runtime,capabilities,bridge,protocol}.ts` | Small lifecycle and protocol boundaries do not need empty packages |
| Pocket embedder/retrieval/ranking packages | `src/ai/{corpus,retrieval}.ts`, `workers/pocket.worker.ts` | Shared pure logic; learned loader isolated in worker |
| Full model/inference/prompting packages | `src/ai/{models,grounding}.ts`, `workers/full.worker.ts` | Pins/validators separated from the lazy GPU runtime |
| Per-tool modules | `src/ai/tools/{index,executor}.ts` | One strict tool union and one revalidating executor |
| Feature folders for search/JD/personas/observatory | `src/scripts/`, `src/ai/runtime.ts`, Astro components/pages | Native document lifecycle; no duplicated framework feature state |
| Content validator/index/persona generators | `src/lib/{schema,knowledge,resume}.ts`, `scripts/build-{knowledge,semantic}.ts` | Authored personas and deterministic derivatives, not LLM-authored biographies |
| Cache/PWA layer | `src/pwa/`, `scripts/{build-service-worker,verify-offline}.ts` | Separate static-cache ownership from inference SDK caches |
| Engineering context | `project-context/`, root docs, `docs/`; external `Memory/kevilpatel-next/` | Documentation only; no runtime imports or public-copy step |

No empty compatibility stubs or `CLAUDE.md` were added to imitate the plan. Documentation/context and private Memory are not retrieval sources or website assets. A public source repository is a separate disclosure boundary: review engineering documentation before publishing source, even though it is outside `dist/`.

## Verification limits

Real MiniLM build/browser inference and model-free offline behavior have recorded local validation. Full's recorded probe had no usable adapter/f16; mocks do not establish GPU execution. Physical-device/manual screen-reader/other-browser coverage, calibrated retrieval quality, learned/Full offline reload, hosted workflows and deployment remain separate gates. [TESTING.md](TESTING.md) delegates current results and performance to QA, not this architecture narrative.