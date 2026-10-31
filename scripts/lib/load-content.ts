/** Node-side loader used by the Build Brain: reads content/ directly and validates with the shared schemas. */
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  certificationSchema,
  decisionSchema,
  educationSchema,
  evidenceSchema,
  experienceSchema,
  journeySchema,
  profileSchema,
  projectSchema,
  skillSchema,
  technologySchema,
  type KnowledgeData,
} from '../../src/lib/schema';

const ROOT = new URL('../../content/', import.meta.url);
const dir = (name: string) => join(ROOT.pathname, name);

function splitFrontmatter(raw: string): { data: unknown; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error('missing frontmatter');
  return { data: parseYaml(m[1] ?? ''), body: (m[2] ?? '').trim() };
}

function readMd<T>(
  folder: string,
  schema: { parse: (v: unknown) => T },
): (T & { id: string; body: string })[] {
  return readdirSync(dir(folder))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const { data, body } = splitFrontmatter(readFileSync(join(dir(folder), f), 'utf8'));
      try {
        return { id: basename(f, '.md'), ...schema.parse(data), body };
      } catch (err) {
        throw new Error(`${folder}/${f}: ${err instanceof Error ? err.message : String(err)}`, {
          cause: err,
        });
      }
    });
}

function readJsonArray<T>(file: string, schema: { parse: (v: unknown) => T }): T[] {
  const arr = JSON.parse(readFileSync(dir(file), 'utf8')) as unknown[];
  return arr.map((item, i) => {
    try {
      return schema.parse(item);
    } catch (err) {
      throw new Error(`${file}[${i}]: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }
  });
}

export function loadContentFromDisk(): KnowledgeData {
  const profileFiles = readdirSync(dir('profile')).filter((f) => f.endsWith('.json'));
  const profile = profileSchema.parse(
    JSON.parse(readFileSync(join(dir('profile'), profileFiles[0]!), 'utf8')),
  );
  return {
    profile,
    experience: readMd('experience', experienceSchema).sort((a, b) => a.order - b.order),
    projects: readMd('projects', projectSchema).sort((a, b) => a.order - b.order),
    skills: readJsonArray('skills/skills.json', skillSchema),
    technologies: readJsonArray('technologies/technologies.json', technologySchema),
    certifications: readJsonArray('certifications/certifications.json', certificationSchema),
    education: readJsonArray('education/education.json', educationSchema),
    decisions: readMd('decisions', decisionSchema).sort((a, b) => a.order - b.order),
    evidence: readJsonArray('evidence/evidence.json', evidenceSchema),
    journeys: readJsonArray('journeys/journeys.json', journeySchema),
  };
}
