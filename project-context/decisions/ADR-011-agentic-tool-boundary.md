# ADR-011 — Validated tools, confirmed model actions

Status: accepted, locally implemented · 2026-10-31.

## Context

Natural-language navigation should not give generated output arbitrary JavaScript or DOM access.

## Decision

Use eleven strict allowlisted tools in `src/ai/tools/index.ts`, revalidate in `executor.ts`, and translate to known routes/state requests. Explicit deterministic user commands can execute directly; model suggestions require a separate confirmation button. Full output permits at most two tools and rejects actions without selected evidence.

## Alternatives

Model-generated selectors/URLs/HTML/code; prompt-only restrictions; direct automatic execution of all suggestions; an unrestricted autonomous agent loop.

## Rationale

Canonical IDs and explicit user intent bound useful actions. State events remain an integration interface, not the model safety boundary by themselves.

## Consequences

Navigation, filters, persona, comparison, evidence and résumé work without an LLM. No filesystem, cloud API, shell or network mutation tool exists. Unsupported/inapplicable requests fail closed.

## Risks

Allowed navigation can still be irrelevant; schemas do not prove semantic relevance. Future tools require renewed scope/confirmation/privacy review.

## Validation

Tool/selection unit tests and mocked Full suggestion tests exercise safety. They do not prove genuine Full generation. [UI contracts](../../docs/ui-contracts.md) · [TESTING](../../TESTING.md).