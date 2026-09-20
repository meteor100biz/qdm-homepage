const fs=require('fs');
fs.writeFileSync('local-admin/analytics.html','<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=index.html"><title>QDM 유입 분석</title></head><body><a href="index.html">유입 분석 열기</a></body></html>');
(async()=>{
for(const url of ['/api/analytics?days=7&language=all','/api/analytics/keywords?days=7','/api/analytics?days=90','/data/search-console.json','/.qdm-admin-key-fmspibozhdygdvquivmp','/inquiries.html']){
const r=await fetch('http://127.0.0.1:5191'+url);console.log(url,r.status,url.startsWith('/api/analytics')?await r.text():'');}
})();
