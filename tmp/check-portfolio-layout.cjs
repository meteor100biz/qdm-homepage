const fs=require('fs'),path=require('path');
let n=0;
for(const dir of ['assets/portfolio','ja/assets/portfolio']) for(const rel of fs.readdirSync(dir,{recursive:true}).filter(x=>x.endsWith('portfolio.html'))){
 const f=path.join(dir,rel),h=fs.readFileSync(f,'utf8'),old=fs.readFileSync(path.join('tmp/portfolio-layout-backup',f),'utf8');
 if(!h.includes('portfolio-detail.css')||!h.includes('portfolio-media'))throw Error(f);
 const box=/<div class="detail-box">([\s\S]*?)<\/section>/;
 if(h.match(box)[1]!==old.match(box)[1])throw Error('Description changed '+f);
 const srcs=[...h.matchAll(/(?:src="|url\(')(\/assets\/portfolio\/[^"')]+)/g)].map(x=>x[1]);
 if(new Set(srcs).size!==srcs.length)throw Error('Duplicate '+f);
 for(const src of srcs)if(!fs.existsSync('.'+src))throw Error('Missing '+src);
 const oldSrcs=[...old.matchAll(/(?:src="|url\(')(\/assets\/portfolio\/[^"')]+)/g)].map(x=>x[1]);
 if([...new Set(oldSrcs)].sort().join()!==[...srcs].sort().join())throw Error('Images changed '+f);
 n++;
}
const admin=fs.readFileSync('local-admin/portfolio-admin.html','utf8');
for(const s of admin.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(s[1]);
const body=admin.slice(admin.indexOf('    function buildDetailHtml('),admin.indexOf('\n    }',admin.indexOf('    function buildDetailHtml('))+6);
const make=new Function('isJapanese','escapeHtml','removeMainPath','categoryPlainName','QdmAdminLayout','state',body+'; return buildDetailHtml;');
for(const ja of [false,true]){
 const build=make(ja,x=>String(x),(xs,main)=>xs.filter(x=>x!==main),x=>x,{header:()=>'',footer:()=>'',assetVersions:{}},{});
 const html=build({title:'Example',tags:[],tasks:['Task'],category:'analysis',slug:'example',overview:'Overview'},'assets/main.png',['assets/main.png','assets/detail.png','assets/detail.png']);
 if(!html.includes('portfolio-media')||!html.includes('portfolio-detail.css')||(html.match(/<img /g)||[]).length!==1||html.includes('Project Images'))throw Error('Generator failed');
}
console.log(n+' pages verified: descriptions and image sets preserved, no duplicates, all image files exist. Korean/Japanese admin generators and JavaScript syntax passed.');
