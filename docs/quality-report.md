# Local final-quality report — 2026-10-31

## Acceptance summary

This report records a **local phase-10 quality pass**, not completion of the entire project or authorization to publish/deploy.

| Check actually executed | Final result |
| --- | --- |
| Clean `npm ci` | Passed with pinned lockfile |
| `npm audit --omit=dev` | Exit 0; zero production vulnerabilities |
| Full `npm audit --json` | Exit 1; **15 moderate** development-tree findings; zero high/critical |
| `npm run validate` | Passed; **136 unit tests / 8 files**, type/lint/build/public/workflow checks |
| Astro check | Zero errors/warnings; one existing Zod `.finite()` deprecation hint in `src/ai/corpus.ts` |
| `node scripts/validate-html.mjs` | Passed: **19 HTML pages, 1,408 href/src/action references, 57 srcset candidates** |
| Public artifact audit | **59 files passed**; canonical content/export/privacy checks |
| Complete Chromium suite | **71 passed / 1 skipped / 0 failed**, 1.3 minutes |
| Three-engine smoke | **15 passed / 0 failed**, 35.7 seconds; five per engine |
| Lighthouse | **18/18 passed**; all four categories 100, CLS/TBT 0; [full measurements](performance.md) |
| Editor diagnostics after code changes | No errors found |

Final build: `a9e247bd72277eab772f6188f84d5f8f4be59eb1a7b0ed4e8c370723defaf70a`.
Content SHA-256: `f4597070147fc516dd947732c1302deb85d8ae8b702a36a44dd8f6ff58f84fd6` (unchanged).

### Reproduction and one unresolved integration issue

Executed from `kevilpatel-next`: `npm ci`; `npm audit --omit=dev`; `npm audit --json`; `npm run validate`; `node scripts/validate-html.mjs`; then:

- `ATLAS_TEST_PORT=4345 ATLAS_TEST_SKIP_BUILD=1 npx playwright test --config playwright.config.ts --workers=2`
- `ATLAS_TEST_PORT=4345 ATLAS_TEST_SKIP_BUILD=1 npx playwright test --config playwright.smoke.config.ts --workers=2`
- `node scripts/performance.mjs`

Browser tests use production preview with `--ignore-lock`, not the user's existing 4321 preview. The Lighthouse server uses an ephemeral loopback port and closes its browsers/server. Chromium artifacts now use `test-results/chromium/` so suite cleanup does not delete `test-results/smoke/`.

**Pending manifest save:** the editor's `package.json` contains the new `perf`, `test:smoke`, `audit:html` scripts and appends HTML validation to `validate`. After npm externally updated the dependency manifest, final Node inspection of the disk file still showed the original scripts. Repeated editor patches did not reconcile that divergence; the user was unavailable to accept/save it. Save/accept and verify the manifest before using those aliases. The successful commands above used direct entrypoints; the disk `validate` chain did not include HTML, so HTML was explicitly run separately. Do not infer that the new npm aliases were successfully executed. No terminal source overwrite was used to bypass the editor conflict.

## Environment and browser coverage

- Apple M1 Pro, macOS/Darwin `25.6.0 arm64`; Node `24.9.0`, npm `11.6.0`.
- Astro `7.4.4`, TypeScript `6.0.3`, Vitest `5.0.5`.
- Playwright `1.64.1`: **Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2**. Firefox and WebKit were installed and launched, not Chromium devices renamed as other browsers.
- Lighthouse `13.6.0`, HTML Validate `11.17.0`, `entities` `7.0.0`, all exact development pins.
- Browser acceptance tests are local, unthrottled automation. Lighthouse uses separately documented simulated conditions.

Each smoke engine exercises keyboard search/Escape, system/explicit themes, persistent persona, project perspectives, lexical Pocket/JD, download consent, intentional semantic-load failure, cancellation, cache controls, accessibility/contrast in both palettes, reduced motion, and JavaScript-disabled fallbacks. The semantic-load error is deliberately induced; it is not proof of successful learned-model inference in Firefox or WebKit. Smoke contexts block service workers; actual offline/SW behavior is covered separately in Chromium.

