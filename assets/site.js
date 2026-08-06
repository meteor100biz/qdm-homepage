const qdmJapanese = document.documentElement.lang.toLowerCase().startsWith('ja');
const qdmText = qdmJapanese ? {
  detail:'詳しく見る →', empty:'該当分野の実績はまだありません。',
  descriptions:{
    all:'QDMは、製品開発エンジニアリングとプレス金型エンジニアリング分野の実務型プロジェクトを行っています。',
    product:'機械・機構設計と構造解析を含む製品開発エンジニアリングの実績です。',
    press:'プレス金型設計と薄板成形解析を含むプレス金型エンジニアリングの実績です。',
    mechanical:'製品アイデアの段階から2D・3D CAD設計、構造検討、試作品製作まで、実際の製作を考慮した設計を行います。',
    analysis:'構造解析により設計初期段階で強度と変形を検討し、不要な製作コストと試行錯誤を削減します。',
    'press-die':'25年以上の実務経験を基に、自動車・家電・電子部品などのプレス金型を設計し、成形性と製作性を考慮した金型設計をご提供します。',
    forming:'薄板成形解析により、破断・しわ・スプリングバックなどを金型製作前に検討します。',
    reverse:'実物部品やスキャンデータを基に製作可能なCADデータを復元し、既存部品の改善や図面の再作成にも対応します。'
  }
} : {
  detail:'상세 보기 →', empty:'해당 분야의 포트폴리오가 아직 없습니다.',
  descriptions:{
    all:'QDM은 제품개발 엔지니어링과 프레스금형 엔지니어링 분야의 실무형 프로젝트를 수행합니다.',
    product:'기계·기구설계와 구조해석에 해당하는 제품개발 엔지니어링 실적입니다.',
    press:'프레스 금형설계와 박판성형해석에 해당하는 프레스금형 엔지니어링 실적입니다.',
    mechanical:'제품 아이디어 단계부터 2D·3D CAD 설계, 구조 검토, 시제품 제작까지 실제 제작이 가능한 형상을 고려하여 설계합니다.',
    analysis:'구조해석을 활용하여 설계 초기 단계에서 강도와 변형을 검토하고, 불필요한 제작 비용과 시행착오를 줄입니다.',
    'press-die':'25년 이상의 실무 경험을 바탕으로 자동차, 가전, 전자부품 등 다양한 프레스 금형을 설계하며, 성형성과 제작성을 함께 고려한 금형 설계를 제공합니다.',
    forming:'박판성형해석으로 파단·주름·스프링백 가능성을 금형 제작 전에 검토합니다.',
    reverse:'실물 부품이나 스캔 데이터를 기반으로 제작 가능한 CAD 데이터를 복원하며, 기존 부품 개선과 도면 재작성도 함께 수행합니다.'
  }
};
function card(p){
  const label = p.categoryLabel || p.categoryName || p.category || '';
  const tags = (p.tags || []).slice(0,2).map(t=>`<span class="badge">${t}</span>`).join('');
  const url=/^(?:https?:)?\//.test(p.url||'')?p.url:`/${p.url||''}`;
  const image=/^(?:https?:)?\//.test(p.image||'')?p.image:`/${p.image||''}`;
  return `<a class="project" href="${url}"><div class="project-img" style="background-image:url('${image}')"></div><div class="project-body"><span class="badge">${label}</span>${tags}<h3>${p.title}</h3><p>${p.summary || p.description || ''}</p><span class="more">${qdmText.detail}</span></div></a>`;
}
function blogDate(value){if(!value)return '';try{return new Intl.DateTimeFormat(qdmJapanese?'ja-JP':'ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(`${value}T00:00:00`));}catch{return value;}}
function blogCard(post){
  const image=/^(?:https?:)?\//.test(post.image||'')?post.image:`/${post.image||''}`;
  const external=/^https?:\/\//.test(post.url||'');
  const attrs=external?' target="_blank" rel="noopener"':'';
  const label=post.categoryLabel||post.category||'';
  const date=blogDate(post.publishedAt);
  return `<a class="blog-card" href="${post.url}"${attrs}><div class="blog-img" style="background-image:url('${image}')"></div><div class="blog-body"><div class="blog-meta"><span class="badge">${label}</span>${date?`<time datetime="${post.publishedAt}">${date}</time>`:''}</div><h3>${post.title}</h3><p>${post.summary||post.description||''}</p><span class="more">${qdmJapanese?'記事を読む →':'글 보기 →'}</span></div></a>`;
}
function publishedBlogs(posts){return posts.filter(post=>post.published!==false).sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||''))||(a.order||0)-(b.order||0));}
function initMobileCarousel(grid){
  if(!grid)return;
  let shell=grid.closest('.mobile-carousel-shell');
  if(!shell){
    shell=document.createElement('div');shell.className='mobile-carousel-shell blog-carousel-shell';
    grid.parentNode.insertBefore(shell,grid);shell.append(grid);
    const previous=document.createElement('button');previous.type='button';previous.className='mobile-carousel-arrow prev';previous.setAttribute('aria-label',qdmJapanese?'前の項目':'이전 항목');
    const next=document.createElement('button');next.type='button';next.className='mobile-carousel-arrow next';next.setAttribute('aria-label',qdmJapanese?'次の項目':'다음 항목');
    shell.append(previous,next);
    const move=direction=>grid.scrollBy({left:direction*(grid.clientWidth+14),behavior:'smooth'});
    previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    let frame=0;
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const end=Math.max(0,grid.scrollWidth-grid.clientWidth);previous.disabled=grid.scrollLeft<=2;next.disabled=grid.scrollLeft>=end-2;});};
    grid.addEventListener('scroll',update,{passive:true});
    if(globalThis.ResizeObserver){const observer=new ResizeObserver(update);observer.observe(grid);shell._qdmCarouselObserver=observer;}
    shell._qdmCarouselUpdate=update;
  }
  shell._qdmCarouselUpdate?.();
}
function renderBlog(posts){
  const g=document.getElementById('blogGrid');
  if(!g)return;
  const list=publishedBlogs(posts).filter(post=>post.featured!==false).slice(0,4);
  if(!list.length){g.closest('section').hidden=true;return;}
  g.innerHTML=list.map(blogCard).join('');initMobileCarousel(g);
}
function renderBlogList(posts){
  const g=document.getElementById('blogList');
  if(!g)return;
  const list=publishedBlogs(posts);
  const empty=qdmJapanese?'公開された記事はまだありません。':'공개된 글이 아직 없습니다.';
  const draw=(category='all')=>{const filtered=category==='all'?list:list.filter(post=>post.category===category);g.innerHTML=filtered.map(blogCard).join('')||`<p class="empty-message">${empty}</p>`;};
  const tabs=document.getElementById('blogCategoryTabs');
  if(tabs){const categories=[...new Map(list.map(post=>[post.category,post.categoryLabel||post.category])).entries()];tabs.innerHTML=[['all',qdmJapanese?'すべて':'전체'],...categories].map(([key,label],index)=>`<button class="tab${index===0?' active':''}" type="button" data-blog-category="${key}">${label}</button>`).join('');tabs.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{tabs.querySelectorAll('button').forEach(item=>item.classList.remove('active'));button.classList.add('active');draw(button.dataset.blogCategory);}));}
  draw();
}
function renderPortfolioList(posts,category='all'){const g=document.getElementById('portfolioList');if(!g)return;let list=posts.slice().sort((a,b)=>(b.order||0)-(a.order||0));if(category==='product')list=list.filter(p=>['mechanical','analysis'].includes(p.category));else if(category==='press')list=list.filter(p=>['press-die','forming'].includes(p.category));else if(category!=='all')list=list.filter(p=>p.category===category);g.innerHTML=list.map(card).join('')||`<p>${qdmText.empty}</p>`;}
function renderHomePortfolioPreviews(posts){
  const groups=[
    {selector:'.service-pillar.press-field .pillar-gallery',categories:['press-die','forming']},
    {selector:'.service-pillar.product-field .pillar-gallery',categories:['mechanical','analysis']}
  ];
  const sorted=posts.slice().sort((a,b)=>(b.order||0)-(a.order||0));
  groups.forEach(group=>{
    const gallery=document.querySelector(group.selector);
    if(!gallery)return;
    const latest=sorted.filter(item=>group.categories.includes(item.category)).slice(0,2);
    if(!latest.length)return;
    gallery.replaceChildren(...latest.map(item=>{
      const image=document.createElement('img');
      image.src=/^(?:https?:)?\//.test(item.image||'')?item.image:`/${item.image||''}`;
      image.alt=`${item.title} · ${item.categoryLabel||item.categoryName||item.category||''}`;
      image.loading='lazy';image.decoding='async';
      return image;
    }));
  });
}
function updatePortfolioIntro(category='all'){const el=document.getElementById('portfolioHeroDesc');if(el)el.textContent=qdmText.descriptions[category]||qdmText.descriptions.all;}
function initOverseasTrade(){
  if(!qdmJapanese)return;
  const list=document.querySelector('#contact .contact-list');
  if(!list)return;
  if(document.querySelector('[data-overseas-trade]'))return;
  const section=document.createElement('section');section.className='overseas-trade';section.dataset.overseasTrade='';
  section.innerHTML='<span class="trade-kicker">OVERSEAS BUSINESS</span><strong>海外取引について</strong><p class="trade-intro">QDMは、日本企業からのプレス金型設計・薄板成形解析のご依頼に対応しています。</p><ul class="trade-support"><li>日本語によるメール・オンライン打ち合わせ・音声通話に対応</li><li>見積書・請求書（Invoice）を発行</li><li>図面・仕様書はフォームまたはメールで送付可能</li><li>必要に応じて秘密保持契約（NDA）に対応</li><li>韓国と日本の間に時差はありません</li></ul><div class="trade-flow" aria-label="海外取引の流れ"><div><b>1</b><span>お問い合わせ<br>資料送付</span></div><div><b>2</b><span>お見積り<br>業務範囲確認</span></div><div><b>3</b><span>ご発注<br>設計・解析</span></div><div><b>4</b><span>納品・請求書<br>海外送金</span></div></div>';
  list.insertAdjacentElement('afterend',section);
}
const qdmDataBase=qdmJapanese?'/data/ja':'/data';
function initHeroSlider(){
  const root=document.querySelector('.hero-art');
  if(!root)return;
  const stage=root.querySelector('.hero-slides');
  const dots=root.querySelector('.hero-dots');
  const prev=root.querySelector('[data-hero-prev]');
  const next=root.querySelector('[data-hero-next]');
  let index=0,timer=0,interval=5000,slides=[];
  const internalPath=(value)=>/^(?:https?:)?\//.test(value||'')?value:`/${String(value||'').replace(/^\/+/, '')}`;
  const show=(nextIndex)=>{
    if(!slides.length)return;
    index=(nextIndex+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===index));
    dots.querySelectorAll('button').forEach((dot,i)=>{dot.classList.toggle('is-active',i===index);dot.setAttribute('aria-current',i===index?'true':'false');});
  };
  const stop=()=>{if(timer){clearInterval(timer);timer=0;}};
  const play=()=>{stop();if(slides.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(index+1),interval);};
  const render=(settings)=>{
    const items=(settings.slides||[]).filter(item=>item&&item.enabled!==false&&item.image);
    if(!items.length)return;
    interval=Math.max(2,Number(settings.intervalSeconds)||5)*1000;
    root.style.setProperty('--hero-ratio',String(settings.aspectRatio||'16:10').replace(':',' / '));
    stage.replaceChildren(...items.map((item,i)=>{
      const figure=document.createElement('figure');figure.className=`hero-slide${i===0?' is-active':''}`;
      const img=document.createElement('img');img.src=internalPath(item.image);img.alt=(qdmJapanese?item.altJa:item.altKo)||item.altKo||'';img.decoding='async';
      if(i===0)img.fetchPriority='high';else img.loading='lazy';
      figure.append(img);return figure;
    }));
    slides=[...stage.querySelectorAll('.hero-slide')];
    dots.replaceChildren(...slides.map((_,i)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',qdmJapanese?`${i+1}番目のバナーを見る`:`${i+1}번째 배너 보기`);button.addEventListener('click',()=>{show(i);play();});return button;}));
    root.classList.toggle('has-multiple',slides.length>1);show(0);play();
  };
  prev?.addEventListener('click',()=>{show(index-1);play();});
  next?.addEventListener('click',()=>{show(index+1);play();});
  root.addEventListener('mouseenter',stop);root.addEventListener('mouseleave',play);
  root.addEventListener('focusin',stop);root.addEventListener('focusout',play);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():play());
  fetch('/data/hero-slides.json').then(response=>{if(!response.ok)throw new Error('hero settings');return response.json();}).then(render).catch(()=>{});
}
function initKoreanServiceDirectory(){
  if(document.getElementById('serviceDetailLinks'))return;
  const section=document.querySelector('.services-overview');
  const pillars=section?.querySelector('.service-pillars');
  if(!section||!pillars)return;
  section.id='services';
  const links=document.createElement('nav');
  links.id='serviceDetailLinks';
  links.className='service-detail-links';
  links.setAttribute('aria-label',qdmJapanese?'分野別サービス詳細ページ':'분야별 서비스 상세 페이지');
  const base=qdmJapanese?'/ja/services':'/services';
  links.innerHTML=qdmJapanese
    ? `<a class="service-detail-link" href="${base}/press-die-design/">プレス金型設計 <span>→</span></a><a class="service-detail-link" href="${base}/sheet-metal-forming-analysis/">薄板成形解析 <span>→</span></a><a class="service-detail-link" href="${base}/structural-analysis/">構造解析 <span>→</span></a><a class="service-detail-link" href="${base}/product-design/">製品設計 <span>→</span></a>`
    : `<a class="service-detail-link" href="${base}/press-die-design/">프레스금형설계 <span>→</span></a><a class="service-detail-link" href="${base}/sheet-metal-forming-analysis/">박판성형해석 <span>→</span></a><a class="service-detail-link" href="${base}/structural-analysis/">구조해석 <span>→</span></a><a class="service-detail-link" href="${base}/product-design/">제품설계 <span>→</span></a>`;
  pillars.insertAdjacentElement('afterend',links);
}
function initKoreanServicePriority(){
  const moveFirst=(container,item)=>{if(container&&item&&container.firstElementChild!==item)container.insertBefore(item,container.firstElementChild);};
  const businessPaths=document.querySelector('.business-paths');
  const pressPath=businessPaths?.querySelector('a[href*="category=press"]');
  const productPath=businessPaths?.querySelector('a[href*="category=product"]');
  pressPath?.classList.add('press-priority');productPath?.classList.add('product-priority');
  moveFirst(businessPaths,pressPath);
  const servicePillars=document.querySelector('.service-pillars');
  moveFirst(servicePillars,servicePillars?.querySelector('.press-field'));
  const serviceTitle=document.getElementById('services-title');
  if(serviceTitle)serviceTitle.textContent=qdmJapanese?'プレス金型設計と製品開発、実務経験で形にします':'프레스금형설계와 제품개발, 실무 경험으로 완성합니다';
  const heroTitle=document.querySelector('.hero-copy h1');
  if(heroTitle)heroTitle.innerHTML=qdmJapanese?'プレス金型と製品開発、<br><span class="hero-subtitle">製作まで考慮したエンジニアリング</span>':'프레스금형과 제품개발,<br><span class="hero-subtitle">제작까지 고려한 엔지니어링</span>';
  const aboutTitle=document.querySelector('#about .section-title');
  if(aboutTitle)aboutTitle.textContent=qdmJapanese?'プレス金型設計と製品開発、実際の製作まで考慮します':'프레스금형설계와 제품개발, 실제 제작까지 고려합니다';
  const aboutCopy=document.querySelector('#about .about-grid > div:first-child');
  const aboutHeadings=aboutCopy?[...aboutCopy.querySelectorAll('.about-domain-title')]:[];
  const productHeading=aboutHeadings.find(item=>item.textContent.includes(qdmJapanese?'製品開発':'제품개발'));
  const pressHeading=aboutHeadings.find(item=>item.textContent.includes(qdmJapanese?'プレス金型':'프레스금형'));
  if(aboutCopy&&productHeading&&pressHeading){const pressParagraph=pressHeading.nextElementSibling;aboutCopy.insertBefore(pressHeading,productHeading);if(pressParagraph)aboutCopy.insertBefore(pressParagraph,productHeading);}
  const directory=document.querySelector('.service-directory-grid');
  if(directory){['press-die-design','sheet-metal-forming-analysis','structural-analysis','product-design'].forEach(key=>{const link=directory.querySelector(`a[href*="${key}"]`);if(link)directory.appendChild(link);});}
  const tabs=document.getElementById('portfolioTabs');
  if(tabs){['all','press','press-die','forming','product','mechanical','analysis'].forEach(key=>{const tab=tabs.querySelector(`[data-category="${key}"]`);if(tab)tabs.appendChild(tab);});}
}
initKoreanServicePriority();
initKoreanServiceDirectory();
initHeroSlider();
initOverseasTrade();
fetch(`${qdmDataBase}/blog-posts.json`).then(r=>r.json()).then(posts=>{renderBlog(posts);renderBlogList(posts);}).catch(()=>{});
fetch(`${qdmDataBase}/portfolios.json`,{cache:'no-store'}).then(r=>r.json()).then(posts=>{
  renderHomePortfolioPreviews(posts);
  const params=new URLSearchParams(location.search);const init=params.get('category')||'all';updatePortfolioIntro(init);renderPortfolioList(posts,init);
  document.querySelectorAll('.tab').forEach(btn=>{if(btn.dataset.category===init){document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updatePortfolioIntro(btn.dataset.category);renderPortfolioList(posts,btn.dataset.category);});});
}).catch(()=>{});
