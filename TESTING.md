# Testing and verification boundaries

2026-10-31. This is the test **map and interpretation guide**, not the live result ledger. Final QA owns [quality-report.md](docs/quality-report.md) and [performance.md](docs/performance.md). Those reports may be populated or superseded by the parallel QA phase; absence means no final result is available, not success.

## Recorded baseline, not rerun here

The preceding local PWA/workflow acceptance recorded `npm ci`, validation/build/audit and Chromium E2E success: **116 unit tests, 67 E2E passes and 1 skip**. The skip was genuine Full, with WebGPU adapter/shader-f16 unavailable. These are historical baseline counts supplied with this handoff, **not fresh final-QA measurements**. Use QA's dated report for the current counts, environment, errors, hints, dependency audit and artifacts. Do not sum phase totals or relabel a skip as a pass.

Real pinned MiniLM q8 CPU build inference and real Chromium single-thread WASM query/JD inference were validated. The browser test redirects asset transport to matching pinned local build-cache files; it does not replace the extractor or vectors with fakes. Genuine Qwen loading/generation has **not** been established. Full-only lifecycle mocks validate application boundaries, not hardware, allocation or compiler/grammar compatibility.

This documentation phase ran **no install, build, test, audit, browser or performance command**. It used source reads and editor diagnostics only. No protected-reference checksum was remeasured.

## Normal developer/CI gates

| Command | Scope / important exclusion |
| --- | --- |
| `npm ci` | Exact lockfile install; Node 24.9+ within 24, npm 11; cold model download occurs later during Brain/build |
| `npm run validate:workflows` | YAML and pipeline/security/path contracts; not a hosted Actions run or actionlint |
| `npm run brain` | Canonical validation, real CPU embeddings, ten artifacts and sanitized résumé |
| `npm run check` | Astro + DOM TypeScript + separate WebWorker TypeScript checks |
| `npm run lint` | ESLint, zero allowed warnings |
| `npm test` | Vitest unit/contract suites; not browser inference |
| `npm run build` | Assets → Brain → Astro → postbuild static SW snapshot |
| `npm run audit:public` | Existing `dist/` parity, publication checks, locked runtime bytes and offline hashes/budgets |
| `npm run validate` | Workflow validation → Brain → check → lint → units → complete build → public audit |
| `npm run test:e2e` | Separate Playwright Chromium suite; normally builds and owns its preview |

Browser installation is separate: `npm exec playwright install chromium` locally; workflows use `--with-deps chromium` on Ubuntu. `ATLAS_TEST_PORT` chooses a free isolated port (workflow uses 4337); preserve any existing 4321 preview. The harness has `reuseExistingServer: false` and Astro `--ignore-lock`. `ATLAS_TEST_SKIP_BUILD=1` is valid only after validating the same complete artifact. It is not a way to skip release checks.

No application environment secret or `.env` is required. `ATLAS_REAL_FULL=1` is an explicitly authorized optional large-model hardware-test switch, not normal CI or an application setting. Its test bounds loading/selection and records why it could not proceed. Do not repeatedly download Qwen merely to turn the skip green.

## Coverage map

| Files | What is exercised |
| --- | --- |
| `tests/unit/schema.test.ts`, `knowledge.test.ts` | Strict canonical records, cross-links, publication restrictions, deterministic knowledge/résumé contracts |
| `themes.test.ts`, `interactions.test.ts` | Token/contrast contracts, validated UI state requests and canonical behavior |
| `ai.test.ts` | Retrieval, conservative JD labels, corpus/model integrity, tool/selection safety and worker bridge boundaries |
| `offline.test.ts`, `workflows.test.ts` | Static cache eligibility/budgets/history and workflow structure/permissions |
| `tests/e2e/foundation.spec.ts` | Static pages, generated assets and baseline content |
| `atlas.spec.ts`, `resilience.spec.ts` | Lenses, map/list, inspector, reading/comparison/history, no-JS, theme/motion, keyboard/touch, reflow and failures |
| `ai.spec.ts` | Real model-free Pocket; genuine opt-in MiniLM; Full capability probe; clearly mocked Full failures/actions; privacy, cancellation, stale results and local JD |
| `offline.spec.ts` | Genuine SW install/offline navigation, unvisited precached routes, Pocket/JD, two-version/multi-tab updates, corruption, exclusions and isolated clearing |

Default E2E contexts block service workers so route mocks reach the application. Offline tests explicitly enable real service workers and use an isolated changing HTTP fixture; they are not mocked SW registration tests. Runtime tests and fixture tests have different evidentiary scope.

## Accessibility, performance and reporting

Axe, keyboard/focus, touch-sized controls, palette checks, narrow-width overflow, live resize, root-font enlargement and screenshots cover the tested Chromium surfaces. Screenshot capture with animations disabled is not motion testing; separate tests exercise motion/cancellation. Emulated touch is not a physical device, root-font enlargement is not true browser zoom, and axe is not manual screen-reader or full accessibility conformance certification.

QA owns timings, byte measurements, runtime samples and any lab scores. Weight sizes, configured timeouts, cache budgets and animation durations are not benchmarks. A single unthrottled inference duration is not a latency promise. Published bundle presence is not automatic network transfer. No field Core Web Vitals, calibrated retrieval-quality metric or universal browser-support claim follows from the baseline.

Ignored `test-results/` holds screenshots, traces and real-model probe/runtime JSON. Artifact paths may change when QA runs; cite the report rather than stale `/tmp` logs. Keep pasted JD/query canaries and private test material out of any published report or website artifact.

## Still requires separate evidence

- Genuine Full load, allocation, JSON grammar/selection, cancellation/device-loss and cache behavior on capable hardware.
- Learned semantic and Full offline reload/inference; model-cache entries alone are insufficient.
- Physical iOS/Android, Firefox/WebKit/Safari, manual screen readers, true zoom and constrained-device memory/network behavior.
- Broader labeled-query relevance/abstention evaluation; the cosine threshold is a heuristic, not confidence.
- GitHub-hosted Linux workflows, actual Pages deployment, HTTPS/MIME/header/deep-link/404 smoke checks and production update/rollback behavior.
- Owner/employer/issuer/public-link and image-use review; technical tests do not verify personal claims.

See [review register](project-context/known-issues.md), [deployment](DEPLOYMENT.md) and [security](SECURITY.md). “Local implementation delivered with explicit verification limits” is the current delivery statement, not “all definition-of-done gates complete.”