# ADR-010 — Model selection

**Status:** accepted · 2026-11-01 · sizes measured from Hugging Face file listings on 2026-10-31

## Pocket Brain embedder
`Xenova/all-MiniLM-L6-v2` @ `751bff37…`, dtype q8 (`onnx/model_quantized.onnx`, 23.0 MB), 384 dims,
Apache-2.0. Same model/revision/dtype in CI (Node, onnxruntime-node) and in the browser
(Transformers.js 4.3.2 on onnxruntime-web 1.31 WASM, 1 thread — GitHub Pages cannot send COOP/COEP).
Alternatives: bge-small-en-v1.5 / gte-small (34 MB, marginal gains on this tiny corpus), e5-small
(needs query/passage prefixes).

## Full Brain (WebLLM 0.2.87 prebuilt models)
| Model | Download | VRAM est. | Licence | Role |
|---|---|---|---|---|
| Qwen2.5-1.5B-Instruct-q4f16_1-MLC | 880 MB | ~1.6 GB | Apache-2.0 | default on desktops |
| Qwen2.5-0.5B-Instruct-q4f16_1-MLC | 290 MB | ~0.9 GB | Apache-2.0 | compact option / <8 GB RAM |
| …-q4f32_1 variants | same | +15–20 % | Apache-2.0 | automatic when `shader-f16` is absent |
Rejected: Llama-3.2-1B (705 MB, Llama licence obligations), gemma-3-1b (602 MB, Gemma terms),
Qwen3-0.6B/1.7B (thinking-mode output complicates strict grounding), SmolLM2-1.7B (966 MB, weaker
instruction following), Phi-3.5-mini (>2 GB).

## Rules
Opt-in only with the download size shown first; never auto-offered on touch-only devices; progress and
cancel; cached by the browser; removable from the observatory; failure falls back to Pocket.
