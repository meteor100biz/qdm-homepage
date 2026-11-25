const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const backup=path.join(root,'tmp',`related-links-backup-${Date.now()}`);
function write(file,content){const original=fs.readFileSync(file,'utf8');if(original===content)return;const saved=path.join(backup,path.relative(root,file));fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(file,saved);fs.writeFileSync(file,content,'utf8');}
function normalize(value){const source=String(value||'').trim();if(!source)return '';const url=new URL(source,'https://qdm.co.kr/');if(!['http:','https:'].includes(url.protocol))return '';return url.origin==='https://qdm.co.kr'?url.pathname+url.search+url.hash:url.href;}
for(const name of ['local-admin/blog-admin.html','local-admin/ja-blog-admin.html']){
 const file=path.join(root,name);let html=fs.readFileSync(file,'utf8');
 html=html.replace('  function renderPortfolios(){','  function portfolioUrl(value){const source=String(value||"").trim();if(!source)return "";const url=new URL(source,"https://qdm.co.kr/");if(!["http:","https:"].includes(url.protocol))return "";return url.origin==="https://qdm.co.kr"?url.pathname+url.search+url.hash:url.href;}\n  function renderPortfolios(){');
 html=html.replaceAll('escapeHtml(item.url)', 'escapeHtml(portfolioUrl(item.url))');
 html=html.replace('$("relatedPortfolio").value=post.relatedPortfolioUrl||"";', '$("relatedPortfolio").value=portfolioUrl(post.relatedPortfolioUrl);');
 html=html.replace('item.url===$("relatedPortfolio").value','portfolioUrl(item.url)===$("relatedPortfolio").value');
 html=html.replace('relatedPortfolioUrl:related?.url||""','relatedPortfolioUrl:portfolioUrl(related?.url)');
 html=html.replace('escapeHtml(post.relatedPortfolioUrl)', 'escapeHtml(portfolioUrl(post.relatedPortfolioUrl))');
 write(file,html);
}
let dataChanges=0,htmlChanges=0;
for(const base of ['','ja/']){
 const data=path.join(root,'data',base,'blog-posts.json');const source=fs.readFileSync(data,'utf8');let changed=false;
 const posts=JSON.parse(source);
 for(const post of posts){if(post.relatedPortfolioUrl){const url=normalize(post.relatedPortfolioUrl);if(url!==post.relatedPortfolioUrl){post.relatedPortfolioUrl=url;changed=true;dataChanges++;}}}
 if(changed)write(data,JSON.stringify(posts,null,2)+'\n');
 const blog=path.join(root,base,'blog');
 function visit(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!entry.name.endsWith('.html'))continue;
  const html=fs.readFileSync(file,'utf8');
  const fixed=html.replace(/(<aside\b[^>]*class="related-link"[^>]*>[\s\S]*?<a\b[^>]*href=")([^"]+)(")/g,(_,before,url,after)=>before+normalize(url)+after);
  if(fixed!==html){write(file,fixed);htmlChanges++;}
 }}
 visit(blog);
}
console.log(JSON.stringify({dataChanges,htmlChanges,backup}));
