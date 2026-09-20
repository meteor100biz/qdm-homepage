const fs=require('fs'),path=require('path');
const root=process.cwd(), changed=[], missing=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
if(['tmp','local-admin','node_modules','.git'].includes(e.name))continue;
const p=path.join(dir,e.name);
if(e.isDirectory())walk(p);
else if(e.name.endsWith('.html')&&!/backup/i.test(e.name)){
const original=fs.readFileSync(p,'utf8');
let html=original.replace(/assets\/language\.js(?:\?[^"']*)?/g,'assets/language.js?v=20260920-1');
if(!html.includes('assets/language.js')){missing.push(path.relative(root,p));html=html.replace(/<\/body>/i,'<script src="/assets/analytics.js?v=20260920-1"></script></body>');}
if(html!==original){fs.writeFileSync(p,html);changed.push(path.relative(root,p));}
}}}
walk(root); console.log(JSON.stringify({updated:changed.length,directTrackerPages:missing}));
