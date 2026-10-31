# Offline portfolio — implemented static cache contract

Implemented locally; **not deployed**. The 18 existing HTML routes are preserved; `/offline/` is an additional noindex recovery page. The sitemap still contains the 17 public indexable routes.

## Build and storage contract

`npm run build` runs `postbuild` → `npm run build:sw`. The generator inspects rendered HTML, follows only **static initial JS imports/exports and CSS resources**, and explicitly includes the model-free Pocket worker. Dynamic semantic imports are not followed. It includes all HTML, responsive portrait/icon/manifest assets, the generated résumé and all ten generated knowledge artifacts. It does not select every `_astro` file or precache external origins, Full, Transformers, ORT/WASM, ONNX or model weights.

Asset limit: 150,000 bytes each; HTML: 350,000; knowledge: 1,000,000. Whole snapshot: 8,000,000 bytes / 128 entries maximum. Growth fails the build rather than silently expanding the cache. The current actual totals are printed by build/audit; they are uncompressed bytes, not a transfer or performance promise.

`dist/offline-manifest.json` records each exact output SHA-256, byte length and route. The version includes normalized page/asset hashes and the bundled SW implementation; HTML receives the matching `atlas-build` marker. `dist/sw.js` embeds the final hashes. Running `build:sw` again is idempotent. `audit:public` independently rehashes every entry and checks all HTML and knowledge are covered. Do not edit `dist` or regenerate only part of a released artifact.

The worker installs four downloads at a time into `atlas-static-v1-<version>`, checks hashes, and marks completion in `atlas-static-meta-<version>` only after all succeed. Failure deletes the incomplete candidate, leaving the active build intact. Response redirects, opaque responses, private/no-store responses and hash mismatches are rejected. Runtime cache reads are also hash-checked. A corrupted/evicted entry is not trusted; reconnect/reinstall to repair missing offline copies.

Only exact same-origin public GET allowlist entries are intercepted for cached content. Query strings, authorization/range/no-store requests, private/API paths, non-GET methods and external assets are never cache writes. No query or JD text enters SW messages/storage. Query navigation may use a matching network document but never a cached query response; offline it receives the 503 fallback. Query URLs are not treated as sanitized history.

## Navigation, updates and tabs

- Static HTML is network-first with a 2.5-second bound, and must match the active version hash. Failure serves that version's cached HTML. JS/CSS/knowledge are immutable cache-first, also hash-checked. No unbounded runtime response cache exists.
- Unknown routes return the cached 404 body **with 404**, never the home page with 200. Known routes missing offline return `/offline/` content with **503**. If even the fallback is unavailable, a tiny built-in recovery page remains. Known slashless routes redirect to their canonical slash form.
- The first complete install claims the page. Updates do **not** call `skipWaiting` during install. A waiting update has a visible prompt; “Refresh all Atlas tabs” sends the explicit activation message. It warns that all open Atlas tabs refresh and unsaved in-memory query/JD text is lost. Closing every controlled tab also allows normal browser activation.
- Old pages reject newer network HTML while an update waits. After activation each page compares its marker with the controller and refreshes to the matching version. Old caches are reclaimed only after all controlled windows acknowledge the new version. Unreported/frozen tabs conservatively delay cleanup. Generation timestamps prevent an old worker from deleting a waiting/newer build. At most three other retained generations are allowed before a further install is refused; close old tabs and retry.
- Recent routes are bounded to eight deduplicated, known public pathnames in version-local metadata. Query/fragment URLs, 404/offline and unknown paths are excluded. No request bodies, questions, JD, general browsing history or model answers are retained.

“Clear offline pages only” unregisters this SW, disables its runtime cache handling and deletes only the `atlas-static-` namespace; other open tabs are notified. Reload online to install again. Model-cache clearing is separate and retains its existing UI. `atlas-semantic-v1`, `webllm/*`, browser HTTP caches and unrelated app caches are outside static-cache cleanup.

## Integration

Registration happens after load during idle time (1.5-second scheduling deadline), not on the critical rendering path. HTTPS/localhost and browser support are required; registration/storage failure does not disable static reading or Pocket. Controls are hidden without JS. Manifest and foundation PNG icons support installation on capable browsers; platform install prompts/physical-device installation have not been validated.

`atlas:offline` on `document` is an additive diagnostic event (`schemaVersion: 1`): registration phase, browser online hint, page/controller version, controlled/waiting state, measured cache counts, complete-at-install/count status, recent public routes and safe error text. Unknown measurements are omitted, not invented. `/architecture/` shows these same values in `[data-offline-observatory]`. A complete count is not a guarantee against later corruption/eviction. Do not export this local diagnostic event as visitor telemetry.

## Verification and remaining limits

The preceding local PWA acceptance recorded successful static offline/multi-version/corruption/clear tests, snapshot regeneration idempotence and palette/keyboard/axe checks. [TESTING.md](../TESTING.md) records the historical baseline once. QA's [quality](quality-report.md) and [performance](performance.md) reports own current counts, bytes, hashes, environment, dependency results and artifacts; this documentation phase did not run a build, test or audit. Configured budgets above are not performance measurements.

Use the generated `offline-manifest.json` and page/controller markers for the current build identity, not a copied documentation hash. `ai-manifest.json` still contains `serviceWorker: false` from the separate AI generator; that stale field does not describe the implemented PWA. Reconciliation requires a separately scoped code change.

`tests/e2e/offline.spec.ts` opts into genuine Chromium service workers. It disconnects the browser, visits unvisited precached routes, reloads, runs real model-free Pocket search/JD and reads generated knowledge, checks exclusion/corruption/clear behavior and axe. Its isolated HTTP origin serves two byte-consistent versions of HTML and hashed JS, a slow response and a deliberately corrupted install: real SW lifecycle, not a mocked registration. Existing route-mocking suites block SWs deliberately so their failure injection still reaches the intended runtime; they are not substitutes for offline tests.

No **Full offline inference** claim: SDK model caches alone do not prove compiler/runtime/tokenizer availability, allocation, hardware or successful generation. Optional learned semantic offline reload is also not certified here. Real MiniLM online/browser inference remains covered separately. Browser eviction, private mode/quota, abrupt process/power loss, physical iOS/Android, Firefox/WebKit and assistive-technology review remain limits. First-ever offline visits cannot install the app.

See [deployment](../DEPLOYMENT.md) and [security](../SECURITY.md) for origin-root scope, publication boundaries and Pages header limitations.