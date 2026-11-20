const fs=require('node:fs');
for(const file of ['local-admin/blog-admin.html','local-admin/ja-blog-admin.html']){
  let html=fs.readFileSync(file,'utf8');
  html=html.replace('<button class="btn" id="addSectionBtn"','<button class="btn add-section" id="addSectionBtn"');
  html=html.replace('  </style>', '    .btn.add-section{background:#e6efff;border-color:#91b4e6;color:#06306f;box-shadow:0 2px 5px rgba(6,48,111,.08)}.btn.add-section:hover{background:#d6e6ff;border-color:#5e94d4}.btn.add-section:focus-visible{outline:3px solid #91b4e6;outline-offset:2px}input::placeholder,textarea::placeholder{color:#8491a3;font-weight:400;opacity:1}\n  </style>');
  html=html.replace(/imageAlt:"[^"]*",caption:"",_file:null/, 'imageAlt:"",caption:"",_file:null');
  html=html.replace('$("tags").value=defaultTags;$("summary").value=defaultSummary;$("metaDescription").value=defaultMeta;', '$("tags").value="";$("tags").placeholder=defaultTags;$("summary").value="";$("summary").placeholder=defaultSummary||$("summary").placeholder;$("metaDescription").value="";$("metaDescription").placeholder=defaultMeta||$("metaDescription").placeholder;');
  if(file==='local-admin/blog-admin.html')html=html.replace('placeholder="일본 검색 결과에 표시할 80~120자 정도의 설명"','placeholder="검색 결과에 사용할 글의 핵심 요약 (최대 180자)"');
  fs.writeFileSync(file,html,'utf8');
}
console.log('한국어·일본어 작성기: 예시를 placeholder로 변경, 문단 추가 버튼 강조');
