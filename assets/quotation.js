(() => {
  "use strict";

  const FORM_FORMAT = "qdm.press-die-quotation";
  const FORM_VERSION = 4;
  const DB_NAME = "qdm-local-tools";
  const STORE_NAME = "press-die-quotes";
  const form = document.getElementById("quoteForm");
  const itemsBody = document.getElementById("itemsBody");
  const materialsBody = document.getElementById("materialsBody");
  const materialDialog = document.getElementById("materialDialog");
  const processingBody = document.getElementById("processingBody");
  const processingDialog = document.getElementById("processingDialog");
  const status = document.getElementById("saveStatus");
  const savedQuotes = document.getElementById("savedQuotes");
  let currentId = crypto.randomUUID();
  let saveTimer;
  const requestedLocale = new URLSearchParams(location.search).get("lang");
  const initialLocale = ["ko", "ja", "en"].includes(requestedLocale) ? requestedLocale : "ko";
  const CURRENCY_BY_LOCALE = { ko: "KRW", ja: "JPY", en: "USD" };

  const PDF_TEXT = {
    ko: {
      locale: "ko-KR", quoteTitle: "프레스금형 견적서", quoteSubtitle: "PRESS DIE QUOTATION", supplier: "SUPPLIER / 공급자", recipient: "RECIPIENT / 수신자",
      representative: "대표", businessNo: "사업자", contact: "담당", project: "프로젝트", missingSeller: "작성 회사명", missingBuyer: "납품 회사명", missingContact: "담당자 미입력", missingProject: "금형명 미입력",
      proposed: "PROPOSED TOTAL / 제안 금액", defaultProject: "프레스금형 제작", dieType: "금형 형식", productMaterial: "제품 소재", pressSpec: "프레스 사양", validUntil: "견적 유효기간", delivery: "납기", payment: "결제조건",
      itemHeaders: ["항목", "내용·사양", "수량", "단위", "금액"], subtotal: "항목 합계", overhead: "일반관리비·이윤", supply: "공급가액", vat: "부가세", grand: "총 견적금액", notes: "견적 조건 및 특기사항",
      materialTitle: "별첨1 · 금형소재 산출 명세서", materialSubtitle: "PRESS DIE MATERIAL COST DETAIL", projectLabel: "PROJECT / 금형명", materialCards: ["산출 품목", "총 원소재 중량", "금형 소재비 합계"], kinds: "종",
      materialHeaders: ["NO.", "명칭", "재질", "완성치수\n폭 × 길이 × 두께", "추천 원소재\n폭 × 길이 × 두께", "수량", "중량(kg)", "단가/kg", "금액"], rounding: "반올림 계산", notApplied: "미적용", roundingUnits: { 100: "백원", 1000: "천원", 10000: "만원" }, unitSuffix: "단위", materialTotal: "소재비 합계", basis: "산출 기준",
      materialNotes: ["- 중량 = 추천 원소재 폭 × 길이 × 두께 × 수량 × 강재 밀도(7.85 g/cm³)", "- 추천 원소재는 참고 규격이며, 실제 견적·발주 시 공급사의 보유 규격과 가공여유를 확인해야 합니다."],
      processingTitle: "별첨2 · 가공비용 산출 명세서", processingSubtitle: "PRESS DIE PROCESSING COST DETAIL", processingCards: ["기계가공비", "열처리비", "와이어·방전비", "가공비 합계"], processingHeaders: ["NO.", "구분", "가공 항목", "계산 방식", "투입량", "단위", "임률·단가", "금액"], processingTotal: "가공비 합계",
      processingNotes: ["- 기계가공·와이어·방전: 투입시간 × 시간당 임률 / 일괄식: 수량 × 금액", "- 열처리 권장식: 처리중량(kg) × kg당 단가. 재질·경도·로트에 맞는 업체 단가를 적용합니다."],
      groups: { machining: "기계가공", heat: "열처리", edm: "와이어·방전" }, methods: { hour: ["시간식", "시간"], weight: ["중량식", "kg"], lump: ["일괄식", "식"] }, unitEach: "식", attachment1: "[별첨1]", attachment2: "[별첨2]"
    },
    ja: {
      locale: "ja-JP", quoteTitle: "プレス金型 御見積書", quoteSubtitle: "PRESS DIE QUOTATION", supplier: "SUPPLIER / 見積者", recipient: "RECIPIENT / 提出先",
      representative: "代表者", businessNo: "登録番号", contact: "担当", project: "案件", missingSeller: "見積会社名", missingBuyer: "提出先会社名", missingContact: "ご担当者未入力", missingProject: "金型名未入力",
      proposed: "PROPOSED TOTAL / 御見積金額", defaultProject: "プレス金型製作", dieType: "金型形式", productMaterial: "製品材質", pressSpec: "プレス仕様", validUntil: "見積有効期限", delivery: "納期", payment: "支払条件",
      itemHeaders: ["項目", "内容・仕様", "数量", "単位", "金額"], subtotal: "項目合計", overhead: "一般管理費・利益", supply: "税抜金額", vat: "消費税", grand: "御見積金額", notes: "見積条件・特記事項",
      materialTitle: "別紙1 · 金型材料費明細書", materialSubtitle: "PRESS DIE MATERIAL COST DETAIL", projectLabel: "PROJECT / 金型名", materialCards: ["算出品目", "材料総重量", "金型材料費合計"], kinds: "品目",
      materialHeaders: ["NO.", "名称", "材質", "仕上寸法\n幅 × 長さ × 厚さ", "推奨素材寸法\n幅 × 長さ × 厚さ", "数量", "重量(kg)", "単価/kg", "金額"], rounding: "端数処理", notApplied: "適用なし", roundingUnits: { 100: "百円", 1000: "千円", 10000: "万円" }, unitSuffix: "単位", materialTotal: "材料費合計", basis: "算出基準",
      materialNotes: ["- 重量 = 推奨素材の幅 × 長さ × 厚さ × 数量 × 鋼材密度(7.85 g/cm³)", "- 推奨素材寸法は参考値です。見積・発注前に供給元の在庫寸法と加工余裕をご確認ください。"],
      processingTitle: "別紙2 · 加工費明細書", processingSubtitle: "PRESS DIE PROCESSING COST DETAIL", processingCards: ["機械加工費", "熱処理費", "ワイヤー・放電加工費", "加工費合計"], processingHeaders: ["NO.", "区分", "加工項目", "計算方式", "投入量", "単位", "工賃・単価", "金額"], processingTotal: "加工費合計",
      processingNotes: ["- 機械加工・ワイヤー・放電：投入時間 × 時間単価 / 一式：数量 × 金額", "- 熱処理推奨式：処理重量(kg) × kg単価。材質・硬度・ロットに応じた業者単価を適用してください。"],
      groups: { machining: "機械加工", heat: "熱処理", edm: "ワイヤー・放電" }, methods: { hour: ["時間式", "時間"], weight: ["重量式", "kg"], lump: ["一式", "式"] }, unitEach: "式", attachment1: "[別紙1]", attachment2: "[別紙2]"
    },
    en: {
      locale: "en-US", quoteTitle: "PRESS DIE QUOTATION", quoteSubtitle: "QUOTATION / PRESS DIE", supplier: "SUPPLIER", recipient: "RECIPIENT",
      representative: "Representative", businessNo: "Registration No.", contact: "Contact", project: "Project", missingSeller: "Supplier name", missingBuyer: "Recipient name", missingContact: "Contact not entered", missingProject: "Project not entered",
      proposed: "PROPOSED TOTAL", defaultProject: "Press Die Manufacturing", dieType: "Die Type", productMaterial: "Product Material", pressSpec: "Press Specification", validUntil: "Quotation Validity", delivery: "Delivery", payment: "Payment Terms",
      itemHeaders: ["Item", "Description / Specification", "Qty", "Unit", "Amount"], subtotal: "Item Subtotal", overhead: "Overhead / Profit", supply: "Net Amount", vat: "VAT", grand: "TOTAL QUOTATION", notes: "Terms and Special Notes",
      materialTitle: "APPENDIX 1 · MATERIAL COST DETAIL", materialSubtitle: "PRESS DIE MATERIAL COST DETAIL", projectLabel: "PROJECT / DIE NAME", materialCards: ["Costed Items", "Total Material Weight", "Material Cost Total"], kinds: "items",
      materialHeaders: ["NO.", "Name", "Grade", "Finished Size\nW × L × T", "Recommended Stock\nW × L × T", "Qty", "Weight(kg)", "Rate/kg", "Amount"], rounding: "Rounding", notApplied: "Not applied", roundingUnits: { 100: "hundreds", 1000: "thousands", 10000: "ten-thousands" }, unitSuffix: "", materialTotal: "Material Cost Total", basis: "Calculation Basis",
      materialNotes: ["- Weight = recommended stock width × length × thickness × quantity × steel density (7.85 g/cm³)", "- Recommended stock sizes are references. Confirm supplier stock sizes and machining allowance before ordering."],
      processingTitle: "APPENDIX 2 · PROCESSING COST DETAIL", processingSubtitle: "PRESS DIE PROCESSING COST DETAIL", processingCards: ["Machining", "Heat Treatment", "Wire / EDM", "Processing Total"], processingHeaders: ["NO.", "Category", "Process", "Method", "Input", "Unit", "Rate", "Amount"], processingTotal: "Processing Cost Total",
      processingNotes: ["- Machining, wire and EDM: input hours × hourly rate / Lump sum: quantity × amount", "- Heat treatment: processed weight (kg) × rate/kg. Apply the supplier rate for the grade, hardness and lot."],
      groups: { machining: "Machining", heat: "Heat Treatment", edm: "Wire / EDM" }, methods: { hour: ["Hourly", "hr"], weight: ["By weight", "kg"], lump: ["Lump sum", "lot"] }, unitEach: "lot", attachment1: "[Appendix 1]", attachment2: "[Appendix 2]"
    }
  };
  const UI_TEXT = {
    ko: { hero: "프레스금형 견적서 작성기", work: "견적서 작업", workHelp: "새로 작성하거나 저장된 편집용 파일을 불러옵니다.", language: "언어 (통화)", newQuote: "새 견적서", load: "견적 파일|불러오기", pdf: "PDF 다운로드", edit: "편집용 파일 저장", preview: "PDF 미리보기", previewTitle: "견적서 PDF 미리보기", calculators: "연동 계산기", calculatorHelp: "필요한 계산기만 별도 화면으로 열어 견적서에 반영합니다.", material: "금형소재 견적산출", processing: "가공비용 견적산출", open: "열기 →", notice: "사용 안내" },
    ja: { hero: "プレス金型 見積書作成ツール", work: "見積書操作", workHelp: "新規作成、または保存した編集用ファイルを読み込みます。", language: "言語（通貨）", newQuote: "新規見積書", load: "見積ファイル|読込", pdf: "PDFダウンロード", edit: "編集用ファイル保存", preview: "PDFプレビュー", previewTitle: "見積書 PDFプレビュー", calculators: "連動計算ツール", calculatorHelp: "必要な計算ツールを開き、算出金額を見積書へ反映します。", material: "金型材料費算出", processing: "加工費算出", open: "開く →", notice: "ご利用案内" },
    en: { hero: "Press Die Quotation Builder", work: "Quotation Files", workHelp: "Start a new quotation or load a saved editable file.", language: "Language (Currency)", newQuote: "New Quotation", load: "Load Quotation|File", pdf: "Download PDF", edit: "Save Editable File", preview: "PDF Preview", previewTitle: "Quotation PDF Preview", calculators: "Linked Calculators", calculatorHelp: "Open a calculator and apply its result to the quotation.", material: "Material Cost Calculator", processing: "Processing Cost Calculator", open: "Open →", notice: "Instructions" }
  };

  const DEFAULT_ITEMS = [
    ["금형 설계비", "공정검토 및 2D/3D 설계", 1, "식", 0],
    ["금형 소재비", "[별첨1] 금형소재 산출명세 참조", 1, "식", 0],
    ["기계가공비", "[별첨2] 가공비용 산출명세 참조", 1, "식", 0],
    ["와이어·방전가공비", "[별첨2] 가공비용 산출명세 참조", 1, "식", 0],
    ["열처리·표면처리비", "[별첨2] 가공비용 산출명세 참조", 1, "식", 0],
    ["표준부품비", "가이드·스프링·볼트 등", 1, "식", 0],
    ["조립·TRY비", "조립 및 TRY", 1, "식", 0],
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
  const DEFAULT_PROCESSING = [
    { group: "machining", name: "밀링", method: "hour", qty: 0, rate: 45000 },
    { group: "machining", name: "드릴링", method: "hour", qty: 0, rate: 30000 },
    { group: "machining", name: "선반", method: "hour", qty: 0, rate: 40000 },
    { group: "machining", name: "성형연마", method: "hour", qty: 0, rate: 55000 },
    { group: "machining", name: "콘타", method: "hour", qty: 0, rate: 30000 },
    { group: "machining", name: "사상", method: "hour", qty: 0, rate: 40000 },
    { group: "heat", name: "열처리", method: "weight", qty: 0, rate: 0 },
    { group: "edm", name: "와이어 가공", method: "hour", qty: 0, rate: 60000 },
    { group: "edm", name: "방전가공(EDM)", method: "hour", qty: 0, rate: 70000 }
  ];

  function today(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  function defaultQuoteNumber() {
    return `PD-${today().replaceAll("-", "")}-001`;
  }

  function blankData() {
    const documentLocale = initialLocale;
    return {
      id: crypto.randomUUID(),
      sellerCompany: "", sellerRepresentative: "", sellerBusinessNo: "", sellerContact: "",
      sellerAddress: "", sellerPhone: "", sellerEmail: "", buyerCompany: "", buyerContact: "",
      quoteNumber: defaultQuoteNumber(), quoteDate: today(), validUntil: "작성일로부터 30일", delivery: "발주 후 협의",
      projectName: "", dieType: "단발금형", dieQuantity: 1, productMaterial: "", pressSpec: "",
      paymentTerms: "별도 협의", documentLocale, currency: CURRENCY_BY_LOCALE[documentLocale], marginRate: 0, showMargin: true, vatMode: "excluded", includeMaterialPage: true, includeProcessingPage: true, materialRoundingEnabled: false, materialRoundingUnit: 1000,
      notes: "- 제품 또는 금형 사양 변경에 따른 추가 비용은 별도 협의합니다.\n- 납기와 트라이 범위는 발주 전 최종 협의합니다.",
      items: DEFAULT_ITEMS.map(([name, description, qty, unit, price]) => ({ id: crypto.randomUUID(), name, description, qty, unit, price })),
      materials: DEFAULT_MATERIALS.map(([name, grade]) => ({ id: crypto.randomUUID(), name, grade, x: 0, y: 0, t: 0, rawX: 0, rawY: 0, rawT: 0, qty: 1, unitPrice: 0 })),
      processing: DEFAULT_PROCESSING.map(item => ({ ...item, id: crypto.randomUUID() }))
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

  function documentLocale(data = null) {
    const value = data?.documentLocale || form.elements.documentLocale?.value || "ko";
    return PDF_TEXT[value] ? value : "ko";
  }

  function textSet(data = null) {
    return PDF_TEXT[documentLocale(data)];
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

  function moveTableRow(row, direction, renumber) {
    const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    if (direction < 0) row.parentElement.insertBefore(row, sibling);
    else row.parentElement.insertBefore(sibling, row);
    renumber();
    changed();
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
    tr.innerHTML = `<td>${index + 1}</td><td><input class="material-name" data-material-field="name" value="${escapeHtml(material.name)}" aria-label="소재 ${index + 1} 명칭"></td><td><input class="material-grade" data-material-field="grade" list="materialGradeOptions" value="${escapeHtml(material.grade || "")}" placeholder="직접 입력" aria-label="소재 ${index + 1} 재질"></td><td><div class="material-dims"><input data-material-field="x" type="number" min="0" step="0.1" value="${number(material.x) || ""}" placeholder="폭" aria-label="소재 ${index + 1} 완성 폭"><input data-material-field="y" type="number" min="0" step="0.1" value="${number(material.y) || ""}" placeholder="길이" aria-label="소재 ${index + 1} 완성 길이"><input data-material-field="t" type="number" min="0" step="0.1" value="${number(material.t) || ""}" placeholder="두께" aria-label="소재 ${index + 1} 완성 두께"></div></td><td><div class="material-dims raw-dims"><input data-material-field="rawX" type="number" min="0" step="0.1" value="${number(material.rawX) || ""}" placeholder="폭" aria-label="소재 ${index + 1} 원소재 폭"><input data-material-field="rawY" type="number" min="0" step="0.1" value="${number(material.rawY) || ""}" placeholder="길이" aria-label="소재 ${index + 1} 원소재 길이"><input data-material-field="rawT" type="number" min="0" step="0.1" value="${number(material.rawT) || ""}" placeholder="두께" aria-label="소재 ${index + 1} 원소재 두께"></div></td><td><input class="material-qty" data-material-field="qty" type="number" min="0" step="1" value="${number(material.qty) || 1}" aria-label="소재 ${index + 1} 수량"></td><td><output class="material-weight">0.00</output></td><td><input class="material-price" data-material-field="unitPrice" type="number" min="0" step="1" value="${number(material.unitPrice) || ""}" placeholder="원/kg" aria-label="소재 ${index + 1} kg 단가"></td><td><output class="material-cost">0원</output></td><td><div class="row-order-actions"><button class="move-material-up" type="button" aria-label="소재 항목 위로 이동">↑</button><button class="move-material-down" type="button" aria-label="소재 항목 아래로 이동">↓</button><button class="remove-material" type="button" aria-label="소재 항목 삭제">×</button></div></td>`;
    const refreshSuggestion = () => {
      const current = readMaterialRow(tr);
      const suggested = suggestedRawDimensions(current);
      ["rawX", "rawY", "rawT"].forEach(field => { tr.querySelector(`[data-material-field="${field}"]`).value = suggested[field] || ""; });
    };
    tr.querySelectorAll('[data-material-field="x"],[data-material-field="y"],[data-material-field="t"]').forEach(input => input.addEventListener("input", () => { refreshSuggestion(); changed(); }));
    tr.querySelector('[data-material-field="grade"]').addEventListener("input", () => { refreshSuggestion(); changed(); });
    tr.querySelectorAll("input,select").forEach(input => { if (!["x", "y", "t", "grade"].includes(input.dataset.materialField)) input.addEventListener("input", changed); });
    tr.querySelector(".move-material-up").addEventListener("click", () => moveTableRow(tr, -1, renumberMaterials));
    tr.querySelector(".move-material-down").addEventListener("click", () => moveTableRow(tr, 1, renumberMaterials));
    tr.querySelector(".remove-material").addEventListener("click", () => {
      if (materialsBody.children.length <= 1) return;
      tr.remove();
      renumberMaterials();
      changed();
    });
    return tr;
  }

  function renumberMaterials() {
    [...materialsBody.rows].forEach((row, index, rows) => {
      row.cells[0].textContent = index + 1;
      row.querySelector(".move-material-up").disabled = index === 0;
      row.querySelector(".move-material-down").disabled = index === rows.length - 1;
    });
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
    renumberMaterials();
  }

  function materialTotals(materials = readMaterials(), roundingEnabled = form.elements.materialRoundingEnabled?.checked, roundingUnit = form.elements.materialRoundingUnit?.value) {
    const total = materials.reduce((result, material) => {
      const weight = materialWeight(material);
      result.weight += weight;
      result.rawCost += Math.round(weight * number(material.unitPrice));
      return result;
    }, { weight: 0, rawCost: 0, cost: 0 });
    const unit = [100, 1000, 10000].includes(number(roundingUnit)) ? number(roundingUnit) : 1000;
    total.roundingEnabled = Boolean(roundingEnabled);
    total.roundingUnit = unit;
    total.cost = total.roundingEnabled ? Math.round(total.rawCost / unit) * unit : total.rawCost;
    return total;
  }

  function roundingUnitLabel(unit, data = null) {
    return textSet(data).roundingUnits[number(unit)] || textSet(data).roundingUnits[1000];
  }

  function calculateMaterials(materials = readMaterials(), currency = form.elements.currency?.value || "KRW", roundingEnabled = form.elements.materialRoundingEnabled?.checked, roundingUnit = form.elements.materialRoundingUnit?.value) {
    const total = materialTotals(materials, roundingEnabled, roundingUnit);
    [...materialsBody.rows].forEach((row, index) => {
      const weight = materialWeight(materials[index]);
      row.querySelector(".material-weight").value = weight.toFixed(2);
      row.querySelector(".material-cost").value = money(Math.round(weight * number(materials[index].unitPrice)), currency);
      row.querySelector(".material-price").placeholder = `${currency}/kg`;
    });
    document.getElementById("materialWeightTotal").textContent = `${total.weight.toFixed(2)} kg`;
    document.getElementById("materialCostTotal").textContent = money(total.cost, currency);
    document.getElementById("materialRawCostTotal").textContent = money(total.rawCost, currency);
    document.getElementById("materialRoundedCostTotal").textContent = money(total.cost, currency);
    return total;
  }

  const PROCESSING_GROUPS = { machining: "기계가공", heat: "열처리", edm: "와이어·방전" };
  const PROCESSING_METHODS = {
    hour: { label: "시간식", unit: "시간", placeholder: "원/시간" },
    weight: { label: "중량식", unit: "kg", placeholder: "원/kg" },
    lump: { label: "일괄식", unit: "식", placeholder: "금액/식" }
  };

  function processingRow(item = {}, index = 0) {
    const tr = document.createElement("tr");
    tr.dataset.id = item.id || crypto.randomUUID();
    tr.dataset.group = item.group || "machining";
    const method = PROCESSING_METHODS[item.method] ? item.method : "hour";
    tr.innerHTML = `<td>${index + 1}</td><td><select data-processing-field="group" aria-label="가공 ${index + 1} 구분"><option value="machining">기계가공</option><option value="heat">열처리</option><option value="edm">와이어·방전</option></select></td><td><input class="processing-name" data-processing-field="name" value="${escapeHtml(item.name || "")}" aria-label="가공 ${index + 1} 항목"></td><td><select data-processing-field="method" aria-label="가공 ${index + 1} 계산 방식"><option value="hour">시간식</option><option value="weight">중량식</option><option value="lump">일괄식</option></select></td><td><input class="processing-qty" data-processing-field="qty" type="number" min="0" step="0.1" value="${number(item.qty) || ""}" aria-label="가공 ${index + 1} 투입량"></td><td><output class="processing-unit">${PROCESSING_METHODS[method].unit}</output></td><td><input class="processing-rate" data-processing-field="rate" type="number" min="0" step="1" value="${number(item.rate) || ""}" placeholder="${PROCESSING_METHODS[method].placeholder}" aria-label="가공 ${index + 1} 임률 또는 단가"></td><td><output class="processing-cost">0원</output></td><td><div class="row-order-actions"><button class="move-processing-up" type="button" aria-label="가공 항목 위로 이동">↑</button><button class="move-processing-down" type="button" aria-label="가공 항목 아래로 이동">↓</button><button class="remove-processing" type="button" aria-label="가공 항목 삭제">×</button></div></td>`;
    tr.querySelector('[data-processing-field="group"]').value = item.group || "machining";
    tr.querySelector('[data-processing-field="method"]').value = method;
    const refreshRowStyle = () => {
      tr.dataset.group = tr.querySelector('[data-processing-field="group"]').value;
      const selectedMethod = tr.querySelector('[data-processing-field="method"]').value;
      tr.querySelector(".processing-unit").value = PROCESSING_METHODS[selectedMethod].unit;
      tr.querySelector(".processing-rate").placeholder = PROCESSING_METHODS[selectedMethod].placeholder;
      if (selectedMethod === "lump" && !number(tr.querySelector(".processing-qty").value)) tr.querySelector(".processing-qty").value = 1;
      if (tr.dataset.group === "heat" && selectedMethod === "hour" && !number(tr.querySelector(".processing-rate").value)) tr.querySelector(".processing-rate").value = 65000;
    };
    tr.querySelectorAll("input,select").forEach(control => control.addEventListener("input", () => { refreshRowStyle(); changed(); }));
    tr.querySelector(".move-processing-up").addEventListener("click", () => moveTableRow(tr, -1, renumberProcessing));
    tr.querySelector(".move-processing-down").addEventListener("click", () => moveTableRow(tr, 1, renumberProcessing));
    tr.querySelector(".remove-processing").addEventListener("click", () => {
      if (processingBody.children.length <= 1) return;
      tr.remove();
      renumberProcessing();
      changed();
    });
    refreshRowStyle();
    return tr;
  }

  function renumberProcessing() {
    [...processingBody.rows].forEach((row, index, rows) => {
      row.cells[0].textContent = index + 1;
      row.querySelector(".move-processing-up").disabled = index === 0;
      row.querySelector(".move-processing-down").disabled = index === rows.length - 1;
    });
  }

  function readProcessingRow(row) {
    const value = field => row.querySelector(`[data-processing-field="${field}"]`).value;
    return { id: row.dataset.id, group: value("group"), name: value("name").trim(), method: value("method"), qty: number(value("qty")), rate: number(value("rate")) };
  }

  function readProcessing() {
    return [...processingBody.rows].map(readProcessingRow);
  }

  function renderProcessing(processing) {
    const source = processing?.length ? processing : DEFAULT_PROCESSING;
    processingBody.replaceChildren(...source.map(processingRow));
    renumberProcessing();
  }

  function processingTotals(processing = readProcessing()) {
    return processing.reduce((total, item) => {
      const cost = Math.round(Math.max(number(item.qty), 0) * Math.max(number(item.rate), 0));
      total[item.group] = (total[item.group] || 0) + cost;
      total.all += cost;
      return total;
    }, { machining: 0, heat: 0, edm: 0, all: 0 });
  }

  function calculateProcessing(processing = readProcessing(), currency = form.elements.currency?.value || "KRW") {
    const total = processingTotals(processing);
    [...processingBody.rows].forEach((row, index) => {
      row.querySelector(".processing-cost").value = money(number(processing[index].qty) * number(processing[index].rate), currency);
      const method = processing[index].method;
      row.querySelector(".processing-rate").placeholder = method === "lump" ? `${currency}/lot` : `${currency}/${method === "weight" ? "kg" : "hr"}`;
    });
    document.getElementById("machiningCostTotal").textContent = money(total.machining, currency);
    document.getElementById("heatCostTotal").textContent = money(total.heat, currency);
    document.getElementById("edmCostTotal").textContent = money(total.edm, currency);
    document.getElementById("processingCostTotal").textContent = money(total.all, currency);
    return total;
  }

  function readData() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.id = currentId;
    data.dieQuantity = number(data.dieQuantity);
    data.marginRate = number(data.marginRate);
    data.showMargin = form.elements.showMargin.checked;
    data.includeMaterialPage = form.elements.includeMaterialPage.checked;
    data.includeProcessingPage = form.elements.includeProcessingPage.checked;
    data.materialRoundingEnabled = form.elements.materialRoundingEnabled.checked;
    data.materialRoundingUnit = number(form.elements.materialRoundingUnit.value) || 1000;
    data.items = readItems();
    data.materials = readMaterials();
    data.processing = readProcessing();
    data.updatedAt = new Date().toISOString();
    return data;
  }

  function writeData(data) {
    const defaults = blankData();
    const hasItems = Array.isArray(data.items) && data.items.some(item => String(item.name || item.description || "").trim() || number(item.price));
    const hasMaterials = Array.isArray(data.materials) && data.materials.some(item => String(item.name || item.grade || "").trim() || number(item.x) || number(item.y) || number(item.t));
    const hasProcessing = Array.isArray(data.processing) && data.processing.length;
    data = { ...defaults, ...data, items: hasItems ? data.items : defaults.items, materials: hasMaterials ? data.materials : defaults.materials, processing: hasProcessing ? data.processing : defaults.processing };
    if (!PDF_TEXT[data.documentLocale]) data.documentLocale = data.currency === "JPY" ? "ja" : data.currency === "USD" ? "en" : initialLocale;
    data.currency = CURRENCY_BY_LOCALE[data.documentLocale];
    data.items = data.items.map(item => {
      if (item.name === "조립·사상·트라이비") return { ...item, name: "조립·TRY비", description: "조립 및 TRY" };
      if (item.name === "금형 소재비") {
        const description = String(item.description || "").trim();
        return { ...item, description: description ? (/^\[별첨\d*\]/.test(description) ? description.replace(/^\[별첨\d*\]/, "[별첨1]") : `[별첨1] ${description}`) : "[별첨1] 금형소재 산출명세 참조" };
      }
      if (["기계가공비", "와이어·방전가공비", "열처리·표면처리비"].includes(item.name)) {
        const description = String(item.description || "").trim();
        return { ...item, description: description ? (/^\[별첨\d*\]/.test(description) ? description.replace(/^\[별첨\d*\]/, "[별첨2]") : `[별첨2] ${description}`) : "[별첨2] 가공비용 산출명세 참조" };
      }
      return item;
    });
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(data.validUntil || ""))) data.validUntil = "작성일로부터 30일";
    const standardPartIndex = data.items.findIndex(item => item.name === "표준부품비");
    if (standardPartIndex >= 0) {
      const [standardPart] = data.items.splice(standardPartIndex, 1);
      const heatTreatmentIndex = data.items.findIndex(item => item.name === "열처리·표면처리비");
      data.items.splice(heatTreatmentIndex >= 0 ? heatTreatmentIndex + 1 : Math.min(standardPartIndex, data.items.length), 0, standardPart);
    }
    currentId = data.id || crypto.randomUUID();
    [...form.elements].forEach(control => {
      if (!control.name || control.type === "file") return;
      if (control.type === "checkbox") control.checked = Boolean(data[control.name]);
      else if (data[control.name] != null) control.value = data[control.name];
    });
    renderItems(data.items);
    renderMaterials(data.materials);
    renderProcessing(data.processing);
    document.getElementById("documentLocale").value = data.documentLocale;
    applyInterfaceLocale(data.documentLocale);
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

  const ITEM_ALIASES = {
    material: ["금형 소재비", "金型材料費", "Material Cost"],
    machining: ["기계가공비", "機械加工費", "Machining Cost"],
    heat: ["열처리·표면처리비", "熱処理・表面処理費", "Heat / Surface Treatment"],
    edm: ["와이어·방전가공비", "ワイヤー・放電加工費", "Wire / EDM Cost"]
  };
  const QUOTE_ITEM_TRANSLATIONS = [
    ["금형 설계비", "金型設計費", "Die Design Cost"], ["금형 소재비", "金型材料費", "Material Cost"], ["기계가공비", "機械加工費", "Machining Cost"],
    ["와이어·방전가공비", "ワイヤー・放電加工費", "Wire / EDM Cost"], ["열처리·표면처리비", "熱処理・表面処理費", "Heat / Surface Treatment"], ["표준부품비", "標準部品費", "Standard Parts"],
    ["조립·TRY비", "組立・TRY費", "Assembly / TRY"], ["검사·운송·기타", "検査・運送・その他", "Inspection / Shipping / Other"]
  ];
  const DESCRIPTION_TRANSLATIONS = [
    ["공정검토 및 2D/3D 설계", "工程検討および2D/3D設計", "Process review and 2D/3D design"], ["가이드·스프링·볼트 등", "ガイド・スプリング・ボルト等", "Guides, springs, bolts, etc."],
    ["조립 및 TRY", "組立およびTRY", "Assembly and TRY"], ["측정, 검사, 포장 및 운송", "測定、検査、梱包および運送", "Measurement, inspection, packing and shipping"]
  ];
  const DIE_TYPE_TRANSLATIONS = [
    ["단발금형", "単発金型", "Single-operation die"], ["순차이송금형", "順送金型", "Progressive die"], ["트랜스퍼금형", "トランスファー金型", "Transfer die"], ["복합금형", "複合金型", "Compound die"], ["기타", "その他", "Other"]
  ];
  const PROCESS_NAME_TRANSLATIONS = [
    ["밀링", "フライス加工", "Milling"], ["드릴링", "穴あけ", "Drilling"], ["선반", "旋盤", "Turning"], ["성형연마", "成形研削", "Form Grinding"], ["콘타", "コンター加工", "Contour Saw"],
    ["사상", "仕上げ", "Finishing"], ["열처리", "熱処理", "Heat Treatment"], ["와이어 가공", "ワイヤーカット", "Wire Cutting"], ["방전가공(EDM)", "放電加工(EDM)", "EDM"]
  ];
  const DEFAULT_VALUE_TRANSLATIONS = {
    validUntil: [["작성일로부터 30일", "作成日から30日間", "30 days from issue date"]],
    delivery: [["발주 후 협의", "ご発注後に協議", "To be agreed after order"]],
    paymentTerms: [["별도 협의", "別途協議", "To be agreed"]],
    notes: [["- 제품 또는 금형 사양 변경에 따른 추가 비용은 별도 협의합니다.\n- 납기와 트라이 범위는 발주 전 최종 협의합니다.", "- 製品または金型仕様の変更に伴う追加費用は別途協議とします。\n- 納期およびTRY範囲はご発注前に最終確認します。", "- Additional costs caused by product or die specification changes will be quoted separately.\n- Delivery and TRY scope will be finalized before order."]]
  };

  function translatedKnown(value, sets, locale) {
    const index = locale === "ja" ? 1 : locale === "en" ? 2 : 0;
    const normalized = String(value || "").trim().toLowerCase();
    const found = sets.find(set => set.some(entry => entry.toLowerCase() === normalized));
    return found ? found[index] : value;
  }

  function localizedDescription(value, locale) {
    const text = String(value || "");
    if (/^\[(별첨|別紙|Appendix)\s*1\]/i.test(text)) return locale === "ja" ? "[別紙1] 金型材料費明細書参照" : locale === "en" ? "[Appendix 1] See material cost detail" : "[별첨1] 금형소재 산출명세 참조";
    if (/^\[(별첨|別紙|Appendix)\s*2\]/i.test(text)) return locale === "ja" ? "[別紙2] 加工費明細書参照" : locale === "en" ? "[Appendix 2] See processing cost detail" : "[별첨2] 가공비용 산출명세 참조";
    return translatedKnown(text, DESCRIPTION_TRANSLATIONS, locale);
  }

  function itemKey(name) {
    const normalized = String(name || "").trim().toLowerCase();
    return Object.keys(ITEM_ALIASES).find(key => ITEM_ALIASES[key].some(alias => alias.toLowerCase() === normalized)) || "";
  }

  function quoteLineAmount(item) {
    return Math.round(number(item?.qty) * number(item?.price));
  }

  function setSyncStatus(id, synced, locale = documentLocale()) {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = synced ? (locale === "ja" ? "反映済" : locale === "en" ? "Applied" : "반영") : (locale === "ja" ? "未反映" : locale === "en" ? "Not applied" : "미반영");
    badge.classList.toggle("synced", synced);
    badge.classList.toggle("pending", !synced);
  }

  function updateCalculatorSyncStatus(data) {
    const material = materialTotals(data.materials, data.materialRoundingEnabled, data.materialRoundingUnit);
    const materialItem = data.items.find(item => itemKey(item.name) === "material");
    const materialSynced = material.rawCost > 0 && Boolean(materialItem) && quoteLineAmount(materialItem) === material.cost;
    const processing = processingTotals(data.processing);
    const processingSynced = processing.all > 0 && ["machining", "heat", "edm"].every(key => {
      const item = data.items.find(candidate => itemKey(candidate.name) === key);
      return Boolean(item) && quoteLineAmount(item) === processing[key];
    });
    setSyncStatus("materialSyncStatus", materialSynced, documentLocale(data));
    setSyncStatus("processingSyncStatus", processingSynced, documentLocale(data));
  }

  function applyInterfaceLocale(locale) {
    const ui = UI_TEXT[locale] || UI_TEXT.ko;
    document.documentElement.lang = locale === "ja" ? "ja" : locale === "en" ? "en" : "ko";
    document.querySelector(".quote-hero h1").textContent = ui.hero;
    const work = document.querySelector(".file-actions-card");
    work.querySelector("h2").textContent = ui.work;
    work.querySelector(":scope > p").textContent = ui.workHelp;
    work.querySelector(".document-locale-field > span").textContent = ui.language;
    document.getElementById("newQuote").textContent = ui.newQuote;
    document.querySelector(".file-button > span").innerHTML = ui.load.replace("|", "<br>");
    document.getElementById("downloadPdf").textContent = ui.pdf;
    document.getElementById("downloadQuote").textContent = ui.edit;
    document.getElementById("previewPdf").textContent = ui.preview;
    document.getElementById("pdfPreviewTitle").textContent = ui.previewTitle;
    const calculators = document.getElementById("linked-calculators");
    calculators.querySelector("h2").textContent = ui.calculators;
    calculators.querySelector(":scope > p").textContent = ui.calculatorHelp;
    document.querySelector("#openMaterialCalculator > span:first-child").textContent = ui.material;
    document.querySelector("#openProcessingCalculator > span:first-child").textContent = ui.processing;
    calculators.querySelectorAll(".calculator-link-meta small").forEach(element => { element.textContent = ui.open; });
    document.querySelector(".notice-card h2").textContent = ui.notice;
    const roundingUi = locale === "ja" ? ["材料費の端数処理を適用", "端数処理単位", "百円単位", "千円単位", "万円単位", "計算材料費", "最終材料費"] : locale === "en" ? ["Apply material cost rounding", "Rounding unit", "Hundreds", "Thousands", "Ten-thousands", "Calculated material cost", "Final material cost"] : ["소재비 반올림 적용", "반올림 단위", "백원 단위", "천원 단위", "만원 단위", "계산 소재비", "최종 소재비"];
    const rounding = document.querySelector(".material-rounding");
    rounding.querySelector(".check-label span").textContent = roundingUi[0];
    const unitLabel = rounding.querySelector("label:not(.check-label)");
    [...unitLabel.childNodes].find(node => node.nodeType === Node.TEXT_NODE).nodeValue = roundingUi[1];
    [...unitLabel.querySelectorAll("option")].forEach((option, index) => { option.textContent = roundingUi[index + 2]; });
    const roundingLabels = rounding.querySelectorAll(":scope > p > span:not([aria-hidden])");
    roundingLabels[0].textContent = roundingUi[5];
    roundingLabels[1].textContent = roundingUi[6];
  }

  function changeDocumentLocale(locale) {
    const normalized = PDF_TEXT[locale] ? locale : "ko";
    form.elements.documentLocale.value = normalized;
    form.elements.currency.value = CURRENCY_BY_LOCALE[normalized];
    document.getElementById("documentLocale").value = normalized;
    applyInterfaceLocale(normalized);
  }

  function calculate() {
    const data = readData();
    const result = totals(data);
    calculateMaterials(data.materials, data.currency, data.materialRoundingEnabled, data.materialRoundingUnit);
    calculateProcessing(data.processing, data.currency);
    [...itemsBody.rows].forEach((row, index) => row.querySelector(".item-total").value = money(number(data.items[index].qty) * number(data.items[index].price), data.currency));
    document.getElementById("itemsSubtotal").textContent = money(result.itemSubtotal, data.currency);
    document.getElementById("marginAmount").textContent = money(result.margin, data.currency);
    document.getElementById("supplyAmount").textContent = money(result.supply, data.currency);
    document.getElementById("vatAmount").textContent = money(result.vat, data.currency);
    document.getElementById("grandTotal").textContent = money(result.grand, data.currency);
    updateCalculatorSyncStatus(data);
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
    const materialTotal = materialTotals(data.materials, data.materialRoundingEnabled, data.materialRoundingUnit);
    const target = [...itemsBody.rows].find(row => itemKey(row.querySelector('[data-field="name"]').value) === "material");
    if (!target) {
      setStatus("견적 항목에서 금형 소재비 항목을 찾을 수 없습니다.", "error");
      return;
    }
    target.querySelector('[data-field="qty"]').value = 1;
    target.querySelector('[data-field="unit"]').value = textSet(data).unitEach;
    target.querySelector('[data-field="price"]').value = materialTotal.cost;
    const locale = documentLocale(data);
    const count = data.materials.filter(item => materialWeight(item) > 0).length;
    target.querySelector('[data-field="description"]').value = locale === "ja" ? `[別紙1] 金型材料費明細 ${count}品目 合計` : locale === "en" ? `[Appendix 1] Material cost detail, ${count} items total` : `[별첨1] 금형소재 산출명세 ${count}종 합계`;
    changed();
    setStatus(`최종 소재비 ${money(materialTotal.cost, data.currency)}을 견적 항목에 반영했습니다.`, "success");
    materialDialog.close();
  }

  function openMaterialDialog() {
    if (!materialDialog.open) materialDialog.showModal();
  }

  function applyProcessingTotal() {
    const data = readData();
    const total = processingTotals(data.processing);
    const targets = {
      machining: [...itemsBody.rows].find(row => itemKey(row.querySelector('[data-field="name"]').value) === "machining"),
      heat: [...itemsBody.rows].find(row => itemKey(row.querySelector('[data-field="name"]').value) === "heat"),
      edm: [...itemsBody.rows].find(row => itemKey(row.querySelector('[data-field="name"]').value) === "edm")
    };
    if (Object.values(targets).some(target => !target)) {
      setStatus("견적 항목에서 기계가공비·열처리비·와이어가공비 항목을 찾을 수 없습니다.", "error");
      return;
    }
    Object.entries(targets).forEach(([group, target]) => {
      target.querySelector('[data-field="qty"]').value = 1;
      target.querySelector('[data-field="unit"]').value = textSet(data).unitEach;
      target.querySelector('[data-field="price"]').value = total[group];
      const locale = documentLocale(data);
      target.querySelector('[data-field="description"]').value = locale === "ja" ? "[別紙2] 加工費明細書参照" : locale === "en" ? "[Appendix 2] See processing cost detail" : "[별첨2] 가공비용 산출명세 참조";
    });
    changed();
    setStatus(`가공비 합계 ${money(total.all, data.currency)}을 견적 항목별로 반영했습니다.`, "success");
    processingDialog.close();
  }

  function openProcessingDialog() {
    if (!processingDialog.open) processingDialog.showModal();
  }

  function clearMaterialQuery() {
    const url = new URL(location.href);
    if (url.searchParams.get("tool") !== "material") return;
    url.searchParams.delete("tool");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function clearProcessingQuery() {
    const url = new URL(location.href);
    if (url.searchParams.get("tool") !== "processing") return;
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

  function canvasTextLines(ctx, text, maxWidth, maxLines = 3) {
    const paragraphs = String(text || "-").split(/\r?\n/);
    const lines = [];
    for (const paragraph of paragraphs) {
      const words = String(paragraph || " ").trim().split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
        if (line) { lines.push(line); line = ""; }
        if (ctx.measureText(word).width <= maxWidth) { line = word; continue; }
        let fragment = "";
        for (const char of word) {
          if (ctx.measureText(fragment + char).width > maxWidth && fragment) { lines.push(fragment); fragment = char; }
          else fragment += char;
        }
        line = fragment;
      }
      lines.push(line || " ");
    }
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines) visible[maxLines - 1] = `${visible[maxLines - 1].slice(0, -1)}…`;
    return visible;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const lines = canvasTextLines(ctx, text, maxWidth, maxLines);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return lines.length;
  }

  function centeredCanvasText(ctx, text, x, centerY, maxWidth, lineHeight, maxLines = 3) {
    const lines = canvasTextLines(ctx, text, maxWidth, maxLines);
    const firstY = centerY - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, index) => ctx.fillText(line, x, firstY + index * lineHeight));
    return lines.length;
  }

  function adaptivePdfRowHeight(itemCount) {
    return Math.max(96, Math.min(120, Math.floor(1040 / Math.max(itemCount, 1))));
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
    const font = (size, weight = 400) => { ctx.font = `${weight} ${size}px Arial, "Malgun Gothic", "Yu Gothic", Meiryo, "Noto Sans JP", "Noto Sans KR", sans-serif`; };
    const line = (x1, y1, x2, y2, color = colors.line, thickness = 2) => { ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const box = (x, y, w, h, fill = null, stroke = colors.line, thickness = 2) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); } ctx.strokeStyle = stroke; ctx.lineWidth = thickness; ctx.strokeRect(x, y, w, h); };
    const footer = () => {
      line(left, 3260, right, 3260, colors.line, 2);
      font(28, 400); ctx.fillStyle = colors.muted; ctx.textAlign = "left"; ctx.fillText(data.sellerCompany || textSet(data).missingSeller, left, 3310);
      ctx.textAlign = "center"; ctx.fillText(data.quoteNumber || "-", 1240, 3310);
      ctx.textAlign = "right"; ctx.fillText(`${pageNumber} / ${pageCount}`, right, 3310);
    };

    ctx.fillStyle = colors.blue; ctx.fillRect(left, 132, 12, 238);
    ctx.textAlign = "left"; font(28, 800); ctx.fillStyle = colors.blue; ctx.fillText(kicker, left + 46, 152);
    font(titleSize, 800); ctx.fillStyle = colors.navy; ctx.fillText(title, left + 46, 245);
    font(30, 700); ctx.fillStyle = colors.muted; ctx.fillText(subtitle, left + 49, 332);
    ctx.textAlign = "right"; font(136, 800); ctx.fillStyle = "#edf3f8"; ctx.fillText(String(pageNumber).padStart(2, "0"), right, 198);
    font(28, 400); ctx.fillStyle = colors.text; ctx.fillText(`NO. ${data.quoteNumber || "-"}`, right, 315);
    font(26, 400); ctx.fillStyle = colors.muted; ctx.fillText(data.quoteDate || "-", right, 356);
    line(left, 420, right, 420, colors.navy, 5);

    return { canvas, ctx, left, right, width, colors, font, line, box, footer };
  }

  function pdfPageCount(data) {
    return 1 + (data.includeMaterialPage ? 1 : 0) + (data.includeProcessingPage ? 1 : 0);
  }

  function drawPdfCanvas(data, pageCount = pdfPageCount(data)) {
    const total = totals(data);
    const t = textSet(data), locale = documentLocale(data);
    const { canvas, ctx, left, right, width, colors, font, line, box, footer } = createQuotationPage(data, {
      pageNumber: 1,
      pageCount,
      kicker: "QUOTATION / PRESS DIE",
      title: t.quoteTitle,
      subtitle: t.quoteSubtitle,
      titleSize: 92
    });
    const infoCard = (label, title, details, x, y, w, h) => {
      box(x, y, w, h, colors.white);
      ctx.fillStyle = colors.pale; ctx.fillRect(x, y, w, 66);
      ctx.textAlign = "left"; font(24, 800); ctx.fillStyle = colors.blue; ctx.fillText(label, x + 24, y + 34);
      font(40, 400); ctx.fillStyle = colors.navy; centeredCanvasText(ctx, title || "-", x + 24, y + 112, w - 48, 42, 1);
      font(27, 500); ctx.fillStyle = colors.text;
      details.slice(0, 2).forEach((detail, index) => centeredCanvasText(ctx, detail || "-", x + 24, y + 174 + index * 48, w - 48, 38, 1));
    };
    const field = (label, value, x, y, w, h) => {
      box(x, y, w, h, colors.white);
      ctx.textAlign = "left"; font(23, 700); ctx.fillStyle = colors.muted; ctx.fillText(label, x + 20, y + 29);
      font(33, 400); ctx.fillStyle = colors.ink; centeredCanvasText(ctx, value || "-", x + 20, y + 79, w - 40, 40, 1);
    };

    const cardY = 470, cardGap = 24, cardW = (width - cardGap) / 2;
    const sellerDetail1 = [data.sellerRepresentative && `${t.representative} ${data.sellerRepresentative}`, data.sellerBusinessNo && `${t.businessNo} ${data.sellerBusinessNo}`, data.sellerContact && `${t.contact} ${data.sellerContact}`].filter(Boolean).join(" / ");
    const sellerDetail2 = [data.sellerPhone, data.sellerEmail, data.sellerAddress].filter(Boolean).join(" / ");
    infoCard(t.supplier, data.sellerCompany || t.missingSeller, [sellerDetail1 || "-", sellerDetail2 || "-"], left, cardY, cardW, 280);
    infoCard(t.recipient, data.buyerCompany || t.missingBuyer, [data.buyerContact ? `${t.contact} ${data.buyerContact}` : t.missingContact, data.projectName ? `${t.project} ${data.projectName}` : t.missingProject], left + cardW + cardGap, cardY, cardW, 280);

    const amountY = 780;
    box(left, amountY, width, 142, "#f7fafc", colors.line);
    ctx.fillStyle = colors.blue; ctx.fillRect(left, amountY, 10, 142);
    ctx.textAlign = "left"; font(25, 800); ctx.fillStyle = colors.muted; ctx.fillText(t.proposed, left + 34, amountY + 38);
    font(34, 400); ctx.fillStyle = colors.ink; ctx.fillText(data.projectName || t.defaultProject, left + 34, amountY + 96);
    ctx.textAlign = "right"; font(46, 400); ctx.fillStyle = colors.navy; ctx.fillText(money(total.grand, data.currency), right - 28, amountY + 73);

    const fieldY = 950, fieldGap = 20, fieldW = (width - fieldGap * 2) / 3, fieldH = 110;
    const fields = [
      [t.dieType, `${translatedKnown(data.dieType || "-", DIE_TYPE_TRANSLATIONS, locale)} / ${data.dieQuantity || 1}${t.unitEach}`], [t.productMaterial, data.productMaterial], [t.pressSpec, data.pressSpec],
      [t.validUntil, translatedKnown(data.validUntil, DEFAULT_VALUE_TRANSLATIONS.validUntil, locale)], [t.delivery, translatedKnown(data.delivery, DEFAULT_VALUE_TRANSLATIONS.delivery, locale)], [t.payment, translatedKnown(data.paymentTerms, DEFAULT_VALUE_TRANSLATIONS.paymentTerms, locale)]
    ];
    fields.forEach(([label, value], index) => field(label, value, left + (index % 3) * (fieldW + fieldGap), fieldY + Math.floor(index / 3) * (fieldH + 20), fieldW, fieldH));

    const visibleItems = data.items.filter(item => item.name || item.description || item.price).slice(0, 10);
    const tableY = 1230, headerH = 86, rowH = adaptivePdfRowHeight(visibleItems.length);
    const columns = [left, left + 430, left + 1170, left + 1330, left + 1490, right];
    box(left, tableY, width, headerH, colors.pale, colors.line);
    ctx.fillStyle = colors.blue; ctx.fillRect(left, tableY, width, 6);
    const headers = t.itemHeaders;
    ctx.textAlign = "center"; font(36, 800); ctx.fillStyle = colors.navy;
    headers.forEach((header, i) => ctx.fillText(header, (columns[i] + columns[i + 1]) / 2, tableY + headerH / 2));
    visibleItems.forEach((item, index) => {
      const y = tableY + headerH + index * rowH;
      box(left, y, width, rowH, index % 2 ? colors.wash : colors.white, colors.line);
      columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, colors.line));
      ctx.textAlign = "left"; font(34, 400); ctx.fillStyle = colors.ink; centeredCanvasText(ctx, translatedKnown(item.name || "-", QUOTE_ITEM_TRANSLATIONS, locale), columns[0] + 18, y + rowH / 2, columns[1] - columns[0] - 36, 40, 2);
      const isAttachment = /^\[(별첨|別紙|Appendix)\s*\d+\]/i.test(String(item.description || ""));
      font(32, 400); ctx.fillStyle = isAttachment ? colors.blue : colors.text; centeredCanvasText(ctx, localizedDescription(item.description || "-", locale), columns[1] + 18, y + rowH / 2, columns[2] - columns[1] - 36, 39, 2);
      ctx.textAlign = "center"; font(32, 400); ctx.fillStyle = colors.ink; ctx.fillText(String(item.qty || 0), (columns[2] + columns[3]) / 2, y + rowH / 2); ctx.fillText(item.unit === "식" ? t.unitEach : (item.unit || t.unitEach), (columns[3] + columns[4]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; font(36, 400); ctx.fillText(money(number(item.qty) * number(item.price), data.currency), columns[5] - 18, y + rowH / 2);
    });
    const itemEndY = tableY + headerH + Math.max(visibleItems.length, 1) * rowH;
    const summaryX = 1320, summaryW = right - summaryX, summaryRowH = 82;
    const summary = [[t.subtotal, total.itemSubtotal], ...(number(data.marginRate) > 0 && data.showMargin ? [[`${t.overhead} (${data.marginRate}%)`, total.margin]] : []), [t.supply, total.supply], [data.vatMode === "none" ? t.vat : `${t.vat} (10%)`, total.vat]];
    let summaryY = itemEndY + 24;
    summary.forEach(([label, value]) => { box(summaryX, summaryY, summaryW, summaryRowH, colors.white); ctx.textAlign = "left"; font(32, 600); ctx.fillStyle = colors.text; ctx.fillText(label, summaryX + 20, summaryY + summaryRowH / 2); ctx.textAlign = "right"; font(32, 400); ctx.fillStyle = colors.ink; ctx.fillText(money(value, data.currency), right - 18, summaryY + summaryRowH / 2); summaryY += summaryRowH; });
    box(summaryX, summaryY, summaryW, 104, colors.pale, colors.blue, 3); ctx.fillStyle = colors.blue; ctx.fillRect(summaryX, summaryY, 9, 104); ctx.textAlign = "left"; font(35, 800); ctx.fillStyle = colors.navy; ctx.fillText(t.grand, summaryX + 28, summaryY + 52); ctx.textAlign = "right"; font(46, 400); ctx.fillText(money(total.grand, data.currency), right - 20, summaryY + 52);

    const notesY = Math.max(summaryY + 144, itemEndY + 405);
    ctx.textAlign = "left"; font(34, 800); ctx.fillStyle = colors.navy; ctx.fillText(t.notes, left, notesY);
    box(left, notesY + 42, width, 300, colors.wash); font(30, 400); ctx.fillStyle = colors.text; wrapCanvasText(ctx, translatedKnown(data.notes || "-", DEFAULT_VALUE_TRANSLATIONS.notes, locale), left + 26, notesY + 86, width - 52, 46, 5);
    footer();
    return canvas;
  }

  function drawMaterialPdfCanvas(data, pageNumber = 2, pageCount = pdfPageCount(data)) {
    const materials = data.materials || [];
    const materialTotal = materialTotals(materials, data.materialRoundingEnabled, data.materialRoundingUnit);
    const t = textSet(data);
    const { canvas, ctx, left, right, width, colors, font, line, box, footer } = createQuotationPage(data, {
      pageNumber,
      pageCount,
      kicker: "DETAIL / MATERIAL COST",
      title: t.materialTitle,
      subtitle: t.materialSubtitle,
      titleSize: 72
    });

    const projectY = 470;
    box(left, projectY, width, 112, colors.white);
    ctx.textAlign = "left"; font(24, 800); ctx.fillStyle = colors.blue; ctx.fillText(t.projectLabel, left + 26, projectY + 32);
    font(38, 400); ctx.fillStyle = colors.navy; ctx.fillText(data.projectName || t.missingProject, left + 26, projectY + 78);
    ctx.textAlign = "right"; font(27, 400); ctx.fillStyle = colors.text; ctx.fillText(`${data.sellerCompany || t.missingSeller}  >  ${data.buyerCompany || t.missingBuyer}`, right - 26, projectY + 58);

    const cardY = 615, gap = 22, cardW = (width - gap * 2) / 3;
    const summaryCards = [[t.materialCards[0], `${materials.filter(item => materialWeight(item) > 0).length} ${t.kinds}`], [t.materialCards[1], `${materialTotal.weight.toFixed(2)} kg`], [t.materialCards[2], money(materialTotal.cost, data.currency)]];
    summaryCards.forEach(([label, value], index) => { const x = left + index * (cardW + gap); box(x, cardY, cardW, 142, index === 2 ? colors.pale : colors.white, colors.line); if (index === 2) { ctx.fillStyle = colors.blue; ctx.fillRect(x, cardY, 8, 142); } ctx.textAlign = "left"; font(24, 700); ctx.fillStyle = colors.muted; ctx.fillText(label, x + 26, cardY + 38); font(index === 2 ? 40 : 44, 400); ctx.fillStyle = index === 2 ? colors.navy : colors.ink; ctx.fillText(value, x + 26, cardY + 96); });

    const visibleMaterials = materials.slice(0, 10);
    const tableY = 800, headerH = 90, rowH = adaptivePdfRowHeight(visibleMaterials.length);
    const columns = [left, left + 80, left + 380, left + 550, left + 910, left + 1310, left + 1420, left + 1600, left + 1780, right];
    const headers = t.materialHeaders;
    box(left, tableY, width, headerH, colors.pale, colors.line);
    ctx.fillStyle = colors.blue; ctx.fillRect(left, tableY, width, 6);
    ctx.textAlign = "center"; font(28, 800); ctx.fillStyle = colors.navy;
    headers.forEach((header, index) => { const parts = header.split("\n"); parts.forEach((part, partIndex) => ctx.fillText(part, (columns[index] + columns[index + 1]) / 2, tableY + headerH / 2 + (partIndex - (parts.length - 1) / 2) * 32)); });
    visibleMaterials.forEach((material, index) => {
      const y = tableY + headerH + index * rowH;
      box(left, y, width, rowH, index % 2 ? colors.wash : colors.white, colors.line);
      columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, colors.line));
      const weight = materialWeight(material); const cost = Math.round(weight * number(material.unitPrice));
      ctx.textAlign = "center"; font(30, 400); ctx.fillStyle = colors.muted; ctx.fillText(String(index + 1).padStart(2, "0"), (columns[0] + columns[1]) / 2, y + rowH / 2);
      ctx.textAlign = "left"; font(30, 400); ctx.fillStyle = colors.ink; centeredCanvasText(ctx, material.name || "-", columns[1] + 15, y + rowH / 2, columns[2] - columns[1] - 30, 36, 3);
      ctx.textAlign = "center"; font(32, 400); ctx.fillStyle = colors.ink; ctx.fillText(material.grade || "-", (columns[2] + columns[3]) / 2, y + rowH / 2);
      font(29, 400); ctx.fillStyle = colors.text; ctx.fillText(`${material.x || 0} × ${material.y || 0} × ${material.t || 0}`, (columns[3] + columns[4]) / 2, y + rowH / 2);
      font(29, 400); ctx.fillStyle = colors.blue; ctx.fillText(`${material.rawX || 0} × ${material.rawY || 0} × ${material.rawT || 0}`, (columns[4] + columns[5]) / 2, y + rowH / 2);
      font(30, 400); ctx.fillStyle = colors.text; ctx.fillText(String(material.qty || 0), (columns[5] + columns[6]) / 2, y + rowH / 2); ctx.fillText(weight.toFixed(2), (columns[6] + columns[7]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; ctx.fillText(new Intl.NumberFormat(t.locale).format(number(material.unitPrice)), columns[8] - 14, y + rowH / 2); font(32, 400); ctx.fillStyle = colors.ink; ctx.fillText(money(cost, data.currency), columns[9] - 14, y + rowH / 2);
    });

    const tableEnd = tableY + headerH + Math.max(visibleMaterials.length, 1) * rowH;
    const roundingY = tableEnd + 26;
    box(left, roundingY, width, 76, colors.white, colors.line); ctx.textAlign = "left"; font(28, 700); ctx.fillStyle = colors.text; ctx.fillText(materialTotal.roundingEnabled ? `${t.rounding} (${roundingUnitLabel(materialTotal.roundingUnit, data)} ${t.unitSuffix})` : `${t.rounding} (${t.notApplied})`, left + 28, roundingY + 38); ctx.textAlign = "right"; font(30, 400); ctx.fillStyle = colors.ink; ctx.fillText(materialTotal.roundingEnabled ? `${money(materialTotal.rawCost, data.currency)} → ${money(materialTotal.cost, data.currency)}` : money(materialTotal.rawCost, data.currency), right - 28, roundingY + 38);
    const totalY = roundingY + 88;
    box(left, totalY, width, 138, colors.pale, colors.blue, 3); ctx.fillStyle = colors.blue; ctx.fillRect(left, totalY, 9, 138); ctx.textAlign = "left"; font(36, 800); ctx.fillStyle = colors.navy; ctx.fillText(t.materialTotal, left + 30, totalY + 69); ctx.textAlign = "right"; font(44, 400); ctx.fillText(money(materialTotal.cost, data.currency), right - 30, totalY + 69);
    const noteY = totalY + 190; ctx.textAlign = "left"; font(30, 800); ctx.fillStyle = colors.navy; ctx.fillText(t.basis, left, noteY); font(26, 400); ctx.fillStyle = colors.muted; ctx.fillText(t.materialNotes[0], left, noteY + 42); ctx.fillText(t.materialNotes[1], left, noteY + 80);
    footer();
    return canvas;
  }

  function drawProcessingPdfCanvas(data, pageNumber, pageCount = pdfPageCount(data)) {
    const processing = data.processing || [];
    const total = processingTotals(processing);
    const t = textSet(data), locale = documentLocale(data);
    const { canvas, ctx, left, right, width, colors, font, line, box, footer } = createQuotationPage(data, {
      pageNumber,
      pageCount,
      kicker: "DETAIL / PROCESSING COST",
      title: t.processingTitle,
      subtitle: t.processingSubtitle,
      titleSize: 68
    });
    const projectY = 470;
    box(left, projectY, width, 112, colors.white);
    ctx.textAlign = "left"; font(24, 800); ctx.fillStyle = colors.blue; ctx.fillText(t.projectLabel, left + 26, projectY + 32);
    font(38, 400); ctx.fillStyle = colors.navy; ctx.fillText(data.projectName || t.missingProject, left + 26, projectY + 78);
    ctx.textAlign = "right"; font(27, 400); ctx.fillStyle = colors.text; ctx.fillText(`${data.sellerCompany || t.missingSeller}  >  ${data.buyerCompany || t.missingBuyer}`, right - 26, projectY + 58);

    const cardY = 615, gap = 18, cardW = (width - gap * 3) / 4;
    const cards = t.processingCards.map((label, index) => [label, [total.machining, total.heat, total.edm, total.all][index]]);
    cards.forEach(([label, value], index) => { const x = left + index * (cardW + gap); box(x, cardY, cardW, 142, index === 3 ? colors.pale : colors.white, colors.line); if (index === 3) { ctx.fillStyle = colors.blue; ctx.fillRect(x, cardY, 8, 142); } ctx.textAlign = "left"; font(22, 700); ctx.fillStyle = colors.muted; ctx.fillText(label, x + 22, cardY + 37); font(36, 400); ctx.fillStyle = index === 3 ? colors.navy : colors.ink; centeredCanvasText(ctx, money(value, data.currency), x + 22, cardY + 96, cardW - 44, 38, 1); });

    const visibleProcessing = processing.slice(0, 12);
    const tableY = 800, headerH = 88, rowH = adaptivePdfRowHeight(visibleProcessing.length);
    const columns = [left, left + 80, left + 350, left + 760, left + 1080, left + 1330, left + 1530, left + 1800, right];
    const headers = t.processingHeaders;
    box(left, tableY, width, headerH, colors.pale, colors.line); ctx.fillStyle = colors.blue; ctx.fillRect(left, tableY, width, 6);
    ctx.textAlign = "center"; font(30, 800); ctx.fillStyle = colors.navy; headers.forEach((header, index) => ctx.fillText(header, (columns[index] + columns[index + 1]) / 2, tableY + headerH / 2));
    visibleProcessing.forEach((item, index) => {
      const y = tableY + headerH + index * rowH;
      const groupFill = item.group === "heat" ? "#fff8e8" : item.group === "edm" ? "#f3f0fb" : (index % 2 ? colors.wash : colors.white);
      box(left, y, width, rowH, groupFill, colors.line); columns.slice(1, -1).forEach(x => line(x, y, x, y + rowH, colors.line));
      const method = PROCESSING_METHODS[item.method] || PROCESSING_METHODS.hour;
      const cost = Math.round(number(item.qty) * number(item.rate));
      ctx.textAlign = "center"; font(29, 400); ctx.fillStyle = colors.muted; ctx.fillText(String(index + 1).padStart(2, "0"), (columns[0] + columns[1]) / 2, y + rowH / 2);
      font(29, 400); ctx.fillStyle = item.group === "heat" ? "#9a5a00" : item.group === "edm" ? "#65458b" : colors.blue; centeredCanvasText(ctx, t.groups[item.group] || t.groups.machining, (columns[1] + columns[2]) / 2, y + rowH / 2, columns[2] - columns[1] - 20, 36, 2);
      ctx.textAlign = "left"; font(32, 400); ctx.fillStyle = colors.ink; centeredCanvasText(ctx, translatedKnown(item.name || "-", PROCESS_NAME_TRANSLATIONS, locale), columns[2] + 18, y + rowH / 2, columns[3] - columns[2] - 36, 38, 2);
      const localizedMethod = t.methods[item.method] || t.methods.hour;
      ctx.textAlign = "center"; font(29, 400); ctx.fillStyle = colors.text; ctx.fillText(localizedMethod[0], (columns[3] + columns[4]) / 2, y + rowH / 2); ctx.fillText(new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 }).format(number(item.qty)), (columns[4] + columns[5]) / 2, y + rowH / 2); ctx.fillText(localizedMethod[1], (columns[5] + columns[6]) / 2, y + rowH / 2);
      ctx.textAlign = "right"; ctx.fillText(new Intl.NumberFormat(t.locale).format(number(item.rate)), columns[7] - 16, y + rowH / 2); font(32, 400); ctx.fillStyle = colors.ink; ctx.fillText(money(cost, data.currency), columns[8] - 16, y + rowH / 2);
    });
    const tableEnd = tableY + headerH + Math.max(visibleProcessing.length, 1) * rowH;
    box(left, tableEnd + 28, width, 132, colors.pale, colors.blue, 3); ctx.fillStyle = colors.blue; ctx.fillRect(left, tableEnd + 28, 9, 132); ctx.textAlign = "left"; font(36, 800); ctx.fillStyle = colors.navy; ctx.fillText(t.processingTotal, left + 30, tableEnd + 94); ctx.textAlign = "right"; font(46, 400); ctx.fillText(money(total.all, data.currency), right - 30, tableEnd + 94);
    const noteY = tableEnd + 210; ctx.textAlign = "left"; font(30, 800); ctx.fillStyle = colors.navy; ctx.fillText(t.basis, left, noteY); font(26, 400); ctx.fillStyle = colors.muted; ctx.fillText(t.processingNotes[0], left, noteY + 42); ctx.fillText(t.processingNotes[1], left, noteY + 80);
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
      const pageCount = pdfPageCount(data);
      const pages = [drawPdfCanvas(data, pageCount)];
      let pageNumber = 2;
      if (data.includeMaterialPage) pages.push(drawMaterialPdfCanvas(data, pageNumber++, pageCount));
      if (data.includeProcessingPage) pages.push(drawProcessingPdfCanvas(data, pageNumber, pageCount));
      const pdf = await canvasesToPdf(pages);
      downloadBlob(pdf, `${safeFilename(data.quoteNumber, "press-die-quotation")}.pdf`);
      await saveLocal(false);
      setStatus("PDF를 저장했습니다. 수정용 견적 파일도 함께 보관하세요.", "success");
    } catch {
      setStatus("PDF 생성에 실패했습니다. 브라우저를 확인해 주세요.", "error");
    } finally {
      button.disabled = false; button.textContent = UI_TEXT[documentLocale()]?.pdf || UI_TEXT.ko.pdf;
    }
  }

  function previewPdf() {
    const data = readData();
    const locale = documentLocale(data);
    const dialog = document.getElementById("pdfPreviewDialog");
    const pageCount = pdfPageCount(data);
    const pages = [drawPdfCanvas(data, pageCount)];
    let pageNumber = 2;
    if (data.includeMaterialPage) pages.push(drawMaterialPdfCanvas(data, pageNumber++, pageCount));
    if (data.includeProcessingPage) pages.push(drawProcessingPdfCanvas(data, pageNumber, pageCount));
    document.getElementById("pdfPreviewPages").replaceChildren(...pages.map((canvas, index) => {
      const figure = document.createElement("figure");
      figure.className = "pdf-preview-page";
      const caption = document.createElement("figcaption");
      caption.textContent = locale === "ja" ? `${index + 1}ページ / ${pages.length}ページ` : locale === "en" ? `Page ${index + 1} / ${pages.length}` : `${index + 1}페이지 / ${pages.length}페이지`;
      const image = document.createElement("img");
      image.src = canvas.toDataURL("image/jpeg", 0.9);
      image.alt = locale === "ja" ? `${caption.textContent} 見積書プレビュー` : locale === "en" ? `${caption.textContent} quotation preview` : (index === 0 ? "프레스금형 견적서 미리보기" : `${caption.textContent} 별첨 명세서 미리보기`);
      figure.append(caption, image);
      return figure;
    }));
    dialog.showModal();
  }

  form.addEventListener("submit", event => event.preventDefault());
  document.getElementById("documentLocale").addEventListener("change", event => { changeDocumentLocale(event.target.value); changed(); });
  form.addEventListener("input", changed);
  form.addEventListener("change", changed);
  document.getElementById("addItem").addEventListener("click", () => { if (itemsBody.children.length >= 10) { setStatus("PDF 한 페이지 출력을 위해 견적 항목은 최대 10개까지 지원합니다.", "error"); return; } itemsBody.append(itemRow({ qty: 1, unit: "식", price: 0 })); changed(); });
  document.getElementById("addMaterial").addEventListener("click", () => { if (materialsBody.children.length >= 10) { setStatus("PDF 한 페이지 출력을 위해 소재 항목은 최대 10개까지 지원합니다.", "error"); return; } materialsBody.append(materialRow({ qty: 1 }, materialsBody.children.length)); renumberMaterials(); changed(); });
  document.getElementById("restoreDefaultMaterials").addEventListener("click", () => { if (!confirm("현재 소재 항목을 기본 8개 항목으로 바꾸시겠습니까?")) return; renderMaterials(DEFAULT_MATERIALS.map(([name, grade]) => ({ name, grade, qty: 1 }))); changed(); });
  document.getElementById("addProcessing").addEventListener("click", () => { if (processingBody.children.length >= 12) { setStatus("PDF 한 페이지 출력을 위해 가공 항목은 최대 12개까지 지원합니다.", "error"); return; } processingBody.append(processingRow({ group: "machining", name: "", method: "hour", qty: 0, rate: 0 }, processingBody.children.length)); renumberProcessing(); changed(); });
  document.getElementById("restoreDefaultProcessing").addEventListener("click", () => { if (!confirm("현재 가공 항목과 임률을 권장 초기값으로 복원하시겠습니까?")) return; renderProcessing(DEFAULT_PROCESSING); changed(); });
  document.getElementById("applyMaterialTotal").addEventListener("click", applyMaterialTotal);
  document.getElementById("applyProcessingTotal").addEventListener("click", applyProcessingTotal);
  document.getElementById("openMaterialCalculator").addEventListener("click", openMaterialDialog);
  document.getElementById("openProcessingCalculator").addEventListener("click", openProcessingDialog);
  document.getElementById("closeMaterialDialog").addEventListener("click", () => materialDialog.close());
  document.getElementById("cancelMaterialDialog").addEventListener("click", () => materialDialog.close());
  materialDialog.addEventListener("click", event => { if (event.target === materialDialog) materialDialog.close(); });
  materialDialog.addEventListener("close", clearMaterialQuery);
  document.getElementById("closeProcessingDialog").addEventListener("click", () => processingDialog.close());
  document.getElementById("cancelProcessingDialog").addEventListener("click", () => processingDialog.close());
  processingDialog.addEventListener("click", event => { if (event.target === processingDialog) processingDialog.close(); });
  processingDialog.addEventListener("close", clearProcessingQuery);
  document.querySelectorAll('a[href*="?tool=material"]').forEach(link => link.addEventListener("click", event => { if (new URL(link.href).pathname === location.pathname) { event.preventDefault(); openMaterialDialog(); } }));
  document.querySelectorAll('a[href*="?tool=processing"]').forEach(link => link.addEventListener("click", event => { if (new URL(link.href).pathname === location.pathname) { event.preventDefault(); openProcessingDialog(); } }));
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
        const latest = requestedLocale && PDF_TEXT[requestedLocale] ? { ...list[0], documentLocale: requestedLocale, currency: CURRENCY_BY_LOCALE[requestedLocale] } : list[0];
        writeData(latest);
        await refreshSavedQuotes(list[0].id);
        setStatus("마지막으로 작성한 로컬 견적을 불러왔습니다.", "success");
        if (new URLSearchParams(location.search).get("tool") === "material") openMaterialDialog();
        if (new URLSearchParams(location.search).get("tool") === "processing") openProcessingDialog();
        return;
      }
    } catch { /* 저장소가 차단된 환경에서는 새 견적으로 시작한다. */ }
    const initial = blankData();
    currentId = initial.id;
    writeData(initial);
    await saveLocal(false);
    await refreshSavedQuotes(initial.id);
    if (new URLSearchParams(location.search).get("tool") === "material") openMaterialDialog();
    if (new URLSearchParams(location.search).get("tool") === "processing") openProcessingDialog();
  }

  initialize();
})();
