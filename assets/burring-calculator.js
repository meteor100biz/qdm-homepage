(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const els = {form:$("burringForm"),solve:$("solveFor"),t:$("tInput"),r:$("rInput"),d:$("dInput"),D:$("DInput"),h:$("hInput"),ratio:$("thicknessRatio")};
  let radiusLinked = true;
  const names = {h:"버링 높이 h",d:"기초 피어싱 d",D:"버링 내경 D"};
  const alternateAuto = {h:"d",d:"h",D:"h"};
  const num = (el) => Number.parseFloat(el.value);
  const fmt = (v,digits=2) => Number.isFinite(v) ? v.toLocaleString("ko-KR",{minimumFractionDigits:0,maximumFractionDigits:digits}) : "-";

  function bendVolume(D,t,r,k,steps=360){
    const a=D/2,end=Math.PI/2,dt=end/steps;
    let volume=0;
    for(let i=0;i<steps;i++){
      const theta=(i+.5)*dt;
      const localT=t*(1-(1-k)*(theta/end));
      const rho=a+r*Math.sin(theta)+(localT/2)*Math.cos(theta);
      volume+=2*Math.PI*rho*localT*(r+localT/2)*dt;
    }
    return volume;
  }
  function geometry(D,t,r,k,h){
    const tb=k*t,Do=D+2*tb,bend=bendVolume(D,t,r,k),area=Math.PI/4*(Do*Do-D*D),straight=h-r;
    return {tb,Do,bend,area,straight,wall:area*Math.max(0,straight)};
  }
  function solve(input){
    let {target,t,r,d,D,h,k}=input;
    if(!(t>0)) throw Error("판재 두께 t는 0보다 커야 합니다.");
    if(!(r>=0)) throw Error("내측 굽힘반경 r은 0 이상이어야 합니다.");
    if(!(k>=.5&&k<=1)) throw Error("두께율은 50%에서 100% 사이로 입력해 주세요.");
    if(target!=="d"&&!(d>0)) throw Error("기초 피어싱 d는 0보다 커야 합니다.");
    if(target!=="D"&&!(D>0)) throw Error("버링 내경 D는 0보다 커야 합니다.");
    if(target!=="h"&&!(h>=r)) throw Error("버링 높이 h는 내측 반경 r 이상이어야 합니다.");
    if(target==="h"){
      const g=geometry(D,t,r,k,r),available=Math.PI*((D/2+r)**2-(d/2)**2)*t;
      if(!(available>g.bend)) throw Error("기초홀 주변의 소재 체적이 굽힘부를 만드는 데 필요한 체적보다 부족합니다. d를 줄이거나 D 또는 r을 키워 주세요.");
      h=r+(available-g.bend)/g.area;
      if(!(h>=r&&Number.isFinite(h))) throw Error("입력 조건에서 유효한 버링 높이를 구할 수 없습니다.");
    }else if(target==="d"){
      const g=geometry(D,t,r,k,h),used=g.bend+g.area*(h-r),radicand=(D/2+r)**2-used/(Math.PI*t);
      if(!(radicand>0)) throw Error("지정한 내경과 높이를 만들기 위한 소재가 부족하여 양의 기초홀을 구할 수 없습니다.");
      d=2*Math.sqrt(radicand);
    }else{
      const residual=(candidate)=>{const g=geometry(candidate,t,r,k,h);return Math.PI*((candidate/2+r)**2-(d/2)**2)*t-(g.bend+g.area*(h-r));};
      let low=.001,high=Math.max(d*2,20),fLow=residual(low),fHigh=residual(high),guard=0;
      while(fLow*fHigh>0&&guard++<30){high*=1.7;fHigh=residual(high);}
      if(fLow*fHigh>0) throw Error("입력 조건에서 유효한 버링 내경을 찾을 수 없습니다. d, h 또는 r 조건을 조정해 주세요.");
      for(let i=0;i<90;i++){const mid=(low+high)/2,fm=residual(mid);if(fLow*fm<=0){high=mid;fHigh=fm;}else{low=mid;fLow=fm;}}
      D=(low+high)/2;
      if(!(D>0&&Number.isFinite(D))) throw Error("양의 버링 내경을 구할 수 없습니다.");
    }
    const g=geometry(D,t,r,k,h);
    if(g.straight<0) throw Error("버링 높이 h는 내측 반경 r 이상이어야 합니다.");
    return {t,r,d,D,h,k,...g};
  }

  const defs=()=>`<defs><marker id="dimArrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 8 4 0 8Z"/></marker><linearGradient id="formedBlue" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#5d8ed9"/><stop offset="1" stop-color="#3267b8"/></linearGradient></defs>`;
  const dimLine=(x1,y1,x2,y2)=>`<line class="dimension-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-start="url(#dimArrow)" marker-end="url(#dimArrow)"/>`;
  function editor(x,y,key,label,value,width=88,linked=false){
    const output=els.solve.value===key,readonly=output||linked;
    const colorRole=["d","D","h"].includes(key)?" is-attention":key==="r"?" is-reference":key==="t"&&!linked?" is-base":"";
    const lock=(["d","D","h"].includes(key))?`<button class="drawing-lock-toggle${output?" is-auto":""}" data-lock-toggle="${key}" type="button" aria-label="${label} ${output?"자동 계산 중":"고정됨"}"><span aria-hidden="true">${output?"🔓":"🔒"}</span></button>`:"";
    return `<foreignObject x="${x}" y="${y}" width="${width}" height="49"><div xmlns="http://www.w3.org/1999/xhtml" class="drawing-editor${colorRole}${output?" is-result":""}${linked?" is-linked":""}"><label>${label}</label>${lock}<div class="drawing-value-row"><input data-drawing-input="${key}" type="number" min="0" step="0.1" value="${Number(value.toFixed(2))}" ${readonly?"readonly aria-readonly=\"true\"":""}/><span>mm</span></div></div></foreignObject>`;
  }
  function setAuto(key,focusKey="",drawing=false){
    if(!["d","D","h"].includes(key)) return;
    els.solve.value=key;
    calculate();
    if(focusKey) requestAnimationFrame(()=>{
      const selector=drawing?`[data-drawing-input="${focusKey}"]`:`#${focusKey}Input`;
      const input=document.querySelector(selector);
      input?.focus();input?.select();
    });
  }
  function activateAutoInput(key,drawing=false){
    if(els.solve.value!==key) return;
    setAuto(alternateAuto[key],key,drawing);
  }
  function updateLockState(){
    const target=els.solve.value;
    $("autoCalculationStatus").textContent=`${names[target]} 자동 계산`;
    document.querySelectorAll('[data-lock-toggle]').forEach(button=>{
      const auto=button.dataset.lockToggle===target;
      button.classList.toggle("is-auto",auto);
      button.querySelector("span").textContent=auto?"🔓":"🔒";
      button.setAttribute("aria-label",`${names[button.dataset.lockToggle]} ${auto?"자동 계산 중":"고정됨. 자동 계산으로 전환"}`);
    });
    document.querySelectorAll('.drawings [data-drawing-input]').forEach(input=>{if(["d","D","h"].includes(input.dataset.drawingInput))input.readOnly=input.dataset.drawingInput===target;});
  }
  function bindDrawingEditors(){
    document.querySelectorAll("[data-drawing-input]").forEach(input=>{
      input.addEventListener("focus",()=>input.select());
      input.addEventListener("click",()=>{if(input.readOnly) activateAutoInput(input.dataset.drawingInput,true);});
      const syncValue=()=>{
        const key=input.dataset.drawingInput;
        if(key==="r"){radiusLinked=false;$("rLinkStatus").textContent="개별 입력값 적용 중";}
        els[key].value=input.value;
        if(key==="t"&&radiusLinked) els.r.value=input.value;
      };
      const commit=()=>{
        syncValue();
        calculate();
      };
      input.addEventListener("input",syncValue);
      input.addEventListener("change",commit);
      input.addEventListener("blur",commit);
      input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();commit();}});
    });
    document.querySelectorAll(".drawings [data-lock-toggle]").forEach(button=>button.addEventListener("click",()=>setAuto(button.dataset.lockToggle)));
  }
  function draw(g){
    const heightRatio=g.r>0?g.h/g.r:3;
    const shortScale=heightRatio<=1?0:heightRatio<=8?(heightRatio-1)/7:1;
    const wallBottom=Math.round(98+109*shortScale);
    const innerDimY=Math.round(116+63*shortScale);
    const outsideDimY=Math.round(146+85*shortScale);
    const heightCardY=Math.round((87+Math.max(98,wallBottom-4))/2-21);
    $("beforeDrawing").innerHTML=defs()+`<g transform="translate(0 -12)">
      <path class="flat-material" d="M22 76H198V102H22Z M302 76H478V102H302Z"/>
      <line class="extension-line" x1="198" y1="108" x2="198" y2="157"/><line class="extension-line" x1="302" y1="108" x2="302" y2="157"/>
      ${dimLine(202,142,298,142)}${editor(198,157,"d","기초홀 d",g.d,104)}
      ${dimLine(451,78,451,100)}${editor(355,112,"t","두께 t",g.t,96)}</g>
      <text class="drawing-note" x="22" y="218">피어싱 후 평판 단면</text>`;

    $("afterDrawing").innerHTML=defs()+`<g transform="translate(0 -12)">
      <path class="formed-material" d="M20 54H145C171 54 187 70 187 96V${wallBottom}H158V98C158 87 152 83 141 83H20Z"/>
      <path class="formed-material" d="M480 54H355C329 54 313 70 313 96V${wallBottom}H342V98C342 87 348 83 359 83H480Z"/>
      <path class="highlight-edge" d="M20 83H141C152 83 158 87 158 98V${wallBottom}M480 83H359C348 83 342 87 342 98V${wallBottom}"/>
      ${dimLine(191,innerDimY,309,innerDimY)}${editor(198,innerDimY-50,"D","내경 D",g.D,104)}
      <line class="extension-line" x1="158" y1="${wallBottom+3}" x2="158" y2="${outsideDimY+8}"/><line class="extension-line" x1="342" y1="${wallBottom+3}" x2="342" y2="${outsideDimY+8}"/>${dimLine(162,outsideDimY,338,outsideDimY)}
      <g class="result-tag"><rect x="207" y="${outsideDimY-18}" width="86" height="27" rx="7"/><text x="250" y="${outsideDimY}" text-anchor="middle">Dₒ ${fmt(g.Do)}</text></g>
      <line class="extension-line" x1="344" y1="${wallBottom}" x2="407" y2="${wallBottom}"/>${dimLine(392,87,392,Math.max(94,wallBottom-4))}${editor(373,heightCardY,"h","높이 h",g.h,105)}
      <path class="radius-leader" d="M128 122 154 88"/>${editor(38,111,"r","굽힘반경 r",g.r,90)}</g>
      ${editor(384,7,"t","두께 t",g.t,96,true)}
      <text class="drawing-note" x="20" y="242">굽힘부 t → ${Math.round(g.k*100)}%t · 직선부 ${fmt(g.tb)} mm</text>`;
    bindDrawingEditors();
  }
  function showError(message){$("resultPanel").hidden=true;$("errorPanel").hidden=false;$("errorMessage").textContent=message;$("resultBadge").textContent="계산 불가";$("resultBadge").classList.add("error");}
  function calculate(){
    const target=els.solve.value;
    updateLockState();
    document.querySelectorAll("[data-dimension]").forEach(label=>{const output=label.dataset.dimension===target;label.classList.toggle("is-output",output);label.querySelector("input").readOnly=output;});
    try{
      const g=solve({target,t:num(els.t),r:num(els.r),d:num(els.d),D:num(els.D),h:num(els.h),k:num(els.ratio)/100});
      els[target].value=g[target].toFixed(2);
      $("resultLabel").textContent=names[target];$("resultValue").textContent=fmt(g[target]);$("outsideDiameter").textContent=`${fmt(g.Do)} mm`;$("straightHeight").textContent=`${fmt(g.straight)} mm`;$("wallThickness").textContent=`${fmt(g.tb)} mm`;
      $("resultPanel").hidden=false;$("errorPanel").hidden=true;$("resultBadge").textContent="계산 완료";$("resultBadge").classList.remove("error");draw(g);
    }catch(error){showError(error.message);}
  }
  els.form.addEventListener("input",calculate);
  document.querySelectorAll('.input-card [data-lock-toggle]').forEach(button=>button.addEventListener("click",()=>setAuto(button.dataset.lockToggle)));
  ["d","D","h"].forEach(key=>els[key].addEventListener("click",()=>{if(els[key].readOnly)activateAutoInput(key,false);}));
  els.t.addEventListener("input",()=>{if(radiusLinked)els.r.value=els.t.value;});
  els.r.addEventListener("input",()=>{radiusLinked=false;$("rLinkStatus").textContent="개별 입력값 적용 중";});
  $("relinkRadius").addEventListener("click",()=>{radiusLinked=true;els.r.value=els.t.value;$("rLinkStatus").textContent="t와 연동 중";calculate();});
  $("resetCalculator").addEventListener("click",()=>{els.solve.value="h";els.t.value="1";els.r.value="1";els.d.value="6";els.D.value="10";els.h.value="2";els.ratio.value="80";radiusLinked=true;$("rLinkStatus").textContent="t와 연동 중";calculate();});
  calculate();
})();
