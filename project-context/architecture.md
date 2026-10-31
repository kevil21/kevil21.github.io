# Engineering context and decision register

2026-10-31. The implemented system is described in [ARCHITECTURE.md](../ARCHITECTURE.md); this is its engineering-context index, not another content source. These Markdown files are not imported into public pages, generated knowledge or model context. Private project Memory stays outside the standalone app; a public source-repository disclosure requires separate review.

Read [content policy](../CONTENT-SOURCES.md), [migration](../MIGRATION-REPORT.md), [UI contracts](../docs/ui-contracts.md), [runtime](../docs/ai-runtime.md), [model detail](../docs/model-adr.md), [offline](../docs/offline.md), [testing](../TESTING.md) and [deployment](../DEPLOYMENT.md) before extending the system. Current measurements belong to QA, not these ADRs.

## Decision register

All records describe accepted local implementation choices. Their Validation sections distinguish code/recorded tests from remaining evidence; acceptance is not production certification.

| ADR | Decision |
| --- | --- |
| [001](decisions/ADR-001-static-first.md) | Complete static-first portfolio |
| [002](decisions/ADR-002-local-browser-ai.md) | Optional local browser inference |
| [003](decisions/ADR-003-pocket-vs-full.md) | Independent Pocket and constrained Full |
| [004](decisions/ADR-004-build-time-intelligence.md) | Build-time public knowledge generation |
| [005](decisions/ADR-005-evidence-grounding.md) | Canonical evidence as factual output |
| [006](decisions/ADR-006-canonical-json-zod.md) | One JSON/Zod graph rather than duplicate content collections |
| [007](decisions/ADR-007-themes.md) | Semantic System/Light/Dark themes |
| [008](decisions/ADR-008-motion.md) | Native, cancellable, DOM-first motion |
| [009](decisions/ADR-009-svg-not-3d.md) | Purposeful SVG topology, no 3D engine |
| [010](decisions/ADR-010-mobile-capabilities.md) | Complete mobile content, conservative Full eligibility |
| [011](decisions/ADR-011-agentic-tool-boundary.md) | Strict tools and confirmed model actions |
| [012](decisions/ADR-012-model-selection.md) | Pinned models and honest payload/validation limits |
| [013](decisions/ADR-013-cache-offline.md) | Separate static and model cache lifecycles |
| [014](decisions/ADR-014-github-pages.md) | Root-hosted, dist-only GitHub Pages delivery |
| [015](decisions/ADR-015-reduced-motion.md) | Reduced motion changes animation, not AI access |

## Maintenance

Use [conventions](conventions.md) for boundaries, [roadmap](roadmap.md) for separately scoped next work and [known issues](known-issues.md) for open verification/review items. The broader proposal-to-real-file mapping is in [architecture](../ARCHITECTURE.md#actual-structure-versus-the-broader-directory-proposal). Do not create empty packages or duplicate canonical content to resemble a plan diagram.