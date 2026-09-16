const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const slug='roller-press-reverse-engineering-20260916';
const base=`assets/portfolio/mechanical/${slug}`;
assert(!fs.existsSync(base),'Portfolio already exists');
const data={category:'mechanical',categoryName:'기계·기구설계',slug,title:'롤러 프레스 역설계 및 상세 부품도 복원',subtitle:'기존 조립도와 현물을 대조하고, 3D 가상 조립으로 검증하는 설계 복원',summary:'상세 부품도가 분실된 롤러 프레스의 기존 조립도와 현물을 교차 검증하고, 부품별 3D 모델링과 가상 조립을 통해 2D 설계도면을 복원하는 프로젝트입니다.',overview:'롤러 프레스(ROLLER PRESS)는 프레스금형에서 성형이 완료된 제품을 롤러 사이로 통과시켜 압착하고, 치수의 평탄화와 균일화를 수행하는 후가공 설비입니다. 제품에 필요한 후가공 공정을 담당하며, 프레스 불량을 보정하기 위한 용도의 설비가 아닙니다. 본 프로젝트의 대상은 과거에 설계·제작되어 실제 현장에서 사용 중인 장비로, 오래된 조립도만 남아 있고 상세 부품도는 분실된 상태였습니다. 남아 있는 조립도를 해석하고 현물과 교차 검증하면서, 부품별 3D 모델링과 가상 조립을 거쳐 확인된 내용을 2D 설계도면으로 복원하는 방식으로 접근합니다.',tags:['롤러프레스','역설계','3D모델링','도면복원'],tasks:[
'기존 조립도 해석: 부품의 배치와 결합 관계, 롤러 및 구동부의 구조를 파악하고 조립도만으로 확인하기 어려운 부분을 구분합니다.',
'도면 표현 방식 확인: 제도 규격과는 별개로 원 설계자의 객체 색상, 레이어, 선종 및 숨은 부품의 표시 방식을 해석합니다. 화면상 실선으로 표시된 부분도 실제로 보이는 윤곽인지 다른 부품 뒤의 형상인지 구분하며 조립 관계를 읽어냅니다.',
'현물 교차 검증: 도면에서 해석한 구조를 사용 중인 실제 장비와 대조하여 부품 형상과 배치, 결합 관계를 확인하고 누락되거나 불명확한 정보를 보완합니다.',
'부품별 3D 모델링: 조립도와 현물에서 확인한 정보를 바탕으로 부품을 하나씩 모델링하고, 2D 도면만으로 파악하기 어려운 형상과 위치 관계를 입체적으로 검토합니다.',
'3D 가상 조립 및 검증: 모델링한 부품을 가상으로 조립하여 부품 간 결합 관계와 간섭 여부를 검토하고, 기존 조립도 및 현물과의 일치 여부를 확인합니다.',
'2D 상세 부품도 복원: 가상 조립과 현물 대조로 검증된 부품부터 2D 설계도면을 작성하여, 조립도만으로는 부족했던 상세 설계 정보를 단계적으로 복원합니다.'
]};
const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('local-admin/admin-layout.js','utf8'),c);
const source=fs.readFileSync('local-admin/portfolio-admin.html','utf8');const start=source.indexOf('    function buildDetailHtml(');const fn=source.slice(start,source.indexOf('\n    }',start)+6);
Object.assign(c,{isJapanese:false,escapeHtml:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'),removeMainPath:(xs,p)=>xs.filter(x=>x!==p),categoryPlainName:()=>data.categoryName,QdmAdminLayout:c.window.QdmAdminLayout,state:{siteSettings:JSON.parse(fs.readFileSync('data/site-settings.json','utf8'))}});
vm.runInContext(fn,c);
let html=c.buildDetailHtml(data,base+'/main.png',[base+'/equipment.jpg']);
html=html.replace(/^.*hreflang="ja".*\r?\n/m,'');
html=html.replace(`src="/${base}/equipment.jpg" alt="${data.title}"`,`src="/${base}/equipment.jpg" alt="현장에서 사용 중인 롤러 프레스의 롤러와 구동부"`);
const file='data/portfolios.json',old=fs.readFileSync(file,'utf8'),posts=JSON.parse(old);
const backup='tmp/roller-press-portfolio-backup';fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(backup+'/portfolios.json',old);
fs.mkdirSync(base,{recursive:true});fs.copyFileSync('D:/down/01 QDM_홈페이지/자료 5/033.png',base+'/main.png');fs.copyFileSync('W:/32_QDM/22_태승하이테크/260820 검토/A11.jpg',base+'/equipment.jpg');fs.writeFileSync(base+'/portfolio.html',html);
const entry={category:data.category,categoryName:data.categoryName,title:data.title,summary:data.summary,image:base+'/main.png',url:base+'/portfolio.html',published:true,order:Math.max(...posts.map(p=>Number(p.order)||0))+1,tags:data.tags};
posts.unshift(entry);fs.writeFileSync(file,JSON.stringify(posts,null,2)+'\n');
assert.equal(posts.length,JSON.parse(old).length+1);assert.deepEqual(posts.slice(1),JSON.parse(old));
for(const m of html.matchAll(/(?:src="|href="|url\(')(\/assets\/[^"')?]+)/g)){assert(fs.existsSync(m[1].slice(1)),m[1]);}
assert(html.includes('불량을 보정하기 위한 용도의 설비가 아닙니다'));assert(!html.includes('hreflang="ja"'));
console.log(JSON.stringify({title:entry.title,category:entry.categoryName,order:entry.order,page:entry.url,checks:'Existing entries unchanged; images, styles and scripts exist; content and links verified'},null,2));
