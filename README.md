# Kevil.OS — Interactive Resume

Personal interactive resume/portfolio site for **Kevil Patel**.

---

## Versions

| Version | Description |
|---|---|
| `v1.0.0` | Initial launch — pure animation, placeholder about photo |
| `v2.0.0` | Real photo assets added, about section updated with portrait |
| `v2.1.0` | Full restructure into `site/`, multi-page, major feature expansion |

**Current:** `v2.1.0`

---

## What's new in V2.1

- All site files moved into `site/` — cleaner repo root
- New pages: `behind.html` (build story), `stack.html` (tech breakdown), `404.html` (neural canvas error page)
- More photos added (`photo1.jpg`, `photo2.jpg`, `photo3.jpg`)
- Real cert logos: `AWS.png`, `Founderz.png`
- OG / Twitter card image (`og.svg`) + schema.org JSON-LD in `<head>`
- Skills section rebuilt as force-floating network with cursor repulsion
- Chatbot FAB — "Ask Kevil" panel with keyword KB + quick-question chips
- Snake game + freeplay chess board easter eggs
- Doom mode (`?flags=doom`)
- Multilingual hero switcher (EN → FR → HI → GU)
- PDF resume via `window.print()` with `@media print` stylesheet
- Per-project case study modals on archive cards
- Page-transition fade overlay between `.html` navigations
- Auto dark/light theme tied to OS preference
- Touch swipe on photo frame
- Local RUM stub (visits, TTFB, JS errors in `localStorage`)
- Accessibility pass: skip-link, `:focus-visible`, aria-labels
- `future.md` roadmap added to repo root

---

## Tech stack

- Vanilla **HTML / CSS / JavaScript** — no build step, no dependencies
- **GSAP + ScrollTrigger** — scroll-driven animations and reveals
- **Lenis** — smooth scrolling
- Custom canvas neural-network background (mouse-reactive)
- Custom magnetic cursor, tilt cards, scramble text, typed tagline
- Force-graph skills network
- Terminal-style contact widget with command palette
- Konami-code easter egg (`↑↑↓↓←→←→ b a`)

---

## Project structure

```
kevilpatel/
├── .gitignore
├── README.md
├── future.md          ← versioned roadmap
└── site/
    ├── index.html     ← main resume page
    ├── behind.html    ← build story & constraints
    ├── stack.html     ← full tech stack breakdown
    ├── 404.html       ← custom error page
    ├── styles.css
    ├── app.js
    └── assets/
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

---

## Run locally

```bash
cd site && python3 -m http.server 5173
# → http://localhost:5173
```

Or open `site/index.html` directly (multi-page links work best with a local server).

---

## Deployment

Static site — deploy by pointing any host at the `site/` folder:

- **GitHub Pages** — enable Pages on the `dev` branch, set source to `/site`
- **Netlify / Vercel** — set publish directory to `site`
- **Cloudflare Pages** — output dir = `site`

---

## Pages

| Page | Path | Description |
|---|---|---|
| Resume | `site/index.html` | Main interactive resume |
| Behind the scenes | `site/behind.html` | Build constraints, layers, perf budget |
| Stack | `site/stack.html` | 8-card full tech stack breakdown |
| 404 | `site/404.html` | Neural canvas error page |

---

## Roadmap

See [future.md](./future.md) for the full versioned roadmap.
