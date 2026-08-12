(() => {
  "use strict";

  const FORM_FORMAT = "qdm.press-die-quotation";
  const FORM_VERSION = 1;
  const DB_NAME = "qdm-local-tools";
  const STORE_NAME = "press-die-quotes";
  const form = document.getElementById("quoteForm");
  const itemsBody = document.getElementById("itemsBody");
  const materialsBody = document.getElementById("materialsBody");
  const materialDialog = document.getElementById("materialDialog");
  const status = document.getElementById("saveStatus");
  const savedQuotes = document.getElementById("savedQuotes");
  let currentId = crypto.randomUUID();
  let saveTimer;

  const DEFAULT_ITEMS = [
    ["금형 설계비", "공정검토 및 2D/3D 설계", 1, "식", 0],
    ["금형 소재비", "플레이트 및 주요 금형강", 1, "식", 0],
    ["표준부품비", "가이드·스프링·볼트 등", 1, "식", 0],
    ["기계가공비", "밀링·선반·연삭", 1, "식", 0],
    ["와이어·방전가공비", "와이어컷 및 방전", 1, "식", 0],
    ["열처리·표면처리비", "열처리 및 코팅", 1, "식", 0],
    ["조립·사상·트라이비", "조립, 사상 및 트라이", 1, "식", 0],
    ["검사·운송·기타", "측정, 검사, 포장 및 운송", 1, "식", 0]
  ];
  const DEFAULT_MATERIALS = [
    ["U-HOLDER", "S45C"],
    ["PUNCH BACK PLATE", "S45C"],
    ["PUNCH HOLDER", "S45C"],
    ["STRIPPER BACK PLATE", "S45C"],
    ["STRIPPER", "S45C"],
    ["DIE", "SKD11"],
    ["DIE BACK PLATE", "S45C"],
    ["L-HOLDER", "S45C"]
  ];
  const MATERIAL_DENSITY = { S45C: 7.85, SKD11: 7.85, STD11: 7.85 };

  function today(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  function defaultQuoteNumber() {
    return `PD-${today().replaceAll("-", "")}-001`;
  }

  function blankData() {
    return {
      id: crypto.randomUUID(),
      sellerCompany: "", sellerRepresentative: "", sellerBusinessNo: "", sellerContact: "",
      sellerAddress: "", sellerPhone: "", sellerEmail: "", buyerCompany: "", buyerContact: "",
      quoteNumber: defaultQuoteNumber(), quoteDate: today(), validUntil: today(30), delivery: "발주 후 협의",
      projectName: "", dieType: "단발금형", dieQuantity: 1, productMaterial: "", pressSpec: "",
      paymentTerms: "별도 협의", currency: "KRW", marginRate: 0, showMargin: true, vatMode: "excluded", includeMaterialPage: true,
      notes: "- 제품 또는 금형 사양 변경에 따른 추가 비용은 별도 협의합니다.\n- 납기와 트라이 범위는 발주 전 최종 협의합니다.",
      items: DEFAULT_ITEMS.map(([name, description, qty, unit, price]) => ({ id: crypto.randomUUID(), name, description, qty, unit, price })),
      materials: DEFAULT_MATERIALS.map(([name, grade]) => ({ id: crypto.randomUUID(), name, grade, x: 0, y: 0, t: 0, rawX: 0, rawY: 0, rawT: 0, qty: 1, unitPrice: 0 }))
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function number(value) {
    const result = Number(String(value ?? "").replaceAll(",", ""));
    return Number.isFinite(result) ? result : 0;
  }

  function currencySymbol(currency) {
    return currency === "JPY" ? "¥" : currency === "USD" ? "$" : "원";
  }

  function money(value, currency = form.elements.currency?.value || "KRW") {
    const rounded = Math.round(number(value));
    const formatted = new Intl.NumberFormat(currency === "JPY" ? "ja-JP" : currency === "USD" ? "en-US" : "ko-KR", { maximumFractionDigits: 0 }).format(rounded);
    return currency === "KRW" ? `${formatted}원` : `${currencySymbol(currency)}${formatted}`;
  }

  function itemRow(item = {}) {
    const tr = document.createElement("tr");
    tr.dataset.id = item.id || crypto.randomUUID();
    tr.innerHTML = `<td><input data-field="name" value="${escapeHtml(item.name)}" aria-label="견적 항목"></td><td><input data-field="description" value="${escapeHtml(item.description)}" aria-label="내용 및 사양"></td><td><input class="number" data-field="qty" type="number" min="0" step="0.01" value="${number(item.qty) || 1}" aria-label="수량"></td><td><input data-field="unit" value="${escapeHtml(item.unit || "식")}" aria-label="단위"></td><td><input class="number" data-field="price" type="number" min="0" step="1" value="${number(item.price)}" aria-label="단가"></td><td><output class="item-total">${money(number(item.qty) * number(item.price))}</output></td><td><button class="remove-item" type="button" aria-label="항목 삭제">×</button></td>`;
    tr.querySelector(".remove-item").addEventListener("click", () => {
      if (itemsBody.children.length <= 1) return;
      tr.remove();
      changed();
    });
    tr.querySelectorAll("input").forEach(input => input.addEventListener("input", changed));
    return tr;
  }

  function renderItems(items) {
    itemsBody.replaceChildren(...(items?.length ? items : DEFAULT_ITEMS.map(([name, description, qty, unit, price]) => ({ name, description, qty, unit, price }))).map(itemRow));
  }

  function readItems() {
    return [...itemsBody.rows].map(row => ({
      id: row.dataset.id,
      name: row.querySelector('[data-field="name"]').value.trim(),
      description: row.querySelector('[data-field="description"]').value.trim(),
      qty: number(row.querySelector('[data-field="qty"]').value),
      unit: row.querySelector('[data-field="unit"]').value.trim(),
      price: number(row.querySelector('[data-field="price"]').value)
    }));
  }

  function suggestedRawDimensions(material) {
    const x = number(material.x), y = number(material.y), t = number(material.t);
    if (!x || !y || !t) return { rawX: 0, rawY: 0, rawT: 0 };
    if (["SKD11", "STD11"].includes(String(material.grade || "").trim().toUpperCase())) {
      return { rawX: Math.round((x + 0.3) * 10) / 10, rawY: Math.round((y + 0.3) * 10) / 10, rawT: Math.round((t + 0.3) * 10) / 10 };
    }
    return { rawX: Math.ceil(x + 3), rawY: Math.ceil(y + 3), rawT: Math.ceil(t + 3) };
  }

  function materialWeight(material) {
    const density = MATERIAL_DENSITY[String(material.grade || "").trim().toUpperCase()] || 7.85;
    return number(material.rawX) * number(material.rawY) * number(material.rawT) * Math.max(number(material.qty), 0) * density / 1000000;
  }

  function materialRow(material = {}, index = 0) {
    const tr = document.createElement("tr");
    tr.dataset.id = material.id || crypto.randomUUID();
    tr.innerHTML = `<td>${index + 1}</td><td><input class="material-name" data-material-field="name" value="${escapeHtml(material.name)}" aria-label="소재 ${index + 1} 명칭"></td><td><input class="material-grade" data-material-field="grade" list="materialGradeOptions" value="${escapeHtml(material.grade || "")}" placeholder="직접 입력" aria-label="소재 ${index + 1} 재질"></td><td><div class="material-dims"><input data-material-field="x" type="number" min="0" step="0.1" value="${number(material.x) || ""}" placeholder="폭" aria-label="소재 ${index + 1} 완성 폭"><input data-material-field="y" type="number" min="0" step="0.1" value="${number(material.y) || ""}" placeholder="길이" aria-label="소재 ${index + 1} 완성 길이"><input data-material-field="t" type="number" min="0" step="0.1" value="${number(material.t) || ""}" placeholder="두께" aria-label="소재 ${index + 1} 완성 두께"></div></td><td><div class="material-dims raw-dims"><input data-material-field="rawX" type="number" min="0" step="0.1" value="${number(material.rawX) || ""}" placeholder="폭" aria-label="소재 ${index + 1} 원소재 폭"><input data-material-field="rawY" type="number" min="0" step="0.1" value="${number(material.rawY) || ""}" placeholder="길이" aria-label="소재 ${index + 1} 원소재 길이"><input data-material-field="rawT" type="number" min="0" step="0.1" value="${number(material.rawT) || ""}" placeholder="두께" aria-label="소재 ${index + 1} 원소재 두께"></div></td><td><input class="material-qty" data-material-field="qty" type="number" min="0" step="1" value="${number(material.qty) || 1}" aria-label="소재 ${index + 1} 수량"></td><td><output class="material-weight">0.00</output></td><td><input class="material-price" data-material-field="unitPrice" type="number" min="0" step="1" value="${number(material.unitPrice) || ""}" placeholder="원/kg" aria-label="소재 ${index + 1} kg 단가"></td><td><output class="material-cost">0원</output></td><td><button class="remove-material" type="button" aria-label="소재 항목 삭제">×</button></td>`;
    const refreshSuggestion = () => {
      const current = readMaterialRow(tr);
      const suggested = suggestedRawDimensions(current);
      ["rawX", "rawY", "rawT"].forEach(field => { tr.querySelector(`[data-material-field="${field}"]`).value = suggested[field] || ""; });
    };
    tr.querySelectorAll('[data-material-field="x"],[data-material-field="y"],[data-material-field="t"]').forEach(input => input.addEventListener("input", () => { refreshSuggestion(); changed(); }));
    tr.querySelector('[data-material-field="grade"]').addEventListener("input", () => { refreshSuggestion(); changed(); });
    tr.querySelectorAll("input,select").forEach(input => { if (!["x", "y", "t", "grade"].includes(input.dataset.materialField)) input.addEventListener("input", changed); });
    tr.querySelector(".remove-material").addEventListener("click", () => {
      if (materialsBody.children.length <= 1) return;
      tr.remove();
      renumberMaterials();
      changed();
    });
    return tr;
  }

  function renumberMaterials() {
    [...materialsBody.rows].forEach((row, index) => { row.cells[0].textContent = index + 1; });
  }

  function readMaterialRow(row) {
    const value = field => row.querySelector(`[data-material-field="${field}"]`).value;
    return { id: row.dataset.id, name: value("name").trim(), grade: value("grade"), x: number(value("x")), y: number(value("y")), t: number(value("t")), rawX: number(value("rawX")), rawY: number(value("rawY")), rawT: number(value("rawT")), qty: number(value("qty")), unitPrice: number(value("unitPrice")) };
  }

  function readMaterials() {
    return [...materialsBody.rows].map(readMaterialRow);
  }

  function renderMaterials(materials) {
    const source = materials?.length ? materials : DEFAULT_MATERIALS.map(([name, grade]) => ({ name, grade, qty: 1 }));
    materialsBody.replaceChildren(...source.map(materialRow));
  }

  function materialTotals(materials = readMaterials()) {
    return materials.reduce((total, material) => {
      const weight = materialWeight(material);
      total.weight += weight;
      total.cost += Math.round(weight * number(material.unitPrice));
      return total;
    }, { weight: 0, cost: 0 });
  }

  function calculateMaterials(materials = readMaterials(), currency = form.elements.currency?.value || "KRW") {
    const total = materialTotals(materials);
    [...materialsBody.rows].forEach((row, index) => {
      const weight = materialWeight(materials[index]);
      row.querySelector(".material-weight").value = weight.toFixed(2);
      row.querySelector(".material-cost").value = money(Math.round(weight * number(materials[index].unitPrice)), currency);
    });
    document.getElementById("materialWeightTotal").textContent = `${total.weight.toFixed(2)} kg`;
    document.getElementById("materialCostTotal").textContent = money(total.cost, currency);
    return total;
  }

  function readData() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.id = currentId;
    data.dieQuantity = number(data.dieQuantity);
    data.marginRate = number(data.marginRate);
    data.showMargin = form.elements.showMargin.checked;
    data.includeMaterialPage = form.elements.includeMaterialPage.checked;
    data.items = readItems();
    data.materials = readMaterials();
    data.updatedAt = new Date().toISOString();
    return data;
  }

  function writeData(data) {
    const defaults = blankData();
    const hasItems = Array.isArray(data.items) && data.items.some(item => String(item.name || item.description || "").trim() || number(item.price));
    const hasMaterials = Array.isArray(data.materials) && data.materials.some(item => String(item.name || item.grade || "").trim() || number(item.x) || number(item.y) || number(item.t));
    data = { ...defaults, ...data, items: hasItems ? data.items : defaults.items, materials: hasMaterials ? data.materials : defaults.materials };
    currentId = data.id || crypto.randomUUID();
    [...form.elements].forEach(control => {
      if (!control.name || control.type === "file") return;
      if (control.type === "checkbox") control.checked = Boolean(data[control.name]);
      else if (data[control.name] != null) control.value = data[control.name];
    });
    renderItems(data.items);
    renderMaterials(data.materials);
    calculate();
  }

  function totals(data = readData()) {
    const itemSubtotal = data.items.reduce((sum, item) => sum + number(item.qty) * number(item.price), 0);
    const margin = Math.round(itemSubtotal * number(data.marginRate) / 100);
    let supply = itemSubtotal + margin;
    let vat = 0;
    let grand = supply;
    if (data.vatMode === "excluded") {
      vat = Math.round(supply * 0.1);
      grand = supply + vat;
    } else if (data.vatMode === "included") {
      grand = supply;
      supply = Math.round(grand / 1.1);
      vat = grand - supply;
    }
    return { itemSubtotal, margin, supply, vat, grand };
  }

  function calculate() {
    const data = readData();
    const result = totals(data);
    calculateMaterials(data.materials, data.currency);
    [...itemsBody.rows].forEach((row, index) => row.querySelector(".item-total").value = money(number(data.items[index].qty) * number(data.items[index].price), data.currency));
    document.getElementById("itemsSubtotal").textContent = money(result.itemSubtotal, data.currency);
    document.getElementById("marginAmount").textContent = money(result.margin, data.currency);
    document.getElementById("supplyAmount").textContent = money(result.supply, data.currency);
    document.getElementById("vatAmount").textContent = money(result.vat, data.currency);
    document.getElementById("grandTotal").textContent = money(result.grand, data.currency);
  }

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = `save-status ${type}`.trim();
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbRequest(mode, operation) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  async function saveLocal(showMessage = true) {
    try {
      const data = readData();
      await dbRequest("readwrite", store => store.put(data));
      await refreshSavedQuotes(data.id);
      if (showMessage) setStatus(`자동 저장됨 · ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`, "success");
    } catch {
      setStatus("브라우저 저장에 실패했습니다. 편집용 파일로 백업해 주세요.", "error");
    }
  }

  async function refreshSavedQuotes(selected = "") {
    try {
      const list = await dbRequest("readonly", store => store.getAll());
      list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      savedQuotes.innerHTML = '<option value="">저장된 견적 선택</option>' + list.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.quoteNumber || "번호 없음")} · ${escapeHtml(item.buyerCompany || item.projectName || "미작성 견적")}</option>`).join("");
      if (selected) savedQuotes.value = selected;
    } catch { /* IndexedDB를 사용할 수 없는 환경에서는 파일 저장 기능을 이용한다. */ }
  }

  function changed() {
    calculate();
    setStatus("변경사항 저장 중...");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveLocal(), 550);
  }

  function safeFilename(value, fallback) {
    const cleaned = String(value || "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 70);
    return cleaned || fallback;
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function exportEditable() {
    const data = readData();
    const file = { format: FORM_FORMAT, version: FORM_VERSION, exportedAt: new Date().toISOString(), data };
    const filename = `${safeFilename(data.quoteNumber, "press-die-quotation")}.pressquote`;
    downloadBlob(new Blob([JSON.stringify(file, null, 2)], { type: "application/json;charset=utf-8" }), filename);
    setStatus("편집용 견적 파일을 저장했습니다.", "success");
  }

  function applyMaterialTotal() {
    const data = readData();
    const materialTotal = materialTotals(data.materials);
    const target = [...itemsBody.rows].find(row => row.querySelector('[data-field="name"]').value.includes("소재"));
    if (!target) {
      setStatus("견적 항목에서 금형 소재비 항목을 찾을 수 없습니다.", "error");
      return;
    }
    target.querySelector('[data-field="qty"]').value = 1;
    target.querySelector('[data-field="unit"]').value = "식";
    target.querySelector('[data-field="price"]').value = materialTotal.cost;
    target.querySelector('[data-field="description"]').value = `금형소재 산출명세 ${data.materials.filter(item => materialWeight(item) > 0).length}종 합계`;
    changed();
    setStatus(`소재비 ${money(materialTotal.cost, data.currency)}을 견적 항목에 반영했습니다.`, "success");
    materialDialog.close();
  }

  function openMaterialDialog() {
    if (!materialDialog.open) materialDialog.showModal();
  }

  function clearMaterialQuery() {
    const url = new URL(location.href);
    if (url.searchParams.get("tool") !== "material") return;
    url.searchParams.delete("tool");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function importEditable(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.format !== FORM_FORMAT || !parsed.data || parsed.version > FORM_VERSION) throw new Error("format");
      const imported = { ...blankData(), ...parsed.data, id: crypto.randomUUID() };
      writeData(imported);
      await saveLocal(false);
      setStatus("견적 파일을 불러왔습니다. 새 로컬 견적으로 저장했습니다.", "success");
    } catch {
      setStatus("지원하지 않거나 손상된 견적 파일입니다.", "error");
    }
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const paragraphs = String(text || "-").split(/\r?\n/);
    const lines = [];
    for (const paragraph of paragraphs) {
      let line = "";
      for (const char of paragraph || " ") {
        const test = line + char;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = char; }
        else line = test;
      }
      lines.push(line || " ");
    }
    lines.slice(0, maxLines).forEach((line, index) => ctx.fillText(index === maxLines - 1 && lines.length > maxLines ? `${line.slice(0, -1)}…` : line, x, y + index * lineHeight));
    return Math.min(lines.length, maxLines);
  }

  function createQuotationPage(data, { pageNumber, pageCount, kicker, title, subtitle, titleSize = 88 }) {
    const canvas = document.createElement("canvas");
    canvas.width = 2480;
    canvas.height = 3508;
    const ctx = canvas.getContext("2d");
    const left = 200, right = 2280, width = right - left;
    const colors = {
      navy: "#102c4e",
      blue: "#1768b2",
      ink: "#17293f",
      text: "#405269",
      muted: "#6d7d90",
      line: "#cbd6e2",
      pale: "#eef5fb",
      wash: "#f8fafc",
      white: "#ffffff"
    };
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "middle";
    const font = (size, weight = 400) => { ctx.font = `${weight} ${size}px Arial, "Malgun Gothic", "Noto Sans KR", sans-serif`; };
    const line = (x1, y1, x2, y2, color = colors.line, thickness = 2) => { ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const box = (x, y, w, h, fill = null, stroke = colors.line, thickness = 2) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); } ctx.strokeStyle = stroke; ctx.lineWidth = thickness; ctx.strokeRect(x, y, w, h); };
    const footer = () => {
      line(left, 3260, right, 3260, colors.line, 2);
      font(21, 600); ctx.fillStyle = colors.muted; ctx.textAlign = "left"; ctx.fillText(data.sellerCompany || "작성 회사명", left, 3310);
      ctx.textAlign = "center"; ctx.fillText(data.quoteNumber || "-", 1240, 3310);
      ctx.textAlign = "right"; ctx.fillText(`${pageNumber} / ${pageCount}`, right, 3310);
    };

    ctx.fillStyle = colors.blue; ctx.fillRect(left, 132, 12, 238);
    ctx.textAlign = "left"; font(24, 800); ctx.fillStyle = colors.blue; ctx.fillText(kicker, left + 46, 152);
    font(titleSize, 800); ctx.fillStyle = colors.navy; ctx.fillText(title, left + 46, 245);
    font(25, 700); ctx.fillStyle = colors.muted; ctx.fillText(subtitle, left + 49, 332);
    ctx.textAlign = "right"; font(136, 800); ctx.fillStyle = "#edf3f8"; ctx.fillText(String(pageNumber).padStart(2, "0"), right, 198);
    font(23, 700); ctx.fillStyle = colors.text; ctx.fillText(`NO. ${data.quoteNumber || "-"}`, right, 315);
    font(22, 500); ctx.fillStyle = colors.muted; ctx.fillText(data.quoteDate || "-", right, 356);
    line(left, 420, right, 420, colors.navy, 5);

    return { canvas, ctx, left, right, width, colors, font, line, box, footer };
  }

  function drawPdfCanvas(data) {
    const total = totals(data);
    const pageCount = data.includeMaterialPage ? 2 : 1;
    const { canvas, ctx, left, right, width, colors, font, line, box, footer } = createQuotationPage(data, {
      pageNumber: 1,
      pageCount,
      kicker: "QUOTATION / PRESS DIE",
      title: "프레스금형 견적서",
      subtitle: "PRESS DIE QUOTATION",
      titleSize: 92
    });
    const infoCard = (label, title, details, x, y, w, h) => {
      box(x, y, w, h, colors.white);
      ctx.fillStyle = colors.pale; ctx.fillRect(x, y, w, 44);
      ctx.textAlign = "left"; font(21, 800); ctx.fillStyle = colors.blue; ctx.fillText(label, x + 24, y + 23);
      font(36, 800); ctx.fillStyle = colors.navy; ctx.fillText(title || "-", x + 24, y + 88);
      font(22, 500); ctx.fillStyle = colors.text;
      details.slice(0, 2).forEach((detail, index) => wrapCanvasText(ctx, detail || "-", x + 24, y + 131 + index * 34, w - 48, 30, 1));
    };
    const field = (label, value, x, y, w, h) => {
      box(x, y, w, h, colors.white);
      ctx.textAlign = "left"; font(20, 700); ctx.fillStyle = colors.muted; ctx.fillText(label, x + 20, y + 23);
      font(27, 700); ctx.fillStyle = colors.ink; wrapCanvasText(ctx, value || "-", x + 20, y + 58, w - 40, 29, 1);
    };

    const cardY = 470, cardGap = 24, cardW = (width - cardGap) / 2;
    const sellerDetail1 = [data.sellerRepresentative && `대표 ${data.sellerRepresentative}`, data.sellerBusinessNo && `사업자 ${data.sellerBusinessNo}`, data.sellerContact && `담당 ${data.sellerContact}`].filter(Boolean).join(" / ");
    const sellerDetail2 = [data.sellerPhone, data.sellerEmail, data.sellerAddress].filter(Boolean).join(" / ");
    infoCard("SUPPLIER / 공급자", data.sellerCompany || "작성 회사명", [sellerDetail1 || "-", sellerDetail2 || "-"], left, cardY, cardW, 205);
    infoCard("RECIPIENT / 수신자", data.buyerCompany || "납품 회사명", [data.buyerContact ? `담당 ${data.buyerContact}` : "담당자 미입력", data.projectName ? `프로젝트 ${data.projectName}` : "금형명 미입력"], left + cardW + cardGap, cardY, cardW, 205);

    const amountY = 705;
    box(left, amountY, width, 142, "#f7fafc", colors.line);
    ctx.fillStyle = colors.blue; ctx.fillRect(left, amountY, 10, 142);
    ctx.textAlign = "left"; font(21, 800); ctx.fillStyle = colors.muted; ctx.fillText("PROPOSED TOTAL / 제안 금액", left + 34, amountY + 40);
    font(29, 700); ctx.fillStyle = colors.ink; ctx.fillText(data.projectName || "프레스금형 제작", left + 34, amountY + 94);
    ctx.textAlign = "right"; font(46, 800); ctx.fillStyle = colors.navy; ctx.fillText(money(total.grand, data.currency), right - 28, amountY + 73);

    const fieldY = 877, fieldGap = 20, fieldW = (width - fieldGap * 2) / 3, fieldH = 80;
    const fields = [
      ["금형 형식", `${data.dieType || "-"} / ${data.dieQuantity || 1}식`], ["제품 소재", data.productMaterial], ["프레스 사양", data.pressSpec],
      ["유효기간", data.validUntil], ["납기", data.delivery], ["결제조건", data.paymentTerms]
    ];
    fields.forEach(([label, value], index) => field(label, value, left + (index % 3) * (fieldW + fieldGap), fieldY + Math.floor(index / 3) * (fieldH + 18), fieldW, fieldH));

    const tableY = 1080, headerH = 76, rowH = 96;
    const columns = [left, left + 430, left + 1170, left + 1330, left + 1490, right];
    box(left, tableY, width, headerH, colors.pale, colors.line);
    ctx.fillStyle = colors.blue; ctx.fillRect(left, tableY, width, 6);
    const headers = ["항목", "내용·사양", "수량", "단위", "금액"];
    ctx.textAlign = "center"; font(27, 800); ctx.fillStyle = colors.navy;
    headers.forEach((header, i) => ctx.fillText(header, (columns[i] + columns[i + 1]) / 2, tableY + headerH / 2));
    const visibleItems = data.items.filter(item => item.name || item.description || item.price).slice(0, 10);
    visibleItems.forEach((item, index) => {
      const y = tableY + headerH + index * rowH;
      box(left, y, width, rowH, index % 2 ? colors.wash : colors.white, colors.line);
      columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, colors.line));
      ctx.textAlign = "left"; font(25, 700); ctx.fillStyle = colors.ink; wrapCanvasText(ctx, item.name || "-", columns[0] + 18, y + 38, columns[1] - columns[0] - 36, 29, 2);
      font(23, 400); ctx.fillStyle = colors.text; wrapCanvasText(ctx, item.description || "-", columns[1] + 18, y + 38, columns[2] - columns[1] - 36, 29, 2);
      ctx.textAlign = "center"; font(25, 500); ctx.fillStyle = colors.ink; ctx.fillText(String(item.qty || 0), (columns[2] + columns[3]) / 2, y + rowH / 2); ctx.fillText(item.unit || "식", (columns[3] + columns[4]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; font(28, 700); ctx.fillText(money(number(item.qty) * number(item.price), data.currency), columns[5] - 18, y + rowH / 2);
    });
    const itemEndY = tableY + headerH + Math.max(visibleItems.length, 1) * rowH;
    const summaryX = 1320, summaryW = right - summaryX, summaryRowH = 64;
    const summary = [["항목 합계", total.itemSubtotal], ...(number(data.marginRate) > 0 && data.showMargin ? [[`일반관리비·이윤 (${data.marginRate}%)`, total.margin]] : []), ["공급가액", total.supply], [data.vatMode === "none" ? "부가세" : "부가세 (10%)", total.vat]];
    let summaryY = itemEndY + 24;
    summary.forEach(([label, value]) => { box(summaryX, summaryY, summaryW, summaryRowH, colors.white); ctx.textAlign = "left"; font(24, 600); ctx.fillStyle = colors.text; ctx.fillText(label, summaryX + 20, summaryY + summaryRowH / 2); ctx.textAlign = "right"; font(27, 700); ctx.fillStyle = colors.ink; ctx.fillText(money(value, data.currency), right - 18, summaryY + summaryRowH / 2); summaryY += summaryRowH; });
    box(summaryX, summaryY, summaryW, 94, colors.pale, colors.blue, 3); ctx.fillStyle = colors.blue; ctx.fillRect(summaryX, summaryY, 9, 94); ctx.textAlign = "left"; font(29, 800); ctx.fillStyle = colors.navy; ctx.fillText("총 견적금액", summaryX + 28, summaryY + 47); ctx.textAlign = "right"; font(38, 800); ctx.fillText(money(total.grand, data.currency), right - 20, summaryY + 47);

    const notesY = Math.max(summaryY + 130, itemEndY + 405);
    ctx.textAlign = "left"; font(28, 800); ctx.fillStyle = colors.navy; ctx.fillText("견적 조건 및 특기사항", left, notesY);
    box(left, notesY + 42, width, 300, colors.wash); font(24, 400); ctx.fillStyle = colors.text; wrapCanvasText(ctx, data.notes || "-", left + 26, notesY + 82, width - 52, 38, 6);
    footer();
    return canvas;
  }

  function drawMaterialPdfCanvas(data) {
    const materials = data.materials || [];
    const materialTotal = materialTotals(materials);
    const { canvas, ctx, left, right, width, colors, font, line, box, footer } = createQuotationPage(data, {
      pageNumber: 2,
      pageCount: 2,
      kicker: "DETAIL / MATERIAL COST",
      title: "금형소재 견적 산출 명세서",
      subtitle: "PRESS DIE MATERIAL COST DETAIL",
      titleSize: 72
    });

    const projectY = 470;
    box(left, projectY, width, 112, colors.white);
    ctx.textAlign = "left"; font(21, 800); ctx.fillStyle = colors.blue; ctx.fillText("PROJECT / 금형명", left + 26, projectY + 34);
    font(31, 800); ctx.fillStyle = colors.navy; ctx.fillText(data.projectName || "금형명 미입력", left + 26, projectY + 78);
    ctx.textAlign = "right"; font(22, 600); ctx.fillStyle = colors.text; ctx.fillText(`${data.sellerCompany || "작성 회사"}  >  ${data.buyerCompany || "납품 회사"}`, right - 26, projectY + 58);

    const cardY = 615, gap = 22, cardW = (width - gap * 2) / 3;
    const summaryCards = [["산출 품목", `${materials.filter(item => materialWeight(item) > 0).length} 종`], ["총 원소재 중량", `${materialTotal.weight.toFixed(2)} kg`], ["금형 소재비 합계", money(materialTotal.cost, data.currency)]];
    summaryCards.forEach(([label, value], index) => { const x = left + index * (cardW + gap); box(x, cardY, cardW, 142, index === 2 ? colors.pale : colors.white, colors.line); if (index === 2) { ctx.fillStyle = colors.blue; ctx.fillRect(x, cardY, 8, 142); } ctx.textAlign = "left"; font(21, 700); ctx.fillStyle = colors.muted; ctx.fillText(label, x + 26, cardY + 40); font(index === 2 ? 35 : 38, 800); ctx.fillStyle = index === 2 ? colors.navy : colors.ink; ctx.fillText(value, x + 26, cardY + 96); });

    const tableY = 800, headerH = 90, rowH = 180;
    const columns = [left, left + 80, left + 380, left + 580, left + 970, left + 1360, left + 1490, left + 1690, left + 1880, right];
    const headers = ["NO.", "명칭", "재질", "완성치수\n폭 × 길이 × 두께", "추천 원소재\n폭 × 길이 × 두께", "수량", "중량(kg)", "단가/kg", "금액"];
    box(left, tableY, width, headerH, colors.pale, colors.line);
    ctx.fillStyle = colors.blue; ctx.fillRect(left, tableY, width, 6);
    ctx.textAlign = "center"; font(23, 800); ctx.fillStyle = colors.navy;
    headers.forEach((header, index) => { const parts = header.split("\n"); parts.forEach((part, partIndex) => ctx.fillText(part, (columns[index] + columns[index + 1]) / 2, tableY + headerH / 2 + (partIndex - (parts.length - 1) / 2) * 29)); });
    materials.slice(0, 10).forEach((material, index) => {
      const y = tableY + headerH + index * rowH;
      box(left, y, width, rowH, index % 2 ? colors.wash : colors.white, colors.line);
      columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, colors.line));
      const weight = materialWeight(material); const cost = Math.round(weight * number(material.unitPrice));
      ctx.textAlign = "center"; font(24, 700); ctx.fillStyle = colors.muted; ctx.fillText(String(index + 1).padStart(2, "0"), (columns[0] + columns[1]) / 2, y + rowH / 2);
      ctx.textAlign = "left"; font(24, 700); ctx.fillStyle = colors.ink; wrapCanvasText(ctx, material.name || "-", columns[1] + 15, y + 64, columns[2] - columns[1] - 30, 29, 3);
      ctx.textAlign = "center"; font(25, 700); ctx.fillStyle = ["SKD11", "STD11"].includes(String(material.grade).toUpperCase()) ? "#9a5300" : colors.ink; ctx.fillText(material.grade || "-", (columns[2] + columns[3]) / 2, y + rowH / 2);
      font(23, 500); ctx.fillStyle = colors.text; ctx.fillText(`${material.x || 0} × ${material.y || 0} × ${material.t || 0}`, (columns[3] + columns[4]) / 2, y + rowH / 2);
      font(23, 700); ctx.fillStyle = colors.blue; ctx.fillText(`${material.rawX || 0} × ${material.rawY || 0} × ${material.rawT || 0}`, (columns[4] + columns[5]) / 2, y + rowH / 2);
      font(24, 500); ctx.fillStyle = colors.text; ctx.fillText(String(material.qty || 0), (columns[5] + columns[6]) / 2, y + rowH / 2); ctx.fillText(weight.toFixed(2), (columns[6] + columns[7]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; ctx.fillText(new Intl.NumberFormat("ko-KR").format(number(material.unitPrice)), columns[8] - 14, y + rowH / 2); font(24, 800); ctx.fillStyle = colors.ink; ctx.fillText(money(cost, data.currency), columns[9] - 14, y + rowH / 2);
    });

    const tableEnd = tableY + headerH + Math.max(Math.min(materials.length, 10), 1) * rowH;
    box(left, tableEnd + 30, width, 138, colors.pale, colors.blue, 3); ctx.fillStyle = colors.blue; ctx.fillRect(left, tableEnd + 30, 9, 138); ctx.textAlign = "left"; font(28, 800); ctx.fillStyle = colors.navy; ctx.fillText("소재비 합계", left + 30, tableEnd + 99); ctx.textAlign = "right"; font(41, 800); ctx.fillText(money(materialTotal.cost, data.currency), right - 30, tableEnd + 99);
    const noteY = tableEnd + 220; ctx.textAlign = "left"; font(24, 800); ctx.fillStyle = colors.navy; ctx.fillText("산출 기준", left, noteY); font(21, 400); ctx.fillStyle = colors.muted; ctx.fillText("- 중량 = 추천 원소재 폭 × 길이 × 두께 × 수량 × 강재 밀도(7.85 g/cm³)", left, noteY + 44); ctx.fillText("- 추천 원소재는 참고 규격이며, 실제 견적·발주 시 공급사의 보유 규격과 가공여유를 확인해야 합니다.", left, noteY + 82);
    footer();
    return canvas;
  }

  function concatBytes(chunks) {
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(size); let offset = 0;
    chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.length; });
    return result;
  }

  async function canvasesToPdf(canvases) {
    const images = [];
    for (const canvas of canvases) {
      const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.96));
      images.push({ bytes: new Uint8Array(await jpegBlob.arrayBuffer()), width: canvas.width, height: canvas.height });
    }
    const enc = new TextEncoder();
    const chunks = [enc.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    const offsets = [0];
    let length = chunks[0].length;
    const addObject = (id, bodyParts) => {
      offsets[id] = length;
      const parts = [enc.encode(`${id} 0 obj\n`), ...(Array.isArray(bodyParts) ? bodyParts : [enc.encode(bodyParts)]), enc.encode("\nendobj\n")];
      chunks.push(...parts); length += parts.reduce((sum, part) => sum + part.length, 0);
    };
    const pageIds = images.map((_, index) => 3 + index);
    const imageIds = images.map((_, index) => 3 + images.length + index);
    const contentIds = images.map((_, index) => 3 + images.length * 2 + index);
    addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObject(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`);
    images.forEach((image, index) => addObject(pageIds[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${index} ${imageIds[index]} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`));
    images.forEach((image, index) => addObject(imageIds[index], [enc.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`), image.bytes, enc.encode("\nendstream")]));
    images.forEach((_, index) => { const stream = `q\n595.28 0 0 841.89 0 0 cm\n/Im${index} Do\nQ\n`; addObject(contentIds[index], `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`); });
    const xrefOffset = length;
    const objectCount = 2 + images.length * 3;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= objectCount; id += 1) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(enc.encode(xref));
    return new Blob([concatBytes(chunks)], { type: "application/pdf" });
  }

  async function exportPdf() {
    const data = readData();
    if (!data.sellerCompany || !data.buyerCompany || !data.projectName) {
      setStatus("PDF 작성 전에 작성 회사명, 납품 회사명, 금형명을 입력해 주세요.", "error");
      form.reportValidity(); return;
    }
    const button = document.getElementById("downloadPdf");
    button.disabled = true; button.textContent = "PDF 생성 중...";
    try {
      const pages = [drawPdfCanvas(data)];
      if (data.includeMaterialPage) pages.push(drawMaterialPdfCanvas(data));
      const pdf = await canvasesToPdf(pages);
      downloadBlob(pdf, `${safeFilename(data.quoteNumber, "press-die-quotation")}.pdf`);
      await saveLocal(false);
      setStatus("PDF를 저장했습니다. 수정용 견적 파일도 함께 보관하세요.", "success");
    } catch {
      setStatus("PDF 생성에 실패했습니다. 브라우저를 확인해 주세요.", "error");
    } finally {
      button.disabled = false; button.textContent = "PDF 다운로드";
    }
  }

  function previewPdf() {
    const data = readData();
    const dialog = document.getElementById("pdfPreviewDialog");
    const pages = [drawPdfCanvas(data)];
    if (data.includeMaterialPage) pages.push(drawMaterialPdfCanvas(data));
    document.getElementById("pdfPreviewPages").replaceChildren(...pages.map((canvas, index) => {
      const figure = document.createElement("figure");
      figure.className = "pdf-preview-page";
      const caption = document.createElement("figcaption");
      caption.textContent = `${index + 1}페이지 / ${pages.length}페이지`;
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/jpeg", 0.9);
      image.alt = index === 0 ? "프레스금형 견적서 미리보기" : "금형소재 견적 산출 명세서 미리보기";
      figure.append(caption, image);
      return figure;
    }));
    dialog.showModal();
  }

  form.addEventListener("submit", event => event.preventDefault());
  form.addEventListener("input", changed);
  form.addEventListener("change", changed);
  document.getElementById("addItem").addEventListener("click", () => { if (itemsBody.children.length >= 10) { setStatus("PDF 한 페이지 출력을 위해 견적 항목은 최대 10개까지 지원합니다.", "error"); return; } itemsBody.append(itemRow({ qty: 1, unit: "식", price: 0 })); changed(); });
  document.getElementById("addMaterial").addEventListener("click", () => { if (materialsBody.children.length >= 10) { setStatus("PDF 한 페이지 출력을 위해 소재 항목은 최대 10개까지 지원합니다.", "error"); return; } materialsBody.append(materialRow({ qty: 1 }, materialsBody.children.length)); changed(); });
  document.getElementById("restoreDefaultMaterials").addEventListener("click", () => { if (!confirm("현재 소재 항목을 기본 8개 항목으로 바꾸시겠습니까?")) return; renderMaterials(DEFAULT_MATERIALS.map(([name, grade]) => ({ name, grade, qty: 1 }))); changed(); });
  document.getElementById("applyMaterialTotal").addEventListener("click", applyMaterialTotal);
  document.getElementById("openMaterialCalculator").addEventListener("click", openMaterialDialog);
  document.getElementById("closeMaterialDialog").addEventListener("click", () => materialDialog.close());
  document.getElementById("cancelMaterialDialog").addEventListener("click", () => materialDialog.close());
  materialDialog.addEventListener("click", event => { if (event.target === materialDialog) materialDialog.close(); });
  materialDialog.addEventListener("close", clearMaterialQuery);
  document.querySelectorAll('a[href*="?tool=material"]').forEach(link => link.addEventListener("click", event => { if (new URL(link.href).pathname === location.pathname) { event.preventDefault(); openMaterialDialog(); } }));
  document.getElementById("downloadQuote").addEventListener("click", exportEditable);
  document.getElementById("downloadPdf").addEventListener("click", exportPdf);
  document.getElementById("previewPdf").addEventListener("click", previewPdf);
  document.getElementById("closePdfPreview").addEventListener("click", () => document.getElementById("pdfPreviewDialog").close());
  document.getElementById("pdfPreviewDialog").addEventListener("click", event => { if (event.target.id === "pdfPreviewDialog") event.target.close(); });
  document.getElementById("importQuote").addEventListener("change", event => { const file = event.target.files[0]; if (file) importEditable(file); event.target.value = ""; });
  document.getElementById("newQuote").addEventListener("click", () => { if (!confirm("현재 견적서를 새 견적서로 바꾸시겠습니까? 자동 저장된 기존 견적은 목록에 남습니다.")) return; const data = blankData(); writeData(data); saveLocal(); });

  async function initialize() {
    try {
      const list = await dbRequest("readonly", store => store.getAll());
      list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      if (list[0]) {
        writeData(list[0]);
        await refreshSavedQuotes(list[0].id);
        setStatus("마지막으로 작성한 로컬 견적을 불러왔습니다.", "success");
        if (new URLSearchParams(location.search).get("tool") === "material") openMaterialDialog();
        return;
      }
    } catch { /* 저장소가 차단된 환경에서는 새 견적으로 시작한다. */ }
    const initial = blankData();
    currentId = initial.id;
    writeData(initial);
    await saveLocal(false);
    await refreshSavedQuotes(initial.id);
    if (new URLSearchParams(location.search).get("tool") === "material") openMaterialDialog();
  }

  initialize();
})();
