const fs = require('fs');
const path = require('path');
const root = process.cwd();
const pages = ['assets/portfolio', 'ja/assets/portfolio'].flatMap(dir => fs.readdirSync(dir, {recursive:true}).filter(p => p.endsWith('portfolio.html')).map(p => path.join(dir,p)));
const edits = [];
for (const file of pages) {
  let html = fs.readFileSync(file,'utf8');
  const pattern = /<section><div class="wrap detail-grid">(<div class="detail-img"[^>]*><\/div>)(<div class="detail-box">[\s\S]*?)<\/div><\/section>\s*<section class="about"><div class="wrap"><div class="section-head">[\s\S]*?<p class="section-desc">([\s\S]*?)<\/p><\/div><div class="gallery">([\s\S]*?)<\/div><\/div><\/section>/;
  if (!pattern.test(html)) throw new Error('Unrecognized layout: '+file);
  html = html.replace(pattern, (_, main, box, note, gallery) => {
    const src = main.match(/url\(['"]?(.*?)['"]?\)/)[1];
    const seen = new Set([src]);
    gallery = gallery.replace(/<img\b[^>]*>/g, tag => {
      const imageSrc = tag.match(/src="([^"]+)"/)[1];
      if (seen.has(imageSrc)) return '';
      seen.add(imageSrc);
      return tag.replace('<img ', '<img loading="lazy" ');
    });
    const title = html.match(/<h1>(.*?)<\/h1>/)[1];
    main = main.replace('class="detail-img"', `class="detail-img" role="img" aria-label="${title}"`);
    return `<section><div class="wrap detail-grid portfolio-detail"><div class="portfolio-media">${main}<div class="gallery">${gallery}</div><p class="portfolio-image-note">${note}</p></div>${box}</div></section>`;
  });
  html = html.replace('</head>', '<link rel="stylesheet" href="/assets/portfolio-detail.css?v=20260914-1">\n</head>');
  edits.push([file,html]);
}
const adminFile = 'local-admin/portfolio-admin.html';
let admin = fs.readFileSync(adminFile,'utf8');
admin = admin.replaceAll('16:9 또는 4:3, 최소 1200px 폭을 권장합니다.', '권장 가로:세로 비율은 4:3, 권장 크기는 640×480px입니다. 다른 비율도 잘리지 않고 여백 안에 표시됩니다.');
admin = admin.replace('3~6장 정도가 적당합니다.', '권장 가로:세로 비율은 4:3, 권장 크기는 640×480px입니다. 다른 비율도 원본 비율을 유지합니다. 3~6장 정도가 적당합니다.');
admin = admin.replace('<p>목록 대표 이미지와 상세페이지에 표시할 추가 이미지를 관리합니다.</p>', '<p>목록 대표 이미지와 상세페이지에 표시할 추가 이미지를 관리합니다.</p><p class="hint">상세페이지 사진은 최대 320px 너비로 표시되며 클릭 확대는 제공하지 않습니다. 등록 전 고객사명·치수·민감한 해석 정보가 포함되어 있는지 확인하세요. 표시 크기를 줄여도 업로드한 원본 파일은 그대로 유지됩니다.</p>');
admin = admin.replace('const gallery = galleryPaths.map(', 'const gallery = [...new Set(removeMainPath(galleryPaths, mainPath))].map(');
admin = admin.replace('`<img src="/${escapeHtml(path)}"', '`<img loading="lazy" src="/${escapeHtml(path)}"');
admin = admin.replace('  ${isJapanese ? \'<link rel="stylesheet" href="/assets/ja.css">\' : ""}', '  ${isJapanese ? \'<link rel="stylesheet" href="/assets/ja.css">\' : ""}\n  <link rel="stylesheet" href="/assets/portfolio-detail.css?v=20260914-1">');
admin = admin.replace('<div class="wrap detail-grid"><div class="detail-img" style="background-image:url(\'/${escapeHtml(mainPath)}\')"></div><div class="detail-box">', '<div class="wrap detail-grid portfolio-detail"><div class="portfolio-media"><div class="detail-img" role="img" aria-label="${escapeHtml(data.title)}" style="background-image:url(\'/${escapeHtml(mainPath)}\')"></div><div class="gallery">${gallery}</div><p class="portfolio-image-note">${labels.security}</p></div><div class="detail-box">');
admin = admin.replace(/  <section class="about"><div class="wrap"><div class="section-head"><div><div class="section-kicker">Project Images<\/div><h2 class="section-title">\$\{labels.images\}<\/h2><\/div><p class="section-desc">\$\{labels.security\}<\/p><\/div><div class="gallery">\$\{gallery\}<\/div><\/div><\/section>\r?\n/, '');
if (!admin.includes('portfolio-detail"><div class="portfolio-media">') || admin.includes('Project Images')) throw new Error('Admin transformation incomplete');
edits.push([adminFile,admin]);
for (const [file, text] of edits) {
  const backup = path.join('tmp/portfolio-layout-backup', file);
  fs.mkdirSync(path.dirname(backup), {recursive:true});
  fs.copyFileSync(file, backup);
  fs.writeFileSync(file,text,'utf8');
}
console.log(`Updated ${pages.length} portfolio pages and admin template; backups in tmp/portfolio-layout-backup`);
