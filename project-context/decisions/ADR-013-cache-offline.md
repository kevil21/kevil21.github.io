# ADR-013 — Separate static and model caches

Status: accepted, locally implemented · 2026-10-31.

## Context

Offline reading must avoid silent model downloads, query persistence, mixed-version HTML and unbounded caching.

## Decision

Generate a finite, hash-checked SW snapshot of public HTML, initial assets, knowledge and model-free Pocket. Install atomically; use explicit waiting-update/all-tab refresh and version acknowledgments. Keep `atlas-static-` caches separate from semantic/WebLLM caches and provide separate clear controls.

## Alternatives

Precache all bundles/models; unrestricted runtime caching; immediate skipWaiting on every update; one destructive origin-wide clear.

## Rationale

Finite allowlists and hash/version checks make offline delivery auditable and preserve an old complete build during failed updates.

## Consequences

Known unavailable routes return 503 recovery; unknown routes remain 404. Static history is at most eight known public paths, not queries/JD. Budget limits fail builds. No learned/Full offline certification follows from SDK caches.

## Risks

Eviction, quota/private mode, frozen tabs and first-ever offline visits remain limits. Hashes cannot defend against an attacker controlling the publishing origin.

## Validation

`src/pwa/`, SW generator/audit and real two-version/offline tests establish the static path. The AI manifest's stale SW flag is documented separately. [Offline contract](../../docs/offline.md) · [TESTING](../../TESTING.md).