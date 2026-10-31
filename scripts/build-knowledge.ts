import { mkdir, writeFile } from 'node:fs/promises';
import { portfolio } from '../src/lib/content.ts';
import { contentHash, createArtifacts } from '../src/lib/knowledge.ts';
import { renderResume } from '../src/lib/resume.ts';
import { buildSemantic } from './build-semantic.ts';

const generated = new URL('../public/generated/', import.meta.url);
const assets = new URL('../public/assets/', import.meta.url);
await mkdir(generated, { recursive: true });
await mkdir(assets, { recursive: true });
const artifacts = createArtifacts(portfolio, await buildSemantic());
for (const [name, contents] of Object.entries(artifacts)) await writeFile(new URL(name, generated), contents, 'utf8');
await writeFile(new URL('kevil-patel-resume.md', assets), renderResume(portfolio), 'utf8');
console.info(`Generated ${Object.keys(artifacts).length} deterministic indexes and sanitized résumé. Content SHA-256: ${contentHash(portfolio)}`);