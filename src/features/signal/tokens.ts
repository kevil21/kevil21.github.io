/** Reads the theme tokens renderers need and re-reads them on theme change. */
export interface SignalColours {
  bg: string;
  signal: string;
  trace: string;
  lanes: Record<string, string>;
}
const LANES = ['education', 'community', 'role', 'project', 'certification'];

export function readColours(): SignalColours {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string) => cs.getPropertyValue(name).trim();
  return {
    bg: get('--bg'),
    signal: get('--signal'),
    trace: get('--trace'),
    lanes: Object.fromEntries(LANES.map((l) => [l, get(`--kind-${l}`)])),
  };
}

/** Parse any CSS colour (incl. oklch) to RGB 0..1 via a canvas round-trip; cached per colour string. */
const cache = new Map<string, [number, number, number]>();
let probe: CanvasRenderingContext2D | null = null;
export function toRGB(css: string): [number, number, number] {
  const hit = cache.get(css);
  if (hit) return hit;
  if (!probe) probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return [1, 1, 1];
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  probe.clearRect(0, 0, 1, 1);
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  const rgb: [number, number, number] = [r! / 255, g! / 255, b! / 255];
  cache.set(css, rgb);
  return rgb;
}

export function onThemeChange(cb: () => void) {
  document.addEventListener('tracethemechange', cb);
  return () => document.removeEventListener('tracethemechange', cb);
}

export function smooth(values: number[], window = 2): number[] {
  return values.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = -window; k <= window; k++) {
      const v = values[i + k];
      if (v !== undefined) {
        s += v;
        n++;
      }
    }
    return s / n;
  });
}
