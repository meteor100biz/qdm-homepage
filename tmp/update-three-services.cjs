const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const backupRoot = path.join(root, 'tmp/three-services-backup-20261126');
const changed = [];
function save(file, transform) {
  const full = path.join(root, file);
  const original = fs.readFileSync(full, 'utf8');
  const next = transform(original);
  if (next === original) return;
  const backup = path.join(backupRoot, file);
  if (!fs.existsSync(backup)) { fs.mkdirSync(path.dirname(backup), {recursive: true}); fs.copyFileSync(full, backup); }
  fs.writeFileSync(full, next);
  changed.push(file);
}
const content = {
  ko: {
    base: '', title: '설계·해석·금형, 세 가지 전문 분야',
    description: '제품·기계설계, 구조·열해석, 프레스금형설계. 과제에 맞는 전문 분야와 수행 실적을 확인하세요.',
    scope: '업무 범위 보기 →', projects: '수행 실적 보기 →',
    cards: [
      {field: 'product', id: 'product-development', slug: 'product-design', category: 'mechanical', label: 'DESIGN', name: '제품·기계설계', description: '아이디어를 제작 가능한 제품과 기계 구조로 구체화합니다.', image: '/assets/product-development-21.png', alt: '산업기계 및 장비 설계', items: ['제품설계', '기계·기구설계', '역설계', 'CAD 설계용역', '시제품 개발']},
      {field: 'analysis', id: 'structural-thermal-analysis', slug: 'structural-analysis', category: 'analysis', label: 'CAE ANALYSIS', name: '구조·열해석', description: '하중과 열, 작동 조건을 해석하여 설계의 안전성과 성능을 검토합니다.', image: '/assets/service-analysis.jpg', alt: '구조해석 응력 분포 결과', items: ['선형·비선형 해석', '열전달 해석', '과도상태 해석', '진동·고유진동수', '유동해석']},
      {field: 'press', id: 'press-die-engineering', slug: 'press-die-design', category: 'press', label: 'PRESS DIE', name: '프레스금형설계', description: '금형설계와 박판성형해석을 함께 검토하여 제작 전 시행착오를 줄입니다.', image: '/assets/press-die-cad-overview.png', alt: '프레스금형 3D 설계', items: ['프레스금형설계', '프로그레시브 금형', '박판성형해석', '공정설계', '성형성 검토']}
    ]
  },
  ja: {
    base: '/ja', title: '設計・解析・金型、3つの専門分野',
    description: '製品・機械設計、構造・熱解析、プレス金型設計。課題に合う専門分野と実績をご確認ください。',
    scope: '対応業務を見る →', projects: '実績を見る →',
    cards: [
      {field: 'product', id: 'product-development', slug: 'product-design', category: 'mechanical', label: 'DESIGN', name: '製品・機械設計', description: 'アイデアを製作可能な製品と機械構造へ具体化します。', image: '/assets/product-development-21.png', alt: '産業機械・設備の設計', items: ['製品設計', '機械・機構設計', 'リバースエンジニアリング', 'CAD設計支援', '試作品開発']},
      {field: 'analysis', id: 'structural-thermal-analysis', slug: 'structural-analysis', category: 'analysis', label: 'CAE ANALYSIS', name: '構造・熱解析', description: '荷重・熱・動作条件を解析し、設計の安全性と性能を検討します。', image: '/assets/service-analysis.jpg', alt: '構造解析による応力分布', items: ['線形・非線形解析', '熱伝達解析', '過渡解析', '振動・固有振動数', '流体解析']},
      {field: 'press', id: 'press-die-engineering', slug: 'press-die-design', category: 'press', label: 'PRESS DIE', name: 'プレス金型設計', description: '金型設計と薄板成形解析を連携し、製作前の試行錯誤を減らします。', image: '/assets/press-die-cad-overview.png', alt: 'プレス金型の3D設計', items: ['プレス金型設計', '順送金型', '薄板成形解析', '工程設計', '成形性検討']}
    ]
  }
};
for (const [lang, copy] of Object.entries(content)) {
  const home = lang === 'ko' ? 'index.html' : 'ja/index.html';
  save(home, source => {
    const cards = copy.cards.map(card => `<article class="service-pillar ${card.field}-field" id="${card.id}">
  <div class="pillar-gallery" aria-label="${card.alt}"><img src="${card.image}" alt="${card.alt}" loading="lazy" decoding="async"></div>
  <div class="pillar-content"><span class="pillar-label">${card.label}</span><h3>${card.name}</h3><p>${card.description}</p>
    <ul>${card.items.map((item, index) => `<li>${card.field === 'press' && index === 2 ? `<a class="forming-detail-link" href="${copy.base}/services/sheet-metal-forming-analysis/">${item} <span aria-hidden="true">→</span></a>` : item}</li>`).join('')}</ul>
    <div class="pillar-actions"><a class="more" href="${copy.base}/services/${card.slug}/">${copy.scope}</a><a class="pillar-projects" href="${copy.base}/portfolio.html?category=${card.category}">${copy.projects}</a></div>
  </div>
</article>`).join('\n');
    const section = `<section class="services-overview" id="services" aria-labelledby="services-title"><div class="wrap">
  <div class="section-head"><div><div class="section-kicker">Core Services</div><h2 class="section-title" id="services-title">${copy.title}</h2></div><p class="section-desc">${copy.description}</p></div>
  <div class="service-pillars three-service-pillars">${cards}</div>
</div></section>`;
    const pattern = /<section class="services-overview"[\s\S]*?<\/section>/;
    if (!pattern.test(source)) throw new Error(`Missing service section: ${home}`);
    source = source.replace(pattern, () => section);
    if (lang === 'ko') source = source
      .replace('<strong>두 전문 분야</strong>제품개발·프레스금형 엔지니어링', '<strong>세 전문 분야</strong>제품·기계설계 / 구조·열해석 / 프레스금형설계')
      .replace('제품개발과 프레스금형, 두 가지 전문 영역을 지원하는 실무형 엔지니어링', '제품·기계설계, 구조·열해석, 프레스금형설계를 지원하는 실무형 엔지니어링')
      .replace(/<h1>제품개발과 프레스금형,[\s\S]*?<\/h1>/, '<h1>설계·해석 전문 엔지니어링<br><span class="hero-subtitle">제작까지 고려하여 아이디어를 완성합니다</span></h1>');
    else source = source
      .replace('<strong>二つの専門分野</strong>製品開発・プレス金型エンジニアリング', '<strong>3つの専門分野</strong>製品・機械設計 / 構造・熱解析 / プレス金型設計')
      .replace('製品開発とプレス金型、二つの専門分野を支援する実務型エンジニアリング', '製品・機械設計、構造・熱解析、プレス金型設計に対応する実務型エンジニアリング')
      .replace(/<h1>製品開発とプレス金型、[\s\S]*?<\/h1>/, '<h1>設計・解析の専門エンジニアリング<br><span class="hero-subtitle">製作まで考慮し、アイデアを形にします</span></h1>');
    return source;
  });
  // Keep the forming page available through its parent service without moving any data.
  save(`${copy.base ? 'ja/' : ''}services/press-die-design/index.html`, source => {
    const marker = '<section class="service-section about">';
    const section = lang === 'ko'
      ? '<section class="service-section"><div class="wrap"><div class="section-kicker">Forming Analysis</div><h2>박판성형해석까지 함께 검토합니다</h2><p>프레스금형설계의 성형성 검토 업무로 소재 유동, 파단·주름, 두께 변화와 스프링백을 확인합니다.</p><a class="more" href="/services/sheet-metal-forming-analysis/">박판성형해석 업무 자세히 보기 →</a></div></section>\n  '
      : '<section class="service-section"><div class="wrap"><div class="section-kicker">Forming Analysis</div><h2>薄板成形解析まで連携して検討します</h2><p>プレス金型設計の成形性検討として、材料流動、破断・しわ、板厚変化とスプリングバックを確認します。</p><a class="more" href="/ja/services/sheet-metal-forming-analysis/">薄板成形解析の詳細を見る →</a></div></section>\n  ';
    if (!source.includes(marker)) throw new Error('Missing related section');
    return source.replace(marker, () => section + marker);
  });
}
save('assets/language.js', source => {
  const mobileStart = '<a href="${serviceRoot}/press-die-design/">${mobileLabels.press}</a><a href="${serviceRoot}/sheet-metal-forming-analysis/">${mobileLabels.forming}</a><a href="${serviceRoot}/structural-analysis/">${mobileLabels.structural}</a><a href="${serviceRoot}/product-design/">${mobileLabels.product}</a>';
  if (!source.includes(mobileStart)) throw new Error('Missing mobile service markup');
  return source.replace(mobileStart, '<a href="${serviceRoot}/product-design/">${mobileLabels.product}</a><a href="${serviceRoot}/structural-analysis/">${mobileLabels.structural}</a><a href="${serviceRoot}/press-die-design/">${mobileLabels.press}</a>');
});
// Refresh shared scripts on existing public pages and future administrator-generated pages.
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    if (entry.isDirectory()) return ['tmp', '.git', 'node_modules', 'inquiries', 'data'].includes(entry.name) ? [] : walk(path.join(dir, entry.name));
    return /\.(?:html|js)$/.test(entry.name) && !/backup/.test(entry.name) ? [path.relative(root, path.join(dir, entry.name))] : [];
  });
}
for (const file of walk(root)) save(file, source => source
  .replace(/(\/assets\/(?:site|language)\.js\?v=)[\w.-]+/g, '$120261126-3services')
  .replace(/(\/assets\/home-service-mobile\.css\?v=)[\w.-]+/g, '$120261126-3services'));
fs.writeFileSync(path.join(backupRoot, 'changed-files.json'), JSON.stringify(changed, null, 2));
console.log(JSON.stringify({changedCount: changed.length, files: changed}, null, 2));
