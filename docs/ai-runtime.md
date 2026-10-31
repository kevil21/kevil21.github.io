# Local intelligence runtime

Status: **2026-10-31 — implemented locally; Pocket and real browser WASM have recorded validation. Full GPU inference remains unverified on capable hardware.** Static content remains independent of every intelligence tier. [Offline caching](offline.md) and [Pages workflow definitions](../DEPLOYMENT.md) are also implemented locally; no deployment or backend is introduced. Current QA results are linked from [TESTING.md](../TESTING.md).

## Architecture and ownership

| Layer | Implementation and boundary |
| --- | --- |
| Canonical source | `content/portfolio.json`; same public title, projects, skills and 37 exact evidence excerpts. No private memory or additional career claims. |
| Build Brain | `scripts/build-knowledge.ts`, `scripts/build-semantic.ts`, `src/lib/knowledge.ts`: ten hash-versioned JSON artifacts plus canonical résumé. Real pinned CPU q8 inference over evidence title + text. Cold builds download the MiniLM assets; subsequent builds use `.cache/atlas-models/`. No credentials required. |
| Static / deterministic | All routes render without JavaScript. Existing `search.ts` retains whole-token search and the complete static catalog. Inline public corpus allows bounded lexical fallback without a worker. |
| Pocket | `src/ai/workers/pocket.worker.ts`: lazy module worker, lexical words/aliases/concepts, conservative JD matching. It does not import Transformers or fetch weights on ordinary queries. |
| Learned semantic | Explicit consent only. Dynamic Transformers.js 4.3.2 import; MiniLM q8, pinned tokenizer, mean pooling, normalized 384-D output. Single-thread WASM in the Pocket worker, no proxy worker or SharedArrayBuffer requirement. |
| Full | Separate lazy `full.worker.ts` using WebLLM 0.2.87 and pinned Qwen. Consent and capability checks precede the worker/download. Pocket supplies at most six candidate excerpts; Full returns constrained JSON selections, never displayed factual prose. |
| Trust / presentation | `corpus.ts`, `grounding.ts`, `tools/`, `runtime.ts`: hash/schema validation, canonical IDs, safe destinations, confirmed model actions, exact excerpt rendering through created nodes and `textContent`. |

The fallback order is Full → Pocket → bounded main-thread lexical matching → deterministic search/static catalog. Failure is visible, not disguised as a successful model answer. During semantic download, search/JD use independent lexical matching rather than wait behind the model loader. Cancel terminates workers; stale operation tokens cannot reactivate models or render old answers. Duplicate semantic-load requests are refused.

### Pinned assets and integrity

Model choices, licenses, revisions and tradeoffs are recorded in [the model ADR](model-adr.md). Build and browser use the same model revision, q8 dtype, tokenizer, mean pooling and normalization. Vector metadata, length, finiteness, norms, IDs, hashes and corpus joins are validated before use.

Transformers.js 4.3.2 task detection was observed requesting `resolve/main/config.json` despite the pipeline revision option. Both build and worker therefore pin `env.remotePathTemplate` as well. The real browser test blocks every unpinned Hugging Face request. WASM paths explicitly name the matching local `.mjs`/`.wasm` pair; SDK WASM caching remains enabled.

Read content/corpus hashes from the rendered page and generated envelopes, and vector identity from `semantic-index.json`. Regenerate rather than hardcode documentation snapshot hashes in callers. Prepared answers exist as a build artifact, but runtime factual results are selected canonical evidence excerpts, not prepared-answer or free-form model prose.

Hashes detect version mismatch/tampering relative to the page; they are not a signature proving a compromised host trustworthy. The source-provided excerpts are not independently verified career evidence.

## Retrieval, JD and tools

- Queries: maximum 200 characters. Explicit project/skill links, whole tokens and concepts determine lexical results. Persona affects order/context, not facts.
- Semantic links: cosine threshold **0.45**, at most three accepted known IDs; combined result at most six. This threshold is a conservative heuristic, not calibrated confidence or proof of relevance.
- JD: local textarea only, maximum **12,000 characters / 60 clauses**, no upload, form field name, storage, URL or remote-model submission. Independent clauses can split; unsafe/negated clauses retain their context. Unknown skills, unsupported qualifiers, durations and injection-like instructions abstain.
- **Strong Evidence** requires explicit canonical skill/project/evidence joins for every recognized requirement skill. **Related** covers skill-list-only or lexical/semantic associations. **Not Demonstrated** means the corpus does not establish it—not that the person lacks it. Similarity never creates Strong Evidence, years or proficiency. No overall fit score.
- Main thread recomputes JD strengths and only accepts bounded semantic ID/score additions from the worker. JD text never goes to Full.
- Model output must be strict JSON, ≤8,000 characters; ≤6 unique evidence IDs from Pocket's retrieved subset; optional ≤2 schema-validated tools. Unknown IDs, extra prose/keys, unsafe tools or actions with empty evidence are rejected. Streamed output exposes chunk counts only until validation.
- Tools: `navigateTo`, `openProject`, `filterProjects`, `highlightSkill`, `openResume`, `switchPersona`, `showEvidence`, `showRelevantExperience`, `compareProjects`, `openArchitectureNode`, `resetWorkspace`. Arguments are canonical allowlists; no arbitrary URL, selector, HTML, DOM access, evaluation or network mutation.
- Explicit deterministic user requests execute directly. Unsolicited model tool suggestions require a separate **Confirm suggested action** button. Evidence IDs are matched exactly, before ambiguous project names or shorter ID prefixes.

