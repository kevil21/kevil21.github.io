/** Copies the exact ONNX Runtime Web files matching the locked @huggingface/transformers dependency into public/models/ort/. */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = new URL('../node_modules/onnxruntime-web/dist/', import.meta.url).pathname;
const out = new URL('../public/models/ort/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const files = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
for (const f of files) copyFileSync(join(src, f), join(out, f));
const version = (
  JSON.parse(
    readFileSync(new URL('../node_modules/onnxruntime-web/package.json', import.meta.url), 'utf8'),
  ) as { version: string }
).version;
writeFileSync(join(out, 'VERSION'), `${version}\n`);
console.info(`✓ ort runtime ${version}: ${files.join(', ')} → public/models/ort/`);
