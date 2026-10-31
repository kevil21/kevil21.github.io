/**
 * Three.js renderer for the signal field. Each lane is a line whose vertices follow the real
 * monthly activity; a vertex shader adds a slow travelling wave and the pointer parallax.
 * Colours are uniforms read from the theme tokens and updated live on `tracethemechange`.
 */
import { onThemeChange, readColours, smooth, toRGB } from './tokens';
import type { Series } from './canvas';

export async function startWebGL(host: HTMLElement, series: Series, root: HTMLElement) {
  const THREE = await import('three');
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.setSize(width, height, false);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  host.replaceChildren(renderer.domElement);
  root.classList.add('is-gl');

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
  const total = smooth(series.activity, 2);
  const max = Math.max(1, ...total);
  const laneEntries = Object.entries(series.lanes).map(([name, v]) => ({ name, v: smooth(v, 2) }));

  const vert = /* glsl */ `
    uniform float uTime; uniform float uPhase; uniform float uAmp; uniform float uBase; uniform float uMax; uniform vec2 uPointer;
    attribute float aValue; attribute float aIndex;
    varying float vIntensity;
    void main() {
      float x = position.x;
      float wave = sin(uTime * 0.6 + uPhase + aIndex * 0.35) * 0.006;
      float parallax = (uPointer.x - 0.5) * 0.01 * (1.0 - uBase);
      float y = uBase + (aValue / uMax) * uAmp + wave + (uPointer.y - 0.5) * 0.01;
      vIntensity = aValue / uMax;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(x + parallax, y, 0.0, 1.0);
    }`;
  const frag = /* glsl */ `
    uniform vec3 uColor; uniform float uOpacity;
    varying float vIntensity;
    void main() { gl_FragColor = vec4(uColor, uOpacity * (0.45 + 0.55 * vIntensity)); }`;

  const makeLine = (
    values: number[],
    colour: [number, number, number],
    amp: number,
    base: number,
    phase: number,
    opacity: number,
  ) => {
    const n = values.length;
    const pos = new Float32Array(n * 3);
    const val = new Float32Array(n);
    const idx = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = i / (n - 1);
      val[i] = values[i]!;
      idx[i] = i;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aValue', new THREE.BufferAttribute(val, 1));
    geo.setAttribute('aIndex', new THREE.BufferAttribute(idx, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: phase },
        uAmp: { value: amp },
        uBase: { value: base },
        uMax: { value: max },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uColor: { value: new THREE.Color(...colour) },
        uOpacity: { value: opacity },
      },
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return { line, mat };
  };

  let colours = readColours();
  const lines = laneEntries.map((l, k) =>
    makeLine(
      l.v,
      toRGB(colours.lanes[l.name] ?? colours.trace),
      0.5 - k * 0.04,
      0.06 + k * 0.045,
      k * 1.3,
      0.6,
    ),
  );
  const main = makeLine(total, toRGB(colours.signal), 0.72, 0.03, 0, 0.95);
  // a second, thicker pass of the main signal for a soft glow
  const glow = makeLine(total, toRGB(colours.signal), 0.72, 0.03, 0, 0.25);
  glow.mat.uniforms.uAmp!.value = 0.725;

  const offTheme = onThemeChange(() => {
    colours = readColours();
    lines.forEach((l, k) =>
      l.mat.uniforms.uColor!.value.set(...toRGB(colours.lanes[laneEntries[k]!.name] ?? colours.trace)),
    );
    main.mat.uniforms.uColor!.value.set(...toRGB(colours.signal));
    glow.mat.uniforms.uColor!.value.set(...toRGB(colours.signal));
  });

  const pointer = new THREE.Vector2(0.5, 0.5);
  const target = new THREE.Vector2(0.5, 0.5);
  const onMove = (e: PointerEvent) => {
    target.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
  };
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', onMove, { passive: true });

  let raf = 0;
  let visible = true;
  const t0 = performance.now();
  const tick = (now: number) => {
    if (!visible) return;
    const t = (now - t0) / 1000;
    pointer.lerp(target, 0.04);
    for (const { mat } of [...lines, main, glow]) {
      mat.uniforms.uTime!.value = t;
      mat.uniforms.uPointer!.value.copy(pointer);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const ro = new ResizeObserver(() => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
  });
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = Boolean(e?.isIntersecting) && !document.hidden;
    if (visible) raf = requestAnimationFrame(tick);
    else cancelAnimationFrame(raf);
  });
  io.observe(host);
  const onVis = () => {
    visible = !document.hidden;
    if (visible) raf = requestAnimationFrame(tick);
    else cancelAnimationFrame(raf);
  };
  document.addEventListener('visibilitychange', onVis);
  renderer.domElement.addEventListener('webglcontextlost', () => {
    cancelAnimationFrame(raf);
    root.classList.remove('is-gl');
  });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    offTheme();
    removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onVis);
    renderer.dispose();
  };
}
