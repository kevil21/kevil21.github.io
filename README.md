# Kevil Patel — Evidence Atlas

Static Astro portfolio and progressively enhanced Evidence Atlas, with real model-free Pocket workers, optional consent-gated local models, conservative JD matching and a hash-versioned offline PWA. Strict TypeScript and Zod-validated canonical content; no hydrated framework, backend, analytics or required environment credentials. The original 18 HTML routes are preserved; `/offline/` adds one noindex recovery page.

**Status, 2026-10-31:** local implementation delivered with explicit verification limits; not deployed and not all definition-of-done gates complete. Default Pocket is lexical/concept retrieval, not learned inference. Optional MiniLM q8 has real build/browser validation. Full is generative constrained evidence selection, not free-form portfolio prose; genuine GPU/offline inference remains unverified. Model caching is not proof of execution.

## Documentation map

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Implemented layers, trust boundaries and proposed-to-actual directory mapping |
| [CONTENT-SOURCES.md](CONTENT-SOURCES.md) | Canonical source, publication allowlist and claim/credential caveats |
| [MIGRATION-REPORT.md](MIGRATION-REPORT.md) | KPOS discovery, actual migration, exclusions and unresolved review |
| [IMPLEMENTATION-REPORT.md](IMPLEMENTATION-REPORT.md) | All fifteen final-report sections, with honest completion limits |
| [TESTING.md](TESTING.md) | Test map, historical baseline and evidence interpretation |
| [QA quality](docs/quality-report.md), [QA performance](docs/performance.md) | QA-owned current results; pending/absent reports do not imply success |
| [UI contracts](docs/ui-contracts.md), [runtime](docs/ai-runtime.md), [model ADR](docs/model-adr.md), [offline](docs/offline.md) | Detailed implemented contracts |
| [Engineering context / fifteen ADRs](project-context/architecture.md) | Decisions, conventions, roadmap and review register |
| [Interview pack](docs/INTERVIEW-PACK.md) | Pitch, walkthrough, five talking points and ten grounded Q&As |
| [DEPLOYMENT.md](DEPLOYMENT.md), [SECURITY.md](SECURITY.md) | Future authorized root-hosted release and security limitations |

Engineering Markdown and private project Memory are not website assets or AI inputs. Do not copy them into `public/` or `dist/`; review source-repository disclosure separately.

## Local workflow

Use Node 24.9+ within Node 24 and npm 11. Exact direct dependency versions and `package-lock.json` are installed; `npm ci` is the standalone install path. TypeScript 6.0.3 is pinned because the current checker/linter peer ranges do not support TypeScript 7. Astro 7.4.4 supports the installed Node 24.9.0 runtime.

| Script | Responsibility |
| --- | --- |
| `npm run dev` | Astro development server |
| `npm run assets` | Prepare image derivatives, artwork, and web manifest |
| `npm run brain` | Validate content; generate ten indexes with real pinned MiniLM q8 CPU embeddings and Markdown résumé |
| `npm run build` | Prepare assets, generate knowledge, build Astro, then generate the complete service worker snapshot |
| `npm run build:sw` | Postbuild only: hash exact `dist/` bytes, traverse initial static dependencies, emit `sw.js` and `offline-manifest.json` |
| `npm run check` | Astro checker plus TypeScript no-emit check |
| `npm run lint` | Flat ESLint config; TypeScript checked, generated/build/dependency files ignored |
| `npm test` | Vitest schema, generator, retrieval/tool/worker, offline-policy and workflow-contract tests |
| `npm run test:e2e` | Chromium/axe, real MiniLM, and genuine SW offline/multi-version tests; builds and starts its own preview |
| `npm run audit:public` | Scan `dist/`; canonical/index/résumé parity, stripped metadata, locked runtime bytes and exact offline hashes/budgets |
| `npm run validate:workflows` | Parse YAML and enforce standalone pipeline, permission, trigger, action and artifact contracts |
| `npm run validate` | Workflows → Brain → check → lint → unit tests → build (including SW) → public audit |

