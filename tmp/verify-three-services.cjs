const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'tmp/three-services-preview');
fs.mkdirSync(out, {recursive: true});
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({headless:true, channel:'msedge'});
    const page = await browser.newPage();
    const errors = [], missing = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname); });
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    const summary = [];
    for (const lang of ['ko', 'ja']) {
      const base = lang === 'ko' ? '' : '/ja';
      const labels = lang === 'ko' ? ['제품·기계설계','구조·열해석','프레스금형설계'] : ['製品・機械設計','構造・熱解析','プレス金型設計'];
      for (const width of [1440, 900, 720, 390]) {
        await page.setViewportSize({width, height:1000});
        await page.goto(origin + base + '/', {waitUntil:'networkidle'});
        const cards = page.locator('.three-service-pillars .service-pillar');
        assert.deepEqual(await cards.locator('h3').allTextContents(), labels);
        assert.equal(await cards.count(), 3);
        const boxes = await cards.evaluateAll(nodes => nodes.map(n => {const r = n.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width};}));
        assert.ok(width > 720 ? boxes.every(b=>Math.abs(b.y-boxes[0].y)<1) : boxes.every(b=>Math.abs(b.x-boxes[0].x)<1));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth), false, `${lang} overflow at ${width}`);
        assert.equal(await cards.locator('img').evaluateAll(nodes=>nodes.filter(n=>!n.complete || !n.naturalWidth).length),0);
        if (width > 720) {
          const menu = page.locator('.menu-dropdown').filter({has:page.locator('.menu-dropdown-panel a[href*="/services/product-design/"]')});
          await menu.locator('.menu-dropdown-trigger').hover();
          assert.deepEqual(await menu.locator('[role="menuitem"]:not(.menu-dropdown-all)').allTextContents(), labels);
          await menu.locator('.menu-dropdown-panel').waitFor({state:'visible'});
          await page.waitForFunction(()=>getComputedStyle(document.querySelector('.menu-dropdown-panel')).opacity==='1');
          if (width === 1440) {
            await page.screenshot({path:path.join(out,`${lang}-desktop-menu.png`)});
            await page.mouse.move(0,0);
            await page.waitForFunction(()=>getComputedStyle(document.querySelector('.menu-dropdown-panel')).visibility==='hidden');
            await page.locator('.services-overview').screenshot({path:path.join(out,`${lang}-services-desktop.png`)});
          }
        } else {
          await page.locator('.qdm-mobile-menu-button').click();
          await page.waitForFunction(()=>getComputedStyle(document.querySelector('.qdm-mobile-menu-panel')).opacity==='1');
          assert.deepEqual(await page.locator('.qdm-mobile-service-group:not(.qdm-mobile-resource-group) > a[href*="/services/"]').allTextContents(),labels);
          if(width === 390)await page.screenshot({path:path.join(out,`${lang}-mobile-menu.png`)});
          await page.locator('.qdm-mobile-menu-button').click();
          await page.waitForFunction(()=>getComputedStyle(document.querySelector('.qdm-mobile-menu-panel')).visibility==='hidden');
          if(width === 390)await page.locator('.services-overview').screenshot({path:path.join(out,`${lang}-services-mobile.png`)});
        }
        summary.push(`${lang} ${width}px: 3 cards, 3 menu fields, images loaded, no overflow`);
      }
      await page.setViewportSize({width:1440,height:1000});
      for (const service of ['product-design','structural-analysis','press-die-design','sheet-metal-forming-analysis']) {
        await page.goto(`${origin}${base}/services/${service}/`,{waitUntil:'networkidle'});
        assert.deepEqual(await page.locator('.service-nav a').allTextContents(),labels);
        assert.equal(await page.locator('.menu-dropdown-panel a[href*="sheet-metal-forming-analysis"]').count(),0);
        if(service === 'press-die-design') assert.ok(await page.locator('main a[href$="/services/sheet-metal-forming-analysis/"]').count()>0);
      }
      await page.goto(`${origin}${base}/portfolio.html?category=press`,{waitUntil:'networkidle'});
      assert.deepEqual(await page.locator('.service-directory-grid strong').allTextContents(),labels);
      const published = JSON.parse(fs.readFileSync(path.join(root,`data/${lang==='ja'?'ja/':''}portfolios.json`),'utf8')).filter(p=>p.published!==false);
      assert.equal(await page.locator('#portfolioList .project').count(),published.filter(p=>['press-die','forming'].includes(p.category)).length);
      await page.locator('#portfolioTabs [data-category="forming"]').click();
      assert.equal(await page.locator('#portfolioList .project').count(),published.filter(p=>p.category==='forming').length);
      await page.goto(`${origin}${base}/`,{waitUntil:'networkidle'});
      for (const href of await page.locator('.three-service-pillars a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))) {
        const response = await page.request.get(origin+href);
        assert.equal(response.status(),200,href);
      }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({summary,errors,missing:[...new Set(missing)]},null,2));
    console.log(JSON.stringify({summary,errors,missing:[...new Set(missing)],screenshots:out},null,2));
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
