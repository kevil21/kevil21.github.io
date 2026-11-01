# Migration report — Kevil.OS v3.2.1 → The Simulation Room (generation 5)

**Nothing was carried over as code.** The previous site was one 3,257-line script, one 72 KB stylesheet and four HTML
pages with no build step. Every fact was re-extracted into a ledger and rebuilt as typed content; every visual was
redesigned around the laboratory concept. Earlier intermediate rebuilds (Evidence Atlas on `altas_dev`, TRACE on
`trace_dev`) were read for engineering lessons only (see `project-context/decisions/` and the memory folder).

## Carried over (as facts, re-sourced)
- Profile: name, title (resolved), employer, headline (resolved), location (resolved), email, six public profiles,
  the lead paragraph, spoken languages, the quote.
- Experience: Kyndryl (4 bullets), Charly Computers (2), GDSC VIT (1) — numbers verbatim and labelled.
- Projects: A360, Policy → Pipelines, Climate Mitigation Tool, Smart Energy Forecasting, OptiCrop, Overlay-Insights,
  Incident Ticket Management, IT Asset Analytics, Python Essentials — summaries, problems, approaches, outcomes, stacks,
  repository links; years only where the old site tagged them.
- Decisions (16) distilled from the old site's callouts and chatbot answers (sync overlaps, SHA-256 ids, JWKS,
  dogfooding, boarding; guardrails first, auto-approve threshold, routers, providers, evidence packs; encoders, rolling
  CV, shared embeddings, hybrid model; signatures, deterministic doc ids).
- Skills (32) in the résumé's five groups, with the old `SKILL_USED_IN` map as the ceiling cables.
- Ten certifications with credential IDs and verify links; issue months from info.md.
- Education (3) and GDSC community work.
- Images: headshot, portrait, three photos (EXIF/GPS stripped), AWS and Founderz logos.

## Dropped
Boot screen, terminal, command palette, games (Snake, chess, Doom), achievements, hand tracking, voice commands,
EN/FR/HI/GU hero, live GitHub API + random heatmap, mock A360 dashboard and P2P storylines, the phone number, the
`.docx` link, the Twitter card, `tree.jpg`, the old OG card, chatbot answers on salary/weakness/hobbies/strengths,
internal repository and infrastructure names, self-assessed skill years.

## New
The hall (WebGPU/WebGL 2, procedural kit, six simulations), control panels with decisions as switches, case-study
pages with architecture diagrams and decision logs, the Operator (Build Brain, Pocket and opt-in Full tiers, Zod tools,
trust gauges, JD matcher, lens), the tour, machine-room sound (off by default), eight easter eggs and the lab notebook,
offline page and service worker, PWA icons, generated OG image, the public-output audit, the token lint, the full
Playwright matrix, Lighthouse CI for both presets, the 3G and WebGPU checks.

## Routes
`/` · `/machines/<6>/` · `/work/` + `/work/<9>/` · `/resume/` · `/certifications/` · `/contact/` · `/operator/` ·
`/match/` · `/lab-notebook/` (unlisted) · `/offline/` · `404`. Old URLs (`/behind.html`, `/stack.html`) are not
redirected (Pages cannot); their facts live in the case studies and the résumé.
