/* ==== Kevil.OS v3.2 ==== */
gsap.registerPlugin(ScrollTrigger);

/* ---------- helpers ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- SOUND ENGINE (multi-tone) ---------- */
let soundOn = localStorage.getItem('kp-sound') !== 'off'; // ON by default
let actx = null;
function getCtx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone({ freq = 880, type = 'sine', dur = 0.08, gain = 0.04, sweep = null, when = 0 }) {
  if (!soundOn) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function playSnd(type) {
  if (!soundOn) return;
  switch (type) {
    case 'primary': tone({ freq: 880, type: 'sine', dur: 0.09, gain: 0.05 }); break;
    case 'ghost':   tone({ freq: 560, type: 'sine', dur: 0.06, gain: 0.04 }); break;
    case 'hover':   tone({ freq: 1200, type: 'triangle', dur: 0.03, gain: 0.018 }); break;
    case 'nav':     tone({ freq: 440, type: 'sine', dur: 0.05, gain: 0.035 }); break;
    case 'click':   tone({ freq: 1000, type: 'sine', dur: 0.025, gain: 0.03 }); break;
    case 'photo':   tone({ freq: 200, type: 'sawtooth', dur: 0.32, gain: 0.04, sweep: 1400 }); break;
    case 'success':
      tone({ freq: 660, dur: 0.08, gain: 0.04, when: 0 });
      tone({ freq: 880, dur: 0.08, gain: 0.04, when: 0.08 });
      tone({ freq: 1320, dur: 0.12, gain: 0.04, when: 0.16 });
      break;
    case 'error':   tone({ freq: 220, type: 'square', dur: 0.18, gain: 0.04, sweep: 110 }); break;
    case 'tick':    tone({ freq: 1500, type: 'square', dur: 0.015, gain: 0.012 }); break;
    case 'open':    tone({ freq: 420, type: 'sine', dur: 0.1, gain: 0.035, sweep: 880 }); break;
    case 'close':   tone({ freq: 880, type: 'sine', dur: 0.08, gain: 0.03, sweep: 420 }); break;
    default:        tone({ freq: 740, dur: 0.05, gain: 0.03 });
  }
}
const soundBtn = $('#sound-btn');
function renderSndBtn() {
  if (soundOn) { soundBtn.classList.remove('muted'); }
  else { soundBtn.classList.add('muted'); }
}
renderSndBtn();
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  localStorage.setItem('kp-sound', soundOn ? 'on' : 'off');
  renderSndBtn();
  if (soundOn) playSnd('success');
});

/* ---------- BOOT ---------- */
const bootLines = [
  '[boot] Kevil.OS v3.2.0 init...',
  '[boot] mounting /dev/curiosity ........... [ok]',
  '[boot] loading kernel: agentic-ai.ko ...... [ok]',
  '[boot] loading GLSL shader engine ....... [ok]',
  '[boot] linking azure-foundry .............. [ok]',
  '[boot] linking langgraph .................. [ok]',
  '[boot] starting observability daemon ...... [ok]',
  '[boot] starting trust-score engine ........ [ok]',
  '[boot] warming up neural canvas ........... [ok]',
  '[boot] initializing achievement system .... [ok]',
  '[boot] handshake with github.com/kevil21 .. [ok]',
  '[boot] welcome operator. press any key.'
];
const boot = $('#boot'), bootLog = $('#boot-log'), bootBar = $('#boot-bar-fill');
let bootIdx = 0;
function bootTick() {
  if (bootIdx < bootLines.length) {
    bootLog.textContent += bootLines[bootIdx] + '\n';
    bootBar.style.width = ((bootIdx + 1) / bootLines.length) * 100 + '%';
    bootIdx++;
    setTimeout(bootTick, rand(100, 220));
  }
}
bootTick();
function dismissBoot() {
  if (boot.classList.contains('gone')) return;
  boot.classList.add('gone');
  playSnd('open');
  setTimeout(() => boot.remove(), 800);
  startHeroAnim();
}
['keydown', 'click', 'touchstart'].forEach(e => window.addEventListener(e, dismissBoot, { once: true }));
setTimeout(dismissBoot, 4200);

/* ---------- CURSOR (perfectly centered on pointer tip) ---------- */
const cursor = $('#cursor'), cdot = $('#cursor-dot'), cring = $('#cursor-ring');
let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
const DOT = 6, RING = 34; // must match CSS sizes
window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cdot.style.transform = `translate(${mx - DOT / 2}px, ${my - DOT / 2}px)`; });
(function loop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; cring.style.transform = `translate(${rx - RING / 2}px, ${ry - RING / 2}px)`; requestAnimationFrame(loop); })();
document.addEventListener('mousedown', () => cursor.classList.add('click'));
document.addEventListener('mouseup', () => cursor.classList.remove('click'));
const HOVER_SEL = 'a,button,.tilt,.proj,.skill-node,.t-item,.cert,.r-card,.cdot,.kpi,.cnt,.callout,.stage,.lg-stage,.skill-tab,.ph-dots button,.gh-repo';
document.addEventListener('mouseover', e => { if (e.target.closest(HOVER_SEL)) cursor.classList.add('hover'); });
document.addEventListener('mouseout', e => { if (e.target.closest(HOVER_SEL)) cursor.classList.remove('hover'); });

/* ---------- LENIS ---------- */
let lenis;
if (window.Lenis) {
  lenis = new Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); } requestAnimationFrame(raf);
  lenis.on('scroll', ScrollTrigger.update);
}

/* ---------- THEME with celestial animation ---------- */
const themeBtn = $('#theme-btn');
const savedTheme = localStorage.getItem('kp-theme') || 'dark';
document.documentElement.dataset.theme = savedTheme;

// create the celestial overlay element
const themeOverlay = document.createElement('div');
themeOverlay.id = 'theme-overlay';
document.body.appendChild(themeOverlay);

/* ---------- SCROLL PROGRESS TRACKER (bottom bar + percent badge) ---------- */
(function scrollTracker() {
  const bar = document.createElement('div');
  bar.id = 'scroll-track';
  bar.innerHTML = '<div class="st-fill"></div>';
  document.body.appendChild(bar);

  const badge = document.createElement('div');
  badge.id = 'scroll-pct';
  badge.title = 'scroll progress — click to scroll to top';
  badge.innerHTML = '<svg viewBox="0 0 36 36" width="38" height="38"><circle class="sp-bg" cx="18" cy="18" r="15.5" fill="none" stroke-width="2"/><circle class="sp-fg" cx="18" cy="18" r="15.5" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="97.4" stroke-dashoffset="97.4" transform="rotate(-90 18 18)"/></svg><span class="sp-val">0%</span>';
  document.body.appendChild(badge);
  badge.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const fill = bar.querySelector('.st-fill');
  const arc  = badge.querySelector('.sp-fg');
  const val  = badge.querySelector('.sp-val');
  const CIRC = 97.4;

  let raf = 0;
  function update() {
    raf = 0;
    const h = document.documentElement;
    const max = (h.scrollHeight - innerHeight) || 1;
    const pct = Math.max(0, Math.min(1, h.scrollTop / max));
    const p = Math.round(pct * 100);
    fill.style.width = (pct * 100) + '%';
    arc.style.strokeDashoffset = (CIRC * (1 - pct)).toFixed(2);
    val.textContent = p + '%';
    badge.classList.toggle('show', h.scrollTop > 200);
    badge.classList.toggle('top', pct > 0.95);
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();

function animateThemeSwitch(toTheme) {
  const isDark = toTheme === 'dark';           // TO dark = moonrise, TO light = sunrise
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const maxR = Math.hypot(innerWidth, innerHeight) * 0.7;

  themeOverlay.innerHTML = '';
  themeOverlay.classList.add('active');
  document.documentElement.classList.add('theme-switching');

  /* ===== SHATTER & REFORM =====
     Every visible element on the page (EXCEPT the navigation bar) explodes
     outward like glass shards, theme flips at the apex, then everything
     reassembles with an elastic snap. Headings get split into individual
     letters that scatter independently for extra cinematic punch. */

  // 1) Split headings/text-emphasis into per-character spans for letter-shatter
  const splitTargets = Array.from(document.querySelectorAll(
    '#hero h1, #hero p, #hero .stamp, .section-head h2, .section-head h3, h2, h3, .kpi-num, .stat-num'
  )).filter(el => {
    if (el.closest('#nav')) return false;
    if (el.dataset.shattered === '1') return false;
    const r = el.getBoundingClientRect();
    return r.bottom > -50 && r.top < innerHeight + 50 && r.width > 0;
  });

  const splitNodes = []; // collected per-letter spans we'll animate + restore
  splitTargets.forEach(el => {
    const original = el.innerHTML;
    el._origHTML = original;
    // Walk text nodes only — preserve inner HTML structure
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = []; let n;
    while ((n = walker.nextNode())) textNodes.push(n);
    textNodes.forEach(tn => {
      const txt = tn.nodeValue;
      if (!txt || !txt.trim()) return;
      const frag = document.createDocumentFragment();
      for (const ch of txt) {
        if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
        const span = document.createElement('span');
        span.className = 'shatter-char';
        span.textContent = ch;
        span.style.display = 'inline-block';
        frag.appendChild(span);
        splitNodes.push(span);
      }
      tn.parentNode.replaceChild(frag, tn);
    });
    el.dataset.shattered = '1';
  });

  // 2) Block-level elements (cards, projects, kpis, etc) excluded from nav
  const blocks = Array.from(document.querySelectorAll(
    '#hero .hero-actions, .proj, .r-card, .cert, .t-item, .kpi, .gh-repo, ' +
    '.skill-node, .flow-card, .lg-stage, .frame, .mini-card, .ach-item, .callout, ' +
    '.skill-card, .skill-tab, .skill-toolbar, footer'
  )).filter(el => {
    if (el.closest('#nav')) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > -50 && r.top < innerHeight + 50 && r.width > 0;
  }).slice(0, 80);

  // 3) Lock the nav so it absolutely doesn't move
  const navEl = document.querySelector('#nav');
  if (navEl) gsap.set(navEl, { clearProps: 'all' });

  if (window.gsap) {
    // Letters: explode in random directions with rotation + scale
    splitNodes.forEach((span, i) => {
      const r = span.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      // Direction: away from screen center, with some random jitter
      const dx0 = ex - cx, dy0 = ey - cy;
      const len0 = Math.hypot(dx0, dy0) || 1;
      const dirX = dx0 / len0, dirY = dy0 / len0;
      const jitterAng = (Math.random() - 0.5) * 0.9;
      const cs = Math.cos(jitterAng), sn = Math.sin(jitterAng);
      const dx = (dirX * cs - dirY * sn) * (140 + Math.random() * 220);
      const dy = (dirX * sn + dirY * cs) * (140 + Math.random() * 220);
      gsap.set(span, { transformOrigin: '50% 50%' });
      gsap.to(span, {
        x: dx, y: dy,
        rotate: (Math.random() - 0.5) * 540,
        scale: 0.3 + Math.random() * 0.4,
        opacity: 0,
        filter: 'blur(2px)',
        duration: 0.55 + Math.random() * 0.15,
        delay: (i % 30) * 0.008,
        ease: 'power3.in'
      });
      gsap.to(span, {
        x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
        filter: 'blur(0px)',
        duration: 0.95,
        delay: 0.7 + (i % 30) * 0.012,
        ease: 'elastic.out(1, .55)',
        clearProps: 'transform,opacity,filter'
      });
    });

    // Blocks: shatter outward with rotation + slight scale + opacity dip
    blocks.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const dx0 = ex - cx, dy0 = ey - cy;
      const len0 = Math.hypot(dx0, dy0) || 1;
      const burst = 90 + Math.random() * 110;
      const dx = (dx0 / len0) * burst + (Math.random() - 0.5) * 60;
      const dy = (dy0 / len0) * burst + (Math.random() - 0.5) * 60;
      gsap.set(el, { transformOrigin: '50% 50%' });
      gsap.to(el, {
        x: dx, y: dy,
        rotate: (Math.random() - 0.5) * 18,
        scale: 0.78,
        opacity: 0.15,
        filter: 'blur(4px)',
        duration: 0.55,
        delay: (i % 18) * 0.012,
        ease: 'power3.in'
      });
      gsap.to(el, {
        x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
        filter: 'blur(0px)',
        duration: 0.95,
        delay: 0.72 + (i % 18) * 0.014,
        ease: 'elastic.out(1, .6)',
        clearProps: 'transform,opacity,filter'
      });
    });

    // Background canvases get a softer ripple — they're the stage, not actors
    const bgLayers = [document.getElementById('shader-bg'), document.getElementById('neural')].filter(Boolean);
    bgLayers.forEach(el => {
      gsap.to(el, { scale: 0.96, filter: 'brightness(.55) blur(2px)', duration: 0.5, ease: 'power2.in' });
      gsap.to(el, { scale: 1, filter: 'brightness(1) blur(0px)', duration: 0.9, delay: 0.7, ease: 'power2.out', clearProps: 'transform,filter' });
    });

    // Restore innerHTML of split targets after the reform animation completes
    setTimeout(() => {
      splitTargets.forEach(el => {
        if (el._origHTML !== undefined) {
          el.innerHTML = el._origHTML;
          delete el._origHTML;
          delete el.dataset.shattered;
        }
      });
    }, 1900);
  }

  /* ===== HYPER-REALISTIC CELESTIAL BODY (centered, behind shatter) ===== */
  const wrap = document.createElement('div');
  wrap.className = 'celestial-wrap';
  wrap.style.left = cx + 'px'; wrap.style.top = cy + 'px';
  themeOverlay.appendChild(wrap);

  const peakSize = isDark ? 240 : 280;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-160 -160 320 320');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.classList.add('celestial-svg');

  const uid = 'cel' + Math.random().toString(36).slice(2, 8);
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = isDark ? `
    <radialGradient id="${uid}-mBody" cx="36%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#fefdf6"/>
      <stop offset="22%" stop-color="#ece4cd"/>
      <stop offset="50%" stop-color="#b8ad94"/>
      <stop offset="78%" stop-color="#5e5340"/>
      <stop offset="100%" stop-color="#1a160e"/>
    </radialGradient>
    <radialGradient id="${uid}-mTerm" cx="78%" cy="60%" r="70%">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="55%" stop-color="rgba(0,0,0,.18)"/>
      <stop offset="85%" stop-color="rgba(0,0,0,.6)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,.85)"/>
    </radialGradient>
    <radialGradient id="${uid}-mHalo" cx="50%" cy="50%" r="50%">
      <stop offset="35%" stop-color="rgba(180,200,230,.45)"/>
      <stop offset="80%" stop-color="rgba(120,160,210,.12)"/>
      <stop offset="100%" stop-color="rgba(80,120,180,0)"/>
    </radialGradient>
    <radialGradient id="${uid}-mMare" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(70,62,52,.85)"/>
      <stop offset="80%" stop-color="rgba(70,62,52,.35)"/>
      <stop offset="100%" stop-color="rgba(70,62,52,0)"/>
    </radialGradient>
    <filter id="${uid}-mNoise" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="7" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .32  0 0 0 0 .26  0 0 0 .55 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="${uid}-mDisp">
      <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="3"/>
      <feDisplacementMap in="SourceGraphic" scale="6"/>
    </filter>
  ` : `
    <radialGradient id="${uid}-sCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="14%" stop-color="#fffbe0"/>
      <stop offset="42%" stop-color="#ffe070"/>
      <stop offset="72%" stop-color="#ffa028"/>
      <stop offset="92%" stop-color="#ff5008"/>
      <stop offset="100%" stop-color="#a82200"/>
    </radialGradient>
    <radialGradient id="${uid}-sCorona" cx="50%" cy="50%" r="50%">
      <stop offset="28%" stop-color="rgba(255,210,80,.6)"/>
      <stop offset="55%" stop-color="rgba(255,150,40,.32)"/>
      <stop offset="80%" stop-color="rgba(255,90,10,.12)"/>
      <stop offset="100%" stop-color="rgba(255,60,0,0)"/>
    </radialGradient>
    <radialGradient id="${uid}-sHotspot" cx="42%" cy="40%" r="35%">
      <stop offset="0%" stop-color="rgba(255,255,240,.7)"/>
      <stop offset="100%" stop-color="rgba(255,255,240,0)"/>
    </radialGradient>
    <filter id="${uid}-sPlasma" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="4" seed="5"/>
      <feColorMatrix values="0 0 0 0 1   0 0 0 0 .35   0 0 0 0 0   0 0 0 .55 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="${uid}-sGran" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="9"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 .8  0 0 0 0 .3  0 0 0 .25 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="${uid}-sBlur"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="${uid}-sFlareBlur"><feGaussianBlur stdDeviation="6"/></filter>
  `;
  svg.appendChild(defs);

  if (isDark) {
    // === MOON: halo, body, mare patches, crater field, terminator, earthshine
    const halo = document.createElementNS(ns, 'circle');
    halo.setAttribute('r', '150'); halo.setAttribute('fill', `url(#${uid}-mHalo)`);
    svg.appendChild(halo);

    const body = document.createElementNS(ns, 'circle');
    body.setAttribute('r', '105'); body.setAttribute('fill', `url(#${uid}-mBody)`);
    svg.appendChild(body);

    // Mare (dark seas) — broad blotchy regions
    const mares = [
      { cx: -10, cy: -28, rx: 38, ry: 28, op: 0.55 },
      { cx: 28, cy: 18, rx: 22, ry: 30, op: 0.4 },
      { cx: -38, cy: 25, rx: 18, ry: 14, op: 0.35 },
      { cx: 5, cy: 50, rx: 25, ry: 10, op: 0.3 }
    ];
    mares.forEach(m => {
      const e = document.createElementNS(ns, 'ellipse');
      e.setAttribute('cx', m.cx); e.setAttribute('cy', m.cy);
      e.setAttribute('rx', m.rx); e.setAttribute('ry', m.ry);
      e.setAttribute('fill', `url(#${uid}-mMare)`);
      e.setAttribute('opacity', m.op);
      e.setAttribute('filter', `url(#${uid}-mDisp)`);
      svg.appendChild(e);
    });

    // Surface noise overlay clipped to the disc — adds micro-texture
    const noise = document.createElementNS(ns, 'circle');
    noise.setAttribute('r', '105'); noise.setAttribute('fill', '#888');
    noise.setAttribute('filter', `url(#${uid}-mNoise)`);
    noise.setAttribute('opacity', '.55');
    svg.appendChild(noise);

    // Realistic crater field (more, varied sizes, with rims + shadows)
    const craters = [
      [-32, -42, 19, 0.9], [27, -22, 13, 0.85], [-16, 32, 24, 0.95], [42, 27, 10, 0.8],
      [11, -58, 7, 0.75], [-58, 6, 11, 0.85], [58, -52, 6, 0.7], [-6, 64, 15, 0.9],
      [37, 58, 9, 0.8], [-44, -16, 8, 0.7], [18, 8, 5, 0.6], [-22, -8, 6, 0.65],
      [50, -8, 7, 0.7], [-66, 35, 9, 0.75], [22, 70, 5, 0.6], [-8, -70, 6, 0.7]
    ];
    craters.forEach(([cxC, cyC, rC, op]) => {
      // Crater bowl shadow (offset toward bottom-right since light from top-left)
      const shadow = document.createElementNS(ns, 'circle');
      shadow.setAttribute('cx', cxC + rC * 0.15); shadow.setAttribute('cy', cyC + rC * 0.15);
      shadow.setAttribute('r', rC); shadow.setAttribute('fill', '#231d12');
      shadow.setAttribute('opacity', op * 0.55);
      svg.appendChild(shadow);
      // Crater floor
      const floor = document.createElementNS(ns, 'circle');
      floor.setAttribute('cx', cxC); floor.setAttribute('cy', cyC); floor.setAttribute('r', rC * 0.92);
      floor.setAttribute('fill', '#7a6d54'); floor.setAttribute('opacity', op * 0.7);
      svg.appendChild(floor);
      // Bright rim (light from upper-left)
      const rim = document.createElementNS(ns, 'circle');
      rim.setAttribute('cx', cxC - rC * 0.22); rim.setAttribute('cy', cyC - rC * 0.22);
      rim.setAttribute('r', rC * 0.88);
      rim.setAttribute('fill', 'none');
      rim.setAttribute('stroke', '#f3ead4'); rim.setAttribute('stroke-width', rC * 0.15);
      rim.setAttribute('opacity', op * 0.55);
      svg.appendChild(rim);
    });

    // Tycho-style ray streaks from a southern crater (bright radiating lines)
    const tychoCx = -6, tychoCy = 64;
    for (let r = 0; r < 14; r++) {
      const a = (r / 14) * Math.PI * 2;
      const ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', tychoCx); ln.setAttribute('y1', tychoCy);
      ln.setAttribute('x2', tychoCx + Math.cos(a) * (40 + Math.random() * 35));
      ln.setAttribute('y2', tychoCy + Math.sin(a) * (40 + Math.random() * 35));
      ln.setAttribute('stroke', '#f5ecd0'); ln.setAttribute('stroke-width', 0.6 + Math.random() * 0.5);
      ln.setAttribute('opacity', 0.18 + Math.random() * 0.12);
      svg.appendChild(ln);
    }

    // Terminator shadow (smooth gradient on the unlit side)
    const term = document.createElementNS(ns, 'circle');
    term.setAttribute('r', '105'); term.setAttribute('fill', `url(#${uid}-mTerm)`);
    svg.appendChild(term);

    // Soft outer glow (atmospheric scatter)
    const outerGlow = document.createElementNS(ns, 'circle');
    outerGlow.setAttribute('r', '108'); outerGlow.setAttribute('fill', 'none');
    outerGlow.setAttribute('stroke', 'rgba(255,255,240,.18)'); outerGlow.setAttribute('stroke-width', '2');
    svg.appendChild(outerGlow);
  } else {
    // === SUN: corona, body, plasma, granulation, prominences, hot rim, lens flare
    // Outer corona (large soft radial)
    const corona = document.createElementNS(ns, 'circle');
    corona.setAttribute('r', '155'); corona.setAttribute('fill', `url(#${uid}-sCorona)`);
    svg.appendChild(corona);

    // Body
    const body = document.createElementNS(ns, 'circle');
    body.setAttribute('r', '100'); body.setAttribute('fill', `url(#${uid}-sCore)`);
    svg.appendChild(body);

    // Granulation (small-scale plasma cells)
    const gran = document.createElementNS(ns, 'circle');
    gran.setAttribute('r', '100'); gran.setAttribute('fill', '#ffd47a');
    gran.setAttribute('filter', `url(#${uid}-sGran)`);
    gran.setAttribute('opacity', '.45');
    svg.appendChild(gran);

    // Larger plasma turbulence (convection cells)
    const plasma = document.createElementNS(ns, 'circle');
    plasma.setAttribute('r', '100'); plasma.setAttribute('fill', '#ff9a2a');
    plasma.setAttribute('filter', `url(#${uid}-sPlasma)`);
    plasma.setAttribute('opacity', '.65');
    svg.appendChild(plasma);

    // Bright hot-spot toward upper-left (fake limb darkening reverse)
    const hot = document.createElementNS(ns, 'circle');
    hot.setAttribute('cx', '-15'); hot.setAttribute('cy', '-20');
    hot.setAttribute('r', '60'); hot.setAttribute('fill', `url(#${uid}-sHotspot)`);
    svg.appendChild(hot);

    // Solar prominences — curved arcs erupting from the limb
    for (let f = 0; f < 7; f++) {
      const a = (f / 7) * Math.PI * 2 + Math.random() * 0.4;
      const x1 = Math.cos(a) * 100, y1 = Math.sin(a) * 100;
      const x2 = Math.cos(a + 0.18) * 100, y2 = Math.sin(a + 0.18) * 100;
      const xMid = Math.cos(a + 0.09) * (110 + Math.random() * 18);
      const yMid = Math.sin(a + 0.09) * (110 + Math.random() * 18);
      const arc = document.createElementNS(ns, 'path');
      arc.setAttribute('d', `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${xMid.toFixed(1)} ${yMid.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      arc.setAttribute('fill', 'none');
      arc.setAttribute('stroke', '#ffe080');
      arc.setAttribute('stroke-width', 2 + Math.random() * 2);
      arc.setAttribute('stroke-linecap', 'round');
      arc.setAttribute('filter', `url(#${uid}-sBlur)`);
      arc.setAttribute('opacity', 0.6 + Math.random() * 0.3);
      svg.appendChild(arc);
    }

    // Small bright flares (dots)
    for (let f = 0; f < 5; f++) {
      const a = Math.random() * Math.PI * 2;
      const flare = document.createElementNS(ns, 'circle');
      flare.setAttribute('cx', Math.cos(a) * (95 + Math.random() * 10));
      flare.setAttribute('cy', Math.sin(a) * (95 + Math.random() * 10));
      flare.setAttribute('r', 4 + Math.random() * 5);
      flare.setAttribute('fill', '#ffffff');
      flare.setAttribute('filter', `url(#${uid}-sFlareBlur)`);
      flare.setAttribute('opacity', 0.7 + Math.random() * 0.25);
      svg.appendChild(flare);
    }

    // Hot rim (chromosphere)
    const rim = document.createElementNS(ns, 'circle');
    rim.setAttribute('r', '101'); rim.setAttribute('fill', 'none');
    rim.setAttribute('stroke', '#fff5c8'); rim.setAttribute('stroke-width', '2.5'); rim.setAttribute('opacity', '.7');
    svg.appendChild(rim);

    // Horizontal lens flare streak across the body (camera artifact)
    const flareStreak = document.createElementNS(ns, 'rect');
    flareStreak.setAttribute('x', '-150'); flareStreak.setAttribute('y', '-3');
    flareStreak.setAttribute('width', '300'); flareStreak.setAttribute('height', '6');
    flareStreak.setAttribute('fill', 'rgba(255,250,220,.55)');
    flareStreak.setAttribute('filter', `url(#${uid}-sFlareBlur)`);
    svg.appendChild(flareStreak);
  }
  wrap.appendChild(svg);

  /* ===== ROTATING RAY CORONA (around body) — softer than v3.1 ===== */
  const rays = document.createElement('div');
  rays.className = 'rays';
  rays.style.left = cx + 'px'; rays.style.top = cy + 'px';
  rays.style.width = '0px'; rays.style.height = '0px';
  rays.style.transform = 'translate(-50%,-50%) rotate(0deg)';
  const rayColor = isDark ? 'rgba(200,210,230,.22)' : 'rgba(255,210,70,.42)';
  rays.style.background = `conic-gradient(from 0deg, transparent 0 14deg, ${rayColor} 14deg 22deg, transparent 22deg 36deg, ${rayColor} 36deg 44deg, transparent 44deg 58deg, ${rayColor} 58deg 66deg, transparent 66deg 80deg, ${rayColor} 80deg 88deg, transparent 88deg 102deg, ${rayColor} 102deg 110deg, transparent 110deg 124deg, ${rayColor} 124deg 132deg, transparent 132deg 146deg, ${rayColor} 146deg 154deg, transparent 154deg 168deg, ${rayColor} 168deg 176deg, transparent 176deg 190deg, ${rayColor} 190deg 198deg, transparent 198deg 212deg, ${rayColor} 212deg 220deg, transparent 220deg 234deg, ${rayColor} 234deg 242deg, transparent 242deg 256deg, ${rayColor} 256deg 264deg, transparent 264deg 278deg, ${rayColor} 278deg 286deg, transparent 286deg 300deg, ${rayColor} 300deg 308deg, transparent 308deg 322deg, ${rayColor} 322deg 330deg, transparent 330deg 344deg, ${rayColor} 344deg 352deg, transparent 352deg)`;
  rays.style.borderRadius = '50%';
  rays.style.filter = 'blur(4px)';
  themeOverlay.appendChild(rays);
  if (window.gsap) {
    gsap.fromTo(rays, { width: 0, height: 0, opacity: 0 }, { width: 720, height: 720, opacity: 1, duration: 0.9, ease: 'power2.out' });
    gsap.to(rays, { rotate: isDark ? -200 : 200, transformOrigin: '50% 50%', duration: 1.8, ease: 'power1.inOut' });
    gsap.to(rays, { opacity: 0, duration: 0.6, delay: 1.2 });
  }

  /* ===== SHOCKWAVE RINGS ===== */
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.left = cx + 'px'; ring.style.top = cy + 'px';
    ring.style.borderColor = isDark ? 'rgba(200,200,200,.4)' : 'rgba(255,200,0,.45)';
    themeOverlay.appendChild(ring);
    if (window.gsap) {
      gsap.to(ring, {
        width: maxR * 2.6, height: maxR * 2.6, opacity: 0,
        duration: 1.3 + i * 0.18, delay: 0.2 + i * 0.15,
        ease: 'power2.out', onComplete: () => ring.remove()
      });
    }
  }

  /* ===== BODY GROW → PEAK → COLLAPSE ===== */
  if (window.gsap) {
    gsap.fromTo(svg, { attr: { width: 0, height: 0 } }, {
      attr: { width: peakSize, height: peakSize }, duration: 0.6, ease: 'back.out(1.6)',
      onComplete: () => {
        document.documentElement.dataset.theme = toTheme;
        localStorage.setItem('kp-theme', toTheme);
      }
    });
    gsap.fromTo(wrap, { width: 0, height: 0 }, { width: peakSize, height: peakSize, duration: 0.6, ease: 'back.out(1.6)' });
    gsap.to(wrap, { scale: 1.07, duration: 0.25, delay: 0.6, ease: 'sine.inOut', yoyo: true, repeat: 1, transformOrigin: '50% 50%' });
    gsap.to([svg, wrap], {
      attr: { width: 0, height: 0 }, width: 0, height: 0, opacity: 0,
      duration: 0.55, delay: 1.25, ease: 'power3.in',
      onComplete: () => {
        themeOverlay.classList.remove('active');
        themeOverlay.innerHTML = '';
        setTimeout(() => document.documentElement.classList.remove('theme-switching'), 700);
      }
    });
  } else {
    document.documentElement.dataset.theme = toTheme;
    localStorage.setItem('kp-theme', toTheme);
    setTimeout(() => { themeOverlay.classList.remove('active'); themeOverlay.innerHTML = ''; document.documentElement.classList.remove('theme-switching'); }, 800);
  }
}

themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'dark' ? 'light' : 'dark';
  playSnd('open');
  animateThemeSwitch(next);
});

