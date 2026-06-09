/* ============ Kevil.OS v2.0 ============ */
'use strict';

/* ---------- 0. THEME ---------- */
(function(){
  const saved = localStorage.getItem('kp-theme') || 'dark';
  document.documentElement.dataset.theme = saved;
})();

/* ---------- 1. BOOT LOADER ---------- */
const boot = document.getElementById('boot');
const bootLog = document.getElementById('boot-log');
const bootBar = document.getElementById('boot-bar-fill');
const bootLines = [
  '[ OK ] mounting kevil.os v2.0…',
  '[ OK ] loading neural mesh (110 nodes)…',
  '[ OK ] connecting to azure ai foundry…',
  '[ OK ] starting a360 telemetry stream…',
  '[ OK ] compiling langgraph state machine…',
  '[ OK ] fetching github://kevil21…',
  '[ OK ] calibrating curiosity engine…',
  '[ OK ] welcome, operator.',
];
let bi = 0;
function bootTick(){
  if(bi>=bootLines.length){ finishBoot(); return; }
  bootLog.textContent += bootLines[bi]+'\n';
  bootBar.style.width = ((bi+1)/bootLines.length*100)+'%';
  bi++;
  setTimeout(bootTick, 240 + Math.random()*180);
}
function finishBoot(){
  setTimeout(()=>boot.classList.add('gone'), 500);
}
setTimeout(bootTick, 250);
addEventListener('keydown', ()=>{ if(!boot.classList.contains('gone')) boot.classList.add('gone'); });
addEventListener('click', ()=>{ if(!boot.classList.contains('gone')) boot.classList.add('gone'); }, {once:true});

/* ---------- 2. YEAR + UPTIME + LOCAL TIME ---------- */
document.getElementById('yr').textContent = new Date().getFullYear();
const start = Date.now();
setInterval(()=>{
  const s = Math.floor((Date.now()-start)/1000);
  const h = String(Math.floor(s/3600)).padStart(2,'0');
  const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  const el = document.getElementById('uptime'); if(el) el.textContent = `${h}:${m}:${ss}`;
}, 1000);
function tickClock(){
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
  const el = document.getElementById('local-time');
  if(el) el.textContent = ist.toTimeString().slice(0,8)+' IST';
}
tickClock(); setInterval(tickClock, 1000);

/* ---------- 3. CURSOR ---------- */
const cursor = document.getElementById('cursor');
const cDot = document.getElementById('cursor-dot');
const cRing = document.getElementById('cursor-ring');
let mx=innerWidth/2, my=innerHeight/2, rx=mx, ry=my;
addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; cDot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; });
function ring(){ rx += (mx-rx)*0.18; ry += (my-ry)*0.18; cRing.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(ring); } ring();
document.querySelectorAll('a, button, .tilt, input, .skill-node, .stage, .r-card, .callout, .proj, .cdot').forEach(el=>{
  el.addEventListener('mouseenter', ()=>cursor.classList.add('hover'));
  el.addEventListener('mouseleave', ()=>cursor.classList.remove('hover'));
});
addEventListener('mousedown',()=>cursor.classList.add('click'));
addEventListener('mouseup',()=>cursor.classList.remove('click'));

