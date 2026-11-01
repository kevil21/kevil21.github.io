# Design — treatment summary

**Logline.** A dark laboratory hall where six working machines, one per system Kevil built, run on labelled sample
data; the visitor walks the floor, pulls levers, and an on-device Operator explains every change from Kevil's decision
records. A recruiter reads name, title, employer, résumé and contact before the first light finishes sweeping on.

## Two openings
- **Laptop:** black hall, the recruiter strip already live; the breaker lever flips at 0.25 s; practicals sweep bay by
  bay over ~2.4 s; the Refinery wakes first (spans fall); the camera starts close on it and dollies back to the
  control-room stop revealing the floor and the minimap.
- **Phone (390 px portrait):** the bottom bar is present from first paint; the camera stands at the control-room door
  looking down the hall so it recedes vertically; lights sweep away; the Refinery wakes in the upper half while the
  intro card sits below. One-finger scroll walks the rail; two-finger gestures orbit in free walk; every gesture has a
  button twin.
- Both: content first, opening never blocks reading; reduced motion = lit hall as a still with machines at idle; no
  JavaScript / no WebGL 2 = an SVG floor plan and the HTML twins.

## Visual system
Cinematic dark with warm light: ink hall (OKLCH L 19 %, hue 262), amber practicals (hue 72), brass accents (hue 82),
ember alerts (35), teal telemetry (195), sage approvals (150). Light theme is a daylit lab on warm paper (L 96.5 %,
hue 85) with the same accents at text-safe lightness; night shift is a deeper third variant. Every colour is a token
with a fill and a text-safe variant; shaders, particles, fog and lights read the same tokens. Type: Bricolage Grotesque
+ IBM Plex Mono. The kit of parts (tanks, pipes, valves, gauges, levers, conveyors, printers, cabinets, screens, lamps,
coils, turbines, dials) is one procedural library with one palette, so the whole floor shares one material language.

## Motion system
Tokens: instant 80 / fast 160 / normal 240 / emphasis 400 / cinematic 1200 ms; standard, enter, exit, spring easings;
60 ms stagger. Choreography: breaker + light sweep; machine start-ups; rail dollies; panel reveal; View Transitions
with shared-element machine titles; tool-call motion (levers, valves, cards, packs, jars, needles answer every control);
theme and lens switches without low-contrast intermediates; 90-second tour with a caption bar; 404 alarm lamp. Only
transform/opacity on hot paths; GPU paused when hidden or off-screen; adaptive quality from frame time (DPR 2/1.5/1.25,
particle caps, real-light lamp counts 8/5/3). Reduced motion keeps every feature.

## Mobile system
Bottom bar (Résumé · Contact · Operator · Tour · Map) in the thumb zone with safe-area insets; sheets for the floor
plan; bay cards in the lower half with the machine above; landscape becomes a side rail; 44 px targets; 16 px inputs;
`100dvh`; no horizontal scroll 320–1440 px; phone render profile engages from `pointer: coarse`; Save-Data → static.

## The Operator
Visible plan understand → retrieve → verify → act → explain; NLP strip; grounded answer with numbered citations
linking to the source file and line; tool buttons (nothing moves without a click); trust gauges with published
formulas; Pocket tier always (BM25, MiniLM on fine-pointer devices), Full tier opt-in (size first, progress, cancel).

## Easter eggs
Night shift, maintenance hatch, coffee mug, reverse walk, lab weather, ask the machines, dev-console greeting, lights
out (404). All keyboard/touch reachable, announced, listed on `/lab-notebook/`, none invents a fact.
