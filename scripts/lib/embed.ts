/**
 * Build-time embeddings with the SAME model/revision/dtype the browser uses (src/ai/pocket/embedder.ts).
 * Runs on CPU in Node via onnxruntime-node. The downloaded model is cached in .cache/models (CI caches it).
 */
import { mkdirSync } from 'node:fs';
import type { Chunk, SemanticIndex } from '../../src/ai/protocol';
import { EMBEDDER } from '../../src/ai/pocket/embedder-config';

export { EMBEDDER };

export async function buildSemanticIndex(chunks: Chunk[], version: string): Promise<SemanticIndex> {
  const cacheDir = new URL('../../.cache/models/', import.meta.url).pathname;
  mkdirSync(cacheDir, { recursive: true });
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = cacheDir;
  env.allowLocalModels = true;
  const extractor = await pipeline('feature-extraction', EMBEDDER.id, {
    dtype: EMBEDDER.dtype,
    revision: EMBEDDER.revision,
  });
  const texts = chunks.map((c) => c.text);
  const out = new Float32Array(texts.length * EMBEDDER.dims);
  const batch = 16;
  for (let i = 0; i < texts.length; i += batch) {
    const slice = texts.slice(i, i + batch);
    const t = await extractor(slice, { pooling: 'mean', normalize: true });
    const data = t.data as Float32Array;
    out.set(data, i * EMBEDDER.dims);
    t.dispose?.();
  }
  await extractor.dispose?.();
  return {
    version,
    model: `${EMBEDDER.id}@${EMBEDDER.revision}:${EMBEDDER.dtype}`,
    dims: EMBEDDER.dims,
    ids: chunks.map((c) => c.id),
    vectors: Buffer.from(out.buffer).toString('base64'),
  };
}
