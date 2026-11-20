const fs=require('node:fs'),path=require('node:path');
let updated=0;
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.isDirectory()){if(!['tmp','.git','node_modules'].includes(entry.name))visit(path.join(dir,entry.name));continue;}
  if(!entry.name.endsWith('.html')||entry.name.includes('.backup-'))continue;
  const file=path.join(dir,entry.name),source=fs.readFileSync(file,'utf8');
  const next=source.replace(/\/assets\/blog\.css(?:\?[^"'\s<>]*)?/g,'/assets/blog.css?v=20261120-3');
  if(next!==source){fs.writeFileSync(file,next,'utf8');updated++;}
}}
visit(path.resolve(__dirname,'..'));console.log(`Updated blog stylesheet references: ${updated}`);