/* ---------- BLOB MORPH ---------- */
const blobPath = $('#blobPath');
function morphBlob(t) {
  const cx = 300, cy = 300, pts = 8, base = 200;
  let d = '';
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = base + Math.sin(t * 0.0006 + i) * 50 + Math.cos(t * 0.0004 + i * 2) * 30;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  }
  blobPath.setAttribute('d', d + 'Z');
}
function blobLoop(t) { morphBlob(t); requestAnimationFrame(blobLoop); }
requestAnimationFrame(blobLoop);

/* ---------- NEURAL CANVAS ---------- */
const nc = $('#neural'), nctx = nc.getContext('2d');
let W = 0, H = 0, nodes = [];
function nresize() { W = nc.width = innerWidth; H = nc.height = innerHeight; nodes = []; const n = Math.min(80, Math.floor((W * H) / 25000)); for (let i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25) }); }
nresize(); window.addEventListener('resize', nresize);
function ndraw() {
  nctx.clearRect(0, 0, W, H);
  const isLight = document.documentElement.dataset.theme === 'light';
  for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1; }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.hypot(dx, dy);
      if (d < 140) { nctx.strokeStyle = `rgba(125,249,255,${(isLight ? 0.12 : 0.18) * (1 - d / 140)})`; nctx.lineWidth = 0.5; nctx.beginPath(); nctx.moveTo(nodes[i].x, nodes[i].y); nctx.lineTo(nodes[j].x, nodes[j].y); nctx.stroke(); }
    }
    nctx.fillStyle = isLight ? 'rgba(3,105,161,.35)' : 'rgba(125,249,255,.45)';
    nctx.beginPath(); nctx.arc(nodes[i].x, nodes[i].y, 1.4, 0, Math.PI * 2); nctx.fill();
  }
  requestAnimationFrame(ndraw);
}
ndraw();

/* ---------- HERO ANIMATIONS ---------- */
function startHeroAnim() {
  $$('.scramble').forEach((el, i) => {
    const tx = el.dataset.text, chars = '!<>-_\\/[]{}—=+*^?#________';
    let frame = 0, queue = [];
    for (let j = 0; j < tx.length; j++) queue.push({ from: '', to: tx[j], start: j * 2 + i * 8, end: j * 2 + i * 8 + rand(8, 18) });
    function upd() {
      let out = '', done = 0;
      for (let j = 0; j < queue.length; j++) {
        const { from, to, start, end } = queue[j];
        if (frame >= end) { out += to; done++; }
        else if (frame >= start) { if (!queue[j].char || Math.random() < 0.28) queue[j].char = chars[Math.floor(Math.random() * chars.length)]; out += `<span style="color:var(--accent)">${queue[j].char}</span>`; }
        else { out += from; }
      }
      el.innerHTML = out; if (done < queue.length) { frame++; requestAnimationFrame(upd); }
    }
    upd();
  });

  // typed
  const typed = $('.typed'); if (typed) {
    const words = JSON.parse(typed.dataset.words); let wi = 0, ci = 0, dir = 1;
    function type() { const w = words[wi]; ci += dir; typed.textContent = w.substring(0, ci); let nx = 60; if (dir === 1 && ci === w.length) { nx = 2000; dir = -1; } else if (dir === -1 && ci === 0) { dir = 1; wi = (wi + 1) % words.length; nx = 300; } setTimeout(type, nx); }
    setTimeout(type, 600);
  }

  // local time + uptime
  const lt = $('#local-time'), ut = $('#uptime'); const t0 = Date.now();
  setInterval(() => { const n = new Date(); lt.textContent = n.toTimeString().slice(0, 8); const s = Math.floor((Date.now() - t0) / 1000); ut.textContent = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 1000);

  startPhotoCarousel();
  startPipelineParticles();
  buildSkillStage();
}

/* ---------- MAGNETIC + TILT + REVEAL ---------- */
document.addEventListener('mousemove', e => {
  $$('.magnetic').forEach(el => {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
    if (d < 90) gsap.to(el, { x: dx * 0.25, y: dy * 0.25, duration: 0.4 });
    else gsap.to(el, { x: 0, y: 0, duration: 0.6 });
  });
  $$('.proj').forEach(el => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
});
document.addEventListener('mousemove', e => {
  $$('.tilt').forEach(el => {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (e.clientX < r.left - 60 || e.clientX > r.right + 60 || e.clientY < r.top - 60 || e.clientY > r.bottom + 60) { el.style.transform = ''; return; }
    const dx = (e.clientX - cx) / r.width, dy = (e.clientY - cy) / r.height;
    const st = +el.dataset.tiltStrength || 8;
    el.style.transform = `perspective(900px) rotateX(${-dy * st}deg) rotateY(${dx * st}deg)`;
  });
});

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('.reveal').forEach(el => io.observe(el));

// rail fill
ScrollTrigger.create({ trigger: '.timeline', start: 'top 70%', end: 'bottom 30%', scrub: true, onUpdate: s => { const f = $('#rail-fill'); if (f) f.style.height = (s.progress * 100) + '%'; } });

// nav highlight
const navLinks = $$('#nav ul a');
ScrollTrigger.batch('section[id]', { onEnter: (els) => { const id = els[0].id; navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id)); }, start: 'top 40%', end: 'bottom 40%' });
navLinks.forEach(a => a.addEventListener('mouseenter', () => playSnd('hover')));
navLinks.forEach(a => a.addEventListener('click', () => playSnd('nav')));

// flow svg interactions
$$('#flowsvg .stage').forEach(s => {
  s.addEventListener('mouseenter', () => { $('#flow-info').textContent = s.dataset.info; playSnd('hover'); });
});

// flow packets
const packets = $('#packets'); const stagesX = [120, 320, 520, 720, 920, 1120];
function spawnPacket() {
  if (!packets) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('r', 3.5); c.setAttribute('cy', 110); c.setAttribute('cx', stagesX[0]);
  if (Math.random() < 0.4) c.classList.add('alt');
  packets.appendChild(c);
  gsap.to(c, { attr: { cx: stagesX[5] }, duration: 5.5, ease: 'none', onComplete: () => c.remove() });
}
setInterval(spawnPacket, 800);

// A360 counters
$$('.cnt b[data-count]').forEach(el => {
  const target = +el.dataset.count;
  ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => { gsap.to({ v: 0 }, { v: target, duration: 1.6, ease: 'power2.out', onUpdate() { el.textContent = Math.round(this.targets()[0].v); } }); } });
});

// KPI wiggle
setInterval(() => {
  const k = $('#kpi-lat'); if (k) k.textContent = (380 + Math.random() * 60 | 0) + ' ms';
  const t = $('#kpi-trust'); if (t) t.textContent = (85 + Math.random() * 5).toFixed(1);
  const c = $('#kpi-cost'); if (c) c.textContent = '$' + (0.38 + Math.random() * 0.1).toFixed(2);
  const tt = $('#kpi-ttft'); if (tt) tt.textContent = (1.5 + Math.random() * 0.6).toFixed(1) + ' s';
}, 2200);

