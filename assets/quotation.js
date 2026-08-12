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
    tr.innerHTML = `<td>${index + 1}</td><td><input class="material-name" data-material-field="name" value="${escapeHtml(material.name)}" aria-label="소재 ${index + 1} 명칭"></td><td><input class="material-grade" data-material-field="grade" list="materialGradeOptions" value="${escapeHtml(material.grade || "")}" placeholder="직접 입력" aria-label="소재 ${index + 1} 재질"></td><td><div class="material-dims"><input data-material-field="x" type="number" min="0" step="0.1" value="${number(material.x) || ""}" placeholder="폭" aria-label="소재 ${index + 1} 완성 폭"><input data-material-field="y" type="number" min="0" step="0.1" value="${number(material.y) || ""}" placeholder="길이" aria-label="소재 ${index + 1} 완성 길이"><input data-material-field="t" type="number" min="0" step="0.1" value="${number(material.t) || ""}" placeholder="두께" aria-label="소재 ${index + 1} 완성 두께"></div></td><td><div class="material-dims raw-dims"><input data-material-field="rawX" type="number" min="0" step="0.1" value="${number(material.rawX) || ""}" placeholder="폭" aria-label="소재 ${index + 1} 원소재 폭"><input data-material-field="rawY" type="number" min="0" step="0.1" value="${number(material.rawY) || ""}" placeholder="길이" aria-label="소재 ${index + 1} 원소재 길이"><input data-material-field="rawT" type="number" min="0" step="0.1" value="${number(material.rawT) || ""}" placeholder="두께" aria-label="소재 ${index + 1} 원소재 두께"></div></td><td><input class="material-qty" data-material-field="qty" type="number" min="0" step="1" value="${number(material.qty) || 1}" aria-label="소재 ${index + 1} 수량"></td><td><output class="material-weight">0.00</output></td><td><input class="material-price" data-material-field="unitPrice" type="number" min="0" step="1" value="${number(material.unitPrice) || ""}" placeholder="원/kg" aria-label="소재 ${index + 1} kg 단가"></td><td><output class="material-cost">0원</output></td>`;
    const refreshSuggestion = () => {
      const current = readMaterialRow(tr);
      const suggested = suggestedRawDimensions(current);
      ["rawX", "rawY", "rawT"].forEach(field => { tr.querySelector(`[data-material-field="${field}"]`).value = suggested[field] || ""; });
    };
    tr.querySelectorAll('[data-material-field="x"],[data-material-field="y"],[data-material-field="t"]').forEach(input => input.addEventListener("input", () => { refreshSuggestion(); changed(); }));
    tr.querySelector('[data-material-field="grade"]').addEventListener("input", () => { refreshSuggestion(); changed(); });
    tr.querySelectorAll("input,select").forEach(input => { if (!["x", "y", "t", "grade"].includes(input.dataset.materialField)) input.addEventListener("input", changed); });
    return tr;
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
    data = { ...defaults, ...data, items: data.items?.length ? data.items : defaults.items, materials: data.materials?.length ? data.materials : defaults.materials };
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

  function drawPdfCanvas(data) {
    const canvas = document.createElement("canvas");
    canvas.width = 2480;
    canvas.height = 3508;
    const ctx = canvas.getContext("2d");
    const total = totals(data);
    const left = 160, right = 2320, width = right - left;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "middle";
    const font = (size, weight = 400) => { ctx.font = `${weight} ${size}px Arial, "Malgun Gothic", "Noto Sans KR", sans-serif`; };
    const line = (x1, y1, x2, y2, color = "#8fa1b9", thickness = 2) => { ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const box = (x, y, w, h, fill = null, stroke = "#b8c5d5") => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); } ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); };
    const labelValue = (label, value, x, y, w, h) => { ctx.fillStyle = "#eef3f9"; ctx.fillRect(x, y, 250, h); box(x, y, w, h, null); font(29, 700); ctx.fillStyle = "#36475e"; ctx.fillText(label, x + 22, y + h / 2); font(31, 400); ctx.fillStyle = "#111d2e"; ctx.fillText(String(value || "-"), x + 275, y + h / 2); };

    font(66, 800); ctx.fillStyle = "#092a59"; ctx.textAlign = "center"; ctx.fillText("프레스금형 견적서", 1240, 185);
    font(30, 700); ctx.fillStyle = "#52647c"; ctx.fillText("PRESS DIE QUOTATION", 1240, 252);
    ctx.textAlign = "left"; font(42, 800); ctx.fillStyle = "#102b50"; ctx.fillText(data.sellerCompany || "작성 회사명", left, 350);
    font(27, 400); ctx.fillStyle = "#4f6075";
    const sellerLine = [data.sellerRepresentative && `대표 ${data.sellerRepresentative}`, data.sellerBusinessNo && `사업자 ${data.sellerBusinessNo}`, data.sellerContact && `담당 ${data.sellerContact}`].filter(Boolean).join("  ·  ");
    ctx.fillText(sellerLine || " ", left, 405); ctx.fillText([data.sellerPhone, data.sellerEmail].filter(Boolean).join("  ·  ") || " ", left, 452);
    ctx.textAlign = "right"; font(28, 500); ctx.fillText(data.sellerAddress || "", right, 405); ctx.textAlign = "left";
    line(left, 500, right, 500, "#173d70", 5);

    labelValue("수신", `${data.buyerCompany || "-"}  ${data.buyerContact || ""}`, left, 535, 1320, 78);
    labelValue("견적번호", data.quoteNumber, 1500, 535, 820, 78);
    labelValue("금형명", data.projectName, left, 613, 1320, 78);
    labelValue("견적일", data.quoteDate, 1500, 613, 820, 78);
    labelValue("금형 형식", `${data.dieType || "-"} / ${data.dieQuantity || 1}식`, left, 691, 1080, 78);
    labelValue("유효기간", data.validUntil, 1240, 691, 1080, 78);
    labelValue("제품 소재", data.productMaterial, left, 769, 1080, 78);
    labelValue("납기", data.delivery, 1240, 769, 1080, 78);
    labelValue("프레스", data.pressSpec, left, 847, 1080, 78);
    labelValue("결제조건", data.paymentTerms, 1240, 847, 1080, 78);

    const tableY = 980, headerH = 72, rowH = 104;
    const columns = [left, left + 450, left + 1240, left + 1400, left + 1570, right];
    box(left, tableY, width, headerH, "#153b6b", "#153b6b");
    const headers = ["항목", "내용·사양", "수량", "단위", "금액"];
    ctx.textAlign = "center"; font(29, 700); ctx.fillStyle = "#ffffff";
    headers.forEach((header, i) => ctx.fillText(header, (columns[i] + columns[i + 1]) / 2, tableY + headerH / 2));
    const visibleItems = data.items.filter(item => item.name || item.description || item.price).slice(0, 10);
    visibleItems.forEach((item, index) => {
      const y = tableY + headerH + index * rowH;
      box(left, y, width, rowH, index % 2 ? "#f8fafc" : "#ffffff");
      columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, "#c3cedc"));
      ctx.textAlign = "left"; font(27, 600); ctx.fillStyle = "#172a45"; wrapCanvasText(ctx, item.name || "-", columns[0] + 18, y + 40, columns[1] - columns[0] - 36, 31, 2);
      font(25, 400); ctx.fillStyle = "#405069"; wrapCanvasText(ctx, item.description || "-", columns[1] + 18, y + 40, columns[2] - columns[1] - 36, 31, 2);
      ctx.textAlign = "center"; font(27, 400); ctx.fillStyle = "#172a45"; ctx.fillText(String(item.qty || 0), (columns[2] + columns[3]) / 2, y + rowH / 2); ctx.fillText(item.unit || "식", (columns[3] + columns[4]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; font(28, 700); ctx.fillText(money(number(item.qty) * number(item.price), data.currency), columns[5] - 18, y + rowH / 2);
    });
    const itemEndY = tableY + headerH + Math.max(visibleItems.length, 1) * rowH;
    const summaryX = 1320, summaryW = right - summaryX, summaryRowH = 64;
    const summary = [["항목 합계", total.itemSubtotal], ...(number(data.marginRate) > 0 && data.showMargin ? [[`일반관리비·이윤 (${data.marginRate}%)`, total.margin]] : []), ["공급가액", total.supply], [data.vatMode === "none" ? "부가세" : "부가세 (10%)", total.vat]];
    let summaryY = itemEndY + 24;
    summary.forEach(([label, value]) => { box(summaryX, summaryY, summaryW, summaryRowH, "#f5f8fc"); line(summaryX + 430, summaryY, summaryX + 430, summaryY + summaryRowH, "#c3cedc"); ctx.textAlign = "left"; font(26, 600); ctx.fillStyle = "#3c4d65"; ctx.fillText(label, summaryX + 20, summaryY + summaryRowH / 2); ctx.textAlign = "right"; font(28, 700); ctx.fillStyle = "#122947"; ctx.fillText(money(value, data.currency), right - 18, summaryY + summaryRowH / 2); summaryY += summaryRowH; });
    box(summaryX, summaryY, summaryW, 82, "#153b6b", "#153b6b"); ctx.textAlign = "left"; font(31, 800); ctx.fillStyle = "#ffffff"; ctx.fillText("총 견적금액", summaryX + 20, summaryY + 41); ctx.textAlign = "right"; font(36, 800); ctx.fillText(money(total.grand, data.currency), right - 18, summaryY + 41);

    const notesY = Math.max(summaryY + 125, itemEndY + 390);
    ctx.textAlign = "left"; font(30, 800); ctx.fillStyle = "#16365f"; ctx.fillText("견적 조건 및 특기사항", left, notesY);
    box(left, notesY + 42, width, 310, "#fbfcfe"); font(26, 400); ctx.fillStyle = "#33445c"; wrapCanvasText(ctx, data.notes || "-", left + 26, notesY + 85, width - 52, 40, 6);
    line(left, 3360, right, 3360, "#9fadc0"); font(22, 600); ctx.fillStyle = "#68768a"; ctx.textAlign = "right"; ctx.fillText(data.includeMaterialPage ? "1 / 2" : "1 / 1", right, 3405);
    return canvas;
  }

  function drawMaterialPdfCanvas(data) {
    const canvas = document.createElement("canvas");
    canvas.width = 2480;
    canvas.height = 3508;
    const ctx = canvas.getContext("2d");
    const left = 150, right = 2330, width = right - left;
    const materials = data.materials || [];
    const materialTotal = materialTotals(materials);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "middle";
    const font = (size, weight = 400) => { ctx.font = `${weight} ${size}px Arial, "Malgun Gothic", "Noto Sans KR", sans-serif`; };
    const line = (x1, y1, x2, y2, color = "#a8b6c8", thickness = 2) => { ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const box = (x, y, w, h, fill = null, stroke = "#bac7d7") => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); } ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); };

    ctx.fillStyle = "#0b315f"; ctx.fillRect(0, 0, canvas.width, 470);
    ctx.fillStyle = "#2d70c7"; ctx.fillRect(left, 100, 18, 230);
    ctx.textAlign = "left"; font(30, 800); ctx.fillStyle = "#bcd7fa"; ctx.fillText("PRESS DIE MATERIAL COST SHEET", left + 55, 130);
    font(62, 800); ctx.fillStyle = "#ffffff"; ctx.fillText("금형소재 견적 산출명세서", left + 55, 220);
    font(29, 500); ctx.fillStyle = "#d9e8fa"; ctx.fillText(data.projectName || "금형명 미입력", left + 55, 305);
    ctx.textAlign = "right"; font(28, 600); ctx.fillText(data.quoteNumber || "-", right, 160); font(25, 400); ctx.fillText(`${data.sellerCompany || "작성 회사"}  →  ${data.buyerCompany || "납품 회사"}`, right, 215); ctx.fillText(data.quoteDate || "", right, 270);

    const cardY = 535, gap = 22, cardW = (width - gap * 2) / 3;
    const summaryCards = [["산출 품목", `${materials.filter(item => materialWeight(item) > 0).length} 종`], ["총 원소재 중량", `${materialTotal.weight.toFixed(2)} kg`], ["금형 소재비 합계", money(materialTotal.cost, data.currency)]];
    summaryCards.forEach(([label, value], index) => { const x = left + index * (cardW + gap); box(x, cardY, cardW, 170, "#f4f8fd", "#c6d5e8"); ctx.textAlign = "left"; font(25, 700); ctx.fillStyle = "#5a6c83"; ctx.fillText(label, x + 28, cardY + 52); font(index === 2 ? 38 : 42, 800); ctx.fillStyle = index === 2 ? "#0b4fb3" : "#12355f"; ctx.fillText(value, x + 28, cardY + 116); });

    const tableY = 780, headerH = 88, rowH = 185;
    const columns = [left, left + 82, left + 410, left + 620, left + 1030, left + 1440, left + 1570, left + 1780, left + 1990, right];
    const headers = ["NO.", "명칭", "재질", "완성치수\n폭 × 길이 × 두께", "추천 원소재\n폭 × 길이 × 두께", "수량", "중량(kg)", "단가/kg", "금액"];
    box(left, tableY, width, headerH, "#163f71", "#163f71");
    ctx.textAlign = "center"; font(24, 700); ctx.fillStyle = "#ffffff";
    headers.forEach((header, index) => { const parts = header.split("\n"); parts.forEach((part, partIndex) => ctx.fillText(part, (columns[index] + columns[index + 1]) / 2, tableY + headerH / 2 + (partIndex - (parts.length - 1) / 2) * 29)); });
    materials.slice(0, 10).forEach((material, index) => {
      const y = tableY + headerH + index * rowH;
      box(left, y, width, rowH, index % 2 ? "#f7faff" : "#ffffff");
      columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, "#cbd5e2"));
      const weight = materialWeight(material); const cost = Math.round(weight * number(material.unitPrice));
      ctx.textAlign = "center"; font(26, 700); ctx.fillStyle = "#516176"; ctx.fillText(String(index + 1).padStart(2, "0"), (columns[0] + columns[1]) / 2, y + rowH / 2);
      ctx.textAlign = "left"; font(25, 700); ctx.fillStyle = "#142e50"; wrapCanvasText(ctx, material.name || "-", columns[1] + 15, y + 68, columns[2] - columns[1] - 30, 31, 3);
      ctx.textAlign = "center"; font(26, 700); ctx.fillStyle = ["SKD11", "STD11"].includes(material.grade) ? "#9a5300" : "#24476f"; ctx.fillText(material.grade || "-", (columns[2] + columns[3]) / 2, y + rowH / 2);
      font(24, 500); ctx.fillStyle = "#33465f"; ctx.fillText(`${material.x || 0} × ${material.y || 0} × ${material.t || 0}`, (columns[3] + columns[4]) / 2, y + rowH / 2);
      font(24, 700); ctx.fillStyle = "#0b4fb3"; ctx.fillText(`${material.rawX || 0} × ${material.rawY || 0} × ${material.rawT || 0}`, (columns[4] + columns[5]) / 2, y + rowH / 2);
      font(25, 500); ctx.fillStyle = "#33465f"; ctx.fillText(String(material.qty || 0), (columns[5] + columns[6]) / 2, y + rowH / 2); ctx.fillText(weight.toFixed(2), (columns[6] + columns[7]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; ctx.fillText(new Intl.NumberFormat("ko-KR").format(number(material.unitPrice)), columns[8] - 14, y + rowH / 2); font(25, 800); ctx.fillStyle = "#132f53"; ctx.fillText(money(cost, data.currency), columns[9] - 14, y + rowH / 2);
    });

    const tableEnd = tableY + headerH + Math.max(materials.length, 1) * rowH;
    box(left, tableEnd + 30, width, 150, "#eef5ff", "#b9cee9"); ctx.textAlign = "left"; font(28, 700); ctx.fillStyle = "#315273"; ctx.fillText("소재비 합계", left + 30, tableEnd + 105); ctx.textAlign = "right"; font(43, 800); ctx.fillStyle = "#0b4fb3"; ctx.fillText(money(materialTotal.cost, data.currency), right - 30, tableEnd + 105);
    const noteY = tableEnd + 235; ctx.textAlign = "left"; font(24, 700); ctx.fillStyle = "#4a5f78"; ctx.fillText("산출 기준", left, noteY); font(22, 400); ctx.fillStyle = "#65758a"; ctx.fillText("• 중량 = 추천 원소재 폭 × 길이 × 두께 × 수량 × 강재 밀도(7.85 g/cm³)", left, noteY + 48); ctx.fillText("• 추천 원소재는 참고 규격이며 실제 견적·발주 시 공급사의 보유 규격과 가공여유를 확인해야 합니다.", left, noteY + 88);
    line(left, 3360, right, 3360, "#9fadc0"); font(22, 600); ctx.fillStyle = "#68768a"; ctx.textAlign = "right"; ctx.fillText("2 / 2", right, 3405);
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

  form.addEventListener("submit", event => event.preventDefault());
  form.addEventListener("input", changed);
  form.addEventListener("change", changed);
  document.getElementById("addItem").addEventListener("click", () => { if (itemsBody.children.length >= 10) { setStatus("PDF 한 페이지 출력을 위해 견적 항목은 최대 10개까지 지원합니다.", "error"); return; } itemsBody.append(itemRow({ qty: 1, unit: "식", price: 0 })); changed(); });
  document.getElementById("applyMaterialTotal").addEventListener("click", applyMaterialTotal);
  document.getElementById("openMaterialCalculator").addEventListener("click", openMaterialDialog);
  document.getElementById("closeMaterialDialog").addEventListener("click", () => materialDialog.close());
  document.getElementById("cancelMaterialDialog").addEventListener("click", () => materialDialog.close());
  materialDialog.addEventListener("click", event => { if (event.target === materialDialog) materialDialog.close(); });
  materialDialog.addEventListener("close", clearMaterialQuery);
  document.querySelectorAll('a[href*="?tool=material"]').forEach(link => link.addEventListener("click", event => { if (new URL(link.href).pathname === location.pathname) { event.preventDefault(); openMaterialDialog(); } }));
  document.getElementById("downloadQuote").addEventListener("click", exportEditable);
  document.getElementById("downloadPdf").addEventListener("click", exportPdf);
  document.getElementById("importQuote").addEventListener("change", event => { const file = event.target.files[0]; if (file) importEditable(file); event.target.value = ""; });
  document.getElementById("newQuote").addEventListener("click", () => { if (!confirm("현재 견적서를 새 견적서로 바꾸시겠습니까? 자동 저장된 기존 견적은 목록에 남습니다.")) return; const data = blankData(); writeData(data); saveLocal(); });
  document.getElementById("loadSaved").addEventListener("click", async () => { if (!savedQuotes.value) return setStatus("불러올 견적을 선택해 주세요.", "error"); const data = await dbRequest("readonly", store => store.get(savedQuotes.value)); if (data) { writeData(data); setStatus("저장된 견적을 불러왔습니다.", "success"); } });
  document.getElementById("deleteSaved").addEventListener("click", async () => { if (!savedQuotes.value || !confirm("선택한 로컬 견적을 삭제하시겠습니까?")) return; await dbRequest("readwrite", store => store.delete(savedQuotes.value)); if (savedQuotes.value === currentId) { const data = blankData(); writeData(data); } await refreshSavedQuotes(); setStatus("선택한 로컬 견적을 삭제했습니다.", "success"); });

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
