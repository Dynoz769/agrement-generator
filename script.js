const STORAGE_KEY = "surat-pengesahan-pembelian-draft-v2";
const DEFAULT_PAYMENT_METHOD = "Tunai / Bank Transfer";

const fields = {
  tarikh: document.getElementById("tarikh"),
  lokasi: document.getElementById("lokasi"),
  namaPenjual: document.getElementById("namaPenjual"),
  icPenjual: document.getElementById("icPenjual"),
  alamatPenjual: document.getElementById("alamatPenjual"),
  namaPembeli: document.getElementById("namaPembeli"),
  icPembeli: document.getElementById("icPembeli"),
  alamatPembeli: document.getElementById("alamatPembeli"),
  namaItem: document.getElementById("namaItem"),
  butiranItem: document.getElementById("butiranItem"),
  hargaJualan: document.getElementById("hargaJualan"),
  kaedahBayaran: document.getElementById("kaedahBayaran")
};

const outputs = {
  outRujukan: document.getElementById("outRujukan"),
  outTarikh: document.getElementById("outTarikh"),
  outLokasi: document.getElementById("outLokasi"),
  outNamaPenjual: document.getElementById("outNamaPenjual"),
  outIcPenjual: document.getElementById("outIcPenjual"),
  outAlamatPenjual: document.getElementById("outAlamatPenjual"),
  outNamaPembeli: document.getElementById("outNamaPembeli"),
  outIcPembeli: document.getElementById("outIcPembeli"),
  outAlamatPembeli: document.getElementById("outAlamatPembeli"),
  outNamaItem: document.getElementById("outNamaItem"),
  outButiranItem: document.getElementById("outButiranItem"),
  outHargaJualan: document.getElementById("outHargaJualan"),
  outKaedahBayaran: document.getElementById("outKaedahBayaran"),
  outHargaPerkataan: document.getElementById("outHargaPerkataan"),
  outStatusPersetujuan: document.getElementById("outStatusPersetujuan"),
  sigNamaPenjual: document.getElementById("sigNamaPenjual"),
  sigNamaPembeli: document.getElementById("sigNamaPembeli")
};

const statusEls = {
  completionText: document.getElementById("completionText"),
  progressPercent: document.getElementById("progressPercent"),
  progressFill: document.getElementById("progressFill"),
  docStatusBadge: document.getElementById("docStatusBadge"),
  draftState: document.getElementById("draftState"),
  lastSavedText: document.getElementById("lastSavedText"),
  referenceText: document.getElementById("referenceText"),
  missingList: document.getElementById("missingList"),
  actionFeedback: document.getElementById("actionFeedback"),
  liveRegion: document.getElementById("liveRegion")
};

const actions = {
  printBtns: document.querySelectorAll('[data-action="print"]'),
  copyBtns: document.querySelectorAll('[data-action="copy"]'),
  sampleBtns: document.querySelectorAll('[data-action="sample"]'),
  resetBtns: document.querySelectorAll('[data-action="reset"]'),
  clearPenjualBtn: document.getElementById("clearPenjualBtn"),
  clearPembeliBtn: document.getElementById("clearPembeliBtn"),
  menuToggles: document.querySelectorAll('[data-menu-toggle="true"]'),
  menuCloseBtn: document.getElementById("menuCloseBtn"),
  menuBackdrop: document.getElementById("menuBackdrop"),
  sideMenu: document.getElementById("sideMenu"),
  menuLinks: document.querySelectorAll('[data-menu-close="true"]')
};

const hargaFormatted = document.getElementById("hargaFormatted");
const hargaWords = document.getElementById("hargaWords");
const sigOutPenjualWrap = document.getElementById("sigOutPenjualWrap");
const sigOutPembeliWrap = document.getElementById("sigOutPembeliWrap");

const today = new Date();
const pads = {};
const requiredFields = Object.values(fields).filter((field) => field.dataset.required === "true");
const totalRequiredItems = requiredFields.length + 2;

let saveTimer = null;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const animationTimers = new WeakMap();
let lastMenuTrigger = null;