/* ---------- PHOTO CAROUSEL ---------- */
const photos = $$('.ph');
const photoLabels = ['vit_vellore', 'portrait_me', 'kyndryl_bangalore'];
const dots = $$('#ph-dots button');
let phIdx = 0, phTimer = null, phPaused = false;
function showPhoto(i, withFx = false) {
  i = ((i % photos.length) + photos.length) % photos.length;
  if (i === phIdx && !withFx) return;
  photos.forEach((p, k) => { p.classList.toggle('active', k === i); });
  dots.forEach((d, k) => d.classList.toggle('active', k === i));
  const lbl = $('#ph-label'); if (lbl) lbl.textContent = `// subject_00${i + 1} · ${photoLabels[i]}`;
  phIdx = i;
}
function nextPhoto(fx = false) { if (fx) runPhotoFx(); showPhoto(phIdx + 1); }
function startPhotoCarousel() {
  showPhoto(0);
  phTimer = setInterval(() => { if (!phPaused) nextPhoto(false); }, 4000);
}
const frame = $('#photo-frame'); const fxCanvas = $('#photo-fx'); const fxCtx = fxCanvas.getContext('2d');
function sizeFx() { const r = fxCanvas.getBoundingClientRect(); fxCanvas.width = r.width; fxCanvas.height = r.height; }
new ResizeObserver(sizeFx).observe(fxCanvas);
sizeFx();
frame.addEventListener('mouseenter', () => phPaused = true);
frame.addEventListener('mouseleave', () => phPaused = false);
frame.addEventListener('click', () => {
  playSnd('photo');
  runPhotoFx();
  setTimeout(() => showPhoto(phIdx + 1), 350);
});
dots.forEach(d => d.addEventListener('click', e => { e.stopPropagation(); playSnd('click'); showPhoto(+d.dataset.i); }));
function runPhotoFx() {
  const active = photos[phIdx]; if (!active) return;
  const variants = ['glitch', 'pixelate', 'sweep', 'aberration', 'dissolve'];
  const v = variants[Math.floor(Math.random() * variants.length)];
  if (v === 'glitch') {
    active.classList.add('glitch'); setTimeout(() => active.classList.remove('glitch'), 600);
  } else if (v === 'pixelate') {
    pixelFx();
  } else if (v === 'sweep') {
    sweepFx();
  } else if (v === 'aberration') {
    aberrationFx();
  } else {
    dissolveFx();
  }
}
function pixelFx() {
  const w = fxCanvas.width, h = fxCanvas.height; const start = performance.now();
  function step(t) {
    const p = (t - start) / 500; if (p > 1) { fxCtx.clearRect(0, 0, w, h); return; }
    const size = Math.max(2, 30 * (1 - Math.abs(0.5 - p) * 2));
    fxCtx.clearRect(0, 0, w, h);
    fxCtx.fillStyle = 'rgba(125,249,255,.18)';
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
      if (Math.random() < 0.18) fxCtx.fillRect(x, y, size - 1, size - 1);
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function sweepFx() {
  const w = fxCanvas.width, h = fxCanvas.height; const start = performance.now();
  function step(t) {
    const p = (t - start) / 600; if (p > 1) { fxCtx.clearRect(0, 0, w, h); return; }
    fxCtx.clearRect(0, 0, w, h);
    const y = p * h;
    const grad = fxCtx.createLinearGradient(0, y - 40, 0, y + 40);
    grad.addColorStop(0, 'rgba(125,249,255,0)'); grad.addColorStop(0.5, 'rgba(125,249,255,.7)'); grad.addColorStop(1, 'rgba(255,110,199,0)');
    fxCtx.fillStyle = grad; fxCtx.fillRect(0, y - 40, w, 80);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function aberrationFx() {
  const active = photos[phIdx]; active.style.filter = 'saturate(1.5) contrast(1.4) hue-rotate(20deg)'; active.style.transform = 'scale(1.04) translate(-3px,0)';
  setTimeout(() => { active.style.filter = ''; active.style.transform = ''; }, 500);
}
function dissolveFx() {
  const w = fxCanvas.width, h = fxCanvas.height; const start = performance.now();
  function step(t) {
    const p = (t - start) / 600; if (p > 1) { fxCtx.clearRect(0, 0, w, h); return; }
    fxCtx.fillStyle = 'rgba(255,110,199,.5)';
    for (let i = 0; i < 80; i++) fxCtx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    fxCtx.fillStyle = 'rgba(0,0,0,.05)'; fxCtx.fillRect(0, 0, w, h);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- LANGGRAPH PIPELINE ---------- */
const lgBtn = $('#lg-run'), lgStages = $$('.lg-stage'), lgRes = $('#lg-result');
const lgBeams = $('#lg-beams'); const lgPart = $('#lg-particles'); const lgPCtx = lgPart.getContext('2d');
function sizeLg() { const r = lgPart.getBoundingClientRect(); lgPart.width = r.width; lgPart.height = r.height; }
new ResizeObserver(sizeLg).observe(lgPart); sizeLg();

let particles = [];
function startPipelineParticles() {
  function frame() {
    lgPCtx.clearRect(0, 0, lgPart.width, lgPart.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.life--; p.x += p.vx; p.y += p.vy; p.vy += 0.04;
      lgPCtx.fillStyle = p.color; lgPCtx.globalAlpha = Math.max(0, p.life / p.maxLife);
      lgPCtx.beginPath(); lgPCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); lgPCtx.fill();
    });
    lgPCtx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function emitParticles(stageIdx, color = '#7df9ff') {
  const card = lgStages[stageIdx]; if (!card) return;
  const wrap = lgPart.getBoundingClientRect(); const r = card.getBoundingClientRect();
  const ox = r.left - wrap.left + r.width / 2, oy = r.top - wrap.top + r.height / 2;
  for (let i = 0; i < 28; i++) {
    particles.push({
      x: ox, y: oy,
      vx: rand(-2.4, 2.4), vy: rand(-3.5, -0.6),
      r: rand(1.5, 3.2), life: 60, maxLife: 60,
      color
    });
  }
}
function drawBeam(fromIdx, toIdx) {
  if (!lgBeams) return;
  const card1 = lgStages[fromIdx], card2 = lgStages[toIdx];
  if (!card1 || !card2) return;
  const wrap = lgBeams.getBoundingClientRect();
  const r1 = card1.getBoundingClientRect(), r2 = card2.getBoundingClientRect();
  const x1 = r1.right - wrap.left, x2 = r2.left - wrap.left;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', `M${x1},15 C${(x1 + x2) / 2},0 ${(x1 + x2) / 2},30 ${x2},15`);
  path.setAttribute('stroke', 'url(#beam)'); path.setAttribute('stroke-width', '2.4'); path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round'); path.style.filter = 'drop-shadow(0 0 6px #7df9ff)';
  const len = 200; path.setAttribute('stroke-dasharray', len); path.setAttribute('stroke-dashoffset', len);
  lgBeams.appendChild(path);
  gsap.to(path, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out', onComplete: () => setTimeout(() => path.remove(), 800) });
}

const lgStorylines = [
  {
    policy: 'all gcs buckets must have cost_center, environment and team labels.',
    stages: [
      '> PolicyCompiler.parse(prompt)\n  resource     : gcs.bucket\n  rule         : labels.required >= {cost_center, environment, team}\n  severity     : HIGH\n  llm_tokens   : 412 in / 218 out  ·  gemini-2.5-pro  ·  117 ms\n  validators   : schema_v3 [ok] · few_shot [ok] · greeting_filter [pass]',
      '> DriftScanner.run(project=[acme-prod, acme-stg])\n  buckets      : 17 scanned in 2 projects (us-central1, asia-south1)\n  matched      : 11 already compliant\n  violations   : 6  (acme-prod: 4 · acme-stg: 2)\n  missing_labels:\n    - acme-data-warehouse-prod  : cost_center, team\n    - acme-billing-archive      : environment\n    - acme-ml-features-stg      : cost_center, environment, team\n  scan_latency : 1.84 s  ·  api_calls 19',
      '> RemediationPlanner.draft()\n  plan_size    : 12 ordered gcloud commands\n  reversible   : 12 / 12  (label-add ops are idempotent)\n  example      : gcloud storage buckets update gs://acme-billing-archive \\\n                   --update-labels environment=prod\n  rollback     : recorded → labels_pre_apply.json\n  blast_radius : per-bucket  ·  zero data-plane impact\n  est_runtime  : ~7 s end-to-end',
      '> RiskAssessor.score()\n  guardrails   : 0 BLOCKED  ·  0 HIGH_RISK patterns matched\n  llm_rubric   : avg 2.1 / 10  (range 1.0 – 6.2)\n  decisions    : auto-approve=11  ·  human-in-loop=1 (prod data warehouse > 4.0)\n  reviewers    : @kevil  ·  slack #cloud-governance  ·  jira CLD-1428',
      '> ChangeExecutor.apply()\n  executed     : 11 / 11 approved  ·  median 0.42 s / cmd\n  post-state   : 11 / 11 verified (re-queried gcs.buckets.get)\n  pending_hil  : 1 awaiting approval (acme-data-warehouse-prod)\n  evidence     : evidence_2025_p2p_8e2.json (32 kB) → gs://p2p-evidence/'
    ],
    result: '// run complete  ·  elapsed 11.3 s\n  violations.before : 6        violations.after  : 1 (HIL pending)\n  drift_pct.before  : 35.3 %   drift_pct.after   : 5.9 %\n  fixes.applied     : 11       fixes.queued      : 1\n  audit_trail       : evidence_2025_p2p_8e2.json\n  status            : SUCCESS_WITH_PENDING_APPROVAL'
  },
  {
    policy: 'no public ip on any compute instance.',
    stages: [
      '> PolicyCompiler.parse(prompt)\n  resource     : compute.instance\n  rule         : network_interfaces[*].access_configs == DENY\n  severity     : CRITICAL\n  llm_tokens   : 388 in / 174 out  ·  101 ms',
      '> DriftScanner.run(project=[acme-prod, acme-stg])\n  vms          : 38 scanned across 4 zones\n  violations   : 3\n    - acme-stg/api-edge-1   : ephemeral_ip 34.x.x.x  ·  port 443 open\n    - acme-stg/web-stress   : ephemeral_ip 35.x.x.x\n    - acme-prod/legacy-gw-2 : reserved_ip  104.x.x.x  ·  prod tier  *',
      '> RemediationPlanner.draft()\n  plan_size    : 6 ordered commands\n  steps        : 1) attach Cloud NAT  2) drop access-config  3) re-verify\n  reversible   : full rollback via stored access_configs snapshot\n  blast_radius : staging=low  ·  prod=HIGH (active traffic)',
      '> RiskAssessor.score()\n  guardrails   : 1 HIGH_RISK matched (prod + active-traffic)\n  llm_rubric   : staging 2.1  ·  prod 7.6 → BLOCKED\n  decisions    : auto-approve=2 (stg)  ·  blocked=1 (prod)\n  ticket       : CLD-1431 created · oncall @kevil notified',
      '> ChangeExecutor.apply()\n  executed     : 2 / 2 (staging)  ·  median 0.51 s / cmd\n  post-state   : 0 public ips on staging targets\n  blocked      : acme-prod/legacy-gw-2 (awaiting CAB approval)\n  evidence     : evidence_2025_p2p_4c9.json (28 kB)'
    ],
    result: '// run complete  ·  elapsed 9.7 s\n  violations.before : 3        violations.after  : 1 (BLOCKED prod)\n  drift_pct.before  : 7.9 %    drift_pct.after   : 2.6 %\n  fixes.applied     : 2        fixes.blocked     : 1\n  audit_trail       : evidence_2025_p2p_4c9.json\n  status            : PARTIAL_SUCCESS_BLOCKED_PROD'
  }
];

lgBtn.addEventListener('click', async () => {
  if (lgBtn.classList.contains('running')) return;
  lgBtn.classList.add('running'); lgBtn.textContent = 'running...';
  const story = lgStorylines[Math.floor(Math.random() * lgStorylines.length)];
  lgRes.innerHTML = `<span style="color:var(--accent-2)">// policy: "${story.policy}"</span>\n`;
  lgStages.forEach(s => { s.classList.remove('active', 'done'); s.querySelector('.lg-status').textContent = 'idle'; s.style.setProperty('--dur', '2.2s'); });
  for (let i = 0; i < lgStages.length; i++) {
    const s = lgStages[i];
    s.classList.add('active');
    s.querySelector('.lg-status').textContent = 'running';
    emitParticles(i);
    if (i > 0) drawBeam(i - 1, i);
    playSnd('tick');
    await new Promise(r => setTimeout(r, 2200));
    s.classList.remove('active'); s.classList.add('done');
    s.querySelector('.lg-status').textContent = 'done';
    lgRes.innerHTML += `<span style="color:var(--accent)">[stage ${i + 1}]</span> ${story.stages[i]}\n`;
    lgRes.scrollTop = lgRes.scrollHeight;
  }
  lgRes.innerHTML += `<span style="color:var(--accent-2)">${story.result}</span>`;
  lgBtn.classList.remove('running'); lgBtn.textContent = 'simulate';
  playSnd('success');
});

/* ---------- SKILLS — orbit / grid / network ---------- */
const SKILL_CATS = {
  languages: { color: '#7df9ff', items: [
    { name: 'Python', yrs: 5 }, { name: 'C++', yrs: 4 }, { name: 'Java', yrs: 3 },
    { name: 'TypeScript', yrs: 3 }, { name: 'R', yrs: 2 }, { name: 'SQL', yrs: 4 }
  ]},
  ai: { color: '#ff6ec7', items: [
    { name: 'Agentic AI', yrs: 1.5 }, { name: 'LangGraph', yrs: 1 }, { name: 'LangChain', yrs: 1 },
    { name: 'RAG', yrs: 1.5 }, { name: 'LSTM', yrs: 2 }, { name: 'Time Series', yrs: 2 },
    { name: 'Azure AI Foundry', yrs: 1 }, { name: 'Vertex AI', yrs: 1 }, { name: 'Prompt Eng', yrs: 1.5 }
  ]},
  cloud: { color: '#a78bfa', items: [
    { name: 'Azure', yrs: 2 }, { name: 'AWS', yrs: 2 }, { name: 'GCP', yrs: 1 },
    { name: 'AKS', yrs: 1 }, { name: 'Container Apps', yrs: 1 }, { name: 'Functions', yrs: 1 },
    { name: 'App Service', yrs: 1 }, { name: 'Bicep', yrs: 1 }, { name: 'Terraform', yrs: 1 }
  ]},
  dev: { color: '#facc15', items: [
    { name: 'Docker', yrs: 3 }, { name: 'Git', yrs: 5 }, { name: 'GH Actions', yrs: 2 },
    { name: 'FastAPI', yrs: 2 }, { name: 'Next.js', yrs: 1.5 }, { name: 'React', yrs: 2 }, { name: 'Node.js', yrs: 3 }
  ]},
  data: { color: '#4ade80', items: [
    { name: 'ADX / KQL', yrs: 1 }, { name: 'Elasticsearch', yrs: 1.5 }, { name: 'Kibana', yrs: 1.5 },
    { name: 'Cosmos DB', yrs: 1 }, { name: 'Postgres', yrs: 2 }, { name: 'OTEL', yrs: 1 }
  ]}
};
const SKILL_USED_IN = { 'Python': 'A360 · P2P · OptiCrop · Climate', 'TypeScript': 'A360 frontend · P2P UI', 'LangGraph': 'P2P 5-agent pipeline', 'RAG': 'A360 chat · enterprise pilots', 'Azure': 'A360 (foundry · AKS · functions)', 'ADX / KQL': 'A360 source of truth (31 MVs)', 'Elasticsearch': 'A360 dashboard layer', 'Next.js': 'A360 frontend (v16)', 'FastAPI': 'A360 gateway · P2P backend', 'Vertex AI': 'P2P Gemini 2.5 Pro', 'LSTM': 'Smart Energy · Climate', 'Docker': 'every project ever' };
function whereUsed(name) { return SKILL_USED_IN[name] || 'multiple personal + work projects'; }

const stage = $('#skill-stage'); const detail = $('#skill-detail');
const tabs = $$('.skill-tab');
let currentView = 'net', orbitPaused = false;

function buildSkillStage() { renderView(currentView); }
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  currentView = t.dataset.view;
  stage.dataset.view = currentView;
  playSnd('click');
  renderView(currentView);
}));

function clearStage() { stage.innerHTML = ''; }

function renderView(v) {
  clearStage();
  if (v === 'orbit') renderOrbit();
  else if (v === 'grid') renderGrid();
  else renderNet();
}

function attachNode(el, item, catKey) {
  el.addEventListener('mouseenter', () => {
    orbitPaused = true; playSnd('hover');
    // show detail on hover directly (no click required)
    detail.innerHTML = `<b style="color:${SKILL_CATS[catKey].color}">${item.name}</b> · ${item.yrs}y · <span style="color:var(--muted)">${whereUsed(item.name)}</span>`;
  });
  el.addEventListener('mouseleave', () => { orbitPaused = false; });
}

function renderOrbit() {
  const rect = stage.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const cats = Object.keys(SKILL_CATS);
  const baseR = Math.min(rect.width, rect.height) * 0.12;
  const stepR = Math.min(rect.width, rect.height) * 0.085;

  // center label
  const center = document.createElement('div');
  center.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);font-family:var(--display);font-size:18px;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;text-align:center;pointer-events:none;filter:drop-shadow(0 0 14px color-mix(in srgb,var(--accent) 50%,transparent))`;
  center.innerHTML = '<span style="display:block;width:100%;font-weight:700;font-size:15px;line-height:1">KEVIL</span><span style="display:block;width:100%;font-size:11px;color:var(--accent);letter-spacing:.45em;margin-top:6px">CORE</span>';
  stage.appendChild(center);

  // svg rings
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  svg.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  cats.forEach((_, i) => {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
    circle.setAttribute('r', baseR + stepR * i);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'rgba(125,249,255,.12)');
    circle.setAttribute('stroke-dasharray', '4 6');
    svg.appendChild(circle);
  });
  stage.appendChild(svg);

  // place nodes per ring with rotation
  const ringWrappers = [];
  cats.forEach((catKey, ri) => {
    const ring = SKILL_CATS[catKey]; const r = baseR + stepR * ri;
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:0;height:0`;
    stage.appendChild(wrap);
    ringWrappers.push({ wrap, speed: (ri % 2 === 0 ? 1 : -1) * (0.12 + ri * 0.04), angle: ri * 17 });
    ring.items.forEach((item, i) => {
      const a = (i / ring.items.length) * Math.PI * 2;
      const node = document.createElement('div');
      node.className = 'skill-node';
      node.style.borderColor = ring.color; node.style.color = ring.color;
      node.style.left = (Math.cos(a) * r) + 'px'; node.style.top = (Math.sin(a) * r) + 'px';
      node.style.transform = 'translate(-50%,-50%)';
      node.textContent = item.name;
      attachNode(node, item, catKey);
      wrap.appendChild(node);
    });
  });

  // animate rotation
  function spin() {
    if (!orbitPaused) ringWrappers.forEach(rw => { rw.angle += rw.speed; rw.wrap.style.transform = `rotate(${rw.angle}deg)`; });
    // counter-rotate text so labels stay upright-ish
    ringWrappers.forEach(rw => { rw.wrap.querySelectorAll('.skill-node').forEach(n => { n.style.setProperty('--cr', -rw.angle + 'deg'); }); });
    if (stage.dataset.view === 'orbit') requestAnimationFrame(spin);
  }
  requestAnimationFrame(spin);
}

function renderGrid() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:18px;display:grid;grid-template-columns:repeat(5,1fr);gap:14px;overflow:auto';
  Object.entries(SKILL_CATS).forEach(([catKey, ring]) => {
    const col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:flex-start';
    const h = document.createElement('div');
    h.style.cssText = `font-family:var(--mono);font-size:10px;letter-spacing:.2em;color:${ring.color};text-transform:uppercase;margin-bottom:6px`;
    h.textContent = catKey;
    col.appendChild(h);
    ring.items.forEach(item => {
      const node = document.createElement('div');
      node.className = 'skill-node';
      node.style.position = 'relative'; node.style.transform = 'none'; node.style.left = node.style.top = 'auto';
      node.style.borderColor = ring.color; node.style.color = ring.color;
      node.textContent = item.name;
      node.addEventListener('mouseenter', () => playSnd('hover'));
      node.addEventListener('click', () => {
        playSnd('click');
        $$('.skill-node').forEach(n => n.classList.remove('pinned'));
        node.classList.add('pinned');
        detail.innerHTML = `<b style="color:${ring.color}">${item.name}</b> · ${item.yrs}y · <span style="color:var(--muted)">${whereUsed(item.name)}</span>`;
      });
      col.appendChild(node);
    });
    wrap.appendChild(col);
  });
  stage.appendChild(wrap);
}

/* ---- NETWORK: living, breathing, space-filling ---- */
let netRAF = null;
function renderNet() {
  if (netRAF) cancelAnimationFrame(netRAF);
  const rect = stage.getBoundingClientRect();
  const W = rect.width, Hh = rect.height;
  const mobile = W < 720;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  svg.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  stage.appendChild(svg);

  // central core node
  const core = { x: W / 2, y: Hh / 2, color: '#7df9ff', r: 38 };
  const items = [];
  const cats = Object.entries(SKILL_CATS);

  cats.forEach(([catKey, ring], ci) => {
    const cAngle = (ci / cats.length) * Math.PI * 2 - Math.PI / 2;
    const cR = Math.min(W, Hh) * (mobile ? 0.32 : 0.28);
    const cx = W / 2 + Math.cos(cAngle) * cR;
    const cy = Hh / 2 + Math.sin(cAngle) * cR;
    const cat = { kind: 'cat', name: catKey, x: cx, y: cy, ox: cx, oy: cy, color: ring.color, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 };
    items.push(cat);
    const count = ring.items.length;
    const spread = Math.min(W, Hh) * (mobile ? 0.14 : 0.16);
    ring.items.forEach((it, i) => {
      // spread skills in a fan that hugs the available space, away from core
      const baseA = cAngle + ((i / Math.max(count - 1, 1)) - 0.5) * (Math.PI * 0.85);
      const rr = spread * (0.7 + (i % 3) * 0.18);
      const x = cx + Math.cos(baseA) * rr;
      const y = cy + Math.sin(baseA) * rr;
      items.push({ kind: 'skill', cat: catKey, item: it, x, y, ox: x, oy: y, color: ring.color, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2, parent: cat });
    });
  });

  // core in DOM — hexagon shape
  const coreEl = document.createElement('div');
  coreEl.style.cssText = `position:absolute;left:${core.x}px;top:${core.y}px;transform:translate(-50%,-50%);font-family:var(--display);letter-spacing:.3em;color:var(--accent);text-transform:uppercase;background:radial-gradient(circle at center, color-mix(in srgb,var(--accent) 35%, transparent) 0%, color-mix(in srgb,var(--accent) 12%, transparent) 45%, transparent 78%);padding:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);border:none;width:130px;height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;pointer-events:none;text-align:center;text-shadow:0 0 10px color-mix(in srgb,var(--accent) 80%,transparent),0 1px 2px rgba(0,0,0,.7);filter:drop-shadow(0 0 18px color-mix(in srgb,var(--accent) 45%,transparent))`;
  coreEl.innerHTML = '<span style="display:block;width:100%;text-align:center;line-height:1;font-weight:700;font-size:17px;color:var(--accent)">KEVIL</span><span style="display:block;width:100%;text-align:center;font-size:11px;color:var(--accent);letter-spacing:.45em;font-weight:600;margin-top:6px">CORE</span>';
  stage.appendChild(coreEl);
  // hex border via SVG overlay
  const hexBorder = document.createElementNS(svgNS, 'polygon');
  const hR = 52;
  const hexPts = Array.from({length: 6}, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${core.x + Math.cos(a) * hR},${core.y + Math.sin(a) * hR}`;
  }).join(' ');
  hexBorder.setAttribute('points', hexPts);
  hexBorder.setAttribute('fill', 'none'); hexBorder.setAttribute('stroke', 'rgba(125,249,255,.5)');
  hexBorder.setAttribute('stroke-width', '1.5'); hexBorder.setAttribute('stroke-dasharray', '6 4');
  svg.appendChild(hexBorder);
  // pulse glow behind hex
  const hexGlow = document.createElementNS(svgNS, 'polygon');
  hexGlow.setAttribute('points', hexPts); hexGlow.setAttribute('fill', 'none');
  hexGlow.setAttribute('stroke', 'rgba(125,249,255,.25)'); hexGlow.setAttribute('stroke-width', '8');
  hexGlow.style.filter = 'blur(8px)';
  svg.insertBefore(hexGlow, svg.firstChild);

  // SVG layers: core->cat edges, cat->skill edges
  const coreEdges = [];
  items.filter(i => i.kind === 'cat').forEach(c => {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('stroke', c.color); line.setAttribute('stroke-opacity', '.45'); line.setAttribute('stroke-width', '1.4');
    line.setAttribute('stroke-dasharray', '4 6');
    svg.appendChild(line); coreEdges.push({ line, a: core, b: c });
  });
  const skillEdges = [];
  items.filter(i => i.kind === 'skill').forEach(s => {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('stroke', s.color); line.setAttribute('stroke-opacity', '.22'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line); skillEdges.push({ line, a: s.parent, b: s });
  });

  // DOM nodes
  const els = new Map();
  items.forEach(it => {
    if (it.kind === 'cat') {
      const lab = document.createElement('div');
      lab.style.cssText = `position:absolute;font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:${it.color};text-transform:uppercase;background:var(--skill-bg-2);padding:7px 14px;border-radius:999px;border:1px solid ${it.color};box-shadow:0 0 16px ${it.color}33;transform:translate(-50%,-50%);will-change:left,top`;
      lab.textContent = it.name; stage.appendChild(lab); els.set(it, lab);
    } else {
      const node = document.createElement('div');
      node.className = 'skill-node';
      node.style.borderColor = it.color; node.style.color = it.color;
      node.style.transform = 'translate(-50%,-50%)';
      node.style.willChange = 'left,top';
      node.textContent = it.item.name;
      attachNode(node, it.item, it.cat);
      stage.appendChild(node); els.set(it, node);
    }
  });

  // animate: gentle floating + breathing toward origin, cursor repulsion
  let mxL = -9999, myL = -9999;
  const onMove = (e) => { const r = stage.getBoundingClientRect(); mxL = e.clientX - r.left; myL = e.clientY - r.top; };
  stage.addEventListener('mousemove', onMove);
  stage.addEventListener('mouseleave', () => { mxL = myL = -9999; });

  let t = 0;
  let prevNearest = null;
  function tick() {
    if (stage.dataset.view !== 'net') { stage.removeEventListener('mousemove', onMove); return; }
    t += 0.016;

    // find the nearest skill node to the cursor
    let nearestIt = null, nearestDist = Infinity;
    if (mxL > -999 && myL > -999) {
      items.forEach(it => {
        if (it.kind !== 'skill') return;
        const dx = it.x - mxL, dy = it.y - myL;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) { nearestDist = d; nearestIt = it; }
      });
    }

    // update nearest class
    if (nearestIt !== prevNearest) {
      if (prevNearest) { const el = els.get(prevNearest); if (el) el.classList.remove('nearest'); }
      if (nearestIt && nearestDist < 200) { const el = els.get(nearestIt); if (el) el.classList.add('nearest'); }
      prevNearest = nearestDist < 200 ? nearestIt : null;
    }

    items.forEach((it) => {
      // breathing
      const bx = Math.cos(t * 0.6 + it.phase) * (it.kind === 'cat' ? 6 : 9);
      const by = Math.sin(t * 0.5 + it.phase * 1.3) * (it.kind === 'cat' ? 6 : 9);
      let tx = it.ox + bx, ty = it.oy + by;

      if (mxL > -999 && myL > -999 && it.kind === 'skill') {
        const dx = tx - mxL, dy = ty - myL;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2);
        if (it === nearestIt && d < 200) {
          // ATTRACT nearest skill toward cursor
          const f = Math.min((200 - d) / 200 * 30, 30);
          tx -= (dx / (d || 1)) * f;
          ty -= (dy / (d || 1)) * f;
        } else if (d < 120 && d > 1) {
          // REPEL others away from cursor
          const f = (120 - d) / 120 * 26;
          tx += (dx / d) * f; ty += (dy / d) * f;
        }
      } else if (mxL > -999 && myL > -999 && it.kind === 'cat') {
        // categories: gentle repel
        const dx = tx - mxL, dy = ty - myL; const d2 = dx * dx + dy * dy;
        if (d2 < 90 * 90 && d2 > 1) { const d = Math.sqrt(d2); const f = (90 - d) / 90 * 14; tx += (dx / d) * f; ty += (dy / d) * f; }
      }

      // spring back
      it.vx += (tx - it.x) * 0.08; it.vy += (ty - it.y) * 0.08;
      it.vx *= 0.78; it.vy *= 0.78;
      it.x += it.vx; it.y += it.vy;
      const el = els.get(it); el.style.left = it.x + 'px'; el.style.top = it.y + 'px';
    });
    coreEdges.forEach(e => { e.line.setAttribute('x1', e.a.x); e.line.setAttribute('y1', e.a.y); e.line.setAttribute('x2', e.b.x); e.line.setAttribute('y2', e.b.y); });
    skillEdges.forEach(e => { e.line.setAttribute('x1', e.a.x); e.line.setAttribute('y1', e.a.y); e.line.setAttribute('x2', e.b.x); e.line.setAttribute('y2', e.b.y); });
    netRAF = requestAnimationFrame(tick);
  }
  netRAF = requestAnimationFrame(tick);
}

/* ---------- GITHUB LIVE ---------- */
async function loadGithub() {
  try {
    const u = await fetch('https://api.github.com/users/kevil21').then(r => r.json());
    $('#gh-avatar').src = u.avatar_url;
    $('#gh-bio').textContent = u.bio || 'AI / Cloud Engineer at Kyndryl.';
    $('#gh-public').textContent = u.public_repos;
    $('#gh-followers').textContent = u.followers;
    $('#gh-following').textContent = u.following;
    $('#hs-repos').textContent = u.public_repos;

    const repos = await fetch('https://api.github.com/users/kevil21/repos?per_page=100&sort=updated').then(r => r.json());
    const top = repos.filter(r => !r.fork).slice(0, 9);
    $('#gh-repos').innerHTML = top.map(r => `
      <a class="gh-repo" target="_blank" rel="noopener" href="${r.html_url}" data-snd="ghost">
        <h6>${r.name}</h6>
        <p>${(r.description || 'no description provided').replace(/</g, '&lt;')}</p>
        <div class="gh-foot">
          ${r.language ? `<span><i style="background:${langColor(r.language)}"></i>${r.language}</span>` : ''}
          <span>★ ${r.stargazers_count}</span>
          <span>updated ${new Date(r.updated_at).toLocaleDateString()}</span>
        </div>
      </a>`).join('');

    // language bars
    const langs = {};
    repos.filter(r => !r.fork && r.language).forEach(r => { langs[r.language] = (langs[r.language] || 0) + 1; });
    const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $('#gh-langs').innerHTML = sorted.map(([k, v]) => `
      <div class="lang" style="color:${langColor(k)}">
        <i style="background:${langColor(k)}"></i>
        <span style="min-width:90px">${k}</span>
        <div class="bar"><b style="width:${(v / total * 100).toFixed(0)}%"></b></div>
        <span class="pct">${(v / total * 100).toFixed(0)}%</span>
      </div>`).join('');
  } catch (e) {
    $('#gh-bio').textContent = 'AI / Cloud Engineer at Kyndryl. (offline)';
    $('#gh-repos').innerHTML = '<div class="muted">repositories unavailable. <a target="_blank" rel="noopener" href="https://github.com/kevil21">visit github.com/kevil21</a></div>';
  }

  // heatmap
  const heat = $('#gh-heat'); const w = 26 * 7; heat.innerHTML = '';
  for (let i = 0; i < w; i++) { const r = Math.random(); const c = document.createElement('i'); if (r > 0.85) c.className = 'l4'; else if (r > 0.7) c.className = 'l3'; else if (r > 0.5) c.className = 'l2'; else if (r > 0.3) c.className = 'l1'; heat.appendChild(c); }
}
function langColor(l) { const m = { JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3776ab', Java: '#b07219', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c', Jupyter: '#da5b0b', 'Jupyter Notebook': '#da5b0b', Shell: '#89e051', Go: '#00add8', Rust: '#dea584' }; return m[l] || '#7df9ff'; }
loadGithub();

/* ---------- COMMAND PALETTE ---------- */
const palette = $('#palette'), palInput = $('#pal-input'), palList = $('#pal-list');
const palCmds = [
  { label: 'go: home', k: 'nav', act: () => location.hash = '#hero' },
  { label: 'go: about', k: 'nav', act: () => location.hash = '#about' },
  { label: 'go: a360 (flagship)', k: 'nav', act: () => location.hash = '#a360' },
  { label: 'go: policy -> pipelines', k: 'nav', act: () => location.hash = '#p2p' },
  { label: 'go: experience', k: 'nav', act: () => location.hash = '#xp' },
  { label: 'go: skills', k: 'nav', act: () => location.hash = '#skills' },
  { label: 'go: archive', k: 'nav', act: () => location.hash = '#projects' },
  { label: 'go: github live', k: 'nav', act: () => location.hash = '#github' },
  { label: 'go: certifications', k: 'nav', act: () => location.hash = '#certs' },
  { label: 'go: contact terminal', k: 'nav', act: () => location.hash = '#contact' },
  { label: 'toggle: theme', k: 'cmd', act: () => themeBtn.click() },
  { label: 'toggle: sound', k: 'cmd', act: () => soundBtn.click() },
  { label: 'easter: matrix rain', k: 'easter', act: () => matrixRain() },
  { label: 'easter: konami', k: 'easter', act: () => alert('arrow keys ftw') },
  { label: 'link: email kevil', k: 'link', act: () => location.href = 'mailto:kevilpatel24@gmail.com' },
  { label: 'link: github', k: 'link', act: () => open('https://github.com/kevil21', '_blank') },
  { label: 'link: linkedin', k: 'link', act: () => open('https://linkedin.com/in/kevil21', '_blank') },
  { label: 'link: huggingface', k: 'link', act: () => open('https://huggingface.co/Kevil21', '_blank') },
  { label: 'link: ms learn profile', k: 'link', act: () => open('https://learn.microsoft.com/en-in/users/kevil21/', '_blank') },
  { label: 'link: credly badges', k: 'link', act: () => open('https://www.credly.com/users/kevil-patel.db5e53fa', '_blank') },
  { label: 'link: google skills', k: 'link', act: () => open('https://www.skills.google/public_profiles/368f1807-b155-48d9-ba6c-e9ba98a384f5', '_blank') }
];
let palFiltered = palCmds, palActive = 0;
function renderPalette() {
  palList.innerHTML = palFiltered.map((c, i) => `<li class="${i === palActive ? 'active' : ''}" data-i="${i}">${c.label} <span class="k">${c.k}</span></li>`).join('');
  $$('#pal-list li').forEach(li => li.addEventListener('click', () => { palFiltered[+li.dataset.i].act(); closePalette(); }));
}
function openPalette() { palette.hidden = false; palInput.value = ''; palFiltered = palCmds; palActive = 0; renderPalette(); setTimeout(() => palInput.focus(), 50); playSnd('open'); }
function closePalette() { palette.hidden = true; playSnd('close'); }
$('#palette-btn').addEventListener('click', openPalette);
$('#palette-btn-2').addEventListener('click', openPalette);
$('.pal-back').addEventListener('click', closePalette);
palInput.addEventListener('input', () => { const q = palInput.value.toLowerCase(); palFiltered = palCmds.filter(c => c.label.toLowerCase().includes(q)); palActive = 0; renderPalette(); });
palInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { palActive = (palActive + 1) % palFiltered.length; renderPalette(); }
  else if (e.key === 'ArrowUp') { palActive = (palActive - 1 + palFiltered.length) % palFiltered.length; renderPalette(); }
  else if (e.key === 'Enter') { if (palFiltered[palActive]) { palFiltered[palActive].act(); closePalette(); } }
  else if (e.key === 'Escape') closePalette();
});
window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
  if (e.key === 'Escape' && !palette.hidden) closePalette();
});

/* ---------- TERMINAL ---------- */
const termBody = $('#term-body'), termInput = $('#term-input'), termForm = $('#term-form');
const termCmds = {
  help: 'available: about · email · linkedin · github · huggingface · mslearn · credly · googleskills · resume · hire · whoami · matrix · konami · theme · sound · clear',
  about: 'Kevil Patel · Associate SDE @ Kyndryl. Building agentic AI on Azure. CGPA 8.95. AIR 56 VITEEE.',
  email: '<a href="mailto:kevilpatel24@gmail.com">kevilpatel24@gmail.com</a>',
  linkedin: '<a target="_blank" rel="noopener" href="https://linkedin.com/in/kevil21">linkedin.com/in/kevil21</a>',
  github: '<a target="_blank" rel="noopener" href="https://github.com/kevil21">github.com/kevil21</a>',
  huggingface: '<a target="_blank" rel="noopener" href="https://huggingface.co/Kevil21">huggingface.co/Kevil21</a>',
  mslearn: '<a target="_blank" rel="noopener" href="https://learn.microsoft.com/en-in/users/kevil21/">learn.microsoft.com/users/kevil21</a>',
  credly: '<a target="_blank" rel="noopener" href="https://www.credly.com/users/kevil-patel.db5e53fa">credly.com/users/kevil-patel</a>',
  googleskills: '<a target="_blank" rel="noopener" href="https://www.skills.google/public_profiles/368f1807-b155-48d9-ba6c-e9ba98a384f5">skills.google/kevil</a>',
  resume: '<a target="_blank" rel="noopener" href="Kevil_Resume_12.docx">download resume.docx</a>',
  hire: 'open to: agentic AI · cloud architecture · platform engineering · staff+ collaborations. mail kevilpatel24@gmail.com',
  whoami: 'kevil@os :: associate_sde / agentic-ai / kyndryl :: id=21 :: tenant=kevil',
  konami: 'try -> arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a',
  theme: () => { themeBtn.click(); return 'theme toggled.'; },
  sound: () => { soundBtn.click(); return 'sound ' + (soundOn ? 'enabled' : 'muted') + '.'; },
  matrix: () => { matrixRain(); return 'wake up, neo...'; },
  clear: () => { termBody.innerHTML = ''; return ''; }
};
function termLine(html, cls = '') { const d = document.createElement('span'); d.className = 't-line ' + cls; d.innerHTML = html; termBody.appendChild(d); termBody.scrollTop = termBody.scrollHeight; }
termForm.addEventListener('submit', e => {
  e.preventDefault(); const v = termInput.value.trim(); if (!v) return;
  termLine(`<span class="prompt">kevil@os:~$</span> ${v.replace(/</g, '&lt;')}`);
  const fn = termCmds[v.toLowerCase()];
  if (fn) { const out = typeof fn === 'function' ? fn() : fn; if (out) termLine(out, 'muted'); playSnd('success'); }
  else { termLine(`command not found: ${v.replace(/</g, '&lt;')} · try <code>help</code>`, 'muted'); playSnd('error'); }
  termInput.value = '';
});

/* ---------- MATRIX RAIN ---------- */
const mc = $('#matrix'), mctx = mc.getContext('2d'); let matrixOn = false, drops = [];
function matrixRain() {
  matrixOn = true; mc.hidden = false; mc.width = innerWidth; mc.height = innerHeight;
  const fs = 14, cols = Math.floor(mc.width / fs); drops = new Array(cols).fill(0);
  const chars = '01アイウエオカキクケコサシスセソタチツテト';
  function step() {
    if (!matrixOn) return;
    mctx.fillStyle = 'rgba(0,0,0,.06)'; mctx.fillRect(0, 0, mc.width, mc.height);
    mctx.fillStyle = '#7df9ff'; mctx.font = fs + 'px monospace';
    for (let i = 0; i < drops.length; i++) {
      mctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, drops[i] * fs);
      if (drops[i] * fs > mc.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    requestAnimationFrame(step);
  }
  step();
  setTimeout(() => { matrixOn = false; mc.hidden = true; }, 5500);
}
mc.addEventListener('click', () => { matrixOn = false; mc.hidden = true; });

/* ---------- KONAMI ---------- */
const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let ki = 0;
window.addEventListener('keydown', e => { if (e.key.toLowerCase() === konami[ki].toLowerCase()) { ki++; if (ki === konami.length) { matrixRain(); ki = 0; playSnd('success'); } } else { ki = 0; } });

/* ---------- GLOBAL SOUND BINDING via data-snd ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-snd]');
  if (el) playSnd(el.dataset.snd);
});
document.addEventListener('mouseenter', e => {
  if (e.target && e.target.matches && e.target.matches('a,button,.skill-node,.proj,.cert,.r-card,.cdot')) playSnd('hover');
}, true);

/* ---------- YEAR ---------- */
$('#yr').textContent = new Date().getFullYear();

console.log('%c kevil.os v3.2 ', 'background:#7df9ff;color:#000;font-weight:700;padding:6px 12px;border-radius:6px;font-family:monospace');
console.log('%c try ctrl/cmd+k for command palette · type help in the terminal ', 'color:#7df9ff;font-family:monospace');

/* ============================================================
   v3.2 ADDITIONS
   ============================================================ */

/* ---------- AUTO theme on first visit (prefers-color-scheme) ---------- */
if (!localStorage.getItem('kp-theme')) {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const auto = prefersLight ? 'light' : 'dark';
  document.documentElement.dataset.theme = auto;
  // do NOT persist on first visit, so user's OS pref keeps tracking until they manually toggle
}
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
  if (!localStorage.getItem('kp-theme')) document.documentElement.dataset.theme = e.matches ? 'light' : 'dark';
});

/* ---------- FEATURE FLAGS via ?flags=doom,doom2 ---------- */
const FLAGS = new Set((new URLSearchParams(location.search).get('flags') || '').split(',').filter(Boolean));
window.KP_FLAGS = FLAGS;
if (FLAGS.has('doom')) document.documentElement.classList.add('doom');

/* ---------- ANALYTICS (local) + RUM stub ---------- */
(function rum() {
  const key = 'kp-rum';
  const sess = JSON.parse(localStorage.getItem(key) || '{"v":0,"errs":0,"firstSeen":null,"lastSeen":null}');
  sess.v++; sess.lastSeen = Date.now(); if (!sess.firstSeen) sess.firstSeen = Date.now();
  // perf snapshot
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) sess.ttfb = Math.round(nav.responseStart - nav.requestStart);
  } catch (e) {}
  localStorage.setItem(key, JSON.stringify(sess));
  window.addEventListener('error', (e) => {
    sess.errs++; sess.lastErr = (e.message || '').slice(0, 200);
    localStorage.setItem(key, JSON.stringify(sess));
  });
  console.log('%c[rum] visit #' + sess.v + ' · ttfb=' + (sess.ttfb || '?') + 'ms', 'color:#7df9ff;font-family:monospace');
})();

/* ---------- PAGE TRANSITION fade for in-site links ---------- */
const fader = document.createElement('div'); fader.className = 'page-fade'; document.body.appendChild(fader);
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank') return;
  if (href.endsWith('.html')) {
    e.preventDefault(); fader.classList.add('on'); playSnd('close');
    setTimeout(() => { location.href = href; }, 320);
  }
});

/* ---------- PDF download via print dialog ---------- */
$('#pdf-btn').addEventListener('click', () => {
  playSnd('primary');
  // toast hint
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--bg-2);border:1px solid var(--line-2);padding:18px 24px;border-radius:12px;font-family:var(--mono);font-size:13px;color:var(--fg);z-index:100;box-shadow:var(--shadow);text-align:center;max-width:380px';
  t.innerHTML = 'preparing printable view...<br/><span style="color:var(--muted);font-size:11px">use "save as PDF" in the print dialog.</span>';
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); window.print(); }, 700);
});

/* ---------- I18N — lightweight switcher for hero strings ---------- */
const I18N = {
  EN: { role: 'Associate SDE · Kyndryl · building agentic AI on Azure', cta1: 'see_flagship()', cta2: 'open_terminal()', whoami: 'whoami', skills: './skills --orbit' },
  FR: { role: 'Ingénieur logiciel associé · Kyndryl · IA agentique sur Azure', cta1: 'voir_phare()', cta2: 'ouvrir_terminal()', whoami: 'qui_suis_je', skills: './competences' },
  HI: { role: 'एसोसिएट SDE · Kyndryl · Azure पर एजेंटिक AI', cta1: 'मुख्य_देखें()', cta2: 'टर्मिनल_खोलें()', whoami: 'मैं कौन हूँ', skills: './कौशल' },
  GU: { role: 'એસોસિએટ SDE · Kyndryl · Azure પર એજેન્ટિક AI', cta1: 'મુખ્ય_જુઓ()', cta2: 'ટર્મિનલ_ખોલો()', whoami: 'હું કોણ છું', skills: './કૌશલ્ય' }
};
const langOrder = ['EN', 'FR', 'HI', 'GU'];
let curLang = localStorage.getItem('kp-lang') || 'EN';
const langBtn = $('#lang-btn');
function applyLang(L) {
  const d = I18N[L] || I18N.EN;
  const role = $('.role-line'); if (role) { const glow = role.querySelector('.r-glow'); role.innerHTML = ''; if (glow) role.appendChild(glow); role.append(d.role); }
  const c1 = $('.hero-actions .btn.primary span'); if (c1) c1.textContent = d.cta1;
  const c2 = $('.hero-actions .btn.ghost span'); if (c2) c2.textContent = d.cta2;
  const wh = $('#about .section-head h2'); if (wh) wh.textContent = d.whoami;
  const sk = $('#skills .section-head h2'); if (sk) sk.textContent = d.skills;
  const bl = langBtn.querySelector('.btn-label'); if (bl) bl.textContent = L; else langBtn.textContent = L;
}
applyLang(curLang);
langBtn.addEventListener('click', () => {
  curLang = langOrder[(langOrder.indexOf(curLang) + 1) % langOrder.length];
  localStorage.setItem('kp-lang', curLang);
  applyLang(curLang); playSnd('click');
});

/* ---------- TOUCH GESTURES for photo carousel ---------- */
(function gestures() {
  const fr = $('#photo-frame'); if (!fr) return;
  let sx = 0, sy = 0, t0 = 0;
  fr.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); }, { passive: true });
  fr.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && Date.now() - t0 < 600) {
      // swipe — fire same handler as click (next photo with fx)
      if (typeof nextPhoto === 'function') { nextPhoto(true); playSnd('photo'); }
    }
  }, { passive: true });
})();

/* ---------- PROJECT CASE-STUDY MODAL ---------- */
const CASES = {
  'overlay-insights': {
    tag: 'Python · ELK · 2024',
    title: 'Overlay-Insights',
    summary: 'Find repeated overlay patterns across hostnames and turn them into a quantified business-impact ranking (cost, brand, support load).',
    problem: 'Customer-facing applications were shipping recurring overlay patterns (modals, banners, popups) without anyone tracking the cumulative cost. Multiple teams kept re-inventing the same overlay flows. Nobody could answer "what does an overlay cost us per quarter?".',
    approach: ['Crawl + sample DOM snapshots across hostnames into Elasticsearch indices.', 'Cluster overlay HTML signatures with token-level n-grams + cosine similarity.', 'Score each cluster by frequency × user-impact × support tickets.', 'Render the top clusters in Kibana dashboards and Jupyter notebooks for product review.'],
    outcomes: ['Found 6 high-impact recurring overlays accounting for ~40% of all observed overlay events.', 'Drove consolidation into a single shared component library proposal.'],
    stack: ['Python', 'Elasticsearch', 'Kibana', 'Pandas', 'Jupyter'],
    repo: 'https://github.com/kevil21/Overlay-Insights'
  },
  'incident-ticket': {
    tag: 'ELK · Python · 2024',
    title: 'Incident Ticket Management',
    summary: 'A reproducible ELK pipeline that cleans, indexes, transforms and visualises raw incident-ticket CSVs.',
    problem: 'Incident exports were arriving as messy CSVs with inconsistent schemas, hand-edited fields and timezone-broken dates. Every analyst was re-doing the same cleanup.',
    approach: ['Schema-coerced cleaner with pandas (types, dates, nullable severities).', 'Bulk-indexed into Elasticsearch with deterministic doc IDs.', 'Transformations into rolled-up indices for MTTR / mean-time-to-acknowledge.', 'Kibana dashboards: severity heatmap, team load, weekly trend.'],
    outcomes: ['Cut analyst prep time from ~3 hours/dump to ~10 minutes.', 'Made historical trend comparisons trivial.'],
    stack: ['Python', 'Pandas', 'Elasticsearch', 'Kibana', 'CSV'],
    repo: 'https://github.com/kevil21/Incident_Ticket_Management'
  },
  'it-assets': {
    tag: 'ELK · Pandas · 2024',
    title: 'IT Asset Analytics',
    summary: 'End-to-end IT asset analytics: clean, index, transform and visualise asset data with a fully scripted pipeline.',
    problem: 'IT asset spreadsheets had no source of truth, with stale rows, missing owners and inconsistent locations.',
    approach: ['Pandas/NumPy normalisation + dedupe by serial + asset tag.', 'Bulk-indexed assets to Elasticsearch.', 'Transformed into a per-owner, per-site, per-vendor rollup.', 'Kibana board: top vendors, age distribution, replacement-due heat.'],
    outcomes: ['Surfaced ~12% of assets past EoL and unbudgeted.', 'Owner-resolution lifted from 71% to 96%.'],
    stack: ['Python', 'Pandas', 'NumPy', 'Elasticsearch', 'Kibana'],
    repo: 'https://github.com/kevil21/data-operations-it-assets_ELK'
  },
  'climate': {
    tag: 'LSTM · Time-series · 2023',
    title: 'Climate Mitigation Tool',
    summary: 'Multi-modal LSTM forecasting climate-induced migration risk from real-time weather feeds.',
    problem: 'Migration risk forecasting was being done with single-feature regressors and stale data — missing extreme-event correlation.',
    approach: ['3+ real-time weather APIs aggregated into a unified hourly tensor.', 'Multi-modal LSTM with separate encoders for weather, displacement history and infra exposure.', 'Rolling-window cross-validation against held-out districts.'],
    outcomes: ['+15% forecast accuracy vs. previous baseline.', 'Forecasts surfaced as district-level risk heatmaps.'],
    stack: ['Python', 'LSTM', 'TensorFlow', 'Weather APIs', 'Pandas'],
    repo: 'https://github.com/kevil21/Climate_Mitigation_Tool'
  },
  'opticrop': {
    tag: 'ML · Agriculture · 2024',
    title: 'OptiCrop',
    summary: 'Precision water allocation for Indian agriculture with automated expense categorisation.',
    problem: 'Smallholder farmers were under- and over-watering inconsistently and tracking expenses on paper.',
    approach: ['Crop + soil + weather features fed into a regression+rule hybrid for daily water targets.', 'Receipt OCR + rule engine for auto-categorising farm expenses.', 'Mobile-first read-only dashboard.'],
    outcomes: ['+35% water-use efficiency in field pilot.', '-50% manual expense entry through automatic categorisation.'],
    stack: ['Python', 'Weather APIs', 'Rule engines', 'OCR'],
    repo: 'https://github.com/kevil21/Crop-Prediction'
  },
  'smart-energy': {
    tag: 'LSTM · AWS · 2024',
    title: 'Smart Energy Forecasting',
    summary: 'Streaming LSTM forecasts on AWS for 500+ households and distribution transformers.',
    problem: 'Grid operators needed sub-hourly load forecasts at the transformer level to schedule preemptive shedding.',
    approach: ['Kinesis ingestion of smart-meter telemetry → S3 staging.', 'Per-transformer LSTM trained on SageMaker with shared embeddings.', 'Forecasts written back to a low-latency read store for the ops dashboard.'],
    outcomes: ['+25% grid resilience in pilot deployment.', 'Operators got a 30-minute heads-up on overload events.'],
    stack: ['AWS Kinesis', 'S3', 'SageMaker', 'LSTM', 'Python'],
    repo: 'https://github.com/kevil21'
  }
};
const caseModal = $('#case-modal'), caseBody = $('#case-body');
function openCase(key) {
  const c = CASES[key]; if (!c) return;
  caseBody.innerHTML = `
    <span class="case-tag">${c.tag}</span>
    <h3>${c.title}</h3>
    <p>${c.summary}</p>
    <h4>// the problem</h4><p>${c.problem}</p>
    <h4>// the approach</h4><ul>${c.approach.map(s => `<li>${s}</li>`).join('')}</ul>
    <h4>// outcomes</h4><ul>${c.outcomes.map(s => `<li>${s}</li>`).join('')}</ul>
    <h4>// stack</h4><div class="case-chips">${c.stack.map(s => `<span>${s}</span>`).join('')}</div>
    <div class="case-cta">${c.repo ? `<a target="_blank" rel="noopener" href="${c.repo}" data-snd="primary">open repo -&gt;</a>` : ''}<a href="#contact" data-snd="ghost" onclick="document.getElementById('case-modal').hidden=true">talk about it -&gt;</a></div>
  `;
  caseModal.hidden = false; playSnd('open');
}
function closeCase() { caseModal.hidden = true; playSnd('close'); }
caseModal.querySelector('.case-back').addEventListener('click', closeCase);
caseModal.querySelector('.case-close').addEventListener('click', closeCase);
// attach to .proj cards that aren't internal #a360/#p2p
const PROJ_KEY_MAP = {
  'Overlay-Insights': 'overlay-insights', 'Incident Ticket Mgmt': 'incident-ticket', 'IT Asset Analytics': 'it-assets',
  'Climate Mitigation Tool': 'climate', 'OptiCrop': 'opticrop', 'Smart Energy Forecasting': 'smart-energy'
};
$$('.proj').forEach(a => {
  const t = a.querySelector('h4'); if (!t) return; const key = PROJ_KEY_MAP[t.textContent.trim()];
  if (key) {
    a.addEventListener('click', (e) => { e.preventDefault(); openCase(key); });
  }
});

/* ---------- CHATBOT persona ---------- */
const chatFab = $('#chat-fab'), chatPanel = $('#chat-panel'), chatLog = $('#chat-log'), chatForm = $('#chat-form'), chatInput = $('#chat-input'), chatQuick = $('#chat-quick');
const QUICK = ['what is A360?', 'tell me about P2P', 'your stack?', 'are you hiring?', 'how do I contact you?', 'easter eggs?'];
const KB = [
  { q: ['a360', 'observability', 'flagship'], a: 'A360 is Kyndryl\'s multi-tenant AI agent observability platform. Pipeline: OTEL -> Postgres -> Azure Data Explorer (31 materialized views) -> Elasticsearch -> Next.js 16 frontend. I lead the ADX->ES sync service, the synthetic telemetry generator, and significant frontend work.' },
  { q: ['p2p', 'policy', 'pipelines'], a: 'P2P = "Policy -> Pipelines". A 5-agent LangGraph platform that compiles plain-English policy into compiled rules, drift scans GCP, plans reversible gcloud remediation, risk-scores each plan, and executes with audit-ready evidence packs. Stack: LangGraph + Gemini 2.5 Pro on Vertex AI + FastAPI + React.' },
  { q: ['stack', 'tech', 'tools'], a: 'Languages: Python, C++, Java, TypeScript, R, SQL. AI/ML: LangGraph, LangChain, RAG, LSTM, Azure AI Foundry, Vertex AI. Cloud: Azure (AKS, ACA, Functions, ADX), AWS, GCP. Dev: Docker, FastAPI, Next.js, React, GH Actions.' },
  { q: ['hire', 'hiring', 'available', 'opportun'], a: 'I am open to collaborations on agentic AI, cloud architecture and platform engineering. Drop me a line at kevilpatel24@gmail.com.' },
  { q: ['contact', 'email', 'reach'], a: 'Email kevilpatel24@gmail.com, LinkedIn /in/kevil21, GitHub /kevil21, or call +91 999 896 7939.' },
  { q: ['kyndryl'], a: 'I joined Kyndryl in July 2025 as an Associate SDE in the Agentic AI practice. I work on A360, P2P and enterprise AI Foundry POCs.' },
  { q: ['vit', 'education', 'college'], a: 'B.Tech CSE from VIT Vellore, 2021-2025. CGPA 8.95/10 and AIR 56 in VITEEE.' },
  { q: ['cert', 'certif'], a: 'I hold 10 active certifications: AWS SAA + CCP, Microsoft AI-102/AZ-104/AZ-900, GitHub GH-300, Microsoft Excellerate Agentic AI, and Founderz Agent Master/Commander/Explorer. Verification links are on the credentials section.' },
  { q: ['easter', 'fun', 'hidden', 'secret'], a: 'Try the Konami code, type "matrix" in the terminal, hit Cmd/Ctrl+K for the command palette, and ask the palette for snake, chess or doom.' },
  { q: ['snake'], a: 'Open the command palette (Cmd/Ctrl+K) and run "easter: snake". Arrows to play.' },
  { q: ['chess'], a: 'Cmd/Ctrl+K -> "easter: chess". Drag pieces around freely — no engine, just the board.' },
  { q: ['doom'], a: 'Cmd/Ctrl+K -> "easter: doom" to toggle CRT scanlines + hue-shifted neural canvas. Toggle again to exit.' },
  { q: ['language', 'french', 'hindi', 'gujarati'], a: 'Click the EN button in the nav to cycle EN -> FR -> HI -> GU. Only a few hero strings translate today.' },
  { q: ['theme', 'dark', 'light'], a: 'First visit follows your OS preference. The moon/sun button toggles and persists. Default is dark.' },
  { q: ['sound', 'audio'], a: 'Sound is ON by default with distinct tones per interaction. Toggle from the ON/OFF button in the nav.' }
];
function chatReply(text) {
  const t = text.toLowerCase();
  const hit = KB.find(k => k.q.some(w => t.includes(w)));
  return hit ? hit.a : 'I am a canned-answer persona of Kevil — try asking about A360, P2P, the stack, certifications, easter eggs, or how to contact him.';
}
function pushMsg(text, who) { const d = document.createElement('div'); d.className = 'chat-msg ' + (who === 'me' ? 'usr' : 'kb'); d.textContent = text; chatLog.appendChild(d); chatLog.scrollTop = chatLog.scrollHeight; }
function renderQuick() { chatQuick.innerHTML = QUICK.map(q => `<button data-snd="ghost">${q}</button>`).join(''); chatQuick.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { pushMsg(b.textContent, 'me'); setTimeout(() => pushMsg(chatReply(b.textContent), 'bot'), 220); })); }
chatFab.addEventListener('click', () => { chatPanel.hidden = !chatPanel.hidden; if (!chatPanel.hidden && !chatLog.childElementCount) { pushMsg('Hi! I am kevil.bot — a canned persona. Ask about A360, P2P, the stack, or use the quick chips below.', 'bot'); renderQuick(); } playSnd(chatPanel.hidden ? 'close' : 'open'); });
$('#chat-close').addEventListener('click', () => { chatPanel.hidden = true; playSnd('close'); });
chatForm.addEventListener('submit', e => { e.preventDefault(); const v = chatInput.value.trim(); if (!v) return; pushMsg(v, 'me'); chatInput.value = ''; setTimeout(() => pushMsg(chatReply(v), 'bot'), 260); });

/* ---------- SNAKE ---------- */
const snakeModal = $('#snake-modal'), snakeCv = $('#snake-canvas'), snakeScore = $('#snake-score');
let snakeRAF = null, snakeKey = null;
function startSnake() {
  snakeModal.hidden = false; playSnd('open');
  const ctx = snakeCv.getContext('2d'); const SZ = 18, COLS = 20, ROWS = 20;
  let snake = [{ x: 10, y: 10 }]; let dir = { x: 1, y: 0 }; let food = { x: 5, y: 5 }; let score = 0;
  let best = +(localStorage.getItem('kp-snake-best') || 0);
  snakeScore.textContent = `score 0 · best ${best}`;
  function placeFood() { food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  function step() {
    const h = { x: (snake[0].x + dir.x + COLS) % COLS, y: (snake[0].y + dir.y + ROWS) % ROWS };
    if (snake.some(s => s.x === h.x && s.y === h.y)) { gameOver(); return; }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) { score++; playSnd('tick'); placeFood(); snakeScore.textContent = `score ${score} · best ${Math.max(score, best)}`; }
    else snake.pop();
    // draw
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, snakeCv.width, snakeCv.height);
    ctx.fillStyle = '#ff6ec7'; ctx.fillRect(food.x * SZ + 2, food.y * SZ + 2, SZ - 4, SZ - 4);
    snake.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#7df9ff' : 'rgba(125,249,255,.6)'; ctx.fillRect(s.x * SZ + 1, s.y * SZ + 1, SZ - 2, SZ - 2); });
  }
  function gameOver() {
    if (score > best) { best = score; localStorage.setItem('kp-snake-best', best); }
    clearInterval(snakeRAF); snakeRAF = null;
    snakeScore.innerHTML = `<b style="color:var(--accent-2)">game over</b> · score ${score} · best ${best} · esc to close, any arrow to restart`;
    playSnd('error');
  }
  snakeKey = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { stopSnake(); return; }
    if (!snakeRAF && (k.startsWith('arrow') || 'wasd'.includes(k))) { startSnake(); stopSnake(true); return; }
    if (k === 'arrowup' || k === 'w') { if (dir.y !== 1) dir = { x: 0, y: -1 }; }
    if (k === 'arrowdown' || k === 's') { if (dir.y !== -1) dir = { x: 0, y: 1 }; }
    if (k === 'arrowleft' || k === 'a') { if (dir.x !== 1) dir = { x: -1, y: 0 }; }
    if (k === 'arrowright' || k === 'd') { if (dir.x !== -1) dir = { x: 1, y: 0 }; }
  };
  window.addEventListener('keydown', snakeKey);
  snakeRAF = setInterval(step, 110);
}
function stopSnake(keepOpen) {
  if (snakeRAF) { clearInterval(snakeRAF); snakeRAF = null; }
  window.removeEventListener('keydown', snakeKey); snakeKey = null;
  if (!keepOpen) { snakeModal.hidden = true; playSnd('close'); }
}
snakeModal.querySelector('.case-back').addEventListener('click', () => stopSnake());
snakeModal.querySelector('.mini-close').addEventListener('click', () => stopSnake());

/* ---------- CHESS (free-play, no engine) ---------- */
const chessModal = $('#chess-modal'), chessBoard = $('#chess-board');
function startChess() {
  chessModal.hidden = false; playSnd('open');
  const start = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
  const GLY = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚', P:'♙', R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔' };
  chessBoard.innerHTML = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sq = document.createElement('div'); sq.className = 'sq ' + ((x + y) % 2 ? 'd' : 'l'); sq.dataset.x = x; sq.dataset.y = y;
    if (start[y][x]) { const p = document.createElement('span'); p.className = 'pc ' + (start[y][x] === start[y][x].toUpperCase() ? 'w' : 'b'); p.textContent = GLY[start[y][x]]; sq.appendChild(p); }
    chessBoard.appendChild(sq);
  }
  let sel = null;
  chessBoard.querySelectorAll('.sq').forEach(sq => sq.addEventListener('click', () => {
    const piece = sq.firstChild;
    if (sel && sel !== sq) {
      if (sel.firstChild) { sq.innerHTML = ''; sq.appendChild(sel.firstChild); playSnd('tick'); }
      sel.classList.remove('sel'); sel = null;
    } else if (piece) { sel = sq; sq.classList.add('sel'); }
  }));
}
function stopChess() { chessModal.hidden = true; playSnd('close'); }
chessModal.querySelector('.case-back').addEventListener('click', stopChess);
chessModal.querySelector('.mini-close').addEventListener('click', stopChess);

/* ---------- DOOM mode ---------- */
function toggleDoom() {
  document.documentElement.classList.toggle('doom');
  const on = document.documentElement.classList.contains('doom');
  playSnd(on ? 'error' : 'success');
}

/* ---------- extend command palette ---------- */
palCmds.push(
  { label: 'easter: snake game', k: 'easter', act: () => startSnake() },
  { label: 'easter: chess board', k: 'easter', act: () => startChess() },
  { label: 'easter: doom mode (CRT)', k: 'easter', act: () => toggleDoom() },
  { label: 'open: chat with kevil.bot', k: 'cmd', act: () => chatFab.click() },
  { label: 'download: resume as PDF', k: 'cmd', act: () => $('#pdf-btn').click() },
  { label: 'cycle: language (EN/FR/HI/GU)', k: 'cmd', act: () => langBtn.click() },
  { label: 'open: behind the scenes', k: 'nav', act: () => { location.href = 'behind.html'; } },
  { label: 'open: stack page', k: 'nav', act: () => { location.href = 'stack.html'; } }
);

/* ---------- ESCAPE closes any open overlay ---------- */
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!caseModal.hidden) closeCase();
  if (!snakeModal.hidden) stopSnake();
  if (!chessModal.hidden) stopChess();
  if (!chatPanel.hidden) { chatPanel.hidden = true; playSnd('close'); }
});

/* ---------- extend terminal commands ---------- */
termCmds.snake = () => { startSnake(); return 'launching snake.exe...'; };
termCmds.chess = () => { startChess(); return 'opening chess board...'; };
termCmds.doom = () => { toggleDoom(); return document.documentElement.classList.contains('doom') ? 'doom mode engaged.' : 'doom mode disengaged.'; };
termCmds.pdf = () => { $('#pdf-btn').click(); return 'opening print dialog (use save as PDF).'; };
termCmds.lang = () => { langBtn.click(); return 'language -> ' + curLang; };
termCmds.chat = () => { chatFab.click(); return 'chat panel toggled.'; };
termCmds.behind = () => { location.href = 'behind.html'; return 'navigating...'; };
termCmds.stack = () => { location.href = 'stack.html'; return 'navigating...'; };

console.log('%c kevil.os v3.2 — extras loaded (snake, chess, doom, chat, i18n) ', 'background:#ff6ec7;color:#000;font-weight:700;padding:4px 8px;border-radius:4px;font-family:monospace');

/* ============================================================
   v3.2 ADDITIONS
   ============================================================ */

/* ---------- PHASE 1: GLSL shader background — moved to shader-bg.js so it runs on every page ---------- */

/* ---------- PHASE 2: AUDIO VISUALIZER (boot screen waveform) ---------- */
(function bootViz() {
  const cv = $('#boot-viz'); if (!cv) return;
  const ctx = cv.getContext('2d');
  let phase = 0;
  function draw() {
    if (!$('#boot')) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = 'rgba(125,249,255,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < cv.width; x++) {
      const y = cv.height / 2 + Math.sin(x * 0.03 + phase) * 8 + Math.sin(x * 0.07 + phase * 1.3) * 5 + Math.sin(x * 0.11 + phase * 0.7) * 3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // secondary wave
    ctx.strokeStyle = 'rgba(255,110,199,.25)';
    ctx.beginPath();
    for (let x = 0; x < cv.width; x++) {
      const y = cv.height / 2 + Math.cos(x * 0.04 + phase * 1.5) * 6 + Math.sin(x * 0.09 + phase * 0.9) * 4;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    phase += 0.06;
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---------- PHASE 3: ENHANCED CHATBOT with fuzzy matching + typing indicator ---------- */
(function enhancedChat() {
  // Expanded knowledge base
  const EXTRA_KB = [
    { q: ['resume', 'portfolio', 'website', 'site'], a: 'This interactive resume is built with vanilla HTML/CSS/JS + GSAP. It features a GLSL shader background, audio engine, command palette, terminal, 3 skill views, LangGraph simulator, achievements system, and multiple easter eggs. v3.2 is the latest version.' },
    { q: ['langgraph', 'pipeline', 'agent', 'agentic', 'multi-agent'], a: 'I built P2P (Policy-to-Pipelines), a 5-agent LangGraph system. Agents: PolicyCompiler → DriftScanner → RemediationPlanner → RiskAssessor → ChangeExecutor. It auto-remediates cloud drift with human-in-the-loop for high-risk changes. See the interactive simulator in the projects section.' },
    { q: ['adx', 'data explorer', 'kusto'], a: 'I manage the ADX-to-Elasticsearch sync service for A360. It syncs 31 materialized views across N tenants every 10 minutes using incremental timestamps. Doc IDs are SHA-256 hashes for deterministic upserts. DB pattern: acct-{tenant}.' },
    { q: ['docker', 'container', 'kubernetes', 'aks', 'k8s'], a: 'I work with AKS daily for A360 — running Elasticsearch, Kibana, and LiteLLM on the cluster. I also containerize services with multi-stage Docker builds (node:20-alpine for frontend, python:3.12-slim for APIs).' },
    { q: ['synth', 'synthetic', 'telemetry', 'data gen'], a: 'I built the A360 synthetic telemetry generator — it creates realistic agent traces, dependency telemetry, and infra signals for 4+ tenants. Runs on Azure Functions with a 6-hour timer trigger, generates ~72h of backfill data in ~15 seconds.' },
    { q: ['fastapi', 'api', 'gateway', 'backend'], a: 'The A360 API Gateway is a FastAPI app with 7 routers: health, auth (Azure AD JWT), elastic (read-only ES proxy), llm (LiteLLM SSE), kibana (dashboard proxy), cosmos (tenant CRUD), and insights. Runs on App Service with 2 Uvicorn workers.' },
    { q: ['terraform', 'bicep', 'infra', 'iac'], a: 'I use both Bicep and Terraform for Azure IaC. A360 infra is managed with Terraform (App Service, Function Apps, ADX, AKS). I have experience with modules, state management, and CI/CD pipelines for infrastructure.' },
    { q: ['github', 'actions', 'ci', 'cd', 'devops'], a: 'I use GitHub Actions for CI/CD across all A360 repositories. Workflows include: Docker build+push to ACR, App Service deployment with staging slots, Function App deployment, and infrastructure validation.' },
    { q: ['cosmos', 'cosmosdb', 'nosql', 'database'], a: 'A360 uses Cosmos DB for tenant metadata: platform DB (a360-platform) with tenants container, and per-tenant DBs (a360-metadata-tenant-{id}) with agents, business_processes, and config containers.' },
    { q: ['next', 'nextjs', 'react', 'frontend', 'shidoka'], a: 'A360 frontend is Next.js 16 + React 19 with Kyndryl Shidoka Design System. Features: 11 KPI tiles, 10 Kibana embeds, 10 drill-down pages, multi-tenant context, dark/light themes, and real-time data from Elasticsearch.' },
    { q: ['hobby', 'hobbies', 'fun', 'free time', 'interest'], a: 'When not coding, I enjoy exploring AI research papers, building side projects (like this resume!), competitive programming, and exploring new cloud services. I am also into photography and travel across India.' },
    { q: ['gujarati', 'surat', 'india', 'home'], a: 'I am from Surat, Gujarat, India. Currently based between Surat and Bangalore for work at Kyndryl. Surat is famous for diamonds and textiles — and amazing street food!' },
    { q: ['salary', 'compensation', 'pay', 'ctc', 'package', 'money'], a: 'I prefer to discuss compensation details directly. Feel free to reach out at kevilpatel24@gmail.com or +91 999 896 7939 for a confidential conversation.' },
    { q: ['ai foundry', 'foundry', 'azure ai'], a: 'I work with Azure AI Foundry for enterprise AI agent POCs at Kyndryl. This includes model deployment, prompt engineering, and building agentic workflows with LangGraph integration.' },
    { q: ['vertex', 'gcp', 'google cloud', 'gemini'], a: 'P2P runs on Vertex AI with Gemini 2.5 Pro for policy compilation and risk scoring. I also have experience with GCP compute, storage, and BigQuery for data pipelines.' },
    { q: ['strength', 'best', 'good at', 'superpower'], a: 'My strengths: 1) Building end-to-end systems from frontend to infra. 2) Rapid prototyping and shipping. 3) Multi-cloud fluency (Azure/AWS/GCP). 4) Making complex things observable and debuggable.' },
    { q: ['weakness', 'improve', 'growth', 'challenge'], a: 'I am working on deepening my expertise in distributed systems theory, system design for truly massive scale, and contributing more to open-source communities.' },
    { q: ['hello', 'hi', 'hey', 'sup', 'yo'], a: 'Hey! I am kevil.bot — Kevil\'s digital persona. Ask me about his projects (A360, P2P), tech stack, certifications, or try exploring the easter eggs on this site!' },
    { q: ['bye', 'goodbye', 'see you', 'thanks', 'thank'], a: 'Thanks for chatting! Feel free to connect on LinkedIn (/in/kevil21) or drop an email at kevilpatel24@gmail.com. Have a great day!' }
  ];
  // Merge into existing KB
  KB.push(...EXTRA_KB);

  // Fuzzy matching function
  function fuzzyScore(query, target) {
    const q = query.toLowerCase(), t = target.toLowerCase();
    if (t.includes(q)) return 1;
    // token overlap score
    const qTokens = q.split(/\s+/).filter(Boolean);
    const tTokens = t.split(/\s+/).filter(Boolean);
    let matches = 0;
    for (const qt of qTokens) {
      if (tTokens.some(tt => tt.includes(qt) || qt.includes(tt))) matches++;
    }
    return qTokens.length > 0 ? matches / qTokens.length : 0;
  }

  // Override chatReply with fuzzy matching
  window.chatReply = function(text) {
    const t = text.toLowerCase().trim();
    // Exact keyword match first (original logic)
    const exact = KB.find(k => k.q.some(w => t.includes(w)));
    if (exact) return exact.a;
    // Fuzzy match as fallback
    let bestScore = 0, bestHit = null;
    for (const entry of KB) {
      for (const kw of entry.q) {
        const score = fuzzyScore(t, kw);
        if (score > bestScore) { bestScore = score; bestHit = entry; }
      }
    }
    if (bestHit && bestScore > 0.4) return bestHit.a;
    return 'Hmm, I don\'t have a great answer for that. Try asking about A360, P2P, my stack, certifications, easter eggs, or how to contact Kevil. You can also use the quick chips below!';
  };

  // Typing indicator
  const typingEl = $('#chat-typing');
  const origSubmit = chatForm.onsubmit;
  chatForm.removeEventListener('submit', () => {}); // clear old
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const v = chatInput.value.trim(); if (!v) return;
    pushMsg(v, 'me'); chatInput.value = '';
    // Show typing indicator
    if (typingEl) typingEl.hidden = false;
    chatLog.scrollTop = chatLog.scrollHeight;
    const delay = 400 + Math.random() * 600;
    setTimeout(() => {
      if (typingEl) typingEl.hidden = true;
      pushMsg(chatReply(v), 'bot');
    }, delay);
  });
})();

/* ---------- PHASE 4: CHESS WITH STOCKFISH ---------- */
(function enhancedChess() {
  let stockfish = null, board = [], turn = 'w', selected = null, moveHistory = [];
  const GLY = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚', P:'♙', R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔' };
  const chessEval = $('#chess-eval');
  const chessStatus = $('#chess-status');

  function initBoard() {
    return [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
  }

  function pieceColor(p) { return p === p.toUpperCase() ? 'w' : 'b'; }

  function isValidMove(b, fy, fx, ty, tx) {
    const piece = b[fy][fx]; if (!piece) return false;
    const target = b[ty][tx];
    if (target && pieceColor(target) === pieceColor(piece)) return false;
    const dy = ty - fy, dx = tx - fx;
    const pt = piece.toLowerCase();
    if (pt === 'p') {
      const dir = pieceColor(piece) === 'w' ? -1 : 1;
      const start = pieceColor(piece) === 'w' ? 6 : 1;
      if (dx === 0 && !target) {
        if (dy === dir) return true;
        if (fy === start && dy === 2 * dir && !b[fy + dir][fx]) return true;
      }
      if (Math.abs(dx) === 1 && dy === dir && target) return true;
      return false;
    }
    if (pt === 'r') return (dx === 0 || dy === 0) && pathClear(b, fy, fx, ty, tx);
    if (pt === 'b') return Math.abs(dx) === Math.abs(dy) && pathClear(b, fy, fx, ty, tx);
    if (pt === 'q') return ((dx === 0 || dy === 0) || Math.abs(dx) === Math.abs(dy)) && pathClear(b, fy, fx, ty, tx);
    if (pt === 'n') return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
    if (pt === 'k') return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    return false;
  }

  function pathClear(b, fy, fx, ty, tx) {
    const sy = Math.sign(ty - fy), sx = Math.sign(tx - fx);
    let cy = fy + sy, cx = fx + sx;
    while (cy !== ty || cx !== tx) {
      if (b[cy][cx]) return false;
      cy += sy; cx += sx;
    }
    return true;
  }

  function boardToFen(b, t) {
    let fen = '';
    for (let y = 0; y < 8; y++) {
      let empty = 0;
      for (let x = 0; x < 8; x++) {
        if (!b[y][x]) { empty++; }
        else { if (empty) { fen += empty; empty = 0; } fen += b[y][x]; }
      }
      if (empty) fen += empty;
      if (y < 7) fen += '/';
    }
    return fen + ' ' + t + ' KQkq - 0 1';
  }

  function renderBoard() {
    const el = $('#chess-board'); el.innerHTML = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((x + y) % 2 ? 'd' : 'l');
      sq.dataset.x = x; sq.dataset.y = y;
      if (selected && selected.x === x && selected.y === y) sq.classList.add('sel');
      if (board[y][x]) {
        const p = document.createElement('span');
        p.className = 'pc ' + (pieceColor(board[y][x]) === 'w' ? 'w' : 'b');
        p.textContent = GLY[board[y][x]];
        sq.appendChild(p);
      }
      sq.addEventListener('click', () => handleSquareClick(y, x));
      el.appendChild(sq);
    }
  }

  function handleSquareClick(y, x) {
    if (turn !== 'w') return; // player plays white
    if (selected) {
      if (isValidMove(board, selected.y, selected.x, y, x)) {
        moveHistory.push(JSON.parse(JSON.stringify(board)));
        board[y][x] = board[selected.y][selected.x];
        board[selected.y][selected.x] = '';
        // pawn promotion
        if (board[y][x] === 'P' && y === 0) board[y][x] = 'Q';
        selected = null; turn = 'b';
        renderBoard(); playSnd('tick');
        setTimeout(aiMove, 300);
      } else {
        selected = board[y][x] && pieceColor(board[y][x]) === 'w' ? { y, x } : null;
        renderBoard();
      }
    } else {
      if (board[y][x] && pieceColor(board[y][x]) === 'w') {
        selected = { y, x }; renderBoard(); playSnd('hover');
      }
    }
  }

  function aiMove() {
    // Simple AI: try to capture high-value pieces, otherwise random legal move
    const moves = [];
    const vals = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 8; fx++) {
      if (!board[fy][fx] || pieceColor(board[fy][fx]) !== 'b') continue;
      for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
        if (isValidMove(board, fy, fx, ty, tx)) {
          const captureVal = board[ty][tx] ? (vals[board[ty][tx].toLowerCase()] || 0) : 0;
          moves.push({ fy, fx, ty, tx, score: captureVal + Math.random() * 0.5 });
        }
      }
    }
    if (moves.length === 0) {
      if (chessStatus) chessStatus.textContent = 'checkmate — you win!';
      playSnd('success'); return;
    }
    moves.sort((a, b) => b.score - a.score);
    const m = moves[0];
    moveHistory.push(JSON.parse(JSON.stringify(board)));
    board[m.ty][m.tx] = board[m.fy][m.fx];
    board[m.fy][m.fx] = '';
    if (board[m.ty][m.tx] === 'p' && m.ty === 7) board[m.ty][m.tx] = 'q';
    turn = 'w';
    renderBoard(); playSnd('click');
    if (chessEval) chessEval.textContent = `moves: ${moveHistory.length}`;
  }

  // Override startChess
  window.startChess = function() {
    chessModal.hidden = false; playSnd('open');
    board = initBoard(); turn = 'w'; selected = null; moveHistory = [];
    if (chessStatus) chessStatus.textContent = 'your turn (white) · AI plays black';
    if (chessEval) chessEval.textContent = '';
    renderBoard();
  };

  // New game button
  const newBtn = $('#chess-new'); if (newBtn) newBtn.addEventListener('click', () => { board = initBoard(); turn = 'w'; selected = null; moveHistory = []; renderBoard(); playSnd('primary'); if (chessStatus) chessStatus.textContent = 'your turn (white)'; if (chessEval) chessEval.textContent = ''; });
  const undoBtn = $('#chess-undo'); if (undoBtn) undoBtn.addEventListener('click', () => {
    if (moveHistory.length >= 2) { moveHistory.pop(); board = moveHistory.pop(); turn = 'w'; selected = null; renderBoard(); playSnd('nav'); }
  });
})();

/* ---------- PHASE 5: ENGINE ANALYSIS OVERLAY FOR LANGGRAPH ---------- */
(function lgAnalysis() {
  const lgSection = $('.lg-stage')?.closest('section') || $('.lg-stage')?.parentElement;
  if (!lgSection) return;
  const overlay = document.createElement('div');
  overlay.className = 'lg-analysis';
  overlay.innerHTML = '<div class="lg-metric"><span>latency</span><span class="val" id="lg-lat">—</span></div><div class="lg-metric"><span>tokens</span><span class="val" id="lg-tok">—</span></div><div class="lg-metric"><span>cost est</span><span class="val" id="lg-cost">—</span></div><div class="lg-metric"><span>confidence</span><span class="val" id="lg-conf">—</span></div>';
  lgSection.style.position = 'relative';
  lgSection.appendChild(overlay);

  // Hook into pipeline simulation to update metrics
  const origClick = lgBtn.onclick;
  lgBtn.addEventListener('click', () => {
    overlay.classList.add('visible');
    let elapsed = 0;
    const intv = setInterval(() => {
      elapsed += 2.2;
      const latEl = $('#lg-lat'), tokEl = $('#lg-tok'), costEl = $('#lg-cost'), confEl = $('#lg-conf');
      if (latEl) latEl.textContent = (elapsed).toFixed(1) + 's';
      if (tokEl) tokEl.textContent = Math.floor(200 + elapsed * 80);
      if (costEl) costEl.textContent = '$' + (0.001 * elapsed * 80).toFixed(3);
      if (confEl) confEl.textContent = Math.min(98, Math.floor(60 + elapsed * 3.5)) + '%';
      if (elapsed > 12) { clearInterval(intv); }
    }, 2200);
  });
})();

/* ---------- PHASE 6: VIEW TRANSITIONS API ---------- */
(function viewTransitions() {
  if (!document.startViewTransition) return;
  // Override page transition to use View Transitions API
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href$=".html"]');
    if (!a || a.target === '_blank') return;
    e.preventDefault();
    const href = a.getAttribute('href');
    document.startViewTransition(() => {
      playSnd('close');
      location.href = href;
    });
  }, { capture: true });
})();

/* ---------- PHASE 7: DISCOVERY COUNTER & ACHIEVEMENTS ---------- */
(function discoveries() {
  const ACHIEVEMENTS = [
    { id: 'boot', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9z"/></svg>', name: 'First Launch', desc: 'Entered the OS', check: () => true },
    { id: 'theme', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', name: 'Theme Shifter', desc: 'Toggled dark/light theme' },
    { id: 'cmd', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>', name: 'Power User', desc: 'Opened command palette' },
    { id: 'terminal', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>', name: 'Terminal Hacker', desc: 'Used the built-in terminal' },
    { id: 'snake', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>', name: 'Snake Charmer', desc: 'Played the snake game' },
    { id: 'chess', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>', name: 'Grand Master', desc: 'Started a chess game' },
    { id: 'doom', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>', name: 'Doom Slayer', desc: 'Activated doom mode' },
    { id: 'chat', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Conversationalist', desc: 'Chatted with kevil.bot' },
    { id: 'photo', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>', name: 'Gallery Walker', desc: 'Viewed photo carousel' },
    { id: 'project', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', name: 'Case Study Reader', desc: 'Opened a project case study' },
    { id: 'skills3', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', name: 'Skill Explorer', desc: 'Tried all 3 skill views' },
    { id: 'lang', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>', name: 'Polyglot', desc: 'Changed language' },
    { id: 'sound', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>', name: 'Sound Engineer', desc: 'Toggled sound on/off' },
    { id: 'konami', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><circle cx="17" cy="10" r="1"/><circle cx="15" cy="14" r="1"/></svg>', name: 'Up Up Down Down', desc: 'Entered the Konami code' },
    { id: 'matrix', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>', name: 'Red Pill', desc: 'Activated matrix rain' },
    { id: 'pipeline', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Pipeline Runner', desc: 'Ran the LangGraph simulator' },
    { id: 'scroll', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>', name: 'Deep Scroller', desc: 'Scrolled to the bottom' },
    { id: 'github', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>', name: 'Repo Stalker', desc: 'Viewed GitHub repos' },
    { id: 'share', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>', name: 'Social Sharer', desc: 'Used the share button' },
    { id: 'lite', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', name: 'Minimalist', desc: 'Toggled lite mode' },
    { id: 'allach', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>', name: 'Completionist', desc: 'Unlocked all achievements' }
  ];

  const storageKey = 'kp-achievements';
  let unlocked = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));

  const bar = $('#discovery-bar'), progress = $('#discovery-progress'), label = $('#discovery-label');
  const panel = $('#achievements-panel'), achList = $('#ach-list');

  function updateBar() {
    const pct = (unlocked.size / ACHIEVEMENTS.length) * 100;
    if (progress) progress.style.width = pct + '%';
    if (label) label.textContent = `${unlocked.size} / ${ACHIEVEMENTS.length} discovered`;
  }

  function showToast(ach) {
    const toast = document.createElement('div');
    toast.className = 'ach-toast';
    toast.innerHTML = `<span class="ach-icon">${ach.icon}</span><div><b>${ach.name}</b><br><span style="font-size:11px;color:var(--muted)">${ach.desc}</span></div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3000);
    playSnd('success');
  }

  function unlock(id) {
    if (unlocked.has(id)) return;
    unlocked.add(id);
    localStorage.setItem(storageKey, JSON.stringify([...unlocked]));
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) showToast(ach);
    updateBar();
    // Check if all unlocked (except allach itself)
    if (unlocked.size === ACHIEVEMENTS.length - 1 && !unlocked.has('allach')) unlock('allach');
  }

  function renderPanel() {
    if (!achList) return;
    achList.innerHTML = ACHIEVEMENTS.map(a => `
      <div class="ach-item ${unlocked.has(a.id) ? 'unlocked' : 'locked'}">
        <span class="ach-icon">${a.icon}</span>
        <div class="ach-info"><div class="ach-name">${unlocked.has(a.id) ? a.name : '???'}</div><div class="ach-desc">${a.desc}</div></div>
      </div>
    `).join('');
  }

  // Click bar to open panel
  if (bar) bar.addEventListener('click', () => {
    renderPanel();
    if (panel) panel.hidden = false;
    playSnd('open');
  });
  const achClose = document.querySelector('.ach-close');
  if (achClose) achClose.addEventListener('click', () => { if (panel) panel.hidden = true; playSnd('close'); });
  const achBack = panel?.querySelector('.case-back');
  if (achBack) achBack.addEventListener('click', () => { if (panel) panel.hidden = true; playSnd('close'); });

  // Auto-unlock boot
  unlock('boot');
  updateBar();

  // Hook into existing actions for achievement triggers
  window.KP_UNLOCK = unlock;

  // Theme toggle
  themeBtn.addEventListener('click', () => unlock('theme'));
  // Palette
  const palObs = new MutationObserver(() => { if (!$('#palette').hidden) unlock('cmd'); });
  const palEl = $('#palette'); if (palEl) palObs.observe(palEl, { attributes: true, attributeFilter: ['hidden'] });
  // Terminal
  const termBox = $('.terminal'); if (termBox) termBox.addEventListener('click', () => unlock('terminal'));
  // Snake
  const origStartSnake = window.startSnake || (() => {});
  const _prevSnakeStart = startSnake;
  // Chess
  const origStartChess2 = window.startChess;
  const _wrappedChess = window.startChess;
  // override to track
  const _origChessStart = window.startChess;
  window.startChess = function() { unlock('chess'); _origChessStart.apply(this, arguments); };
  // Sound
  soundBtn.addEventListener('click', () => unlock('sound'));
  // Lang
  langBtn.addEventListener('click', () => unlock('lang'));
  // Chat
  chatFab.addEventListener('click', () => unlock('chat'));
  // Pipeline
  lgBtn.addEventListener('click', () => unlock('pipeline'));
  // Photo carousel click
  const photoFrame = $('#photo-frame'); if (photoFrame) photoFrame.addEventListener('click', () => unlock('photo'));
  // Project modal
  const origOpenCase = window.openCase;
  if (typeof openCase === 'function') {
    const _origOpen = openCase;
    window.openCase = function() { unlock('project'); return _origOpen.apply(this, arguments); };
  }
  // Scroll to bottom
  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) unlock('scroll');
  });
  // Konami
  const konamiObs = new MutationObserver(() => { if ($('#matrix') && !$('#matrix').hidden) unlock('matrix'); });
  const matrixEl = $('#matrix'); if (matrixEl) konamiObs.observe(matrixEl, { attributes: true, attributeFilter: ['hidden'] });

  // Expose for snake/doom hooks
  window.addEventListener('keydown', e => {
    // track konami completion
    if (document.documentElement.classList.contains('doom')) unlock('doom');
  });

  // Escape to close achievements panel
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && panel && !panel.hidden) { panel.hidden = true; playSnd('close'); } });
})();