Live reflow widths: **280, 320, 375, 568, 768, 1024, 1440, 1920, 2560, then 320 px**, on home, A360, architecture, evidence, résumé, comparison, and search. Tests include 568×320 landscape, 200% root font at 320px, and 320px as a **400%-equivalent reflow width**, not actual browser zoom. They check document/body dimensions, attempted sideways scroll, outside elements and inner text/control clipping. No overflow-hiding workaround was added. No-JS also covers 280px reading routes and project perspectives.

Visually reviewed final Chromium desktop home captures in both palettes, WebKit light expanded AI/error/JD/observatory at 320px, and Firefox dark equivalent. Labels, controls, long diagnostics and flow text wrap within the reading column. These are review captures, not pixel-diff baselines or a manual screen-reader assessment. Desktop Playwright WebKit is **not physical iOS or the Safari application**.

## Defects found and fixed

1. **Responsive clipping:** wrapped project-card toplines/chips, inherited safe word breaking for evidence blockquotes, and constrained native comparison selects with `min-width: 0; width: 100%`. The failing 280px/no-JS and 200%-text cases were rerun on all three engines without suppressing checks.
2. **Invalid HTML/ARIA:** used native labeled sections instead of invalid generic-container labels, removed invalid labels from preformatted blocks and invalid checkbox autocomplete attributes, and escaped literal ampersands. Consent now resets explicitly in runtime initialization/pagehide.
3. **Layout shifts:** the first full Lighthouse matrix failed six CLS gates. Reserved progressive-control layout and explicit portrait aspect sizing fixed the root cause; a delayed-module regression passed and the second 18-run matrix had zero CLS. Budgets were not weakened.
4. **Partial search-index substitution:** generated a trusted search-artifact hash into static HTML. Bounded JSON loading now checks the canonical digest, document cap, duplicates and shape before use. A partial/injected corpus cannot gain trust merely by echoing the public content hash.
5. **Malformed and stale worker output:** bounded finite numeric progress/token diagnostics, idempotent termination, ignored queued messages after termination, positive request IDs, unique/allowlisted evidence IDs, and exact JD result cardinality. Stale Pocket replies are checked before changing metrics/tier; Full completion/failure and capability work are tied to current sequence tokens.
6. **Cache/load/cancel races:** model load/retry is refused during asynchronous cache clearing; duplicate clears are ignored; canceled capability refresh cannot republish stale state. New browser regressions exercise held cache deletion, reload consent, and deliberately delayed mocked Pocket replies.
7. **Avoidable SDK transfer:** semantic-index validation now precedes the dynamic Transformers import, keeping corrupt/missing-index failures from downloading that SDK unnecessarily.

## AI evidence: real, mocked, and untested

