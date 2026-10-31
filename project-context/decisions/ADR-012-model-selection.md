# ADR-012 — Pinned models and honest limits

Status: accepted pins; genuine Full execution unverified · 2026-10-31.

## Context

Optional learned retrieval and generation require reproducible model identity and realistic payload disclosure, not invented small-download or hardware claims.

## Decision

Use MiniLM q8 through Transformers.js 4.3.2 for CPU build and one-thread browser WASM embeddings; use Qwen2.5-0.5B q4f16 through WebLLM 0.2.87 for Full selection. The detailed [model ADR](../../docs/model-adr.md) records immutable model/compiler revisions, runtime APIs, licenses and exact assets; `src/ai/models.ts` is the code authority.

## Alternatives

Lexical-only (retained as default); larger/fp32 encoders; larger browser LLMs; hosted inference; synthetic embeddings. No unmeasured quality superiority is asserted.

## Rationale

Small optional models suit bounded evidence retrieval/selection; pinned matching tokenizer/dtype/pooling/revision avoids index mismatch. The pipeline's remote template is pinned as well as its revision.

## Consequences

MiniLM weights are about 23 MB plus about 14 MB WASM and other assets. Full weights alone are **277,996,288 bytes**, not 70 MB; tokenizer/compiler/runtime add more. Vendor VRAM is an estimate, not a device measurement. Consent discloses these costs.

## Risks

Licensing/artifact availability, browser compatibility, memory allocation, relevance and compiler/grammar support need ongoing review. Locked dependencies do not constitute a full supply-chain audit.

## Validation

Real MiniLM build and browser inference were validated. Full probe lacked adapter/f16; mocked lifecycle tests are not genuine model execution. Reconsider only with measured evidence. [TESTING](../../TESTING.md).