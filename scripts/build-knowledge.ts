/**
 * BUILD BRAIN (prebuild, also in CI). Validates the content, builds retrieval chunks, embeds them with the SAME pinned
 * MiniLM the browser uses (onnxruntime-node), and writes public/generated/*.json + ai-manifest.json.
 * No paid AI call. SKIP_EMBED=1 skips embeddings (lexical search is the deterministic fallback); an embedding failure
 * is a warning, never a build failure.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { validateContent } from './validate-content';
import { buildChunks, type ContentBundle } from '../src/ai/chunks';
import { encodeVectors } from '../src/ai/knowledge';
import { EMBEDDER, FULL_MODELS, TOOL_NAMES } from '../src/ai/config';
import { buildAnswers } from '../src/ai/answers';

const ROOT = new URL('..', import.meta.url).pathname;
const C = join(ROOT, 'src', 'content');
const OUT = join(ROOT, 'public', 'generated');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };

const load = (f: string) => JSON.parse(readFileSync(join(C, f), 'utf8')) as Record<string, unknown>[];

async function main() {
  const t0 = performance.now();
  const { errors, counts } = validateContent();
  if (errors.length) {
    console.error('✖ brain: content invalid');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  const bundle: ContentBundle = {
    profile: load('profile.json'),
    experience: load('experience.json'),
    education: load('education.json'),
    certifications: load('certifications.json'),
    projects: load('projects.json'),
    decisions: load('decisions.json'),
    skills: load('skills.json'),
    machines: load('machines.json'),
  };
  const chunks = buildChunks(bundle);
  const hash = createHash('sha256').update(JSON.stringify(chunks)).digest('hex').slice(0, 12);
  const version = `${pkg.version}+${hash}`;
  mkdirSync(OUT, { recursive: true });

  writeFileSync(
    join(OUT, 'knowledge-index.json'),
    JSON.stringify({ version, generatedAt: new Date().toISOString(), chunks }),
  );
  const answers = buildAnswers(bundle, chunks);
  writeFileSync(join(OUT, 'answer-index.json'), JSON.stringify({ version, answers }));
  writeFileSync(
    join(OUT, 'skill-graph.json'),
    JSON.stringify({
      version,
      skills: bundle.skills.map((s) => ({
        id: s['id'],
        name: s['name'],
        group: s['group'],
        usedIn: s['usedIn'] ?? [],
        aliases: s['aliases'] ?? [],
      })),
    }),
  );

  let semanticAvailable = false;
  if (process.env['SKIP_EMBED'] !== '1') {
    try {
      const te = performance.now();
      const tf = await import('@huggingface/transformers');
      tf.env.cacheDir = join(ROOT, '.cache', 'models');
      tf.env.allowLocalModels = false;
      const extractor = await tf.pipeline('feature-extraction', EMBEDDER.id, {
        dtype: EMBEDDER.dtype,
        revision: EMBEDDER.revision,
      });
      const vectors: Float32Array[] = [];
      const batch = 16;
      for (let i = 0; i < chunks.length; i += batch) {
        const texts = chunks.slice(i, i + batch).map((c) => c.text);
        const out = await extractor(texts, { pooling: 'mean', normalize: true });
        const data = out.data as Float32Array;
        for (let j = 0; j < texts.length; j++)
          vectors.push(new Float32Array(data.subarray(j * EMBEDDER.dims, (j + 1) * EMBEDDER.dims)));
      }
      writeFileSync(
        join(OUT, 'semantic-index.json'),
        JSON.stringify({
          version,
          model: `${EMBEDDER.id}@${EMBEDDER.revision}`,
          dtype: EMBEDDER.dtype,
          dims: EMBEDDER.dims,
          ids: chunks.map((c) => c.id),
          vectors: encodeVectors(vectors),
        }),
      );
      semanticAvailable = true;
      console.log(
        `✔ brain: ${vectors.length}×${EMBEDDER.dims} embeddings in ${((performance.now() - te) / 1000).toFixed(1)} s`,
      );
    } catch (e) {
      console.warn('⚠ brain: embedding failed, lexical search is the fallback:', (e as Error).message);
    }
  } else console.log('• brain: SKIP_EMBED=1, no semantic index');

  writeFileSync(
    join(OUT, 'ai-manifest.json'),
    JSON.stringify(
      {
        version,
        indexHash: hash,
        generatedAt: new Date().toISOString(),
        counts: { ...counts, chunks: chunks.length, answers: answers.length },
        pocket: {
          embedder: EMBEDDER.id,
          revision: EMBEDDER.revision,
          dtype: EMBEDDER.dtype,
          dims: EMBEDDER.dims,
          approxDownloadMB: EMBEDDER.approxDownloadMB,
          license: EMBEDDER.license,
        },
        full: { runtime: '@mlc-ai/web-llm 0.2.87', models: FULL_MODELS },
        tools: TOOL_NAMES,
        semanticAvailable,
        grounding: {
          groundedness: 'cited sentences ÷ sentences',
          coverage: 'retrieved chunks that were cited ÷ retrieved',
          refusal: 'answers declined for lack of evidence ÷ answers',
        },
      },
      null,
      2,
    ),
  );
  console.log(
    `✔ brain: ${chunks.length} chunks, ${answers.length} scripted answers, version ${version}, ${((performance.now() - t0) / 1000).toFixed(1)} s`,
  );
}

void main();
