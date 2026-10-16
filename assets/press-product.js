(async () => {
"use strict";
const $=id=>document.getElementById(id),form=$("productForm"),store="qdm.press-product-quote.v1";
const money=(n,d=0)=>Number(Object.is(n,-0)?0:n).toLocaleString("ko-KR",{maximumFractionDigits:d})+"원";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status=s=>$("saveStatus").textContent=s;
let db,result,lastData,refs={};
const safeUrl=s=>{try{const u=new URL(s);return ["https:","http:"].includes(u.protocol)?u.href:"";}catch{return "";}};
try {const response=await fetch("/data/press-product-defaults.json");if(!response.ok)throw Error();db=await response.json();}catch{status("기준 DB를 불러오지 못했습니다. 연결을 확인하고 페이지를 새로고침해 주세요.");return;}
const f=(name,label,value="",type="number",help="",attrs="")=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(type==="number"?'min="0" '+(attrs.includes('step=')?'':'step="any" ')+'':'maxlength="200" ')+attrs+'>'+ (help?'<small class="help">'+help+'</small>':'')+'</label>';
const sel=(name,label,options)=>'<label>'+label+'<select name="'+name+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'">'+esc(t)+'</option>').join("")+'</select></label>';
const check=(name,label,checked=false)=>'<label class="check-label full"><input name="'+name+'" type="checkbox" '+(checked?"checked":"")+'>'+label+'</label>';
const card=(n,title,help,content)=>'<section class="editor-card section-tone-'+n+'"><div class="card-title"><span>0'+n+'</span><div><h2>'+title+'</h2><p>'+help+'</p></div></div>'+content+'</section>';
const grid=s=>'<div class="form-grid quote-fields">'+s+'</div>';
const today=()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Seoul"});
$("productFields").innerHTML=
card(1,"작성자와 견적 정보","견적서에는 작성자가 입력한 회사 정보를 사용합니다.",grid(
f("seller","작성 회사명","","text")+f("representative","대표자","","text")+f("businessNo","사업자등록번호","","text")+f("phone","전화 / 이메일","","text")+f("address","작성 회사 주소","","text")+f("buyer","납품 회사명","","text")+f("contact","수신 담당자","","text")+f("quoteNumber","견적번호","PQ-"+today().replaceAll("-",""),"text")+f("date","견적일",today(),"date")+f("validity","유효기간","견적일로부터 30일","text")+f("product","제품명 / 품번","프레스 부품","text")+f("revision","도면 번호 / 개정","","text")+f("delivery","납기","발주 후 협의","text")+f("payment","결제 조건","별도 협의","text")))+
card(2,"전개 치수와 소재","전개 치수는 견적자가 산출해 입력합니다. 모든 치수는 mm입니다.",grid(
f("width","전개 가로 (mm)",15)+f("length","전개 세로 (mm)",50)+f("thickness","두께 (mm)",1)+sel("materialId","소재 기준 DB",db.materials.map(m=>[m.id,m.name]))+f("materialName","소재명 · 직접 수정 가능","SUS304","text")+f("temper","조질 / 표면","2B · 조질 별도 확인","text","CSP는 1/2H·3/4H·H 등 조질을 명시하세요.")+f("density","밀도 (g/cm³)",7.93,"number","소재별 근삿값입니다. 직접 입력 소재는 밀도도 확인하세요.")+f("materialPrice","원소재 단가 (원/kg)",4500))+
'<div class="basis" id="materialBasis"></div><div class="hint-actions"><button type="button" class="mini-button" id="restoreMaterial">선택 소재 기준값 적용</button></div>')+
card(3,"스트립 배치와 소재 투입량","한쪽 잔폭과 제품 사이 간격을 구분합니다. 단열 배치 기준입니다.",grid(
sel("layout","계산 방식",[["allowance","전개 치수 + 여유"],["exact","확정 소재 폭·피치 직접 입력"]])+sel("rotation","배치 방향",[["0","가로 → 폭 / 세로 → 이송"],["90","세로 → 폭 / 가로 → 이송"]])+
'<div class="full" id="allowanceFields">'+grid(f("left","좌측 잔폭 (mm)",2)+f("right","우측 잔폭 (mm)",2)+f("gap","이송 방향 제품 간격 (mm)",2))+'</div>'+
'<div class="full" id="exactFields" hidden>'+grid(f("stripWidth","실제 소재 폭 (mm)",19)+f("pitch","실제 이송 피치 (mm)",52))+'</div>')+
'<div class="hint-actions"><button type="button" class="mini-button" id="suggestAllowance">두께 기준 여유 제안 적용</button><button type="button" class="mini-button" id="rotateLayout">배치 방향 전환</button></div><div class="basis">한쪽 잔폭=max(2, 2×두께), 제품 간격=max(2, 1.5×두께)를 0.5mm 단위로 올린 <strong>초기 예산 제안값</strong>입니다. 제품 크기·형상·조질·캐리어 조건은 반영하지 않으므로 필요에 맞게 수정하세요. <a href="'+db.allowance.source+'" target="_blank" rel="noopener">브리지 설계 참고</a></div><div class="metrics" id="stripMetrics"></div>')+
card(4,"생산량과 시간당 비용","실제 양품 생산량을 입력하면 개당 인건비·설비비를 계산합니다.",grid(
sel("mode","생산 방식",[["auto","자동 순차이송"],["manual","수동 단발"]])+f("quantity","1회 생산·납품 수량 (개)",5000,"number","준비비는 이 수량에 배분합니다.",'step="1"')+
f("output","시간당 양품 생산 수량 (개/시간)",1200,"number","실제 정지·불량을 반영한 양품 수량. 로트 준비 시간은 제외합니다.")+
f("workers","투입 작업자 수 (명)",1)+
f("laborRate","작업자 1명 비용 (원/시간)",db.wage.rate,"number",'<a href="'+db.wage.source+'" target="_blank" rel="noopener">2026년 최저임금 10,320원</a>을 초기 적용합니다. 주휴·보험·퇴직급여 등은 포함하지 않습니다.')+
sel("pressId","프레스 선택",db.presses.map(p=>[p.id,p.name]))+
f("pressName","프레스 사양 · 직접 수정 가능","110 ton","text")+
f("pressRate","설비 임률 (원/시간)",30000,"number","인건비 제외. 회사의 전력·상각·보전비 포함 기준으로 수정하세요.")+
f("setupHours","로트 준비 시간 (시간)",1,"number","금형 교체·조건 설정·초품 검사. 같은 작업자·설비 임률을 적용합니다."))+
'<div class="hint-actions"><button type="button" class="mini-button" id="restoreWage">2026 최저임금 적용</button><button type="button" class="mini-button" id="restorePress">선택 프레스 제안 임률 적용</button><button type="button" class="mini-button" id="suggestOutput">생산 방식별 예시 생산량 적용</button></div><div class="basis" id="pressBasis"></div>')+
card(5,"선택 비용과 판매 조건","금형비와 스크랩 차감은 기본 제외합니다.",grid(
check("includeTool","금형비를 제품 단가에 배분")+
'<div class="full" id="toolFields" hidden>'+grid(f("toolCost","배분할 금형비 (원)",0)+f("toolQty","금형비 배분 수량 (개)",100000,"number","현재 로트가 아닌 누적 생산 수량으로 배분할 수 있습니다."))+'</div>'+
check("scrap","스크랩 매각 회수액 차감")+
'<div class="full" id="scrapFields" hidden>'+grid(f("netGrams","제품 실중량 (g)","")+f("scrapPrice","스크랩 회수 단가 (원/kg)",0))+'<small class="help">투입 중량 − 제품 실중량을 전량 회수하는 가정입니다. 초기·말단 잔재와 불량은 별도로 반영하세요.</small></div>'+
f("extraUnit","후처리·검사·포장 등 (원/개)",0)+f("extraLot","운송·최소작업비 등 (원/로트)",0)+
f("overhead","관리비 가산율 (%)",0,"number","직접 원가 합계에 적용합니다. 임률에 포함된 비용은 중복 가산하지 마세요.")+
f("markup","원가 대비 이익 가산율 (%)",15,"number","매출 대비 이익률이 아닙니다. 원가 100원에 15% → 115원.")+
sel("rounding","공급단가 올림 단위",[["1","1원"],["10","10원"],["100","100원"]])+check("vat","VAT 별도 가산 (10%)",true)+
'<label class="full">견적 조건 / 비고<textarea name="notes" maxlength="2000">소재비 포함. 납기 및 품질·포장 조건은 발주 전 협의합니다.</textarea></label>'))+
card(6,"개당 원가 산출 내역","제출용 견적서와 내부 원가산출서를 구분해서 저장할 수 있습니다.",
'<table class="breakdown"><thead><tr><th>산출 항목</th><th>원/개</th></tr></thead><tbody id="breakdown"></tbody></table><div class="basis" id="costBasis"></div><div class="hint-actions"><button type="button" class="mini-button" id="internalPdf">내부 원가산출서 PDF</button></div>');
const el=n=>form.elements.namedItem(n);
function read(){const d={};for(const e of form.elements)if(e.name)d[e.name]=e.type==="checkbox"?e.checked:e.value;return d;}
function apply(d){for(const e of form.elements)if(e.name && Object.hasOwn(d,e.name)){if(e.type==="checkbox")e.checked=d[e.name]===true;else e.value=String(d[e.name]??"");}}
function materialBasis(){const m=db.materials.find(m=>m.id===el("materialId").value);if(!m)return;const modified=Number(el("materialPrice").value)!==m.price;refs.material={id:m.id,kind:m.kind,note:m.note,source:m.source,modified,researchDate:db.researchedOn};showRefs();}
function pressBasis(){const p=db.presses.find(p=>p.id===el("pressId").value);if(!p)return;refs.press={id:p.id,kind:db.pressBasis.kind,note:db.pressBasis.note,modified:Number(el("pressRate").value)!==p.rate,researchDate:db.researchedOn};showRefs();}
function showRefs(){const m=refs.material||{};$("materialBasis").innerHTML='<strong>'+esc(m.kind||"저장된 기준")+(m.modified?' · 작성자 수정값':'')+'</strong><br>'+esc(m.note||"")+(m.source?' <a href="'+esc(safeUrl(m.source))+'" target="_blank" rel="noopener">가격 출처</a>':'');const p=refs.press||{};$("pressBasis").innerHTML='<strong>'+esc(p.kind||"저장된 기준")+(p.modified?' · 작성자 수정값':'')+'</strong><br>'+esc(p.note||"")+'<details><summary>검색 자료와 제안값의 구분</summary>'+db.pressBasis.sources.map(s=>'<p>'+esc(s.note)+' <a href="'+s.url+'" target="_blank" rel="noopener">원문</a></p>').join("")+'</details>';}
function rows(r){return [["소재 투입비",r.grossMaterial],["스크랩 회수 차감",-r.scrapCredit],["인건비",r.labor],["프레스 설비비",r.machine],["로트 준비비 배분",r.setup],["금형비 배분",r.tooling],["후처리·검사·포장·기타",r.extra],["관리비",r.overhead],["원가 합계",r.cost],["이익 가산",r.profit],["공급단가 (올림 적용)",r.unit]];}
function update(persist=true){
 const d=read();$("allowanceFields").hidden=d.layout==="exact";$("exactFields").hidden=d.layout!=="exact";$("toolFields").hidden=!d.includeTool;$("scrapFields").hidden=!d.scrap;
 try{result=PressProductCost.calculate(d);lastData=d;$("calculationError").textContent="";for(const [id,key] of [["unitPrice","unit"],["unitCost","cost"],["supply","supply"],["vat","vat"],["total","total"]])$(id).textContent=money(result[key],id==="unitCost"?2:0);
 $("stripMetrics").innerHTML=[["소재 폭",result.stripWidth.toFixed(2)+" mm"],["이송 피치",result.pitch.toFixed(2)+" mm"],["개당 투입 중량",(result.inputKg*1000).toFixed(3)+" g"]].map(([a,b])=>'<div class="metric"><small>'+a+'</small><strong>'+b+'</strong></div>').join("");
 $("breakdown").innerHTML=rows(result).map(([a,b])=>'<tr><td>'+a+'</td><td>'+money(b,2)+'</td></tr>').join("");
 $("costBasis").textContent="생산 시간 "+result.hours.toFixed(2)+"시간 + 준비 "+Number(d.setupHours).toFixed(2)+"시간 / 준비비 합계 "+money(result.setupTotal)+". 소재 투입에는 외곽·제품 간격 스크랩이 이미 포함됩니다. 초기·말단 잔재 등 추가 손실은 기타 비용으로 반영하세요.";
 }catch(e){result=null;$("calculationError").textContent=e.message;for(const id of ["unitPrice","unitCost","supply","vat","total"])$(id).textContent="—";$("breakdown").replaceChildren();$("stripMetrics").replaceChildren();$("costBasis").textContent="입력값을 확인하면 산출 내역이 표시됩니다.";}
 for(const id of ["downloadPdf","previewQuote","internalPdf"])$(id).disabled=!result;
 if(persist){try{localStorage.setItem(store,JSON.stringify(pack()));status("이 브라우저에 자동 저장되었습니다.");}catch{status("브라우저 자동 저장을 사용할 수 없습니다. 편집 파일로 저장해 주세요.");}}
}
function pack(){return {format:"qdm.press-product-quotation",version:1,savedAt:new Date().toISOString(),data:read(),references:refs};}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
const fileName=()=>String(el("quoteNumber").value||"press-product-quote").replace(/[\/:*?"<>|]/g,"_").slice(0,100);
function setMaterial(){const m=db.materials.find(m=>m.id===el("materialId").value);if(!m)return;el("materialName").value=m.id==="custom"?"":m.name;el("density").value=m.density;el("materialPrice").value=m.price??"";el("temper").value="";materialBasis();update();}
function setPress(){const p=db.presses.find(p=>p.id===el("pressId").value);el("pressName").value=p.id==="custom"?"":p.name;el("pressRate").value=p.rate??"";pressBasis();update();}
form.addEventListener("submit",e=>e.preventDefault());
form.addEventListener("input",e=>{if(["materialPrice","density","materialName","temper"].includes(e.target.name)){refs.material.modified=true;showRefs();}if(["pressRate","pressName"].includes(e.target.name)){refs.press.modified=true;showRefs();}update();});
el("materialId").addEventListener("change",setMaterial);
el("pressId").addEventListener("change",setPress);
$("restoreMaterial").onclick=setMaterial;$("restorePress").onclick=setPress;
$("restoreWage").onclick=()=>{el("laborRate").value=db.wage.rate;update();};
$("suggestOutput").onclick=()=>{el("output").value=el("mode").value==="auto"?1200:300;update();status("생산량은 예시값을 적용했습니다. 실제 양품 생산량으로 수정하세요.");};
$("suggestAllowance").onclick=()=>{const t=Number(el("thickness").value);if(!(t>0)){status("먼저 두께를 입력하세요.");return;}const ceil=n=>Math.ceil(n*2)/2;el("left").value=el("right").value=ceil(Math.max(2,2*t));el("gap").value=ceil(Math.max(2,1.5*t));el("layout").value="allowance";update();};
$("rotateLayout").onclick=()=>{el("rotation").value=el("rotation").value==="0"?"90":"0";update();};
$("saveQuote").onclick=()=>saveBlob(new Blob([JSON.stringify(pack(),null,2)],{type:"application/json"}),fileName()+".json");
$("loadQuote").onclick=()=>$("quoteFile").click();
$("quoteFile").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw Error("파일 크기가 너무 큽니다.");const p=JSON.parse(await file.text());if(p.format!=="qdm.press-product-quotation"||p.version!==1||!p.data||!p.references)throw Error("프레스 제품 견적 편집 파일이 아닙니다.");if(!confirm("현재 입력을 불러온 견적으로 바꾸시겠습니까?"))return;form.reset();apply(p.data);refs=p.references;showRefs();update();}catch(err){status("불러오기 실패: "+err.message);}finally{e.target.value="";}};
$("newQuote").onclick=()=>{if(!confirm("현재 입력을 초기화하고 새 견적서를 작성하시겠습니까?"))return;form.reset();el("pressId").value="110";refs={};materialBasis();pressBasis();update();};
$("closePreview").onclick=()=>$("productPreview").close();
$("productPreview").addEventListener("click",e=>{if(e.target===$("productPreview"))e.target.close();});
function validateQuote(){if(!result)return false;for(const n of ["seller","buyer","product"]){if(!el(n).value.trim()){status("작성 회사명·납품 회사명·제품명을 입력해 주세요.");el(n).focus();return false;}}return true;}
function drawPage(internal=false){
 const d=lastData,r=result,c=document.createElement("canvas");c.width=1240;c.height=1754;const ctx=c.getContext("2d");
 const x=86,w=1068;let y=90;
 ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
 const text=(s,xx,yy,size=22,color="#24364e",align="left")=>{ctx.fillStyle=color;ctx.font=size+'px "Malgun Gothic",sans-serif';ctx.textAlign=align;ctx.fillText(String(s),xx,yy);};
 function wrap(s,max,size=21){ctx.font=size+'px "Malgun Gothic",sans-serif';let lines=[];for(const para of String(s??"").split("\n")){let line="";for(const ch of para){if(ctx.measureText(line+ch).width>max){lines.push(line);line=ch;}else line+=ch;}lines.push(line);}return lines;}
 function block(s,size=21,color="#465773"){for(const line of wrap(s,w,size)){text(line,x,y,size,color);y+=size+11;}}
 const line=()=>{ctx.strokeStyle="#cbd7e6";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();};
 text(internal?"제품 원가산출서":"견 적 서",x,y,46,"#0b315f");text(d.quoteNumber,x+w,y,21,"#425571","right");y+=55;
 block((internal?"내부 검토용":"")+ (internal?" · ":"")+"견적일 "+d.date+" / 유효기간 "+d.validity);line();y+=40;
 block("수신: "+d.buyer+(d.contact?" / "+d.contact:""),25,"#0b315f");
 block("공급자: "+d.seller+(d.representative?" / 대표 "+d.representative:""));
 block("사업자번호: "+(d.businessNo||"—")+" / 연락처: "+(d.phone||"—"));
 if(d.address)block("주소: "+d.address);
 y+=10;line();y+=38;
 block("제품: "+d.product,26,"#0b315f");if(d.revision)block("도면: "+d.revision);
 block("소재: "+d.materialName+(d.temper?" / "+d.temper:""));
 block("전개 치수: "+d.width+" × "+d.length+" × t"+d.thickness+" mm / 수량: "+Number(d.quantity).toLocaleString("ko-KR")+"개");
 block("생산 방식: "+(d.mode==="auto"?"자동 순차이송":"수동 단발"));
 y+=12;
 if(internal){
  block("소재 폭 "+r.stripWidth.toFixed(2)+" mm / 피치 "+r.pitch.toFixed(2)+" mm / 투입 "+(r.inputKg*1000).toFixed(3)+" g");
  block("소재 "+money(d.materialPrice)+"/kg · 인건비 "+money(d.laborRate)+"/h × "+d.workers+"명");
  block(d.pressName+" · 설비 "+money(d.pressRate)+"/h · 양품 "+d.output+"개/h");
  for(const [a,b] of rows(r)){ctx.fillStyle="#f2f6fb";ctx.fillRect(x,y-22,w,39);text(a,x+12,y+4,21);text(money(b,2),x+w-12,y+4,21,"#0b315f","right");y+=42;}
  y+=18;block("소재 기준: "+(refs.material.kind||"직접 입력")+(refs.material.modified?" / 작성자 수정":""),19);
  block("설비 임률: 초기 예산 제안값 / 국내 톤수별 공개 표준가 미확인",19);
  block("여유는 견적용 가정. 금형비 "+(d.includeTool?"배분 포함":"제외")+" / 스크랩 "+(d.scrap?"차감":"미차감"),19);
 }else{
  ctx.fillStyle="#edf4fd";ctx.fillRect(x,y,w,58);text("품목",x+18,y+38,22);text("수량",x+600,y+38,22,"#24364e","right");text("단가",x+800,y+38,22,"#24364e","right");text("금액",x+w-18,y+38,22,"#24364e","right");y+=100;
  // 품목명을 여러 줄로 처리하여 수량·금액과 겹치지 않게 합니다.
  const names=wrap(d.product,420,22);for(const [i,s] of names.entries())text(s,x+18,y+i*30,22);
  text(Number(d.quantity).toLocaleString("ko-KR"),x+600,y,22,"#24364e","right");text(money(r.unit),x+800,y,22,"#24364e","right");text(money(r.supply),x+w-18,y,22,"#24364e","right");y+=Math.max(75,names.length*30+20);line();y+=48;
  for(const [a,b] of [["공급가액",r.supply],["VAT",r.vat],["총 견적금액",r.total]]){text(a,x+580,y,25);text(money(b),x+w-18,y,28,"#0b315f","right");y+=49;}
  y+=10;line();y+=40;
  block("납기: "+d.delivery);block("결제: "+d.payment);
  block("금형비: "+(d.includeTool?"제품 단가에 배분 포함":"제품 단가에서 제외")+" / 스크랩 회수액: "+(d.scrap?"차감 반영":"차감 없음"));
  y+=12;block("견적 조건",24,"#0b315f");
  const noteLines=wrap(d.notes,w,20);
  for(const s of noteLines){if(y>1600)throw Error("견적 조건이 한 페이지를 초과합니다. 비고나 회사 정보를 줄여주세요.");text(s,x,y,20);y+=30;}
 }
 if(y>1640)throw Error("견적 내용이 한 페이지를 초과합니다. 긴 항목을 줄여주세요.");
 text(internal?"산출값은 작성자가 입력한 조건을 기준으로 계산되었습니다.":"위 조건으로 견적합니다.",x,1690,18,"#65758a");
 return c;
}
$("previewQuote").onclick=()=>{if(!validateQuote())return;try{const pages=[drawPage(),drawPage(true)];$("previewPages").replaceChildren(...pages.map((c,i)=>{const fig=document.createElement("figure"),cap=document.createElement("figcaption");cap.textContent=i?"내부 원가산출서 · 제출용 PDF에는 포함되지 않음":"고객 제출용 견적서";fig.append(c,cap);return fig;}));$("productPreview").showModal();}catch(e){status(e.message);}};
async function pdf(internal=false){if(!validateQuote())return;try{await document.fonts.ready;const blob=await canvasesToPdf([drawPage(internal)]);saveBlob(blob,fileName()+(internal?"-internal-cost":"")+".pdf");}catch(e){status("PDF 생성 실패: "+e.message);}}
$("downloadPdf").onclick=()=>pdf();$("previewDownload").onclick=()=>pdf();$("internalPdf").onclick=()=>pdf(true);
el("pressId").value="110";materialBasis();pressBasis();
try{const saved=JSON.parse(localStorage.getItem(store)||"null");if(saved?.format==="qdm.press-product-quotation"&&saved.version===1&&saved.data){apply(saved.data);refs=saved.references||refs;showRefs();}}catch{status("저장된 입력을 복원하지 못했습니다. 새 견적서로 시작합니다.");}
for(const id of ["newQuote","loadQuote","saveQuote"])$(id).disabled=false;
update(false);status("기준값을 확인하고 수정하세요. 입력은 이 브라우저에 자동 저장됩니다.");
// PDF 작성기는 기존 프레스금형 견적서의 로컬 Canvas → PDF 방식을 재사용합니다.
  function concatBytes(chunks) {
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(size); let offset = 0;
    chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.length; });
    return result;
  }

  async function canvasesToPdf(canvases) {
    const images = [];
    for (const canvas of canvases) {
      const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.96));
      images.push({ bytes: new Uint8Array(await jpegBlob.arrayBuffer()), width: canvas.width, height: canvas.height });
    }
    const enc = new TextEncoder();
    const chunks = [enc.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    const offsets = [0];
    let length = chunks[0].length;
    const addObject = (id, bodyParts) => {
      offsets[id] = length;
      const parts = [enc.encode(`${id} 0 obj\n`), ...(Array.isArray(bodyParts) ? bodyParts : [enc.encode(bodyParts)]), enc.encode("\nendobj\n")];
      chunks.push(...parts); length += parts.reduce((sum, part) => sum + part.length, 0);
    };
    const pageIds = images.map((_, index) => 3 + index);
    const imageIds = images.map((_, index) => 3 + images.length + index);
    const contentIds = images.map((_, index) => 3 + images.length * 2 + index);
    addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObject(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`);
    images.forEach((image, index) => addObject(pageIds[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${index} ${imageIds[index]} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`));
    images.forEach((image, index) => addObject(imageIds[index], [enc.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`), image.bytes, enc.encode("\nendstream")]));
    images.forEach((_, index) => { const stream = `q\n595.28 0 0 841.89 0 0 cm\n/Im${index} Do\nQ\n`; addObject(contentIds[index], `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`); });
    const xrefOffset = length;
    const objectCount = 2 + images.length * 3;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= objectCount; id += 1) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(enc.encode(xref));
    return new Blob([concatBytes(chunks)], { type: "application/pdf" });
  }


})();
