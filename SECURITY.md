# Security

- **No secrets, no servers, no third-party calls at runtime** except model downloads from Hugging Face / the WebLLM
  model CDN, which the visitor opts into (semantic retrieval auto-loads only on fine-pointer, non-Save-Data devices;
  the language model never loads without an explicit click that shows the size first). No analytics, no fonts CDN.
- **Model pins:** `Xenova/all-MiniLM-L6-v2@751bff37182d3f1213fa05d7196b954e230abad9` (q8); WebLLM 0.2.87 prebuilt
  `Qwen2.5-0.5B/1.5B-Instruct-q4f16_1-MLC` (+ q4f32 twins). The worker refuses a semantic index whose model string
  does not match. Dependencies are exact-pinned (`save-exact`, `engine-strict`, `npm ci`).
- **Tools:** fixed registry validated by Zod (`src/ai/tools.ts`); ids/slugs checked against enums; ≤ 3 calls per
  answer; rendered as buttons; executed only on click; executors mutate stores or navigate to real routes, never
  arbitrary DOM or code. Model output is rendered as text; uncited sentences are dropped.
- **Content exclusions** are enforced at build: `scripts/verify-public.ts` greps every text file in `dist/` for the
  phone number, old canonical, `.docx`/Drive links, internal repository and infrastructure names, fictional tenants,
  mock dashboard numbers, excluded assets and the old chatbot's personal answers, and requires a `kevilpatel.in`
  canonical on every page. Images are re-encoded with all EXIF (including GPS) stripped.
- **GitHub Pages limits (honest):** no response headers → no Content-Security-Policy, COOP/COEP, HSTS preload or
  Permissions-Policy header. A `<meta>` CSP was not used because of the inline pre-paint script and WebGPU/WASM
  blob URLs. WASM therefore runs single-threaded. External links use `rel="noopener noreferrer external"`.
- **Service worker:** precaches only the shell and generated indexes; never intercepts `/models/` or the semantic index;
  cache names are content-hashed; HTML is network-first.
- **Reporting:** email kevilpatel24@gmail.com.
