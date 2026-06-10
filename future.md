# future.md — Kevil.OS roadmap

> Living roadmap for the interactive resume.
> Format: ✅ shipped · 🟡 partial · 🟠 deferred · 🔵 next · 💡 idea

---

## v3.0 — shipped (current)

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

### bug fixes & polish
- ✅ **Surat airport coordinates** — fixed Google Maps link from city center to actual airport (21.1141, 72.7418)
- ✅ **KEVIL/CORE text** — improved hexagon core display with proper block layout and spacing
- ✅ **Version bump** — all version strings updated to v3.0 (title, nav, hero, footer, boot, console logs)
- ✅ **Boot sequence updated** — added GLSL shader engine + achievement system boot lines

### v2.3 (folded into v3.0)
- ✅ **Theme celestial animation** — sun/moon body expansion with rays, rings, sparkles, and smooth color transitions
- ✅ **Hexagon KEVIL core** — clip-path hexagon with SVG border, pulse glow, dashed edges
- ✅ **Skill attract-nearest** — cursor attracts nearest skill node in network view, others repel
- ✅ **Hover-inspect tooltips** — skill nodes show years + usage context on hover/click
- ✅ **Dual location** — Surat + Bangalore with Google Maps links and airport coordinates
- ✅ **Learning profile links** — MS Learn, Credly, Google Skills in contact section
- ✅ **Cert SVG fix** — dark mode SVG fill override for non-image cert icons
- ✅ **Nav SVG icons** — all nav-tools buttons use inline SVGs (no icon font dependency)

---

## 🟡 partial — done structurally, needs follow-up

- 🟡 **Lighthouse 95+ pass** — perf hints in place (preconnect, preload, font-display=swap, lazy cert images, no blocking JS) but no CI run yet
- 🟡 **Analytics** — local RUM only; no Plausible/Umami/Cloudflare wired yet (needs domain)
- 🟡 **Sentry / Cloudflare RUM** — `window.onerror` counter in localStorage; real DSN/beacon not configured
- 🟡 **Stockfish WASM** — full chess rules implemented natively, but Stockfish.js WASM not loaded (using built-in greedy AI instead)
- 🟡 **Dynamic OG deployment** — Worker code written, needs Cloudflare deploy + domain routing

## 🟠 deferred — intentionally not done

- 🟠 **Lottie / Rive accents** — no asset library yet; would need a motion designer
- 🟠 **AI-powered chatbot LLM** — local LLM WASM too heavy; fuzzy KB is sufficient for a resume
- 🟠 **Per-visitor OG customization** — needs UTM/referrer parsing on Worker, not a priority

---

## 🔵 v3.1 — next up

1. **Lighthouse CI in GitHub Actions** — fail PR if perf/SEO/a11y drops below 90
2. **Voice command mode** via Web Speech API (`"open chess"`, `"go to flagship"`, `"switch to French"`)
3. **Dark-theme variants** — synthwave, terminal-green, amber-monochrome, e-ink print
4. **GitHub contribution heatmap** — real streak graph fetched live
5. **Per-section guided tour** — overlay walkthrough on `?tour=1`
6. **Blog / changelog section** — markdown-driven, with RSS

## 💡 ideas — wishlist

- **View-source mode** — overlay that highlights the section's CSS class + JS module on Alt-click
- **Sticky-note mode** — visitors leave notes pinned to sections, persisted via Firebase or a Worker KV
- **Terminal multiplayer** — collaborative terminal session via WebSocket; visitors see each other's cursors
- **Motion-blur on scroll** — exaggerate Lenis inertia visually via per-section CSS blur
- **Random weekly theme rotation** — accent colour cycles based on ISO week number
- **Hidden Wordle of the day** based on the most recent commit hash
- **Real GitHub Codespaces preview embed** that boots the actual A360 frontend
- **WebXR mode** — full XR hand tracking with Three.js scene in VR/AR

---

## release log

| Version | Highlights |
|---|---|
| **v3.0** | GLSL shaders, chess AI, achievements system, 3D skill constellation, hand tracking, 30+ KB chatbot, View Transitions, lite mode, share button, hero particles, engine analysis overlay, dynamic OG |
| v2.2 | network skills default, chatbot, snake, chess, doom, multilingual, PDF, OG, JSON-LD, 404/behind/stack pages, gestures, RUM stub, feature flags, auto-theme |
| v2.1 | LangGraph simulator, scramble text, photo FX carousel, command palette, terminal, matrix rain, konami |
| v2.0 | KP.OS boot, neural canvas, custom cursor, ScrollTrigger storytelling |
| v1.x | static HTML resume |