Browser tests are separate from `validate` so a fresh CI worker does not silently download a browser. Install Chromium with `npm exec playwright install chromium` before `test:e2e` if not cached. Prettier is available with `.prettierrc.json`; no source-writing formatter is part of a build.

If 4321 is occupied, use an unused port, e.g. `ATLAS_TEST_PORT=4337 npm run test:e2e -- --workers=2`. The harness uses `--ignore-lock` and does not reuse a pre-existing preview daemon. CI sets `ATLAS_TEST_SKIP_BUILD=1` only after validating the same complete artifact. No `.env` is required. Do not set `ATLAS_REAL_FULL` in routine CI: real Full downloads are separately authorized hardware tests.

Validation coverage includes both palettes/axe, no-JS content, responsive reflow, keyboard/touch, theme/lens restoration, storage denial, stale-index fallback, real worker/WASM inference and offline navigation/update/clear behavior. [TESTING.md](TESTING.md) distinguishes historical results from QA's current reports; artifacts stay in ignored `test-results/`. Local Chromium checks are not a GitHub-hosted workflow run, physical-device/screen-reader audit or field Core Web Vitals evidence.

Publish **only `dist/`**, never this project root. The build uses no sibling directory. The original headshot lives at `assets-source/headshot.jpg`, outside public output. Generated files are reproducible outputs, not alternate sources of truth; edit content or generators instead.

## Canonical contract (version 1)

Author facts only in `content/portfolio.json`. Import **`portfolio` from `src/lib/content.ts`** in Astro/server build code. It parses eagerly, so invalid content fails the build. Types are exported from both `content.ts` and `schema.ts`:

`Portfolio`, `Profile`, `Project`, `Experience`, `Skill`, `Certification`, `Education`, `Achievement`, `Evidence`, `Journey`, `Decision`, `Domain`, `Persona`.

| Property | Record contract |
| --- | --- |
| `profile` | `id, name, role, location, summary, email, links[{id,label,url}], languages[]` |
| `projects[]` | `id, title, subtitle, domain, summary, technologies[], evidenceIds[], perspectives{recruiter,engineer,architect}, url?` |
| `experience[]` | `id, title, organization, period, summary, evidenceIds[]` |
| `skills[]` | `id, name, category, evidenceIds[]` |
| `certifications[]` | `id, title, issuer, credentialId?, url, verificationNote, evidenceIds[]` |
| `education[]` | `id, title, institution, period, detail, evidenceIds[]` |
| `achievements[]` | `id, title, summary, evidenceIds[]` |
| `evidence[]` | `id, title, text, source, sourceSection, projectIds[], skillIds[]` |
| `journeys[]` | `id, title, description, projectIds[], persona` |
| `decisions[]` | `id, title, summary, evidenceIds[]` |
| `resume` | `title, summary` |

Domains: `observability | governance | intelligence | craft`. Personas: `recruiter | engineer | architect`. IDs are globally unique kebab-case; `resume` is reserved for its generated document. Unknown fields, duplicate references, missing targets, unsafe URLs, oversized text, and selected prohibited content are rejected. Project↔evidence and skill↔evidence links must agree in both directions. Journey project order is deliberate. Zod validates structure, **not the truth of a claim**.

Profile/resume summaries have no `evidenceIds` field in the requested contract. Their knowledge documents therefore have empty citation arrays, and they are deliberately excluded from prepared answers. They remain available in search. Do not present them as independently verified.

## Public-source and publication decisions

