# ADR — pinned optional local models, canonical output only

Date: 2026-10-31. Status: **accepted implementation; MiniLM build/browser inference verified; Full hardware validation open.**

## Context

The portfolio has only 37 canonical public excerpts. Static reading and lexical/concept retrieval must remain useful without model download, GPU, network model service or credentials. An optional semantic encoder can retrieve paraphrases; a small generative model may select evidence, but cannot become a new source of career claims.

## Decision

| Tier | Choice and immutable revision | License / payload |
| --- | --- | --- |
| Default Pocket | Deterministic token/alias/concept worker, no model | No weight download. Canonical excerpts and allowlisted tools. |
| Optional semantic | `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`; Transformers.js **4.3.2**; q8, mean pooling, normalized **384-D** | Apache-2.0. ONNX **22,972,370 bytes** (~23 MB), tokenizer **711,661 bytes**, config files; local WASM **14,264,838 bytes** plus JS. |
| Optional Full | `mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC`, revision `32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad`; WebLLM **0.2.87** | Upstream Qwen Apache-2.0. Pinned ndarray `ParamBytes` **277,996,288** (~278 MB across 8 shards); tokenizer **7,031,645 bytes**, config/compiler/runtime additional. Not a ~70 MB model. |

Full compiler library is `Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm` in `mlc-ai/binary-mlc-llm-libs`, commit `146ed9cd4b4062e967b017fd2291f7106b50599f`, `web-llm-models/v0_2_87/base/`. The Qwen2 library name is the installed WebLLM configuration's family mapping, not a typo to rename. Context requested: **2048**. `shader-f16` is required. The vendor's **944.62 MB VRAM estimate** is not measured available or consumed device memory. Installed ONNX Runtime Web is **1.31.0-dev.20260914-8d85527a0**; preserve the lockfile and matching runtime binaries rather than mixing versions.

Model/config constants live in `src/ai/models.ts`. Both encoder paths explicitly pin the remote template as well as pipeline revision: actual testing caught Transformers task detection otherwise fetching `main/config.json`. Pinned build vectors are real CPU inference, then hash-validated browser-side. Browser inference uses one WASM thread and explicit matching local `.mjs`/`.wasm` paths.

### Implemented API path

- Build: Transformers `pipeline('feature-extraction', SEMANTIC.id, { revision, dtype: 'q8', device: 'cpu', session_options })`; invoke the extractor on evidence title + text with `{ pooling: 'mean', normalize: true }`, check dimension 384, round vector values for serialization, then `dispose()`.
- Browser: dynamically import Transformers only inside the Pocket worker's consent-triggered `semantic` request. Configure `env.remotePathTemplate`, `env.cacheKey` and `env.backends.onnx.wasm` (`numThreads: 1`, `proxy: false`, explicit matching runtime URLs); create the same feature-extraction pipeline with `device: 'wasm'` and infer only local query/JD text.
- Full: instantiate `MLCEngine` in the separately loaded Full worker with the pinned model/library and `required_features: ['shader-f16']`; `engine.reload()` loads after main-thread consent/capability checks. Each selection calls `resetChat()` then `engine.chat.completions.create()` with streamed JSON schema output, `max_tokens: 256`, temperature/seed zero. Unvalidated text is never rendered; only chunk counts are reported until `parseSelection()` passes.
- Full's stream is bounded to 8,000 characters. The worker and main thread both validate retrieved canonical IDs and optional tools. The prompt is not the sole trust boundary. Worker termination is immediate application cancellation; browser GPU reclamation timing is not guaranteed.

These are inspected implementation calls, **not evidence of a successful Full GPU run**. The site-level decision index is [ADR-012](../project-context/decisions/ADR-012-model-selection.md).

Full is consent/capability-gated and receives only Pocket's candidate excerpts plus the bounded query. It must return strict JSON evidence IDs and optional validated tool suggestions. Displayed factual prose is always the original excerpt. No generic chat answer is rendered; generated actions require confirmation. Invalid or ungrounded output falls back to Pocket.

## Alternatives and tradeoffs

- **Lexical only:** kept as the default and independent fallback; smallest cost, deterministic behavior, limited paraphrase recall. Semantic benefit is not assumed or claimed statistically.
- **Synthetic/random vectors labeled semantic:** rejected. They would not constitute learned retrieval or matching build/runtime inference.
- **Larger encoders or fp32 MiniLM:** may improve particular tasks, but increase payload/memory. Not benchmarked here; no superiority claim. q8 fits this optional small-corpus enhancement.
- **Larger browser LLM:** increased weight, allocation and device-compatibility risk without evidence it improves this bounded selection task. Not selected.
- **Server-hosted inference:** unnecessary backend/credentials and different privacy boundary; rejected for this scoped local implementation.
- **Automatic downloads / silent semantic fallback to a different model:** rejected. Explicit size/origin consent and fixed identity are required; unavailable means unavailable.
- **Trusting free-form generation with citations appended afterward:** rejected. Known-ID schemas and exact excerpt rendering are the boundary, not prompt wording alone.

## Consequences

Cold builds require the pinned encoder download and CPU inference; the implemented workflow definitions cache `.cache/atlas-models/` with model/lock/generator-specific keys. Browser model caches store fixed public assets, not query/JD. Semantic download + runtime exceeds the weight-only size; Full's total exceeds its 277,996,288-byte weights once other assets are included. Runtime and quantization versions are deliberately locked, with future upgrades requiring rebuild and genuine browser retesting.

Semantic similarity may add **Related** evidence, never Strong Evidence, years, proficiency or a fit score. The 0.45 cosine cutoff is a heuristic pending broader evaluation. Exact-source rendering prevents fabricated sentences but does not guarantee that selected evidence answers every question.

Cancel/unload release workers; caches persist until scoped clear or browser eviction. HTTP cache/GPU allocation/secure memory erasure are not controlled or promised. Static PWA caching is implemented separately and excludes model SDK/weights/WASM precaching; optional learned/Full offline reload remains unverified. SDK licenses/notices and pinned artifact availability should be reviewed for publication; this ADR is not a legal opinion or independent supply-chain audit.

## Validation and reconsideration

Real Node MiniLM embeddings and real Chromium WASM query/JD inference have recorded passes. The persisted Full probe reports **no WebGPU adapter, shader-f16 unavailable**; no successful genuine Qwen inference is claimed. Mocked Full lifecycle/invalid-output tests establish fallback and grounding behavior, not model execution. [TESTING.md](../TESTING.md) records the historical baseline once and delegates current counts/performance to QA's reports. This documentation phase did not rerun inference or remeasure assets.

Reconsider only with measured retrieval benefit, constrained-device performance, supported-browser evidence, verified licensing/artifacts or an explicit requirement change. Before calling Full production-ready, run the one-shot manual integration test on capable hardware and record allocation, compiler/grammar compatibility, canonical selection, cancellation and cache behavior.