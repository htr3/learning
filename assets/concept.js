"use strict";
/* Shared framework for System Design concept pages.
   A topic page defines a DATA object and calls renderConcept(DATA). */
const SVGNS="http://www.w3.org/2000/svg";
const $=id=>document.getElementById(id);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const S=(t,a={})=>{const e=document.createElementNS(SVGNS,t);for(const k in a)e.setAttribute(k,a[k]);return e;};
const TX=(x,y,str,a={})=>{const e=S("text",Object.assign({x,y},a));e.textContent=str;return e;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);

class Navigation{
  constructor(){this.fade=$("fade");requestAnimationFrame(()=>this.fade.classList.add("hide"));setTimeout(()=>{this.fade.style.pointerEvents="none";},520);
    document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>this.go(b.dataset.nav)));}
  go(u){if(!u)return;this.fade.classList.remove("hide");setTimeout(()=>location.href=u,380);}
}
class Sidebar{
  constructor(){this.m=$("sidebar");$("menuBtn").addEventListener("click",()=>this.m.classList.toggle("open"));}
  build(list){const c=$("snavList");list.forEach(([id,label])=>{const n=el("div","snav",label);n.onclick=()=>{const t=$(id);if(t)t.scrollIntoView({behavior:"smooth",block:"start"});this.m.classList.remove("open");};c.appendChild(n);});
    const links=[...document.querySelectorAll(".snav")];
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach((l,i)=>l.classList.toggle("active",list[i][0]===e.target.id));}),{rootMargin:"-45% 0px -50% 0px"});
    document.querySelectorAll("section[id]").forEach(s=>io.observe(s));}
}
class CodeViewer{
  static KW=new Set("function const let var return if else for while do class new this async await import from export public private protected static void int long double float boolean char String List Map Set ArrayList HashMap def self lambda yield try except catch finally throw throws package interface enum extends implements super true false null None True False and or not in is with as func type struct go chan defer range map var switch case break continue default select".split(" "));
  constructor(host,tabs){this.host=host;this.tabs=tabs;this.keys=Object.keys(tabs);this.build();}
  build(){const w=el("div","cv"),tb=el("div","cv-tabs");this.keys.forEach((k,i)=>{const b=el("button","cv-tab"+(i===0?" active":""),k);b.onclick=()=>this.sel(k,b);tb.appendChild(b);});
    const bd=el("div","cv-body"),cp=el("button","cv-copy","⧉ Copy");cp.onclick=()=>{try{navigator.clipboard&&navigator.clipboard.writeText(this.tabs[this.cur]);}catch(e){}cp.textContent="✓";setTimeout(()=>cp.textContent="⧉ Copy",1200);};
    const pre=el("pre"),co=el("code");pre.appendChild(co);bd.appendChild(cp);bd.appendChild(pre);w.appendChild(tb);w.appendChild(bd);this.host.appendChild(w);this.co=co;this.sel(this.keys[0]);}
  sel(k,b){this.cur=k;if(b){this.host.querySelectorAll(".cv-tab").forEach(t=>t.classList.remove("active"));b.classList.add("active");}this.co.innerHTML=CodeViewer.hl(this.tabs[k]);}
  static esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  static hl(c){return CodeViewer.esc(c).replace(/(\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+\.?\d*\b)|(\b[A-Za-z_$][\w$]*\b)/g,
    (m,cm,st,nu,wd)=>cm?`<span class="tok-cm">${cm}</span>`:st?`<span class="tok-st">${st}</span>`:nu?`<span class="tok-nu">${nu}</span>`:wd&&CodeViewer.KW.has(wd)?`<span class="tok-kw">${wd}</span>`:m);}
}

