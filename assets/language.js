(() => {
  const isJapanese = document.documentElement.lang.toLowerCase().startsWith("ja");
  const path = location.pathname || "/";
  const koreanPath = isJapanese ? (path.replace(/^\/ja(?=\/|$)/, "") || "/") : path;
  const japanesePath = isJapanese ? path : (path === "/" || path === "/index.html" ? "/ja/" : `/ja${path.startsWith("/") ? path : `/${path}`}`);
  const nav = document.querySelector(".menu");

  const groupedCopy = isJapanese ? {
    full: "製品設計・構造解析・薄板成形解析・プレス金型設計",
    mechanical: "製品設計・構造解析",
    separator: "・",
    press: "薄板成形解析・プレス金型設計"
  } : {
    full: "제품설계.구조해석.박판성형해석.프레스금형설계",
    mechanical: "제품설계 . 구조해석",
    separator: " . ",
    press: "박판성형해석 . 프레스금형설계"
  };
  const groupedMarkup = `<span class="qdm-service-group mechanical">${groupedCopy.mechanical}</span><span class="qdm-service-separator">${groupedCopy.separator}</span><span class="qdm-service-group press">${groupedCopy.press}</span>`;
  document.querySelectorAll(".tagline").forEach((tagline) => {
    const firstLine = (tagline.childNodes[0]?.textContent || "").trim();
    if (firstLine !== groupedCopy.full) return;
    const br = tagline.querySelector("br");
    const secondLine = br ? [...tagline.childNodes].slice([...tagline.childNodes].indexOf(br) + 1).map((node) => node.textContent).join("").trim() : "";
    tagline.innerHTML = `${groupedMarkup}${secondLine ? `<br><span class="qdm-tagline-en">${secondLine}</span>` : ""}`;
  });
  const footerCopy = document.querySelector(".footer .footer-inner > div:first-child");
  if (footerCopy?.textContent.trim() === groupedCopy.full) footerCopy.innerHTML = groupedMarkup;

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
})();
