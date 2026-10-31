import { pocketRequest, boundedJSON } from '../protocol';
import { validateCorpus, validateSemantic } from '../corpus';
import type { Corpus, SemanticIndex } from '../corpus';
import { acceptedSemantic, matchJD, rankSemantic, retrieve, semanticJDAllowed, unsafeRequirement } from '../retrieval';
import type { SemanticMatch } from '../retrieval';
import { SEMANTIC, SEMANTIC_CACHE } from '../models';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

let corpus: Corpus | undefined;
let hashes = { contentHash: '', corpusHash: '' };
let extractor: FeatureExtractionPipeline | undefined;
let semantic: SemanticIndex | undefined;
let queue = Promise.resolve();
async function handle(input: unknown) {
  const message = pocketRequest.parse(input);
  const { id, type } = message;
  try {
    if (type === 'init') {
      hashes = message;
      corpus = await validateCorpus(await boundedJSON('/generated/pocket-corpus.json'), message.contentHash, message.corpusHash);
      postMessage({ id, type: 'ready' }); return;
    }
    if (!corpus) throw new Error('Not initialized');
    if (type === 'semantic') {
      semantic = await validateSemantic(await boundedJSON('/generated/semantic-index.json'), hashes.contentHash, hashes.corpusHash, corpus);
      // The ONLY import site; this branch is reached on explicit consent, never from a query.
      const { pipeline, env, LogLevel } = await import('@huggingface/transformers');
      env.allowLocalModels = false; env.logLevel = LogLevel.NONE; env.cacheKey = SEMANTIC_CACHE;
      // v4's pipeline task detection can otherwise request config from main.
      env.remotePathTemplate = `{model}/resolve/${SEMANTIC.revision}/`;
      Object.assign(env.backends.onnx.wasm!, { numThreads: 1, proxy: false, wasmPaths: { mjs: `${self.location.origin}/models/ort/ort-wasm-simd-threaded.mjs`, wasm: `${self.location.origin}/models/ort/ort-wasm-simd-threaded.wasm` } });
      extractor = await pipeline('feature-extraction', SEMANTIC.id, { revision: SEMANTIC.revision, dtype: 'q8', device: 'wasm', progress_callback: (p) => { if ('progress' in p) postMessage({ id, type: 'progress', progress: p.progress }); } });
      postMessage({ id, type: 'semantic-ready' }); return;
    }
    if (type === 'jd') {
      const rows = matchJD(message.text, corpus, message.persona);
      const matches: SemanticMatch[][] = []; let inferences = 0; const started = performance.now();
      for (const row of rows) {
        if (extractor && semantic && semanticJDAllowed(row, corpus)) {
          const output = await extractor(row.requirement, { pooling: 'mean', normalize: true });
          matches.push(rankSemantic(Array.from(output.data, Number), semantic)); inferences++;
        } else matches.push([]);
      }
      postMessage({ id, type: 'jd', matches, inferences, elapsedMs: performance.now() - started }); return;
    }
    let evidenceIds = retrieve(message.query, corpus, message.persona, message.context);
    const started = performance.now(); let inferences = 0;
    if (extractor && semantic && !unsafeRequirement(message.query) && message.query.trim()) {
      const output = await extractor(message.query, { pooling: 'mean', normalize: true });
      const v = Array.from(output.data, Number);
      const ranked = acceptedSemantic(rankSemantic(v, semantic), corpus); inferences++;
      evidenceIds = [...new Set([...evidenceIds.slice(0, 3), ...ranked, ...evidenceIds])].slice(0, 6);
    }
    postMessage({ id, type: 'answer', evidenceIds, inferences, elapsedMs: performance.now() - started, mode: extractor ? 'learned-semantic-plus-lexical' : 'lexical-concepts-not-learned' });
  } catch { postMessage({ id, type: 'error', reason: type === 'semantic' ? 'semantic-load-or-inference-failed' : 'pocket-failed' }); }
}
self.onmessage = (event: MessageEvent<unknown>) => { queue = queue.then(() => handle(event.data)).catch(() => { postMessage({ type: 'fatal' }); }); };