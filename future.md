# future.md — Kevil.OS roadmap

> Living roadmap for the interactive resume.
> Format: ✅ shipped · 🟡 partial · 🟠 deferred · 🔵 next · 💡 idea

---

## v3.1 — shipped (current)

- ✅ **Lighthouse CI** — GitHub Actions workflow, fails PR if perf/SEO/a11y drops below 90
- ✅ **Voice command mode** — Web Speech API (`"open chess"`, `"go to flagship"`, `"switch to French"`)
- ✅ **Dark-theme variants** — synthwave, terminal-green, amber-monochrome, e-ink print
- ✅ **GitHub contribution heatmap** — real streak graph fetched live, rendered as a heatmap
- ✅ **Per-section guided tour** — overlay walkthrough on `?tour=1`
- ✅ **Version bump** — all version strings updated to v3.1 (title, nav, hero, footer, boot, console logs)

---

## v3.0 — shipped

### new features
- ✅ **GLSL shader background** — WebGL fragment shader with cursor-reactive fluid simulation, theme-aware colors, auto-disabled in lite mode
- ✅ **Audio visualizer** — dual-wave synth waveform on boot screen canvas during boot sequence
- ✅ **Enhanced chatbot** — 30+ KB entries (up from 15), fuzzy matching with token-overlap scoring, typing indicator animation, expanded quick chips
- ✅ **Real chess AI** — proper move validation, basic AI opponent (captures + positional), pawn promotion, undo support, new game button, eval counter
- ✅ **Engine analysis overlay for LangGraph** — real-time metrics (latency, tokens, cost, confidence) displayed during pipeline simulation
- ✅ **View Transitions API** — native cross-page morphs for `.html` navigation with graceful fallback
- ✅ **Discovery counter & achievements** — 21 tracked achievements, progress bar at bottom, achievement panel with lock/unlock states, toast notifications, localStorage persistence
- ✅ **Lite mode toggle** — disables shader, neural canvas, cursor, blob, animations; nav button with persist
- ✅ **Screenshot / share button** — Web Share API native share, clipboard fallback, toast confirmation
- ✅ **A/B hero variant** — particle field behind hero section with mouse-attracted floating points and connections
- ✅ **Hand-tracking navigation** — MediaPipe Hands lazy-loaded via command palette/terminal, pinch-to-click, PiP camera feed
- ✅ **3D skill constellation** — Three.js lazy-loaded 4th skill view tab, orbit controls, auto-rotate, sprite labels, constellation connections
- ✅ **Dynamic OG image** — Cloudflare Worker code for SVG-based personalized OG images with name/role/version params

---


- ✅ **Detailed pipeline simulation** — `lgStorylines` rewritten with multi-line stage outputs (token counts, latency, model, file paths, drift %, evidence, before/after violation counts)
- ✅ **Default theme = moon (dark)** — falls back to system `prefers-color-scheme` if no saved preference
- ✅ **Skills default view = network** — force-floating nodes with cursor repulsion, dashed core→category edges, breathing animation; uses full stage space
- ✅ **Custom logos for AWS & Founderz certs** — real `<img>` from `assets/AWS.png` and `assets/Founderz.png`

### platform
- ✅ **PDF resume** — `#pdf-btn` triggers `window.print()`, full `@media print` stylesheet hides interactive chrome and renders clean A4-friendly layout
- ✅ **OG / Twitter cards** — 1200×630 SVG (`assets/og.svg`) + full meta tags
- ✅ **schema.org JSON-LD** — Person schema in `<head>` with name, jobTitle, employer, sameAs links
- ✅ **404 page** — `site/404.html` with neural canvas + mock command log
- ✅ **Behind-the-scenes page** — `site/behind.html` (constraints, layers, perf budget, lessons)
- ✅ **Stack page** — `site/stack.html` (8-card grid: this site, frontend, backend, AI/ML, cloud, data, dev/ops, languages)
- ✅ **Per-project case studies** — modal opens on click of the 6 secondary projects; A360 + P2P still scroll to their flagship sections
- ✅ **Page transitions** — `.page-fade` overlay fades for 320 ms between `.html` navigations
- ✅ **Auto-theme** — `matchMedia('(prefers-color-scheme: light)')` on first visit; reactive to OS switch until user picks
- ✅ **Mobile redesign for skill orbit** — `@media (max-width:780px)` taller stage; network renderer adapts to viewport
- ✅ **Gesture support** — touch swipe on `#photo-frame` triggers next photo
- ✅ **Feature flags** — `?flags=foo,bar` parsed into `window.KP_FLAGS` Set; `?flags=doom` boots into Doom mode
- ✅ **Local RUM stub** — `kp-rum` localStorage tracks visits, first/last seen, TTFB, JS error count; console-logged for now
- ✅ **A11y pass** — skip-link, `:focus-visible` outline, aria-labels on nav-tool icons, `hidden` attribute properly respected by modals

