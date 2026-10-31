import { onThemeChange, readColours, smooth } from './tokens';

export interface Series {
  activity: number[];
  lanes: Record<string, number[]>;
  labels: string[];
}

/** Canvas 2D renderer: the same lanes as the SVG, animated as slowly drifting waveforms. */
export function startCanvas(host: HTMLElement, series: Series, root: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  root.classList.add('is-gl');
  let colours = readColours();
  const off = onThemeChange(() => (colours = readColours()));
  const lanes = Object.entries(series.lanes).map(([name, v]) => ({ name, v: smooth(v, 2) }));
  const total = smooth(series.activity, 2);
  const max = Math.max(1, ...total);
  let raf = 0;
  let t0 = performance.now();
  let visible = true;
  const dpr = Math.min(1.5, devicePixelRatio || 1);

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const drawLane = (
    values: number[],
    colour: string,
    amp: number,
    base: number,
    phase: number,
    width: number,
  ) => {
    const W = canvas.width;
    const n = values.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * W;
      const wob = Math.sin(phase + i * 0.35) * 2 * dpr;
      const y = base - (values[i]! / max) * amp + wob;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = width * dpr;
    ctx.stroke();
  };

  const frame = (now: number) => {
    if (!visible) return;
    const t = (now - t0) / 1000;
    const H = canvas.height;
    ctx.clearRect(0, 0, canvas.width, H);
    ctx.globalAlpha = 0.55;
    lanes.forEach((l, k) =>
      drawLane(
        l.v,
        colours.lanes[l.name] ?? colours.trace,
        H * 0.5 - k * 14 * dpr,
        H - (20 + k * 14) * dpr,
        t * 0.6 + k,
        1.2,
      ),
    );
    ctx.globalAlpha = 0.95;
    drawLane(total, colours.signal, H * 0.7, H - 10 * dpr, t * 0.4, 2);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const io = new IntersectionObserver(([e]) => {
    visible = Boolean(e?.isIntersecting) && !document.hidden;
    if (visible) {
      t0 = performance.now() - 1;
      raf = requestAnimationFrame(frame);
    } else cancelAnimationFrame(raf);
  });
  io.observe(host);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) raf = requestAnimationFrame(frame);
    else cancelAnimationFrame(raf);
  });
  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    off();
  };
}
