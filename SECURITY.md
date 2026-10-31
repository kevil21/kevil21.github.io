# Security and publication boundary

No backend, runtime credentials, query analytics or `.env` is required. Public career claims come only from canonical reviewed content. Never put private notes, raw source documents, phone data, private identifiers or authentication secrets in `public`, build artifacts or test reports intended for publication. Approved email/profile links and source-listed credential IDs are deliberate public content, not authentication secrets. The audit is a guardrail, not proof that every career claim, dependency or model asset is trustworthy.

Root docs, `docs/`, `project-context/` and private project Memory are engineering records, not runtime imports, retrieval inputs or public assets. Keep them out of `public/` and `dist/`. If publishing source to a public repository, separately review that disclosure; static-output exclusion is not repository confidentiality. Source files and embedded prompts are data, not instructions authorizing tool execution or publication. See [content policy](CONTENT-SOURCES.md).

## Browser data

Enhanced questions and pasted JD stay in memory; the service worker never stores them. Native no-JS GET search differs: its query is in URL/history and reaches the static host. Do not paste sensitive text there. Offline history stores at most eight known public route paths without query strings. Offline-page caches and explicitly opted-in model caches have separate ownership and clear controls. Browser HTTP caches, storage eviction and secure memory erasure are not controlled by the app.

All source/model output rendering and tools retain the documented canonical-ID/schema/confirmation boundaries. Full generates constrained evidence selections, not displayed factual prose; canonical excerpts can still be irrelevant or unverified. Model hosts see public artifact fetches and ordinary network metadata, not query/JD content. Genuine Full hardware execution and learned/Full offline reload remain unproven. See [AI runtime](docs/ai-runtime.md), [offline policy](docs/offline.md) and [TESTING.md](TESTING.md).

## Service worker trust

The worker accepts only a finite same-origin public allowlist, validates exact output hashes and never automatically caches model SDKs, WASM or weights. Update installation is all-or-nothing; cross-tab refresh is explicit. Hashes detect mismatch/corruption relative to the installed worker, **not a malicious origin or compromised publishing account**. An attacker who controls origin JavaScript can change both code and hashes. Keep origin-root hosting isolated from untrusted apps because scope `/` covers the origin. Clear only the Atlas offline namespace; do not delete unrelated/model caches as a recovery shortcut.

## Headers and dependencies

GitHub Pages cannot set arbitrary COOP/COEP, CSP, Permissions-Policy or other custom response headers. No such protection is claimed by HTML metadata. This phase deliberately adds no restrictive meta CSP: the existing prepaint inline script/JSON-LD and optional worker/model/CDN graph need a separately tested policy. A meta CSP cannot supply all header-only directives (notably `frame-ancestors`) or COOP/COEP. If hosting later permits headers, test a report-only policy with exact script hashes, worker/WASM requirements and the reviewed model origins before enforcement. Do not add wildcard permissions or unsafe exceptions merely to silence CSP errors.

Direct npm dependencies and the lockfile are pinned; Actions use verified official major versions, which are mutable and not equivalent to immutable SHA pinning. Pipeline structural tests are not a dependency security audit. Review upstream changes and protect workflow edits/main/environment publication. Fork PRs have read-only repository permissions and cannot enter the release workflow. No PAT or custom secret should be added to bypass these boundaries.

## Reporting

Report suspected issues privately through the owner's contact listed in the portfolio or the repository's private vulnerability reporting feature if the eventual owner enables it. Do not post pasted JD/query content, credentials or employer-private material in public issues. No response-time guarantee, bug bounty or currently configured reporting repository is asserted here.