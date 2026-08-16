(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const els = {form:$("burringForm"),solve:$("solveFor"),t:$("tInput"),r:$("rInput"),d:$("dInput"),D:$("DInput"),h:$("hInput"),ratio:$("thicknessRatio")};
  let radiusLinked = true;
  const names = {h:"버링 높이 h",d:"기초 피어싱 d",D:"버링 내경 D"};
  const num = (el) => Number.parseFloat(el.value);
  const fmt = (v, digits=3) => Number.isFinite(v) ? v.toLocaleString("ko-KR",{minimumFractionDigits:0,maximumFractionDigits:digits}) : "-";

  function bendVolume(D,t,r,k,steps=360){
    const a=D/2, end=Math.PI/2, dt=end/steps;
    let volume=0;
    for(let i=0;i<steps;i++){
      const theta=(i+.5)*dt;
      const localT=t*(1-(1-k)*(theta/end));
      const rho=a+r*Math.sin(theta)+(localT/2)*Math.cos(theta);
      const pathRadius=r+localT/2;
      volume+=2*Math.PI*rho*localT*pathRadius*dt;
    }
    return volume;
  }
  function values(D,t,r,k,h){
    const tb=k*t, Do=D+2*tb;
    const bend=bendVolume(D,t,r,k);
    const area=Math.PI/4*(Do*Do-D*D);
    const straight=h-r;
    return {tb,Do,bend,area,straight,wall:area*Math.max(0,straight)};
  }
  function solve(inputs){
    let {target,t,r,d,D,h,k}=inputs;
    if(!(t>0)) throw Error("판재 두께 t는 0보다 커야 합니다.");
    if(!(r>=0)) throw Error("내측 굽힘반경 r은 0 이상이어야 합니다.");
    if(!(k>=.5&&k<=1)) throw Error("두께율은 50%에서 100% 사이로 입력해 주세요.");
    if(target!=="d"&&!(d>0)) throw Error("기초 피어싱 d는 0보다 커야 합니다.");
    if(target!=="D"&&!(D>0)) throw Error("버링 내경 D는 0보다 커야 합니다.");
    if(target!=="h"&&!(h>=r)) throw Error("버링 높이 h는 내측 반경 r 이상이어야 합니다.");
    if(target==="h"){
      const g=values(D,t,r,k,r);
      const available=Math.PI*((D/2+r)**2-(d/2)**2)*t;
      if(!(available>g.bend)) throw Error("기초홀 주변의 소재 체적이 굽힘부를 만드는 데 필요한 체적보다 부족합니다. d를 줄이거나 D 또는 r을 키워 주세요.");
      h=r+(available-g.bend)/g.area;
      if(!(h>=r&&Number.isFinite(h))) throw Error("입력 조건에서 유효한 버링 높이를 구할 수 없습니다.");
    } else if(target==="d"){
      const g=values(D,t,r,k,h);
      const used=g.bend+g.area*(h-r);
      const radicand=(D/2+r)**2-used/(Math.PI*t);
      if(!(radicand>0)) throw Error("지정한 내경과 높이를 만들기 위한 소재가 부족하여 양의 기초홀을 구할 수 없습니다.");
      d=2*Math.sqrt(radicand);
    } else {
      const residual=(candidate)=>{
        const g=values(candidate,t,r,k,h);
        return Math.PI*((candidate/2+r)**2-(d/2)**2)*t-(g.bend+g.area*(h-r));
      };
      let low=.001, high=Math.max(d*2,20), fLow=residual(low), fHigh=residual(high), guard=0;
      while(fLow*fHigh>0&&guard++<30){high*=1.7;fHigh=residual(high);}
      if(fLow*fHigh>0) throw Error("입력 조건에서 유효한 버링 내경을 찾을 수 없습니다. d, h 또는 r 조건을 조정해 주세요.");
      for(let i=0;i<90;i++){const mid=(low+high)/2, fm=residual(mid);if(fLow*fm<=0){high=mid;fHigh=fm;}else{low=mid;fLow=fm;}}
      D=(low+high)/2;
      if(!(D>0&&Number.isFinite(D))) throw Error("양의 버링 내경을 구할 수 없습니다.");
    }
    const geometry=values(D,t,r,k,h);
    if(geometry.straight<0) throw Error("버링 높이 h는 내측 반경 r 이상이어야 합니다.");
    return {t,r,d,D,h,k,...geometry};
  }

  function arrowDefs(){return `<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#d11"/></marker></defs>`;}
  function line(x1,y1,x2,y2){return `<line class="dimension-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`;}
  function draw(g){
    const tPx=22, gap=Math.min(145,Math.max(54,g.d*8)), leftEnd=240-gap/2, rightStart=240+gap/2;
    $("beforeDrawing").innerHTML=arrowDefs()+`<path class="shape-before" d="M20 82 H${leftEnd} V${82+tPx} H20 Z M${rightStart} 82 H460 V${82+tPx} H${rightStart} Z"/>${line(leftEnd,142,rightStart,142)}<text class="dimension-text" x="240" y="166" text-anchor="middle">d = ${fmt(g.d)} mm</text>${line(430,82,430,104)}<text class="dimension-text" x="444" y="98">t</text>`;
    const cx=240, a=Math.min(90,Math.max(45,g.D*5)), wall=Math.min(25,Math.max(12,g.tb*13)), rr=Math.min(42,Math.max(12,g.r*14)), bottom=Math.min(214,112+Math.max(42,g.h*24));
    const li=cx-a/2, ri=cx+a/2, lo=li-wall, ro=ri+wall;
    const shape=`M20 64 H${lo-rr} Q${lo} 64 ${lo} ${64+rr} V${bottom} H${li} V${64+rr} Q${li} ${64+tPx} ${li+rr} ${64+tPx} H${ri-rr} Q${ri} ${64+tPx} ${ri} ${64+rr} V${bottom} H${ro} V${64+rr} Q${ro} 64 ${ro+rr} 64 H460 V${64+tPx} H${ro+rr} Q${ro} ${64+tPx} ${ro} ${64+rr} V${bottom+wall} H${ri-wall} V${64+rr} Q${ri-wall} ${64+tPx+wall} ${ri-rr} ${64+tPx+wall} H${li+rr} Q${li+wall} ${64+tPx+wall} ${li+wall} ${64+rr} V${bottom+wall} H${lo} V${64+rr} Q${lo} 64 ${lo-rr} 64 Z`;
    $("afterDrawing").innerHTML=arrowDefs()+`<path class="shape-after" d="${shape}" fill-rule="evenodd"/>${line(li,bottom-17,ri,bottom-17)}<text class="drawing-value" x="${cx}" y="${bottom-25}" text-anchor="middle">D ${fmt(g.D)}</text>${line(lo,bottom+18,ro,bottom+18)}<text class="drawing-value" x="${cx}" y="${bottom+40}" text-anchor="middle">Do ${fmt(g.Do)}</text>${line(ro+25,86,ro+25,bottom)}<text class="drawing-value" x="${ro+35}" y="${(86+bottom)/2}">h ${fmt(g.h)}</text><path class="dimension-line" d="M${li+5} ${64+rr+18} L${li+rr-5} ${64+rr-10}" marker-end="url(#arrow)"/><text class="drawing-value" x="${li-18}" y="${64+rr+33}">r ${fmt(g.r)}</text><text class="drawing-value" x="430" y="56">t ${fmt(g.t)}</text>`;
  }
  function showError(message){$("resultPanel").hidden=true;$("errorPanel").hidden=false;$("errorMessage").textContent=message;$("resultBadge").textContent="계산 불가";$("resultBadge").classList.add("error");}
  function calculate(){
    const target=els.solve.value;
    document.querySelectorAll("[data-dimension]").forEach(label=>{const output=label.dataset.dimension===target;label.classList.toggle("is-output",output);label.querySelector("input").readOnly=output;});
    try{
      const g=solve({target,t:num(els.t),r:num(els.r),d:num(els.d),D:num(els.D),h:num(els.h),k:num(els.ratio)/100});
      els[target].value=String(Math.round(g[target]*1000)/1000);
      $("resultLabel").textContent=names[target];$("resultValue").textContent=fmt(g[target]);$("outsideDiameter").textContent=`${fmt(g.Do)} mm`;$("straightHeight").textContent=`${fmt(g.straight)} mm`;$("wallThickness").textContent=`${fmt(g.tb)} mm`;$("bendVolume").textContent=`${fmt(g.bend)} mm³`;$("wallVolume").textContent=`${fmt(g.wall)} mm³`;
      $("resultPanel").hidden=false;$("errorPanel").hidden=true;$("resultBadge").textContent="계산 완료";$("resultBadge").classList.remove("error");draw(g);
    }catch(error){showError(error.message);}
  }
  els.form.addEventListener("input",calculate);els.solve.addEventListener("change",calculate);
  els.t.addEventListener("input",()=>{if(radiusLinked)els.r.value=els.t.value;});
  els.r.addEventListener("input",()=>{radiusLinked=false;$("rLinkStatus").textContent="개별 입력값 적용 중";});
  $("relinkRadius").addEventListener("click",()=>{radiusLinked=true;els.r.value=els.t.value;$("rLinkStatus").textContent="t와 연동 중";calculate();});
  $("resetCalculator").addEventListener("click",()=>{els.solve.value="h";els.t.value="1";els.r.value="1";els.d.value="6";els.D.value="10";els.h.value="2";els.ratio.value="80";radiusLinked=true;$("rLinkStatus").textContent="t와 연동 중";calculate();});
  calculate();
})();
