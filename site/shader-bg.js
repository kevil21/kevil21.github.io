/* ==== Kevil.OS ambient bg — v3.2 ====
   Subtle 2D canvas: two barely-visible radial blobs drifting slowly,
   theme-aware, mouse-reactive at ~5% influence. No WebGL, no fragments. */
(function ambientBg() {
  if (window.__SHADER_BG_LOADED__) return;
  window.__SHADER_BG_LOADED__ = true;

  let canvas = document.getElementById('shader-bg');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'shader-bg';
    const inject = () => document.body && document.body.insertBefore(canvas, document.body.firstChild);
    if (document.body) inject(); else window.addEventListener('DOMContentLoaded', inject);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.style.display = 'none'; return; }

  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize(); window.addEventListener('resize', resize);

  // Mouse — 5% influence (target → smoothed → applied with 0.05 weight)
  let tmx = W / 2, tmy = H / 2, smx = tmx, smy = tmy;
  window.addEventListener('mousemove', e => { tmx = e.clientX; tmy = e.clientY; }, { passive: true });

  // Scroll — shifts blobs so background feels alive as you traverse the page
  let scrollY = 0, smScrollY = 0;
  const updScroll = () => { scrollY = window.scrollY || document.documentElement.scrollTop || 0; };
  window.addEventListener('scroll', updScroll, { passive: true });
  updScroll();

  // Theme palettes — soft, low-saturation
  const palettes = {
    dark: [
      { color: 'rgba(125,249,255,', alpha: 0.10 },  // cyan
      { color: 'rgba(255,110,199,', alpha: 0.08 }   // pink
    ],
    light: [
      { color: 'rgba(125,180,220,', alpha: 0.14 },  // pale blue
      { color: 'rgba(180,150,220,', alpha: 0.10 }   // pale lavender
    ]
  };

  function draw(t) {
    if (document.documentElement.classList.contains('lite-mode')) { requestAnimationFrame(draw); return; }
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const pal = palettes[theme];
    const time = t * 0.00012; // very slow drift

    // Smooth mouse with low gain
    smx += (tmx - smx) * 0.04;
    smy += (tmy - smy) * 0.04;
    smScrollY += (scrollY - smScrollY) * 0.06;
    const mxNorm = (smx / W - 0.5) * 2; // -1..1
    const myNorm = (smy / H - 0.5) * 2;
    const mInfl = 0.05; // 5% mouse influence
    // Normalize scroll across the document — full traverse moves a blob ~half a viewport
    const docH = Math.max(1, document.documentElement.scrollHeight - H);
    const sNorm = Math.max(0, Math.min(1, smScrollY / docH));

    ctx.clearRect(0, 0, W, H);

    // Bigger, slower blobs that drift AND scroll-shift
    const bigR = Math.max(W, H) * 0.78;

    // Blob 1 — upper-left bias, drifts down as you scroll
    const b1x = W * (0.28 + 0.22 * Math.sin(time * 1.3) + mxNorm * mInfl + sNorm * 0.10);
    const b1y = H * (0.32 + 0.20 * Math.cos(time * 0.9) + myNorm * mInfl + sNorm * 0.45);
    const g1 = ctx.createRadialGradient(b1x, b1y, 0, b1x, b1y, bigR);
    g1.addColorStop(0, pal[0].color + pal[0].alpha + ')');
    g1.addColorStop(0.55, pal[0].color + (pal[0].alpha * 0.3) + ')');
    g1.addColorStop(1, pal[0].color + '0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

    // Blob 2 — lower-right bias, drifts up as you scroll (counter-motion = parallax depth)
    const b2x = W * (0.72 + 0.22 * Math.cos(time * 1.1 + 1.2) - mxNorm * mInfl - sNorm * 0.10);
    const b2y = H * (0.70 + 0.20 * Math.sin(time * 0.8 + 0.6) - myNorm * mInfl - sNorm * 0.40);
    const g2 = ctx.createRadialGradient(b2x, b2y, 0, b2x, b2y, bigR);
    g2.addColorStop(0, pal[1].color + pal[1].alpha + ')');
    g2.addColorStop(0.55, pal[1].color + (pal[1].alpha * 0.3) + ')');
    g2.addColorStop(1, pal[1].color + '0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
