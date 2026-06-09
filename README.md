# Kevil.OS — Interactive Resume (V1)

First versioned release of my personal interactive resume website.

This is the **V1 baseline commit** for the `kevilpatel` project.

## Version

- **Current:** `v1.0.0`
- **Status:** Initial public version

## What this project is

A single-page, zero-build resume/portfolio experience for **Kevil Patel**, built with pure frontend technologies and animation-focused interactions.

## Tech stack

- Vanilla **HTML / CSS / JavaScript** (no build tools)
- **GSAP + ScrollTrigger** for motion and reveal effects
- **Lenis** for smooth scrolling
- Custom canvas-based neural background

## V1 Features

- Boot-screen intro experience
- Custom cursor + magnetic hover interactions
- Tilt cards and scroll-triggered reveal animations
- Draggable skills constellation
- Terminal-style contact widget with commands
- Featured project storytelling sections
- Konami-code easter egg

## Project structure

```
kevilpatel/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Run locally

Option 1: Open directly

- Open `index.html` in your browser.

Option 2 (recommended): Serve locally

- Start a simple local server from this folder and open `http://localhost:5173`.

## Deployment notes

This V1 is static and can be deployed directly to:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

Use this folder (`kevilpatel/`) as the publish root.

## Planned next versions

- Split content into data/config for easier updates
- Add accessibility and performance audits
- Introduce light theming and content toggles
- Add analytics/events for interaction insights