### easter eggs & personality
- ✅ **Chatbot persona of Kevil** — floating "Ask Kevil" FAB → 380×540 panel with 15-entry keyword KB + 7 quick-question chips, slash-command friendly
- ✅ **Snake game** — 20×20 grid, arrows/wasd, wrap walls, localStorage best score
- ✅ **Chess board (freeplay)** — 8×8 board with Unicode pieces, click-to-select, no rules engine
- ✅ **Doom mode** — `?flags=doom` or palette → CSS scanlines + filter contrast/saturate/hue-rotate over the whole site
- ✅ **Multilingual switcher** — EN → FR → HI → GU cycle, retitles hero/CTAs, persisted in localStorage

---

## 🟡 partial — done structurally, needs follow-up

- 🟡 **Lighthouse 95+ pass** — perf hints in place (preconnect, preload, font-display=swap, lazy cert images, no blocking JS) but no CI run yet
- 🟡 **Analytics** — local RUM only; no Plausible/Umami/Cloudflare wired yet (needs domain)
- 🟡 **Sentry / Cloudflare RUM** — `window.onerror` counter in localStorage; real DSN/beacon not configured

## 🟠 deferred — intentionally not done

- 🟠 **Three.js hero** — heavy dependency; current neural canvas + CSS gradient + grain already achieves a similar feel at ~0 kB cost
- 🟠 **WebGL shader background** — see above; revisit when migrating to a custom domain with budget for an extra 50 kB
- 🟠 **Lottie / Rive accents** — no asset library yet; would need a motion designer

---

## 🔵 v3.2 — next up

1. **Blog / changelog section** — markdown-driven, with RSS
2. **Plausible / Cloudflare Analytics** — replace local RUM stub with real telemetry (needs custom domain)
3. **Stockfish WASM** — full Stockfish.js chess engine (~200 kB lazy-loaded behind the chess modal)
4. **Per-visitor dynamic OG** — Cloudflare Worker renders `og.svg` with referrer / UTM in real-time
5. **Sticky-note mode** — visitors leave notes pinned to sections, persisted via Firebase or Worker KV
6. **WebXR mode** — view the skill network as a 3D constellation in AR through a phone camera

## 💡 ideas — wishlist

- **View-source mode** — overlay that highlights the section's CSS class + JS module on Alt-click
- **Hand-tracking nav** via MediaPipe (toggle on; web-cam tracks pinch gestures to scroll)
- **Voice command mode** via Web Speech API (`"open chess"`, `"go to flagship"`, `"switch to French"`)
- **Sticky-note mode** — visitors leave notes pinned to sections, persisted via Firebase or a Worker KV
- **Terminal multiplayer** — collaborative terminal session via WebSocket; visitors see each other's cursors
- **Dark-theme variants** — synthwave, terminal-green, amber-monochrome, e-ink print
- **AR mode** via WebXR — view the skill network as a hovering 3D constellation through a phone camera
- **Blog / changelog section** — markdown-driven, with RSS
- **GitHub contribution streak** — real graph fetched live, rendered as a heatmap on the homepage
- **Motion-blur on scroll** — exaggerate Lenis inertia visually via per-section CSS blur
- **Random weekly theme rotation** — accent colour cycles based on ISO week number
- **Konami-like discovery counter** — track how many easter eggs the visitor has triggered and unlock a hidden "achievements" page
- **"Lite mode" toggle** — disable canvas, audio, gestures and skill-net for old devices / low-end mobiles
- **Screenshot / "share this page" button** — render the current view + a stamped caption into a PNG via `html2canvas`
- **Per-section walkthrough** — guided tour on first visit using `?tour=1`
- **Hidden Wordle of the day** based on the most recent commit hash
- **Real GitHub Codespaces preview embed** that boots the actual A360 frontend
- **A/B variant of the hero** — split test "Associate SDE" vs "AI Cloud Engineer @ Kyndryl" tagline

---

## release log

| Version | Highlights |
|---|---|
| **v3.1** | Lighthouse CI, voice commands, dark-theme variants, GitHub heatmap, guided tour |
| v3.0 | GLSL shader, 3D constellation (Three.js), achievement system, hand tracking, engine analysis overlay, audio visualizer, View Transitions API, lite mode, share button |
| v2.2 | network skills default, chatbot, snake, chess, doom, multilingual, PDF, OG, JSON-LD, 404/behind/stack pages, gestures, RUM stub, feature flags, auto-theme |
| v2.1 | LangGraph simulator, scramble text, photo FX carousel, command palette, terminal, matrix rain, konami |
| v2.0 | KP.OS boot, neural canvas, custom cursor, ScrollTrigger storytelling |
| v1.x | static HTML resume |
