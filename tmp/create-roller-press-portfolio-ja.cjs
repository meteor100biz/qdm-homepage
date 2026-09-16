const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const slug='roller-press-reverse-engineering-20260916';
const koBase=`assets/portfolio/mechanical/${slug}`,base=`ja/${koBase}`;
assert(!fs.existsSync(base),'Japanese portfolio already exists');
const data={category:'mechanical',categoryName:'機械・機構設計',slug,title:'ローラープレスのリバースエンジニアリングと部品図の復元',subtitle:'既存の組立図と実機を照合し、3D仮想組立で検証する設計図面の復元',summary:'詳細部品図が失われたローラープレスを対象に、既存の組立図と実機を照合。部品ごとの3Dモデリングと仮想組立によって構造を検証し、2D設計図面を復元するプロジェクトです。',overview:'ローラープレス（ROLLER PRESS）は、プレス金型で成形した製品をローラーの間に通して加圧し、平坦度と寸法の均一性を整える後加工設備です。製品に必要な後加工工程を担うもので、プレス成形不良の修正を目的とした設備ではありません。対象は、以前に設計・製作され、現在も現場で稼働している装置です。古い組立図のみが残り、詳細部品図は失われていました。残された組立図を読み解き、実機と照合しながら部品を一つずつ3Dモデル化し、仮想組立で検証した内容を2D設計図面へ反映する方法で復元を進めます。',tags:['ローラープレス','リバースエンジニアリング','3Dモデリング','図面復元'],tasks:[
'既存組立図の読解：部品の配置と結合関係、ローラーおよび駆動部の構造を把握し、組立図だけでは判断できない箇所を整理します。',
'設計者ごとの図面表現の確認：製図規格の問題とは別に、元の設計者によるCADオブジェクトの色、レイヤー、線種、隠れた部品の表現方法を読み解きます。画面上で実線として描かれた箇所も、実際に見える輪郭なのか、他の部品の背後にある形状なのかを区別し、組立関係を理解します。',
'実機との照合：図面から読み取った構造を稼働中の装置と照合し、部品形状、配置、結合関係を確認します。図面で不足している情報や不明確な箇所を補います。',
'部品ごとの3Dモデリング：組立図と実機から確認した情報を基に部品を一つずつモデル化し、2D図面だけでは把握しにくい形状や位置関係を立体的に検討します。',
'3D仮想組立と検証：モデル化した部品を仮想的に組み立て、部品間の結合関係や干渉の有無を検討します。既存の組立図および実機との整合性も確認します。',
'2D詳細部品図の復元：仮想組立と実機照合によって検証した部品から2D設計図面を作成し、組立図だけでは不足していた詳細設計情報を段階的に復元します。'
]};
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('local-admin/admin-layout.js','utf8'),c);
const source=fs.readFileSync('local-admin/portfolio-admin.html','utf8');const start=source.indexOf('    function buildDetailHtml(');const fn=source.slice(start,source.indexOf('\n    }',start)+6);
Object.assign(c,{isJapanese:true,escapeHtml:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'),removeMainPath:(xs,p)=>xs.filter(x=>x!==p),categoryPlainName:()=>data.categoryName,QdmAdminLayout:c.window.QdmAdminLayout,state:{siteSettings:JSON.parse(fs.readFileSync('data/site-settings.json','utf8'))}});vm.runInContext(fn,c);
let html=c.buildDetailHtml(data,base+'/main.png',[base+'/equipment.jpg']);html=html.replace(`src="/${base}/equipment.jpg" alt="${data.title}"`,`src="/${base}/equipment.jpg" alt="現場で稼働中のローラープレスのローラーと駆動部"`);
const dataFile='data/ja/portfolios.json',old=fs.readFileSync(dataFile,'utf8'),posts=JSON.parse(old);
const koFile=koBase+'/portfolio.html',koOld=fs.readFileSync(koFile,'utf8');
const backup='tmp/roller-press-portfolio-backup';fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(backup+'/ja-portfolios-before-add.json',old);fs.writeFileSync(backup+'/ko-portfolio-before-alternate.html',koOld);
fs.mkdirSync(base,{recursive:true});for(const name of ['main.png','equipment.jpg'])fs.copyFileSync(koBase+'/'+name,base+'/'+name);fs.writeFileSync(base+'/portfolio.html',html);
const entry={category:data.category,categoryName:data.categoryName,title:data.title,summary:data.summary,image:base+'/main.png',url:base+'/portfolio.html',published:true,order:Math.max(...posts.map(p=>Number(p.order)||0))+1,tags:data.tags};posts.unshift(entry);fs.writeFileSync(dataFile,JSON.stringify(posts,null,2)+'\n');
const koUpdated=koOld.replace(/(<link rel="alternate" hreflang="ko"[^>]+>)/,`$1\n  <link rel="alternate" hreflang="ja" href="https://qdm.co.kr/${base}/portfolio.html">`);assert.notEqual(koUpdated,koOld);fs.writeFileSync(koFile,koUpdated);
assert.deepEqual(posts.slice(1),JSON.parse(old));assert(html.includes('<html lang="ja">'));assert(!/[가-힣]/.test(html));
for(const m of html.matchAll(/(?:src="|href="|url\(')(\/(?:ja\/)?assets\/[^"')?]+)/g))assert(fs.existsSync(m[1].slice(1)),m[1]);
for(const name of ['main.png','equipment.jpg'])assert(fs.readFileSync(koBase+'/'+name).equals(fs.readFileSync(base+'/'+name)));
assert(html.includes(`hreflang="ko" href="https://qdm.co.kr/${koBase}/portfolio.html"`));
console.log(JSON.stringify({title:entry.title,order:entry.order,page:entry.url,verified:'Existing records preserved; localized content, independent images, asset paths and reciprocal language links verified.'},null,2));
