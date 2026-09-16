const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const adminFile='local-admin/ja-blog-admin.html',postFile='ja/blog/press-die-design-20260916/index.html',dataFile='data/ja/blog-posts.json';
const backup='tmp/blog-calculator-link-backup';fs.mkdirSync(backup,{recursive:true});for(const [file,name] of [[adminFile,'admin.html'],[postFile,'article.html'],[dataFile,'posts.json']])fs.copyFileSync(file,backup+'/'+name);
let admin=fs.readFileSync(adminFile,'utf8');
const helper=`  function inlineBodyHtml(value){
    const text=String(value||"");
    const pattern=/\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s<>"()]+)\\)/g;
    let result="",cursor=0;
    for(const match of text.matchAll(pattern)){
      result+=escapeHtml(text.slice(cursor,match.index));
      result+=\`<a href="\${escapeHtml(match[2])}">\${escapeHtml(match[1])}</a>\`;
      cursor=match.index+match[0].length;
    }
    return (result+escapeHtml(text.slice(cursor))).replaceAll("\\n","<br>");
  }
`;
assert(!admin.includes('function inlineBodyHtml'));admin=admin.replace('  function paragraphHtml(value){',helper+'  function paragraphHtml(value){');
const old='${escapeHtml(item).replaceAll("\\n","<br>")}';assert(admin.includes(old));admin=admin.replace(old,'${inlineBodyHtml(item)}');
admin=admin.replace('글의 문단과 문단 사이는 빈 줄로 구분합니다.','글의 문단과 문단 사이는 빈 줄로 구분합니다. 링크는 [표시 문구](https://주소) 형식으로 입력합니다.');
for(const m of admin.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(m[1]);
const escapeHtml=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');const c={escapeHtml};vm.createContext(c);vm.runInContext(helper+'\n'+admin.match(/  function paragraphHtml\(value\)\{[^\n]+/)[0],c);
const url='https://qdm.co.kr/resources/press-process-calculators/';const link='[バーリング寸法計算ツールを開く →]('+url+')';
assert.equal(c.inlineBodyHtml('[unsafe](javascript:alert(1))'),'[unsafe](javascript:alert(1))');assert(!c.inlineBodyHtml('<script>alert(1)</script>').includes('<script>'));assert(c.inlineBodyHtml(link).includes('href="'+url+'"'));assert.equal(c.paragraphHtml('one\ntwo\n\nthree'),'<p>one<br>two</p><p>three</p>');
const posts=JSON.parse(fs.readFileSync(dataFile,'utf8'));const post=posts.find(p=>p.slug==='press-die-design-20260916');assert(post);const section=post.sections.find(s=>s.heading==='QDMバーリング寸法計算ツール');assert(section);const oldBody=c.paragraphHtml(section.body);section.body+='\n\n'+link;const newBody=c.paragraphHtml(section.body);
let html=fs.readFileSync(postFile,'utf8');assert(html.includes(oldBody));html=html.replace(oldBody,newBody);assert(html.includes(newBody));
fs.writeFileSync(adminFile,admin);fs.writeFileSync(postFile,html);fs.writeFileSync(dataFile,JSON.stringify(posts,null,2)+'\n');
console.log('Link inserted below calculator introduction. Stored body and rendered HTML match; link rendering, plain text formatting, HTML escaping and unsafe URL rejection verified.');
