# Review register and verification limits

2026-10-31. This app-local engineering register is not a replacement for QA-owned Memory issues or the [quality](../docs/quality-report.md)/[performance](../docs/performance.md) reports. Check those for current findings; do not interpret report absence or old counts as success.

| Item | Current disposition | Evidence needed / owner action |
| --- | --- | --- |
| Genuine Full GPU inference | Implemented; recorded probe had no adapter/f16; no genuine successful inference | Capable-hardware load/selection/compiler/grammar/cancel/device-loss validation |
| Optional learned/Full offline reload | Not certified; SDK cache presence is insufficient | Real offline runtime/tokenizer/compiler availability and successful inference |
| Physical/manual/additional-browser QA | Local Chromium coverage is narrower | Physical iOS/Android, Firefox/WebKit/Safari, manual screen readers, true zoom, resource constraints |
| Retrieval quality | Canonical-ID safety is not answer relevance; 0.45 cosine cutoff is heuristic | Labeled queries, abstentions and measured quality/cost comparison |
| Optional asset cost | Full worker and runtime assets can be large even when not fetched initially | QA measurements; reviewed distribution optimization, not unsupported speed claims |
| `ai-manifest.json` SW metadata | `src/lib/knowledge.ts` still emits `serviceWorker: false`, while PWA is implemented separately | Reconcile in a code phase; use offline manifest/client state as PWA authority meanwhile |
| Dependency/hint status | Prior notes contain tooling advisories and Zod hints; this phase did not audit | Current QA report and compatible, separately approved remediation |
| Role title conflict | Canonical Associate title follows source heading/site; one source experience heading differs | Owner confirms official current title; no promotion inferred |
| Credential links/validity | Generic AWS/Founderz/Excellerate links and source-specific shares retained with caveats | Issuer records; no blanket active/verified claim; AZ-104 exact day/renewal unknown |
| Public employer/project evidence | Qualitative A360/P2P and Smart Energy descriptions; no guessed project URLs | Owner/employer-safe approval and genuine public artifacts if available |
| Photo/contact/link review | Genuine derivatives and selected source-provided links exist | Owner approval and external checks; no check performed by this docs phase |
| Hosting/repository/domain | Plan names `kevil21/portfolio` and `kevilpatel.in`; not verified or deployed here | Authorized root setup, hosted workflow, production smoke and rollback validation |
| Pages headers | No arbitrary custom response headers or claimed COOP/COEP/header CSP | Separate hosting/policy review if required; single-thread WASM remains baseline |

**Not an issue:** VIT 2021–2025 is consistent and does not imply incomplete education. **Not missing features:** workers, local JD, real optional semantic inference, offline page caching and workflow definitions exist. **Intentionally excluded:** unsupported scale/outcome counts, synthetic KPIs, phone/private data, free-form factual generation, automatic Full download and 3D spectacle.

Private Memory's QA-owned issue file may retain historical entries until QA reconciles it; it was not edited in this documentation phase. Historical discovery/session records are provenance, not current implementation status. See [roadmap](roadmap.md) and [TESTING.md](../TESTING.md) before making completion claims.