function emptyValue(value) {
  return value && value.trim() !== "" ? value.trim() : "________________";
}

function isMenuOpen() {
  return Boolean(actions.sideMenu && actions.sideMenu.classList.contains("is-open"));
}

function setMenuOpen(open, options = {}) {
  if (!actions.sideMenu || !actions.menuBackdrop) return;

  const shouldOpen = Boolean(open);
  const { trigger = null, restoreFocus = true } = options;

  if (shouldOpen === isMenuOpen()) return;

  if (shouldOpen) {
    lastMenuTrigger = trigger || document.activeElement;
  }

  actions.sideMenu.classList.toggle("is-open", shouldOpen);
  actions.sideMenu.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  actions.menuBackdrop.classList.toggle("is-visible", shouldOpen);
  actions.menuBackdrop.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  document.body.classList.toggle("menu-open", shouldOpen);

  actions.menuToggles.forEach((button) => {
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  });

  if (shouldOpen) {
    window.setTimeout(() => {
      actions.sideMenu.focus();
    }, 30);
    return;
  }

  if (restoreFocus && lastMenuTrigger && typeof lastMenuTrigger.focus === "function") {
    lastMenuTrigger.focus();
  }
}

function toggleMenu(event) {
  setMenuOpen(!isMenuOpen(), { trigger: event.currentTarget });
}

function closeMenu(options = {}) {
  setMenuOpen(false, options);
}

function closeMenuIfOpen() {
  if (isMenuOpen()) {
    closeMenu({ restoreFocus: false });
  }
}

function normalizeSpaces(value) {
  return value.replace(/\s+/g, " ").trim();
}

