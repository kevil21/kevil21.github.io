# Kevil.OS — Interactive Resume

Personal interactive resume/portfolio site for **Kevil Patel**.

---

## Versions

| Version | Description |
|---|---|
| `v1.0.0` | Initial launch — pure animation, placeholder about photo |
| `v2.0.0` | Real photo assets added, about section updated with portrait |

**Current:** `v2.0.0`

---

## What's new in V2

- Added `assets/` folder with real photos (`portrait.jpg`, `headshot.jpg`, `tree.jpg`)
- About section now renders the real portrait photo
- `.gitignore` added and fixed

---

## Tech stack

- Vanilla **HTML / CSS / JavaScript** — no build step, no dependencies
- **GSAP + ScrollTrigger** — scroll-driven animations and reveals
- **Lenis** — smooth scrolling
- Custom canvas neural-network background (mouse-reactive)
- Custom magnetic cursor, tilt cards, scramble text, typed tagline
- Interactive draggable skills constellation
- Terminal-style contact widget with command palette
- Konami-code easter egg (`↑↑↓↓←→←→ b a`)

---

## Project structure

```
kevilpatel/
├── index.html
├── styles.css
├── app.js
├── .gitignore
├── README.md
└── assets/
    ├── portrait.jpg
    ├── headshot.jpg
    └── tree.jpg
```

---

## Run locally

Open `index.html` directly, or serve it:

```bash
python3 -m http.server 5173
# → http://localhost:5173
```

---

## Deployment

This is a static site — deploy by pointing any host at this folder:

- **GitHub Pages** — enable Pages on the `dev` branch root
- **Netlify / Vercel** — drag-and-drop this folder
- **Cloudflare Pages** — connect repo, output dir = `/`

---

## Sections

1. Boot loader (sci-fi terminal warm-up)
2. Hero — scramble title, typed tagline, live uptime, neural canvas
3. About — bio + real portrait + glassmorphic status card
4. Experience — scroll-driven timeline rail
5. Skills — physics-driven draggable constellation
6. Featured projects — A360 (orbit) + Policy→Pipelines (animated pipeline)
7. Project archive grid
8. Certifications
9. Education
10. Contact — interactive terminal + contact dots
