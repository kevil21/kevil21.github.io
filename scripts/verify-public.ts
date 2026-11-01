/**
 * Public-output audit (prompt §9): fails the build if anything from the exclusion list reaches dist/, or if any HTML page
 * (except 404) lacks a `https://kevilpatel.in` canonical. Run after `astro build`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const TEXT_EXT = new Set([
  '.html',
  '.js',
  '.mjs',
  '.json',
  '.xml',
  '.txt',
  '.webmanifest',
  '.css',
  '.svg',
  '.md',
]);

/** Patterns from Memory/SIMULATION-ROOM/fact-ledger.md §I. Case-insensitive where it makes sense. */
export const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: 'phone number', re: /9998967939|999\s?896\s?7939/ },
  { name: 'twitter handle', re: /kevil_36/i },
  { name: 'old canonical', re: /kevil21\.github\.io/i },
  { name: 'docx résumé', re: /Kevil_Resume_\d+\.docx/i },
  { name: 'google drive', re: /drive\.google\.com/i },
  { name: 'internal org', re: /kyndryl-agentic-ai/i },
  {
    name: 'internal repo',
    re: /\bagentic-(a360|api-gateway|adx|cosmos|synth|insight|telemetry|admin|azure)[\w-]*/i,
  },
  { name: 'internal repo', re: /signal-processing-framework/i },
  {
    name: 'internal db naming',
    re: /acct-\{tenant\}|a360-platform|a360-metadata-tenant|authorized_users|a360\.kyndryl\.io/i,
  },
  { name: 'fictional tenant', re: /\bcontoso\b|acme-prod|acme-stg|CLD-14(28|31)/i },
  { name: 'mock dashboard number', re: /412\s?ms|\b87\.3\b|\$0\.42/ },
  { name: 'excluded asset', re: /tree\.jpg|assets\/og\.svg/i },
  // The old chatbot's personal answers (hobbies/salary/weakness). The Operator legitimately names these topics in order
  // to decline them, so the audit matches the excluded ANSWER content, not the words.
  {
    name: 'excluded chatbot answer',
    re: /photography and travel|competitive programming|my (current )?(salary|compensation) is|biggest weakness/i,
  },
  { name: 'local path', re: /\/Users\/kevil\//i },
  { name: 'memory path', re: /Memory\/(SIMULATION-ROOM|KPOS|TRACE|Atlas)/ },
  { name: 'internal docs', re: /Projects\/(a360|p2p)\.md/i },
  { name: 'unquantified claim', re: /millions of agent traces/i },
  { name: 'active-cert claim', re: /\b10 active certifications\b/i },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export interface AuditFailure {
  file: string;
  reason: string;
}

export function auditPublic(dist = DIST): { files: number; failures: AuditFailure[] } {
  const failures: AuditFailure[] = [];
  const files = walk(dist);
  for (const f of files) {
    const rel = relative(dist, f);
    const ext = extname(f);
    if (!TEXT_EXT.has(ext)) continue;
    // Vendored model runtimes and third-party chunks are scanned too; nothing is exempt.
    const text = readFileSync(f, 'utf8');
    for (const { name, re } of FORBIDDEN) {
      if (re.test(text)) failures.push({ file: rel, reason: `${name}: ${re.source}` });
    }
    if (ext === '.html' && !/^404\.html$/.test(rel)) {
      const m = /<link rel="canonical" href="([^"]+)"/.exec(text);
      if (!m) failures.push({ file: rel, reason: 'missing canonical' });
      else if (!m[1]!.startsWith('https://kevilpatel.in/'))
        failures.push({ file: rel, reason: `canonical ${m[1]}` });
    }
  }
  const cname = readFileSync(join(dist, 'CNAME'), 'utf8').trim();
  if (cname !== 'kevilpatel.in')
    failures.push({ file: 'CNAME', reason: `expected kevilpatel.in, got "${cname}"` });
  return { files: files.length, failures };
}

if (process.argv[1] && /verify-public\.ts$/.test(process.argv[1])) {
  const { files, failures } = auditPublic();
  if (failures.length) {
    console.error(`✖ public-output audit: ${failures.length} failure(s) across ${files} files`);
    for (const f of failures) console.error(`  ${f.file}: ${f.reason}`);
    process.exit(1);
  }
  console.log(`✔ public-output audit: ${files} files clean, canonical https://kevilpatel.in on every page`);
}
