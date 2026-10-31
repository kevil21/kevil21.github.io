// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

// wasm-only, extern-wasm ONNX Runtime build (see vite.resolve.alias below)
const ortWasmOnly = fileURLToPath(
  new URL('./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs', import.meta.url),
);

export default defineConfig({
  site: 'https://kevilpatel.in',
  output: 'static',
  trailingSlash: 'always',
  integrations: [preact(), sitemap({ filter: (page) => !/\/(404|offline)\/?$/.test(page) })],
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: {
    worker: { format: 'es' },
    resolve: {
      alias: {
        // The Pocket Brain embedder runs on the WASM backend only (WebGPU is reserved for the LLM).
        // Aliasing to the extern-wasm, wasm-only ORT build keeps the 26 MB asyncify/jsep artefacts out of the bundle;
        // the runtime files are served from /models/ort/ (scripts/copy-ort.ts).
        'onnxruntime-web/webgpu': ortWasmOnly,
      },
    },
    build: {
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three/')) return 'three';
            if (id.includes('node_modules/gsap/')) return 'gsap';
            return undefined;
          },
        },
      },
    },
    optimizeDeps: { exclude: ['@huggingface/transformers', '@mlc-ai/web-llm'] },
  },
});
