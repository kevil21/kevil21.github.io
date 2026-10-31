# Migration report — Kevil.OS v3.2.1 → TRACE v4.0.0

## Scope
Everything public from the previous site (`legacy/site-v1/`, identical to the live `main` branch) was
re-modelled as structured content with sources, then rendered through a new concept. Nothing was
carried over as code: the old site had one 3,250-line script, inline-styled sub-pages, a fake GitHub
heatmap and hard-coded counters (see `Memory/KPOS` lessons, inherited in ADR notes).

## Migrated (source → destination)
| Source | Destination | Count |
|---|---|---|
| `site/index.html` hero/about/contact, `Kevil_Resume_2026.md` header | `content/profile/kevil.json` | 1 profile, 6 links, 3 about claims, 4 languages |
| `#xp` timeline + résumé bullets + docx | `content/experience/*.md` | 3 roles (Kyndryl, Charly Computers, GDSC VIT) |
| `#a360`, `#p2p`, archive cards, `CASES` | `content/projects/*.md` | 9 projects, 23 outcomes with sources, 2 architecture diagrams |
| A360/P2P callouts | `content/decisions/*.md` | 8 engineering decisions |
| `SKILL_CATS`, used-in map, résumé skills | `content/skills/skills.json`, `content/technologies/technologies.json` | 23 skills (years kept as self-reported), 46 technologies |
| `#certs`, résumé table (+ `Resume/info.md` issue months) | `content/certifications/certifications.json` | 10 certifications |
| Education section + docx months | `content/education/education.json` | 3 entries |
| Repo/profile links | `content/evidence/evidence.json` | 12 evidence links |
| — (new) | `content/journeys/journeys.json` | 3 persona journeys (sequences of existing nodes only) |
| `site/assets` | `assets-source/` → `public/images/derived/` | headshot, photo1–3, AWS, Founderz (40 derived files, EXIF stripped) |

## Excluded and why
Phone number (privacy) · chatbot salary/weakness/hobby answers (not evidence) · 12 internal repository
names, DB naming, Docker/worker details (employer-internal) · mock KPIs, fictional tenants and simulator
data (fiction) · "24 repos", "42 contributions", random heatmap, GitHub API feed (fake/unreliable) ·
`.docx` download (contains phone; gitignored) · Google Drive links (private) · Twitter handle
(inconsistent) · `tree.jpg`, `og.svg` (unused/outdated) · games, boot screen, hand tracking, voice,
achievements, i18n strings (features, not content).

## Conflicts found and how they were resolved
See `CONTENT-SOURCES.md` (18 recorded conflicts). Two project dates were left undated rather than
guessed. No "active/valid" badges are shown for certifications.

## Validation
`validateKnowledge` (0 problems), `npm test` (unit suite), `scripts/verify-public.ts` on `dist/`
(exclusion list + canonical URL), e2e assertions that the trace renders without JavaScript.

## What Kevil should double-check
1. Certification issue months (taken from the LinkedIn export, not from the site).
2. The title "Associate Software Development Engineer" vs "Software Development Engineer".
3. Whether the GDSC role and Charly Computers wording match how he wants them presented.
4. Whether any A360/P2P public descriptions should be trimmed further for employer confidentiality.
