# ADR-013 · One pinned embedder for CI and browser; Build Brain writes versioned indexes; no paid AI anywhere

**Status:** accepted · 2026-11-01 · Scene 7

## Decision
`src/ai/config.ts` pins `Xenova/all-MiniLM-L6-v2` at revision `751bff37182d3f1213fa05d7196b954e230abad9`, dtype q8,
384 dimensions, and lists the WebLLM 0.2.87 prebuilt Qwen2.5 models (0.5B default, 1.5B optional, q4f32 twins). The
Build Brain (`scripts/build-knowledge.ts`) validates content, chunks it, embeds with that exact model in Node
(onnxruntime-node) and writes `public/generated/{knowledge,answer,skill-graph,semantic}-index.json` + `ai-manifest.json`
versioned `pkg.version+sha256(chunks)[:12]`. The Pocket worker refuses a semantic index whose `model` is not
`id@revision`. The ORT WASM runtime is copied to `/models/ort/` and the `onnxruntime-web/webgpu` alias points at the
wasm-only build (inherited, keeps 26 MB out of the bundle). GitHub Actions caches `.cache/models`.

## Why
- Embedding at build time with the same model the browser uses means query vectors and index vectors agree.
- A content hash in the version makes stale caches impossible to mistake for current ones.
- Pages cannot run a server; everything the Operator knows must be static files.

## Rejected
- Embedding in the browser on first visit: 124 chunks × MiniLM is cheap, but it delays the first answer and duplicates CI work.
- A larger embedder (bge/gte-small, 34 MB): marginal on this corpus (inherited ADR-010 from TRACE).
- Any hosted API: forbidden by the brief (no paid APIs, no servers).
