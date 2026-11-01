import { describe, expect, it } from 'vitest';
import { oklchToHex, oklchToRgba, parseCssColor, parseOklch } from '@/theme/oklch';

describe('oklch parsing', () => {
  it('parses percentage lightness, chroma, hue and alpha', () => {
    expect(parseOklch('oklch(78% 0.155 72)')).toEqual({ l: 0.78, c: 0.155, h: 72, a: 1 });
    expect(parseOklch('oklch(0.3 0.016 262 / 0.55)')).toEqual({ l: 0.3, c: 0.016, h: 262, a: 0.55 });
    expect(parseOklch('oklch(30% 0.016 262deg / 55%)')).toEqual({ l: 0.3, c: 0.016, h: 262, a: 0.55 });
  });
  it('returns null for non-oklch input', () => {
    expect(parseOklch('#ffffff')).toBeNull();
    expect(parseOklch('rgb(1 2 3)')).toBeNull();
  });
});

describe('oklch → sRGB', () => {
  it('maps white and black', () => {
    expect(oklchToHex('oklch(100% 0 0)')).toBe('#ffffff');
    expect(oklchToHex('oklch(0% 0 0)')).toBe('#000000');
  });
  it('maps a neutral mid grey close to the CSS reference', () => {
    // oklch(50% 0 0) ≈ #636363 per CSS Color 4 reference implementations (±1 per channel)
    const { r, g, b } = oklchToRgba({ l: 0.5, c: 0, h: 0, a: 1 });
    expect(Math.round(r * 255)).toBeGreaterThanOrEqual(98);
    expect(Math.round(r * 255)).toBeLessThanOrEqual(100);
    expect(Math.round(g * 255)).toBe(Math.round(r * 255));
    expect(Math.round(b * 255)).toBe(Math.round(r * 255));
  });
  it('produces a warm amber for the practical-light token', () => {
    const { r, g, b } = oklchToRgba(parseOklch('oklch(78% 0.155 72)')!);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(r).toBeGreaterThan(0.9);
  });
  it('clamps out-of-gamut values instead of producing NaN', () => {
    const { r, g, b } = oklchToRgba({ l: 0.9, c: 0.4, h: 150, a: 1 });
    for (const v of [r, g, b]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('parseCssColor', () => {
  it('accepts oklch, hex and rgb forms', () => {
    expect(parseCssColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseCssColor('#ff000080')?.a).toBeCloseTo(0.5, 1);
    expect(parseCssColor('rgb(0, 0, 255)')).toEqual({ r: 0, g: 0, b: 1, a: 1 });
    expect(parseCssColor('rgba(0 0 255 / 0.5)')?.a).toBe(0.5);
    expect(parseCssColor('oklch(100% 0 0)')?.r).toBeCloseTo(1, 5);
  });
  it('rejects garbage', () => {
    expect(parseCssColor('tomato')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});
