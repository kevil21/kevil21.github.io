# Evidence Atlas — interview pack

Use the language below for the **implemented local project**, not as proof of deployment, benchmark superiority or independent career verification. [Implementation report](../IMPLEMENTATION-REPORT.md) · [Architecture](../ARCHITECTURE.md) · [Testing](../TESTING.md).

## 30-second pitch

Evidence Atlas is my static-first portfolio with optional local intelligence. Astro renders the complete portfolio from one validated content graph, so reading never depends on AI. A model-free Pocket worker retrieves source excerpts, and an opt-in MiniLM model adds real browser semantic search. A separate Full implementation uses constrained generation to select evidence, not invent a biography. The site also has versioned offline pages and safe UI tools. MiniLM has real build/browser validation; Full hardware execution and production deployment are still unverified.

## Two-minute architecture walkthrough

I started with the trust boundary: what is actually supported by the supplied résumé and portfolio snapshot? I migrated qualitative content into one JSON graph, removed unsupported outcome counts and private material, and retained credential caveats. Zod checks IDs, reciprocal project/skill/evidence links and safe destinations. It validates structure, not the truth of a claim.

At build time, Astro creates all reading routes and metadata. Build Brain creates ten versioned knowledge artifacts and a canonical Markdown résumé. It runs real pinned MiniLM q8 CPU inference over the excerpts to build semantic vectors. Using a shared schema lets the pages, generators and tests agree without a second authoring model.

The browser begins with ordinary HTML. TypeScript adds an SVG membership atlas, persona ordering, comparison and whole-token search. Pocket is a lazy worker with lexical and concept matching by default; it downloads no model for ordinary questions. Separate consent enables matching MiniLM inference through one-thread WASM. JD matching uses explicit evidence joins, labels uncertainty and never emits a fit percentage.

Full is a separate, consent- and capability-gated WebLLM worker. Its Qwen model generates JSON selections from Pocket's retrieved evidence IDs. Both worker and main thread validate the result, display canonical excerpts and require confirmation for model-suggested tools. Full is not free-form chat, and its genuine GPU execution still needs suitable hardware validation.

Finally, a generated service worker installs a finite, hash-checked static snapshot, excluding model downloads. Updates are explicit and version-consistent across tabs; model and page-cache controls stay separate. GitHub Pages workflows exist locally, but I would not claim deployment until the owner-approved hosted run and production smoke checks actually happen.

## Five strongest technical talking points

1. **A complete non-AI baseline:** static routes and real evidence anchors, no hydration framework or model-loading gate; fallback survives failed workers and corrupt indexes.
2. **Shared evidence graph:** one canonical JSON/Zod source feeds pages, résumé and build/runtime artifacts. A skill-project edge requires explicit shared evidence, not nearby labels.
3. **Real but optional learned retrieval:** pinned q8 MiniLM runs at build and in the browser with aligned tokenizer/pooling/normalization. Default Pocket remains honestly labeled lexical.
4. **Constrained generative boundary:** Full can select only retrieved IDs; exact excerpts are displayed and actions revalidated/confirmed. This limits fabrication without pretending to prove relevance or GPU compatibility.
5. **Independent, version-consistent offline delivery:** finite static allowlist, integrity checks, explicit all-tab update and separate model-cache controls. A cached model is not an offline-inference certificate.

## Ten likely questions and grounded answers

### 1. Why Astro instead of a client-rendered React application?

The core workload is reading a small portfolio. Astro emits complete HTML, while focused TypeScript enhances only interactions. That avoids making a hydration framework, router or AI runtime a prerequisite for reading. This is a fit-for-purpose decision, not a measured claim that React would always be slower.

### 2. Why canonical JSON with Zod instead of Astro Content Collections?

The same cross-linked graph is used outside Astro by Node generators, browser-safe types and tests. One JSON authoring source with shared Zod validation keeps reciprocal evidence references together. Content Collections are a valid alternative for larger file-based editorial workflows, but would add a loading layer here. Runtime message/corpus schemas still validate their separate trust boundaries.

### 3. Is Pocket actually AI?

Its default path is deterministic token/alias/concept retrieval, not learned embeddings. Optional MiniLM q8 provides genuine learned query embeddings after consent; both CPU build and Chromium WASM inference were validated. I deliberately distinguish worker execution from model inference and would evaluate relevance before claiming a quality improvement.

### 4. What does Full generate, and has it really run?

It is implemented using WebLLM and pinned Qwen, generating bounded JSON evidence-ID selections and optional tools. It does not display free-form factual prose or process pasted JD. The recorded Chromium probe had no usable WebGPU adapter/shader-f16, so genuine Full inference is unverified. Mocks cover failure and tool-confirmation behavior only.

### 5. How do you prevent hallucinations and prompt injection?

The prompt treats user input as data, but prompts are not the security boundary. Strict schemas restrict output to retrieved canonical IDs and allowlisted tools; extra prose, unknown IDs and unsupported actions are rejected. Text rendering uses original excerpts. This blocks invented displayed sentences and arbitrary execution, but irrelevant selections and false source claims remain possible.

### 6. How does the JD matcher avoid a misleading fit score?

It reviews bounded clauses locally. Strong Evidence requires explicit skill/project evidence joins for the recognized requirements; Related may be skill-list or semantic association; Not Demonstrated means the corpus cannot establish the requirement. Unsupported qualifiers, durations and instruction-like/negated text abstain. There is no overall fit score, inferred years or proficiency claim.

### 7. What happens on mobile or with reduced motion?

The same static content stacks into a readable list and inspector, with explicit keyboard/touch controls. Full is conservatively blocked on coarse-pointer and Save-Data devices, among other checks; it is not selected from screen size alone. Reduced motion cancels visual effects, not useful search/inference. Physical iOS/Android testing remains a separate gate.

### 8. What is private, and what still crosses the network?

Enhanced queries/JD are processed locally without deliberate upload, logging or persistence. Fixed public assets come from the static host and opted-in model hosts, which can see normal request metadata. Native no-JS GET search is explicitly different: its query enters URL/history and reaches the host. Cache clearing is scoped and does not promise secure memory or HTTP-cache erasure.

### 9. Does the PWA make every AI mode work offline?

No. The SW precaches public pages, initial assets, knowledge and model-free Pocket, with exact hashes and explicit updates. It excludes model SDK/weight/WASM precaching. Optional semantic/Full offline reload still requires end-to-end validation; SDK caches alone do not prove runtime availability, allocation or inference. First-ever offline visits cannot install it.

### 10. How would you release it, and what remains before calling it complete?

After authorization, place this standalone project's contents at the intended repository root. Main release validates/builds/tests/audits the exact `dist/` artifact, then a separate Pages/OIDC job publishes it to origin-root hosting. Normal releases do not change DNS. Remaining evidence includes Full-capable hardware, broader physical/manual/browser QA, final measured performance, content/credential approval, hosted workflows and actual production smoke tests. See the QA reports rather than reciting stale test counts or claiming all gates complete.