const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('local-admin/portfolio-admin.html','utf8');
function fn(name){const start=html.indexOf(`    ${name==='saveFull'?'async ':''}function ${name}(`);return html.slice(start,html.indexOf('\n    }',start)+6);}
(async()=>{for(const ja of [false,true])for(const editing of [false,true]){
const oldBase='assets/portfolio/press-die/example',pageBase=(ja?'ja/':'')+oldBase;
const original={title:'A',category:'press-die',image:oldBase+'/main.png',url:pageBase+'/portfolio.html',order:1};
const other={title:'B',image:'assets/other/main.png',url:'assets/other/portfolio.html',order:2};
const files=new Map([[oldBase+'/main.png','ORIGINAL MAIN'],[oldBase+'/detail.png','ORIGINAL DETAIL'],['assets/other/main.png','OTHER MAIN']]);
const state={rootHandle:{},selectedIndex:editing?0:-1,portfolios:editing?[{...original},{...other}]:[{...other}],mainImageFile:editing?null:{name:'new.png'},existingGalleryPaths:editing?[oldBase+'/detail.png']:[],galleryFiles:[]};
const c={state,isJapanese:ja,categories:[{id:'press-die'}],formValue:()=>({title:'A',category:'press-die',slug:'example',summary:'summary',order:3}),normalizeAssetPath:p=>p.replace(/^\//,''),inferSlug:()=>'',pathExists:async()=>false,extensionOf:()=>'.png',writeBlob:async(p,b)=>files.set(p,b),readBlob:async p=>{assert(files.has(p));return files.get(p)},removeMainPath:(ps,p)=>ps.filter(x=>x!==p),galleryPathMismatches:(ps,b)=>ps.filter(p=>!p.startsWith(b+'/')),buildDetailHtml:()=>'',saveJson:async()=>{},renderAll:()=>{},selectPortfolio:async()=>{},setStatus:msg=>{assert(msg.startsWith('저장 완료'),msg)},Blob,dataPath:'data/portfolios.json'};
vm.createContext(c);vm.runInContext(fn('upsertPortfolio')+'\n'+fn('saveFull'),c);await c.saveFull({preventDefault(){}});
assert.equal(state.portfolios[state.selectedIndex].title,'A');assert.equal(state.portfolios[state.selectedIndex].image,pageBase+'/main.png');assert.equal(state.portfolios.find(p=>p.title==='B').image,other.image);assert.equal(files.get('assets/other/main.png'),'OTHER MAIN');
if(editing){assert.equal(files.get(pageBase+'/main.png'),'ORIGINAL MAIN');assert.equal(files.get(pageBase+'/detail.png'),'ORIGINAL DETAIL');}
if(ja)assert.equal(files.get(oldBase+'/main.png'),'ORIGINAL MAIN');
console.log(`${ja?'JA':'KO'} ${editing?'edit/reorder':'create'} passed`);
}})().catch(e=>{console.error(e);process.exit(1)});
