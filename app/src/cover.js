// Neon Grid's cover painter: a mosaic of photo panels over a sunset sky, a palm
// silhouette divider with a low neon sun, and a full-width banner caption.
// Every panel is drawn from the caller's state, so the editor, the export and the
// screenshot scenes all share one code path.

export const GRADES = {
  sunset: { skyTop: '#2b1055', skyBottom: '#ff7b3d', tint: 'rgba(255, 90, 40, 0.20)', accent: '#ffd166', glow: '#ff2e63' },
  neon:   { skyTop: '#12082e', skyBottom: '#ff2e88', tint: 'rgba(255, 46, 136, 0.22)', accent: '#00f0ff', glow: '#b967ff' },
  vice:   { skyTop: '#1a0533', skyBottom: '#ff7b00', tint: 'rgba(255, 123, 0, 0.20)', accent: '#ff2e88', glow: '#ffd166' },
  teal:   { skyTop: '#04222e', skyBottom: '#00b4a2', tint: 'rgba(0, 180, 162, 0.20)', accent: '#ffe66d', glow: '#00f0ff' },
  gold:   { skyTop: '#2b1608', skyBottom: '#ffb347', tint: 'rgba(255, 179, 71, 0.20)', accent: '#fff3b0', glow: '#ff7b00' },
};

export const LAYOUTS = {
  grid: { cells: 4, name: '2 x 2 Grid' },
  hero: { cells: 3, name: 'Hero + Duo' },
  trio: { cells: 3, name: 'Trio Strip' },
};

/** Cell rectangles for a layout inside the photo area (x, y, w, h), in fractions of it. */
function layoutCells(layout, area) {
  const g = 0.012 * Math.min(area.w, area.h); // gutter between panels
  if (layout === 'hero') {
    const left = area.w * 0.60;
    return [
      { x: area.x, y: area.y, w: left - g / 2, h: area.h },
      { x: area.x + left + g / 2, y: area.y, w: area.w - left - g / 2, h: area.h / 2 - g / 2 },
      { x: area.x + left + g / 2, y: area.y + area.h / 2 + g / 2, w: area.w - left - g / 2, h: area.h / 2 - g / 2 },
    ];
  }
  if (layout === 'trio') {
    const third = area.w / 3;
    return [0, 1, 2].map((i) => ({
      x: area.x + i * third + (i === 0 ? 0 : g / 2),
      y: area.y,
      w: third - (i === 1 ? g : g / 2),
      h: area.h,
    }));
  }
  const halfW = area.w / 2, halfH = area.h / 2;
  return [
    { x: area.x, y: area.y, w: halfW - g / 2, h: halfH - g / 2 },
    { x: area.x + halfW + g / 2, y: area.y, w: halfW - g / 2, h: halfH - g / 2 },
    { x: area.x, y: area.y + halfH + g / 2, w: halfW - g / 2, h: halfH - g / 2 },
    { x: area.x + halfW + g / 2, y: area.y + halfH + g / 2, w: halfW - g / 2, h: halfH - g / 2 },
  ];
}

