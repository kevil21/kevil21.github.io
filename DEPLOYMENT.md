# GitHub Pages — prepared locally, not deployed

This is prepared as a standalone project. This documentation phase performed no Git operation and did not initialize, commit, push, configure or deploy a repository or change DNS/Pages/account settings. Prior handoffs report no deployment. Publication remains an owner-authorized future action; no repository state or live hosting is freshly verified here.

## Repository and artifact boundary

The historical plan names **`kevil21/portfolio`** as the intended repository. That is a planning reference, not a verified remote or authorization to create/push it. Confirm the owner and repository before release. Its repository root must be this project's contents: `package.json`, `src/`, `content/`, `public/`, `assets-source/`, `scripts/`, `tests/` and `.github/workflows/`, not a nested `kevilpatel-next/` build directory.

For future publication, copy **this project's source contents** to the chosen repository **root**, including `.github/workflows`, package lock/configs, `src`, `scripts`, `tests`, `content`, project-local `assets-source` and `public`. Do not copy the parent workspace, protected reference folders, private notes/prompts/résumés, sibling sites, dependencies, local caches or test artifacts. The workflows do not assume a `kevilpatel-next/` parent or sibling build inputs. Preserve the project-local original headshot as a build input; it is not the image published to the site.

Only audited **`dist/`** is uploaded as the Pages artifact. Never publish the source root. Public CNAME/canonical/OG/sitemap values retain the existing intended `kevilpatel.in` metadata; that is not proof of domain ownership or live configuration.

Root Markdown, `docs/` and `project-context/` are engineering documentation, not website or AI inputs; private Memory remains outside the project. If the source repository is public, review source/documentation disclosure separately—exclusion from `dist/` does not make a public repository private.

Routes and `/sw.js` have origin-root paths and scope `/`. Use the intended custom-domain root or an authorized user/organization Pages root. Plain `owner.github.io/repository/` hosting is **not supported** by this build; the release workflow explicitly rejects a nonempty Pages `base_path`. Do not fix this by broadening SW scope or blindly rewriting only asset paths. A subpath deployment needs a separately reviewed route/runtime/manifest/base migration.

## Workflow contract

| File | Trigger and permissions | Gate |
| --- | --- | --- |
| `.github/workflows/validate.yml` | `pull_request`, manual; `contents: read`, no deploy job | Node 24.9.0, npm ci, complete validation, Linux Chromium dependencies, full E2E/axe, final audit |
| `.github/workflows/deploy.yml` | push main, manual on main only | Same checks before Pages configuration/artifact upload; build job has contents/pages read, separate deployment job has only pages write + id-token write |

The `github-pages` environment receives the deployment URL output. Enable Pages **GitHub Actions** source and configure environment protection/approved branches/reviewers yourself only after release authorization. Configure-pages uses `enablement: false`: it does not enable Pages, register a domain or mutate DNS. No repository secrets, API keys, PATs or runtime `.env` are required. GitHub's short-lived token/OIDC permissions are platform-managed; checkout does not persist credentials.

PR validation never deploys, including fork PRs. There is no `pull_request_target` or privileged workflow-run handoff. Validation runs are canceled when superseded; releases are serialized and not canceled mid-deploy. GitHub may require an owner to approve fork workflow execution. Treat workflow/source edits as security-sensitive and require owner review.

Both pipelines generate real pinned CPU q8 embeddings through Build Brain. `.cache/atlas-models` is keyed by OS/architecture, lockfile, model declaration and semantic generator; no broad fallback key. PR jobs only restore this model cache. Main builds can populate it. Cache misses download public pinned model files and run real inference—no synthetic index fallback. Npm uses the exact lockfile. Chromium installs via `npm exec playwright install --with-deps chromium` on Ubuntu 24.04. Full's capability probe runs but CI does not set `ATLAS_REAL_FULL` or repeatedly download Qwen.

E2E uses `ATLAS_TEST_SKIP_BUILD=1` only after validation built/audited the artifact, so the uploaded bytes are the tested bytes. `ATLAS_TEST_PORT=4337` isolates the preview; no production process is involved. `npm run validate:workflows` parses YAML with duplicate-key rejection and tests triggers, versions, commands/order, permissions, paths, model cache inputs and deployment gates. This is local structural/semantic validation, **not proof of a GitHub-hosted run**.

Official release majors checked against the upstream release API and tagged action metadata on 2026-10-31: checkout v7 (7.0.1), setup-node v7 (7.1.0), cache v6 (6.1.0), configure-pages v6 (6.0.0), upload-pages-artifact v5 (5.0.0), deploy-pages v5 (5.0.1). These supported major tags intentionally track fixes; they are not immutable SHA pins. Verify upstream again when upgrading; never invent commit SHAs.

## Local gates and release recovery

Use `npm ci`, then `npm run validate`; install Chromium if needed and run `ATLAS_TEST_PORT=4337 npm run test:e2e -- --workers=2` with that port free. The default E2E path rebuilds itself. Never reuse another preview process. `npm run build:sw` regenerates only the postbuild snapshot after a complete Astro build; `npm run audit:public` checks an existing artifact.

Before a future release: obtain content/employer-safe publication approval, confirm root hosting and domain ownership independently, review the public audit, and run owner QA on the uploaded artifact. After an authorized deployment, smoke-test HTTPS, MIME types, deep links/404, scope, waiting-update flow across two tabs, and offline behavior on target browsers. None of those production checks has been run here.

**Normal releases do not change DNS.** One-time authorized domain ownership/DNS/Pages/HTTPS setup is separate from application publication. With that setup confirmed, approved main changes trigger the defined validation → complete artifact upload → Pages deployment path. Use [TESTING.md](TESTING.md) and the QA-owned [quality](docs/quality-report.md)/[performance](docs/performance.md) reports for current local results rather than old phase totals. Do not claim hosted success until the actual run and production checks are recorded.

For a future rollback, deploy a complete previously reviewed artifact or rebuild the approved source with its lockfile, and revalidate before publication. Never combine old HTML with new hashed assets or manually patch live caches. Existing tabs keep their verified build until update acceptance; reconnect and use the offline-only clear control for local recovery. See [offline policy](docs/offline.md).

GitHub Pages does not expose arbitrary response-header configuration. This task does not claim COOP/COEP cross-origin isolation or a response-header CSP. Single-thread Pocket WASM does not require SharedArrayBuffer. See [security limitations](SECURITY.md).