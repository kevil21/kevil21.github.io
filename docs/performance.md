# Local performance acceptance — 2026-10-31

## Result and scope

**PASS: 18/18 serial cold-core Lighthouse audits; no budget failures.** Three runs each of home (`/`), project (`/projects/a360/`), and architecture (`/architecture/`) in mobile and desktop modes. Every run scored **100 performance / 100 accessibility / 100 best practices / 100 SEO**, with **0 ms TBT, 0 CLS, no warnings, and no unexpected model requests**.

This is a controlled local production-file benchmark, **not deployed-site performance, field Core Web Vitals, INP, or a physical-device certification**. Accessibility scores are automated observations, not proof of universal accessibility.

- Build: `a9e247bd72277eab772f6188f84d5f8f4be59eb1a7b0ed4e8c370723defaf70a`.
- Content SHA-256: `f4597070147fc516dd947732c1302deb85d8ae8b702a36a44dd8f6ff58f84fd6`.
- Reports: ignored `performance-results/2026-10-31T08-29-06.921Z/`; completed at `2026-10-31T08:31:47.035Z`.
- Each `{mobile,desktop}-{home,project,architecture}-{1,2,3}.{json,html}` contains the full LHR. `summary.json` retains unrounded metrics, scores, request URLs/sizes, settings, environment, warnings, and gate failures.

## Reproduction and pending manifest save

From the app directory, the tested sequence was `npm ci`, `npm run validate`, `node scripts/validate-html.mjs`, the browser suites, then **`node scripts/performance.mjs`**. Install the pinned Playwright Chromium beforehand with `npx playwright install chromium`. Build first: the performance script deliberately audits existing `dist` and does not rebuild it. Do not run builds or browser suites concurrently with the audits.

**Integration limitation:** after npm installed dependencies, `package.json` developed an editor/disk divergence. The editor contains `perf`, `test:smoke`, `audit:html`, and HTML validation appended to `validate`; a final Node read of the disk manifest still lacked these additions. Repeated editor patches did not resolve it. Accept/save the pending manifest changes, then verify the aliases before relying on `npm run perf`. No successful alias execution is claimed here. The direct entrypoints work, and the manual quality workflow uses them. The lockfile and installed exact quality-tool dependencies passed the clean-install validation.

## Exact conditions

| Setting | Value |
| --- | --- |
| Host | Apple M1 Pro; macOS/Darwin `25.6.0 arm64` |
| Runtime | Node `24.9.0`; npm `11.6.0` |
| Tools | Lighthouse `13.6.0`; Playwright `1.64.1`; Chromium `156.0.8078.4` |
| Production files | Astro `7.4.4` static `dist`; custom ephemeral loopback HTTP server |
| Compression | Node gzip for text assets; image bytes unchanged; `Cache-Control: no-store` |
| Isolation | Fresh Chromium process/profile for every audit; Lighthouse storage reset enabled |
| Audit order | Mobile then desktop; home, project, architecture; runs 1–3 serially |
| Throttling | Lighthouse `simulate` in both modes, not applied physical radio/device conditions |
| SW control | Only `*/sw.js` blocked; no ordinary JS, image, worker, SDK, or model URL blocked |
| Machine calibration | Lighthouse benchmarkIndex ranged `2939–2996.5` |

Mobile: viewport **412×823**, DPR **1.75**, mobile emulation enabled. Simulated RTT **150 ms**, throughput **1638.4 Kbps**, CPU multiplier **4**. Recorded settings also contain request latency **562.5 ms**, download **1474.56 Kbps**, upload **675 Kbps**; these are settings, not measured network speeds. Configured default UA identifies Android 11/moto g power (2022)/Chrome 136; the recorded network UA identifies Chrome 156. Neither means a real Android device was used.

Desktop: viewport **1350×940**, DPR **1**, mobile emulation disabled. Simulated RTT **40 ms**, throughput **10240 Kbps**, CPU multiplier **1**; request/download/upload overrides **0**; UA override disabled. Host UA identifies HeadlessChrome `156.0.8078.4`. Full actual settings and UAs are in every report.

The loopback server removes WAN/CDN/DNS variability. Gzip is controlled by this harness and does **not** establish GitHub Pages compression or caching behavior. Fresh browser profiles prevent prior HTTP/model/SW caches from warming the core run. Blocking SW installation intentionally excludes its background multi-route precache; that workload is reported separately below and tested by the real Chromium offline suite.

## Measurements

Milliseconds below are rounded to three decimal places; bytes are exact. All four category scores are 100, TBT is 0 ms, and CLS is 0 for **every row**. FCP and SI were equal in these traces.

| Mode / route | Run | FCP / SI ms | LCP ms | Transfer B |
| --- | --- | ---: | ---: | ---: |
| Mobile home | 1 | 754.797 | 1397.797 | 66,374 |
| Mobile home | 2 | 752.743 | 1394.743 | 66,374 |
| Mobile home | 3 | 753.143 | 1400.143 | 66,374 |
| Mobile project | 1 | 751.970 | 1376.955 | 60,255 |
| Mobile project | 2 | 752.056 | 1377.084 | 60,255 |
| Mobile project | 3 | 752.424 | 1378.636 | 60,255 |
| Mobile architecture | 1 | 752.600 | 1378.900 | 62,190 |
| Mobile architecture | 2 | 752.712 | 1379.068 | 62,190 |
| Mobile architecture | 3 | 752.294 | 1379.441 | 62,190 |
| Desktop home | 1 | 202.461 | 202.461 | 66,374 |
| Desktop home | 2 | 203.564 | 203.564 | 66,374 |
| Desktop home | 3 | 203.169 | 203.169 | 66,374 |
| Desktop project | 1 | 203.684 | 203.684 | 60,255 |
| Desktop project | 2 | 202.402 | 202.402 | 60,255 |
| Desktop project | 3 | 203.480 | 203.480 | 60,255 |
| Desktop architecture | 1 | 202.636 | 202.636 | 62,190 |
| Desktop architecture | 2 | 202.722 | 202.722 | 62,190 |
| Desktop architecture | 3 | 202.122 | 202.122 | 62,190 |