- Personal claims come exclusively from the supplied public résumé and public portfolio snapshot, not private notes or user memory.
- Migrated: nine projects, three experience entries, ten certifications, three education entries, 47 skills (the complete résumé skill list expanded by named services, plus pandas, NumPy, and Jupyter from its projects), two source-supported achievements, three editorial journeys, and two documented architecture records.
- Evidence uses normalized source excerpts. Ellipses explicitly mark removed numbers. Table cells/HTML chips are joined with separators. Public `source` labels are `Public résumé (2026)` and `Public portfolio (source snapshot)`; they are not filesystem paths or independent verification badges.
- The résumé heading says Associate Software Development Engineer while its Kyndryl experience heading says Software Development Engineer. The public index supports Associate; Associate is used consistently. No promotion is inferred.
- Unvalidated percentage/count/scale claims are omitted. Qualification names, dates, software versions, source education scores and AIR, and actual credential IDs remain. No telephone data, internal endpoints/repository identifiers, raw reference files, private documentation, or synthetic KPIs are published.
- All exact source credential links are preserved. AWS links are generic verification portals; Founderz links are homepages; Excellerate uses a general share link. Microsoft credential-specific links are source-provided, not independently verified here. AZ-104's source-listed October 2026 expiry has unknown day/renewal. No arbitrary active/expired status is stored.
- A360, P2P, and Smart Energy have no guessed project URL. Smart Energy's generic profile destination is not promoted to a project-specific artifact.
- `decisions` contains source-described architecture, not invented personal decision rationales. Unestablished modelling/implementation tradeoffs in perspectives are explicitly **Engineering question to explore**.
- Employer-safe scope and issuer/project-specific verification still require owner review before release. The new site has not been deployed.

## Deterministic generated contracts

Every JSON artifact in `public/generated/` is a versioned envelope with `schemaVersion`, `contentHash` and `data`; corpus/semantic artifacts carry additional integrity hashes. The content hash covers parsed canonical JSON with sorted object keys; arrays retain editorial order. Pinned model assets are downloaded on a cold build; real CPU inference creates the semantic vectors. No private filesystem inputs or runtime credentials are used. Consumers reject incompatible versions. Do not import Node-only `knowledge.ts` into browser code.

| File | `data` contract |
| --- | --- |
| `knowledge-index.json` | `documents[]` with `id, kind, title, text, evidenceIds`; normalized, sorted by ID; all eleven content categories |
| `answer-index.json` | `answers[{id,documentId,question,answer,evidenceIds,mode}], fallback`; source-derived, not model-generated |
| `skill-graph.json` | `projects[{id,title,domain}], skills[{id,name,category}], edges[{projectId,skillId,evidenceIds}]` |
| `evidence-map.json` | `evidence` keyed by ID; canonical excerpt plus `provenance: source-provided` and `referencedBy[]` |
| `journeys.json` | `journeys[]` using the canonical contract and editorial ordering |
| `search-index.json` | Knowledge documents plus normalized unique `terms[]`; no relevance/match percentage |
| `ai-manifest.json` | Implemented Pocket and optional model declarations; grounding/fallback policy. Its stale `serviceWorker: false` field does not describe the separate implemented PWA; see offline manifest/client state. |
| `pocket-corpus.json`, `semantic-index.json` | Canonical public corpus and real pinned 384-D q8 embeddings; extra corpus/vector integrity hashes |
| `content-manifest.json` | Sibling filenames, SHA-256, byte lengths and content metadata; self omitted to avoid recursive hashing |

Every graph edge requires evidence explicitly linking both the project and skill. Category-level skill evidence never implies project experience or proficiency. Generated answer text preserves verification caveats and open-question labels. The prepared-answer artifact is not the current runtime answer engine: Pocket/Full render canonical excerpts. Render public strings as text, not unsanitized HTML.

The sanitized download **`public/assets/kevil-patel-resume.md`** is generated from canonical content by `renderResume()`. It includes profile/contact links, experience, all projects/skills/credentials/education, achievements and languages; no raw source is copied. `/resume/` renders the complete canonical HTML résumé with browser print/PDF styling.

## Assets and theme contract

