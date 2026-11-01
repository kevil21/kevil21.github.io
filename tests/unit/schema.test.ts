import { describe, expect, it } from 'vitest';
import { claim, certificationSchema, dateRange, sourcePointer, ledgerId } from '@/lib/schema';

describe('source pointers', () => {
  it('accepts KPOS and info.md pointers with line ranges', () => {
    for (const ok of [
      'KPOS/site/index.html#L481',
      'KPOS/site/app.js#L1602-L1611',
      'KPOS/site/app.js#L1602-1611',
      'KPOS/site/Kevil_Resume_2026.md#L27',
      'info.md#L104',
    ]) {
      expect(sourcePointer.safeParse(ok).success, ok).toBe(true);
    }
  });
  it('rejects anything that is not a KPOS or info.md pointer', () => {
    for (const bad of [
      'Projects/a360.md#L3',
      'KPOS/site/index.html',
      'https://kevilpatel.in/',
      'Memory/SIMULATION-ROOM/fact-ledger.md#L10',
      'kevilpatel-next/content/portfolio.json#L1',
      '',
    ]) {
      expect(sourcePointer.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('claims', () => {
  it('requires a source on every claim', () => {
    expect(claim.safeParse({ text: 'Lead developer on A360' }).success).toBe(false);
    expect(
      claim.safeParse({ text: 'Lead developer on A360', source: 'KPOS/site/Kevil_Resume_2026.md#L27' })
        .success,
    ).toBe(true);
  });
  it('defaults the label to public and accepts the résumé label', () => {
    const parsed = claim.parse({
      text: '31 materialized views',
      source: 'KPOS/site/Kevil_Resume_2026.md#L78',
      label: 'resume',
    });
    expect(parsed.label).toBe('resume');
    expect(claim.parse({ text: 'x', source: 'KPOS/a#L1' }).label).toBe('public');
  });
  it('validates ledger ids', () => {
    expect(ledgerId.safeParse('F-C15').success).toBe(true);
    expect(ledgerId.safeParse('F-C08b').success).toBe(true);
    expect(ledgerId.safeParse('C-01').success).toBe(false);
  });
});

describe('dates and certifications', () => {
  it('accepts month and year precision with a source', () => {
    expect(
      dateRange.safeParse({ start: '2025-07', end: 'present', source: 'KPOS/site/index.html#L481' }).success,
    ).toBe(true);
    expect(
      dateRange.safeParse({
        start: '2021',
        end: '2025',
        precision: 'year',
        source: 'KPOS/site/index.html#L746',
      }).success,
    ).toBe(true);
    expect(dateRange.safeParse({ start: 'July 2025', source: 'KPOS/site/index.html#L481' }).success).toBe(
      false,
    );
  });
  it('requires an issued source when an issue month is given (info.md)', () => {
    const base = {
      name: 'AWS Certified Solutions Architect – Associate (SAA-C03)',
      issuer: 'AWS',
      credentialId: '3d7ecea14b4342659eb4d68cdc9fbc37',
      source: 'KPOS/site/index.html#L649-L655',
      ledger: 'F-E01',
      order: 1,
    };
    expect(
      certificationSchema.safeParse({ ...base, issued: '2024-09', issuedSource: 'info.md#L104' }).success,
    ).toBe(true);
    expect(certificationSchema.safeParse({ ...base, issued: 'Sep 2024' }).success).toBe(false);
  });
});
