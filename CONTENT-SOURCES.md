# Content sources and allowlist

**Single source of truth:** the `KPOS` clone of this repository at v3.2.1 (`dc7a3cd`), i.e. the previous
site: `site/index.html`, `site/app.js` (`SKILL_CATS`, `CASES`, used-in map, chatbot facts),
`site/Kevil_Resume_2026.md`, `Kevil_Resume_12.docx`, `site/assets/`. Every entry in `content/` carries a
`source` such as `KPOS/site/index.html#L481-L505`.

**Recorded deviation:** certification *issue months* come from `Resume/info.md` (Kevil's LinkedIn
certification export) because the KPOS material records expiry months only. Each is tagged
`issuedSource: Resume/info.md` and is verifiable through the published credential IDs.

**Not used:** `Resume/Projects/a360.md` and `p2p.md` (internal Kyndryl reference documents), the
`Memory/` folders, prompt files.

## Published (allowlist)
Identity, title, headline, taglines, locations (Surat · Bangalore), email, six profile links, about text,
3 experience entries, 9 projects (2 flagship, 3 open-source, 2 academic, 1 pilot, 1 learning), 23 skills
with self-reported years, 46 technologies, 10 certifications with credential IDs and verify links,
3 education entries, 8 engineering decisions published on the old site, spoken languages, photos 1–3,
headshot, AWS and Founderz logos.

## Excluded
Phone number · salary/weakness/hobby chatbot answers · 12 internal `kyndryl-agentic-ai` repository
names and internal naming patterns · mock KPI values and fictional tenants · hard-coded/fake GitHub
counts and heatmap · `.docx` download · Google Drive proof links · Twitter handle · `tree.jpg`, `og.svg`.

## Conflict resolutions
| Conflict | Resolution |
|---|---|
| Title: Associate SDE / Associate Software Development Engineer / Software Development Engineer | "Associate Software Development Engineer" (JSON-LD + résumé header) |
| "agentic AI on Cloud" vs "on Azure" | "on cloud" (visible HTML; work spans Azure, AWS, GCP) |
| GDSC role wording | "Technical Core Member" (2 of 3 sources) |
| Charly migration "to the cloud" vs "to AWS" | "to AWS" (résumé; site chips name AWS) |
| "Fortune-500" vs "enterprise" vs "multiple" clients | "enterprise clients" (2 sources) |
| OptiCrop 2024 vs 06/2023 · Climate tool 2023 vs 04/2025 | left undated, shown as "within B.Tech" with a note |
| Climate model LSTM vs RNN | "LSTM (recurrent)" |
| GH-300 expiry 12/2027 vs 10/2027 | Dec 2027 (site + LinkedIn export) |
| AZ-104 expires Oct 2026 | shown as dates; no "active" badges anywhere |
| Photo alt texts mismatched the photos | rewritten from the actual images |
| Metrics (+40 %, +15 %, 500+ …) | published verbatim, tagged `selfReported`, shown "as stated in résumé" |
