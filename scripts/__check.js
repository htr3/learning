// Generic DOM-stub boot harness for the concept pages.
const fs=require("fs");
const file=process.argv[2];
const html=fs.readFileSync(file,"utf8");
// gather inline scripts (those without a src= attribute)
let code="";
const re=/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g; let mm;
while((mm=re.exec(html))){ const attrs=mm[1]||""; if(/\bsrc=/.test(attrs)) continue; code+="\n"+mm[2]; }
if(!code.trim()){ console.error("no inline script"); process.exit(1); }
// prepend shared framework if the page links it
if(/concept\.js/.test(html)){ code=fs.readFileSync(require("path").join(__dirname,"..","assets","concept.js"),"utf8")+"\n"+code; }

let errors=[];
function mkEl(tag){
  const e={ tagName:tag, children:[], style:{}, dataset:{}, attrs:{}, _text:"", classList:{ _s:new Set(),
      add(...c){c.forEach(x=>this._s.add(x));}, remove(...c){c.forEach(x=>this._s.delete(x));}, toggle(c,f){ if(f===undefined)f=!this._s.has(c); f?this._s.add(c):this._s.delete(c); return f;}, contains(c){return this._s.has(c);} },
    appendChild(c){this.children.push(c);return c;}, removeChild(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return c;},
    insertBefore(c,r){const i=this.children.indexOf(r);this.children.splice(i<0?0:i,0,c);return c;},
    setAttribute(k,v){this.attrs[k]=v;}, getAttribute(k){return this.attrs[k];}, removeAttribute(k){delete this.attrs[k];},
    addEventListener(){}, removeEventListener(){}, querySelector(){return mkEl("div");}, querySelectorAll(){return [];},
    closest(){return null;}, matches(){return false;}, contains(){return false;}, cloneNode(){return mkEl(tag);},
    insertAdjacentHTML(){}, remove(){}, getContext(){return {};},
    getTotalLength(){return 100;}, getPointAtLength(){return {x:0,y:0};}, getBBox(){return {x:0,y:0,width:10,height:10};},
    getComputedTextLength(){return 10;}, setAttributeNS(){}, getAttributeNS(){return null;},
    scrollIntoView(){}, focus(){}, click(){ if(this.onclick)this.onclick(); },
    get firstChild(){return this.children[0]||null;}, get lastChild(){return this.children[this.children.length-1]||null;},
    get innerHTML(){return this._html||"";}, set innerHTML(v){this._html=v;this.children=[];},
    get textContent(){return this._text;}, set textContent(v){this._text=String(v);},
    getBoundingClientRect(){return {x:0,y:0,width:600,height:200,top:0,left:0,right:600,bottom:200};},
  };
  return e;
}
const store={};
function byId(id){ if(!store[id]){store[id]=mkEl("div");store[id].id=id;} return store[id]; }
global.document={ getElementById:byId, createElement:mkEl, createElementNS:(ns,t)=>mkEl(t),
  querySelector:()=>mkEl("div"), querySelectorAll:()=>[], addEventListener(){}, body:mkEl("body") };
global.window=global; global.navigator={clipboard:{writeText(){}}};
global.addEventListener=()=>{}; global.removeEventListener=()=>{};
global.getComputedStyle=()=>({getPropertyValue:()=>""});
global.requestAnimationFrame=()=>1; global.cancelAnimationFrame=()=>{};
global.performance={now:()=>0};
global.IntersectionObserver=class{constructor(cb){this.cb=cb;}observe(){ } disconnect(){} };
global.setTimeout=(f)=>{ try{typeof f==="function"&&f();}catch(e){errors.push("setTimeout:"+e.message);} return 0; };
global.setInterval=()=>0; global.clearInterval=()=>{};
global.location={href:""};

try{ eval(code); console.log("BOOT OK:", file.split(/[\\/]/).pop()); }
catch(e){ console.error("BOOT ERROR:", e.message); console.error(e.stack.split("\n").slice(0,4).join("\n")); process.exit(2); }
if(errors.length){ console.error("DEFERRED ERRORS:", errors); process.exit(3); }