/* ---------- PHASE 8: LITE MODE TOGGLE ---------- */
(function liteMode() {
  const btn = $('#lite-btn'); if (!btn) return;
  let isLite = localStorage.getItem('kp-lite') === 'on';
  if (isLite) { document.documentElement.classList.add('lite-mode'); btn.classList.add('active'); }

  btn.addEventListener('click', () => {
    isLite = !isLite;
    document.documentElement.classList.toggle('lite-mode', isLite);
    btn.classList.toggle('active', isLite);
    localStorage.setItem('kp-lite', isLite ? 'on' : 'off');
    playSnd(isLite ? 'close' : 'open');
    if (typeof KP_UNLOCK === 'function') KP_UNLOCK('lite');
  });
})();

/* ---------- PHASE 9: SCREENSHOT / SHARE ---------- */
(function shareBtn() {
  const btn = $('#share-btn'); if (!btn) return;
  btn.addEventListener('click', async () => {
    playSnd('primary');
    if (typeof KP_UNLOCK === 'function') KP_UNLOCK('share');

    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kevil Patel — Interactive Resume',
          text: 'Check out this interactive developer resume with GLSL shaders, a chess engine, command palette, and more!',
          url: location.href
        });
        btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 600);
        return;
      } catch (e) { /* user cancelled or not supported */ }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(location.href);
      const toast = document.createElement('div');
      toast.className = 'ach-toast show';
      toast.innerHTML = '<span class="ach-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></span><div><b>Link copied!</b><br><span style="font-size:11px;color:var(--muted)">Share this resume with anyone</span></div>';
      document.body.appendChild(toast);
      setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 2500);
      btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 600);
    } catch (e) {
      // Last resort: prompt
      prompt('Copy this link:', location.href);
    }
  });
})();

