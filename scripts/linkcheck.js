// Static link checker: verifies every relative .html/.css/.js reference resolves.
const fs=require("fs"), path=require("path");
const root=path.join(__dirname,"..");
function walk(dir){ let out=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(e.name===".git"||e.name==="node_modules") continue;
  const p=path.join(dir,e.name);
  if(e.isDirectory()) out=out.concat(walk(p)); else if(e.name.endsWith(".html")) out.push(p);
} return out; }
const files=walk(root);
let missing=0, checked=0;
const reQuoted=/["'`]([^"'`\n]+?\.(?:html|css|js))["'`]/g;
for(const f of files){
  const dir=path.dirname(f); const html=fs.readFileSync(f,"utf8"); let m; const seen=new Set();
  while((m=reQuoted.exec(html))){
    let ref=m[1].trim();
    if(/^(https?:|data:|mailto:|#|\/\/)/.test(ref)) continue;
    if(ref.includes("${")||ref.includes("+")) continue;      // template/dynamic
    ref=ref.split("#")[0].split("?")[0]; if(!ref) continue;
    if(seen.has(ref)) continue; seen.add(ref);
    const target=path.resolve(dir, ref);
    checked++;
    if(!fs.existsSync(target)){ missing++; console.log("MISSING  ["+path.relative(root,f)+"]  ->  "+ref); }
  }
}
console.log("\nchecked "+checked+" unique refs across "+files.length+" files; missing="+missing);
process.exit(missing?1:0);
