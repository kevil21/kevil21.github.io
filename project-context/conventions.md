# Implemented engineering conventions

2026-10-31. Scope: `kevilpatel-next/`; private handoff: `Memory/kevilpatel-next/` outside this project. Preserve original references and require explicit authorization for Git, deployment, DNS and publication actions.

## Sources and code

- Career facts are authored only in `content/portfolio.json`, eagerly validated by `src/lib/content.ts` and shared Zod schemas. Keep IDs stable and reciprocal references complete. Preserve source caveats and known date precision; do not infer years, proficiency, credential validity or personal design rationale.
- Astro pages/layouts/components own static HTML. Focused browser modules own enhancements; no hydration framework or custom SPA router. Use real anchors for destinations and buttons for state changes.
- Keep Node crypto/build-only `knowledge.ts` and `presentation.ts` out of browser imports. Use type-only imports where appropriate. DOM and worker entry points have separate TypeScript programs.
- `src/ai/runtime.ts` is lifecycle/orchestration, `retrieval.ts` is shared pure retrieval/JD logic, `workers/` owns inference execution and `tools/` owns validated actions. Do not merge them into a monolithic script or add empty directory stubs.
- Model SDKs load only on their optional paths. The default Pocket worker is lexical. Full produces validated selections, not displayed factual prose. Preserve independent fallbacks, page-local consent, cancellation and stale-result protection.
- `atlas:command` interception is synchronous and cancelable; state-only `atlas:request` rejects extra keys. Consult [exact UI contracts](../docs/ui-contracts.md), not remembered event shapes. Scope persona ARIA changes to `button[data-persona]`, since the root also carries persona state.

## UI and privacy

- Literal colors live in `themes.css`; shared type/spacing/focus/motion variables in `tokens.css`. Native motion applies after DOM state changes and can be canceled. Reduced motion never disables AI.
- Wrap long content; use `minmax(0, 1fr)` and `min-width: 0`, not global overflow clipping. Preserve readable stacked mobile content, visible focus, target sizes and explicit inspector return navigation.
- Render user/model/source strings as text or safely serialized JSON, never arbitrary HTML. Model actions require validation and confirmation; no raw selector, URL or executable argument.
- Enhanced query/JD text stays ephemeral. No analytics or query persistence. Native GET search has a URL/host privacy exception. Theme/persona and bounded public-route history are separate, documented storage uses.
- Static caches use `atlas-static-`; model caches are separate. Do not broaden SW precaching to all `_astro` output or clear unrelated caches.
- Never copy root docs, `docs/`, `project-context/`, private Memory, raw references or prompts to `public/`, corpus inputs or `dist/`. Website exclusion is not confidentiality if the source repository is public; review source disclosure separately.

## Build, validation and records

Use exact locked dependencies and `npm ci`; current engines are Node 24.9+ within 24 and npm 11. No `.env` or runtime credential is required. Model/test environment switches are optional, not secrets. Do not force dependency upgrades to make an advisory disappear.

Generated knowledge/résumé, image metadata and SW manifests are outputs, not alternate authoring files. Build and audit the complete artifact in normal development. Preserve test-owned preview isolation and existing processes. [TESTING.md](../TESTING.md) defines commands and QA-report ownership.

Use ISO dates and distinguish observed source, implemented behavior, historical result and fresh validation. New measurements belong in QA's reports, not copied across summaries. Record limitations even when local implementation is delivered. Documentation edits do not authorize test execution or source changes in a documentation-only phase.