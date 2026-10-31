# Kevil.OS — Interactive Resume `v3.2.0`

Personal interactive resume/portfolio site for **Kevil Patel**.

![Version](https://img.shields.io/badge/version-v3.2-7df9ff?style=flat-square)
![Stack](https://img.shields.io/badge/stack-vanilla%20HTML%2FCSS%2FJS-ff6ec7?style=flat-square)
![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-a78bfa?style=flat-square)

---

## Version history

| Version | Description |
|---|---|
| `v1.0.0` | Initial launch — pure animation, placeholder photo |
| `v2.0.0` | Real photo assets, about section portrait |
| `v2.1.0` | Restructured into `site/`, multi-page (behind, stack, 404), chatbot, snake/chess, doom mode, multilingual, PDF, OG, JSON-LD |
| `v2.2.0` | Network skills default, command palette, terminal, matrix rain, LangGraph simulator, gesture support, RUM stub, auto-theme, feature flags, a11y pass |
| `v3.0.0` | GLSL shader bg, 3D skill constellation (Three.js), achievement system, hand tracking, engine analysis overlay, audio visualizer, View Transitions API, lite mode, share button |
| `v3.1.0` | Lighthouse CI, voice commands, dark-theme variants, GitHub heatmap, guided tour |
| `v3.2.0` | Extracted shader to `shader-bg.js`, improved hand tracking, GitHub Actions auto-deploy, `deploy.md` deployment guide |

**Current:** `v3.2.0`

---

## Tech stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | CSS3 (custom properties, `light-dark()`, grid, clip-path) |
| Logic | Vanilla JavaScript (ES2022+) |
| Animation | GSAP 3.12.5 + ScrollTrigger (CDN) |
| Scrolling | Lenis 1.0.42 (CDN) |
| Shaders | Raw WebGL + GLSL (`shader-bg.js`) |
| 3D | Three.js (lazy-loaded CDN) |
| Hand Tracking | MediaPipe Hands (lazy-loaded CDN) |
| Audio | Web Audio API |
| CI/CD | GitHub Actions → GitHub Pages |

**Zero build step. Zero node_modules.**

---

## Features

### Core experience
- Terminal boot sequence with audio waveform visualizer
- GLSL shader background — cursor-reactive fluid simulation (`shader-bg.js`)
- Neural canvas — floating nodes with connection lines
- Custom cursor with hover states
- Smooth scrolling with Lenis + GSAP ScrollTrigger

### Interactive sections
- **Hero** — text scramble, typed role, particle field, live uptime clock
- **LangGraph pipeline simulator** — 5-stage agentic AI demo with engine analysis overlay
- **Skills** — 4 view modes: orbit, grid, network (force-directed), 3D constellation (Three.js)
- **Photo carousel** with cinematic FX variants
- **Project case studies** — 6 detailed modal breakdowns
- **GitHub live feed** — repos, stars, and activity from the API
- **Contact** — dual location (Surat + Bangalore), learning profile links

### Easter eggs & games
- Snake (20×20, WASD, best score)
- Chess (full move validation, AI opponent, undo)
- Doom mode (`?flags=doom`)
- Konami code → matrix digital rain
- Chatbot — fuzzy-matching Kevil persona with typing indicator
- Command palette (`Cmd/Ctrl+K`) — 25+ commands
- Terminal — 20+ commands including games and navigation
- Multilingual switcher (EN → FR → HI → GU)
- Achievement system — 21 trackable discoveries with toast notifications

---

## Project structure

```
kevilpatel/
├── .gitignore
├── .github/
│   └── workflows/
│       └── deploy.yml     ← GitHub Actions auto-deploy to Pages
├── README.md
├── deploy.md              ← deployment guide
├── future.md              ← versioned roadmap
└── site/
    ├── index.html         ← main resume page
    ├── styles.css
    ├── app.js
    ├── shader-bg.js       ← extracted GLSL shader module
    ├── behind.html        ← build story & constraints
    ├── stack.html         ← full tech stack breakdown
    ├── 404.html           ← custom error page
    └── assets/
        ├── portrait.jpg / headshot.jpg
        ├── photo1.jpg / photo2.jpg / photo3.jpg
        ├── tree.jpg
        ├── AWS.png / Founderz.png
        └── og.svg
```

---

## Run locally

```bash
cd site && python3 -m http.server 5173
# → http://localhost:5173
```

Or open `site/index.html` directly (multi-page links work best with a local server).

---

## Deployment

Automated via GitHub Actions on every push to `main` — see [deploy.md](./deploy.md) for full setup instructions.

Manual options (static, no build step):

- **GitHub Pages** — enable Pages on the `dev` branch, set source to `/site`
- **Netlify / Vercel** — set publish directory to `site`
- **Cloudflare Pages** — output dir = `site`

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Command palette |
| `↑ ↑ ↓ ↓ ← → ← → B A` | Konami code → matrix rain |
| `Esc` | Close any overlay |
| Arrows / WASD | Snake controls |

---

## Pages

| Page | Path | Description |
|---|---|---|
| Resume | `site/index.html` | Main interactive resume |
| Behind the scenes | `site/behind.html` | Build constraints, layers, perf budget |
| Stack | `site/stack.html` | Full tech stack breakdown |
| 404 | `site/404.html` | Neural canvas error page |

---

## Roadmap

See [future.md](./future.md) for the full versioned roadmap.
