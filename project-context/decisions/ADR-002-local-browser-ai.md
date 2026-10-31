# ADR-002 — Optional local browser inference

Status: accepted, locally implemented · 2026-10-31.

## Context

Interactive retrieval should not require an inference backend, API secret or uploading a visitor's pasted JD.

## Decision

Run optional learned inference on the device in lazy workers. Require separate page-local consent for semantic and Full downloads; retain no-model retrieval.

## Alternatives

Hosted inference API; automatic download; no learned enhancement at all.

## Rationale

Local execution fits the small public corpus and demonstrates a clear data boundary without adding mandatory infrastructure.

## Consequences

Public model assets still cross the network. Model hosts see requests/metadata, not enhanced query/JD content. There is no required `.env`, hosted model endpoint or conversation store.

## Risks

Download size, browser support, memory, supply-chain availability and eviction remain device-dependent. Native no-JS GET search is not memory-only.

## Validation

Real MiniLM CPU/build and Chromium WASM inference were recorded; genuine Full hardware execution remains unverified. Privacy/cancellation tests have narrower scope than a full security audit. [Runtime](../../docs/ai-runtime.md) · [TESTING](../../TESTING.md).