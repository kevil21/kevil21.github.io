import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintTokens } from '../../scripts/lint-tokens';

function fixture(files: Record<string, string>): { src: string; tokens: string } {
  const root = mkdtempSync(join(tmpdir(), 'sr-tokens-'));
  const src = join(root, 'src');
  const tokens = join(src, 'styles', 'tokens');
  mkdirSync(tokens, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const p = join(src, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, content);
  }
  return { src, tokens };
}

describe('token lint', () => {
  it('passes when colours only live in the token files and everything else uses var()', () => {
    const { src, tokens } = fixture({
      'styles/tokens/color.css': ':root { --ink: oklch(95% 0.012 85); --x: #fff; }',
      'components/Card.astro': '<style>.card{color:var(--ink);background:var(--surface)}</style>',
      'three/material.ts': "const c = tokenColor('--fill-amber');",
    });
    expect(lintTokens(src, tokens)).toEqual([]);
  });
  it('fails on hex, colour functions and named colours outside the token files', () => {
    const { src, tokens } = fixture({
      'styles/tokens/color.css': ':root { --ink: oklch(95% 0.012 85); }',
      'components/Bad.astro':
        '<style>.a{color:#ff0000}.b{background:rgb(1,2,3)}.c{border-color: red;}</style>',
      'three/bad.ts': "material.color.set(0xffffff); const s = 'oklch(50% 0 0)'; const tone = 'teal';",
      'shaders/bad.glsl': 'vec3 amber = vec3(0.95, 0.65, 0.17); // ok: not a css colour\n',
    });
    const v = lintTokens(src, tokens);
    const kinds = v.map((x) => `${x.file.split('/').pop()}:${x.kind}`);
    expect(kinds).toContain('Bad.astro:hex colour');
    expect(kinds).toContain('Bad.astro:colour function');
    expect(kinds).toContain('Bad.astro:named colour');
    expect(kinds).toContain('bad.ts:colour function');
    expect(kinds).not.toContain('bad.ts:named colour');
    expect(v.some((x) => x.file.endsWith('bad.glsl'))).toBe(false);
  });
  it('ignores source pointers, comments and asset url fragments', () => {
    const { src, tokens } = fixture({
      'styles/tokens/color.css': ':root { --ink: oklch(95% 0.012 85); }',
      'lib/profile.ts': "export const t = 'KPOS/site/index.html#L483'; // #fff would be fine in a comment",
      'components/Icon.astro': '<use href="/sprite.svg#amber" /><a href="#main">x</a>',
    });
    expect(lintTokens(src, tokens)).toEqual([]);
  });
  it('the real src/ tree is clean', () => {
    expect(lintTokens()).toEqual([]);
  });
});
