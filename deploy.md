# Deploying Kevil.OS to GitHub Pages

**Free · Auto-deploys on every push to `main` · No build step**

---

## Overview

Your site is pure static HTML/CSS/JS with zero build tooling. GitHub Pages hosts it directly from your repo. A GitHub Actions workflow does the deploy automatically every time you push to `main`.

There are **two URL scenarios** depending on whether you rename the repo or not. Read both, then choose.

---

## Scenario A — URL: `kevil21.github.io` (recommended)

Your site already has `https://kevil21.github.io` hardcoded as the canonical URL, Open Graph URL, and Twitter card URL. Deploying under this URL means **zero code changes needed**.

**Requirement:** GitHub only serves a user site at `username.github.io` when the repository is named exactly `username.github.io`. Your current repo is `kevilpatel`. You need to rename it.

**Step 1 — Rename the repository**

1. Go to `https://github.com/kevil21/kevilpatel`
2. Click the **Settings** tab (top right of the repo, not your account settings)
3. Scroll to the **Danger Zone** section at the very bottom
4. Click **Rename this repository**
5. Type `kevil21.github.io` as the new name
6. Click **Rename**

GitHub will automatically redirect all old git remote URLs. Your local clone still works without any changes.

---

## Scenario B — URL: `kevil21.github.io/kevilpatel` (no rename needed)

If you keep the repo named `kevilpatel`, GitHub Pages serves it at `kevil21.github.io/kevilpatel`. You would need to update 4 lines in `site/index.html` (the `og:url`, canonical `<link>`, and similar references) to point to the `/kevilpatel` subpath. The setup steps below are otherwise identical.

---

## Step-by-step setup (works for both scenarios)

### Step 2 — Create the GitHub Actions workflow file

GitHub Actions reads workflow files from `.github/workflows/` in your repo root. You need to create this folder and file.

In your local repo (`kevilpatel/` folder), create the file at the path below. The `.github` folder goes at the **repo root**, not inside `site/`.

**File path:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

# Trigger: runs on every push to the main branch
on:
  push:
    branches:
      - main

# Required permissions for the Pages deployment action
permissions:
  contents: read   # read the repo files
  pages: write     # write to GitHub Pages
  id-token: write  # authenticate the deployment (OIDC)

# Prevent multiple simultaneous deployments
# If a new push arrives while a deploy is running, the running deploy finishes first
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest

    # Links this job to the GitHub Pages environment so the URL shows up in the UI
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      # 1. Check out the full repo
      - name: Checkout
        uses: actions/checkout@v4

      # 2. Configure GitHub Pages (validates settings, sets base URL, etc.)
      - name: Setup Pages
        uses: actions/configure-pages@v5

      # 3. Package the site/ subfolder as the artifact to deploy
      #    The path is relative to the repo root
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './site'

      # 4. Deploy the packaged artifact to GitHub Pages
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Why `path: './site'`?** Your HTML, CSS, JS, and assets all live inside the `site/` subfolder of the repo. This line tells the action to serve that subfolder as the web root, so `site/index.html` becomes the homepage.

---

### Step 3 — Enable GitHub Pages in repository settings

The workflow file alone is not enough — you need to tell GitHub to use Actions as the deployment source.

1. Go to your repo on GitHub
2. Click **Settings**
3. In the left sidebar, click **Pages** (under *Code and automation*)
4. Under **Build and deployment**, find the **Source** dropdown
5. Change it from *"Deploy from a branch"* to **GitHub Actions**
6. No need to pick a branch here — the workflow file controls that

> **Important:** If you leave it as *"Deploy from a branch"* your workflow will still run but it will be ignored. The source must be **GitHub Actions**.

---

### Step 4 — Merge your work to `main` and push

You are currently on the `dev` branch. Your latest code (v3.1.0) is on `dev`. You need to merge it into `main`.

```bash
# Make sure your local main is up to date with remote
git fetch origin

# Switch to main
git checkout main

# Pull any remote changes first (prevents conflicts)
git pull origin main

# Merge dev into main
git merge dev

# Push main to GitHub — this will trigger the workflow automatically
git push origin main
```

After the push, go to `https://github.com/kevil21/kevil21.github.io/actions` (or `kevilpatel/actions` if you kept the name) and watch the workflow run in real time.

---

### Step 5 — Verify the deployment

1. In the repo's **Actions** tab, you'll see a workflow run called *"Deploy to GitHub Pages"*
2. Click it to see each step — Checkout, Setup Pages, Upload artifact, Deploy
3. When all steps show green checkmarks, the site is live
4. The environment section at the bottom of the run shows the URL

The first deployment after enabling Pages can take **2–5 minutes** to go live even after the workflow completes (DNS propagation). Subsequent deploys are usually live within **30–60 seconds**.

---

## How auto-deploy works going forward

The key section in the workflow is:

```yaml
on:
  push:
    branches:
      - main
```

Every time you push any commit to `main` (directly or via merge), GitHub automatically queues and runs the workflow. No manual steps, no external webhooks.

**Typical workflow going forward:**

```bash
# Do your work on dev (or a feature branch)
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: update hero section"
git push origin dev

# When ready to publish, merge to main
git checkout main
git merge dev
git push origin main   # <-- this triggers auto-deploy
```

---

## Optional: Custom domain (e.g. `kevil.dev`)

If you ever buy a domain and want it to point to your GitHub Pages site:

1. In your DNS provider, add a CNAME record:
   - **Name:** `www` (or `@` for root)
   - **Value:** `kevil21.github.io`
   - **TTL:** 3600
2. In your repo → Settings → Pages → **Custom domain**, type your domain and click Save
3. GitHub will auto-provision a free TLS certificate via Let's Encrypt (takes ~10 minutes)
4. Check the **Enforce HTTPS** checkbox once the certificate is ready
5. Update the canonical and OG URLs in `site/index.html` to your custom domain

---

## Summary

| What | Detail |
|---|---|
| Hosting cost | Free forever |
| Bandwidth | Unlimited (GitHub CDN) |
| Auto-deploy trigger | Every push to `main` |
| Deploy time | ~30–60 seconds after push |
| HTTPS | Free, automatic |
| Custom domain | Supported (free TLS) |
| Build step needed | None — static files served directly |
| Site root in repo | `site/` subfolder |

---

## Troubleshooting

**Workflow fails at "Deploy to GitHub Pages"**
→ Make sure you set Source to *GitHub Actions* in Settings → Pages (Step 3). Without this, the `deploy-pages` action has no permission to write.

**Site shows a 404 at the root URL**
→ Make sure your `site/index.html` exists (it does) and that the `path: './site'` in the workflow points to the correct subfolder.

**Old content still showing after deploy**
→ Hard-refresh your browser (`Cmd+Shift+R` on Mac). GitHub Pages CDN can cache aggressively.

**Workflow is not triggering on push**
→ Double-check that you pushed to `main` specifically, not `dev` or `stage`. The trigger only watches `main`.
