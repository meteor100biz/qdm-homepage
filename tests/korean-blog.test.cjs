const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const legacyPosts=JSON.parse(read('data/blog-posts.json')).filter(post=>post.type==='external');
function editor(editorFile='local-admin/blog-admin.html'){
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,style:{},files:[],addEventListener(){},reset(){},closest(){return{};},querySelectorAll(){return[];}});return elements.get(id);};
  const files=new Map([['data/blog-posts.json',JSON.stringify(legacyPosts)],['data/portfolios.json',read('data/portfolios.json')],['data/site-settings.json',read('data/site-settings.json')],['sitemap.xml',read('sitemap.xml')]]);
  const removals=[];
  const directory=(prefix='')=>({async getDirectoryHandle(name){return directory(prefix+name+'/');},async getFileHandle(name){const p=prefix+name;return{async getFile(){if(!files.has(p))throw new Error('missing '+p);return{text:async()=>files.get(p)};},async createWritable(){return{async write(blob){files.set(p,await blob.text());},async close(){}};}};},async removeEntry(name,{recursive}={}){const p=prefix+name;removals.push(p);for(const key of files.keys())if(key===p||(recursive&&key.startsWith(p+'/')))files.delete(key);}});
  const context=vm.createContext({document:{getElementById:get,querySelector:()=>({}),querySelectorAll:()=>[]},QdmAdminStorage:{loadSavedRoot:async()=>null},Blob,URL,console,confirm:()=>true});
  vm.runInContext(read('local-admin/admin-layout.js'),context);
  const scripts=[...read(editorFile).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  vm.runInContext(scripts.at(-1)[1],context);
  context.rootHandle=directory();
  const run=code=>vm.runInContext(code,context);
  return{run,get,files,removals,async load(){await run('useRoot(rootHandle)');}};
}
for(const file of ['local-admin/blog-admin.html','local-admin/ja-blog-admin.html']){
  test(`${file}: examples are not input values, saved content remains editable`,()=>{
    const e=editor(file);
    for(const id of ['tags','summary','metaDescription'])assert.equal(e.get(id).value,'');
    assert.ok(e.get('tags').placeholder.length>0);
    assert.equal(e.run('blankSection().imageAlt'),'');
    assert.equal(e.run('JSON.stringify(formData().tags)'),'[]');
    e.run('state.posts=[{title:"Saved title",slug:"saved-post",url:"/blog/saved-post/",summary:"Saved summary",tags:["Saved tag"],metaDescription:"Saved description",sections:[{...blankSection(),imageAlt:"Saved image description"}]}];selectPost(0)');
    assert.equal(e.get('summary').value,'Saved summary');
    assert.equal(e.get('tags').value,'Saved tag');
    assert.equal(e.get('metaDescription').value,'Saved description');
    assert.equal(e.run('state.sections[0].imageAlt'),'Saved image description');
    e.run('clearForm()');
    assert.equal(e.get('summary').value,'');assert.equal(e.run('state.sections[0].imageAlt'),'');
  });
}
test('existing Naver links and images remain unchanged',()=>{
  const original=[
    {title:'기계설계 기술자료',url:'https://blog.naver.com/meteor_822/223829402349',image:'assets/service-design.jpg',description:'기구설계, CAD 설계, 제작성을 고려한 설계 사례'},
    {title:'구조해석·기구해석 사례',url:'https://blog.naver.com/meteor_822/224201514103',image:'assets/service-analysis.jpg',description:'응력, 변형, 하중조건 검토 및 설계 개선 자료'},
    {title:'프레스 금형설계 기술자료',url:'https://blog.naver.com/meteor_822/223631728621',image:'assets/service-press-die.jpg',description:'금형 구조 설계, 성형성 검토, 양산성 관련 자료'},
    {title:'역설계 및 CAD 대행',url:'https://blog.naver.com/meteor_822/224200351959',image:'assets/service-reverse.jpg',description:'실물, 사진, 스케치 기반 3D 모델링 및 도면화 자료'}
  ];
  const posts=legacyPosts;
  assert.equal(posts.length,4);
  posts.forEach(p=>{const previous=original.find(item=>item.url===p.url);assert.ok(previous);for(const key of ['title','url','image','description'])assert.equal(p[key],previous[key]);assert.equal(p.type,'external');});
});
test('article create, update, unpublish, republish and delete preserve Naver and Japanese data',async()=>{
  const e=editor();await e.load();
  const japaneseRows=e.files.get('sitemap.xml').match(/<url>\s*<loc>https:\/\/qdm\.co\.kr\/ja\/[\s\S]*?<\/url>/g);
  e.get('title').value='설계 <기술> 사례';e.get('summary').value='한국어 요약';e.get('slug').value='test-korean-blog';
  e.run('state.mainFile=new Blob(["image"]);state.mainFile.name="main.png";state.sections=[{...blankSection(),heading:"검토 사항",body:"본문\\n\\n[계산 도구](https://qdm.co.kr/resources/press-process-calculators/)",bullets:"강도\\n변형"}];');
  await e.run('save({preventDefault(){}})');
  const html=e.files.get('blog/test-korean-blog/index.html');
  assert.match(html,/<html lang="ko">/);assert.match(html,/설계 &lt;기술&gt; 사례/);assert.match(html,/href="\/blog.html"/);assert.match(html,/<\/script>/);assert.doesNotMatch(html,/<\\\/script>/);
  assert.doesNotMatch(html,/\/assets\/ja.css|lang="ja"/);
  assert.equal(JSON.parse(e.files.get('data/blog-posts.json')).length,5);
  e.get('title').value='수정한 제목';await e.run('save({preventDefault(){}})');assert.match(e.files.get('blog/test-korean-blog/index.html'),/수정한 제목/);
  assert.equal((e.files.get('sitemap.xml').match(/<loc>https:\/\/qdm.co.kr\/blog.html<\/loc>/g)||[]).length,1);
  assert.deepEqual(e.files.get('sitemap.xml').match(/<url>\s*<loc>https:\/\/qdm\.co\.kr\/ja\/[\s\S]*?<\/url>/g),japaneseRows);
  assert.doesNotMatch(e.files.get('sitemap.xml'),/<loc>[^<]*naver/);
  e.get('published').checked=false;await e.run('save({preventDefault(){}})');assert.ok(!e.files.has('blog/test-korean-blog/index.html'));assert.doesNotMatch(e.files.get('sitemap.xml'),/\/blog\/test-korean-blog\//);
  e.get('published').checked=true;await e.run('save({preventDefault(){}})');assert.ok(e.files.has('blog/test-korean-blog/index.html'));
  await e.run('deletePost()');assert.equal(JSON.parse(e.files.get('data/blog-posts.json')).length,4);assert.ok(!e.files.has('blog/test-korean-blog/index.html'));
  assert.ok([...e.files.keys()].some(p=>p.startsWith('data/blog-posts.backup-')));
});
test('Naver edit and delete only change its metadata, never remove a folder',async()=>{
  const e=editor();await e.load();e.run('selectPost(0)');e.get('title').value='기존 링크 제목 수정';await e.run('save({preventDefault(){}})');
  const posts=JSON.parse(e.files.get('data/blog-posts.json'));assert.equal(posts[0].title,'기존 링크 제목 수정');assert.equal(posts[0].publishedAt,'');assert.match(posts[0].url,/^https:\/\/blog.naver.com\//);assert.equal(e.removals.length,0);
  await e.run('deletePost()');assert.equal(e.removals.length,0);assert.equal(JSON.parse(e.files.get('data/blog-posts.json')).length,3);
});
test('home shows four latest featured posts; archive retains all published posts',()=>{
  const home={innerHTML:'',closest:()=>({hidden:false})},list={innerHTML:''};
  const context=vm.createContext({document:{documentElement:{lang:'ko'},getElementById:id=>id==='blogGrid'?home:id==='blogList'?list:null},Intl,console});
  let source=read('assets/site.js').split('initKoreanServicePriority();')[0];
  vm.runInContext(source,context);vm.runInContext('initMobileCarousel=()=>{}',context);
  context.posts=[...legacyPosts,...Array.from({length:6},(_,i)=>({title:'자체 글 '+i,url:'/blog/post-'+i+'/',category:'mechanical',publishedAt:'2026-11-'+(10+i),image:'/image.png',featured:i!==5,published:i!==4}))];
  vm.runInContext('renderBlog(posts);renderBlogList(posts)',context);
  assert.equal((home.innerHTML.match(/class="blog-card"/g)||[]).length,4);assert.equal((list.innerHTML.match(/class="blog-card"/g)||[]).length,9);
  assert.doesNotMatch(home.innerHTML,/자체 글 5|자체 글 4/);assert.match(list.innerHTML,/자체 글 5/);assert.match(list.innerHTML,/네이버 블로그/);
});
