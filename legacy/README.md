# legacy/

`site-v1/` is the previous generation of kevilpatel.in — **Kevil.OS v3.2.1** (vanilla HTML/CSS/JS,
2026) — preserved exactly as it was served from `./site` on the `main` branch. It is **not deployed**:
`.github/workflows/deploy.yml` builds and uploads `dist/` only, and `legacy/` is excluded from linting,
type-checking and formatting. Its original README is kept as `site-v1/README-v3.md`.
Why it moved: ADR-014 (`project-context/decisions/ADR-014-repo-restructure-legacy.md`).
To view it locally: `cd legacy/site-v1 && python3 -m http.server 5173`.
