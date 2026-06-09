/* ============ Kevil.OS — app.js ============ */
(() => {

/* ---------- BOOT LOADER ---------- */
const bootLines = [
  "[ OK ] kevil.os v1.0 — initializing kernel...",
  "[ OK ] loading modules: ai, cloud, observability",
  "[ OK ] mounting /portfolio at root",
  "[ OK ] starting service: agentic-ai.daemon",
  "[ OK ] starting service: azure-foundry.bridge",
  "[ OK ] connecting to neural-net visualizer...",
  "[ OK ] handshake with three.js renderer — 60fps locked",
  "[ OK ] hydrating projects: A360, Policy→Pipelines, OptiCrop, ...",
  "[ OK ] welcome, visitor. system ready.",
];
const log = document.getElementById("boot-log");
const fill = document.getElementById("boot-bar-fill");
const boot = document.getElementById("boot");
let bi = 0;
const tick = () => {
  if (bi < bootLines.length){
    log.textContent += bootLines[bi] + "\n";
    fill.style.width = ((bi+1)/bootLines.length*100)+"%";
    bi++;
    setTimeout(tick, 220 + Math.random()*180);
  }
};
tick();
const dismissBoot = () => boot.classList.add("gone");
setTimeout(dismissBoot, 2800);
window.addEventListener("keydown", dismissBoot, {once:true});
window.addEventListener("click", dismissBoot, {once:true});
window.addEventListener("touchstart", dismissBoot, {once:true, passive:true});

/* ---------- CUSTOM CURSOR ---------- */
const cur = document.getElementById("cursor");
const dot = document.getElementById("cursor-dot");
const ring = document.getElementById("cursor-ring");
let mx=window.innerWidth/2, my=window.innerHeight/2, rx=mx, ry=my;
window.addEventListener("mousemove", e => { mx=e.clientX; my=e.clientY; dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; });
const cursorLoop = () => {
  rx += (mx-rx)*0.18; ry += (my-ry)*0.18;
  ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  requestAnimationFrame(cursorLoop);
};
cursorLoop();
document.querySelectorAll("a, button, .tilt, .magnetic, .skill-node, input").forEach(el=>{
  el.addEventListener("mouseenter", ()=>cur.classList.add("hover"));
  el.addEventListener("mouseleave", ()=>cur.classList.remove("hover"));
});

/* ---------- MAGNETIC BUTTONS ---------- */
document.querySelectorAll(".magnetic").forEach(el=>{
  el.addEventListener("mousemove", e=>{
    const r=el.getBoundingClientRect();
    const x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
    el.style.transform=`translate(${x*0.25}px, ${y*0.35}px)`;
  });
  el.addEventListener("mouseleave", ()=>el.style.transform="");
});

/* ---------- TILT CARDS ---------- */
document.querySelectorAll(".tilt").forEach(el=>{
  el.addEventListener("mousemove", e=>{
    const r=el.getBoundingClientRect();
    const px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
    const rx=(py-.5)*-10, ry=(px-.5)*12;
    el.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    el.style.setProperty("--mx",(px*100)+"%");
    el.style.setProperty("--my",(py*100)+"%");
  });
  el.addEventListener("mouseleave", ()=>el.style.transform="");
});

/* ---------- LENIS SMOOTH SCROLL ---------- */
const lenis = new Lenis({lerp:0.09, smoothWheel:true});
function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
gsap.registerPlugin(ScrollTrigger);
lenis.on("scroll", ScrollTrigger.update);

/* ---------- REVEAL ON SCROLL ---------- */
document.querySelectorAll(".reveal").forEach(el=>{
  ScrollTrigger.create({trigger:el, start:"top 85%", onEnter:()=>el.classList.add("in")});
});

/* ---------- TIMELINE RAIL FILL ---------- */
const rail = document.getElementById("rail-fill");
if (rail){
  ScrollTrigger.create({
    trigger:"#xp .timeline", start:"top 70%", end:"bottom 60%", scrub:true,
    onUpdate: s => rail.style.height = (s.progress*100)+"%"
  });
}

/* ---------- TYPED TAGLINE ---------- */
const typed = document.querySelector(".typed");
if (typed){
  const words = JSON.parse(typed.dataset.words);
  let wi=0, ci=0, del=false;
  const run = () => {
    const w = words[wi];
    typed.textContent = w.slice(0,ci);
    if (!del && ci<w.length){ ci++; setTimeout(run, 55); }
    else if (del && ci>0){ ci--; setTimeout(run, 30); }
    else { del=!del; if(!del){wi=(wi+1)%words.length;} setTimeout(run, del?1600:400); }
  };
  setTimeout(run, 1500);
}

/* ---------- SCRAMBLE TEXT (hero) ---------- */
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*_+=/<>";
document.querySelectorAll(".scramble").forEach((el,i)=>{
  const original = el.dataset.text;
  let frame=0, dur=30+i*8;
  const id = setInterval(()=>{
    let out="";
    for(let k=0;k<original.length;k++){
      if (k < (frame/dur)*original.length) out += original[k];
      else out += chars[Math.floor(Math.random()*chars.length)];
    }
    el.textContent = out;
    frame++;
    if (frame>dur){ clearInterval(id); el.textContent=original; }
  }, 50);
});

/* ---------- UPTIME ---------- */
const up = document.getElementById("uptime");
const t0 = Date.now();
setInterval(()=>{
  const s = Math.floor((Date.now()-t0)/1000);
  const hh = String(Math.floor(s/3600)).padStart(2,"0");
  const mm = String(Math.floor(s/60)%60).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  if (up) up.textContent = `${hh}:${mm}:${ss}`;
},1000);
document.getElementById("yr").textContent = new Date().getFullYear();

/* ---------- NEURAL NETWORK BACKGROUND (canvas) ---------- */
const canvas = document.getElementById("neural");
const ctx = canvas.getContext("2d");
let W,H,dpr,nodes=[];
const resize = () => {
  dpr = Math.min(window.devicePixelRatio||1, 2);
  W = canvas.width = innerWidth*dpr; H = canvas.height = innerHeight*dpr;
  canvas.style.width=innerWidth+"px"; canvas.style.height=innerHeight+"px";
  const count = Math.min(110, Math.floor(innerWidth/14));
  nodes = Array.from({length:count}, ()=>({
    x: Math.random()*W, y: Math.random()*H,
    vx: (Math.random()-.5)*0.35*dpr, vy: (Math.random()-.5)*0.35*dpr,
    r: (Math.random()*1.4+0.6)*dpr
  }));
};
resize(); addEventListener("resize", resize);
let mxN=W/2, myN=H/2;
addEventListener("mousemove", e=>{ mxN=e.clientX*dpr; myN=e.clientY*dpr; });

const draw = () => {
  ctx.clearRect(0,0,W,H);
  // soft vignette
  const g = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)/1.2);
  g.addColorStop(0,"rgba(10,16,32,0.0)");
  g.addColorStop(1,"rgba(0,0,0,0.85)");
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  for (let n of nodes){
    n.x+=n.vx; n.y+=n.vy;
    if (n.x<0||n.x>W) n.vx*=-1;
    if (n.y<0||n.y>H) n.vy*=-1;
    // pull toward cursor slightly
    const dx=mxN-n.x, dy=myN-n.y, d=Math.hypot(dx,dy);
    if (d<200*dpr){ n.x+=dx*0.0008; n.y+=dy*0.0008; }
  }
  // connections
  for (let i=0;i<nodes.length;i++){
    for (let j=i+1;j<nodes.length;j++){
      const a=nodes[i], b=nodes[j];
      const dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
      const max = 140*dpr;
      if (d<max){
        const o = (1 - d/max);
        ctx.strokeStyle = `rgba(125,249,255,${o*0.18})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    }
  }
  // nodes
  for (let n of nodes){
    ctx.fillStyle = "rgba(167,139,250,0.8)";
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
  }
  requestAnimationFrame(draw);
};
draw();

/* ---------- SKILLS CONSTELLATION ---------- */
const stage = document.getElementById("constellation");
if (stage){
  const skills = [
    // languages – cyan
    {t:"Python",c:"#7df9ff"},{t:"C++",c:"#7df9ff"},{t:"Java",c:"#7df9ff"},{t:"R",c:"#7df9ff"},{t:"SQL",c:"#7df9ff"},
    // ai/ml – pink
    {t:"Agentic AI",c:"#ff6ec7"},{t:"RAG",c:"#ff6ec7"},{t:"LangChain",c:"#ff6ec7"},{t:"TensorFlow",c:"#ff6ec7"},
    {t:"Keras",c:"#ff6ec7"},{t:"NLP",c:"#ff6ec7"},{t:"Neural Nets",c:"#ff6ec7"},{t:"GenAI",c:"#ff6ec7"},
    // cloud – violet
    {t:"Azure",c:"#a78bfa"},{t:"AI Foundry",c:"#a78bfa"},{t:"AWS",c:"#a78bfa"},{t:"SageMaker",c:"#a78bfa"},
    {t:"AKS",c:"#a78bfa"},{t:"ADX",c:"#a78bfa"},{t:"Cosmos DB",c:"#a78bfa"},
    // tools – yellow
    {t:"GitHub",c:"#facc15"},{t:"Pandas",c:"#facc15"},{t:"NumPy",c:"#facc15"},{t:"ELK",c:"#facc15"},
    {t:"FastAPI",c:"#facc15"},{t:"Next.js",c:"#facc15"},{t:"Copilot",c:"#facc15"},
  ];
  const r = stage.getBoundingClientRect();
  const cx = r.width/2, cy = r.height/2;
  const items = skills.map((s,i)=>{
    const ang = (i/skills.length)*Math.PI*2;
    const rad = 80 + Math.random()*Math.min(r.width,r.height)/3;
    const el = document.createElement("div");
    el.className="skill-node";
    el.textContent = s.t;
    el.style.color = s.c;
    el.style.borderColor = s.c+"55";
    el.style.boxShadow = `0 0 16px ${s.c}33`;
    stage.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    return {
      el, w, h,
      x: cx + Math.cos(ang)*rad - w/2,
      y: cy + Math.sin(ang)*rad - h/2,
      vx:(Math.random()-.5)*0.4, vy:(Math.random()-.5)*0.4,
      pinned:false
    };
  });

  // drag
  items.forEach(it=>{
    let ox=0, oy=0, drag=false;
    it.el.addEventListener("mousedown", e=>{
      drag=true; it.pinned=true; it.el.classList.add("dragging");
      ox = e.clientX - it.x; oy = e.clientY - it.y;
      e.preventDefault();
    });
    window.addEventListener("mousemove", e=>{
      if(!drag) return;
      it.x = e.clientX - ox; it.y = e.clientY - oy;
    });
    window.addEventListener("mouseup", ()=>{
      drag=false; it.el.classList.remove("dragging");
      setTimeout(()=>it.pinned=false, 600);
    });
  });

  const loop = () => {
    const rect = stage.getBoundingClientRect();
    for (let it of items){
      if (!it.pinned){
        it.x += it.vx; it.y += it.vy;
        if (it.x < 0 || it.x+it.w > rect.width) it.vx*=-1;
        if (it.y < 0 || it.y+it.h > rect.height) it.vy*=-1;
      }
      it.el.style.transform = `translate(${it.x}px, ${it.y}px)`;
    }
    requestAnimationFrame(loop);
  };
  loop();
}

/* ---------- CONTACT TERMINAL ---------- */
const tBody = document.getElementById("term-body");
const tInput = document.getElementById("term-input");
const tForm = document.getElementById("term-form");
const cmds = {
  help: () => "available: about · email · linkedin · github · resume · hire · whoami · sudo · clear",
  about: () => "Kevil Patel — Associate SDE @ Kyndryl. Agentic AI on Azure. Surat, IN.",
  email: () => `<a href="mailto:kevilpatel24@gmail.com" style="color:var(--accent)">kevilpatel24@gmail.com</a>`,
  linkedin: () => `<a target="_blank" href="https://linkedin.com/in/kevil21" style="color:var(--accent)">linkedin.com/in/kevil21</a>`,
  github: () => `<a target="_blank" href="https://github.com/kevil21" style="color:var(--accent)">github.com/kevil21</a>`,
  resume: () => `request a PDF at kevilpatel24@gmail.com — or scroll up, the whole site is the resume.`,
  hire: () => "✦ excellent. opening mail client...|MAIL",
  whoami: () => "visitor@kevil.os (curious one — i like that)",
  sudo: () => "nice try. you don't have root here. yet.",
  clear: () => "|CLEAR",
};
function termWrite(line, asPrompt=false){
  const span = document.createElement("span");
  span.className = "t-line";
  span.innerHTML = asPrompt ? `<span class="prompt">kevil@os:~$</span> ${line}` : line;
  // insert before the last (active prompt) line
  const active = tBody.querySelector(".t-line:last-child");
  tBody.insertBefore(span, active);
  tBody.scrollTop = tBody.scrollHeight;
}
if (tForm){
  tForm.addEventListener("submit", e=>{
    e.preventDefault();
    const raw = tInput.value.trim();
    if (!raw) return;
    termWrite(raw, true);
    const fn = cmds[raw.toLowerCase()];
    let out = fn ? fn() : `command not found: ${raw} — try 'help'`;
    if (out === "|CLEAR"){
      tBody.querySelectorAll(".t-line").forEach((n,i,a)=>{ if(i<a.length-1) n.remove(); });
    } else if (typeof out === "string" && out.endsWith("|MAIL")){
      termWrite(out.replace("|MAIL",""));
      window.location.href = "mailto:kevilpatel24@gmail.com";
    } else {
      termWrite(out);
    }
    tInput.value = "";
  });
}

/* ---------- KONAMI EASTER EGG ---------- */
const seq = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let kidx = 0;
window.addEventListener("keydown", e=>{
  if (e.key === seq[kidx]) {
    kidx++;
    if (kidx === seq.length){
      kidx=0;
      document.body.style.transition="filter .5s";
      document.body.style.filter="hue-rotate(120deg) saturate(1.4)";
      setTimeout(()=>document.body.style.filter="", 3000);
      console.log("%c✦ kevil.os :: rainbow mode unlocked","color:#7df9ff;font:bold 14px monospace");
    }
  } else kidx=0;
});

console.log("%c kevil.os v1.0 ","background:#7df9ff;color:#000;font:bold 14px monospace;padding:4px 10px");
console.log("%c psst — try the konami code. ↑↑↓↓←→←→ b a ","color:#ff6ec7;font:12px monospace");

})();