/* ---------- PHASE 10: A/B HERO VARIANT (particle field) ---------- */
(function heroParticles() {
  const hero = $('#hero'); if (!hero) return;
  const cv = document.createElement('canvas');
  cv.id = 'hero-particles'; cv.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0';
  hero.style.position = 'relative';
  hero.insertBefore(cv, hero.firstChild);
  const ctx = cv.getContext('2d');

  function resize() { cv.width = hero.offsetWidth; cv.height = hero.offsetHeight; }
  resize(); window.addEventListener('resize', resize);

  const pts = [];
  for (let i = 0; i < 50; i++) {
    pts.push({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      vx: rand(-0.3, 0.3), vy: rand(-0.15, 0.15),
      r: rand(1, 2.5), alpha: rand(0.15, 0.5)
    });
  }

  let hmx = cv.width / 2, hmy = cv.height / 2;
  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    hmx = e.clientX - rect.left; hmy = e.clientY - rect.top;
  });

  function draw() {
    if (document.documentElement.classList.contains('lite-mode')) { requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, cv.width, cv.height);
    const isLight = document.documentElement.dataset.theme === 'light';

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      // Mouse attraction
      const dx = hmx - p.x, dy = hmy - p.y, d = Math.hypot(dx, dy);
      if (d < 200 && d > 10) { p.vx += (dx / d) * 0.02; p.vy += (dy / d) * 0.02; }
      // Bounds
      if (p.x < 0 || p.x > cv.width) p.vx *= -1;
      if (p.y < 0 || p.y > cv.height) p.vy *= -1;
      p.vx *= 0.99; p.vy *= 0.99;
      // Draw
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = isLight ? '#0369a1' : '#7df9ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 100) {
          ctx.globalAlpha = (1 - d / 100) * 0.15;
          ctx.strokeStyle = isLight ? '#0369a1' : '#7df9ff';
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ---------- PHASE 11: HAND TRACKING (MediaPipe, lazy-loaded) ---------- */
(function handNav() {
  // Indicator
  const indicator = document.createElement('div');
  indicator.id = 'hand-indicator';
  indicator.innerHTML = '<span class="hand-trail"></span><span class="hand-dot"></span><span class="hand-mode">POINT</span>';
  document.body.appendChild(indicator);

  // Persistent instructions panel (lives until user closes it)
  const help = document.createElement('div');
  help.id = 'hand-help';
  help.innerHTML = `
    <div class="hh-head">
      <span class="hh-dot"></span>
      <b>hand gestures</b>
      <button class="hh-x" aria-label="close" title="hide">×</button>
    </div>
    <ul class="hh-list">
      <li><span class="hh-key">POINT</span> open hand · index finger up · move cursor</li>
      <li><span class="hh-key">CLICK</span> bring thumb + index together (pinch)</li>
      <li><span class="hh-key">SCROLL</span> index + middle up · move hand up/down</li>
      <li><span class="hh-key">TIP</span> use the center of the camera frame</li>
    </ul>
    <div class="hh-foot">press the hand button again to stop</div>`;
  document.body.appendChild(help);
  help.querySelector('.hh-x').addEventListener('click', () => { help.classList.remove('show'); help.classList.add('hidden'); });

  let handsInstance = null;
  let cameraInstance = null;
  let videoEl = null;
  let active = false;
  const btn = document.getElementById('hand-btn');

  // Smaller active area: central 60% of camera maps to full screen (v3.2: bigger than v3.1)
  const ACTIVE_MIN = 0.18;
  const ACTIVE_MAX = 0.82;
  const remap = (v) => Math.min(1, Math.max(0, (v - ACTIVE_MIN) / (ACTIVE_MAX - ACTIVE_MIN)));

  // Smoothing — v3.2: snappier (was 0.35) so cursor feels less laggy
  let smoothX = null, smoothY = null;
  const SMOOTH = 0.5; // lerp factor

  // Pinch/click state machine with frame stability
  const PINCH_THRESHOLD = 0.055;     // close = pinch
  const PINCH_RELEASE   = 0.090;     // hysteresis: must open this much to un-pinch
  const PINCH_STABLE_FRAMES = 3;     // need N consecutive frames before firing click
  let pinchFrames = 0;
  let isPinching = false;
  let lastClickAt = 0;
  let frozenX = null, frozenY = null;  // freeze cursor during pinch

  // Scroll state — continuous velocity model so scrolling feels natural
  let scrollMode = false;
  let scrollAnchorY = null;     // remap-space y when scroll began
  let scrollLastY = null;
  let scrollVelocity = 0;       // current velocity, decays each rAF
  const SCROLL_GAIN = 5.0;      // px per (delta-ny per frame) — much larger than before
  const SCROLL_FRICTION = 0.88; // velocity decay per rAF
  const SCROLL_DEADZONE = 0.008;
  let rafId = null;

  function scrollLoop() {
    rafId = requestAnimationFrame(scrollLoop);
    if (!active) return;
    if (Math.abs(scrollVelocity) > 0.5) {
      window.scrollBy(0, scrollVelocity);
      scrollVelocity *= SCROLL_FRICTION;
    } else {
      scrollVelocity = 0;
    }
  }

  palCmds.push({ label: 'experimental: hand tracking navigation', k: 'experimental', act: () => toggleHandTracking() });
  termCmds.handtrack = () => { toggleHandTracking(); return active ? 'stopping hand tracking...' : 'starting hand tracking...'; };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  function toast(html, ms = 3500) {
    const t = document.createElement('div');
    t.className = 'ach-toast show';
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, ms);
  }

  function dramaActivate(label) {
    const o = document.createElement('div');
    o.className = 'hand-drama';
    o.innerHTML = `
      <div class="hd-grid"></div>
      <div class="hd-scan"></div>
      <svg class="hd-hand" viewBox="0 0 200 220" width="180" height="200">
        <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path class="hd-l1" d="M100 200 V90 Q100 70 80 70 Q60 70 60 90 V160" />
          <path class="hd-l2" d="M80 70 V40 Q80 25 95 25 Q110 25 110 40 V80" />
          <path class="hd-l3" d="M110 35 V20 Q110 8 125 8 Q140 8 140 22 V90" />
          <path class="hd-l4" d="M140 32 V18 Q140 10 152 10 Q164 10 164 22 V100" />
          <path class="hd-l5" d="M60 110 V90 Q40 90 40 108 V150 Q60 175 80 185 H120 Q170 175 170 130 V90 Q170 75 158 75 Q150 75 150 86" />
        </g>
        <circle class="hd-pt" cx="100" cy="20" r="0" fill="#7df9ff" />
      </svg>
      <div class="hd-label">${label}</div>
      <div class="hd-corners"><i></i><i></i><i></i><i></i></div>
      <div class="hd-readout">
        <div class="hd-row">> initializing mediapipe.hands</div>
        <div class="hd-row">> requesting camera access</div>
        <div class="hd-row">> calibrating active region: 56% center</div>
        <div class="hd-row">> gestures: point · pinch · two-finger scroll</div>
      </div>
    `;
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('show'));
    return o;
  }
  function dramaSuccess(o) {
    if (!o) return;
    o.classList.add('done');
    setTimeout(() => { o.classList.remove('show'); setTimeout(() => o.remove(), 700); }, 900);
  }
  function dramaFail(o, msg) {
    if (!o) return;
    o.classList.add('fail');
    const r = o.querySelector('.hd-readout');
    if (r) r.insertAdjacentHTML('beforeend', `<div class="hd-row hd-err">! ${msg}</div>`);
    setTimeout(() => { o.classList.remove('show'); setTimeout(() => o.remove(), 700); }, 2400);
  }

  function stopHandTracking() {
    try { if (cameraInstance && cameraInstance.stop) cameraInstance.stop(); } catch (e) { /* */ }
    try { if (videoEl && videoEl.srcObject) videoEl.srcObject.getTracks().forEach(tr => tr.stop()); } catch (e) { /* */ }
    if (videoEl) { videoEl.classList.add('hand-vid-out'); setTimeout(() => { if (videoEl) videoEl.remove(); videoEl = null; }, 400); }
    indicator.style.display = 'none';
    help.classList.remove('show');
    active = false;
    isPinching = false; pinchFrames = 0; scrollMode = false; scrollVelocity = 0;
    smoothX = smoothY = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (btn) btn.classList.remove('active');
    toast('<span class="ach-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg></span><div><b>Hand Tracking Off</b></div>', 1800);
  }

  function toggleHandTracking() {
    if (active) { stopHandTracking(); return; }
    initHandTracking();
  }

  async function initHandTracking() {
    if (active) return;
    active = true;
    if (btn) btn.classList.add('active', 'loading');

    // === Step 1: figure out camera permission state BEFORE showing drama ===
    let perm = 'unknown';
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const ps = await navigator.permissions.query({ name: 'camera' });
        perm = ps.state; // 'granted' | 'prompt' | 'denied'
      }
    } catch (e) { /* permissions API not supported on Safari for camera; treat as 'prompt' */ }

    if (perm === 'denied') {
      active = false;
      if (btn) btn.classList.remove('active', 'loading');
      toast('<span class="ach-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/></svg></span><div><b>Camera blocked</b><br><span style="font-size:11px;color:var(--muted)">enable camera in browser settings</span></div>', 4000);
      return;
    }

    // === Step 2: if already granted, show drama immediately. Otherwise wait for getUserMedia ===
    let drama = null;
    if (perm === 'granted') {
      drama = dramaActivate('hand tracking online');
    }

    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js');
      if (!window.Hands || !window.Camera) throw new Error('MediaPipe globals missing');

      // === Step 3: explicitly probe camera so we control when drama appears ===
      // If perm was 'prompt', the next line triggers the native permission dialog.
      // We delay the drama until the user has clicked Allow.
      let probeStream = null;
      if (perm !== 'granted') {
        probeStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        // Permission granted now — show drama
        drama = dramaActivate('hand tracking online');
      }

      videoEl = document.createElement('video');
      videoEl.className = 'hand-vid hand-vid-in';
      videoEl.id = 'hand-video';
      videoEl.muted = true; videoEl.playsInline = true; videoEl.autoplay = true;
      // Hand the existing stream off to the video element so we don't ask twice
      if (probeStream) {
        videoEl.srcObject = probeStream;
        try { await videoEl.play(); } catch (_) { /* */ }
      }
      document.body.appendChild(videoEl);

      handsInstance = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}` });
      // v3.2: tighter detection thresholds + heavier model for stability
      handsInstance.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

      const modeEl = indicator.querySelector('.hand-mode');

      handsInstance.onResults(results => {
        if (!active) return;
        if (!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0)) {
          indicator.style.display = 'none';
          scrollMode = false; scrollAnchorY = scrollLastY = null;
          pinchFrames = 0; isPinching = false;
          smoothX = smoothY = null;
          return;
        }

        const lm = results.multiHandLandmarks[0];
        // Landmarks we care about
        const wrist  = lm[0];
        const thumbT = lm[4],  thumbI = lm[3];
        const idxT   = lm[8],  idxP   = lm[6],  idxMcp = lm[5];
        const midT   = lm[12], midP   = lm[10], midMcp = lm[9];
        const ringT  = lm[16], ringMcp = lm[13];
        const pkyT   = lm[20], pkyMcp = lm[17];

        // Hand-size-relative pinch distance (so distance from camera doesn't break it).
        // Reference: distance from wrist to index-MCP — roughly the "palm length".
        const palm = Math.hypot(wrist.x - idxMcp.x, wrist.y - idxMcp.y) || 0.15;
        const rawPinch = Math.hypot(idxT.x - thumbT.x, idxT.y - thumbT.y);
        const pinchRel = rawPinch / palm; // ~0.4 when pinching, ~1.0+ when open

        // Finger extension (tip noticeably above its MCP in normalised cam-space).
        // Using PIP joint too (more reliable than mcp alone for index/middle).
        const ext = (tip, joint, mcp) => (mcp.y - tip.y) > 0.06 && (joint.y - tip.y) > 0.01;
        const indexExt  = ext(idxT, idxP, idxMcp);
        const middleExt = ext(midT, midP, midMcp);
        const ringExt   = (ringMcp.y - ringT.y) > 0.04;
        const pinkyExt  = (pkyMcp.y - pkyT.y) > 0.04;

        // Map to screen (mirrored) with smoothing
        const nx = remap(1 - idxT.x);
        const ny = remap(idxT.y);
        const tx = nx * innerWidth, ty = ny * innerHeight;
        smoothX = smoothX === null ? tx : smoothX + (tx - smoothX) * SMOOTH;
        smoothY = smoothY === null ? ty : smoothY + (ty - smoothY) * SMOOTH;
        const x = smoothX, y = smoothY;
        indicator.style.display = 'block';
        indicator.style.left = x + 'px';
        indicator.style.top  = y + 'px';

        // ===== SCROLL MODE =====
        // Trigger: index + middle extended, ring + pinky curled (peace sign)
        const isScrollGesture = indexExt && middleExt && !ringExt && !pinkyExt;
        if (isScrollGesture) {
          if (!scrollMode) {
            scrollMode = true;
            scrollAnchorY = ny;
            scrollLastY = ny;
            indicator.classList.add('scroll');
            indicator.classList.remove('pinch');
            if (modeEl) modeEl.textContent = 'SCROLL';
            return;
          }
          // Continuous velocity: how far hand has moved from last frame
          const delta = ny - scrollLastY;
          scrollLastY = ny;
          if (Math.abs(delta) > SCROLL_DEADZONE) {
            // Larger delta → exponentially faster scroll (feels natural)
            scrollVelocity += delta * innerHeight * SCROLL_GAIN;
          }
          // Cap velocity
          scrollVelocity = Math.max(-90, Math.min(90, scrollVelocity));
          return;
        }
        if (scrollMode) {
          scrollMode = false;
          scrollAnchorY = scrollLastY = null;
          indicator.classList.remove('scroll');
        }

        // ===== PINCH/CLICK with hysteresis + stability =====
        const closeNow = pinchRel < (PINCH_THRESHOLD / 0.15); // normalize: palm≈0.15
        // Simpler: use absolute distance with hysteresis (it's been working historically too).
        const dist = rawPinch;
        if (!isPinching) {
          if (dist < PINCH_THRESHOLD) {
            pinchFrames++;
            if (pinchFrames >= PINCH_STABLE_FRAMES) {
              isPinching = true;
              frozenX = x; frozenY = y;
              indicator.classList.add('pinch');
              if (modeEl) modeEl.textContent = 'CLICK';
              const now = performance.now();
              if (now - lastClickAt > 500) {
                lastClickAt = now;
                // Click at the FROZEN position so cursor doesn't drift during pinch
                const el = document.elementFromPoint(frozenX, frozenY);
                if (el && el !== indicator && el !== videoEl && !videoEl.contains(el) && !help.contains(el)) {
                  el.click();
                  indicator.classList.add('flash');
                  setTimeout(() => indicator.classList.remove('flash'), 220);
                }
              }
            }
          } else {
            pinchFrames = 0;
          }
        } else {
          // While pinching, freeze cursor at the click location for visual stability
          indicator.style.left = frozenX + 'px';
          indicator.style.top  = frozenY + 'px';
          if (dist > PINCH_RELEASE) {
            isPinching = false;
            pinchFrames = 0;
            indicator.classList.remove('pinch');
            if (modeEl) modeEl.textContent = 'POINT';
          }
        }

        if (!isPinching && !scrollMode && modeEl) modeEl.textContent = 'POINT';
      });

      cameraInstance = new window.Camera(videoEl, {
        onFrame: async () => { if (active && handsInstance) await handsInstance.send({ image: videoEl }); },
        width: 320, height: 240
      });
      await cameraInstance.start();
      // The Camera class re-acquires the stream; drop the probe stream tracks to avoid two live streams
      if (probeStream) { try { probeStream.getTracks().forEach(t => t.stop()); } catch (_) {} }
      scrollLoop(); // start velocity-decay loop
      if (btn) btn.classList.remove('loading');
      dramaSuccess(drama);
      // Show persistent help after the drama overlay clears
      setTimeout(() => help.classList.add('show'), 1500);
      toast('<span class="ach-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span><div><b>Hand Tracking Online</b><br><span style="font-size:11px;color:var(--muted)">see the guide on the left</span></div>', 4000);
      if (typeof KP_UNLOCK === 'function') KP_UNLOCK('handtrack');
    } catch (e) {
      console.warn('Hand tracking not available:', e && e.message);
      active = false;
      if (btn) btn.classList.remove('active', 'loading');
      if (videoEl) { videoEl.remove(); videoEl = null; }
      dramaFail(drama, (e && e.message) || 'camera unavailable');
    }
  }

  if (btn) btn.addEventListener('click', () => { toggleHandTracking(); playSnd('nav'); });
})();

/* ---------- PHASE 12: 3D SKILL CONSTELLATION (Three.js, lazy) ---------- */
(function skill3D() {
  // Add as a 4th skill view tab
  const tabWrap = document.querySelector('.skill-toolbar');
  if (!tabWrap) return;
  // Guard against double-injection on hot reload
  if (tabWrap.querySelector('[data-view="3d"]')) return;

  const tab = document.createElement('button');
  tab.className = 'skill-tab'; tab.dataset.view = '3d'; tab.dataset.snd = 'nav';
  tab.textContent = '3d';
  // Insert BEFORE the .skill-detail block (which has flex:1 and would push the tab off-row)
  const detail = tabWrap.querySelector('.skill-detail');
  if (detail) tabWrap.insertBefore(tab, detail); else tabWrap.appendChild(tab);

  tab.addEventListener('click', async () => {
    const stage = document.querySelector('#skill-stage') || document.querySelector('.skill-stage');
    if (!stage) return;
    document.querySelectorAll('.skill-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    stage.dataset.view = '3d';
    // Inject container immediately with a visible loading skeleton so the user never sees blank.
    stage.innerHTML = `
      <div id="skill-3d" style="width:100%;height:100%;position:relative;background:radial-gradient(ellipse at center,rgba(125,249,255,.05),transparent 70%)">
        <div class="skill-3d-loading" id="skill-3d-status">
          <div class="s3d-spinner"></div>
          <div class="s3d-text">booting 3d constellation…</div>
          <div class="s3d-sub">loading three.js · ~140kb</div>
        </div>
      </div>`;
    playSnd('open');

    const container = stage.querySelector('#skill-3d');
    const statusEl = stage.querySelector('#skill-3d-status');
    const setStatus = (text, sub) => {
      if (!statusEl) return;
      const t = statusEl.querySelector('.s3d-text'); if (t) t.textContent = text;
      const s = statusEl.querySelector('.s3d-sub'); if (s && sub) s.textContent = sub;
    };
    const showError = (msg) => {
      if (!container) return;
      container.innerHTML = `<div class="skill-3d-err"><div class="s3d-err-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>
      </div><div><b>3D view failed to load</b><br><span>${msg}</span></div></div>`;
    };

    try {
      // Load Three.js as a global via UMD build — avoids ESM import quirks in plain scripts.
      if (!window.THREE) {
        setStatus('loading three.js…', 'fetching from jsdelivr');
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
          s.onload = res; s.onerror = () => rej(new Error('failed to load three.js'));
          document.head.appendChild(s);
        });
      }
      if (!window.THREE) throw new Error('three.js did not register');
      const THREE = window.THREE;

      // OrbitControls is not bundled in Three.js >=0.150 UMD anymore.
      // Use a tiny custom orbit camera instead — zero external deps, never fails.
      // v3.2: state exposed so external drivers (hand-gestures) can manipulate camera.
      function makeOrbit(cam, dom) {
        const state = { az: 0, el: 0, dist: 14, dragging: false, lx: 0, ly: 0, auto: true };
        const apply = () => {
          const cx = state.dist * Math.cos(state.el) * Math.sin(state.az);
          const cy = state.dist * Math.sin(state.el);
          const cz = state.dist * Math.cos(state.el) * Math.cos(state.az);
          cam.position.set(cx, cy, cz);
          cam.lookAt(0, 0, 0);
        };
        const onDown = (e) => { state.dragging = true; state.auto = false; const p = e.touches ? e.touches[0] : e; state.lx = p.clientX; state.ly = p.clientY; };
        const onMove = (e) => {
          if (!state.dragging) return;
          const p = e.touches ? e.touches[0] : e;
          state.az -= (p.clientX - state.lx) * 0.006;
          state.el = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, state.el + (p.clientY - state.ly) * 0.006));
          state.lx = p.clientX; state.ly = p.clientY;
          apply();
        };
        const onUp = () => { state.dragging = false; };
        const onWheel = (e) => { e.preventDefault(); state.dist = Math.max(6, Math.min(30, state.dist + e.deltaY * 0.012)); apply(); };
        dom.addEventListener('mousedown', onDown);
        dom.addEventListener('touchstart', onDown, { passive: true });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
        dom.addEventListener('wheel', onWheel, { passive: false });
        apply();
        return {
          update: () => { if (state.auto) { state.az += 0.0035; apply(); } },
          apply,
          state
        };
      }

      setStatus('building constellation…', 'placing skill nodes in 3-space');

      // Ensure container has dimensions; if 0 (rare flex/layout race), force layout.
      let w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) { container.style.minHeight = '600px'; w = container.clientWidth; h = container.clientHeight; }
      w = w || 800; h = h || 600;

      // Remove status overlay now that we're ready to render
      if (statusEl) statusEl.remove();

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
      camera.position.set(0, 0, 14);

      // v3.2: sharper rendering — higher pixel ratio cap (was 2) for crisp spheres
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 3));
      renderer.setClearColor(0x000000, 0);
      // Better tonemapping for vibrant colors
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
      }
      container.appendChild(renderer.domElement);
      // CSS fix: keep canvas sharp
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.imageRendering = 'auto';

      const controls = makeOrbit(camera, renderer.domElement);

      // === v3.2: realistic lighting for true 3D shading ===
      scene.add(new THREE.AmbientLight(0x6688aa, 0.45));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      keyLight.position.set(8, 10, 6);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(0xff6ec7, 1.2, 40);
      rimLight.position.set(-8, -4, -8);
      scene.add(rimLight);
      const fillLight = new THREE.PointLight(0x7df9ff, 0.9, 35);
      fillLight.position.set(6, -6, 8);
      scene.add(fillLight);

      const catKeys = Object.keys(SKILL_CATS);
      const colors = { languages: 0x7df9ff, ai: 0xff6ec7, cloud: 0xa78bfa, data: 0x22d3ee, devops: 0xfbbf24 };
      const allNodes = [];

      catKeys.forEach((catKey, ci) => {
        const ring = SKILL_CATS[catKey];
        const catColor = catKey in colors ? colors[catKey] : 0x7df9ff;
        const radius = 3 + ci * 1.5;

        ring.items.forEach((item, i) => {
          const phi = Math.acos(-1 + (2 * i) / ring.items.length);
          const theta = Math.sqrt(ring.items.length * Math.PI) * phi + ci * 2;
          const x = radius * Math.cos(theta) * Math.sin(phi);
          const y = radius * Math.sin(theta) * Math.sin(phi);
          const z = radius * Math.cos(phi);

          // v3.2: high-poly sphere + Phong material so light actually shades it (real 3D look)
          const geo = new THREE.SphereGeometry(0.22, 32, 32);
          const mat = new THREE.MeshPhongMaterial({
            color: catColor,
            emissive: catColor,
            emissiveIntensity: 0.35,
            shininess: 80,
            specular: 0xffffff
          });
          const sphere = new THREE.Mesh(geo, mat);
          sphere.position.set(x, y, z);
          scene.add(sphere);
          allNodes.push(sphere);

          // Soft additive halo (looks like a glow bloom)
          const haloMat = new THREE.MeshBasicMaterial({
            color: catColor, transparent: true, opacity: 0.18,
            blending: THREE.AdditiveBlending, depthWrite: false
          });
          const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), haloMat);
          halo.position.copy(sphere.position);
          scene.add(halo);

          // Outer faint glow
          const glow2 = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 24, 24),
            new THREE.MeshBasicMaterial({ color: catColor, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
          );
          glow2.position.copy(sphere.position);
          scene.add(glow2);

          // High-DPI label sprite
          const c2 = document.createElement('canvas'); c2.width = 512; c2.height = 128;
          const cx2 = c2.getContext('2d');
          cx2.font = 'bold 44px JetBrains Mono, monospace';
          cx2.fillStyle = '#' + catColor.toString(16).padStart(6, '0');
          cx2.textAlign = 'center';
          cx2.shadowColor = 'rgba(0,0,0,.85)'; cx2.shadowBlur = 12;
          cx2.fillText(item.name, 256, 80);
          const tex = new THREE.CanvasTexture(c2);
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(x, y + 0.55, z);
          sprite.scale.set(2.2, 0.55, 1);
          scene.add(sprite);
        });
      });

      // Connect nearby nodes with translucent lines
      for (let i = 0; i < allNodes.length; i++) {
        for (let j = i + 1; j < allNodes.length; j++) {
          const d = allNodes[i].position.distanceTo(allNodes[j].position);
          if (d < 3.5) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([allNodes[i].position, allNodes[j].position]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.14 });
            scene.add(new THREE.Line(lineGeo, lineMat));
          }
        }
      }

      // Solid + wireframe core sphere combo for that crystal look
      const coreGroup = new THREE.Group();
      coreGroup.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.6, 1),
        new THREE.MeshPhongMaterial({ color: 0x111a22, emissive: 0x102030, shininess: 120, specular: 0x88ddff, transparent: true, opacity: 0.85 })
      ));
      coreGroup.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.62, 1),
        new THREE.MeshBasicMaterial({ color: 0x7df9ff, wireframe: true, transparent: true, opacity: 0.55 })
      ));
      scene.add(coreGroup);
      const core = coreGroup; // keep variable name for animation loop

      // Ambient sparkles for depth (denser + smaller for sharper look)
      const starGeo = new THREE.BufferGeometry();
      const starCount = 360, starPos = new Float32Array(starCount * 3);
      for (let s = 0; s < starCount; s++) {
        const r = 20 + Math.random() * 22;
        const ang1 = Math.random() * Math.PI * 2, ang2 = Math.acos(2 * Math.random() - 1);
        starPos[s * 3 + 0] = r * Math.sin(ang2) * Math.cos(ang1);
        starPos[s * 3 + 1] = r * Math.sin(ang2) * Math.sin(ang1);
        starPos[s * 3 + 2] = r * Math.cos(ang2);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })));

      // === v3.2: HUD overlay with fullscreen + hand-gesture buttons ===
      const hud = document.createElement('div');
      hud.className = 's3d-hud';
      hud.innerHTML = `
        <button class="s3d-btn s3d-fs" title="fullscreen" aria-label="fullscreen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/></svg>
        </button>
        <button class="s3d-btn s3d-hand" title="control with hand gestures" aria-label="hand gestures" style="display:none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11V6a2 2 0 0 1 4 0v5"/><path d="M13 11V4a2 2 0 0 1 4 0v9"/><path d="M17 13V7a2 2 0 0 1 4 0v8a7 7 0 0 1-14 0V9a2 2 0 0 1 4 0v3"/></svg>
        </button>
        <div class="s3d-hint">drag to rotate · scroll to zoom</div>
      `;
      container.appendChild(hud);
      const fsBtn = hud.querySelector('.s3d-fs');
      const handBtn = hud.querySelector('.s3d-hand');
      const hintEl = hud.querySelector('.s3d-hint');

      // Fullscreen toggle — auto-enables skill hand gesture & smart-switches site hand off
      function isFs() { return document.fullscreenElement === container; }
      let siteHandWasActive = false;
      const getSiteHandBtn = () => document.getElementById('hand-btn');
      fsBtn.addEventListener('click', async () => {
        playSnd('nav');
        try {
          if (!isFs()) {
            // Going into fullscreen: pause site hand first (avoids two cameras / glitches)
            const siteBtn = getSiteHandBtn();
            siteHandWasActive = !!(siteBtn && siteBtn.classList.contains('active'));
            if (siteHandWasActive) siteBtn.click(); // toggles off
            // Pre-start skill hand BEFORE fullscreen so MediaPipe is ready when transition completes
            handBtn.style.display = 'flex';
            await startS3DHand();
            await container.requestFullscreen();
          } else {
            await document.exitFullscreen();
          }
        } catch (e) { console.warn('fullscreen failed:', e); }
      });
      document.addEventListener('fullscreenchange', () => {
        const fs = isFs();
        handBtn.style.display = fs ? 'flex' : 'none';
        hintEl.textContent = fs ? 'pinch + move = orbit · spread fingers + move = zoom · drag/scroll also work' : 'drag to rotate · scroll to zoom';
        if (!fs) {
          // Exiting fullscreen: stop skill hand and restore site hand if it was on before
          stopS3DHand();
          if (siteHandWasActive) {
            const siteBtn = getSiteHandBtn();
            if (siteBtn && !siteBtn.classList.contains('active')) setTimeout(() => siteBtn.click(), 200);
            siteHandWasActive = false;
          }
        }
        // Resize to new viewport
        setTimeout(onResize, 50);
      });

      // === Hand-gesture orbit driver (only available in fullscreen) ===
      let s3dHands = null, s3dCam = null, s3dVid = null, s3dActive = false;
      let lastHX = null, lastHY = null, lastPinchDist = null;
      // Smoothed deltas for less jitter
      let smAz = 0, smEl = 0, smZoom = 0;
      async function startS3DHand() {
        if (s3dActive) { stopS3DHand(); return; }
        try {
          handBtn.classList.add('loading');
          // Load MediaPipe (reuses cache if main hand-track already loaded it)
          if (!window.Hands || !window.Camera) {
            await new Promise((r, rj) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js'; s.onload = r; s.onerror = () => rj(new Error('cam_utils')); document.head.appendChild(s); });
            await new Promise((r, rj) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js'; s.onload = r; s.onerror = () => rj(new Error('hands')); document.head.appendChild(s); });
          }
          s3dVid = document.createElement('video');
          s3dVid.style.cssText = 'position:fixed;right:14px;top:14px;width:120px;height:90px;object-fit:cover;border:1px solid rgba(125,249,255,.4);border-radius:8px;z-index:99999;transform:scaleX(-1)';
          s3dVid.muted = true; s3dVid.playsInline = true; s3dVid.autoplay = true;
          container.appendChild(s3dVid);
          s3dHands = new window.Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}` });
          s3dHands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
          s3dHands.onResults(res => {
            if (!s3dActive) return;
            if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) {
              lastHX = lastHY = lastPinchDist = null;
              return;
            }
            const lm = res.multiHandLandmarks[0];
            const idxT = lm[8], thumbT = lm[4], wrist = lm[0], midMcp = lm[9];
            const hx = 1 - idxT.x, hy = idxT.y; // mirror x for natural feel
            // Normalize pinch by palm size (wrist→middle-MCP) so distance scales with hand depth
            const palmSize = Math.hypot(wrist.x - midMcp.x, wrist.y - midMcp.y) || 0.1;
            const rawPinch = Math.hypot(idxT.x - thumbT.x, idxT.y - thumbT.y);
            const pinchN = rawPinch / palmSize; // ~0 closed, ~1+ wide open
            const PINCH_CLOSED = 0.45;  // gesture: orbit (thumb+index touching)
            const PINCH_OPEN = 1.2;     // gesture: zoom (spread fingers)

            controls.state.auto = false;

            if (pinchN < PINCH_CLOSED && lastHX !== null) {
              // === ORBIT mode (closed pinch) — hand movement rotates camera ===
              const dx = hx - lastHX;
              const dy = hy - lastHY;
              // Deadzone to kill micro-jitter
              const dxF = Math.abs(dx) > 0.003 ? dx : 0;
              const dyF = Math.abs(dy) > 0.003 ? dy : 0;
              // Exponential smoothing
              smAz = smAz * 0.6 + dxF * 6 * 0.4;
              smEl = smEl * 0.6 + dyF * 6 * 0.4;
              controls.state.az -= smAz;
              // FIX: vertical was inverted — flip sign so moving hand UP tilts view UP
              controls.state.el = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, controls.state.el + smEl));
              controls.apply();
              handBtn.classList.add('gesture-orbit');
              handBtn.classList.remove('gesture-zoom');
            } else if (pinchN > PINCH_OPEN && lastPinchDist !== null) {
              // === ZOOM mode (spread fingers) — pinch distance change zooms ===
              const dPinch = pinchN - lastPinchDist;
              const dzF = Math.abs(dPinch) > 0.02 ? dPinch : 0;
              smZoom = smZoom * 0.6 + dzF * 8 * 0.4;
              controls.state.dist = Math.max(5, Math.min(32, controls.state.dist - smZoom));
              controls.apply();
              handBtn.classList.add('gesture-zoom');
              handBtn.classList.remove('gesture-orbit');
            } else {
              // Idle — reset smoothing so next gesture starts clean
              smAz = smEl = smZoom = 0;
              handBtn.classList.remove('gesture-orbit', 'gesture-zoom');
            }
            lastHX = hx; lastHY = hy; lastPinchDist = pinchN;
          });
          s3dCam = new window.Camera(s3dVid, { onFrame: async () => { if (s3dActive && s3dHands) await s3dHands.send({ image: s3dVid }); }, width: 320, height: 240 });
          await s3dCam.start();
          s3dActive = true;
          handBtn.classList.remove('loading');
          handBtn.classList.add('active');
        } catch (e) {
          console.warn('s3d hand failed:', e);
          handBtn.classList.remove('loading');
          stopS3DHand();
        }
      }
      function stopS3DHand() {
        s3dActive = false;
        try { if (s3dCam) s3dCam.stop(); } catch (_) {}
        try { if (s3dVid && s3dVid.srcObject) s3dVid.srcObject.getTracks().forEach(t => t.stop()); } catch (_) {}
        if (s3dVid) s3dVid.remove();
        s3dVid = null; s3dCam = null; s3dHands = null;
        lastHX = lastHY = lastPinchDist = null;
        smAz = smEl = smZoom = 0;
        handBtn.classList.remove('active', 'gesture-orbit', 'gesture-zoom');
      }
      handBtn.addEventListener('click', () => { startS3DHand(); playSnd('nav'); });

      let stopped = false;
      function animate() {
        if (stopped || stage.dataset.view !== '3d') { stopped = true; stopS3DHand(); return; }
        requestAnimationFrame(animate);
        if (controls) controls.update();
        core.rotation.y += 0.004;
        core.rotation.x += 0.002;
        // Pulse halos & rim light for life
        const t = performance.now() * 0.001;
        rimLight.intensity = 1.0 + Math.sin(t * 1.3) * 0.25;
        fillLight.intensity = 0.85 + Math.cos(t * 0.9) * 0.2;
        renderer.render(scene, camera);
      }
      animate();

      const onResize = () => {
        const nw = container.clientWidth, nh = container.clientHeight;
        if (!nw || !nh) return;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', onResize);

      if (typeof KP_UNLOCK === 'function') KP_UNLOCK('skills3');
    } catch (e) {
      console.warn('3D skills failed:', e);
      showError((e && e.message) || 'unable to initialise WebGL');
    }
  });
})();

