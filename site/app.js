/* ==== Kevil.OS v2.1 ==== */
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
function renderSndBtn() { soundBtn.querySelector('.snd-on').textContent = soundOn ? 'ON' : 'OFF'; soundBtn.style.color = soundOn ? 'var(--accent)' : 'var(--muted)'; }
renderSndBtn();
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  localStorage.setItem('kp-sound', soundOn ? 'on' : 'off');
  renderSndBtn();
  if (soundOn) playSnd('success');
});

/* ---------- BOOT ---------- */
const bootLines = [
  '[boot] Kevil.OS v2.1.0 init...',
  '[boot] mounting /dev/curiosity ........... [ok]',
  '[boot] loading kernel: agentic-ai.ko ...... [ok]',
  '[boot] linking azure-foundry .............. [ok]',
  '[boot] linking langgraph .................. [ok]',
  '[boot] starting observability daemon ...... [ok]',
  '[boot] starting trust-score engine ........ [ok]',
  '[boot] warming up neural canvas ........... [ok]',
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

/* ---------- THEME ---------- */
const themeBtn = $('#theme-btn');
const savedTheme = localStorage.getItem('kp-theme') || 'dark';
document.documentElement.dataset.theme = savedTheme;
themeBtn.addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('kp-theme', next);
  playSnd('open');
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
const photoLabels = ['kyndryl_hq', 'park_offsite', 'studio_portrait'];
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
  el.addEventListener('mouseenter', () => { orbitPaused = true; playSnd('hover'); });
  el.addEventListener('mouseleave', () => { orbitPaused = false; });
  el.addEventListener('click', () => {
    playSnd('click');
    $$('.skill-node').forEach(n => n.classList.remove('pinned'));
    el.classList.add('pinned');
    detail.innerHTML = `<b style="color:${SKILL_CATS[catKey].color}">${item.name}</b> · ${item.yrs}y · <span style="color:var(--muted)">${whereUsed(item.name)}</span>`;
  });
}

function renderOrbit() {
  const rect = stage.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const cats = Object.keys(SKILL_CATS);
  const baseR = Math.min(rect.width, rect.height) * 0.12;
  const stepR = Math.min(rect.width, rect.height) * 0.085;

  // center label
  const center = document.createElement('div');
  center.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;transform:translate(-50%,-50%);font-family:var(--display);font-size:18px;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;text-align:center;pointer-events:none`;
  center.innerHTML = 'KEVIL<br/><span style="font-size:10px;color:var(--muted);letter-spacing:.3em">core</span>';
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

  // core in DOM
  const coreEl = document.createElement('div');
  coreEl.style.cssText = `position:absolute;left:${core.x}px;top:${core.y}px;transform:translate(-50%,-50%);font-family:var(--display);font-size:14px;letter-spacing:.3em;color:${core.color};text-transform:uppercase;background:radial-gradient(circle at center, rgba(125,249,255,.18), transparent 70%);padding:18px 22px;border-radius:50%;border:1px solid rgba(125,249,255,.45);box-shadow:0 0 40px rgba(125,249,255,.25);pointer-events:none;text-align:center`;
  coreEl.innerHTML = 'KEVIL<br/><span style="font-size:9px;color:var(--muted);letter-spacing:.4em">core</span>';
  stage.appendChild(coreEl);

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
  function tick() {
    if (stage.dataset.view !== 'net') { stage.removeEventListener('mousemove', onMove); return; }
    t += 0.016;
    items.forEach((it) => {
      // breathing
      const bx = Math.cos(t * 0.6 + it.phase) * (it.kind === 'cat' ? 6 : 9);
      const by = Math.sin(t * 0.5 + it.phase * 1.3) * (it.kind === 'cat' ? 6 : 9);
      let tx = it.ox + bx, ty = it.oy + by;
      // cursor repulsion
      const dx = tx - mxL, dy = ty - myL; const d2 = dx * dx + dy * dy;
      if (d2 < 90 * 90 && d2 > 1) { const d = Math.sqrt(d2); const f = (90 - d) / 90 * 22; tx += (dx / d) * f; ty += (dy / d) * f; }
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
  { label: 'link: huggingface', k: 'link', act: () => open('https://huggingface.co/Kevil21', '_blank') }
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
  help: 'available: about · email · linkedin · github · huggingface · instagram · resume · hire · whoami · matrix · konami · theme · sound · clear',
  about: 'Kevil Patel · Associate SDE @ Kyndryl. Building agentic AI on Azure. CGPA 8.95. AIR 56 VITEEE.',
  email: '<a href="mailto:kevilpatel24@gmail.com">kevilpatel24@gmail.com</a>',
  linkedin: '<a target="_blank" rel="noopener" href="https://linkedin.com/in/kevil21">linkedin.com/in/kevil21</a>',
  github: '<a target="_blank" rel="noopener" href="https://github.com/kevil21">github.com/kevil21</a>',
  huggingface: '<a target="_blank" rel="noopener" href="https://huggingface.co/Kevil21">huggingface.co/Kevil21</a>',
  instagram: '<a target="_blank" rel="noopener" href="https://instagram.com/kevil_36">@kevil_36</a>',
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

console.log('%c kevil.os v2.1 ', 'background:#7df9ff;color:#000;font-weight:700;padding:6px 12px;border-radius:6px;font-family:monospace');
console.log('%c try ctrl/cmd+k for command palette · type help in the terminal ', 'color:#7df9ff;font-family:monospace');

/* ============================================================
   v3.1 ADDITIONS
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
  langBtn.textContent = L;
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

console.log('%c kevil.os v3.1 — extras loaded (snake, chess, doom, chat, i18n) ', 'background:#ff6ec7;color:#000;font-weight:700;padding:4px 8px;border-radius:4px;font-family:monospace');
