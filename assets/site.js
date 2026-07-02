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
fetch('data/blog-posts.json').then(r=>r.json()).then(renderBlog).catch(()=>{});
fetch('data/portfolios.json').then(r=>r.json()).then(posts=>{
  renderFeatured(posts);
  const params=new URLSearchParams(location.search);
  const init=params.get('category')||'all';
  renderPortfolioList(posts,init);
  document.querySelectorAll('.tab').forEach(btn=>{
    if(btn.dataset.category===init){
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderPortfolioList(posts,btn.dataset.category);
    });
  });
}).catch(()=>{});