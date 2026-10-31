import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kevilpatel.in',
  output: 'static',
  trailingSlash: 'always',
  vite: { worker: { format: 'es' }, build: { assetsInlineLimit: 0 } },
});