function renderConcept(D){
  document.title=D.title+" — System Design Concepts";
  const body=document.body;
  const fade=el("div");fade.id="fade";body.appendChild(fade);

  /* top nav */
  const nav=el("div");nav.id="topnav";
  nav.innerHTML=`<button id="menuBtn">☰</button>
    <button class="back" data-nav="../index.html">← Back to Hub</button>
    <div class="nav-title"><span class="badge">${D.badge||"🧩"}</span> ${D.title}</div>
    <div class="breadcrumb"><span data-nav="../index.html">Hub</span><span class="sep">›</span><span>${D.category||"Concept"}</span><span class="sep">›</span><span class="cur">${D.title}</span></div>
    <div class="spacer"></div>
    <div class="navmeta"><span class="chip">Difficulty <b>${D.difficulty||"Medium"}</b></span><span class="chip">Read <b>${D.readingTime||"8 min"}</b></span></div>`;
  body.appendChild(nav);

  /* sidebar */
  const side=el("nav");side.id="sidebar";
  side.innerHTML=`<div class="s-title">On this page</div><div id="snavList"></div><div class="s-div"></div><div class="s-foot">Pure HTML · CSS · Vanilla JS<br>SVG animations · no frameworks</div>`;
  body.appendChild(side);

  /* main + hero */
  const main=el("main");
  const hero=el("div","hero");
  hero.innerHTML=`<div class="eyebrow">${D.eyebrow||D.category||""}</div><h1>${D.title}</h1><p class="tagline">${D.tagline||""}</p>
    <div class="pills">${(D.pills||[]).map(p=>`<span class="hpill"><span class="dot"></span> ${p}</span>`).join("")}</div>`;
  main.appendChild(hero);
  const root=el("div");root.id="sections";main.appendChild(root);
  body.appendChild(main);

  const SECS=[];
  function sec(id,tag,icon,title){const s=el("section");s.id=id;
    s.innerHTML=`<div class="sec-head"><div class="s-num">${icon}</div><div><div class="s-tag">${tag}</div><h2>${title}</h2></div></div>`;
    root.appendChild(s);SECS.push([id,icon+" "+title]);return s;}

  /* Overview */
  if(D.overview){const s=sec("overview","Concept","📖","Overview");const c=el("div","card");
    c.innerHTML=`<p class="lead">${D.overview}</p>`+(D.problem?`<div class="callout"><b>Problem it solves —</b> ${D.problem}</div>`:"");
    s.appendChild(c);}

  /* How it works + diagram */
  if(D.how||D.diagram){const s=sec("how","Mechanics","⚙️","How It Works");const c=el("div","card");
    if(D.diagram){c.appendChild(el("div","block-title","Animated diagram"));
      const vw=el("div","viz-wrap");const vh=el("div");vw.appendChild(vh);
      if(D.diagramCaption)vw.appendChild(el("div","viz-cap",D.diagramCaption));c.appendChild(vw);
      try{D.diagram(vh);}catch(e){console.error("diagram error",e);}}
    if(D.how){c.appendChild(el("div","block-title","Step by step"));
      const ol=el("ul","steps");D.how.forEach(x=>ol.appendChild(el("li",null,x)));c.appendChild(ol);}
    s.appendChild(c);}

  /* Complexity & tradeoffs */
  if(D.complexity||D.advantages||D.tradeoffs){const s=sec("complexity","Analysis","⚖️","Complexity & Trade-offs");const c=el("div","card");
    if(D.complexity){const kv=el("div","kv");D.complexity.forEach(([k,v])=>{const it=el("div","item");it.innerHTML=`<div class="k">${k}</div><div class="v mono">${v}</div>`;kv.appendChild(it);});c.appendChild(kv);}
    if(D.advantages||D.disadvantages){const tc=el("div","two-col");tc.style.marginTop="16px";
      if(D.advantages)tc.appendChild(el("div","col-box good",`<h4>👍 Advantages</h4><ul>${D.advantages.map(x=>`<li>${x}</li>`).join("")}</ul>`));
      if(D.disadvantages)tc.appendChild(el("div","col-box bad",`<h4>👎 Disadvantages</h4><ul>${D.disadvantages.map(x=>`<li>${x}</li>`).join("")}</ul>`));c.appendChild(tc);}
    if(D.tradeoffs)c.appendChild(el("div","callout",`<b>Trade-offs —</b> ${D.tradeoffs}`));
    if(D.whenNot)c.appendChild(el("div","callout warn",`<b>When NOT to use it —</b> ${D.whenNot}`));
    s.appendChild(c);}

  /* Comparison table */
  if(D.comparison){const s=sec("comparison","Compare","📊","Comparison");const c=el("div","card");
    const t=el("table","cmp");t.innerHTML=`<thead><tr>${D.comparison.cols.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${D.comparison.rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody>`;
    c.appendChild(t);s.appendChild(c);}

  /* Simulation */
  if(D.sim){const s=sec("simulation","Try it","🎮","Interactive Simulation");const c=el("div","card");
    if(D.simIntro)c.appendChild(el("p","lead",D.simIntro));const holder=el("div");holder.style.marginTop=D.simIntro?"14px":"0";c.appendChild(holder);s.appendChild(c);
    try{D.sim(holder);}catch(e){console.error("sim error",e);}}

  /* Code */
  if(D.code){const s=sec("code","Implementation","💻","Code Examples");const c=el("div","card");
    if(D.codeIntro)c.appendChild(el("p","lead",D.codeIntro));const h=el("div");c.appendChild(h);new CodeViewer(h,D.code);s.appendChild(c);}

  /* Real world */
  if(D.realWorld){const s=sec("realworld","In Production","🌍","Real-World Usage");const c=el("div","card");
    const g=el("div","rel-grid");D.realWorld.forEach(([n,d])=>{const x=el("div","col-box");x.innerHTML=`<h4>${n}</h4><p style="font-size:12.5px;color:var(--muted);line-height:1.55;margin-top:6px">${d}</p>`;g.appendChild(x);});c.appendChild(g);s.appendChild(c);}

  /* Interview */
  if(D.interview){const s=sec("interview","Prep","🎯","Interview Questions");const wrap=el("div");
    const names={basic:"Basic",inter:"Intermediate",adv:"Advanced",sd:"System Design"};
    D.interview.forEach(([lvl,q,a])=>{const acc=el("div","acc");
      acc.innerHTML=`<div class="acc-q"><span class="lvl ${lvl}">${names[lvl]||lvl}</span><span>${q}</span><span class="chev">▾</span></div><div class="acc-a"><div class="inner">${a}</div></div>`;
      acc.querySelector(".acc-q").onclick=()=>acc.classList.toggle("open");wrap.appendChild(acc);});
    s.appendChild(wrap);}

  /* Mistakes */
  if(D.mistakes){const s=sec("mistakes","Pitfalls","⚠️","Common Mistakes");const c=el("div","card");
    c.innerHTML=`<div class="col-box bad"><ul>${D.mistakes.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;s.appendChild(c);}

  /* Best */
  if(D.best){const s=sec("best","Production","✅","Best Practices");const c=el("div","card");
    c.innerHTML=`<div class="col-box good"><ul>${D.best.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;s.appendChild(c);}

  /* Related */
  if(D.related){const s=sec("related","Keep Learning","🔗","Related Topics");const g=el("div","rel-grid");
    D.related.forEach(([t,i,d,u])=>{const c=el("div","rel-card",`<div class="ri">${i}</div><div><div class="rt">${t}</div><div class="rs">${d}</div></div>`);c.onclick=()=>NAV.go(u);g.appendChild(c);});
    s.appendChild(g);}

  const NAV=new Navigation();
  const SB=new Sidebar();SB.build(SECS);
  window.NAV=NAV;
}
