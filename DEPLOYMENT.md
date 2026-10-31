# Deployment

## Topology
`kevilpatel.in` → GoDaddy DNS (A records 185.199.108–111.153, `www` CNAME → `kevil21.github.io`,
verification TXT) → GitHub Pages (HTTPS enforced) ← `actions/deploy-pages` ← `dist/` built by
`.github/workflows/deploy.yml`. DNS and Pages settings were already configured and are not changed here.

## Workflow (`deploy.yml`)
Triggers: push to `main`, `workflow_dispatch`. Permissions: `contents: read`, `pages: write`,
`id-token: write`. Steps: checkout → Node from `.node-version` → `npm ci` → cache `.cache/models`
(MiniLM for the Build Brain) → `check`, `lint`, `format:check`, `test` → `npm run build` (assets, ORT
runtime copy, Build Brain, Astro, service worker, public audit) → Playwright smoke (desktop-dark,
mobile-light, reduced-motion, a11y both themes) → `configure-pages` → **root-path guard** (`base_path`
must be empty, `dist/CNAME` must read `kevilpatel.in`) → `upload-pages-artifact` (`dist/`) →
`deploy-pages`. `validate.yml` runs everything plus Lighthouse CI on pull requests.

## Requirements in GitHub (already true for this repo)
- Repository public (free Pages); Pages source = **GitHub Actions**; custom domain `kevilpatel.in`
  with "Enforce HTTPS".
- `public/CNAME` is committed so every deploy keeps the custom domain.

## Local
```bash
npm ci && npm run build && npm run preview   # http://127.0.0.1:4331
```
`PUBLIC_APP_VERSION` is injected by CI (`github.sha`); locally it defaults to `dev` or whatever you export.

## Rollback
Re-run the previous successful workflow run from the Actions tab (`workflow_dispatch` on the earlier
commit), or revert the commit on `main`. The service worker's hash-versioned caches make every deploy
replace the previous shell on next load.

## Previous generation
`legacy/site-v1/` holds Kevil.OS v3.2.1 and is never uploaded; `deploy.md` is its original guide.
