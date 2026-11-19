// Neon Grid's editor wiring: photo slots, layout and grade picks, per-panel crop,
// export sizes, and the ?shot= scenes for screenshots (./shots.js).
import { drawCoverArt, renderCover, GRADES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const statusLine = document.getElementById('status');
const sizeLabel = document.getElementById('sizelabel');
const slotsBox = document.getElementById('slots');

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'Neon Nights',
  tagline: 'Leonida • Vice City',
  cells: [0, 1, 2, 3].map(() => ({ image: null, zoom: 1, panX: 0, panY: 0 })),
};
let selected = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function stateForPaint() {
  return {
    cells: state.cells,
    layout: state.layout,
    grade: state.grade,
    caption: captionInput.value,
    tagline: taglineInput.value,
  };
}

function repaint() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCoverArt(canvas, stateForPaint());
  sizeLabel.textContent = `${w} × ${h}`;
}

function markSlot(i) {
  const cell = state.cells[i];
  const slot = slotsBox.children[i];
  const thumb = slot.querySelector('img');
  if (cell.image) {
    thumb.src = cell.image.src;
    thumb.hidden = false;
  } else {
    thumb.hidden = true;
  }
  slot.classList.toggle('sel', i === selected);
  document.getElementById('crop-name').textContent = String(i + 1);
  document.getElementById('zoom').value = String(cell.zoom);
  document.getElementById('panx').value = String(cell.panX);
  document.getElementById('pany').value = String(cell.panY);
}

function buildSlots() {
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot';
    slot.title = `Panel ${i + 1}: choose a photo`;
    const thumb = document.createElement('img');
    thumb.alt = '';
    thumb.hidden = true;
    const label = document.createElement('span');
    label.textContent = `Panel ${i + 1}`;
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.addEventListener('change', async () => {
      const file = picker.files[0];
      if (!file) return;
      state.cells[i].image = await loadImage(URL.createObjectURL(file));
      state.cells[i].zoom = 1;
      state.cells[i].panX = 0;
      state.cells[i].panY = 0;
      selected = i;
      markSlot(i);
      repaint();
    });
    slot.append(thumb, label, picker);
    slot.addEventListener('click', (event) => {
      selected = i;
      for (let j = 0; j < 4; j++) markSlot(j);
      if (event.target === slot || event.target === label || event.target === thumb) picker.click();
    });
    slotsBox.append(slot);
  }
}

async function fillAll(url) {
  const img = await loadImage(url);
  for (let i = 0; i < 4; i++) {
    state.cells[i].image = img;
    state.cells[i].zoom = 1;
    state.cells[i].panX = 0;
    state.cells[i].panY = 0;
    markSlot(i);
  }
  repaint();
}

function wireControls() {
  document.getElementById('layouts').addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout]');
    if (!button) return;
    state.layout = button.dataset.layout;
    document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b === button));
    repaint();
  });
  document.getElementById('grades').addEventListener('click', (event) => {
    const button = event.target.closest('[data-grade]');
    if (!button) return;
    state.grade = button.dataset.grade;
    document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('on', b === button));
    repaint();
  });
  document.getElementById('sample-boulevard').addEventListener('click', () => fillAll('samples/boulevard.jpg'));
  document.getElementById('sample-pier').addEventListener('click', () => fillAll('samples/pier.jpg'));
  captionInput.addEventListener('input', repaint);
  taglineInput.addEventListener('input', repaint);
  document.getElementById('size').addEventListener('change', (event) => {
    state.size = event.target.value;
    repaint();
  });
  const applyCrop = () => {
    const cell = state.cells[selected];
    cell.zoom = Number(document.getElementById('zoom').value);
    cell.panX = Number(document.getElementById('panx').value);
    cell.panY = Number(document.getElementById('pany').value);
    repaint();
  };
  document.getElementById('zoom').addEventListener('input', applyCrop);
  document.getElementById('panx').addEventListener('input', applyCrop);
  document.getElementById('pany').addEventListener('input', applyCrop);
  document.getElementById('export').addEventListener('click', () => {
    const [w, h] = SIZES[state.size];
    const out = renderCover(w, h, stateForPaint());
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-grid-${w}x${h}.png`;
      a.click();
      statusLine.textContent = `Saved neon-grid-${w}x${h}.png`;
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  });
}

function refreshSlots() {
  for (let i = 0; i < 4; i++) markSlot(i);
}

buildSlots();
wireControls();
for (let i = 0; i < 4; i++) markSlot(i);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, fillAll, loadImage, repaint, refreshSlots });
} else {
  repaint();
}
