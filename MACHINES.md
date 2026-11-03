# Machines

Each machine = content (`src/content/machines.json`: plaque claims with sources, sample controls, readouts, linked
projects and decisions) + simulation (`src/sim/<slug>.ts`, pure TypeScript, seeded) + 3D assembly
(`src/hall/machines/<slug>.ts`) + HTML twin (`/machines/<slug>/`) + control panel island + architecture diagram
(`src/lib/diagrams.ts`) + case study (`/work/<project>/`). **All numbers the machines emit are sample data.** The facts
are on the plaques, each with a ledger id and a source line.

| Bay | Machine | Controls (sample) | Readouts | Simulation shape (from the ledger) |
|---|---|---|---|---|
| 1 | Telemetry Refinery (A360) | tenant chambers 1–6 (résumé states 4 live), sync interval 1–30 min (real: 10), dogfooding, gateway valve (JWKS), **Sync now** (button: starts the ADX → Elasticsearch sync immediately) | spans/s, views synced /31, chambers lit, insights | 1 s = 1 sim minute; sync every N min ramps 0→31 views over 1.6 s; chambers fill per tenant; insights (20 types) only through an open gateway; 70-min / 25-h overlaps and SHA-256 ids are the narrated decisions |
| 2 | Policy Sorter (P2P) | sample policy ×3, approval lever (a button: only acts while a plan waits at the gate), mock mode | stage, violations, risk /10, evidence packs | Compiler → Scanner → Planner → Risk Assessor → (gate) → Executor → evidence; BLOCKED pins 10, HIGH_RISK +6, auto-approve < 4; mock ×1.6 |
| 3 | Forecast Engine (LSTM work) | stream (migration/grid/irrigation), horizon 1–48 h, show baseline | forecast, vs baseline, stated outcome | seeded synthetic series; model = trend + seasonal continuation vs naive baseline; dial sweeps to the résumé's stated % per stream; irrigation says "not an LSTM" |
| 4 | Data Workbench (ELK) | run overlays / incidents / assets | records cleaned, index fill %, screens lit | ingest 1.2 s → clean 1.6 s → index 1.8 s → visualise 0.8 s per station; sample counts 1800/2400/3100 |
| 5 | Calibration Bench (certifications) | issuer filter, print certificate | instruments /10, most recent calibration | instruments from the certifications collection; issue months [source: info.md]; printer prints one line per instrument |
| 6 | Foundations Generator (education, GDSC) | spin up vit / gdsc / school | hall power (real milestone totals), students (as stated) | turbines spin up; totals computed from the real dated-milestone series |

## Scenarios and live instruments (v5.1.0, ADR-016)
Each panel shows **Live instruments · sample data** under the readouts: SVG/HTML charts drawn from the sim's own history,
each with a "Data table" twin. Every machine has a scenario control that changes what the sim does.

| Machine | Scenario control | Instruments |
|---|---|---|
| Telemetry Refinery | `steady` · `late-arrivals` (documents arrive after the window moved on; the 70-minute overlap catches them) · `tenant-surge` (tenant 1 bursts) | stacked spans/s by tenant · 31-view × 10-sync heat map · next-sync gauge · tenant chamber bars · overlap ledger (read / collapsed by SHA-256 id / late caught / new) · insight-types grid (20) |
| Policy Sorter | `single` · `rotate` (all three sample policies in turn, starting at the selected one) | five-agent pipeline with the human gate · risk-score waterfall (rubric, HIGH_RISK +6, BLOCKED pins 10, auto-approve below 4) · all-policies comparison · gate-wait gauge · evidence cabinet |
| Forecast Engine | `live` · `backtest` (rolling-origin folds on the sample series) | history + forecast with ±1 σ band and naive baseline · daily shape · landing values (live) / error per fold, residual histogram, folds beating the baseline (backtest) |
| Data Workbench | `fresh` (every run brings new records) · `replay` (same deterministic ids: the index does not grow) | station stages · records/s trace · funnel (ingested, cleaned, unique docs, duplicates collapsed) · documents per station index |
| Calibration Bench | chart: `issuers` · `timeline` | instruments by issuer · issuer × month heat (or issue-month columns + cumulative line) · printer gauge; months from `info.md` |
| Foundations Generator | `playback` toggle ("run the years", 3 months/s over the real series) | hall-power series with playhead · milestones per year with the turbine's years highlighted · turbine speeds |

Hall-wide: **ceiling skills cables** (fixed layout from the skills collection's `usedIn`; `highlightSkill` lights a
run) and the **hall power meter** (bars per month from `events.json`; month-dated solid, year-only as a light band),
with an SVG twin and the full milestone list in the back-wall card.

Decisions as switches (16): each decision is a sourced statement plus the one-line narration the Operator and the
panels use when a control changes, e.g. "Opening the sync manifold with a 70-minute overlap … because the A360 sync
decision chose idempotent overlapping windows."