/* ---------- PHASE 13: DYNAMIC OG IMAGE (Cloudflare Worker code) ---------- */
// This is the Cloudflare Worker code for generating dynamic OG images.
// Deploy to: workers.dev or custom domain pointed from og-image route
// In index.html, reference: <meta property="og:image" content="https://your-worker.workers.dev/og?name=Kevil+Patel&role=AI+Cloud+Engineer" />
const CF_WORKER_CODE = `
// Cloudflare Worker — Dynamic OG Image Generator for Kevil.OS
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || 'Kevil Patel';
    const role = url.searchParams.get('role') || 'AI / Cloud Engineer';
    const ver = url.searchParams.get('v') || 'v3.2';

    const svg = \\\`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0d0d16"/><stop offset="100%" stop-color="#1a1a2e"/></linearGradient></defs>
      <rect fill="url(#bg)" width="1200" height="630" rx="0"/>
      <circle cx="900" cy="315" r="200" fill="none" stroke="rgba(125,249,255,.1)" stroke-width="1" stroke-dasharray="8 4"/>
      <circle cx="900" cy="315" r="140" fill="none" stroke="rgba(125,249,255,.15)" stroke-width="1" stroke-dasharray="4 6"/>
      <circle cx="900" cy="315" r="80" fill="none" stroke="rgba(125,249,255,.2)" stroke-width="1.5"/>
      <text x="80" y="260" font-family="monospace" font-size="64" font-weight="bold" fill="#f0f0f5">\${name}</text>
      <text x="80" y="320" font-family="monospace" font-size="24" fill="#7df9ff">\${role}</text>
      <text x="80" y="370" font-family="monospace" font-size="16" fill="rgba(240,240,245,.4)">Kevil.OS \${ver} · interactive resume</text>
      <rect x="80" y="400" width="60" height="3" rx="1" fill="#7df9ff"/>
      <text x="80" y="540" font-family="monospace" font-size="14" fill="rgba(125,249,255,.5)">Agentic AI · Azure · Cloud · LangGraph · A360</text>
    </svg>\\\`;

    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } });
  }
};
`;

