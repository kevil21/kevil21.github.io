/**
 * Copies the wasm-only ONNX Runtime Web files from the locked `onnxruntime-web` into public/models/ort/ so the Pocket
 * worker loads them from our own origin (lazy), keeping the 26 MB asyncify/jsep artefacts out of the bundle (inherited).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');
const OUT = join(ROOT, 'public', 'models', 'ort');
const FILES = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];

mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  const from = join(SRC, f);
  if (!existsSync(from)) {
    console.error(`✖ copy-ort: missing ${from}`);
    process.exit(1);
  }
  copyFileSync(from, join(OUT, f));
}
const version = (
  JSON.parse(readFileSync(join(ROOT, 'node_modules', 'onnxruntime-web', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;
writeFileSync(join(OUT, 'VERSION'), `${version}\n`);
console.log(`✔ copy-ort: ${FILES.join(', ')} (onnxruntime-web ${version}) → public/models/ort/`);
