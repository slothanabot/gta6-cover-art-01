/* NEON GRID — Vice City cover maker.
   Everything is drawn on one canvas: photo cells, palm dividers, neon grade,
   banner title. No network, no uploads — photos are read locally only. */
"use strict";

const $ = (id) => document.getElementById(id);
const preview = $("preview");

/* Five colour grades: each is a sky wash + a neon accent + a banner tint. */
const GRADES = {
  sunset: { sky: ["#ff7a18", "#ff2e88", "#7b2fff"], accent: "#ffd166", banner: "#1a0533", glow: "rgba(255,122,24,.55)" },
  neon:   { sky: ["#00e5ff", "#7b2fff", "#ff2e88"], accent: "#00e5ff", banner: "#05001a", glow: "rgba(0,229,255,.6)" },
  vice:   { sky: ["#ff9de2", "#ff2e88", "#5b2ee5"], accent: "#ff9de2", banner: "#2b0533", glow: "rgba(255,46,136,.55)" },
  teal:   { sky: ["#7df9d6", "#00b3a6", "#123a8f"], accent: "#7df9d6", banner: "#03182e", glow: "rgba(125,249,214,.5)" },
  gold:   { sky: ["#ffe259", "#ffa751", "#c94b4b"], accent: "#ffe259", banner: "#2e1400", glow: "rgba(255,226,89,.55)" },
};
const LAYOUTS = ["grid", "trio", "hero"];
const SIZES = { "1080x1080": [1080, 1080], "1080x1350": [1080, 1350], "1920x1080": [1920, 1080] };
const DEMO_PHOTOS = ["samples/boulevard.jpg", "samples/pier.jpg", "samples/dusk.jpg", "samples/neon.jpg"];

const state = {
  layout: "grid",
  grade: "sunset",
  size: "1080x1080",
  title: "VICE NIGHTS",
  tag: "One city. Every hustle.",
  name: "STARRING YOU",
  palms: true,
  grain: true,
  /* One slot per grid cell: image, zoom, pan. Slots 3-4 are hidden in trio/hero layouts. */
  cells: [
    { img: null, zoom: 1.15, panX: 0, panY: 0 },
    { img: null, zoom: 1.15, panX: 0, panY: 0 },
    { img: null, zoom: 1.15, panX: 0, panY: 0 },
    { img: null, zoom: 1.15, panX: 0, panY: 0 },
  ],
};

/* ---- geometry: where each photo cell and the banner sit on the cover ---- */
function coverRects(w, h, layout) {
  const bannerH = Math.round(h * 0.30);
  const top = h - bannerH;
  const gap = Math.max(6, Math.round(w * 0.008));
  if (layout === "trio") {
    const cw = (w - gap * 2) / 3;
    return {
      banner: { x: 0, y: top, w, h: bannerH },
      cells: [0, 1, 2].map((i) => ({ x: i * (cw + gap), y: 0, w: cw, h: top })),
    };
  }
  if (layout === "hero") {
    const rail = Math.round(w * 0.30);
    return {
      banner: { x: 0, y: top, w, h: bannerH },
      cells: [
        { x: 0, y: 0, w: w - rail - gap, h: top },
        { x: w - rail, y: 0, w: rail, h: top / 2 - gap / 2 },
        { x: w - rail, y: top / 2 + gap / 2, w: rail, h: top / 2 - gap / 2 },
      ],
    };
  }
  const cw = (w - gap) / 2, ch = (top - gap) / 2;
  return {
    banner: { x: 0, y: top, w, h: bannerH },
    cells: [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + gap, y: 0, w: cw, h: ch },
      { x: 0, y: ch + gap, w: cw, h: ch },
      { x: cw + gap, y: ch + gap, w: cw, h: ch },
    ],
  };
}

