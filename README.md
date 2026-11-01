# kevilpatel.in — The Simulation Room

Kevil Patel's portfolio as **a laboratory floor of working machines**. Each machine is one of the real systems Kevil
built, running on clearly labelled sample data, rendered in 3D (WebGPU with WebGL 2 fallback, static SVG without
either), and operated by an on-device agent that explains every change from Kevil's own decision records and cites
its sources or declines. Static site on GitHub Pages at **https://kevilpatel.in**.

## The floor
| Bay | Machine | Embodies |
|---|---|---|
| 1 | Telemetry Refinery | A360 — multi-tenant AI agent observability (Kyndryl) |
| 2 | Policy Sorter | Policy → Pipelines — 5-agent LangGraph governance |
| 3 | Forecast Engine | LSTM forecasting: migration risk, grid load, irrigation |
| 4 | Data Workbench | Three ELK pipelines |
| 5 | Calibration Bench | Ten certifications with credential IDs and verify links |
| 6 | Foundations Generator | VIT Vellore, school, GDSC VIT |

Plus the control room (profile, résumé, contact, the Operator's console), ceiling skills cables, and the hall power
meter (dated milestones per month from the fact ledger).

## Truth contract
Every published fact traces to `../KPOS/` (the previous site) by file and line; certification issue months come from
`../info.md` and are labelled. Résumé numbers appear verbatim, labelled "as stated in résumé". Simulation numbers are
labelled "sample data". A post-build audit fails on anything from the exclusion list or a non-`kevilpatel.in` canonical.

## Develop
```bash
npm ci                 # Node 24.9, npm 11 (engine-strict)
npm run dev            # http://127.0.0.1:4440
npm run build          # prebuild: images, ORT runtime, Build Brain · postbuild: service worker, public-output audit
npm run preview        # Pages-like static server on http://127.0.0.1:4441
npm run preview:lan    # LAN preview + QR code for a phone (WebGL path; LAN http is not a secure context)
npm run check && npm run lint && npm test && npm run test:e2e
LH_PRESET=mobile npm run lighthouse && LH_PRESET=desktop npm run lighthouse
node scripts/check-3g.mjs            # HTML readable before any 3D
node scripts/check-full-brain.mjs    # real WebGPU run of the local model (Google Chrome, local only)
node scripts/screenshots.mjs --pages /,/resume/,/work/a360/ --bay 1
```

## Docs
[ARCHITECTURE](ARCHITECTURE.md) · [DESIGN](DESIGN.md) · [MACHINES](MACHINES.md) · [SECURITY](SECURITY.md) ·
[TESTING](TESTING.md) · [DEPLOYMENT](DEPLOYMENT.md) · [CONTENT-SOURCES](CONTENT-SOURCES.md) ·
[MIGRATION-REPORT](MIGRATION-REPORT.md) · ADRs in [`project-context/decisions/`](project-context/decisions/) ·
agent rules in [`CLAUDE.md`](CLAUDE.md).

## Licence and credits
Site code © Kevil Patel. Models: `Xenova/all-MiniLM-L6-v2` (Apache-2.0), `Qwen2.5-0.5B/1.5B-Instruct` via WebLLM
(Apache-2.0). Fonts: Bricolage Grotesque, IBM Plex Mono (OFL) via Fontsource. Logos belong to their owners.
