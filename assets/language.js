(() => {
  const path = location.pathname || "/";
  const quotationPage = /^\/resources\/press-die-quotation\/?$/.test(path);
  const requestedLanguage = quotationPage ? new URLSearchParams(location.search).get("lang") : "";
  const isJapanese = document.documentElement.lang.toLowerCase().startsWith("ja") || requestedLanguage === "ja";
  const alternateUrl = (language) => {
    const alternate = document.querySelector(`link[rel="alternate"][hreflang="${language}"]`);
    if (!alternate?.href) return "";
    try {
      const url = new URL(alternate.href, location.href);
      return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
    } catch {
      return "";
    }
  };
  const quotationLanguagePath = (language) => {
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    return `${url.pathname}${url.search}${url.hash}`;
  };
  const fallbackKoreanPath = quotationPage ? quotationLanguagePath("ko") : (isJapanese ? (path.replace(/^\/ja(?=\/|$)/, "") || "/") : path);
  const fallbackJapanesePath = quotationPage ? quotationLanguagePath("ja") : (isJapanese ? path : (path === "/" || path === "/index.html" ? "/ja/" : `/ja${path.startsWith("/") ? path : `/${path}`}`));
  const koreanPath = alternateUrl("ko") || fallbackKoreanPath;
  const japanesePath = alternateUrl("ja") || fallbackJapanesePath;
  const nav = document.querySelector(".menu");

  const groupedCopy = isJapanese ? {
    full: "プレス金型設計・薄板成形解析・構造解析・製品設計",
    legacyFull: "製品設計・構造解析・薄板成形解析・プレス金型設計",
    mechanical: "構造解析・製品設計",
    separator: "・",
    press: "プレス金型設計・薄板成形解析"
  } : {
    full: "프레스금형설계.박판성형해석.구조해석.제품설계",
    legacyFull: "제품설계.구조해석.박판성형해석.프레스금형설계",
    mechanical: "구조해석 . 제품설계",
    separator: " . ",
    press: "프레스금형설계 . 박판성형해석"
  };
  const groupedMarkup = `<span class="qdm-service-group press">${groupedCopy.press}</span><span class="qdm-service-separator">${groupedCopy.separator}</span><span class="qdm-service-group mechanical">${groupedCopy.mechanical}</span>`;
  document.querySelectorAll(".tagline").forEach((tagline) => {
    const firstLine = (tagline.childNodes[0]?.textContent || "").trim();
    if (firstLine !== groupedCopy.full && firstLine !== groupedCopy.legacyFull) return;
    const br = tagline.querySelector("br");
    const secondLine = br ? [...tagline.childNodes].slice([...tagline.childNodes].indexOf(br) + 1).map((node) => node.textContent).join("").trim() : "";
    tagline.innerHTML = `${groupedMarkup}${secondLine ? `<br><span class="qdm-tagline-en">${secondLine}</span>` : ""}`;
  });
  const footerCopy = document.querySelector(".footer .footer-inner > div:first-child");
  if ([groupedCopy.full, groupedCopy.legacyFull].includes(footerCopy?.textContent.trim())) footerCopy.innerHTML = groupedMarkup;

  const topbarNav = document.querySelector(".topbar .nav");
  if (topbarNav && !topbarNav.querySelector(".qdm-mobile-menu")) {
    const mobileMenu = document.createElement("div");
    mobileMenu.className = "qdm-mobile-menu";
    const serviceRoot = isJapanese ? "/ja/services" : "/services";
    const homeRoot = isJapanese ? "/ja/" : "/";
    const aboutRoot = isJapanese ? "/ja/about/" : "/about/";
    const desktopAbout = topbarNav.querySelector(".menu > a.hide-sm");
    if (desktopAbout) desktopAbout.href = aboutRoot;
    const mobileLabels = isJapanese ? {
      open: "メニューを開く", close: "メニューを閉じる", company: "会社案内", services: "サービス", press: "プレス金型設計", forming: "薄板成形解析", structural: "構造解析", product: "製品設計", portfolio: "全実績を見る", blog: "技術ブログ", contact: "お問い合わせ", phone: "電話する"
    } : {
      open: "메뉴 열기", close: "메뉴 닫기", company: "회사소개", services: "서비스", press: "프레스금형설계", forming: "박판성형해석", structural: "구조해석", product: "제품설계", portfolio: "전체 포트폴리오 보기", blog: "기술블로그", contact: "문의하기", phone: "전화하기"
    };
    mobileMenu.innerHTML = `<button class="qdm-mobile-menu-button" type="button" aria-expanded="false" aria-controls="qdm-mobile-menu-panel" aria-label="${mobileLabels.open}"><span></span><span></span><span></span></button><nav class="qdm-mobile-menu-panel" id="qdm-mobile-menu-panel" aria-label="${isJapanese ? "モバイルメニュー" : "모바일 메뉴"}"><a href="${homeRoot}#about">${mobileLabels.company}</a><div class="qdm-mobile-service-group"><strong>${mobileLabels.services}</strong><a href="${serviceRoot}/press-die-design/">${mobileLabels.press}</a><a href="${serviceRoot}/sheet-metal-forming-analysis/">${mobileLabels.forming}</a><a href="${serviceRoot}/structural-analysis/">${mobileLabels.structural}</a><a href="${serviceRoot}/product-design/">${mobileLabels.product}</a><a href="${isJapanese ? "/ja/portfolio.html" : "/portfolio.html"}">${mobileLabels.portfolio}</a></div><a href="${isJapanese ? "/ja/blog.html" : "/#blog"}">${mobileLabels.blog}</a><a href="${homeRoot}#contact">${mobileLabels.contact}</a><a href="tel:07080646621">☎ ${mobileLabels.phone}</a><div class="qdm-mobile-language"><a href="${koreanPath}" data-language="ko">한국어</a><span aria-hidden="true">/</span><a href="${japanesePath}" data-language="ja">日本語</a></div></nav>`;
    mobileMenu.querySelector(".qdm-mobile-menu-panel > a")?.setAttribute("href", aboutRoot);
    const button = mobileMenu.querySelector(".qdm-mobile-menu-button");
    const panel = mobileMenu.querySelector(".qdm-mobile-menu-panel");
    const setMobileMenu = (open) => {
      mobileMenu.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? mobileLabels.close : mobileLabels.open);
    };
    button.addEventListener("click", () => setMobileMenu(!mobileMenu.classList.contains("is-open")));
    panel.addEventListener("click", (event) => { if (event.target.closest("a")) setMobileMenu(false); });
    document.addEventListener("pointerdown", (event) => { if (!mobileMenu.contains(event.target)) setMobileMenu(false); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && mobileMenu.classList.contains("is-open")) { setMobileMenu(false); button.focus(); } });
    mobileMenu.querySelectorAll("[data-language]").forEach((link) => link.addEventListener("click", () => localStorage.setItem("qdm-language", link.dataset.language)));
    topbarNav.append(mobileMenu);
  }

  const serviceDropdowns = [...document.querySelectorAll(".menu-dropdown")];
  const closeServiceDropdowns = (except = null) => {
    serviceDropdowns.forEach((dropdown) => {
      if (dropdown === except) return;
      dropdown.classList.remove("is-open");
      dropdown.querySelector(".menu-dropdown-trigger")?.setAttribute("aria-expanded", "false");
      if (dropdown.contains(document.activeElement)) document.activeElement?.blur();
    });
  };
  serviceDropdowns.forEach((dropdown, index) => {
    const trigger = dropdown.querySelector(".menu-dropdown-trigger");
    const panel = dropdown.querySelector(".menu-dropdown-panel");
    if (!trigger || !panel) return;
    if (!panel.id) panel.id = `service-menu-${index + 1}`;
    trigger.setAttribute("aria-controls", panel.id);
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("pointerdown", (event) => { dropdown.dataset.lastPointer = event.pointerType || ""; });
    trigger.addEventListener("click", (event) => {
      const touchInput = dropdown.dataset.lastPointer === "touch" || dropdown.dataset.lastPointer === "pen" || matchMedia("(hover: none), (pointer: coarse)").matches;
      if (!touchInput) return;
      event.preventDefault();
      const willOpen = !dropdown.classList.contains("is-open");
      closeServiceDropdowns(dropdown);
      dropdown.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      if (!willOpen) trigger.blur();
    });
    panel.addEventListener("click", () => {
      dropdown.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".menu-dropdown")) closeServiceDropdowns();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openDropdown = document.querySelector(".menu-dropdown.is-open");
    if (!openDropdown) return;
    const trigger = openDropdown.querySelector(".menu-dropdown-trigger");
    closeServiceDropdowns();
    trigger?.focus();
  });

  if (nav && !nav.querySelector(".language-switch")) {
    const switcher = document.createElement("span");
    switcher.className = "language-switch";
    switcher.setAttribute("aria-label", isJapanese ? "言語選択" : "언어 선택");
    switcher.innerHTML = `<a href="${koreanPath}" data-language="ko" class="${isJapanese ? "" : "active"}">한국어</a><span aria-hidden="true">/</span><a href="${japanesePath}" data-language="ja" class="${isJapanese ? "active" : ""}">日本語</a>`;
    const phone = nav.querySelector(".phone");
    nav.insertBefore(switcher, phone || null);
    switcher.querySelectorAll("[data-language]").forEach((link) => link.addEventListener("click", () => localStorage.setItem("qdm-language", link.dataset.language)));
  }
  if (!isJapanese && (path === "/" || path === "/index.html") && !localStorage.getItem("qdm-language") && /^ja\b/i.test(navigator.language || "")) {
    const notice = document.createElement("div");
    notice.className = "language-notice";
    notice.innerHTML = `<span>日本語サイトをご覧になりますか？</span><a href="/ja/" data-language="ja">日本語サイトへ</a><button type="button" aria-label="닫기">×</button>`;
    document.body.appendChild(notice);
    notice.querySelector("a").addEventListener("click", () => localStorage.setItem("qdm-language", "ja"));
    notice.querySelector("button").addEventListener("click", () => { localStorage.setItem("qdm-language", "ko"); notice.remove(); });
  }
  const style = document.createElement("style");
  style.textContent = `.topbar .nav{gap:16px}.topbar .brand{min-width:0;gap:12px}.topbar .tagline{flex:0 0 auto;white-space:nowrap;font-size:11px;line-height:1.35}.topbar .menu{flex:0 0 auto;gap:18px;flex-wrap:nowrap;white-space:nowrap}.topbar .menu>a{flex:0 0 auto;white-space:nowrap}.qdm-service-group.mechanical{color:#174f87}.qdm-service-group.press{color:#91551c}.qdm-service-separator{color:#64748b}.footer .qdm-service-group.mechanical{color:#8eb8ff}.footer .qdm-service-group.press{color:#f0b46c}.footer .qdm-service-separator{color:#94a3b8}.language-switch{display:inline-flex;flex:0 0 auto;align-items:center;gap:5px;padding:6px 9px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#64748b;font-size:12px;font-weight:800;white-space:nowrap}.language-switch a{color:#64748b}.language-switch a.active{color:#06306f}.language-switch a:hover{text-decoration:underline}.language-notice{position:fixed;right:22px;bottom:22px;z-index:50;display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid #c7d7fe;border-radius:12px;background:#fff;color:#172033;box-shadow:0 16px 40px rgba(15,35,68,.2);font-weight:800}.language-notice a{padding:8px 12px;border-radius:7px;background:#06306f;color:#fff}.language-notice button{border:0;background:transparent;color:#64748b;font-size:22px;cursor:pointer}@media(min-width:721px) and (max-width:1100px){.topbar .nav{gap:12px}.topbar .menu{gap:14px}.topbar .tagline{font-size:10px}.topbar .phone{display:none}}@media(min-width:721px) and (max-width:850px){.topbar .tagline{display:none}}@media(max-width:720px){.topbar .menu{flex-wrap:nowrap;justify-content:flex-end}.language-switch{padding:5px 7px}.language-notice{left:14px;right:14px;bottom:14px;justify-content:center;flex-wrap:wrap}}`;
  document.head.appendChild(style);
  const dropdownStyle = document.createElement("style");
  dropdownStyle.textContent = `.menu-dropdown.is-open .menu-dropdown-trigger{color:var(--blue2)}.menu-dropdown.is-open .menu-dropdown-trigger:after{transform:scaleX(1)}.menu-dropdown.is-open .menu-dropdown-arrow{transform:rotate(180deg)}.menu-dropdown.is-open .menu-dropdown-panel{opacity:1;visibility:visible;transform:translate(-50%,0)}.qdm-mobile-menu{display:none;position:relative;flex:0 0 auto}.qdm-mobile-menu-button{width:48px;height:48px;padding:0;border:1px solid #cbd5e1;border-radius:10px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:0 7px 18px rgba(15,35,68,.1);cursor:pointer}.qdm-mobile-menu-button span{width:25px;height:3px;border-radius:999px;background:var(--blue);transform-origin:center;transition:transform .2s ease,opacity .2s ease}.qdm-mobile-menu.is-open .qdm-mobile-menu-button span:nth-child(1){transform:translateY(9px) rotate(45deg)}.qdm-mobile-menu.is-open .qdm-mobile-menu-button span:nth-child(2){opacity:0}.qdm-mobile-menu.is-open .qdm-mobile-menu-button span:nth-child(3){transform:translateY(-9px) rotate(-45deg)}.qdm-mobile-menu-panel{position:absolute;top:calc(100% + 8px);right:0;z-index:80;width:min(320px,calc(100vw - 36px));max-height:calc(100vh - 92px);padding:10px;overflow-y:auto;border:1px solid #d7e0ed;border-radius:13px;background:#fff;box-shadow:0 20px 46px rgba(15,35,68,.22);opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .18s ease,visibility .18s ease,transform .18s ease}.qdm-mobile-menu.is-open .qdm-mobile-menu-panel{opacity:1;visibility:visible;transform:translateY(0)}.qdm-mobile-menu-panel>a,.qdm-mobile-service-group>a{display:block;padding:11px 12px;border-radius:8px;color:#172033;font-size:14px;font-weight:900;line-height:1.35}.qdm-mobile-menu-panel a:active,.qdm-mobile-menu-panel a:focus-visible{background:#eef5ff;outline:none}.qdm-mobile-service-group{margin:5px 0;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.qdm-mobile-service-group strong{display:block;padding:3px 4px 7px;color:#64748b;font-size:12px;letter-spacing:.08em}.qdm-mobile-service-group a{padding:9px}.qdm-mobile-service-group a:is([href*="press-die-design"],[href*="sheet-metal-forming-analysis"]){color:var(--press-color)}.qdm-mobile-service-group a:is([href*="structural-analysis"],[href*="product-design"]){color:var(--product-color)}.qdm-mobile-language{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:6px;padding:11px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:900}.qdm-mobile-language a{color:var(--blue)}@media(max-width:720px){.topbar .nav{position:relative;align-items:center}.topbar .menu{display:none!important}.qdm-mobile-menu{display:block}.topbar .brand{max-width:calc(100% - 62px)}}`;
  document.head.appendChild(dropdownStyle);
})();