/** One palm silhouette: a leaning trunk, a crown of fat drooping leaf blades, coconuts. */
function drawPalm(ctx, baseX, baseY, size, lean, colour) {
  const topX = baseX + lean * size;
  const topY = baseY - size;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * size * 0.35, baseY - size * 0.55, topX, topY);
  ctx.stroke();
  // Each frond is one long arc that rises from the crown, bows high, then falls
  // to a tip near or below crown height — the arch is what reads as a palm.
  // Five uneven arcs keep the crown from reading as a star or a flower.
  ctx.lineWidth = Math.max(3, size * 0.04);
  const fronds = 5;
  for (let i = 0; i < fronds; i++) {
    const t = i / (fronds - 1);
    const ang = -Math.PI * (0.85 - t * 0.70); // -153deg .. -27deg, an upward fan
    const reach = size * (0.80 + 0.20 * Math.sin(t * Math.PI));
    const tipX = topX + Math.cos(ang) * reach;
    const tipY = topY + Math.sin(ang) * reach + reach * 0.55;
    const ctrlX = topX + Math.cos(ang) * reach * 0.45;
    const ctrlY = topY + Math.sin(ang) * reach * 0.45 - size * 0.28;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }
  // Coconuts under the crown.
  for (const [cx, cy, r] of [[-0.05, 0.03, 0.045], [0.05, 0.04, 0.04], [0, 0.08, 0.035]]) {
    ctx.beginPath();
    ctx.arc(topX + cx * size, topY + cy * size, r * size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Fits one photo into a panel with cover cropping, zoom and pan. */
function drawPanelPhoto(ctx, rect, cell) {
  const img = cell.image;
  if (!img) return false;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = cell.zoom || 1;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (cell.panX || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (cell.panY || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

/** An empty panel: dark grade wash with a hint, so the grid still reads as a poster. */
function drawEmptyPanel(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.skyTop);
  wash.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `700 ${Math.max(14, rect.h * 0.045)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+ ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** The banner caption: huge condensed capitals, auto-fit, with a dark outline. */
function drawBannerCaption(ctx, w, banner, grade, caption, tagline) {
  const text = (caption || 'NEON NIGHTS').trim().toUpperCase() || 'NEON NIGHTS';
  const top = banner.y;
  const height = banner.h;
  let size = height * 0.52;
  const setFont = () => { ctx.font = `900 ${size}px "Neon Grid Display", "Arial Narrow", sans-serif`; };
  setFont();
  while (ctx.measureText(text).width > w * 0.94 && size > 16) {
    size -= 2;
    setFont();
  }
  const captionY = top + height * 0.52;
  const fill = ctx.createLinearGradient(0, captionY - size, 0, captionY + size * 0.2);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, grade.accent);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160426';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(text, w / 2, captionY);
  ctx.fillStyle = fill;
  ctx.fillText(text, w / 2, captionY);
  const line = (tagline || '').trim().toUpperCase();
  if (line) {
    const tagSize = Math.max(13, height * 0.115);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, tagSize * 0.28)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.fillStyle = grade.accent;
    ctx.fillText(line, w / 2, top + height * 0.86);
    try { ctx.letterSpacing = '0px'; } catch { /* reset */ }
  }
  ctx.textBaseline = 'alphabetic';
}

/**
 * Paints the whole cover onto `canvas` from `state`:
 * { cells: [{image, zoom, panX, panY}], layout, grade, caption, tagline }.
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const count = (LAYOUTS[state.layout] || LAYOUTS.grid).cells;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const split = Math.round(h * 0.76);
  const area = { x: 0, y: 0, w, h: split };
  const rects = layoutCells(state.layout, area);

  for (let i = 0; i < count; i++) {
    const rect = rects[i];
    const cell = state.cells[i] || {};
    const filled = drawPanelPhoto(ctx, rect, cell);
    if (!filled) drawEmptyPanel(ctx, rect, grade);
    ctx.fillStyle = grade.tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const shade = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    shade.addColorStop(0.55, 'rgba(10, 2, 24, 0)');
    shade.addColorStop(1, 'rgba(10, 2, 24, 0.35)');
    ctx.fillStyle = shade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(2, w * 0.0022);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = Math.max(1, w * 0.0012);
    ctx.strokeStyle = grade.accent;
    ctx.globalAlpha = 0.85;
    ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
    ctx.globalAlpha = 1;
  }

  // A warm wash settles over the whole mosaic, then the low sun glows where the
  // panels meet the banner, so the palms silhouette against it.
  const wash = ctx.createLinearGradient(0, 0, 0, split);
  wash.addColorStop(0, 'rgba(255, 255, 255, 0)');
  wash.addColorStop(1, grade.glow);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, split);
  ctx.globalAlpha = 1;
  const sunR = w * 0.13;
  const sun = ctx.createRadialGradient(w * 0.5, split + sunR * 0.25, sunR * 0.08, w * 0.5, split + sunR * 0.25, sunR);
  sun.addColorStop(0, '#fff3b0');
  sun.addColorStop(0.55, grade.glow);
  sun.addColorStop(1, 'rgba(255, 46, 99, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(w * 0.5, split + sunR * 0.25, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Banner: dark band, then palms rising out of its top edge.
  const band = ctx.createLinearGradient(0, split, 0, h);
  band.addColorStop(0, 'rgba(16, 4, 32, 0.88)');
  band.addColorStop(0.25, '#160426');
  band.addColorStop(1, '#0d0218');
  ctx.fillStyle = band;
  ctx.fillRect(0, split, w, h - split);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, split, w, Math.max(2, h * 0.004));

  const palmColour = 'rgba(13, 2, 24, 0.96)';
  const palmBase = split + (h - split) * 0.10;
  drawPalm(ctx, w * 0.06, palmBase, h * 0.115, 0.10, palmColour);
  drawPalm(ctx, w * 0.17, palmBase, h * 0.072, -0.08, palmColour);
  drawPalm(ctx, w * 0.83, palmBase, h * 0.075, 0.09, palmColour);
  drawPalm(ctx, w * 0.94, palmBase, h * 0.125, -0.12, palmColour);

  drawBannerCaption(ctx, w, { y: split, h: h - split }, grade, state.caption, state.tagline);
}

/** Renders the cover at an export size and returns the fresh canvas. */
export function renderCover(width, height, state) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCoverArt(canvas, state);
  return canvas;
}