/* ---------- 4. NEURAL CANVAS ---------- */
(function(){
  const c = document.getElementById('neural'), ctx=c.getContext('2d');
  let w,h,nodes=[];
  function size(){ w=c.width=innerWidth*devicePixelRatio; h=c.height=innerHeight*devicePixelRatio; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; }
  size(); addEventListener('resize', size);
  for(let i=0;i<110;i++) nodes.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3*devicePixelRatio,vy:(Math.random()-.5)*.3*devicePixelRatio});
  function draw(){
    const dark = document.documentElement.dataset.theme!=='light';
    ctx.clearRect(0,0,w,h);
    const mxs = mx*devicePixelRatio, mys = my*devicePixelRatio;
    nodes.forEach(n=>{
      n.x+=n.vx; n.y+=n.vy;
      if(n.x<0||n.x>w) n.vx*=-1; if(n.y<0||n.y>h) n.vy*=-1;
      const dx=n.x-mxs, dy=n.y-mys, d=Math.hypot(dx,dy);
      if(d<200*devicePixelRatio){ n.vx-=dx/d*0.04; n.vy-=dy/d*0.04; }
      ctx.fillStyle = dark?'rgba(125,249,255,.55)':'rgba(8,145,178,.5)';
      ctx.beginPath(); ctx.arc(n.x,n.y,1.4*devicePixelRatio,0,7); ctx.fill();
    });
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
      if(d<140*devicePixelRatio){
        ctx.strokeStyle = dark?`rgba(125,249,255,${.18*(1-d/(140*devicePixelRatio))})`:`rgba(8,145,178,${.18*(1-d/(140*devicePixelRatio))})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---------- 5. BLOB MORPH ---------- */
(function(){
  const path = document.getElementById('blobPath');
  function blobPath(t, cx, cy){
    const pts=[];
    const r = 220;
    for(let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const rr = r + Math.sin(t*0.001 + i)*40 + (i===0?cx*0.04:0) + (i===4?cy*0.03:0);
      pts.push([300+Math.cos(a)*rr, 300+Math.sin(a)*rr]);
    }
    let d=`M${pts[0][0]},${pts[0][1]}`;
    for(let i=0;i<pts.length;i++){
      const p1=pts[i], p2=pts[(i+1)%pts.length];
      const cx1=(p1[0]+p2[0])/2, cy1=(p1[1]+p2[1])/2;
      d+=` Q${p1[0]},${p1[1]} ${cx1},${cy1}`;
    }
    d+='Z';
    return d;
  }
  function tick(t){ path.setAttribute('d', blobPath(t, mx-innerWidth/2, my-innerHeight/2)); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
})();

/* ---------- 6. LENIS smooth scroll + GSAP ---------- */
let lenis;
if(window.Lenis){
  lenis = new Lenis({duration:1.1,smoothWheel:true,smoothTouch:false});
  function raf(t){ lenis.raf(t); requestAnimationFrame(raf); } requestAnimationFrame(raf);
}
if(window.gsap && window.ScrollTrigger){ gsap.registerPlugin(ScrollTrigger); if(lenis) lenis.on('scroll', ScrollTrigger.update); }

/* ---------- 7. REVEAL on scroll ---------- */
const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }),{threshold:0.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ---------- 8. RAIL FILL ---------- */
(function(){
  const rail = document.getElementById('rail-fill'); if(!rail) return;
  const tl = document.querySelector('.timeline');
  addEventListener('scroll', ()=>{
    const r = tl.getBoundingClientRect();
    const total = r.height + innerHeight*0.4;
    const passed = Math.min(total, Math.max(0, innerHeight - r.top));
    rail.style.height = (passed/total*100)+'%';
  });
})();

/* ---------- 9. MAGNETIC + TILT ---------- */
document.querySelectorAll('.magnetic').forEach(el=>{
  el.addEventListener('mousemove', e=>{
    const r=el.getBoundingClientRect(); const x=e.clientX-r.left-r.width/2; const y=e.clientY-r.top-r.height/2;
    el.style.transform=`translate(${x*0.2}px,${y*0.2}px)`;
  });
  el.addEventListener('mouseleave', ()=> el.style.transform='');
});
document.querySelectorAll('.tilt').forEach(el=>{
  const strength = +el.dataset.tiltStrength || 10;
  el.addEventListener('mousemove', e=>{
    const r=el.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5;
    el.style.transform=`perspective(1000px) rotateX(${-y*strength}deg) rotateY(${x*strength}deg) translateZ(0)`;
  });
  el.addEventListener('mouseleave', ()=> el.style.transform='');
});
document.querySelectorAll('.proj').forEach(el=>{
  el.addEventListener('mousemove', e=>{
    const r=el.getBoundingClientRect();
    el.style.setProperty('--mx',(e.clientX-r.left)+'px');
    el.style.setProperty('--my',(e.clientY-r.top)+'px');
  });
});

/* ---------- 10. SCRAMBLE + TYPED ---------- */
const SCR = '!<>-_\\/[]{}—=+*^?#________';
function scramble(el){
  const text = el.dataset.text;
  let frame=0, queue=[];
  for(let i=0;i<text.length;i++){
    const from='', to=text[i], start=Math.floor(Math.random()*40), end=start+Math.floor(Math.random()*40);
    queue.push({from,to,start,end});
  }
  function up(){
    let out='', complete=0;
    for(let i=0;i<queue.length;i++){
      let {from,to,start,end,char}=queue[i];
      if(frame>=end){ complete++; out+=to; }
      else if(frame>=start){
        if(!char||Math.random()<.28){ char=SCR[Math.floor(Math.random()*SCR.length)]; queue[i].char=char; }
        out+=`<span style="color:var(--accent)">${char}</span>`;
      } else out+=from;
    }
    el.innerHTML = out;
    if(complete<queue.length){ frame++; requestAnimationFrame(up); }
  }
  up();
}
document.querySelectorAll('.scramble').forEach((el,i)=>setTimeout(()=>scramble(el),300+i*200));

(function typedInit(){
  const el = document.querySelector('.typed'); if(!el) return;
  const words = JSON.parse(el.dataset.words);
  let w=0,c=0,del=false;
  function step(){
    const word = words[w];
    el.textContent = word.slice(0, c);
    if(!del){ c++; if(c>word.length){ del=true; return setTimeout(step,1600); } }
    else { c--; if(c<0){ del=false; w=(w+1)%words.length; } }
    setTimeout(step, del?28:55);
  }
  setTimeout(step, 1600);
})();

/* ---------- 11. COMMAND PALETTE ---------- */
const palette = document.getElementById('palette');
const palInput = document.getElementById('pal-input');
const palList = document.getElementById('pal-list');
const COMMANDS = [
  {label:'Jump → Hero',         k:'jump',   action:()=>scrollTo('#hero')},
  {label:'Jump → About',        k:'jump',   action:()=>scrollTo('#about')},
  {label:'Jump → A360 Flagship',k:'jump ★', action:()=>scrollTo('#a360')},
  {label:'Jump → Policy→Pipelines', k:'jump ★', action:()=>scrollTo('#p2p')},
  {label:'Jump → Experience',   k:'jump',   action:()=>scrollTo('#xp')},
  {label:'Jump → Skills',       k:'jump',   action:()=>scrollTo('#skills')},
  {label:'Jump → Projects',     k:'jump',   action:()=>scrollTo('#projects')},
  {label:'Jump → GitHub',       k:'jump',   action:()=>scrollTo('#github')},
  {label:'Jump → Contact',      k:'jump',   action:()=>scrollTo('#contact')},
  {label:'Toggle theme',        k:'sys',    action:toggleTheme},
  {label:'Toggle sound',        k:'sys',    action:toggleSound},
  {label:'Run LangGraph sim',   k:'demo',   action:()=>{scrollTo('#p2p'); setTimeout(runLangGraph,800);}},
  {label:'Send email',          k:'link',   action:()=>location.href='mailto:kevilpatel24@gmail.com'},
  {label:'Open LinkedIn',       k:'link',   action:()=>open('https://linkedin.com/in/kevil21','_blank')},
  {label:'Open GitHub',         k:'link',   action:()=>open('https://github.com/kevil21','_blank')},
  {label:'Open HuggingFace',    k:'link',   action:()=>open('https://huggingface.co/Kevil21','_blank')},
  {label:'Open Instagram',      k:'link',   action:()=>open('https://instagram.com/kevil_36','_blank')},
  {label:'Easter: matrix rain', k:'fun',    action:matrixRain},
  {label:'Easter: konami',      k:'fun',    action:()=>document.body.classList.toggle('konami')},
];
function scrollTo(id){ const el=document.querySelector(id); if(el && lenis) lenis.scrollTo(el,{offset:-60}); else if(el) el.scrollIntoView({behavior:'smooth'}); }
function openPalette(){ palette.hidden=false; palInput.value=''; renderPal(''); setTimeout(()=>palInput.focus(),20); }
function closePalette(){ palette.hidden=true; }
let palIdx=0;
function renderPal(q){
  q=q.toLowerCase().trim();
  const items = COMMANDS.filter(c=>c.label.toLowerCase().includes(q));
  palList.innerHTML = items.map((c,i)=>`<li data-i="${i}" class="${i===0?'active':''}"><span>${c.label}</span><span class="k">${c.k}</span></li>`).join('') || `<li class="muted" style="padding:14px">no matches</li>`;
  palIdx=0;
  palList._items=items;
  palList.querySelectorAll('li').forEach(li=>{
    li.addEventListener('mouseenter',()=>{ palList.querySelectorAll('li').forEach(x=>x.classList.remove('active')); li.classList.add('active'); palIdx=+li.dataset.i; });
    li.addEventListener('click',()=>{ const it=palList._items[+li.dataset.i]; if(it){ closePalette(); it.action(); }});
  });
}
palInput?.addEventListener('input', e=>renderPal(e.target.value));
palInput?.addEventListener('keydown', e=>{
  const lis = palList.querySelectorAll('li:not(.muted)');
  if(e.key==='ArrowDown'){ e.preventDefault(); palIdx=Math.min(palIdx+1,lis.length-1); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); palIdx=Math.max(palIdx-1,0); }
  else if(e.key==='Enter'){ e.preventDefault(); const it=palList._items?.[palIdx]; if(it){ closePalette(); it.action(); } return; }
  else if(e.key==='Escape'){ closePalette(); return; }
  lis.forEach(l=>l.classList.remove('active')); lis[palIdx]?.classList.add('active');
});
document.getElementById('palette-btn')?.addEventListener('click', openPalette);
document.getElementById('palette-btn-2')?.addEventListener('click', openPalette);
document.querySelector('.pal-back')?.addEventListener('click', closePalette);
addEventListener('keydown', e=>{
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
  else if(e.key==='Escape' && !palette.hidden) closePalette();
});

/* ---------- 12. THEME + SOUND TOGGLES ---------- */
function toggleTheme(){
  const next = document.documentElement.dataset.theme==='light'?'dark':'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('kp-theme', next);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', next==='light'?'#f6f7fb':'#05060a');
}
document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);

let soundOn = localStorage.getItem('kp-sound')==='on';
let actx;
function blip(freq=620){
  if(!soundOn) return;
  try{
    actx = actx || new (AudioContext||webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value=freq; o.type='sine'; g.gain.value=0.03;
    o.connect(g).connect(actx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.12); o.stop(actx.currentTime+0.13);
  }catch(_){}
}
function toggleSound(){
  soundOn = !soundOn; localStorage.setItem('kp-sound', soundOn?'on':'off');
  document.getElementById('sound-btn').textContent = soundOn?'🔊':'🔈';
  if(soundOn) blip(880);
}
document.getElementById('sound-btn')?.addEventListener('click', toggleSound);
document.getElementById('sound-btn').textContent = soundOn?'🔊':'🔈';
document.querySelectorAll('a.btn, .nav-tools .icon-btn, #nav ul a').forEach(el=> el.addEventListener('mouseenter', ()=>blip(560+Math.random()*200)));

/* ---------- 13. A360 COUNTER ANIMATION ---------- */
const countIO = new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return;
  e.target.querySelectorAll('b[data-count]').forEach(b=>{
    const target = +b.dataset.count;
    const dur = 1500;
    const t0 = performance.now();
    function tick(t){
      const p = Math.min(1,(t-t0)/dur);
      const v = Math.floor(target * (1 - Math.pow(1-p,3)));
      b.textContent = v;
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  countIO.unobserve(e.target);
}),{threshold:0.3});
document.querySelectorAll('.a360-counts').forEach(el=>countIO.observe(el));

/* ---------- 14. KPI mock live wiggle ---------- */
setInterval(()=>{
  const lat = 380 + Math.floor(Math.random()*80);
  const trust = (86 + Math.random()*3).toFixed(1);
  const cost = (0.38 + Math.random()*0.10).toFixed(2);
  const ttft = (1.5 + Math.random()*.6).toFixed(1);
  const set = (id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
  set('kpi-lat', lat+' ms');
  set('kpi-trust', trust);
  set('kpi-cost', '$'+cost);
  set('kpi-ttft', ttft+' s');
  // gauge
  const g = document.getElementById('gauge-fill'); const gn = document.getElementById('gauge-num');
  if(g){ const pct = +trust; const off = 158 - (pct/100)*158; g.style.strokeDashoffset = off; if(gn) gn.textContent = Math.round(pct)+'%'; }
},2500);

/* ---------- 15. FLOW PACKETS ---------- */
(function(){
  const ns='http://www.w3.org/2000/svg';
  const packets = document.getElementById('packets');
  if(!packets) return;
  function spawn(){
    const c = document.createElementNS(ns,'circle');
    c.setAttribute('r', 4); c.setAttribute('cy', 110); c.setAttribute('cx', 120);
    if(Math.random()<.4) c.setAttribute('class','alt');
    packets.appendChild(c);
    let x=120; const speed = 4 + Math.random()*2;
    function move(){
      x+=speed; c.setAttribute('cx', x);
      if(x>1130){ c.remove(); return; }
      requestAnimationFrame(move);
    }
    move();
  }
  setInterval(spawn, 650);
  // stage hover info
  const info = document.getElementById('flow-info');
  document.querySelectorAll('#flowsvg .stage').forEach(s=>{
    s.addEventListener('mouseenter', ()=>{ info.textContent = s.dataset.info; });
  });
})();

/* ---------- 16. LANGGRAPH SIMULATOR ---------- */
const lgLines = {
  1:[
    '[01·policy-compiler] received: "All GCS buckets must have cost_center, environment, team labels"',
    '[01·policy-compiler] → PolicyConstraint(resource=gcs.Bucket, op=must_have_labels, fields=[cost_center,environment,team])',
    '[01·policy-compiler] ✓ compiled in 412ms',
  ],
  2:[
    '[02·drift-scanner] gcloud storage buckets list --project=demo-prod',
    '[02·drift-scanner] scanning 23 buckets…',
    '[02·drift-scanner] ⚠ 4 violations: kp-data-raw, kp-archive, kp-tmp-1, kp-staging',
  ],
  3:[
    '[03·remediation-planner] gcloud storage buckets update gs://kp-data-raw --update-labels=cost_center=eng-platform,environment=prod,team=a360',
    '[03·remediation-planner] (+3 more reversible commands)',
    '[03·remediation-planner] ✓ plan ready · blast_radius=low',
  ],
  4:[
    '[04·risk-assessor] guardrails: no BLOCKED patterns matched',
    '[04·risk-assessor] llm rubric → 2.4 / 10',
    '[04·risk-assessor] ✓ auto-approve (threshold=4)',
  ],
  5:[
    '[05·change-executor] applying 4 commands…',
    '[05·change-executor] post-state verify: all buckets now have required labels',
    '[05·change-executor] ✓ evidence-pack persisted to firestore://audit/2025-11/run-7af3',
    '',
    '✅ run complete · 5/5 stages · drift remediated · audit trail saved.',
  ]
};
function runLangGraph(){
  const btn = document.getElementById('lg-run');
  const out = document.getElementById('lg-result');
  if(!btn || !out) return;
  btn.classList.add('running'); btn.disabled = true;
  document.querySelectorAll('.lg-stage').forEach(s=>{ s.classList.remove('active','done'); s.querySelector('.lg-status').textContent='idle'; });
  out.innerHTML='';
  let i=1;
  function next(){
    if(i>5){
      btn.classList.remove('running'); btn.disabled = false; return;
    }
    const stg = document.querySelector(`.lg-stage[data-s="${i}"]`);
    stg.classList.add('active'); stg.querySelector('.lg-status').textContent='running';
    let lineIdx = 0;
    function line(){
      if(lineIdx>=lgLines[i].length){
        stg.classList.remove('active'); stg.classList.add('done'); stg.querySelector('.lg-status').textContent='✓ done';
        i++;
        setTimeout(next, 350);
        return;
      }
      const div = document.createElement('div');
      div.textContent = lgLines[i][lineIdx++];
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
      setTimeout(line, 280 + Math.random()*160);
    }
    line();
  }
  next();
}
document.getElementById('lg-run')?.addEventListener('click', runLangGraph);

/* ---------- 17. SKILLS CONSTELLATION ---------- */
(function(){
  const wrap = document.getElementById('constellation'); if(!wrap) return;
  const skills = [
    {n:'Python',c:'#7df9ff'},{n:'C++',c:'#7df9ff'},{n:'Java',c:'#7df9ff'},{n:'R',c:'#7df9ff'},{n:'TypeScript',c:'#7df9ff'},{n:'SQL',c:'#7df9ff'},
    {n:'Agentic AI',c:'#ff6ec7'},{n:'RAG',c:'#ff6ec7'},{n:'LangGraph',c:'#ff6ec7'},{n:'LangChain',c:'#ff6ec7'},{n:'LSTM',c:'#ff6ec7'},{n:'Time Series',c:'#ff6ec7'},{n:'Azure AI Foundry',c:'#ff6ec7'},{n:'Vertex AI',c:'#ff6ec7'},{n:'Prompt Eng.',c:'#ff6ec7'},
    {n:'Azure',c:'#a78bfa'},{n:'AWS',c:'#a78bfa'},{n:'GCP',c:'#a78bfa'},{n:'AKS',c:'#a78bfa'},{n:'Container Apps',c:'#a78bfa'},{n:'Functions',c:'#a78bfa'},{n:'App Service',c:'#a78bfa'},{n:'Bicep / Terraform',c:'#a78bfa'},
    {n:'Docker',c:'#facc15'},{n:'Git',c:'#facc15'},{n:'GitHub Actions',c:'#facc15'},{n:'FastAPI',c:'#facc15'},{n:'Next.js',c:'#facc15'},{n:'React',c:'#facc15'},{n:'Node.js',c:'#facc15'},
    {n:'ADX / KQL',c:'#4ade80'},{n:'Elasticsearch',c:'#4ade80'},{n:'Kibana',c:'#4ade80'},{n:'Cosmos DB',c:'#4ade80'},{n:'Postgres',c:'#4ade80'},{n:'OTEL',c:'#4ade80'},
  ];
  const W = wrap.clientWidth, H = wrap.clientHeight;
  skills.forEach(s=>{
    const el = document.createElement('div');
    el.className='skill-node'; el.textContent=s.n;
    el.style.left = (Math.random()*(W-130)+10)+'px';
    el.style.top = (Math.random()*(H-50)+10)+'px';
    el.style.color = s.c; el.style.borderColor = s.c+'66';
    wrap.appendChild(el);
    let drag=false, ox=0, oy=0, vx=(Math.random()-.5)*.4, vy=(Math.random()-.5)*.4;
    el._pos = ()=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)});
    el._setPos = (x,y)=>{
      x = Math.max(0, Math.min(W-el.offsetWidth, x));
      y = Math.max(0, Math.min(H-el.offsetHeight, y));
      el.style.left=x+'px'; el.style.top=y+'px';
    };
    el._vel = ()=>({vx,vy});
    el.addEventListener('mousedown', e=>{ drag=true; el.classList.add('dragging'); const r=el.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top; e.preventDefault(); });
    addEventListener('mousemove', e=>{
      if(!drag) return;
      const r=wrap.getBoundingClientRect();
      el._setPos(e.clientX-r.left-ox, e.clientY-r.top-oy);
      vx=0; vy=0;
    });
    addEventListener('mouseup', ()=>{ drag=false; el.classList.remove('dragging'); });
    el.addEventListener('dblclick', ()=>{ el.classList.toggle('pinned'); });
    el._tick=()=>{
      if(drag || el.classList.contains('pinned')) return;
      const p = el._pos();
      let nx = p.x+vx, ny = p.y+vy;
      if(nx<0||nx>W-el.offsetWidth) vx*=-1;
      if(ny<0||ny>H-el.offsetHeight) vy*=-1;
      el._setPos(p.x+vx, p.y+vy);
    };
  });
  const nodes = [...wrap.querySelectorAll('.skill-node')];
  function loop(){ nodes.forEach(n=>n._tick()); requestAnimationFrame(loop); }
  loop();
})();

/* ---------- 18. GITHUB LIVE FETCH ---------- */
const LANG_COLORS = {Python:'#3572A5',JavaScript:'#f1e05a',TypeScript:'#3178c6',Java:'#b07219','C++':'#f34b7d',HTML:'#e34c26',CSS:'#563d7c',Shell:'#89e051',R:'#198CE7','Jupyter Notebook':'#DA5B0B',Go:'#00ADD8'};
async function loadGitHub(){
  try{
    const u = await fetch('https://api.github.com/users/kevil21').then(r=>r.json());
    const set=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
    if(u.avatar_url) document.getElementById('gh-avatar').src=u.avatar_url;
    set('gh-bio', u.bio || 'Kevil Patel · Associate SDE @ Kyndryl');
    set('gh-public', u.public_repos ?? '—');
    set('gh-followers', u.followers ?? '—');
    set('gh-following', u.following ?? '—');
    set('hs-repos', u.public_repos ?? '12');

    const repos = await fetch('https://api.github.com/users/kevil21/repos?sort=updated&per_page=20').then(r=>r.json());
    if(Array.isArray(repos)){
      const grid = document.getElementById('gh-repos');
      grid.innerHTML = repos.slice(0,9).map(r=>`
        <a class="gh-repo" target="_blank" rel="noopener" href="${r.html_url}">
          <h6>${r.name}</h6>
          <p>${(r.description||'no description').replace(/</g,'&lt;')}</p>
          <div class="gh-foot">
            <span><i style="background:${LANG_COLORS[r.language]||'#888'}"></i>${r.language||'—'}</span>
            <span>★ ${r.stargazers_count}</span>
            <span>⑂ ${r.forks_count}</span>
            <span>· ${new Date(r.updated_at).toLocaleDateString()}</span>
          </div>
        </a>
      `).join('');
      // languages
      const tally = {};
      repos.forEach(r=>{ if(r.language) tally[r.language]=(tally[r.language]||0)+1; });
      const total = Object.values(tally).reduce((a,b)=>a+b,0) || 1;
      const sorted = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,6);
      document.getElementById('gh-langs').innerHTML = sorted.map(([l,n])=>{
        const pct = Math.round(n/total*100);
        const c = LANG_COLORS[l]||'#888';
        return `<div class="lang" style="color:${c}"><i style="background:${c}"></i><span style="min-width:90px;color:var(--fg)">${l}</span><span class="bar"><b style="width:${pct}%"></b></span><span class="pct">${pct}%</span></div>`;
      }).join('');
    }
  }catch(e){ console.warn('gh fetch fail', e); }
}
loadGitHub();

/* ---------- 19. GITHUB HEATMAP (synthetic) ---------- */
(function(){
  const el = document.getElementById('gh-heat'); if(!el) return;
  // 26 weeks × 7 days
  const cells = 26*7;
  let html='';
  for(let i=0;i<cells;i++){
    const recency = i/cells; // 0..1
    const r = Math.random();
    const v = r * (0.4 + recency*0.6);
    let cls='';
    if(v>0.85) cls='l4'; else if(v>0.65) cls='l3'; else if(v>0.40) cls='l2'; else if(v>0.20) cls='l1';
    html += `<i class="${cls}"></i>`;
  }
  el.innerHTML = html;
})();

/* ---------- 20. TERMINAL ---------- */
(function(){
  const body = document.getElementById('term-body');
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-input');
  if(!body || !form) return;
  function add(html, cls=''){
    const s = document.createElement('span'); s.className='t-line '+cls; s.innerHTML = html;
    body.appendChild(s); body.scrollTop = body.scrollHeight;
  }
  const responses = {
    about:()=>add('Kevil Patel · Associate SDE @ Kyndryl · agentic AI on Azure · ex-VIT (CGPA 8.95, AIR 56).'),
    whoami:()=>add('kevil_patel · operator · uid=1000(creator) gid=1000(builder) groups=(curious,relentless,kind)'),
    email:()=>{ add('opening mail client…'); location.href='mailto:kevilpatel24@gmail.com'; },
    linkedin:()=>{ add('→ linkedin.com/in/kevil21'); open('https://linkedin.com/in/kevil21','_blank'); },
    github:()=>{ add('→ github.com/kevil21'); open('https://github.com/kevil21','_blank'); },
    huggingface:()=>{ add('→ huggingface.co/Kevil21'); open('https://huggingface.co/Kevil21','_blank'); },
    instagram:()=>{ add('→ instagram.com/kevil_36'); open('https://instagram.com/kevil_36','_blank'); },
    resume:()=>add('latest pdf: ask via email — kevilpatel24@gmail.com'),
    hire:()=>add('<span style="color:var(--accent)">✓</span> message received. opening email…', '') || setTimeout(()=>location.href='mailto:kevilpatel24@gmail.com?subject=Hello%20Kevil',400),
    matrix:()=>{ add('engaging matrix mode…'); matrixRain(); },
    konami:()=>{ add('↑↑↓↓←→←→BA — try it for real on the page.'); document.body.classList.toggle('konami'); },
    theme:()=>{ toggleTheme(); add('theme → '+document.documentElement.dataset.theme); },
    sound:()=>{ toggleSound(); add('sound → '+(soundOn?'on':'off')); },
    clear:()=>{ body.innerHTML=''; },
    help:()=>add('available: about · email · linkedin · github · huggingface · instagram · resume · hire · whoami · matrix · konami · theme · sound · clear'),
  };
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const cmd = input.value.trim().toLowerCase(); if(!cmd) return;
    add(`<span class="prompt">kevil@os:~$</span> ${cmd}`);
    (responses[cmd] || (()=>add(`<span style="color:#ff6ec7">${cmd}: command not found.</span> try <b>help</b>`)))();
    input.value='';
  });
})();

/* ---------- 21. MATRIX RAIN ---------- */
function matrixRain(){
  const c = document.getElementById('matrix');
  c.hidden=false;
  const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const cols = Math.floor(c.width/16);
  const drops = Array(cols).fill(0).map(()=>Math.random()*c.height);
  const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ01アあイいウうエえオお'.split('');
  const start = Date.now();
  function loop(){
    if(Date.now()-start>9000){ c.hidden=true; return; }
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0,0,c.width,c.height);
    ctx.font = '15px monospace';
    drops.forEach((y,i)=>{
      const ch = glyphs[Math.floor(Math.random()*glyphs.length)];
      ctx.fillStyle = y<30 ? '#fff' : '#7df9ff';
      ctx.fillText(ch, i*16, y);
      drops[i] = y>c.height && Math.random()>0.975 ? 0 : y+16;
    });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ---------- 22. KONAMI ---------- */
(function(){
  const seq=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']; let i=0;
  addEventListener('keydown', e=>{
    if(e.key===seq[i]) i++; else i=0;
    if(i===seq.length){ matrixRain(); blip(1200); i=0; }
  });
})();

/* ---------- 23. nav active highlight ---------- */
(function(){
  const links = document.querySelectorAll('#nav ul a');
  const navIO = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ links.forEach(a=>a.style.color=''); const a=document.querySelector(`#nav a[href="#${e.target.id}"]`); if(a) a.style.color='var(--accent)'; }
  }),{threshold:0.4});
  ['about','a360','p2p','xp','skills','projects','github','contact'].forEach(id=>{const el=document.getElementById(id); if(el) navIO.observe(el);});
})();
