import { describe, expect, it } from 'vitest';
import { validateContent } from '../../scripts/validate-content';
import { auditPublic, FORBIDDEN } from '../../scripts/verify-public';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;

describe('content collections', () => {
  it('cross-references are valid and the ledger-fixed counts hold', () => {
    const { errors, counts } = validateContent();
    expect(errors, errors.join('\n')).toEqual([]);
    expect(counts.certifications).toBe(10);
    expect(counts.machines).toBe(6);
    expect(counts.projects).toBe(9);
  });

  it('content files contain nothing from the exclusion list', () => {
    const files = [
      'profile.json',
      'experience.json',
      'education.json',
      'certifications.json',
      'projects.json',
      'decisions.json',
      'skills.json',
      'machines.json',
      'events.json',
      'case-studies/a360.md',
      'case-studies/p2p.md',
      'case-studies/forecasting.md',
      'case-studies/workbench.md',
    ];
    for (const f of files) {
      const text = readFileSync(join(ROOT, 'src', 'content', f), 'utf8');
      for (const { name, re } of FORBIDDEN) {
        expect(re.test(text), `${f} matches forbidden "${name}"`).toBe(false);
      }
    }
  });

  it('the built dist/ passes the public-output audit when present', () => {
    const dist = join(ROOT, 'dist');
    if (!existsSync(join(dist, 'index.html'))) return; // build not run in this environment
    const { failures } = auditPublic(dist);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
});