See [UI contracts](ui-contracts.md) for the preserved synchronous cancelable `atlas:command` interception, additive `filter-projects` request, routes and stable hooks.

## Consent, privacy, lifecycle and caches

No model SDK/weights load on ordinary Pocket use. Each optional tier has a separate unchecked consent control, actual weight size, origin description and load/retry action. Consent is page-local. New navigation unloads workers; returning does not silently resume inference. Models can be redownloaded/reloaded from browser cache only after opt-in.

Hugging Face serves fixed public model/tokenizer files; GitHub serves Full's pinned compiler library. Hosts can observe asset requests and ordinary network metadata, but query/JD contents are not sent in requests. Normal static navigation/contact links remain ordinary links. **No-JS GET search is different:** its `q` reaches static-host URL/history; never paste sensitive text there. JD is disabled without JS, with real source links available.

Query/JD state is ephemeral; clear/pagehide remove visible text/results and invalidate pending work. This is not a secure memory-erasure guarantee. Only theme and persona preferences are persisted by existing shell code. No query telemetry, conversation storage or applicant analytics is installed.

`atlas-semantic-v1` stores model/tokenizer/WASM assets. Full uses SDK `webllm/model`, `webllm/config`, `webllm/wasm` caches, with clear operations scoped to this pinned model root/library. Unload leaves cache intact; clear terminates workers and removes scoped Cache API entries. Browser HTTP cache, eviction and origin-wide storage accounting are outside that control. The implemented static service worker owns only `atlas-static-` caches; it never precaches model SDK/WASM/weights or clears model caches. Model-free Pocket offline operation is tested separately; learned-model/Full offline inference remains unproven.

Bridge IDs, bounded pending requests and timeouts handle crashes/malformed replies/stale results. Default request timeout is 15s; JD 60s; semantic load 180s; Full load 240s and selection 90s. Worker termination is the primary immediate cancellation/unload boundary; actual GPU memory reclamation timing is browser-controlled.

Full requires secure context, Worker/WASM, usable WebGPU adapter, shader-f16 and Cache API. Save-Data, coarse pointer, explicitly low device memory or insufficient estimated storage block Full. Unknown device memory/storage is `null`, not fabricated zero. These checks reduce risk; they cannot guarantee allocation or runtime/compiler compatibility. Reduced motion does not disable useful inference.

## Observatory

`/architecture/#observatory` and version-1 `atlas:runtime` notifications expose selected versus loaded model(s), actual worker states, tier/path/fallback reason, retrieved evidence IDs, cumulative successful inference count, last worker/operation durations, measured cache entry counts, corpus/content hashes, theme/persona/motion and on-demand capability results.

No queries, pasted JD, raw model output or adapter identity are included. `lastWorkerMs` measures the worker's inference section (zero is possible for pure lexical work), not download latency or total CPU usage. `lastOperationMs` covers the last completed local operation. Storage estimate is origin-wide; vendor VRAM numbers are estimates, not device measurements. These are diagnostic snapshots, not performance promises or benchmarking claims.

## Validation evidence and limits

[TESTING.md](../TESTING.md) records the historical baseline once and maps the suites. QA owns current [quality](quality-report.md) and [performance](performance.md) results, environment, timings, bundle sizes and artifacts. This documentation phase ran no inference, tests or measurements.

- Real CPU q8 inference produced 37 normalized 384-D evidence vectors. Real browser MiniLM query/JD inference used genuine model/tokenizer/WASM, with asset transport redirected to exact pinned build-cache files—not fake extraction or vectors.
- The recorded Full probe had WebGPU API presence but **adapter false / shader-f16 false**. No genuine Qwen inference or successful weight download is established; the hardware case is a skip, not a pass.
- Full-only mocks exercise failures, hallucinated IDs/prose, confirmation, cancellation and retry. They do not prove real GPU allocation, compiler/grammar compatibility, generation or device-loss recovery.
- Real Pocket, privacy canaries, corrupt corpus, worker/storage failure, stalled semantic load, oversized JD, no-JS and stale-result behavior have dedicated tests. Browser/axe coverage is not universal accessibility or hardware certification.

The suite persists real-WASM runtime and real-Qwen capability JSON under ignored `test-results/`, including blocked probes. A separately authorized `ATLAS_REAL_FULL=1` test bounds loading to 85s and selection to 20s; ordinary CI does not repeatedly download Qwen. It is an optional test switch, not an application environment requirement.

### Publication and payload interpretation

Exact model weights/tokenizer/runtime pins are in [the model ADR](model-adr.md). MiniLM's roughly 23 MB weights plus roughly 14 MB WASM are not its entire payload. Full adds tokenizer/compiler/runtime to its weight bytes. Optional SDK/ORT assets, including an emitted asyncify dependency, may exist in `dist/` without being downloaded initially or precached. Use QA's measured inventory for current bundle sizes; transfer compression and caching vary.

The public audit checks canonical artifact/résumé parity, model-index integrity, stripped image metadata and exact ORT bytes against the locked dependency. It scans JS strings/templates/identifiers rather than its own denylist regex/arithmetic. Only exact `/home/web_user` in known SDK bundles is exempted as an Emscripten virtual home; this is not a blanket private-path exemption or a full dependency audit. Engineering docs/private Memory are not public corpus inputs.

Remaining evidence: real Full hardware behavior; physical/manual/additional-browser and constrained-device testing; calibrated retrieval relevance and performance; learned/Full offline reload; external artifact/signing/SDK review; hosted workflow and production deployment. Static PWA and workflow definitions are implemented, not pending features. The AI manifest's stale `serviceWorker: false` flag is not their capability authority; see [offline policy](offline.md).