import { mkdir, copyFile, stat } from 'node:fs/promises';
import { pipeline, env, LogLevel } from '@huggingface/transformers';
import { createCorpus, sha256, stableStringify } from '../src/lib/knowledge.ts';
import { portfolio } from '../src/lib/content.ts';
import { SEMANTIC } from '../src/ai/models.ts';
import { semanticSchema } from '../src/ai/corpus.ts';

/** Same graph for brain/build/CI: real q8 inference, pinned weights/runtime, no clock. */
export async function buildSemantic() {
  env.allowLocalModels = false;
  env.remotePathTemplate = `{model}/resolve/${SEMANTIC.revision}/`;
  env.cacheDir = new URL('../.cache/atlas-models/', import.meta.url).pathname;
  env.logLevel = LogLevel.NONE;
  const corpus = createCorpus(portfolio);
  const extractor = await pipeline('feature-extraction', SEMANTIC.id, {
    revision: SEMANTIC.revision, dtype: SEMANTIC.dtype, device: 'cpu',
    session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 },
  });
  const vectors = [];
  for (const evidence of corpus.data.evidence) {
    const result = await extractor(`${evidence.title} ${evidence.text}`, { pooling: 'mean', normalize: true });
    if (result.dims.at(-1) !== 384) throw new Error('Unexpected embedding dimensions');
    vectors.push({ id: evidence.id, values: Array.from(result.data, (v) => Number(Number(v).toFixed(6))) });
  }
  await extractor.dispose();
  const data = { model: SEMANTIC.id, revision: SEMANTIC.revision, runtime: SEMANTIC.runtime, dtype: SEMANTIC.dtype, dimensions: SEMANTIC.dimensions, pooling: SEMANTIC.pooling, normalize: SEMANTIC.normalize, vectors };
  // Publish ONLY the runtime files used by the single-thread WASM backend; no ONNX is shipped in core.
  const target = new URL('../public/models/ort/', import.meta.url);
  await mkdir(target, { recursive: true });
  for (const name of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
    const source = new URL(`../node_modules/onnxruntime-web/dist/${name}`, import.meta.url);
    const size = (await stat(source)).size;
    if (size > 30000000) throw new Error('Runtime asset exceeds reviewed bound');
    await copyFile(source, new URL(name, target));
  }
  return semanticSchema.parse({ schemaVersion: 1, contentHash: corpus.contentHash, corpusHash: corpus.corpusHash, vectorHash: sha256(stableStringify(data)), data });
}