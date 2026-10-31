import { describe, expect, it } from 'vitest';
import raw from '../../content/portfolio.json';
import { portfolio } from '../../src/lib/content.ts';
import { httpsUrlSchema, portfolioSchema } from '../../src/lib/schema.ts';

describe('public canonical contract', () => {
  it('migrates the full requested inventory', () => {
    expect(portfolio.projects).toHaveLength(9);
    expect(portfolio.experience).toHaveLength(3);
    expect(portfolio.certifications).toHaveLength(10);
    expect(portfolio.education).toHaveLength(3);
    expect(portfolio.skills).toHaveLength(47);
    expect(portfolio.projects.map((project) => project.domain)).toContain('craft');
    expect(portfolio.profile.role).toBe('Associate Software Development Engineer');
    expect(portfolio.education[0]?.period).toBe('2021 – 2025');
  });

  it.each([
    ['root', (data: Record<string, unknown>) => { data['private'] = true; }],
    ['nested', (data: Record<string, unknown>) => { (data['profile'] as Record<string, unknown>)['phone'] = 'not publishable'; }],
  ])('rejects unknown fields at %s', (_, mutate) => {
    const data = structuredClone(raw);
    mutate(data);
    expect(portfolioSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invalid, duplicate, and cross-category IDs', () => {
    for (const id of ['Not Safe', 'bad--id', 'kevil-patel', 'link-github', 'resume']) {
      const data = structuredClone(raw);
      data.projects[0]!.id = id;
      expect(portfolioSchema.safeParse(data).success).toBe(false);
    }
    const data = structuredClone(raw);
    data.certifications[1]!.id = data.certifications[0]!.id;
    expect(portfolioSchema.safeParse(data).success).toBe(false);
  });

  it('rejects dangling and duplicate evidence refs', () => {
    for (const refs of [['missing'], ['e-a360', 'e-a360'], []]) {
      const data = structuredClone(raw);
      data.projects[0]!.evidenceIds = refs;
      expect(portfolioSchema.safeParse(data).success).toBe(false);
    }
  });

  it('checks reciprocal evidence links in both directions', () => {
    const changes = [
      (data: typeof raw) => { data.evidence[0]!.projectIds = []; },
      (data: typeof raw) => { data.evidence[0]!.projectIds.push('missing-project'); },
      (data: typeof raw) => { data.evidence[0]!.skillIds.push('skill-java'); },
      (data: typeof raw) => { data.skills[0]!.evidenceIds.push('e-a360'); },
      (data: typeof raw) => { data.evidence[0]!.skillIds.push('missing-skill'); },
    ];
    for (const mutate of changes) {
      const data = structuredClone(raw);
      mutate(data);
      expect(portfolioSchema.safeParse(data).success).toBe(false);
    }
  });

  it('validates journey refs, persona, and all project domains', () => {
    const data = structuredClone(raw);
    data.journeys[0]!.projectIds.push('unknown-project');
    expect(portfolioSchema.safeParse(data).success).toBe(false);
    data.journeys[0]!.projectIds.pop();
    data.journeys[0]!.persona = 'visitor';
    expect(portfolioSchema.safeParse(data).success).toBe(false);
    data.journeys[0]!.persona = 'recruiter';
    data.projects[0]!.domain = 'unmapped';
    expect(portfolioSchema.safeParse(data).success).toBe(false);
  });

  it.each(['not a URL', 'javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', 'https://127.0.0.1', 'https://service.internal', 'https://example.com:8443'])('rejects unsafe link %s', (url) => {
    expect(httpsUrlSchema.safeParse(url).success).toBe(false);
  });

  it('keeps public profile URLs distinct from private filesystem paths', () => {
    expect(portfolioSchema.safeParse(raw).success).toBe(true);
    expect(httpsUrlSchema.safeParse('https://www.credly.com/users/kevil-patel.db5e53fa').success).toBe(true);
  });

  it.each(['tel:1234567890', '/Users/someone/private.md', 'Memory/private.md', 'private.docx', 'improved accuracy by 15%', 'served 500 households'])('rejects prohibited public text: %s', (text) => {
    const data = structuredClone(raw);
    data.profile.summary = text;
    expect(portfolioSchema.safeParse(data).success).toBe(false);
  });

  it('rejects invented certificate validity fields and oversized content', () => {
    const data = structuredClone(raw);
    Object.assign(data.certifications[0]!, { status: 'active' });
    expect(portfolioSchema.safeParse(data).success).toBe(false);
    expect(portfolioSchema.safeParse({ ...raw, resume: { ...raw.resume, summary: 'x'.repeat(4001) } }).success).toBe(false);
  });
});