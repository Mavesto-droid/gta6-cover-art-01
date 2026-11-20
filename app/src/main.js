// Vice Press: wires the page — photos, layouts, grades, caption, panels,
// export, undo/redo, and the ?shot= scenes for screenshots (./shots.js).
import { LAYOUTS, GRADES, SIZES, layoutPanels, renderCover, defaultState } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const SAMPLES = [
  { name: 'Neon Nights', url: 'samples/neon.jpg' },
  { name: 'Boulevard', url: 'samples/boulevard.jpg' },
  { name: 'Pier', url: 'samples/pier.jpg' },
];

const STORE_KEY = 'vice-press-state-v1';
let state = loadState();
let photos = []; // {img, name, sample}
let selected = 0;
let history = [];
let future = [];

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.panels) && s.layout) return { ...defaultState(), ...s };
    }
  } catch (e) {
    /* fresh state */
  }
  return defaultState();
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage full or unavailable */
  }
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function pushHistory() {
  history.push(JSON.stringify(state));
  if (history.length > 50) history.shift();
  future = [];
  syncUndoRedo();
}

function applyState(next) {
  state = next;
  syncControls();
  render();
  saveState();
}

function render() {
  const size = SIZES.find((s) => s.id === state.size) || SIZES[0];
  const maxSide = 560;
  const scale = Math.min(maxSide / size.w, maxSide / size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  renderCover(canvas, state, photos.map((p) => p.img));
  drawSelection();
}

function drawSelection() {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const rect = rects[selected];
  if (!rect) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.rot);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  }
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.restore();
}

function pointInRect(px, py, rect) {
  if (!rect.rot) return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = px - cx;
  const dy = py - cy;
  const cos = Math.cos(-rect.rot);
  const sin = Math.sin(-rect.rot);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= rect.w / 2 && Math.abs(ly) <= rect.h / 2;
}

function pickPanel(px, py) {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    if (pointInRect(px, py, rects[i])) return i;
  }
  return selected;
}

function syncControls() {
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('titleColor').value = state.titleColor;
  $('outline').checked = state.outline;
  $('halftone').checked = state.halftone;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('badge').value = state.badge;
  $('heat').value = String(state.heat);
  syncPanelControls();
  syncUndoRedo();
}

function syncPanelControls() {
  const panel = state.panels[selected] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
  const sel = $('panelPhoto');
  sel.innerHTML = '<option value="-1">Empty panel</option>' + photos.map((p, i) => `<option value="${i}">${p.name}</option>`).join('');
  sel.value = String(panel.photo);
  $('zoom').value = String(panel.zoom || 1);
  $('panX').value = String(panel.ox || 0);
  $('panY').value = String(panel.oy || 0);
  $('zoomVal').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  $('panelLabel').textContent = `Panel ${selected + 1} of ${layoutPanels(state.layout, 1, 1).length}`;
}

function syncUndoRedo() {
  $('undoBtn').disabled = history.length === 0;
  $('redoBtn').disabled = future.length === 0;
}

function syncThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = p.name;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selected] = { ...state.panels[selected], photo: i };
      applyState(state);
      setStatus(`Panel ${selected + 1} now shows ${p.name}.`);
    });
    box.appendChild(b);
  });
}

function setStatus(text) {
  $('status').textContent = text;
}

async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  for (const file of list) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      photos.push({ img, name: file.name.replace(/\.[^.]+$/, ''), sample: false });
    } catch (e) {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  // New photos fill the first empty panels.
  pushHistory();
  let next = 0;
  state.panels.forEach((p, i) => {
    if (p.photo === -1 && next < photos.length) {
      state.panels[i] = { ...p, photo: next };
      next += 1;
    }
  });
  syncThumbs();
  applyState(state);
  setStatus(`${list.length} photo${list.length > 1 ? 's' : ''} added.`);
}

function renderToSize(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off, state, photos.map((p) => p.img));
  return off;
}

function downloadCanvas(off, filename) {
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed: the browser refused the canvas.');
        resolve(false);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(true);
    }, 'image/png');
  });
}

async function exportOne(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
  const off = renderToSize(size.id);
  const ok = await downloadCanvas(off, `vice-press-${size.id}.png`);
  if (ok) setStatus(`Saved vice-press-${size.id}.png (${size.w} x ${size.h}).`);
}

async function exportAll() {
  for (const size of SIZES) {
    await exportOne(size.id);
    await new Promise((r) => setTimeout(r, 400));
  }
}