| Group | Median FCP / SI ms | Median LCP ms | LCP min–max ms |
| --- | ---: | ---: | --- |
| Mobile home | 753.143 | 1397.797 | 1394.743–1400.143 |
| Mobile project | 752.056 | 1377.084 | 1376.955–1378.636 |
| Mobile architecture | 752.600 | 1379.068 | 1378.900–1379.441 |
| Desktop home | 203.169 | 203.169 | 202.461–203.564 |
| Desktop project | 203.480 | 203.480 | 202.402–203.684 |
| Desktop architecture | 202.636 | 202.636 | 202.122–202.722 |

### Transfer versus files versus offline snapshot

Home run 1 loaded six resources. Lighthouse transfer sizes include protocol overhead; decoded resource sizes are not wire sizes.

| Resource | Transfer B | Decoded B |
| --- | ---: | ---: |
| Home HTML | 13,833 | 71,442 |
| `Layout.BqophzjN.css` | 5,268 | 20,841 |
| `headshot-160.webp` | 3,026 | 2,850 |
| Home module | 2,502 | 6,004 |
| Layout module | 40,008 | 132,524 |
| Contracts module | 1,737 | 3,441 |
| **Total** | **66,374** | **237,102** |

Initial script transfer totals **44,247 B**, below the historical 75 KiB target; CSS transfer **5,268 B**, below 40 KiB. No font request occurred: the site uses system font stacks. No ONNX, WASM, Transformers, WebLLM, Pocket/Full worker, model directory, or Hugging Face request occurred in any audit. Independent cold smoke checks also enforce the lazy boundary.

The offline allowlist has **45 entries / 1,728,410 uncompressed B** across reading routes and supporting assets. This is **not** the home HTML size, initial-route transfer, or measured compressed SW-install traffic. The emitted Pocket worker is **107,015 B** and Full worker **6,226,267 B**, but neither belongs to this cold-core transfer. Build output and optional assets are larger than an initial navigation.

## A real failure was fixed, not waived

The first complete 18-run matrix is retained at `performance-results/` root (before timestamped directories). It failed six per-run CLS gates: desktop home **0.1232861081**, desktop project **0.1014148753**, each in all three runs. Mobile CLS was about **0.0517**. Performance scores alone (desktop home 96, project 97) would have hidden this problem.

Lighthouse attributed the shift to reading content moving when progressive controls became visible. The early bootstrap now marks JS availability; enhancement controls reserve their eventual layout space while remaining invisible/noninteractive until ready. No-JS still hides those optional controls. Responsive flex/block and print behavior are preserved, and the portrait has explicit aspect-ratio sizing. A browser regression delays shell modules and verifies unchanged main/heading positions on all three benchmark routes. The second full matrix above has **zero CLS without relaxing the 0.1 limit**. Mobile home LCP changed from roughly 755 ms to roughly 1398 ms as the final stable layout changed the measured content; the improvement claim is stability, not faster LCP.

## Enforced budgets and CI

`scripts/performance-budgets.mjs` rejects:

- Anything other than six groups of three distinct runs numbered 1, 2, 3 (18 total).
- Missing/nonfinite metrics or missing/out-of-range category scores.
- Any unexpected eager model/SDK/worker request.
- Any run exceeding **600 KiB** total transfer or **0.1 CLS**.
- Any group's median LCP above **4000 ms**, median TBT above **350 ms**, or median performance below **0.85**.

These are regression gates with headroom, not guaranteed user-device targets. Unit tests exercise incomplete/duplicate runs, missing scores, nonfinite metrics, excessive transfers, model loads, CLS, and median-vs-best-sample behavior.

`.github/workflows/quality.yml` is manual-only (`workflow_dispatch`), read-only permissions, and separate from deployment. It runs validation, explicit HTML audit, three-engine smoke, then serial Lighthouse. It uploads only ignored performance/smoke reports with 14-day retention. No hosted run was triggered or verified in this task. A future CI baseline must account for Linux/runner variance rather than copying these Mac timings as a promise.

## Remaining limits

- No deployed-host measurements, field CWV/INP, physical phone/tablet, battery/heap profiling, or real browser zoom measurement.
- Core Lighthouse excludes SW installation and explicit AI loading. Genuine MiniLM and offline tests are detailed in [quality-report.md](quality-report.md); their timings are not this benchmark.
- Genuine Full inference remains unproven on this Chromium host; no repeated ~278 MB download was made.
- `npm audit` reports 15 moderate development-tree findings, including Lighthouse's transitive tooling; production audit is clean. No forced dependency downgrade was applied.
- The pending `package.json` save must be reconciled before claiming npm aliases are ready.