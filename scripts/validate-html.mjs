import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { HtmlValidate } from 'html-validate';
import { decodeHTMLAttribute } from 'entities';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const validator = new HtmlValidate({ extends: ['html-validate:recommended'] });
const files = new Set(); const documents = new Map(); let links = 0; let images = 0;
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${entry.name}`);
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename); else files.add(filename);
  }
}
await walk(root);
for (const filename of files) {
  if (!filename.endsWith('.html')) continue;
  const html = await readFile(filename, 'utf8');
  const report = await validator.validateString(html, filename);
  assert(report.valid, JSON.stringify(report.results.flatMap((result) => result.messages.map(({ ruleId, message, selector }) => ({ filename: path.relative(root, filename), ruleId, message, selector }))), null, 2));
  const parser = await validator.getParserFor(filename);
  documents.set(filename, parser.parseHtml(html));
}
function resolveLocal(value, from) {
  const origin = 'https://kevilpatel.in';
  const url = new URL(decodeHTMLAttribute(value), new URL(`/${path.relative(root, from).replace(/index\.html$/, '')}`, origin));
  if (url.origin !== origin) {
    assert(['https:', 'http:', 'mailto:'].includes(url.protocol), `Unsafe destination ${value}`);
    return null; // No external HTTP/credential/ownership verification is claimed.
  }
  const pathname = decodeURIComponent(url.pathname);
  let filename = path.resolve(root, `.${pathname}`);
  assert(filename === root || filename.startsWith(`${root}${path.sep}`), `Escaping local destination ${value}`);
  if (!path.extname(filename)) filename = path.join(filename, 'index.html');
  assert(files.has(filename), `${path.relative(root, from)} → missing ${value}`);
  if (url.hash) {
    const dom = documents.get(filename);
    assert(dom, `Fragment on non-HTML file ${value}`);
    const id = decodeURIComponent(url.hash.slice(1));
    assert(dom.querySelectorAll('[id]').some((node) => decodeHTMLAttribute(node.id) === id), `Missing anchor ${value} from ${from}`);
  }
  return filename;
}
for (const [filename, dom] of documents) {
  for (const node of dom.querySelectorAll('[href], [src], [action], [srcset]')) {
    for (const attribute of ['href', 'src', 'action']) {
      const value = node.getAttributeValue(attribute);
      if (typeof value === 'string') { resolveLocal(value, filename); links++; }
    }
    const srcset = node.getAttributeValue('srcset');
    if (typeof srcset === 'string') for (const candidate of srcset.split(',')) {
      const [value, descriptor] = candidate.trim().split(/\s+/);
      assert(value && descriptor && /^\d+(?:\.\d+)?[wx]$/.test(descriptor), `Invalid responsive image candidate ${candidate}`);
      resolveLocal(value, filename); images++;
    }
    if (node.tagName === 'img') {
      for (const dimension of ['width', 'height']) assert(Number(node.getAttributeValue(dimension)) > 0, `Missing image ${dimension} in ${filename}`);
    }
  }
}
console.info(`HTML validation passed: ${documents.size} pages; ${links} href/src/action references; ${images} srcset candidates; no rules disabled. External destinations not fetched.`);