import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import ts from 'typescript';
import { portfolio } from '../src/lib/content.ts';
import { createArtifacts, createCorpus } from '../src/lib/knowledge.ts';
import { validateSemantic } from '../src/ai/corpus.ts';
import { renderResume } from '../src/lib/resume.ts';
import { verifyOffline } from './verify-offline.ts';

const root = new URL('../dist/', import.meta.url);
let count = 0;
async function audit(directory: URL): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), `Symlink must not be published: ${entry.name}`);
    assert(!entry.name.startsWith('.'), `Hidden file must not be published: ${entry.name}`);
    const file = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) { await audit(file); continue; }
    const runtime = file.pathname.slice(root.pathname.length);
    const ort = ['models/ort/ort-wasm-simd-threaded.mjs', 'models/ort/ort-wasm-simd-threaded.wasm'].includes(runtime);
    const bundledOrt = /^_astro\/ort-wasm-simd-threaded\.asyncify-[\w-]+\.wasm$/.test(runtime);
    assert(ort || bundledOrt || entry.name === 'CNAME' || /\.(?:html|css|js|json|txt|md|xml|webmanifest|png|webp|jpg)$/.test(entry.name), `Unapproved public file: ${entry.name}`);
    const bytes = await readFile(file);
    if (ort || bundledOrt) {
      const dependency = bundledOrt ? 'ort-wasm-simd-threaded.asyncify.wasm' : entry.name;
      assert(bytes.equals(await readFile(new URL(`../node_modules/onnxruntime-web/dist/${dependency}`, import.meta.url))), `Runtime differs from locked dependency: ${entry.name}`);
    } else if (/\.(?:png|webp|jpg)$/.test(entry.name)) {
      const metadata = await sharp(bytes).metadata();
      assert(!metadata.exif && !metadata.xmp && !metadata.iptc, `Image metadata leaked: ${entry.name}`);
    } else {
      const raw = bytes.toString('utf8');
      // Compiled JS contains the publication denylist itself and arithmetic such as
      // +4294967296. Scan actual string/template values and identifiers, not regex/code.
      const literals: string[] = [];
      if (entry.name.endsWith('.js')) {
        const visit = (node: ts.Node) => {
          if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isIdentifier(node)) literals.push(node.text);
          ts.forEachChild(node, visit);
        };
        visit(ts.createSourceFile(entry.name, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
      }
      // Emscripten's exact virtual home is not a host filesystem path. This narrow
      // exception applies only to known SDK bundles, not public content or other paths.
      const sdk = /^_astro\/(?:full\.worker|transformers\.web)-[\w-]+\.js$/.test(runtime);
      const text = entry.name.endsWith('.js') ? literals.filter((value) => !(sdk && value === '/home/web_user')).join('\n') : raw;
      assert(!text.includes('/Users/') && !text.includes('/home/'), `Private filesystem path in ${entry.name}`);
      assert(!/(?:tel:|Memory\/|\.docx\b|authorized_users|\/subscriptions\/|\+\d[\d ()-]{8,}\d)/i.test(text), `Prohibited public text in ${entry.name}`);
    }
    count++;
  }
}
await audit(root);
await verifyOffline(root);
const corpus = createCorpus(portfolio);
const semantic = await validateSemantic(JSON.parse(await readFile(new URL('generated/semantic-index.json', root), 'utf8')), corpus.contentHash, corpus.corpusHash, corpus.data);
const artifacts = createArtifacts(portfolio, semantic);
assert.deepEqual((await readdir(new URL('generated/', root))).sort(), Object.keys(artifacts).sort(), 'Unexpected or missing generated artifacts');
for (const [name, content] of Object.entries(artifacts)) assert.equal(await readFile(new URL(`generated/${name}`, root), 'utf8'), content, `Stale generated artifact: ${name}`);
assert.equal(await readFile(new URL('assets/kevil-patel-resume.md', root), 'utf8'), renderResume(portfolio), 'Stale résumé');
assert.equal((await readFile(new URL('CNAME', root), 'utf8')).trim(), 'kevilpatel.in');
console.info(`Public output audit passed: ${count} files; exact canonical/index/résumé parity; image metadata stripped.`);