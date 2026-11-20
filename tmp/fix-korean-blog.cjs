const fs=require('node:fs');
let p='local-admin/blog-admin.html',s=fs.readFileSync(p,'utf8');
s=s.replace('*{box-sizing:border-box}','[hidden]{display:none!important}*{box-sizing:border-box}');
s=s.replace('qdm\\.co\\.kr\\/ja\\/blog','qdm\\.co\\.kr\\/blog');
s=s.replace('await backupOnce();let blogDir=state.root;blogDir=await getDir(blogDir,"ko");blogDir=await getDir(blogDir,"blog");await blogDir.removeEntry(post.slug,{recursive:true});','await backupOnce();if(!isExternal(post)){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))throw new Error("삭제할 게시물 폴더명이 올바르지 않습니다.");let blogDir=await getDir(state.root,"blog");await blogDir.removeEntry(post.slug,{recursive:true});}');
s=s.replace('$("slug").required=!external;','$("slug").required=!external;$("publishedAt").closest("label").hidden=external;');
s=s.replace('type:"external",url,image,description:data.summary','type:"external",publishedAt:previous.publishedAt||"",url,image,description:data.summary');
s=s.replace('function updatePath(){const slug=', 'function updatePath(){if(state.selected>=0&&isExternal(state.posts[state.selected])){$("pathPreview").textContent="data/blog-posts.json (네이버 외부 링크)";return;}const slug=');
s=s.replace('공개 및 메인 노출 여부','공개 및 메인 노출 여부');
fs.writeFileSync(p,s);
// Add the matching Korean list alternate, without claiming unrelated articles are translations.
p='ja/blog.html';s=fs.readFileSync(p,'utf8').replace('</head>','  <link rel="alternate" hreflang="ko" href="https://qdm.co.kr/blog.html">\n</head>');fs.writeFileSync(p,s);
p='assets/site.js';s=fs.readFileSync(p,'utf8');
s=s.replace('function blogCard(post){','function blogEscape(value){return String(value??\'\').replaceAll(\'&\',\'&amp;\').replaceAll(\'<\',\'&lt;\').replaceAll(\'>\',\'&gt;\').replaceAll(\'"\',\'&quot;\').replaceAll("\'",\'&#39;\');}\nfunction blogCard(post){');
s=s.replace('href="${post.url}"${attrs}', 'href="${blogEscape(post.url)}"${attrs}').replace("url('${image}')\"></div><div class=\"blog-body\"", "url('${blogEscape(image.replaceAll(\"'\",\"%27\"))}')\"></div><div class=\"blog-body\"");
s=s.replace('>${label}</span>${!qdmJapanese','>${blogEscape(label)}</span>${!qdmJapanese').replace('<h3>${post.title}</h3><p>${post.summary||post.description||\'\'}</p>', '<h3>${blogEscape(post.title)}</h3><p>${blogEscape(post.summary||post.description||\'\')}</p>');
s=s.replace('data-blog-category="${key}">${label}', 'data-blog-category="${blogEscape(key)}">${blogEscape(label)}');
// Expose a meaningful loading error instead of leaving the loading message indefinitely.
s=s.replace('renderBlog(posts);renderBlogList(posts);}).catch(()=>{});', 'renderBlog(posts);renderBlogList(posts);}).catch(()=>{const list=document.getElementById(\'blogList\');if(list)list.textContent=qdmJapanese?\'記事を読み込めませんでした。再読み込みしてください。\':\'기술자료를 불러오지 못했습니다. 새로고침해 주세요.\';});');
fs.writeFileSync(p,s);
