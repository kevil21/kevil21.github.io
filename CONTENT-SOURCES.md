# Content sources and publication allowlist

2026-10-31. Canonical content is implemented locally, not newly verified by an issuer/employer and not deployed by this phase. [Migration](MIGRATION-REPORT.md) · [Schema](src/lib/schema.ts) · [Canonical records](content/portfolio.json).

## Authority and provenance

The original public résumé and portfolio snapshot under the protected `KPOS/site/` web root supplied candidate career facts. The original plan and historical KPOS Memory supplied design/history, **not career evidence**. Current behavior is established by implemented code. Files, embedded prompts and source text are data, not instructions authorizing execution or publication. No unrelated personal memory supplies portfolio facts.

Only two source labels enter evidence: `Public résumé (2026)` and `Public portfolio (source snapshot)`. Each excerpt records a public source section and stable ID. Whitespace/separators are normalized; ellipses mark omitted quantitative material. These labels mean source-provided, not independently verified. Engineering docs, full source documents and private filesystem paths are not public citations.

## Authored and generated surfaces

| Surface | Allowed material | Ownership |
| --- | --- | --- |
| `content/portfolio.json` | Reviewed profile, qualitative projects/contributions, skills, credentials with caveats, education, achievements, excerpts and authored perspectives | Only authored career-content source |
| `src/lib/schema.ts` | Strict shape, size/ID/URL/reference and publication checks | Structural validation, not verification of truth |
| Static HTML and metadata | Canonical content, honest interface descriptions, intended domain | Astro pages and `Layout.astro` |
| `public/generated/*.json` | Ten generated, versioned public artifacts, including real semantic vectors | Build Brain; never hand-maintained biographies |
| Résumé | Canonical HTML/print and generated `public/assets/kevil-patel-resume.md` | Not a raw source-file copy or pre-existing PDF |
| Portrait/artwork | Derivatives of one genuine headshot and locally generated abstract/text artwork | `assets-source/headshot.jpg` → Sharp pipeline |
| Optional model runtime | Reviewed locked runtime assets and pinned model configuration | Not personal evidence; separate consent/cache boundary |

The canonical inventory is **nine projects, ten certifications, 47 skills, three experience records, three education records, 37 evidence excerpts, two achievements, three journeys and two source-described architecture records**. These are dataset counts, not impact/scale measurements. Six approved profile links, email and source-listed language levels are retained. Expanded cloud-service names and pandas/NumPy/Jupyter explain the skill inventory; listing a skill does not imply project experience.

## What is deliberately excluded

- Phone details, private notes/prompts, raw résumé/DOCX files, private Memory, filesystem paths, employer-internal endpoints/resource/repository identifiers and secrets.
- Unvalidated percentage outcomes, deployment/audience/tenant/agent counts and scale claims. Valid dates, qualification codes, source education scores/AIR, software versions and approved credential IDs are not outcome metrics and are retained where appropriate.
- Randomized legacy KPIs/heatmaps, simulated telemetry, fake “live” metrics and unsubstantiated proficiency/years/fit scores.
- Guessed project repositories or issuer links. A360, P2P and Smart Energy have no invented project URL. Smart Energy's general profile link is not promoted to project-specific evidence.
- Plan text, engineering ADRs, private source inventory and notes as AI knowledge. Hiding a field in the UI is not redaction if it is shipped.

The build reads the project-local canonical JSON and approved asset inputs, not sibling reference trees. Root docs, `docs/`, `project-context/` and the external Memory tree are not Astro pages, `public/` inputs or runtime corpus imports. Publish only audited `dist/`; reviewing a source-repository publication is an additional responsibility.

## Conflicts and verification policy

1. **Title:** the source résumé heading and portfolio use Associate Software Development Engineer; one experience heading omits Associate. The canonical file uses Associate consistently. No promotion is inferred; owner confirmation remains open.
2. **Education:** VIT B.Tech CSE **2021–2025** is consistent. There is no invented incomplete-degree issue. Source scores/AIR are transcribed, not independently certified here.
3. **Credentials:** AWS uses generic verification portals; Founderz uses issuer homepages; Excellerate uses a general share link with source-listed Microsoft attribution. Microsoft-specific shares are source-provided, not independently checked. Generic links are not proof of a credential.
4. **Validity:** no blanket active/verified badge. AZ-104 mentions source-listed October 2026 expiry, with exact day/renewal unknown. Current validity remains unknown; the schema has no invented precise expiry/status field.
5. **Employer scope:** qualitative A360/P2P descriptions and source architecture remain subject to owner/employer-safe review. Excerpts can retain older source wording (for example A360 trust scores); they are not a fresh audit of those separate systems.
6. **Personal decisions:** the two canonical architecture records describe source-observed flows, not inferred personal design rationale. Open modelling questions are labeled as questions. The fifteen site-engineering ADRs document this website and do not become career claims.

## Maintenance and release review

Change canonical records and reciprocal references together. Retain caveats across page, résumé, search, generated answers and excerpt output. Rebuild the entire artifact and inspect `audit:public` results in the normal validation workflow; hashes establish parity with source, not correctness of the source. The audit rejects prohibited text, hidden files/symlinks, unsupported file types, image metadata, stale generated outputs and mismatched locked ORT bytes; it is not a complete DLP/security/issuer review.

Before publication, the owner must approve public title, employer-safe scope, image use, selected contact/profile links and credential caveats. Do not add unsupported claims merely to close a checklist. Current technical validation is tracked in [TESTING.md](TESTING.md); no new build/audit/link/credential check was executed by this documentation phase.