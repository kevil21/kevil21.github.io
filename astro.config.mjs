// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

/**
 * kevilpatel.in — The Simulation Room.
 * Static output served from the root of GitHub Pages at https://kevilpatel.in (see public/CNAME).
 */
export default defineConfig({
  site: 'https://kevilpatel.in',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    preact(),
    sitemap({
      filter: (page) => !/\/(404|offline|lab-notebook)\/?$/.test(new URL(page).pathname.replace(/\/$/, '')),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
    assets: '_astro',
  },
  vite: {
    worker: { format: 'es' },
    resolve: {
      alias: {
        // Inherited lesson: keep the 26 MB asyncify/jsep ORT artefacts out of the bundle; the wasm-only runtime is
        // copied to /models/ort/ by scripts/copy-ort.ts and loaded lazily by the Pocket worker.
        'onnxruntime-web/webgpu': fileURLToPath(
          new URL('./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs', import.meta.url),
        ),
      },
    },
    optimizeDeps: {
      exclude: ['@huggingface/transformers', '@mlc-ai/web-llm', '@dimforge/rapier3d-compat'],
    },
    build: {
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three/')) return 'three';
            if (id.includes('node_modules/gsap/')) return 'gsap';
            if (id.includes('@dimforge/rapier3d-compat')) return 'rapier';
            return undefined;
          },
        },
      },
    },
  },
});
