const fs=require('fs'),path=require('path');
const categories={'press-die-design':'press-die','sheet-metal-forming-analysis':'forming','structural-analysis':'analysis','product-design':'mechanical'};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const lang of ['','ja/']){
 const posts=JSON.parse(fs.readFileSync(lang?'data/ja/portfolios.json':'data/portfolios.json','utf8'));
 for(const [service,category] of Object.entries(categories)){
  const file=`${lang}services/${service}/index.html`;
  let html=fs.readFileSync(file,'utf8');
  const seen=new Set();
  const projects=posts.filter(p=>p.published!==false&&p.category===category&&p.image).sort((a,b)=>(b.order||0)-(a.order||0)).filter(p=>{const src='/'+p.image.replace(/^\//,'');if(seen.has(src))return false;seen.add(src);return true;}).slice(0,4);
  const images=projects.map(p=>{
   const src='/'+p.image.replace(/^\//,'');
   if(!fs.existsSync('.'+src))throw Error('Missing image '+src);
   return `<img src="${escape(src)}" alt="${escape(p.title)}" decoding="async">`;
  }).join('');
  const pattern=/<div class="service-visual"[^>]*><\/div>/;
  if(!pattern.test(html))throw Error('No overview image '+file);
  const backup=path.join('tmp/service-thumbnails-backup',file);fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(file,backup);
  html=html.replace(pattern,`<div class="service-thumbnails" role="group" aria-label="${lang?'関連分野の実績画像':'해당 분야 프로젝트 이미지'}">${images}</div>`);
  html=html.replace(/\/assets\/service-pages\.css\?v=[^"']+/g,'/assets/service-pages.css?v=20260915-2').replace(/\/assets\/site\.js\?v=[^"']+/g,'/assets/site.js?v=20260915-2');
  fs.writeFileSync(file,html,'utf8');console.log(file+': '+projects.length+' thumbnails');
 }
}
