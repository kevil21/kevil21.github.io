# Content sources

**Single source of facts:** the previous site, `../KPOS/` (clone of `kevil21/kevilpatel`, branch `dev` @ `dc7a3cd`,
v3.2.1, identical to what `main` serves): `site/index.html`, `site/app.js` data blocks, `site/Kevil_Resume_2026.md`,
`site/stack.html`, `site/assets/`. **Only exception:** certification *issue months* from `../info.md`, always labelled
"[source: info.md]". Nothing else is a fact source — not `../Projects/*.md` (internal Kyndryl documents), not earlier
rebuilds, not model output.

## How a fact travels
1. `Memory/SIMULATION-ROOM/fact-ledger.md` records every publishable statement with `file#line`, a ledger id (`F-…`),
   and a status (PUBLIC / LABEL "as stated in résumé" / EXCLUDED / CONFLICT with resolution).
2. `src/content/*.json` carries each claim as `{ text, source, ledger, label }`; `src/lib/schema.ts` rejects a claim
   without a `KPOS/…#L…` or `info.md#L…` source; `scripts/validate-content.ts` checks cross-references and the fixed
   counts (10 certifications, 9 projects, 6 machines, 3 roles, 3 schools).
3. `Claim.astro` renders the text, its label caption and a link to
   `https://github.com/kevil21/kevilpatel/blob/main/<path>#L<n>` (the public file and line). Maintenance hatches,
   the engineer lens and the Operator's citations show the same pointers.
4. The Build Brain chunks the same collections, so the Operator can only cite what the pages show.

## Labels
- `public` — stated on the previous site; shown with its source link.
- `resume` — a number or wording from the résumé; shown with "as stated in résumé".
- `site-case-study` — a number that only appeared in the previous site's case-study modal, labelled so.
- `info-md` — certification issue month from info.md.
- `sample` — a simulation parameter, never a fact.

## Excluded (never published)
Phone number · Twitter handle · `kevil21.github.io` canonical · `.docx` and Drive links · internal Kyndryl repository
names and the org · infrastructure naming (`acct-{tenant}`, `a360-platform`, `a360-metadata-tenant`,
`authorized_users`, `a360.kyndryl.io`) · mock dashboard numbers and fictional tenants (`contoso`, `acme-*`) · the
old `og.svg` and `tree.jpg` · chatbot answers on salary, weaknesses, hobbies, strengths · "millions of agent traces"
(unquantified) · self-assessed skill years · "10 active certifications" · AWS Academy (not in KPOS).

## Conflicts resolved (full table in the fact ledger §J; Kevil chose C-01/C-02 in the interview)
Title → Associate Software Development Engineer · headline → "building agentic AI on cloud" · GDSC → Technical Core
Member, "3+ technical initiatives" · Charly migration → AWS · clients → "enterprise clients" (résumé page keeps its own
bullet) · tenants → 4 live (as stated) · UI counts → 11 KPI tiles, 10 Kibana pages · P2P → cloud guardrails on GCP
today · project years → from the previous site's tags only, labelled · issuers → GH-300 and Excellerate are Microsoft ·
institution names → Vellore Institute of Technology; L.P. Savani International School · location → Surat, Gujarat ·
Bangalore, India · dates → "Jul 2025 – present".
