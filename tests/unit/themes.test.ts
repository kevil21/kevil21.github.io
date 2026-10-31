import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const themes = readFileSync(new URL('../../src/styles/themes.css', import.meta.url), 'utf8');
const palette = (mode: 0 | 1): Record<string, string> => Object.fromEntries(
  [...themes.matchAll(/--([a-z-]+):\s*light-dark\((#[a-f0-9]{6}), (#[a-f0-9]{6})\)/gi)].map((match) => [match[1]!, match[mode + 2]!]),
);
const luminance = (hex: string): number => {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
};
const contrast = (a: string, b: string): number => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
};

describe('theme and motion foundations', () => {
  for (const mode of [0, 1] as const) {
    it(`meets normal-text and boundary contrast for ${mode === 0 ? 'light' : 'dark'}`, () => {
      const colors = palette(mode);
      for (const background of ['bg', 'surface', 'surface-alt']) {
        for (const foreground of ['text', 'muted', 'accent', 'success', 'warning', 'danger']) {
          expect(contrast(colors[foreground]!, colors[background]!), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(colors['border']!, colors[background]!)).toBeGreaterThanOrEqual(3);
      }
      expect(contrast(colors['on-accent']!, colors['accent']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors['text']!, colors['accent-soft']!)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('defines every promised semantic alias and explicit theme choice', () => {
    for (const token of ['bg', 'surface', 'surface-alt', 'text', 'muted', 'border', 'accent', 'accent-soft', 'success', 'warning', 'danger', 'focus', 'shadow', 'overlay', 'diagram-line', 'code-bg', 'code-text', 'status-positive', 'status-pending']) expect(themes).toContain(`--${token}:`);
    expect(themes).toContain(':root[data-theme="light"]');
    expect(themes).toContain(':root[data-theme="dark"]');
  });
  it('keeps colors out of other foundation CSS and supports reduced motion', () => {
    for (const name of ['tokens', 'reset']) {
      const css = readFileSync(new URL(`../../src/styles/${name}.css`, import.meta.url), 'utf8');
      expect(css).not.toMatch(/#[a-f0-9]{3,8}\b|(?:rgb|hsl|oklch)\(/i);
      expect(css).toContain('prefers-reduced-motion: reduce');
    }
    const tokens = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
    for (const duration of [0, 120, 240, 420, 650]) expect(tokens).toContain(`: ${duration}ms;`);
  });
});