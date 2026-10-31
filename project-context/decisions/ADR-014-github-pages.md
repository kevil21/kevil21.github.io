# ADR-014 — Root-hosted, dist-only GitHub Pages

Status: workflow definitions implemented locally; not deployed · 2026-10-31.

## Context

The site needs static hosting, not an application server. The plan intends `kevilpatel.in` and `kevil21/portfolio`; neither live configuration nor repository identity is verified here.

## Decision

Place this standalone app's source contents at the authorized repository root. Read-only PR validation and a main-only release validate/build/test/audit before uploading only `dist/`; a separate Pages/OIDC job deploys. Reject nonempty Pages `base_path` because routes/SW scope are origin-root.

## Alternatives

Subpath Pages (requires broader path migration); server/SSR hosting; manual upload of the source tree; privileged PR deployment.

## Rationale

Static output fits Pages and least-privilege artifact delivery. Domain setup stays independent from normal app releases.

## Consequences

One-time authorized Pages/environment/domain/HTTPS setup is still required. Normal releases need no DNS changes, PAT or runtime secret. Private Memory and engineering docs are not website assets; public source disclosure needs separate review.

## Risks

No arbitrary custom response headers; Actions major tags are mutable, not SHA pins. Local YAML tests do not prove hosted execution or production MIME/update behavior.

## Validation

Inspected `.github/workflows/{validate,deploy}.yml` and local workflow contract coverage. No Git, hosted run or deployment claimed. [DEPLOYMENT](../../DEPLOYMENT.md) · [SECURITY](../../SECURITY.md).