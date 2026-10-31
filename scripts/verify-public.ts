/**
 * Public-output audit: fails the build if anything from the exclusion list leaks into dist/.
 * (phone number, private share links, internal repo names, the old GitHub Pages hostname as canonical).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'phone number', re: /\+91[\s-]?9{3}[\s-]?896[\s-]?7939|9998967939/ },
  { name: 'Google Drive share link', re: /drive\.google\.com\/file/ },
  {
    name: 'internal repo name',
    re: /agentic-(a360-app-project|api-gateway|adx-to-elastic-sync|cosmos-adx-sync|synth-gen-project|a360-boarding-function|insight-generation-engine|a360-es-insight-curation|telemetry-exporter-app|admin-portal|azure-project-docs)/,
  },
  { name: 'internal naming pattern', re: /acct-\{tenant\}|a360-metadata-tenant/ },
  { name: 'github.io canonical', re: /<link rel="canonical" href="https:\/\/kevil21\.github\.io/ },
  { name: 'local filesystem path', re: /\/Users\/kevil\// },
  { name: 'memory directory reference', re: /Memory\/TRACE|Memory\/KPOS/ },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST).filter((p) => /\.(html|js|json|xml|txt|webmanifest|css|svg)$/.test(p));
const problems: string[] = [];
let html = 0;
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (f.endsWith('.html')) {
    html++;
    if (!/<link rel="canonical" href="https:\/\/kevilpatel\.in\//.test(text) && !f.endsWith('404.html'))
      problems.push(`${relative(DIST, f)}: missing kevilpatel.in canonical`);
  }
  for (const { name, re } of PATTERNS)
    if (re.test(text)) problems.push(`${relative(DIST, f)}: contains ${name}`);
}
if (problems.length) {
  console.error('✗ public audit failed:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
console.info(`✓ public audit: ${files.length} files (${html} HTML) clean`);
