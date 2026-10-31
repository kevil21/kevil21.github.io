# ADR-001 — Static-first portfolio

Status: accepted, locally implemented · 2026-10-31.

## Context

Reading projects, résumé and evidence must not depend on JavaScript, a model or a GPU.

## Decision

Render complete Astro HTML routes first. Enhance native documents with focused TypeScript; retain real links, all perspectives and a static search catalog.

## Alternatives

Client-rendered SPA; mandatory chatbot/boot screen; server-rendered application with runtime services.

## Rationale

The primary workload is source-led reading. Static delivery removes unnecessary runtime availability dependencies and permits meaningful no-JS fallbacks.

## Consequences

No hydrated framework/custom client router. Each navigation has a document lifecycle. Native no-JS search is a GET to a browsable catalog, not server search.

## Risks

Repeated inline public corpus adds HTML bytes; generated routes/anchors must remain consistent. Static hosting cannot interpret arbitrary queries.

## Validation

`src/pages/`, `Layout.astro` and no-JS browser tests establish the implementation. See [TESTING](../../TESTING.md) for recorded results and broader browser/accessibility limits; not a deployment certificate.