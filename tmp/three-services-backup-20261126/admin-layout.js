(function (global) {
  const defaults = {
    phoneTel: "07080646621",
    phoneDisplayKo: "070-8064-6621",
    phoneDisplayJa: "+82-70-8064-6621",
    ko: { tagline: "제품설계.구조해석.박판성형해석.프레스금형설계", taglineEn: "QUALITY-DRIVEN DESIGN & MANUFACTURING", footer: "제품설계.구조해석.박판성형해석.프레스금형설계", about: "회사소개", portfolio: "포트폴리오", blog: "기술블로그", contact: "문의하기" },
    ja: { tagline: "製品設計・構造解析・薄板成形解析・プレス金型設計", taglineEn: "QUALITY-DRIVEN DESIGN & MANUFACTURING", footer: "製品設計・構造解析・薄板成形解析・プレス金型設計", about: "会社案内", portfolio: "実績", blog: "技術ブログ", contact: "お問い合わせ" }
  };
  const assetVersions = { style: "20260816-3", language: "20261120-1" };

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function settings(value = {}) {
    return {
      ...defaults,
      ...value,
      ko: { ...defaults.ko, ...(value.ko || {}) },
      ja: { ...defaults.ja, ...(value.ja || {}) }
    };
  }

  function header(locale = "ko", value = {}) {
    const config = settings(value);
    const isJa = locale === "ja";
    const copy = isJa ? config.ja : config.ko;
    const home = isJa ? "/ja/" : "/";
    const about = isJa ? "/ja/about/" : "/about/";
    const portfolio = isJa ? "/ja/portfolio.html" : "/portfolio.html";
    const blog = isJa ? "/ja/blog.html" : "/blog.html";
    const phone = isJa ? config.phoneDisplayJa : config.phoneDisplayKo;
    const serviceRoot = isJa ? "/ja/services" : "/services";
    const serviceMenu = `<div class="menu-dropdown hide-sm"><a class="menu-dropdown-trigger" href="${serviceRoot}/press-die-design/" aria-haspopup="menu">${isJa ? "サービス" : "서비스"}<span class="menu-dropdown-arrow" aria-hidden="true">▾</span></a><div class="menu-dropdown-panel" role="menu"><a role="menuitem" href="${serviceRoot}/press-die-design/">${isJa ? "プレス金型設計" : "프레스금형설계"}</a><a role="menuitem" href="${serviceRoot}/sheet-metal-forming-analysis/">${isJa ? "薄板成形解析" : "박판성형해석"}</a><a role="menuitem" href="${serviceRoot}/structural-analysis/">${isJa ? "構造解析" : "구조해석"}</a><a role="menuitem" href="${serviceRoot}/product-design/">${isJa ? "製品設計" : "제품설계"}</a><a class="menu-dropdown-all" role="menuitem" href="${portfolio}">${isJa ? "全実績を見る" : "전체 포트폴리오 보기"}</a></div></div>`;
    const resourceMenu = isJa
      ? `<div class="menu-dropdown hide-sm"><a class="menu-dropdown-trigger" href="/ja/resources/press-die-quotation/" aria-haspopup="menu">資料室<span class="menu-dropdown-arrow" aria-hidden="true">▾</span></a><div class="menu-dropdown-panel resource-menu" role="menu"><a class="resource-primary" role="menuitem" href="/ja/resources/press-die-quotation/">プレス金型 見積書作成ツール</a><a class="resource-subitem" role="menuitem" href="/ja/resources/press-die-quotation/?tool=material">金型材料費算出</a><a class="resource-subitem" role="menuitem" href="/ja/resources/press-die-quotation/?tool=processing">加工費算出</a><a class="resource-primary resource-product" role="menuitem" href="/resources/press-product-quotation/">프레스 제품 견적서 작성기</a><a class="resource-primary resource-burring" role="menuitem" href="/ja/resources/press-process-calculators/">プレスバーリング（Burring）計算</a></div></div>`
      : `<div class="menu-dropdown hide-sm"><a class="menu-dropdown-trigger" href="/resources/press-die-quotation/" aria-haspopup="menu">자료실<span class="menu-dropdown-arrow" aria-hidden="true">▾</span></a><div class="menu-dropdown-panel resource-menu" role="menu"><a class="resource-primary" role="menuitem" href="/resources/press-die-quotation/">프레스금형 견적서 작성기</a><a class="resource-subitem" role="menuitem" href="/resources/press-die-quotation/?tool=material">금형소재 견적산출</a><a class="resource-subitem" role="menuitem" href="/resources/press-die-quotation/?tool=processing">가공비용 견적산출</a><a class="resource-primary resource-product" role="menuitem" href="/resources/press-product-quotation/">프레스 제품 견적서 작성기</a><a class="resource-primary resource-burring" role="menuitem" href="/resources/press-process-calculators/">프레스 버링(Burring) 계산</a></div></div>`;
    return `<header class="topbar"><div class="wrap nav"><a href="${home}" class="brand" aria-label="QDM home"><div class="logo">QDM</div><div class="tagline">${escapeHtml(copy.tagline)}<br>${escapeHtml(copy.taglineEn)}</div></a><nav class="menu" aria-label="${isJa ? "メインメニュー" : "주요 메뉴"}"><a class="hide-sm" href="${about}">${escapeHtml(copy.about)}</a>${serviceMenu}${resourceMenu}<a class="hide-sm" href="${blog}">${escapeHtml(copy.blog)}</a><a href="${home}#contact">${escapeHtml(copy.contact)}</a><a class="phone" href="tel:${escapeHtml(config.phoneTel)}">☎ ${escapeHtml(phone)}</a></nav></div></header>`;
  }

  function footer(locale = "ko", value = {}) {
    const config = settings(value);
    const copy = locale === "ja" ? config.ja : config.ko;
    return `<footer class="footer"><div class="wrap footer-inner"><div>${escapeHtml(copy.footer)}</div><div>© QDM. All rights reserved.</div></div></footer>`;
  }

  function overseasTrade() {
    return `<section class="overseas-trade" data-overseas-trade><span class="trade-kicker">OVERSEAS BUSINESS</span><strong>海外取引について</strong><p class="trade-intro">QDMは、日本企業からのプレス金型設計・薄板成形解析のご依頼に対応しています。</p><ul class="trade-support"><li>日本語によるメール・オンライン打ち合わせ・音声通話に対応</li><li>見積書・請求書（Invoice）を発行</li><li>図面・仕様書はフォームまたはメールで送付可能</li><li>必要に応じて秘密保持契約（NDA）に対応</li><li>韓国と日本の間に時差はありません</li></ul><div class="trade-flow" aria-label="海外取引の流れ"><div><b>1</b><span>お問い合わせ<br>資料送付</span></div><div><b>2</b><span>お見積り<br>業務範囲確認</span></div><div><b>3</b><span>ご発注<br>設計・解析</span></div><div><b>4</b><span>納品・請求書<br>海外送金</span></div></div></section>`;
  }

  function syncHtml(html, locale = "ko", value = {}) {
    let output = String(html || "");
    if (!/<header class="topbar">[\s\S]*?<\/header>/i.test(output)) throw new Error("공용화할 상단 영역을 찾지 못했습니다.");
    if (!/<footer class="footer">[\s\S]*?<\/footer>/i.test(output)) throw new Error("공용화할 하단 영역을 찾지 못했습니다.");
    output = output.replace(/<header class="topbar">[\s\S]*?<\/header>/i, header(locale, value));
    output = output.replace(/<footer class="footer">[\s\S]*?<\/footer>/i, footer(locale, value));
    if (/assets\/style\.css/i.test(output)) {
      output = output.replace(/(<link\b[^>]*href=["'])(?:\/)?assets\/style\.css(?:\?[^"']*)?(["'][^>]*>)/i, `$1/assets/style.css?v=${assetVersions.style}$2`);
    } else if (/<style\b/i.test(output)) {
      output = output.replace(/<style\b/i, `<link rel="stylesheet" href="/assets/style.css?v=${assetVersions.style}">\n<style`);
    } else {
      output = output.replace(/<\/head>/i, `<link rel="stylesheet" href="/assets/style.css?v=${assetVersions.style}">\n</head>`);
    }
    if (/assets\/language\.js/i.test(output)) {
      output = output.replace(/(<script\b[^>]*src=["'])(?:\/)?assets\/language\.js(?:\?[^"']*)?(["'][^>]*>)/i, `$1/assets/language.js?v=${assetVersions.language}$2`);
    } else {
      output = output.replace(/<\/body>/i, `<script src="/assets/language.js?v=${assetVersions.language}"></script></body>`);
    }
    return output;
  }

  global.QdmAdminLayout = { defaults, assetVersions, settings, header, footer, overseasTrade, syncHtml };
})(typeof window !== "undefined" ? window : globalThis);
