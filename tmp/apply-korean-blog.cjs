const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const backup=path.join(root,'tmp','korean-blog-backup-20261120');
const files=['local-admin/blog-admin.html','local-admin/admin-layout.js','local-admin/admin-shared.js','local-admin/index.html','local-admin/README.md','assets/site.js','assets/language.js','data/blog-posts.json','sitemap.xml',...walk(root).filter(p=>p.endsWith('.html')&&!p.startsWith('local-admin/')&&!p.startsWith('tmp/')&&!p.includes('.backup-'))];
function walk(dir,base=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['tmp','local-admin','.git','node_modules'].includes(e.name)?[]:walk(path.join(dir,e.name),base+e.name+'/')):[base+e.name]);}
for(const p of new Set(files)){const target=path.join(backup,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,p),target);}
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s,'utf8');
let admin=read('local-admin/ja-blog-admin.html');
const replacements=[['일본어','한국어'],['日本語','한국어'],['日文','한국어'],['ja/blog','blog'],['data/ja/','data/'],['"ja"','"ko"'],['lang="ja"','lang="ko"'],['hreflang="ja"','hreflang="ko"'],['技術ブログ','기술블로그'],['関連実績','관련 포트폴리오'],['製品・機械設計','제품·기계설계'],['構造解析','구조해석'],['プレス部品の薄板成形解析','박판성형해석'],['プレス金型設計','프레스금형설계'],['リバースエンジニアリング','역설계'],['技術情報','기술정보'],['プレス金型','프레스금형'],['プレス部品','프레스부품'],['薄板成形解析','박판성형해석'],['プレス成形解析','프레스성형해석'],['成形解析','성형해석']];
for(const [a,b]of replacements)admin=admin.replaceAll(a,b);
admin=admin.replace('href="blog-admin.html">한국어 블로그','href="ja-blog-admin.html">일본어 블로그').replace('href="../blog.html" target="_blank">한국어 블로그 보기','href="../blog.html" target="_blank" rel="noopener">한국어 블로그 보기');
admin=admin.replace(/const defaultSummary=.*?;/,'const defaultSummary="";').replace(/const defaultMeta=.*?;/,'const defaultMeta="";');
admin=admin.replaceAll('프레스금형설계で確認すべきポイント','프레스금형 설계 시 확인할 사항').replaceAll('解析で確認するポイント','해석에서 확인할 사항').replaceAll('프레스금형설계・박판성형해석の技術資料','프레스금형설계·박판성형해석 기술자료').replaceAll('한국어 검색 결과에 표시할 80~120자 정도의 설명','검색 결과에 표시할 게시물 요약 설명').replaceAll('프레스금형설계・프레스부품の박판성형해석','프레스금형설계·박판성형해석');
admin=admin.replace('<link rel="stylesheet" href="/assets/ja.css">\\n','').replace('href="/ja/">Home','href="/">홈');
admin=admin.replace('    <div class="grid three">','    <label id="externalLinkField" hidden>네이버 블로그 주소<input id="externalUrl" type="url" placeholder="https://blog.naver.com/..."><span class="hint">기존 외부 자료는 링크 카드로 유지됩니다. 본문은 네이버에서 열립니다.</span></label>\n    <div class="grid three">');
admin=admin.replace('function autoMetaDescription(){', 'function autoMetaDescription(){/* Korean summary */$("metaDescription").value=($("summary").value.trim()||$("title").value.trim()).slice(0,180);updateMetaCount();}\n  function unusedJapaneseMetaDescription(){');
admin=admin.replace(/  function unusedJapaneseMetaDescription\(\)\{.*?\}\r?\n/,'');
admin=admin.replace('function updatePath(){','function isExternal(post){return /^https?:\\/\\//i.test(post?.url||"");}\n  function configureEditor(external){$("externalLinkField").hidden=!external;$("externalUrl").required=external;$("slug").required=!external;$("slug").closest("label").hidden=external;document.querySelector(".detail-fields").hidden=external;$("addSectionBtn").hidden=external;$("saveBtn").textContent=external?"링크 자료 저장":"HTML 생성 / 저장";}\n  function updatePath(){');
admin=admin.replace('state.selected=-1;state.mainFile=null;state.autoFolder=true;', 'configureEditor(false);state.selected=-1;state.mainFile=null;state.autoFolder=true;');
admin=admin.replace('const post=state.posts[index];state.selected=index;', 'const post=state.posts[index];configureEditor(isExternal(post));$("externalUrl").value=isExternal(post)?post.url:"";state.selected=index;');
admin=admin.replace('`url("..${post.image}")`','`url("/${String(post.image).replace(/^\\/+/,"")}")`');
admin=admin.replace('${escapeHtml(post.publishedAt||"")} ·', '${isExternal(post)?"네이버 블로그":escapeHtml(post.publishedAt||"")} ·');
admin=admin.replace('event.preventDefault();const data=formData();', 'event.preventDefault();const data=formData();if(state.selected>=0&&isExternal(state.posts[state.selected])){await saveExternal(data);return;}');
admin=admin.replace('  async function deletePost(){', `  async function saveExternal(data){
    const previous=state.posts[state.selected],url=$("externalUrl").value.trim();
    let parsed;try{parsed=new URL(url);}catch{throw new Error("올바른 네이버 블로그 주소를 입력하세요.");}
    if(parsed.protocol!=="https:"||!['blog.naver.com','m.blog.naver.com'].includes(parsed.hostname))throw new Error("https://blog.naver.com 또는 https://m.blog.naver.com 주소를 입력하세요.");
    await backupOnce();let image=previous.image;
    if(state.mainFile){image=\`/assets/blog/naver-\${state.selected}-\${safeName(state.mainFile.name)}\`;await writeBlob(image.slice(1),state.mainFile);}
    state.posts[state.selected]={...previous,...data,slug:undefined,type:"external",url,image,description:data.summary};
    await writeBlob("data/blog-posts.json",new Blob([JSON.stringify(state.posts,null,2)+"\\n"],{type:"application/json;charset=utf-8"}));await updateSitemap();selectPost(state.selected);setStatus("네이버 링크 자료 저장 완료","good");
  }
  async function deletePost(){`);
