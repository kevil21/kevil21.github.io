/**
 * OKLCH → sRGB, so shaders, particles, canvas and SVG can read the CSS tokens.
 * Math from Björn Ottosson's OKLab reference (OKLab ↔ linear sRGB), then the sRGB transfer curve.
 */
export interface Rgba {
  r: number; // 0..1 (sRGB, gamma-encoded)
  g: number;
  b: number;
  a: number; // 0..1
}

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // degrees
  a: number; // 0..1
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(deg)?\s*(?:\/\s*([\d.]+)(%?)\s*)?\)$/i;

/** Parse a CSS `oklch(L C H [/ A])` string. L may be a percentage or 0..1. Returns null if not oklch(). */
export function parseOklch(input: string): Oklch | null {
  const m = OKLCH_RE.exec(input.trim());
  if (!m) return null;
  const lRaw = Number(m[1]);
  const l = m[2] === '%' ? lRaw / 100 : lRaw;
  const c = Number(m[3]);
  const h = Number(m[4]);
  let a = 1;
  if (m[6] !== undefined) {
    const aRaw = Number(m[6]);
    a = m[7] === '%' ? aRaw / 100 : aRaw;
  }
  return { l, c, h, a };
}

function linearToSrgb(x: number): number {
  const v = Math.min(1, Math.max(0, x));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** Convert OKLCH to gamma-encoded sRGB (clamped to gamut). */
export function oklchToRgba({ l, c, h, a }: Oklch): Rgba {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);

  const l_ = l + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = l - 0.0894841775 * A - 1.291485548 * B;

  const L = l_ * l_ * l_;
  const M = m_ * m_ * m_;
  const S = s_ * s_ * s_;

  const r = 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S;
  const g = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S;
  const b = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S;

  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b), a: Math.min(1, Math.max(0, a)) };
}

/** Convert OKLCH to a `#rrggbb` hex string (alpha dropped). */
export function oklchToHex(input: Oklch | string): string {
  const parsed = typeof input === 'string' ? parseOklch(input) : input;
  if (!parsed) throw new Error(`Not an OKLCH colour: ${String(input)}`);
  const { r, g, b } = oklchToRgba(parsed);
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Parse any colour string the bridge may meet: oklch() first, then #hex, rgb()/rgba(). */
export function parseCssColor(input: string): Rgba | null {
  const s = input.trim();
  const ok = parseOklch(s);
  if (ok) return oklchToRgba(ok);
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    const a = hex[2] ? parseInt(hex[2], 16) / 255 : 1;
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+)(%?))?\s*\)$/i.exec(s);
  if (rgb) {
    const a = rgb[4] !== undefined ? (rgb[5] === '%' ? Number(rgb[4]) / 100 : Number(rgb[4])) : 1;
    return { r: Number(rgb[1]) / 255, g: Number(rgb[2]) / 255, b: Number(rgb[3]) / 255, a };
  }
  return null;
}
