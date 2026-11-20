const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const target=path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));
  const relative=path.relative(root,target).replaceAll('\\','/');
  if(relative.startsWith('..')||relative.startsWith('tmp/')||relative.startsWith('.')||relative.startsWith('local-admin/')&&!/^local-admin\/(?:blog-admin\.html|ja-blog-admin\.html|admin-shared\.js|admin-layout\.js)$/.test(relative)){res.writeHead(404).end();return;}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
  fs.readFile(target,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(8765,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8765/blog.html'));
