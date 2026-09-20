(function () {
  const DB_NAME = "qdm-local-admin";
  const STORE_NAME = "handles";
  const ROOT_KEY = "homepage-root";

  function installAdminNavigation() {
    if (document.querySelector(".qdm-admin-sidebar")) return;
    const fileName = location.pathname.split("/").pop() || "index.html";
    const isJapanesePortfolio = fileName === "portfolio-admin.html" && new URLSearchParams(location.search).get("lang") === "ja";
    const items = [
      { label: "메인 홈페이지 수정", href: "home-admin.html", active: fileName === "home-admin.html" || fileName === "hero-admin.html" },
      { label: "회사소개 수정", href: "about-admin.html", active: fileName === "about-admin.html" },
      { label: "포트폴리오 수정", href: "portfolio-admin.html", active: fileName === "portfolio-admin.html" && !isJapanesePortfolio },
      { label: "블로그 수정", href: "blog-admin.html", active: fileName === "blog-admin.html" },
      { label: "일본어 포트폴리오 수정", href: "portfolio-admin.html?lang=ja", active: isJapanesePortfolio },
      { label: "일본어 기술 블로그 수정", href: "ja-blog-admin.html", active: fileName === "ja-blog-admin.html" },
      { label: "검색 노출 관리", href: "seo-admin.html", active: fileName === "seo-admin.html" },
      { label: "문의·견적 요청 관리", href: "index.html", active: fileName === "index.html" }
    ];
    const style = document.createElement("style");
    style.textContent = `
      body.qdm-admin-shell{min-height:100vh;padding-left:262px!important;background:#f3f6fb!important}
      .qdm-admin-sidebar{position:fixed;inset:0 auto 0 0;z-index:1000;width:262px;padding:30px 20px;overflow-y:auto;background:#082e68;color:#fff;box-shadow:8px 0 24px rgba(6,31,73,.08)}
      .qdm-admin-brand{display:block;margin-bottom:30px;color:#fff;text-decoration:none}
      .qdm-admin-brand strong{display:block;font-size:27px;line-height:1.1;letter-spacing:-1px}
      .qdm-admin-brand span{display:block;margin-top:8px;color:#f2b762;font-size:12px;font-weight:900;letter-spacing:.22em}
      .qdm-admin-nav{display:grid;gap:10px}
      .qdm-admin-nav a{display:flex;align-items:center;min-height:44px;padding:9px 13px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font-size:14px;font-weight:900;line-height:1.35;transition:background .16s ease,border-color .16s ease,color .16s ease,transform .16s ease}
      .qdm-admin-nav a:hover,.qdm-admin-nav a:focus-visible{border-color:rgba(255,255,255,.55);background:rgba(255,255,255,.15);outline:none;transform:translateX(2px)}
      .qdm-admin-nav a.active{border-color:#fff;background:#fff;color:#082e68;box-shadow:0 8px 20px rgba(0,0,0,.12)}
      .qdm-admin-side-note{margin:28px 2px 0;color:#d9e6f8;font-size:12px;font-weight:700;line-height:1.7}
      .qdm-admin-side-note strong{display:block;margin-bottom:4px;color:#f2b762;font-size:11px;letter-spacing:.14em}
      body.qdm-admin-shell>header{width:auto!important}
      @media(max-width:900px){
        body.qdm-admin-shell{padding-left:0!important}
        .qdm-admin-sidebar{position:relative;width:100%;padding:18px}
        .qdm-admin-brand{margin-bottom:16px}.qdm-admin-brand strong{font-size:23px}
        .qdm-admin-nav{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
        .qdm-admin-nav a{flex:0 0 auto;white-space:nowrap}
        .qdm-admin-side-note{display:none}
      }
    `;
    document.head.appendChild(style);
    const sidebar = document.createElement("aside");
    sidebar.className = "qdm-admin-sidebar";
    sidebar.setAttribute("aria-label", "로컬 관리자 대분류 메뉴");
    sidebar.innerHTML = `<a class="qdm-admin-brand" href="index.html"><strong>QDM</strong><span>LOCAL ADMIN</span></a><nav class="qdm-admin-nav">${items.map((item) => `<a href="${item.href}"${item.active ? ' class="active" aria-current="page"' : ""}>${item.label}</a>`).join("")}</nav><div class="qdm-admin-side-note"><strong>LOCAL ONLY</strong>저장한 홈페이지 파일과 문의 자료는 이 PC의 관리자 폴더에 보관됩니다.</div>`;
    document.body.classList.add("qdm-admin-shell");
    document.body.prepend(sidebar);
  }

  installAdminNavigation();

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function setValue(key, value) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function getValue(key) {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  }

  async function ensurePermission(handle, mode = "readwrite") {
    if (!handle) return false;
    const options = { mode };
    if ((await handle.queryPermission(options)) === "granted") return true;
    return (await handle.requestPermission(options)) === "granted";
  }

  async function pickAndSaveRoot() {
    if (!("showDirectoryPicker" in window)) {
      throw new Error("Chrome 또는 Edge 최신 버전에서 열어주세요.");
    }
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    if (!(await ensurePermission(handle))) throw new Error("폴더 쓰기 권한이 필요합니다.");
    await setValue(ROOT_KEY, handle);
    return handle;
  }

  async function loadSavedRoot() {
    const handle = await getValue(ROOT_KEY);
    if (!handle) return null;
    if (!(await ensurePermission(handle))) return null;
    return handle;
  }

  window.QdmAdminStorage = {
    pickAndSaveRoot,
    loadSavedRoot,
    ensurePermission
  };
})();
