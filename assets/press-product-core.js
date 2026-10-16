(function(root) {
"use strict";
function formatBusinessNo(value) {
 const digits=String(value??"").replace(/\D/g,"").slice(0,10);
 return digits.slice(0,3)+(digits.length>3?"-"+digits.slice(3,5):"")+(digits.length>5?"-"+digits.slice(5):"");
}
function ungroupNumber(value) {return String(value??"").replace(/,/g,"");}
function groupNumber(value) {
 const raw=ungroupNumber(value);
 if(!/^\d*(?:\.\d*)?$/.test(raw))return raw;
 const [integer,fraction]=raw.split(".");
 return integer.replace(/^0+(?=\d)/,"").replace(/\B(?=(\d{3})+(?!\d))/g,",")+(fraction===undefined?"":"."+fraction);
}
function calculate(d) {
 const n = k => Number(d[k]);
 const required = ["width","length","thickness","density","materialPrice","quantity","output","laborRate","workers","pressRate","setupHours","extraUnit","extraLot","overhead","markup","rounding"];
 for(const k of required) if(d[k] === "" || !Number.isFinite(n(k)) || n(k)<0) throw Error("숫자와 단위를 확인하세요: "+k);
 for(const k of ["width","length","thickness","density","quantity","output","rounding"]) if(n(k)<=0) throw Error("치수·밀도·수량·생산량·반올림 단위는 0보다 커야 합니다.");
 if(!Number.isInteger(n("quantity"))) throw Error("생산 수량은 정수로 입력하세요.");
 let stripWidth,pitch;
 const cross = d.rotation==="90" ? n("length"):n("width");
 const feed = d.rotation==="90" ? n("width"):n("length");
 if(d.layout==="exact") {
  stripWidth=n("stripWidth");pitch=n("pitch");
  if(!Number.isFinite(stripWidth)||!Number.isFinite(pitch)||stripWidth<cross||pitch<feed) throw Error("단열 배치의 소재 폭·피치는 해당 방향 전개 치수 이상이어야 합니다.");
 } else {
  for(const k of ["left","right","gap"]) if(d[k]==="" || !Number.isFinite(n(k))||n(k)<0) throw Error("잔폭·제품 간격은 0 이상의 숫자로 입력하세요.");
  stripWidth=cross+n("left")+n("right");pitch=feed+n("gap");
 }
 const inputKg=stripWidth*pitch*n("thickness")*n("density")/1000000;
 let scrapCredit=0;
 if(d.scrap) {
  if(d.netGrams===""||d.scrapPrice===""||!Number.isFinite(n("netGrams"))||!Number.isFinite(n("scrapPrice"))||n("netGrams")<0||n("scrapPrice")<0||n("netGrams")>inputKg*1000+1e-8) throw Error("제품 실중량은 투입 중량 이하, 회수 단가는 0 이상으로 입력하세요.");
  scrapCredit=(inputKg-n("netGrams")/1000)*n("scrapPrice");
 }
 const grossMaterial=inputKg*n("materialPrice"), material=grossMaterial-scrapCredit;
 if(material<0) throw Error("스크랩 회수액이 소재 투입비를 초과합니다.");
 const labor=n("laborRate")*n("workers")/n("output");
 const machine=n("pressRate")/n("output");
 const setupTotal=n("setupHours")*(n("laborRate")*n("workers")+n("pressRate"));
 const setup=setupTotal/n("quantity");
 let tooling=0;
 if(d.includeTool) {
  if(d.toolCost===""||d.toolQty===""||!Number.isFinite(n("toolCost"))||!Number.isFinite(n("toolQty"))||n("toolCost")<0||n("toolQty")<=0) throw Error("금형비와 배분 수량을 확인하세요.");
  tooling=n("toolCost")/n("toolQty");
 }
 const extra=n("extraUnit")+n("extraLot")/n("quantity");
 const direct=material+labor+machine+setup+tooling+extra;
 const overhead=direct*n("overhead")/100;
 const cost=direct+overhead,profit=cost*n("markup")/100;
 const rawPrice=cost+profit;
 const unit=Math.ceil(Number((rawPrice/n("rounding")).toFixed(10)))*n("rounding");
 const supply=Math.round(unit*n("quantity")),vat=d.vat?Math.round(supply*0.1):0;
 const result={stripWidth,pitch,inputKg,grossMaterial,scrapCredit,material,labor,machine,setupTotal,setup,tooling,extra,overhead,cost,profit,unit,supply,vat,total:supply+vat,hours:n("quantity")/n("output")};
 if(Object.values(result).some(v=>!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER)) throw Error("계산 범위를 초과했습니다. 입력값을 줄여주세요.");
 return result;
}
const api={calculate,formatBusinessNo,groupNumber,ungroupNumber};
if(typeof module!=="undefined"&&module.exports) module.exports=api;
else root.PressProductCost=api;
})(typeof globalThis!=="undefined"?globalThis:this);
