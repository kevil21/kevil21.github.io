# Migration report — KPOS to Evidence Atlas

2026-10-31. **Local migration delivered; publication review remains open.** Protected KPOS/reference files are unchanged by this documentation phase. This is a new implementation, not an in-place rewrite of the old site.

## Discovery versus current inspection

The preserved discovery session records the original order: full plan first, recursive `Memory/KPOS` second (ten root docs, release note, harness README and nine scripts), then raw KPOS résumé/index/assets. Those are historical read records, not newly executed tests. The final documentation phase reread the plan and raw résumé, checked relevant raw index/script matches, and inspected the actual new schema/content/runtime/build/SW/workflow/UI code and existing Memory. It did not repeat the entire legacy harness or claim a new protected-file checksum run.

The legacy web root is `KPOS/site/`, not `KPOS/index` or `KPOS/assets`. The new app is **`kevilpatel-next/`**; `kevilpatel/plan.md` remains a protected historical reference. All new destinations below are relative to `kevilpatel-next/`.

## Source-to-implementation map

| Source subject | Canonical destination | Reader destination / treatment |
| --- | --- | --- |
| Identity/contact/languages | `portfolio.json: profile` | Shared identity, `/experience/#profile`, `/experience/#contact`, résumé and metadata; no phone |
| Three roles | `experience` | `/experience/`; consistent Associate title; qualitative contribution scope |
| Three education records | `education` | `/experience/#education`, résumé; preserve source period/score precision |
| Named skill lists and explicit project technologies | `skills` + reciprocal `evidence` joins | `/evidence/#skills`; 47 named skills, no inferred years/proficiency |
| A360 | `projects: a360` | `/projects/a360/`; safe observability/telemetry summary, no scale claims or guessed repo |
| Policy → Pipelines | `projects: policy-to-pipelines` | `/projects/policy-to-pipelines/`; approval/evidence flow, not a claim this website executes cloud commands |
| Overlay-Insights, Incident Ticket Management, IT Asset Analytics | Respective project IDs | Three observability dossiers; preserve source repo links and qualitative pipeline descriptions |
| Climate Mitigation, OptiCrop, Smart Energy | Respective project IDs | Three intelligence dossiers; omit uplift/count claims; Smart Energy has no project-specific URL |
| Python Essentials | `projects: python-essentials` | Craft dossier and workshop/community context; not a production-system claim |
| Ten credential records | `certifications` | `/credentials/` and résumé; exact source links/IDs and verification caveats |
| Academic record and learning resource | `achievements` | `/experience/#achievements`; two source-supported entries, no invented awards |
| Reviewed source passages | `evidence` | 37 excerpts on `/evidence/` and generated corpus; public labels/sections instead of private paths |
| Audience lenses | Project `perspectives` and three `journeys` | Authored recruiter/engineer/architect emphasis; facts unchanged |
| Source-described system flows | Two canonical `decisions` records | `/architecture/#project-architectures`; no invented personal tradeoff history |
| Résumé export | Canonical renderer | `/resume/` + generated Markdown; browser print/PDF rather than copied raw document |

Every project has a static dossier. Counts and complete allowed/excluded material are centralized in [CONTENT-SOURCES.md](CONTENT-SOURCES.md), with schema enforcement in `src/lib/schema.ts`.

## Assets actually reused

One genuine supplied headshot was copied during the authorized foundation work to `assets-source/headshot.jpg`. The build does not depend on the original KPOS path. Sharp generates 160/480/960-width WebP/JPEG derivatives without cropping, face alteration or enlargement, strips metadata and records actual dimensions in `src/lib/assets.generated.json`. PNG icons and social cards are new abstract/text artwork using canonical identity and theme colors. The UI applies a mild saturation style; it does not synthesize a person.

Legacy carousel photos, alternate portrait, tree image, AWS/Founderz logos and old OG SVG were not automatically migrated. System font stacks replace external font dependencies. No model photograph, stock substitute or fabricated professional setting was added. Photo-use approval remains an owner review; this phase did not repeat image measurements or visual QA.

## Implementation deliberately not carried over

The monolithic legacy script, shader/3D spectacle, animation CDNs, boot gate, custom cursor, camera gestures, games, floating-overlay pile-up, faux terminal, old chatbot knowledge store and synthetic KPI/heatmap displays are absent from the new design. Nothing was deleted from KPOS. Native HTML/CSS/SVG/WAAPI and focused TypeScript modules replace them; real links and a stacked mobile inspector replace modal-only reading.

## Reconciled and unresolved source details

- Associate title is consistent in the new canonical file; the conflicting source experience heading remains a review item, not evidence of promotion.
- VIT 2021–2025 is preserved with **no incomplete-degree claim**.
- Conflicting scale/count and percentage claims are omitted, not harmonized by selecting the larger value.
- Generic AWS/Founderz/Excellerate destinations and source-listed credential dates do not establish validity. Exact current validity and AZ-104 renewal/day remain unknown.
- A360/P2P employer-safe disclosure and current contribution wording, public repository reachability, Smart Energy project-specific proof, and photo/contact approval remain open.

## Differences from the architectural proposal

The result uses four editorial domains (including craft), one JSON/Zod content graph rather than split content collections, DOM-first SVG rather than 3D, and compressed runtime modules rather than empty directory scaffolds. Default Pocket is lexical/concept retrieval, not learned AI; MiniLM is explicitly optional. Full is generative constrained evidence selection, not free-form explanations or deeper generative JD analysis. Reduced motion does not disable AI. Static caches are owned by the SW, model caches by their SDK/runtime path. [Architecture mapping](ARCHITECTURE.md#actual-structure-versus-the-broader-directory-proposal) explains locations and rationale.

## Acceptance boundary

Historical local validation covers canonical/derived parity, static/no-JS surfaces, real MiniLM build/browser inference and model-free offline functionality. [TESTING.md](TESTING.md) points to current QA reports; no tests, builds, benchmarks or audits were run by this docs phase. Full hardware inference, physical/manual/browser coverage and actual deployment remain unverified. Local migration does not certify source truth, employer approval or production readiness.