function formatDateMY(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatDateTimeMY(value) {
  if (!value) return "Belum ada draft disimpan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum ada draft disimpan";
  return date.toLocaleString("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizePriceInput(value) {
  const cleaned = String(value).replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts.shift()}.${parts.join("")}`;
}

function parsePrice(value) {
  const cleaned = normalizePriceInput(value);
  const amount = Number(cleaned);
  if (!cleaned || Number.isNaN(amount)) return null;
  return amount;
}

function formatCurrencyMYR(value) {
  const amount = parsePrice(value);
  if (amount === null) return "";
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2
  }).format(amount);
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function numberToBahasa(number) {
  const words = ["kosong", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "lapan", "sembilan", "sepuluh", "sebelas"];

  if (number < 12) return words[number];
  if (number < 20) return `${numberToBahasa(number - 10)} belas`;
  if (number < 100) {
    const puluh = Math.floor(number / 10);
    const baki = number % 10;
    return `${numberToBahasa(puluh)} puluh${baki ? ` ${numberToBahasa(baki)}` : ""}`;
  }
  if (number < 200) return `seratus${number % 100 ? ` ${numberToBahasa(number - 100)}` : ""}`;
  if (number < 1000) {
    const ratus = Math.floor(number / 100);
    const baki = number % 100;
    return `${numberToBahasa(ratus)} ratus${baki ? ` ${numberToBahasa(baki)}` : ""}`;
  }
  if (number < 2000) return `seribu${number % 1000 ? ` ${numberToBahasa(number - 1000)}` : ""}`;
  if (number < 1000000) {
    const ribu = Math.floor(number / 1000);
    const baki = number % 1000;
    return `${numberToBahasa(ribu)} ribu${baki ? ` ${numberToBahasa(baki)}` : ""}`;
  }
  if (number < 1000000000) {
    const juta = Math.floor(number / 1000000);
    const baki = number % 1000000;
    return `${numberToBahasa(juta)} juta${baki ? ` ${numberToBahasa(baki)}` : ""}`;
  }
  if (number < 1000000000000) {
    const bilion = Math.floor(number / 1000000000);
    const baki = number % 1000000000;
    return `${numberToBahasa(bilion)} bilion${baki ? ` ${numberToBahasa(baki)}` : ""}`;
  }

  return "";
}

function formatAmountInWords(value) {
  const amount = parsePrice(value);
  if (amount === null) return "";

  const rounded = Math.round(amount * 100);
  const ringgit = Math.floor(rounded / 100);
  const sen = rounded % 100;

  let result = `${capitalize(numberToBahasa(ringgit))} ringgit`;
  if (sen > 0) {
    result += ` dan ${numberToBahasa(sen)} sen`;
  }
  return `${result} sahaja`;
}

function getInitials(name) {
  const trimmed = normalizeSpaces(name || "");
  if (!trimmed) return "XX";
  return trimmed
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function generateReferenceNumber() {
  const sourceDate = fields.tarikh.value || today.toISOString().split("T")[0];
  const compactDate = sourceDate.replaceAll("-", "");
  const seller = getInitials(fields.namaPenjual.value);
  const buyer = getInitials(fields.namaPembeli.value);
  return `SPP-${compactDate}-${seller}${buyer}`;
}

function hasSignature(key) {
  return Boolean(pads[key] && pads[key].dataUrl);
}

function triggerTransientClass(element, className = "is-updating", duration = 420) {
  if (!element || prefersReducedMotion.matches) return;

  const existingTimer = animationTimers.get(element);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);

  const timer = window.setTimeout(() => {
    element.classList.remove(className);
    animationTimers.delete(element);
  }, duration);

  animationTimers.set(element, timer);
}

function setAnimatedText(element, value, className = "is-updating", duration = 420) {
  if (!element) return false;

  const nextValue = String(value);
  if (element.textContent === nextValue) return false;

  element.textContent = nextValue;
  triggerTransientClass(element, className, duration);
  return true;
}

function setFeedback(message, announce = false) {
  setAnimatedText(statusEls.actionFeedback, message);
  if (announce) {
    statusEls.liveRegion.textContent = "";
    window.setTimeout(() => {
      statusEls.liveRegion.textContent = message;
    }, 20);
  }
}

function setSignaturePreview(outputWrap, dataUrl) {
  outputWrap.innerHTML = "";

  if (!dataUrl) {
    outputWrap.innerHTML = '<span class="empty-sign">Belum ditandatangani</span>';
    triggerTransientClass(outputWrap, "is-refreshing", 380);
    return;
  }

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Tandatangan";
  outputWrap.appendChild(img);
  triggerTransientClass(outputWrap, "is-refreshing", 380);
}

function drawSignatureToCanvas(key, dataUrl) {
  const pad = pads[key];
  if (!pad || !dataUrl) return;

  const width = pad.canvas.width / pad.ratio;
  const height = pad.canvas.height / pad.ratio;
  const image = new Image();
  image.onload = () => {
    pad.ctx.clearRect(0, 0, width, height);
    pad.ctx.drawImage(image, 0, 0, width, height);
    pad.dataUrl = dataUrl;
    setSignaturePreview(pad.outputWrap, dataUrl);
  };
  image.src = dataUrl;
}

function saveSignature(canvas, outputWrap, key) {
  const dataUrl = canvas.toDataURL("image/png");
  pads[key].dataUrl = dataUrl;
  setSignaturePreview(outputWrap, dataUrl);
  updateAll();
}

function setupSignaturePad(canvasId, outputWrap, key) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let ratio = 1;
  let points = [];

  function applyCanvasStyles() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#172327";
    ctx.fillStyle = "#172327";
  }

  function getSurfaceSize() {
    return {
      width: canvas.width / ratio,
      height: canvas.height / ratio
    };
  }

  function clearSurface() {
    const surface = getSurfaceSize();
    ctx.clearRect(0, 0, surface.width, surface.height);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const oldImage = pads[key] && pads[key].dataUrl ? pads[key].dataUrl : "";
    ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.max(Math.floor(rect.width * ratio), 1);
    canvas.height = Math.max(Math.floor(180 * ratio), 1);
    canvas.style.height = "180px";

    applyCanvasStyles();
    clearSurface();

    if (pads[key]) {
      pads[key].ratio = ratio;
    }

    if (oldImage) {
      drawSignatureToCanvas(key, oldImage);
    }
  }

  function getPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function drawDot(point) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function getMidpoint(firstPoint, secondPoint) {
    return {
      x: (firstPoint.x + secondPoint.x) / 2,
      y: (firstPoint.y + secondPoint.y) / 2
    };
  }

  function drawSmoothPoint(point) {
    points.push(point);

    if (points.length === 1) {
      drawDot(point);
      return;
    }

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      return;
    }

    const previousMidpoint = getMidpoint(points[0], points[1]);
    const currentMidpoint = getMidpoint(points[1], points[2]);

    ctx.beginPath();
    ctx.moveTo(previousMidpoint.x, previousMidpoint.y);
    ctx.quadraticCurveTo(points[1].x, points[1].y, currentMidpoint.x, currentMidpoint.y);
    ctx.stroke();

    points.shift();
  }

  function start(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const point = getPos(event);
    drawing = true;
    points = [];
    canvas.classList.add("is-drawing");

    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        // Continue drawing even if pointer capture is unavailable.
      }
    }

    drawSmoothPoint(point);
  }

  function draw(event) {
    if (!drawing) return;
    event.preventDefault();
    drawSmoothPoint(getPos(event));
  }

  function end(event) {
    if (!drawing) return;
    if (event) {
      event.preventDefault();
    }

    drawing = false;
    points = [];
    canvas.classList.remove("is-drawing");

    if (
      event &&
      canvas.releasePointerCapture &&
      canvas.hasPointerCapture &&
      canvas.hasPointerCapture(event.pointerId)
    ) {
      canvas.releasePointerCapture(event.pointerId);
    }

    saveSignature(canvas, outputWrap, key);
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", draw);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  pads[key] = { canvas, ctx, resizeCanvas, outputWrap, dataUrl: "", ratio };
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

function clearPad(key, options = {}) {
  const pad = pads[key];
  if (!pad) return;
  const shouldSave = options.save !== false;

  const width = pad.canvas.width / pad.ratio;
  const height = pad.canvas.height / pad.ratio;
  pad.ctx.clearRect(0, 0, width, height);
  pad.dataUrl = "";
  setSignaturePreview(pad.outputWrap, "");
  updateAll({ save: shouldSave });
}

function serializeDraft() {
  const values = {};

  Object.entries(fields).forEach(([key, input]) => {
    values[key] = input.value;
  });

  return {
    values,
    signatures: {
      penjual: pads.penjual ? pads.penjual.dataUrl : "",
      pembeli: pads.pembeli ? pads.pembeli.dataUrl : ""
    },
    savedAt: new Date().toISOString()
  };
}

function saveDraft() {
  try {
    const payload = serializeDraft();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setAnimatedText(statusEls.lastSavedText, `Draft disimpan: ${formatDateTimeMY(payload.savedAt)}`);
  } catch (error) {
    setAnimatedText(statusEls.lastSavedText, "Gagal menyimpan draft ke browser");
  }
}

function scheduleSaveDraft() {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveDraft, 250);
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setAnimatedText(statusEls.lastSavedText, "Belum ada draft disimpan");
      return;
    }

    const payload = JSON.parse(raw);

    Object.entries(fields).forEach(([key, input]) => {
      if (payload.values && typeof payload.values[key] === "string") {
        input.value = payload.values[key];
      }
    });

    if (payload.signatures && payload.signatures.penjual) {
      drawSignatureToCanvas("penjual", payload.signatures.penjual);
    }

    if (payload.signatures && payload.signatures.pembeli) {
      drawSignatureToCanvas("pembeli", payload.signatures.pembeli);
    }

    setAnimatedText(statusEls.lastSavedText, `Draft dipulihkan: ${formatDateTimeMY(payload.savedAt)}`);
    setFeedback("Draft terdahulu telah dipulihkan dari browser ini.", true);
  } catch (error) {
    setAnimatedText(statusEls.lastSavedText, "Draft lama tidak dapat dibaca");
  }
}

function clearStoredDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    return;
  }
}

function getCompletionStats() {
  const missing = [];

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      missing.push(field.dataset.label || field.id);
    }
  });

  if (!hasSignature("penjual")) {
    missing.push("Tandatangan penjual");
  }

  if (!hasSignature("pembeli")) {
    missing.push("Tandatangan pembeli");
  }

  return {
    completed: totalRequiredItems - missing.length,
    total: totalRequiredItems,
    missing,
    ready: missing.length === 0
  };
}

function renderMissingList(missing, ready) {
  const previousMarkup = statusEls.missingList.innerHTML;
  statusEls.missingList.innerHTML = "";

  if (ready) {
    const item = document.createElement("li");
    item.className = "ready";
    item.textContent = "Semua maklumat penting telah lengkap. Dokumen sedia untuk dicetak atau disalin.";
    statusEls.missingList.appendChild(item);
    if (statusEls.missingList.innerHTML !== previousMarkup) {
      triggerTransientClass(statusEls.missingList, "list-refresh", 380);
    }
    return;
  }

  missing.slice(0, 6).forEach((label) => {
    const item = document.createElement("li");
    item.textContent = label;
    statusEls.missingList.appendChild(item);
  });

  if (missing.length > 6) {
    const item = document.createElement("li");
    item.textContent = `${missing.length - 6} lagi maklumat belum lengkap`;
    statusEls.missingList.appendChild(item);
  }

  if (statusEls.missingList.innerHTML !== previousMarkup) {
    triggerTransientClass(statusEls.missingList, "list-refresh", 380);
  }
}

function updateStatusPanel() {
  const stats = getCompletionStats();
  const percentage = Math.round((stats.completed / stats.total) * 100);
  const referenceNumber = generateReferenceNumber();

  setAnimatedText(statusEls.completionText, `${stats.completed} / ${stats.total} lengkap`);
  setAnimatedText(statusEls.progressPercent, `${percentage}% siap`);
  statusEls.progressFill.style.width = `${percentage}%`;
  const nextBadgeText = stats.ready ? "Siap Cetak" : "Draf";
  const nextBadgeState = stats.ready ? "ready" : "draft";
  if (
    statusEls.docStatusBadge.textContent !== nextBadgeText ||
    statusEls.docStatusBadge.dataset.state !== nextBadgeState
  ) {
    statusEls.docStatusBadge.textContent = nextBadgeText;
    statusEls.docStatusBadge.dataset.state = nextBadgeState;
    triggerTransientClass(statusEls.docStatusBadge);
  }
  setAnimatedText(
    statusEls.draftState,
    stats.ready ? "Dokumen lengkap untuk cetakan atau PDF" : "Lengkapkan baki maklumat untuk jadikan surat lengkap"
  );
  setAnimatedText(statusEls.referenceText, `No. rujukan: ${referenceNumber}`);

  setAnimatedText(
    outputs.outStatusPersetujuan,
    stats.ready ? "Dipersetujui oleh kedua-dua pihak" : "Menunggu maklumat lengkap"
  );
  renderMissingList(stats.missing, stats.ready);
}

function updatePreview() {
  const referenceNumber = generateReferenceNumber();
  const formattedPrice = formatCurrencyMYR(fields.hargaJualan.value);
  const priceWordsText = formatAmountInWords(fields.hargaJualan.value);

  setAnimatedText(outputs.outRujukan, referenceNumber);
  setAnimatedText(outputs.outTarikh, formatDateMY(fields.tarikh.value));
  setAnimatedText(outputs.outLokasi, fields.lokasi.value.trim() || "-");
  setAnimatedText(outputs.outNamaPenjual, emptyValue(fields.namaPenjual.value));
  setAnimatedText(outputs.outIcPenjual, emptyValue(fields.icPenjual.value));
  setAnimatedText(outputs.outAlamatPenjual, emptyValue(fields.alamatPenjual.value));
  setAnimatedText(outputs.outNamaPembeli, emptyValue(fields.namaPembeli.value));
  setAnimatedText(outputs.outIcPembeli, emptyValue(fields.icPembeli.value));
  setAnimatedText(outputs.outAlamatPembeli, emptyValue(fields.alamatPembeli.value));
  setAnimatedText(outputs.outNamaItem, emptyValue(fields.namaItem.value));
  setAnimatedText(outputs.outButiranItem, emptyValue(fields.butiranItem.value));
  setAnimatedText(outputs.outKaedahBayaran, emptyValue(fields.kaedahBayaran.value));
  setAnimatedText(outputs.outHargaJualan, formattedPrice || "________________");
  setAnimatedText(outputs.outHargaPerkataan, priceWordsText || "________________");
  setAnimatedText(outputs.sigNamaPenjual, fields.namaPenjual.value.trim() || "Nama Penjual");
  setAnimatedText(outputs.sigNamaPembeli, fields.namaPembeli.value.trim() || "Nama Pembeli");

  setAnimatedText(hargaFormatted, `Paparan: ${formattedPrice || "-"}`);
  setAnimatedText(hargaWords, `Dalam perkataan: ${priceWordsText || "-"}`);
}

function updateAll(options = {}) {
  const shouldSave = options.save !== false;
  updatePreview();
  updateStatusPanel();
  if (shouldSave) {
    scheduleSaveDraft();
  }
}

function getPlainTextValue(value, fallback = "-") {
  return value && value.trim() ? value.trim() : fallback;
}

function buildLetterText() {
  const formattedPrice = formatCurrencyMYR(fields.hargaJualan.value) || "-";
  const amountWords = formatAmountInWords(fields.hargaJualan.value) || "-";

  return [
    "SURAT PENGESAHAN PEMBELIAN",
    `No. Rujukan: ${generateReferenceNumber()}`,
    `Tarikh: ${formatDateMY(fields.tarikh.value)}`,
    `Lokasi: ${getPlainTextValue(fields.lokasi.value)}`,
    "",
    `Penjual: ${getPlainTextValue(fields.namaPenjual.value)}`,
    `No. IC / No. Syarikat Penjual: ${getPlainTextValue(fields.icPenjual.value)}`,
    `Alamat Penjual: ${getPlainTextValue(fields.alamatPenjual.value)}`,
    "",
    `Pembeli: ${getPlainTextValue(fields.namaPembeli.value)}`,
    `No. IC / No. Syarikat Pembeli: ${getPlainTextValue(fields.icPembeli.value)}`,
    `Alamat Pembeli: ${getPlainTextValue(fields.alamatPembeli.value)}`,
    "",
    `Nama Item: ${getPlainTextValue(fields.namaItem.value)}`,
    `Butiran Item: ${getPlainTextValue(fields.butiranItem.value)}`,
    `Harga Jualan: ${formattedPrice}`,
    `Jumlah Dalam Perkataan: ${amountWords}`,
    `Kaedah Bayaran: ${getPlainTextValue(fields.kaedahBayaran.value)}`,
    "",
    "Dengan surat ini, kedua-dua pihak mengakui bahawa urusan jual beli ini dibuat secara sukarela, tanpa paksaan, dan bersetuju dengan harga, kaedah bayaran, serta butiran item seperti yang dinyatakan di atas.",
    "",
    `Tandatangan Penjual: ${hasSignature("penjual") ? "Sudah ditandatangani" : "Belum ditandatangani"}`,
    `Tandatangan Pembeli: ${hasSignature("pembeli") ? "Sudah ditandatangani" : "Belum ditandatangani"}`
  ].join("\n");
}

async function copyLetterText() {
  closeMenuIfOpen();
  const text = buildLetterText();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "true");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }

    setFeedback("Teks surat berjaya disalin ke clipboard.", true);
  } catch (error) {
    setFeedback("Salinan automatik gagal. Cuba salin secara manual dari preview.", true);
  }
}

function fillSampleData() {
  closeMenuIfOpen();
  const sample = {
    tarikh: today.toISOString().split("T")[0],
    lokasi: "Kuching, Sarawak",
    namaPenjual: "Ahmad Firdaus bin Rahman",
    icPenjual: "900101-13-1234",
    alamatPenjual: "Lot 12, Jalan Matang Jaya\n93050 Kuching\nSarawak",
    namaPembeli: "Nur Aisyah binti Salleh",
    icPembeli: "910202-13-5678",
    alamatPembeli: "No. 8, Taman Desa Wira\n93250 Kuching\nSarawak",
    namaItem: "Motosikal Yamaha Y15ZR",
    butiranItem: "Warna biru\nNombor pendaftaran QAB1234\nKeadaan baik dan lengkap dengan geran",
    hargaJualan: "8500",
    kaedahBayaran: "Transfer bank penuh"
  };

  Object.entries(sample).forEach(([key, value]) => {
    fields[key].value = value;
  });

  updateAll();
  setFeedback("Contoh maklumat telah dimasukkan. Tandatangan masih perlu dilukis.", true);
}

function resetFormAll() {
  closeMenuIfOpen();
  const confirmed = window.confirm("Padam semua maklumat borang dan draft yang disimpan dalam browser ini?");
  if (!confirmed) return;

  Object.entries(fields).forEach(([key, field]) => {
    if (key === "tarikh") {
      field.value = today.toISOString().split("T")[0];
      return;
    }

    field.value = key === "kaedahBayaran" ? DEFAULT_PAYMENT_METHOD : "";
  });

  clearPad("penjual", { save: false });
  clearPad("pembeli", { save: false });
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  clearStoredDraft();
  setAnimatedText(statusEls.lastSavedText, "Draft browser telah dipadam");
  updateAll({ save: false });
  setFeedback("Semua maklumat telah direset dan draft browser dipadam.", true);
}

function handlePrint() {
  closeMenuIfOpen();
  const stats = getCompletionStats();
  if (!stats.ready) {
    setFeedback("Dokumen masih belum lengkap. Cetakan akan mengandungi ruang yang belum diisi.", true);
  } else {
    setFeedback("Dokumen lengkap dan sedia dicetak.", true);
  }

  window.print();
}

function handleFieldInput(event) {
  if (event.target.id === "hargaJualan") {
    event.target.value = normalizePriceInput(event.target.value);
  }

  updateAll();
}

function attachFieldListeners() {
  Object.values(fields).forEach((input) => {
    input.addEventListener("input", handleFieldInput);
    input.addEventListener("change", handleFieldInput);
  });
}

function attachActionListeners() {
  actions.printBtns.forEach((button) => button.addEventListener("click", handlePrint));
  actions.copyBtns.forEach((button) => button.addEventListener("click", copyLetterText));
  actions.sampleBtns.forEach((button) => button.addEventListener("click", fillSampleData));
  actions.resetBtns.forEach((button) => button.addEventListener("click", resetFormAll));

  if (actions.clearPenjualBtn) {
    actions.clearPenjualBtn.addEventListener("click", () => clearPad("penjual"));
  }

  if (actions.clearPembeliBtn) {
    actions.clearPembeliBtn.addEventListener("click", () => clearPad("pembeli"));
  }

  actions.menuToggles.forEach((button) => {
    button.addEventListener("click", toggleMenu);
  });

  if (actions.menuCloseBtn) {
    actions.menuCloseBtn.addEventListener("click", () => closeMenu());
  }

  if (actions.menuBackdrop) {
    actions.menuBackdrop.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  }

  actions.menuLinks.forEach((link) => {
    link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  });

  if (actions.sideMenu) {
    actions.sideMenu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      closeMenu();
    }
  });
}

function initDefaults() {
  fields.tarikh.value = today.toISOString().split("T")[0];
  fields.kaedahBayaran.value = DEFAULT_PAYMENT_METHOD;
}

setupSignaturePad("canvasPenjual", sigOutPenjualWrap, "penjual");
setupSignaturePad("canvasPembeli", sigOutPembeliWrap, "pembeli");
attachFieldListeners();
attachActionListeners();
initDefaults();
restoreDraft();
updateAll({ save: false });
