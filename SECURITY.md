# Security

## Threat model
A public static site with on-device AI. Assets: the visitor's privacy (questions, pasted job
descriptions), integrity of the portfolio's claims, and the integrity of the deployed artefact.

## Controls
- **No secrets.** The repository holds no API keys; the Build Brain calls no paid service. The Hugging
  Face downloads (MiniLM in CI, model weights in the browser) are public, pinned by revision.
- **Privacy boundary (plan.md §14).** Questions, JD text and embeddings never leave the device; there is
  no analytics, no third-party font request, no fingerprinting. Caches can be cleared from the observatory.
- **Tool boundary.** The language model can only emit tool calls validated by Zod against a fixed
  registry; ids are slug-checked and matched against known node ids; calls are rendered as buttons and
  only run on the visitor's click; the executor never touches arbitrary DOM, never evaluates code.
- **Safe rendering.** Model output is rendered as text (Preact escapes it); Markdown bodies come from
  the repository's own content files only; external links use `rel="noopener noreferrer external"`.
- **Index integrity.** The worker validates `semantic-index.json` (version and embedder pin) before
  importing the SDK or downloading weights; a mismatch degrades to lexical search.
- **Public-output audit.** `scripts/verify-public.ts` fails the build if the phone number, private share
  links, internal repository names, local paths or the old `github.io` canonical appear in `dist/`.
- **Dependencies.** Exact versions (`save-exact`), `engine-strict`, lockfile committed; CI installs with
  `npm ci`. Run `npm audit --omit=dev` before a release.
- **Service worker.** Versioned by content hash; never intercepts `/models/`; old caches deleted on activate.

## Honest limitations of GitHub Pages
Pages cannot set response headers, so there is **no Content-Security-Policy, COOP/COEP, HSTS preload or
Permissions-Policy header**. Consequences: WebAssembly runs single-threaded (no `SharedArrayBuffer`),
and CSP would have to be a `<meta>` tag (not used, because inline pre-paint script and WebGPU/WASM
blob URLs would need broad allowances). TLS is managed by GitHub ("Enforce HTTPS").

## Reporting
Email kevilpatel24@gmail.com.
