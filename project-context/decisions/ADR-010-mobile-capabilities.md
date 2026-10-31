# ADR-010 — Complete mobile content, conservative compute

Status: accepted, locally implemented · 2026-10-31.

## Context

Screen size alone cannot establish GPU, memory, storage or data-plan suitability. Mobile must not become a reduced-content site.

## Decision

Stack the same content on narrow widths. Gate Full through secure context, Worker/WASM/cache, adapter/f16 and resource signals. Save-Data/coarse pointer, known memory below 4 GB or available storage below 360,000,000 bytes block Full. Unknown measurements remain null, not fabricated zero.

## Alternatives

Desktop user-agent detection; width-only model choice; mandatory mobile LLM; disabling all intelligence on mobile.

## Rationale

Conservative explicit checks limit avoidable downloads while preserving static/Pocket functionality and transparent reasons.

## Consequences

Full may be blocked on touch-capable desktops too. Semantic opt-in is separate. Layout breakpoints do not authorize inference; a passing eligibility check does not guarantee allocation.

## Risks

APIs may be absent or estimates inaccurate; coarse-pointer policy trades availability for caution. Physical device behavior is not proved by emulation.

## Validation

`capabilities.ts`, consent handling and capability-negative tests cover guards. Genuine Full and physical mobile remain unverified; see [TESTING](../../TESTING.md).