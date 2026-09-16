const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const backup='tmp/portfolio-duplicate-image-backup-'+Date.now();fs.mkdirSync(backup,{recursive:true});
const adminPath='local-admin/portfolio-admin.html';let admin=fs.readFileSync(adminPath,'utf8');fs.writeFileSync(backup+'/portfolio-admin.html',admin);
const helper=`    async function uniqueImagePaths(paths) {
      const seen = new Set();
      const result = [];
      for (const path of [...new Set(paths)]) {
        const file = await readBlob(path);
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        if (seen.has(hash)) continue;
        seen.add(hash);
        result.push(path);
      }
      return result;
    }

`;
assert(!admin.includes('function uniqueImagePaths('));admin=admin.replace('    function buildDetailHtml(',helper+'    function buildDetailHtml(');
const before='const html = buildDetailHtml(data, mainPath, galleryPaths);';assert(admin.includes(before));admin=admin.replace(before,'const html = buildDetailHtml(data, mainPath, await uniqueImagePaths(galleryPaths));');
for(const m of admin.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(m[1]);fs.writeFileSync(adminPath,admin);
for(const lang of ['', 'ja/']){
 const page=lang+'assets/portfolio/mechanical/roller-press-reverse-engineering-20260916/portfolio.html';const original=fs.readFileSync(page,'utf8');fs.writeFileSync(backup+'/'+(lang?'ja':'ko')+'-portfolio.html',original);
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p.replace(/^\//,''))).digest('hex');
 const main=original.match(/class="detail-img"[^>]*url\('([^']+)'/)[1];const seen=new Set([hash(main)]);let removed=[];
 const updated=original.replace(/(<div class="gallery">)([\s\S]*?)(<\/div>)/,(all,open,body,close)=>open+body.replace(/<img\b[^>]*>/g,tag=>{const src=tag.match(/src="([^"]+)"/)[1],h=hash(src);if(seen.has(h)){removed.push(src);return '';}seen.add(h);return tag;})+close);
 fs.writeFileSync(page,updated);assert.equal(original.replace(/<div class="gallery">[\s\S]*?<\/div>/,''),updated.replace(/<div class="gallery">[\s\S]*?<\/div>/,''));console.log((lang?'JA':'KO')+' duplicate display removed: '+removed.join(', '));
}
(async()=>{const blobs={main:new Blob(['model']),renamedMain:new Blob(['model']),equipment:new Blob(['photo']),a11:new Blob(['photo']),other:new Blob(['different'])};const c={crypto:crypto.webcrypto,readBlob:async p=>blobs[p]};vm.createContext(c);vm.runInContext(helper,c);const result=await c.uniqueImagePaths(['main','equipment','renamedMain','a11','other','other']);assert.deepEqual(Array.from(result),['main','equipment','other']);console.log('Content duplicate regression test and admin syntax passed; all unrelated page content preserved.');})().catch(e=>{console.error(e);process.exitCode=1});
