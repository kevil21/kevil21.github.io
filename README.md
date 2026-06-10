# Kevil.OS — Interactive Developer Resume

> A terminal-inspired, interactive single-page resume built with zero frameworks — just HTML, CSS, and JavaScript.

![Version](https://img.shields.io/badge/version-v3.0-7df9ff?style=flat-square)
![Stack](https://img.shields.io/badge/stack-vanilla%20HTML%2FCSS%2FJS-ff6ec7?style=flat-square)
![License](https://img.shields.io/badge/license-personal-a78bfa?style=flat-square)

## Version history

| Version | Description |
|---|---|
| `v1.0.0` | Initial launch — pure animation, placeholder photo |
| `v2.0.0` | Real photo assets, about section portrait |
| `v2.1.0` | Restructured into `site/`, multi-page (behind, stack, 404), chatbot, snake/chess, doom mode, multilingual |
| `v3.0.0` | GLSL shader bg, 3D skill constellation (Three.js), achievement system, hand tracking, engine analysis overlay, audio visualizer, View Transitions API, lite mode, share button |

**Current:** `v3.0.0`

## ✨ Features

### Core Experience
- **Terminal boot sequence** with audio waveform visualizer
- **GLSL shader background** — cursor-reactive fluid simulation via WebGL
- **Neural canvas** — floating nodes with connection lines
- **Custom cursor** with hover states and click animations
- **Smooth scrolling** with Lenis + GSAP ScrollTrigger

### Interactive Sections
- **Hero** with text scramble, typed role, particle field, live uptime clock
- **LangGraph pipeline simulator** — 5-stage agentic AI demo with engine analysis overlay
- **Skills** — 4 view modes: orbit (rotating rings), grid, network (force-directed), 3D constellation (Three.js)
- **Photo carousel** with 5 cinematic FX variants
- **Project case studies** — 6 detailed modal breakdowns
- **GitHub live feed** — repos, stars, and activity from the API
- **Contact** with dual location (Surat + Bangalore), learning profile links

### Easter Eggs & Games
- 🐍 **Snake** — classic 20×20, arrows/WASD, best score tracking
- ♟️ **Chess** — full move validation, AI opponent, undo support
- 👹 **Doom mode** — CRT scanlines + hue-shifted filter
- 🎮 **Konami code** → matrix digital rain
- 💬 **Chatbot** — 30+ KB fuzzy-matching persona with typing indicator
- ⌨️ **Command palette** (Cmd/Ctrl+K) — 25+ commands
- 💻 **Terminal** — 20+ commands including games, navigation, easter eggs

### v3.0 Additions
- 🔮 **3D skill constellation** via Three.js with orbit controls
- 🏆 **Achievement system** — 21 trackable discoveries with toast notifications
- ⚡ **Lite mode** — disables animations for low-end devices
- 📤 **Share button** — Web Share API + clipboard fallback
- 🖐️ **Hand-tracking navigation** via MediaPipe (experimental, lazy-loaded)
- 🎯 **Engine analysis overlay** for LangGraph with real-time metrics
- 🌊 **View Transitions API** for cross-page morphs
- 🎨 **Hero particle field** with mouse-attracted floating points
- 🔊 **Audio waveform visualizer** on boot screen

## 🚀 Quick Start

```bash
# No build step needed — just open the file
open site/index.html

# Or serve locally
npx serve site
```

## 📂 Structure

```
kevilpatel/
├── .gitignore
├── README.md
├── future.md              # Living versioned roadmap
└── site/
    ├── index.html         # Main resume (single page)
    ├── styles.css         # All styles
    ├── app.js             # All interactivity
    ├── behind.html        # Behind-the-scenes page
    ├── stack.html         # Technology stack breakdown
    ├── 404.html           # Custom 404 page
    └── assets/            # Images + OG image
        ├── portrait.jpg
        ├── headshot.jpg
        ├── photo1.jpg
        ├── photo2.jpg
        ├── photo3.jpg
        ├── tree.jpg
        ├── AWS.png
        ├── Founderz.png
        └── og.svg
```

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | CSS3 (custom properties, `light-dark()`, grid, clip-path) |
| Logic | Vanilla JavaScript (ES2022+) |
| Animation | GSAP 3.12.5 + ScrollTrigger (CDN) |
| Scrolling | Lenis 1.0.42 (CDN) |
| Shaders | Raw WebGL + GLSL |
| 3D | Three.js 0.160 (lazy-loaded CDN) |
| Hand Tracking | MediaPipe Hands (lazy-loaded CDN) |
| Audio | Web Audio API (custom multi-tone engine) |
| Font | TWK Everett (display), Roboto Mono (code) |

**Zero build step. Zero node_modules. ~2800 lines total.**

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Command palette |
| `↑ ↑ ↓ ↓ ← → ← → B A` | Konami code → matrix rain |
| `Esc` | Close any overlay |
| Arrows / WASD | Snake controls |

## 🔧 Terminal Commands

Type these in the built-in terminal (click the terminal section):

```
help          — list all commands
about         — about Kevil
stack         — tech stack
snake         — play snake
chess         — play chess vs AI
doom          — toggle doom mode
matrix        — toggle matrix rain
lite          — toggle lite mode
share         — share this page
achievements  — view achievements
3d            — 3D skill constellation
handtrack     — hand tracking (experimental)
```

## 📋 Version History

| Version | Date | Highlights |
|---|---|---|
| **v3.0** | 2025 | GLSL shaders, chess AI, achievements, 3D skills, hand tracking, 30+ KB chatbot, View Transitions, lite mode, share, hero particles, engine analysis |
| v2.2 | 2025 | Network skills, chatbot, snake, chess, doom, i18n, PDF, OG, JSON-LD, case studies, gestures |
| v2.1 | 2025 | LangGraph simulator, scramble text, photo FX, command palette, terminal, matrix rain, konami |
| v2.0 | 2025 | Boot sequence, neural canvas, custom cursor, ScrollTrigger storytelling |
| v1.x | 2024 | Static HTML resume |

## 👤 Author

**Kevil Patel** — Associate SDE at Kyndryl  
[LinkedIn](https://linkedin.com/in/kevil21) · [GitHub](https://github.com/kevil21) · [Email](mailto:kevilpatel24@gmail.com)

---

*Built with too much curiosity, GSAP, and stubbornness.*