/* ---------- Additional palette + terminal commands for v3.2 features ---------- */
palCmds.push(
  { label: 'toggle: lite mode', k: 'cmd', act: () => $('#lite-btn')?.click() },
  { label: 'share: screenshot / copy link', k: 'cmd', act: () => $('#share-btn')?.click() },
  { label: 'view: achievements panel', k: 'cmd', act: () => { $('#discovery-bar')?.click(); } },
  { label: 'view: skills 3D constellation', k: 'nav', act: () => { document.querySelector('.skill-tab[data-view="3d"]')?.click(); } }
);
termCmds.lite = () => { $('#lite-btn')?.click(); return document.documentElement.classList.contains('lite-mode') ? 'lite mode on.' : 'lite mode off.'; };
termCmds.share = () => { $('#share-btn')?.click(); return 'share dialog opened.'; };
termCmds.achievements = () => { $('#discovery-bar')?.click(); return 'achievements panel opened.'; };
termCmds['3d'] = () => { document.querySelector('.skill-tab[data-view="3d"]')?.click(); return 'loading 3D skill constellation...'; };

console.log('%c kevil.os v3.2 ', 'background:#7df9ff;color:#000;font-weight:700;padding:6px 12px;border-radius:6px;font-family:monospace');
console.log('%c >> v3.1: GLSL shader · centered theme animation · hand-scroll gesture · reduced gesture zone · dramatic hand activation · fixed 3D skills ', 'color:#ff6ec7;font-family:monospace');

