# ADR-008 · A Pages-like foreground static server for preview, tests and LAN

**Status:** accepted · 2026-11-01 · Scene 1–2

## Decision
`scripts/serve-dist.mjs` serves `dist/` the way GitHub Pages does: directory → `index.html`, `/foo` → `/foo/` redirect,
miss → `404.html` with status 404, extensionless `CNAME` as text, no caching. It stays in the foreground.
Playwright's `webServer`, `npm run preview` and `npm run preview:lan` (QR codes) all use it.

## Why
- Astro 7's `astro preview` daemonises, so Playwright's `webServer` sees the process exit and aborts.
- Inherited (TRACE K-06): `astro preview` does not serve `/CNAME`; the audit and the deploy guard need it served.
- Identical behaviour across local tests and LAN phone previews.

## Rejected
- `astro preview --ignore-lock` in the foreground: still daemonises in 7.4.
- `serve`/`http-server` packages: extra dependency, wrong 404 semantics.