// --- wiring ---
document.querySelectorAll('.layout-btn').forEach((b) => {
  b.addEventListener('click', () => {
    pushHistory();
    state.layout = b.dataset.layout;
    selected = 0;
    applyState(state);
  });
});
document.querySelectorAll('.grade-btn').forEach((b) => {
  b.addEventListener('click', () => {
    pushHistory();
    state.grade = b.dataset.grade;
    applyState(state);
  });
});
document.querySelectorAll('.size-btn').forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    applyState(state);
  });
});
$('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  render();
  saveState();
});
$('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  render();
  saveState();
});
$('titleColor').addEventListener('change', (e) => {
  pushHistory();
  state.titleColor = e.target.value;
  applyState(state);
});
$('outline').addEventListener('change', (e) => {
  state.outline = e.target.checked;
  render();
  saveState();
});
$('halftone').addEventListener('change', (e) => {
  state.halftone = e.target.checked;
  render();
  saveState();
});
$('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  render();
  saveState();
});
$('vignette').addEventListener('change', (e) => {
  state.vignette = e.target.checked;
  render();
  saveState();
});
$('badge').addEventListener('input', (e) => {
  state.badge = e.target.value;
  render();
  saveState();
});
$('heat').addEventListener('change', (e) => {
  pushHistory();
  state.heat = Number(e.target.value);
  applyState(state);
});
$('panelPhoto').addEventListener('change', (e) => {
  pushHistory();
  state.panels[selected] = { ...state.panels[selected], photo: Number(e.target.value) };
  applyState(state);
});
$('zoom').addEventListener('input', (e) => {
  state.panels[selected] = { ...state.panels[selected], zoom: Number(e.target.value) };
  syncPanelControls();
  render();
});
$('zoom').addEventListener('change', () => {
  pushHistory();
  saveState();
});
$('panX').addEventListener('input', (e) => {
  state.panels[selected] = { ...state.panels[selected], ox: Number(e.target.value) };
  render();
});
$('panY').addEventListener('input', (e) => {
  state.panels[selected] = { ...state.panels[selected], oy: Number(e.target.value) };
  render();
});
$('panX').addEventListener('change', () => {
  pushHistory();
  saveState();
});
$('panY').addEventListener('change', () => {
  pushHistory();
  saveState();
});
$('resetPanel').addEventListener('click', () => {
  pushHistory();
  state.panels[selected] = { photo: state.panels[selected].photo, zoom: 1, ox: 0, oy: 0 };
  applyState(state);
});
$('photoFile').addEventListener('change', (e) => addFiles(e.target.files));
$('dropZone').addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
$('dropZone').addEventListener('drop', (e) => {
  e.preventDefault();
  addFiles(e.dataTransfer.files);
});
$('exportBtn').addEventListener('click', () => exportOne(state.size));
$('exportAllBtn').addEventListener('click', exportAll);
$('undoBtn').addEventListener('click', () => {
  if (!history.length) return;
  future.push(JSON.stringify(state));
  applyState(JSON.parse(history.pop()));
});
$('redoBtn').addEventListener('click', () => {
  if (!future.length) return;
  history.push(JSON.stringify(state));
  applyState(JSON.parse(future.pop()));
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    $('undoBtn').click();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault();
    $('redoBtn').click();
  }
});

// Canvas pan/zoom on the selected panel.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * canvas.width;
  const py = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = pickPanel(px, py);
  if (hit !== selected) {
    selected = hit;
    syncPanelControls();
    render();
  }
  drag = { x: px, y: py, ox: state.panels[selected].ox || 0, oy: state.panels[selected].oy || 0, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * canvas.width;
  const py = ((e.clientY - r.top) / r.height) * canvas.height;
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const rect = rects[selected];
  if (!rect) return;
  const p = state.panels[selected];
  p.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (px - drag.x) / rect.w));
  p.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (py - drag.y) / rect.h));
  if (Math.abs(px - drag.x) + Math.abs(py - drag.y) > 4) drag.moved = true;
  syncPanelControls();
  render();
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) {
    pushHistory();
    saveState();
  }
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selected];
  const next = Math.max(1, Math.min(3, (p.zoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
  p.zoom = Math.round(next * 100) / 100;
  syncPanelControls();
  render();
}, { passive: false });

// --- boot ---
async function boot() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('100px Anton'), document.fonts.load('40px Pacifico'), document.fonts.ready]),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) {
    /* fall back to system fonts */
  }
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.url);
      photos.push({ img, name: s.name, sample: true });
    } catch (e) {
      /* a missing sample just leaves its panel empty */
    }
  }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), { state, photos, loadImage, render, syncControls, syncThumbs, applyState, canvas });
    return;
  }
  syncThumbs();
  syncControls();
  render();
}

boot();
