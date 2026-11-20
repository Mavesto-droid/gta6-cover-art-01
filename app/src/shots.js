// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, drawn at the viewport's
// size. Query params: layout, grade, caption, subtitle, size, photo (a
// sample name) or photos (comma list, one per panel). window.__shotReady
// is set once the scene has painted with its fonts.
import { renderCover } from './cover.js';

export async function runShot(shot, query, ctx) {
  const { state, photos, render, syncControls, syncThumbs, canvas } = ctx;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('badge')) state.badge = query.get('badge');
  if (query.get('heat')) state.heat = Number(query.get('heat'));

  // Assign photos to panels: a named sample, or a comma list per panel.
  const byName = (name) => photos.findIndex((p) => p.img.src.endsWith(`/${name}.jpg`));
  const list = (query.get('photos') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length) {
    list.forEach((name, i) => {
      const idx = byName(name);
      if (idx >= 0 && state.panels[i]) state.panels[i] = { ...state.panels[i], photo: idx };
    });
  } else if (query.get('photo')) {
    const idx = byName(query.get('photo'));
    if (idx >= 0) {
      state.panels.forEach((p, i) => {
        state.panels[i] = { ...p, photo: photos[(idx + i) % photos.length] ? (idx + i) % photos.length : idx };
      });
    }
  }

  try {
    await Promise.race([
      Promise.all([document.fonts.load('100px Anton'), document.fonts.load('40px Pacifico'), document.fonts.ready]),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) {
    /* fall back to system fonts */
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderCover(canvas, state, photos.map((p) => p.img));
  } else {
    syncThumbs();
    syncControls();
    render();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
