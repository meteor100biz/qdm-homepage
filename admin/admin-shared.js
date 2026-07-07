(function () {
  const DB_NAME = "qdm-local-admin";
  const STORE_NAME = "handles";
  const ROOT_KEY = "homepage-root";

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