/* ---- a palm silhouette, drawn procedurally: curved trunk + drooping fronds ---- */
function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(lean);
  ctx.strokeStyle = "#0b0616";
  ctx.fillStyle = "#0b0616";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -55, -4, -105);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    const len = 52 - Math.abs(i - 3) * 6;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-4, -105);
    ctx.quadraticCurveTo(
      -4 + Math.cos(a) * len * 0.6, -105 + Math.sin(a) * len * 0.55 - 14,
      -4 + Math.cos(a) * len, -105 + Math.sin(a) * len + 16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalmStrip(ctx, w, y, h) {
  ctx.save();
  ctx.fillStyle = "rgba(11,6,22,.92)";
  ctx.fillRect(0, y, w, h);
  const scale = h / 130;
  let x = w * 0.06;
  while (x < w) {
    drawPalm(ctx, x, y + h, scale * (0.8 + ((x * 7) % 10) / 22), ((x * 13) % 20 - 10) * 0.012);
    x += w * 0.16;
  }
  ctx.restore();
}

/* ---- one photo cell: cover-fit with the cell's zoom and pan ---- */
function drawPhotoCell(ctx, cell, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (cell.img) {
    const iw = cell.img.naturalWidth, ih = cell.img.naturalHeight;
    const base = Math.max(rect.w / iw, rect.h / ih) * cell.zoom;
    const dw = iw * base, dh = ih * base;
    const dx = rect.x + (rect.w - dw) / 2 + cell.panX * rect.w * 0.25;
    const dy = rect.y + (rect.h - dh) / 2 + cell.panY * rect.h * 0.25;
    ctx.drawImage(cell.img, dx, dy, dw, dh);
  } else {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, "#2b1650");
    g.addColorStop(1, "#120826");
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = "rgba(244,236,255,.55)";
    ctx.font = `600 ${Math.round(rect.h * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("TAP A CELL TO ADD YOUR PHOTO", rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();
}

/* ---- the grade wash: sky gradient over the photos + a neon rim ---- */
function gradeWash(ctx, w, h, grade, photoBottom) {
  const g = ctx.createLinearGradient(0, 0, w, photoBottom);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(0.55, grade.sky[1]);
  g.addColorStop(1, grade.sky[2]);
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, photoBottom);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = grade.sky[1];
  ctx.fillRect(0, 0, w, photoBottom);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = grade.accent;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = w * 0.02;
  ctx.strokeRect(0, 0, w, photoBottom);
  ctx.restore();
}

/* ---- the banner: gradient block, giant Bebas title, tagline, name plate ---- */
function drawBanner(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, grade.banner);
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(x, y, w, Math.max(4, h * 0.025));

  const title = (state.title || "VICE NIGHTS").toUpperCase();
  let size = h * 0.52;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fitTitle = () => {
    ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    return ctx.measureText(title).width <= w * 0.92;
  };
  while (!fitTitle() && size > 24) size -= 4;
  const cy = y + h * 0.46;
  ctx.save();
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = h * 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, x + w / 2, cy);
  ctx.restore();
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(2, h * 0.012);
  ctx.strokeText(title, x + w / 2, cy);

  ctx.fillStyle = grade.accent;
  ctx.font = `600 ${Math.round(h * 0.11)}px system-ui, sans-serif`;
  ctx.fillText((state.tag || "").toUpperCase(), x + w / 2, y + h * 0.82);

  const plate = (state.name || "").toUpperCase();
  if (plate) {
    ctx.font = `700 ${Math.round(h * 0.085)}px system-ui, sans-serif`;
    const pw = ctx.measureText(plate).width + h * 0.22;
    const px = x + w / 2 - pw / 2, py = y + h * 0.06;
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, h * 0.13, h * 0.065);
    ctx.fill();
    ctx.fillStyle = "#0b0616";
    ctx.fillText(plate, x + w / 2, py + h * 0.066);
  }
}

/* ---- grain + vignette for the printed-poster feel ---- */
function finishCover(ctx, w, h) {
  if (!state.grain) return;
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 2600; i++) {
    const px = Math.random() * w, py = Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(px, py, 1.6, 1.6);
  }
  ctx.restore();
}

/* ---- the whole cover, at any size ---- */
function renderCover(canvas, w, h) {
  const ctx = canvas.getContext("2d");
  canvas.width = w;
  canvas.height = h;
  const grade = GRADES[state.grade];
  const { banner, cells } = coverRects(w, h, state.layout);
  ctx.fillStyle = "#0b0616";
  ctx.fillRect(0, 0, w, h);
  const visible = state.layout === "grid" ? 4 : 3;
  for (let i = 0; i < visible; i++) drawPhotoCell(ctx, state.cells[i], cells[i]);
  gradeWash(ctx, w, h, grade, banner.y);
  if (state.palms) drawPalmStrip(ctx, w, banner.y - Math.round(h * 0.085), Math.round(h * 0.085));
  drawBanner(ctx, banner, grade);
  finishCover(ctx, w, h);
}

function renderPreview() {
  const [w, h] = SIZES[state.size];
  renderCover(preview, w, h);
  $("sizeLabel").textContent = `${w} × ${h}`;
}

function setStatus(msg) { $("status").textContent = msg; }

/* ---- export: full-resolution PNG download ---- */
function exportPNG() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement("canvas");
  renderCover(off, w, h);
  off.toBlob((blob) => {
    if (!blob) { setStatus("Export failed — try again."); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `neon-grid-${state.grade}-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Exported ${w} × ${h} PNG — check your downloads.`);
  }, "image/png");
}
window.__neonGrid = { state, renderCover, exportPNG, ready: true };

/* ---- photo slots UI: thumbnail, zoom slider, pan buttons ---- */
function buildSlots() {
  const host = $("slots");
  host.innerHTML = "";
  state.cells.forEach((cell, i) => {
    const box = document.createElement("div");
    box.className = "slot";
    const thumb = cell.img
      ? `<img class="slot-thumb" src="${cell.img.src}" alt="Cell ${i + 1} photo">`
      : `<div class="slot-thumb" style="display:grid;place-items:center;background:#1a1030;color:#8d7bb3">+ photo</div>`;
    box.innerHTML = `
      <div class="slot-name">CELL ${i + 1}</div>${thumb}
      <div class="slot-note">${cell.img ? "Loaded — drag zoom below" : "Tap to load a photo"}</div>
      <input type="range" min="1" max="2.2" step="0.05" value="${cell.zoom}" aria-label="Zoom cell ${i + 1}">
      <div class="slot-tools">
        <button type="button" data-pan="-1,0">◀</button>
        <button type="button" data-pan="1,0">▶</button>
        <button type="button" data-pan="0,-1">▲</button>
        <button type="button" data-pan="0,1">▼</button>
        <button type="button" data-clear="1">Clear</button>
      </div>`;
    box.addEventListener("click", (e) => {
      const pan = e.target.closest("[data-pan]");
      if (pan) {
        const [dx, dy] = pan.dataset.pan.split(",").map(Number);
        cell.panX = Math.max(-1, Math.min(1, cell.panX + dx * 0.2));
        cell.panY = Math.max(-1, Math.min(1, cell.panY + dy * 0.2));
        renderPreview();
        return;
      }
      if (e.target.closest("[data-clear]")) { cell.img = null; cell.zoom = 1.15; cell.panX = 0; cell.panY = 0; buildSlots(); renderPreview(); return; }
      if (e.target.tagName === "INPUT") return;
      pickPhoto(i);
    });
    box.querySelector("input[type=range]").addEventListener("input", (e) => {
      cell.zoom = Number(e.target.value);
      renderPreview();
    });
    host.appendChild(box);
  });
}

let pickingCell = 0;
function pickPhoto(i) {
  pickingCell = i;
  $("filePick").click();
}
$("filePick").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    state.cells[pickingCell].img = img;
    buildSlots();
    renderPreview();
    setStatus(`Photo loaded into cell ${pickingCell + 1}.`);
  };
  img.src = URL.createObjectURL(file);
  e.target.value = "";
});

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function loadDemo() {
  setStatus("Loading demo photos…");
  for (let i = 0; i < 4; i++) {
    try { state.cells[i].img = await loadImage(DEMO_PHOTOS[i]); } catch { /* keep the slot empty */ }
  }
  buildSlots();
  renderPreview();
  setStatus("Demo photos loaded — edit the caption, pick a grade, export.");
}
$("loadDemo").addEventListener("click", loadDemo);
$("exportBtn").addEventListener("click", exportPNG);

/* ---- text + option wiring ---- */
$("titleInput").addEventListener("input", (e) => { state.title = e.target.value; renderPreview(); });
$("tagInput").addEventListener("input", (e) => { state.tag = e.target.value; renderPreview(); });
$("nameInput").addEventListener("input", (e) => { state.name = e.target.value; renderPreview(); });
$("palmToggle").addEventListener("change", (e) => { state.palms = e.target.checked; renderPreview(); });
$("grainToggle").addEventListener("change", (e) => { state.grain = e.target.checked; renderPreview(); });

function wireChoices(id, key, apply) {
  $(id).addEventListener("click", (e) => {
    const btn = e.target.closest("[data-layout],[data-grade],[data-size]");
    if (!btn) return;
    [...$(id).querySelectorAll(".choice")].forEach((c) => c.classList.remove("on"));
    btn.classList.add("on");
    apply(btn);
    renderPreview();
  });
}
wireChoices("layoutChoices", 0, (b) => { state.layout = b.dataset.layout; });
wireChoices("gradeChoices", 0, (b) => { state.grade = b.dataset.grade; });
wireChoices("sizeChoices", 0, (b) => { state.size = b.dataset.size; });

/* ---- URL params: ?demo=1, ?shot=cover, ?size=, ?grade=, ?layout=, ?title=, ?tag= ---- */
const params = new URLSearchParams(location.search);
if (params.get("title")) { state.title = params.get("title"); $("titleInput").value = state.title; }
if (params.get("tag")) { state.tag = params.get("tag"); $("tagInput").value = state.tag; }
if (params.get("grade") && GRADES[params.get("grade")]) {
  state.grade = params.get("grade");
  document.querySelectorAll("#gradeChoices .choice").forEach((c) => c.classList.toggle("on", c.dataset.grade === state.grade));
}
if (params.get("layout") && LAYOUTS.includes(params.get("layout"))) {
  state.layout = params.get("layout");
  document.querySelectorAll("#layoutChoices .choice").forEach((c) => c.classList.toggle("on", c.dataset.layout === state.layout));
}
if (params.get("size") && SIZES[params.get("size")]) {
  state.size = params.get("size");
  document.querySelectorAll("#sizeChoices .choice").forEach((c) => c.classList.toggle("on", c.dataset.size === state.size));
}
if (params.get("shot") === "cover") {
  document.body.classList.add("cover-only");
  const style = document.createElement("style");
  style.textContent = ".topbar,.panel,.foot,.stage-head,.stage .hint{display:none!important}.shell{display:block;padding:0;max-width:none}.canvas-wrap{border:0;border-radius:0;padding:0;background:#000}#preview{max-height:100vh;border-radius:0}";
  document.head.appendChild(style);
}

buildSlots();
renderPreview();
if (params.get("demo") === "1" || params.get("shot") === "cover") loadDemo();
