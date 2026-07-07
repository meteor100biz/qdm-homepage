function card(p){
  const label = p.categoryLabel || p.categoryName || p.category || '';
  const tags = (p.tags || []).slice(0,2).map(t=>`<span class="badge">${t}</span>`).join('');
  return `<a class="project" href="${p.url}">
    <div class="project-img" style="background-image:url('${p.image}')"></div>
    <div class="project-body">
      <span class="badge">${label}</span>${tags}
      <h3>${p.title}</h3>
      <p>${p.summary || p.description || ''}</p>
      <span class="more">상세 보기 →</span>
    </div>
  </a>`;
}
function renderBlog(posts){
  const g=document.getElementById('blogGrid');
  if(!g)return;
  g.innerHTML=posts.map(post=>`<a class="blog-card" href="${post.url}" target="_blank" rel="noopener">
    <div class="blog-img" style="background-image:url('${post.image}')"></div>
    <div class="blog-body"><span class="badge">${post.category}</span><h3>${post.title}</h3><p>${post.description}</p></div>
  </a>`).join('');
}
function renderFeatured(posts){
  const g=document.getElementById('featuredPortfolioGrid');
  if(!g)return;
  g.innerHTML=posts.filter(p=>p.featured).sort((a,b)=>(a.order||0)-(b.order||0)).map(card).join('');
}
function renderPortfolioList(posts,category='all'){
  const g=document.getElementById('portfolioList');
  if(!g)return;
  let list=posts.slice().sort((a,b)=>(a.order||0)-(b.order||0));
  if(category!=='all')list=list.filter(p=>p.category===category);
  g.innerHTML=list.map(card).join('')||'<p>해당 분야의 포트폴리오가 아직 없습니다.</p>';
}
const portfolioDescriptions={
  all:'QDM은 기계·기구설계, 구조해석, 프레스 금형설계, 역설계 분야의 실무형 엔지니어링 프로젝트를 수행합니다.',
  mechanical:'제품 아이디어 단계부터 2D·3D CAD 설계, 구조 검토, 시제품 제작까지 실제 제작이 가능한 형상을 고려하여 설계합니다.',
  analysis:'구조해석을 활용하여 설계 초기 단계에서 강도와 변형을 검토하고, 불필요한 제작 비용과 시행착오를 줄입니다.',
  'press-die':'25년 이상의 실무 경험을 바탕으로 자동차, 가전, 전자부품 등 다양한 프레스 금형을 설계하며, 성형성과 제작성을 함께 고려한 금형 설계를 제공합니다.',
  reverse:'실물 부품이나 스캔 데이터를 기반으로 제작 가능한 CAD 데이터를 복원하며, 기존 부품 개선과 도면 재작성도 함께 수행합니다.'
};
function updatePortfolioIntro(category='all'){
  const el=document.getElementById('portfolioHeroDesc');
  if(el)el.textContent=portfolioDescriptions[category]||portfolioDescriptions.all;
}
fetch('data/blog-posts.json').then(r=>r.json()).then(renderBlog).catch(()=>{});
fetch('data/portfolios.json').then(r=>r.json()).then(posts=>{
  renderFeatured(posts);
  const params=new URLSearchParams(location.search);
  const init=params.get('category')||'all';
  updatePortfolioIntro(init);
  renderPortfolioList(posts,init);
  document.querySelectorAll('.tab').forEach(btn=>{
    if(btn.dataset.category===init){
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updatePortfolioIntro(btn.dataset.category);
      renderPortfolioList(posts,btn.dataset.category);
    });
  });
}).catch(()=>{});
