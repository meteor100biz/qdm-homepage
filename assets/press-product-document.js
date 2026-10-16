(() => {
"use strict";
const money=(n,d=0)=>Number(Object.is(n,-0)?0:n).toLocaleString("ko-KR",{maximumFractionDigits:d})+"원";
const number=n=>Number(n).toLocaleString("ko-KR",{maximumFractionDigits:3});
function draw(d,r,refs,internal=false){
 const canvas=document.createElement("canvas");canvas.width=2480;canvas.height=3508;
 const ctx=canvas.getContext("2d"),left=200,right=2280,width=2080;
 const c={navy:"#102c4e",blue:"#1768b2",ink:"#17293f",text:"#405269",muted:"#6d7d90",line:"#cbd6e2",pale:"#eef5fb",wash:"#f8fafc",white:"#fff"};
 ctx.fillStyle=c.white;ctx.fillRect(0,0,2480,3508);ctx.textBaseline="middle";
 function font(size,weight=400){ctx.font=weight+' '+size+'px Arial,"Malgun Gothic","Noto Sans KR",sans-serif';}
 function text(s,x,y,size=30,color=c.ink,align="left",weight=400){font(size,weight);ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(s??"—"),x,y);}
 function line(x,y,x2,y2,color=c.line,thickness=2){ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
 function box(x,y,w,h,fill=c.white,stroke=c.line,thickness=2){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle=stroke;ctx.lineWidth=thickness;ctx.strokeRect(x,y,w,h);}
 function lines(s,w,size){font(size);const out=[];for(const p of String(s||"—").split(/\r?\n/)){let str="";for(const char of p){if(str&&ctx.measureText(str+char).width>w){out.push(str);str=char;}else str+=char;}out.push(str);}return out;}
 function fit(s,x,y,w,h,size=32,weight=400,color=c.ink,align="left",vertical="middle"){
  let actual=size,ls;
  do{ls=lines(s,w,actual);if(ls.length*(actual*1.35)<=h)break;actual-=1;}while(actual>=20);
  if(actual<20)throw Error("견적서의 긴 항목을 줄여주세요: "+String(s).slice(0,25));
  const first=vertical==="top"?y+actual/2:y+h/2-(ls.length-1)*actual*1.35/2;
  ls.forEach((s,i)=>text(s,align==="right"?x+w:align==="center"?x+w/2:x,first+i*actual*1.35,actual,color,align,weight));
 }
 function infoCard(label,title,details,x,y,w,h){
  box(x,y,w,h);ctx.fillStyle=c.pale;ctx.fillRect(x,y,w,66);text(label,x+24,y+34,24,c.blue,"left",800);
  fit(title,x+24,y+75,w-48,70,40);fit(details,x+24,y+154,w-48,h-168,27,400,c.text);
 }
 function field(label,value,x,y,w,h=110){box(x,y,w,h);text(label,x+20,y+28,23,c.muted,"left",700);fit(value,x+20,y+47,w-40,h-51,32);}
 function noteBlock(title,value,y,h=300){
  text(title,left,y,34,c.navy,"left",800);box(left,y+40,width,h,c.wash);
  // Do not silently omit quote terms; require shorter input if it cannot fit.
  fit(value,left+26,y+60,width-52,h-40,29,400,c.text,"left","top");
 }
 const page=internal?2:1;
 ctx.fillStyle=c.blue;ctx.fillRect(left,132,12,238);
 text(internal?"DETAIL / PRODUCT COST":"QUOTATION / PRESS PART",left+46,152,28,c.blue,"left",800);
 text(internal?"별첨1 · 내부 원가산출서":"프레스제품 견적서",left+46,245,internal?78:88,c.navy,"left",800);
 text(internal?"PRESS PART COST DETAIL":"PRESS PART QUOTATION",left+49,332,30,c.muted,"left",700);
 text(String(page).padStart(2,"0"),right,198,136,"#edf3f8","right",800);
 fit("NO. "+d.quoteNumber,right-540,282,540,50,28,400,c.text,"right");
 text(d.date||"—",right,356,26,c.muted,"right");line(left,420,right,420,c.navy,5);
 const mode=d.mode==="auto"?"자동 순차이송":"수동 단발";
 const dims=d.width+" × "+d.length+" × "+d.thickness+" mm";
 if(!internal){
  const gap=24,cw=(width-gap)/2;
  infoCard("SUPPLIER / 공급자",d.seller,["대표 "+(d.representative||"—")+" / 사업자번호 "+(PressProductCost.formatBusinessNo(d.businessNo)||"—"),d.phone||"연락처 —",d.address||"주소 —"].join("\n"),left,470,cw,310);
  infoCard("RECIPIENT / 수신처",d.buyer,["담당자 "+(d.contact||"—"),"제품 "+d.product].join("\n"),left+cw+gap,470,cw,310);
  box(left,810,width,142,"#f7fafc");ctx.fillStyle=c.blue;ctx.fillRect(left,810,10,142);
  text("PRODUCT UNIT PRICE / 제품 공급단가 (VAT 제외)",left+34,837,25,c.muted,"left",800);
  fit(d.product,left+34,860,width-900,46,32);
  fit(money(r.unit)+" / 개",right-800,838,772,72,64,800,c.navy,"right");
  const productionReference="양산 참고 · "+number(d.quantity)+"개 × "+money(r.unit)+" = "+money(r.supply)+" (VAT 제외)"+(d.vat?" / VAT 포함 "+money(r.total):" / VAT 미가산");
  fit(productionReference,left+34,911,width-62,34,25,400,c.muted,"right");
  const fw=(width-40)/3;
  [[ "제품 소재",d.materialName+(d.temper?" / "+d.temper:"")],["전개 크기 / 두께",dims],["생산 방식 / 프레스",mode+" / "+d.pressName],["견적 유효기간",d.validity],["납기",d.delivery],["결제 조건",d.payment]].forEach(([a,b],i)=>field(a,b,left+(i%3)*(fw+20),980+Math.floor(i/3)*130,fw));
  const y=1260,hh=86,rh=160;
  const col=[left,left+340,left+1050,left+1250,left+1380,left+1690,right];
  box(left,y,width,hh,c.pale);ctx.fillStyle=c.blue;ctx.fillRect(left,y,width,6);
  ["항목","내용·사양","수량","단위","단가","금액"].forEach((a,i)=>text(a,(col[i]+col[i+1])/2,y+hh/2,32,c.navy,"center",800));
  box(left,y+hh,width,rh,c.wash);col.slice(1,-1).forEach(x=>line(x,y+hh,x,y+hh+rh));
  const values=["프레스 제품",d.product+(d.revision?"\n도면 "+d.revision:""),number(d.quantity),"개",money(r.unit),money(r.supply)];
  values.forEach((a,i)=>fit(a,col[i]+18,y+hh+12,col[i+1]-col[i]-36,rh-24,i>=4?33:31,400,c.ink,i>=4?"right":i>=2?"center":"left"));
  let sy=y+hh+rh+24;const sx=1320,sw=right-sx;
  [["공급가액",r.supply],[d.vat?"부가세 (10%)":"부가세 (미가산)",r.vat]].forEach(([a,b])=>{box(sx,sy,sw,82);text(a,sx+20,sy+41,32,c.text);text(money(b),right-18,sy+41,34,c.ink,"right");sy+=82;});
  box(sx,sy,sw,104,c.pale,c.blue,3);ctx.fillStyle=c.blue;ctx.fillRect(sx,sy,9,104);text("총 견적금액",sx+28,sy+52,35,c.navy,"left",800);text(money(r.total),right-20,sy+52,44,c.navy,"right");
  const terms="금형비: "+(d.includeTool?"제품 단가에 배분 포함":"제품 단가에서 제외")+" / 스크랩 회수액: "+(d.scrap?"차감 반영":"차감 없음")+"\n"+(d.notes||"별도 조건 없음");
  noteBlock("견적 조건 및 특기사항",terms,1960,540);
  text("첨부: 02 제품 원가산출서",left,2600,27,c.muted);
 } else {
  field("PROJECT / 제품명",d.product,left,470,width,126);
  const cw=(width-40)/3;
  [["소재 폭 × 이송 피치",number(r.stripWidth)+" × "+number(r.pitch)+" mm"],["개당 투입 중량",(r.inputKg*1000).toFixed(3)+" g"],["개당 원가 합계",money(r.cost,2)]].forEach(([a,b],i)=>field(a,b,left+i*(cw+20),625,cw,140));
  [["제품 소재 / 조질",d.materialName+(d.temper?" / "+d.temper:"")],["전개 크기 / 두께",dims],["생산 방식 / 설비",mode+" / "+d.pressName],["양품 생산량 / 로트 수량",number(d.output)+"개/h / "+number(d.quantity)+"개"],["인건비 / 설비 임률",money(d.laborRate)+"/h × "+d.workers+"명 / "+money(d.pressRate)+"/h"],["준비 시간 / 준비비 합계",number(d.setupHours)+"h / "+money(r.setupTotal)]].forEach(([a,b],i)=>field(a,b,left+(i%3)*(cw+20),795+Math.floor(i/3)*130,cw));
  const costRows=[
   ["소재 투입비", (r.inputKg*1000).toFixed(3)+" g ÷ 1,000 × "+money(d.materialPrice)+"/kg",r.grossMaterial],
   ["스크랩 회수 차감",d.scrap?"("+number(r.inputKg*1000)+" − "+number(d.netGrams)+") g ÷ 1,000 × "+money(d.scrapPrice)+"/kg":"차감 없음",-r.scrapCredit],
   ["인건비",money(d.laborRate)+"/h × "+d.workers+"명 ÷ "+number(d.output)+"개/h",r.labor],
   ["프레스 설비비",money(d.pressRate)+"/h ÷ "+number(d.output)+"개/h",r.machine],
   ["로트 준비비 배분",money(r.setupTotal)+" ÷ "+number(d.quantity)+"개",r.setup],
   ["금형비 배분",d.includeTool?money(d.toolCost)+" ÷ "+number(d.toolQty)+"개":"제품 단가에서 제외",r.tooling],
   ["후처리·검사·포장·기타",money(d.extraUnit)+"/개 + "+money(d.extraLot)+"/로트 ÷ "+number(d.quantity)+"개",r.extra],
   ["관리비","직접 원가 합계 × "+number(d.overhead)+"%",r.overhead],
   ["원가 합계","소재비 − 회수액 + 인건비 + 설비비 + 준비비 + 선택 비용 + 관리비",r.cost],
   ["이익 가산","원가 합계 × "+number(d.markup)+"%",r.profit],
   ["제품 공급단가","원가 합계 + 이익 가산 → "+number(d.rounding)+"원 단위 올림",r.unit]
  ];
  const ty=1080,hh=80,rh=96,col=[left,left+100,left+560,left+1570,right];
  box(left,ty,width,hh,c.pale);ctx.fillStyle=c.blue;ctx.fillRect(left,ty,width,6);
  ["NO.","항목","산출 기준","원/개"].forEach((a,i)=>text(a,(col[i]+col[i+1])/2,ty+hh/2,31,c.navy,"center",800));
  costRows.forEach(([a,b,val],i)=>{
   const y=ty+hh+i*rh;box(left,y,width,rh,i%2?c.wash:c.white);col.slice(1,-1).forEach(x=>line(x,y,x,y+rh));
   text(String(i+1).padStart(2,"0"),left+50,y+rh/2,27,c.muted,"center");
   fit(a,col[1]+18,y+8,col[2]-col[1]-36,rh-16,31,i===8||i===10?700:400);
   fit(b,col[2]+18,y+8,col[3]-col[2]-36,rh-16,27,400,c.text);
   fit(money(val,2),col[3]+18,y+8,col[4]-col[3]-36,rh-16,34,400,c.navy,"right");
  });
  const ey=ty+hh+costRows.length*rh+28;
  box(left,ey,width,112,c.pale,c.blue,3);ctx.fillStyle=c.blue;ctx.fillRect(left,ey,9,112);
  text("제품 공급단가 · VAT 제외",left+30,ey+56,35,c.navy,"left",800);text(money(r.unit),right-30,ey+56,46,c.navy,"right");
  const sourceNotes=[
   "설비 임률: "+(refs.press?.modified?"작성자 수정값":"초기 예산 제안값")+" (인건비 제외). 생산량은 실제 양품 수량 기준입니다.",
   "준비비 = 준비 시간 × (설비 임률 + 작업자 비용 × 인원), 로트 수량으로 나누어 배분합니다.",
   "스트립 폭·피치에 외곽 스크랩 포함. 초기·말단 잔재 등 추가 손실은 별도 반영합니다.",
   "관리비는 직접 원가에, 이익은 관리비 포함 원가에 가산합니다. 금형비와 회수 차감은 선택 적용입니다."
  ].join("\n");
  noteBlock("산출 기준 및 참고사항",sourceNotes,ey+180,360);
 }
 line(left,3260,right,3260);fit(d.seller,left,3285,650,50,28,400,c.muted);fit(d.quoteNumber,900,3285,680,50,28,400,c.muted,"center");text(page+" / 2",right,3310,28,c.muted,"right");
 return canvas;
}
window.PressProductDocument={draw};
})();
