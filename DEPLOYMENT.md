# Deployment

**Target:** GitHub Pages, repository `kevil21/kevilpatel`, custom domain `kevilpatel.in` (DNS at GoDaddy: A records to
Pages, `www` CNAME to `kevil21.github.io`, verification TXT; HTTPS enforced). DNS and GitHub Settings are already
correct and are not touched by the build.

## Workflows
- `.github/workflows/deploy.yml` — on push to `main` (and manual): `npm ci` → cache `.cache/models` → check, lint,
  format, unit tests → `npm run build` (prebuild: images, ORT runtime, Build Brain; postbuild: service worker,
  public-output audit) → token lint → smoke Playwright (WebGL path; CI Chromium has no WebGPU) → `configure-pages` →
  **root-path guard** (fails if `base_path` is non-empty or `dist/CNAME` ≠ `kevilpatel.in`) → upload → deploy.
- `.github/workflows/validate.yml` — on pull requests: everything above plus the full Playwright matrix and Lighthouse
  CI with both presets; reports uploaded as artifacts.
- `public/CNAME` = `kevilpatel.in` (the live `main` had none; the domain lived only in Pages settings).

## Release steps (Kevil)
```bash
cd ~/Library/CloudStorage/OneDrive-kyndryl/Desktop/Misc/Resume/kevilpatel
git status                          # review the tree (nothing is committed by the agent)
npm ci && npm run build && npm test && npm run test:e2e
git add -A
git commit -m "v5.0.0 | The Simulation Room: laboratory floor of working machines, on-device Operator"
git push -u origin simulation_dev
# open a pull request simulation_dev → main (validate.yml runs); merge → deploy.yml publishes to kevilpatel.in
```
Rollback: re-run an earlier successful `deploy.yml` run from the Actions tab, or revert the merge commit.

## Local previews
`npm run preview` (127.0.0.1:4441, secure context: WebGPU + service worker available) ·
`npm run preview:lan` (0.0.0.0:4442 + QR; LAN http is not a secure context: WebGL 2 path, no service worker, no Full tier).

## What the agent did not do
Push, commit, run the workflows, or change any setting. `gh` on the build machine is logged in as a different account
and was not used.