admin=admin.replace('await backupOnce();let blogDir=state.root;blogDir=await getDir(blogDir,"ja");blogDir=await getDir(blogDir,"blog");await blogDir.removeEntry(post.slug,{recursive:true});', 'await backupOnce();if(!isExternal(post)){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))throw new Error("삭제할 게시물 폴더명이 올바르지 않습니다.");let blogDir=await getDir(state.root,"blog");await blogDir.removeEntry(post.slug,{recursive:true});}');
// Only local article URLs belong in the sitemap.
admin=admin.replace('state.posts.filter(post=>post.published!==false);const rows=', 'state.posts.filter(post=>post.published!==false&&!isExternal(post));const rows=');
// Hidden articles remain editable locally, but their public HTML is removed.
admin=admin.replace('await writeBlob(`${base}/index.html`,new Blob([buildHtml(post)],{type:"text/html;charset=utf-8"}));', 'if(post.published){await writeBlob(`${base}/index.html`,new Blob([buildHtml(post)],{type:"text/html;charset=utf-8"}));}else{const dir=await getDir(state.root,"blog",true);const articleDir=await getDir(dir,data.slug,true);try{await articleDir.removeEntry("index.html");}catch(error){if(error.name!=="NotFoundError")throw error;}}');
admin=admin.replace('const base=`blog/${data.slug}`;','const base=`blog/${data.slug}`;');
// Language switching on unrelated articles should lead to the other language's list.
admin=admin.replace('<link rel="alternate" hreflang="ko" href="${canonical}">', '<link rel="alternate" hreflang="ko" href="${canonical}">');
write('local-admin/blog-admin.html',admin);
let list=read('ja/blog.html').replaceAll('lang="ja"','lang="ko"').replaceAll('https://qdm.co.kr/ja/blog.html','https://qdm.co.kr/blog.html').replace('hreflang="ja"','hreflang="ko"').replaceAll('技術ブログ','기술블로그').replaceAll('製品設計、構造解析、薄板成形解析、プレス金型設計に関するQDMの技術情報と実務事例をご紹介します。','제품설계, 구조해석, 박판성형해석, 프레스금형설계에 관한 QDM의 기술자료와 실무 사례를 소개합니다.').replaceAll('設計・解析・プレス金型設計の実務に役立つ技術情報をご紹介します。','설계·해석·프레스금형설계 실무에 도움이 되는 기술자료를 소개합니다.').replaceAll('製品設計、構造解析、薄板成形解析、プレス金型設計に関する実務経験と技術情報をご紹介します。','QDM의 설계·해석 실무 경험과 기술자료를 소개합니다. 기존 네이버 블로그 자료도 함께 확인하실 수 있습니다.').replace('記事を読み込んでいます。','기술자료를 불러오고 있습니다.').replace(/  <link rel="stylesheet" href="\/assets\/ja.css[^\n]+\n/,'').replace('site.js?v=20260806-4','site.js?v=20261120-1');
list=list.replace('</head>','  <link rel="alternate" hreflang="ja" href="https://qdm.co.kr/ja/blog.html">\n</head>');
write('blog.html',list);
const categories={'기계설계':['mechanical','제품·기계설계'],'구조해석':['analysis','구조해석'],'프레스 금형':['press-die','프레스금형설계'],'역설계':['reverse','역설계']};
write('data/blog-posts.json',JSON.stringify(JSON.parse(read('data/blog-posts.json')).map((p,i)=>({...p,type:'external',category:categories[p.category][0],categoryLabel:categories[p.category][1],summary:p.description,published:true,featured:true,order:i})),null,2)+'\n');
let layout=read('local-admin/admin-layout.js').replace('`${home}#blog`','"/blog.html"').replace('language: "20260922-1"','language: "20261120-1"');
// Preserve the existing Korean product quotation menu when synchronizing.
layout=layout.replace('<a class="resource-primary resource-burring" role="menuitem" href="/resources/press-process-calculators/">','<a class="resource-primary resource-product" role="menuitem" href="/resources/press-product-quotation/">프레스 제품 견적서 작성기</a><a class="resource-primary resource-burring" role="menuitem" href="/resources/press-process-calculators/">');
write('local-admin/admin-layout.js',layout);
let language=read('assets/language.js').replace('"/ja/blog.html" : "/#blog"','"/ja/blog.html" : "/blog.html"');
language=language.replace('const koreanPath =','const articlePage = /^\\/(?:ja\\/)?blog\\//.test(path);\n  const koreanPath =').replace('alternateUrl("ko") || fallbackKoreanPath','alternateUrl("ko") || (articlePage ? "/blog.html" : fallbackKoreanPath)').replace('alternateUrl("ja") || fallbackJapanesePath','alternateUrl("ja") || (articlePage ? "/ja/blog.html" : fallbackJapanesePath)');
write('assets/language.js',language);
let site=read('assets/site.js').replace("${qdmJapanese?'記事を読む →':'글 보기 →'}", "${qdmJapanese?'記事を読む →':external?'네이버 블로그에서 읽기':'글 보기 →'}");
site=site.replace('${date?`<time', '${!qdmJapanese&&external?\'<span class="blog-source">네이버 블로그</span>\':\'\'}${date?`<time');
site=site.replace('fetch(`${qdmDataBase}/blog-posts.json`)','fetch(`${qdmDataBase}/blog-posts.json`,{cache:\'no-store\'})');
// Portfolio filter events must not interfere with blog category tabs.
site=site.replaceAll("document.querySelectorAll('.tab')","document.querySelectorAll('#portfolioTabs .tab')");
write('assets/site.js',site);
let home=read('index.html').replace('기술자료는 네이버 블로그에서 관리합니다. 아래 글을 클릭하면 QDM 기술블로그로 이동합니다.','설계·해석 실무에 도움이 되는 QDM 기술자료입니다. 직접 작성한 글과 기존 네이버 블로그 자료를 함께 제공합니다.').replace('</p></div></div><div class="blog-grid"','</p><a class="more" href="/blog.html">전체 기술블로그 보기</a></div></div><div class="blog-grid"');
write('index.html',home);
write('local-admin/index.html',read('local-admin/index.html').replace('<h2>블로그 수정</h2>','<h2>한국어 기술블로그 수정</h2>').replace('최신 기술자료 카드의 이미지, 제목, 설명, 네이버 블로그 링크를 수정합니다.','한국어 기술글의 본문과 이미지를 작성하고 기존 네이버 링크 자료도 관리합니다.'));
write('local-admin/admin-shared.js',read('local-admin/admin-shared.js').replace('label: "블로그 수정"','label: "한국어 기술블로그 수정"'));
write('sitemap.xml',read('sitemap.xml').replace('</urlset>','  <url><loc>https://qdm.co.kr/blog.html</loc><xhtml:link rel="alternate" hreflang="ko" href="https://qdm.co.kr/blog.html"/><xhtml:link rel="alternate" hreflang="ja" href="https://qdm.co.kr/ja/blog.html"/><lastmod>2026-11-20</lastmod></url>\n</urlset>'));
// Refresh shared code on every public page which includes it.
for(const p of walk(root).filter(p=>p.endsWith('.html')&&!p.includes('.backup-'))){let html=read(p);html=html.replace(/(\/assets\/site\.js)(?:\?[^"']*)?/g,'$1?v=20261120-1');write(p,html);}
write('local-admin/README.md',read('local-admin/README.md').replace('최신 기술자료 카드 이미지와 링크 수정','한국어 기술블로그 본문·이미지 작성 및 기존 네이버 링크 자료 수정').replace('한국어 블로그 관리 화면에서는 네이버 블로그 카드와 외부 링크를 관리합니다.','한국어 블로그 관리 화면에서는 자체 게시물을 작성하고 기존 네이버 블로그 링크 자료를 함께 관리합니다. 자체 글은 `/blog/[slug]/`, 전체 목록은 `/blog.html`에 표시됩니다. 기존 네이버 링크는 외부 자료로 유지되며 새 창에서 열립니다. 공개 및 메인 노출 여부를 각각 설정할 수 있습니다. 저장 후 변경된 공개 파일과 JSON, 사이트맵을 배포해야 실제 홈페이지에 반영됩니다.'));
console.log('한국어 블로그 적용 완료. 원본 백업:',backup);
