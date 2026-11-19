// Fixed scenes for screenshots: ?shot=editor shows the editor with photos loaded;
// ?shot=cover shows the exported cover alone, full-bleed, at the requested size.
// `photo` picks the sample(s): boulevard, pier, or mix (alternating panels).
// `layout`, `grade`, `size`, `caption` and `tagline` all come from the query.
// window.__shotReady is set once the cover is painted with fonts loaded.
export async function runShot(shot, query, helpers) {
  const { state, loadImage, repaint, refreshSlots } = helpers;
  const pick = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Neon Nights';
  const tagline = query.get('tagline') ?? 'Leonida • Vice City';
  const layout = query.get('layout') ?? 'grid';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? '1080x1080';

  document.getElementById('caption').value = caption;
  document.getElementById('tagline').value = tagline;
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  document.getElementById('size').value = size;
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('on', b.dataset.grade === grade));

  const boulevard = await loadImage('samples/boulevard.jpg');
  const pier = await loadImage('samples/pier.jpg');
  const wanted = pick === 'mix' ? [boulevard, pier, boulevard, pier] : [pick === 'boulevard' ? boulevard : pier];
  for (let i = 0; i < 4; i++) {
    state.cells[i].image = wanted[i % wanted.length];
    state.cells[i].zoom = 1;
    state.cells[i].panX = 0;
    state.cells[i].panY = 0;
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');
  refreshSlots();
  repaint();
  await document.fonts.ready;
  repaint();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