**Real MiniLM passed** in the complete Chromium suite after the final changes. Build-time Node CPU embeddings and actual browser worker/single-thread WASM inference use pinned `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8, mean pooling and normalized 384 dimensions, through Transformers `4.3.2`. The browser test redirects asset transport to identical pinned build-cache bytes; the inference and outputs are not mocked.

Final `test-results/chromium/ai-real-MiniLM-*/real-wasm-runtime.json` records **two inferences**, six `atlas-semantic-v1` cache entries, no browser errors, loaded MiniLM and an idle Full worker. Last JD operation: approximately **9.9 ms worker / 14.9 ms operation** on this unthrottled host. This is one observation, not a latency SLA or retrieval-quality benchmark. Weights are **22,972,370 B**, plus tokenizer/config and approximately 14 MB WASM.

**Real Full was skipped honestly.** Its genuine Chromium probe reports WebGPU API present, adapter unavailable, shader-f16 unavailable; reasons are `webgpu-adapter-unavailable` and `shader-f16-unavailable`. No Qwen model is loaded and inference count is zero in `ai-real-Qwen-*/real-qwen-capabilities.json`. The selected Full model remains Qwen2.5-0.5B q4f16 through WebLLM `0.2.87`, **277,996,288 B** weights. No repeated Full weight download was requested.

Existing Full failure/hallucination/tool-confirmation/cancellation tests and the new delayed Pocket race test are **explicitly mocked boundary tests**. They do not certify real GPU allocation, compilation, grammar generation, device loss, or model quality. WebKit's on-demand capability probe can differ from Chromium; a reported capability is not successful Full inference. Firefox/WebKit smoke does not certify either learned model.

## Security, privacy and offline review

- Query/JD input remains ephemeral and bounded (200-character query; 12,000-character JD / 60 clauses). No raw input was added to URLs, persistent storage, network telemetry, or model-host requests. Existing canary tests were rerun.
- Tool actions remain strict allowlisted state changes requiring confirmation where applicable. Full output selects only retrieved evidence IDs, never arbitrary displayed generated prose. Unknown IDs, malformed output, negation/unsupported JD claims and duplicate results have regression coverage.
- Hash verification establishes consistency with the expected page artifact, **not authenticity against a compromised host that can replace both page and data**. Sequence tests are targeted regression evidence, not a proof of all possible concurrency interleavings.
- Static content, canonical navigation and grouped evidence remain usable with JS disabled or failed worker/model/storage capabilities. Optional consent is page-scoped, not restored as download permission after reload.
- Actual Chromium offline tests reran successfully: disconnected unvisited precached routes/reload, real model-free Pocket search/JD, query/private/method/auth/range/no-store exclusions, 404 versus missing/query 503, corrupt cached-byte rejection, two-tab clear isolation, failed atomic install, old/new build matching, timeout fallback and explicit two-tab update acceptance.
- The SW is an exact hash-verified static snapshot; it does not write runtime query results into a cache. Final snapshot: **45 entries / 1,728,410 uncompressed B**. Model caches and unrelated caches are separate. This is not proof of learned-model offline operation, browser eviction immunity or physical installability.

## Static artifact and workflow validation

The new HTML audit uses the full `html-validate:recommended` rules with **no disabled rules**. It parses generated HTML, decodes attribute entities, checks local href/src/action files and fragment IDs, validates srcset targets/descriptors and positive image dimensions, and rejects path escape/symlink traversal. The public audit independently covers canonical/OG/JSON-LD/sitemap/CNAME consistency, generated/export parity and excluded private content. External HTTP/mail destinations are not fetched or ownership-verified by these local checks. No DNS, hosting configuration or production headers were changed or certified.

The existing validate/deploy workflow parser and semantic checks remain; unit tests additionally inspect the new manual quality workflow's triggers, permissions, commands/order and artifact scope. The new workflow has no deploy step, runs performance after browsers, and retains only performance/smoke reports for 14 days. `actions/upload-artifact@v7.0.2` release/action metadata was checked against its official repository. **GitHub-hosted Actions and actionlint were not run.** No cloud resources, Git operations or deployments were performed.

## Dependency findings and remaining work

`npm audit --json` reports **15 moderate development-tree findings**, zero high/critical. Chains include ESLint/typescript-eslint → minimatch and Lighthouse → Sentry tooling → glob/minimatch. Registry advisories identify glob cancellation-bypass filesystem traversal (`GHSA-3g3m-2fjr-6pw4`) and minimatch globparts-amplification denial of service (`GHSA-g3hv-75wg-m249`). These are not 15 independent application exploits. Production audit is clean. npm's suggested remediations include incompatible downgrades; **no `audit fix --force` or speculative dependency override was applied**. Follow compatible upstream fixes and rerun the lockfile/tests/audit when updating tooling.

Still open:

- Accept/save and verify the pending npm-script manifest changes.
- Compatible development-tool vulnerability remediation; the existing corpus Zod deprecation hint.
- Physical iOS/Android/tablet, actual Safari app/zoom, manual screen-reader/input/safe-area/dynamic-browser-chrome checks.
- Real Full inference/device-loss on capable hardware, learned-model offline operation, low-memory/energy profiling and calibrated relevance evaluation.
- Hosted CI/actionlint, deployment/DNS/headers, CDN performance and field CWV/INP.
- External destination ownership, credential renewal/issuer records, and employer-safe publication/contribution review. Local technical passes do not verify résumé claims.

## Evidence locations

- Final browser artifacts: `test-results/chromium/` and `test-results/smoke/` (ignored).
- Final Lighthouse LHRs and unrounded summary: `performance-results/2026-10-31T08-29-06.921Z/` (ignored). Initial failed matrix remains at the parent report directory.
- Local ephemeral logs: `/tmp/atlas-quality-final-{validate,chromium,smoke,lighthouse}.log`; dependency report `/tmp/atlas-quality-audit.json`.
- Durable result summaries: this report and [performance.md](performance.md). Ignored raw artifacts and `/tmp` logs are local evidence, not published or guaranteed to survive cleanup.
- Only the four authorized quality-memory files were updated; broader documentation remains owned by the parallel documentation task.