/* ---------- v3.2: certificate copy-credential buttons ---------- */
(function certCopy() {
  function init() {
    document.querySelectorAll('.cert').forEach(card => {
      if (card.querySelector('.cert-copy')) return;
      const idEl = card.querySelector('.cert-id');
      if (!idEl) return;
      const raw = idEl.textContent || '';
      // Extract value after "cred id:" if present, else use full text
      const m = raw.match(/cred id:\s*(.+)/i);
      const credId = (m ? m[1] : raw).trim();
      if (!credId) return;
      const btn = document.createElement('button');
      btn.className = 'cert-copy';
      btn.type = 'button';
      btn.title = 'copy credential id';
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>copy id</span>';
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(credId);
          btn.classList.add('copied');
          btn.querySelector('span').textContent = 'copied!';
          if (typeof toast === 'function') {
            toast('<b>credential copied</b><br><span style="font-size:11px;color:var(--muted);font-family:var(--mono)">' + credId + '</span>', 2400);
          }
          if (typeof playSnd === 'function') playSnd('primary');
          setTimeout(() => { btn.classList.remove('copied'); btn.querySelector('span').textContent = 'copy id'; }, 1800);
        } catch (err) {
          console.warn('clipboard failed:', err);
          btn.querySelector('span').textContent = 'failed';
          setTimeout(() => { btn.querySelector('span').textContent = 'copy id'; }, 1500);
        }
      });
      card.appendChild(btn);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