- `assets-source/headshot.jpg`: byte-preserved supplied photo; project-local build input.
- `scripts/prepare-assets.ts`: Sharp orientation correction, full-frame resize without enlargement, metadata removal; requested widths 160/480/960 in WebP and JPEG.
- `src/lib/assets.generated.json`: actual `headshots[{src,width,height,bytes,format}]`, source SHA-256, `og` and `card` dimensions. The shared layout uses these dimensions and responsive paths, not assumed crops.
- `public/assets/`: `headshot-{160,480,960}.{webp,jpg}`, `favicon.png`, `apple-touch-icon.png`, `icon-{192,512}.png`, `og.png`, `card.png`, generated résumé.
- Artwork colors are read from `themes.css`, not separately hardcoded. Social images contain canonical name/role, no generated face. Rasterized text may vary with platform fonts; JSON/résumé determinism does not depend on fonts.
- `tokens.css`: system/editorial/monospace fonts; type scale, spacing, measure, radius, focus dimensions; 0/120/240/420/650ms durations and easing; reduced-motion overrides.
- `themes.css`: all literal colors, warm ivory/dark ink palettes, violet accent, teal success, semantic/status/code aliases. System/Light/Dark controls persist to `atlas:theme`; inline prepaint avoids the wrong palette. System follows OS changes; storage denial is safe. Background colors do not interpolate through low-contrast intermediate states.
- `reset.css`: small semantic baseline, visible focus, wrapping, responsive images, accessible input sizing, reduced-motion fallback. `workspace.css` adds the responsive rail/topology/inspector, reading surfaces, print and native view transitions. `motion.ts` adds cancellable WAAPI FLIP with no content gate or idle loop.

`tsconfig.json` uses DOM libraries for browser code. `tsconfig.workers.json` independently checks Pocket/Full and service-worker entries with WebWorker libraries; worker entries are excluded from the DOM program. Shared types cross the boundary without mixing globals.

## File inventory / handoff

Configuration: `package.json`, `package-lock.json`, `.npmrc`, `.node-version`, `.gitignore`, `.prettierrc.json`, `astro.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`.

Foundation source: `content/portfolio.json`; `assets-source/README.md`, `assets-source/headshot.jpg`; `src/lib/{schema,content,knowledge,resume}.ts`, `src/lib/assets.generated.json`; `src/styles/{tokens,themes,reset}.css`; `scripts/{prepare-assets,build-knowledge,verify-public}.ts`.

UI: `src/layouts/Layout.astro`; `src/components/{Command,PersonaControl,ProjectReading,EvidenceLinks}.astro`; `src/lib/{routes,presentation}.ts`; `src/scripts/{shell,state,motion,search,contracts,atlas,comparison}.ts`; `src/styles/workspace.css`. Ownership and integration details are in [the UI contract](docs/ui-contracts.md).

Routes: `/`, nine `/projects/[id]/` dossiers, `/evidence/`, `/experience/`, `/credentials/`, `/resume/`, `/architecture/`, `/compare/`, `/search/`, `/404.html`, `/offline/`. `sitemap.xml.ts` includes the 17 indexable routes only, excluding 404/offline recovery. Shared metadata supplies canonical/OG/JSON-LD from the same content. No-JS visitors can reach every canonical record, all perspectives, contact/profile links and the full static index.

Enhanced deterministic search fetches a hash/schema-validated index; Pocket adds local evidence retrieval and JD matching, and separately consented models add learned retrieval/selection. No invented prose or fit scores are displayed. Enhanced queries/JD remain in memory; native no-JS GET includes `q` in the URL/request. Persona uses session storage; comparison URLs hold validated project IDs. No JD upload exists.

Static/generated: `public/CNAME`, robots, manifest, ten knowledge JSON artifacts, sanitized assets, and explicitly optional local ORT runtime files. Astro emits `dist/`, then postbuild emits the versioned service worker and offline manifest. Optional SDK/runtime assets can exist in `dist` without being precached or automatically downloaded. `.astro/`, dependencies and model-build caches are local tooling output, not source deliverables.

Tests: `tests/unit/{schema,knowledge,themes,interactions,ai,offline,workflows}.test.ts`, `tests/e2e/{foundation,atlas,resilience,ai,offline}.spec.ts`. Original foundation coverage is retained and expanded for real workers, optional inference and genuine service-worker lifecycle tests. See [TESTING.md](TESTING.md).

Next: owner/publication review, QA report handoff, physical-device/screen-reader/additional-browser validation and genuine Full-capable hardware tests. Workflow definitions are local-only: no hosted run, actual release, deployment or DNS change is established here. See [DEPLOYMENT.md](DEPLOYMENT.md) before copying this standalone project into an authorized repository root; normal releases require no DNS change.