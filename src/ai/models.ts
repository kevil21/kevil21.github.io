/** Verified HF blobs + installed WebLLM 0.2.87 prebuilt config; no inference imports here. */
export const SEMANTIC = {
  id: 'Xenova/all-MiniLM-L6-v2', revision: '751bff37182d3f1213fa05d7196b954e230abad9',
  dtype: 'q8', dimensions: 384, pooling: 'mean', normalize: true,
  onnxBytes: 22972370, tokenizerBytes: 711661, license: 'Apache-2.0', runtime: '4.3.2',
} as const;
export const FULL = {
  id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', revision: '32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad',
  model: 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/32ff081fe7e4dfe4ffb167b94c66fdf11e02b8ad/',
  compilerRevision: '146ed9cd4b4062e967b017fd2291f7106b50599f',
  modelLib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/146ed9cd4b4062e967b017fd2291f7106b50599f/web-llm-models/v0_2_87/base/Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',
  weightBytes: 277996288, tokenizerBytes: 7031645, vendorVramMB: 944.62,
  context: 2048, license: 'Apache-2.0 (upstream Qwen)', runtime: '0.2.87',
} as const;
export const SEMANTIC_CACHE = 'atlas-semantic-v1';
export const FULL_CACHES = ['webllm/model', 'webllm/config', 'webllm/wasm'] as const;