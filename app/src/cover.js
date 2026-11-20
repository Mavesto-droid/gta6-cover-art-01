// Vice Press cover engine: layouts, gradient-map grades, lettering, grain
// and vignette. Pure canvas 2D, no dependencies, no network. Every draw goes
// through renderCover(canvas, state, photos), which paints the whole cover
// at the canvas's own size — the live preview and the PNG export share it.

export const LAYOUTS = [
  { id: 'grid4', name: 'Four Panel', panels: 4 },
  { id: 'hero3', name: 'Hero + Three', panels: 4 },
  { id: 'fullbleed', name: 'Full Bleed', panels: 1 },
  { id: 'grid9', name: 'Nine Panel', panels: 9 },
  { id: 'tilt', name: 'Tilted Stack', panels: 3 },
  { id: 'strip', name: 'Triptych', panels: 3 },
];

export const GRADES = [
  {
    id: 'sunset', name: 'Sunset',
    stops: [[0, '#1a0b2e'], [0.25, '#7b2d8b'], [0.5, '#e8543f'], [0.75, '#ffb347'], [1, '#ffe9a8']],
    overlay: 'rgba(255, 110, 60, 0.10)',
  },
  {
    id: 'neon', name: 'Neon',
    stops: [[0, '#04121f'], [0.3, '#0e4d6e'], [0.6, '#ff2e88'], [0.85, '#00e5ff'], [1, '#ffd6f2']],
    overlay: 'rgba(0, 229, 255, 0.08)',
  },
  {
    id: 'noir', name: 'Noir',
    stops: [[0, '#000000'], [0.35, '#2e2e2e'], [0.7, '#9a9a9a'], [1, '#ffffff']],
    overlay: 'rgba(255, 255, 255, 0.05)',
  },
  {
    id: 'gold', name: 'Gold Hour',
    stops: [[0, '#120a02'], [0.3, '#5a3a10'], [0.6, '#c98a2e'], [1, '#ffe9b0']],
    overlay: 'rgba(255, 190, 80, 0.10)',
  },
  {
    id: 'vice', name: 'Vice',
    stops: [[0, '#160a2e'], [0.3, '#5b1a6e'], [0.6, '#c22a7a'], [1, '#ff9a5c']],
    overlay: 'rgba(194, 42, 122, 0.10)',
  },
  {
    id: 'aqua', name: 'Aqua',
    stops: [[0, '#02141a'], [0.3, '#0b4a5e'], [0.6, '#19b3a6'], [1, '#d8fff4']],
    overlay: 'rgba(25, 179, 166, 0.08)',
  },
  {
    id: 'natural', name: 'Natural',
    stops: null,
    overlay: 'rgba(0, 0, 0, 0)',
  },
];

export const SIZES = [
  { id: '1080x1080', name: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', name: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', name: 'Wide · 1920 x 1080', w: 1920, h: 1080 },
  { id: '1080x1920', name: 'Story · 1080 x 1920', w: 1080, h: 1920 },
];

/** Panel rectangles for a layout, as fractions of the cover, with a gutter. */
export function layoutPanels(layoutId, W, H) {
  const g = 0.012; // gutter, fraction of the smaller side
  const gx = g * Math.min(W, H);
  const gy = g * Math.min(W, H);
  const inset = (x, y, w, h) => ({ x: x + gx / 2, y: y + gy / 2, w: w - gx, h: h - gy, rot: 0 });
  switch (layoutId) {
    case 'hero3':
      return [
        inset(0, 0, W * 0.62, H),
        inset(W * 0.62, 0, W * 0.38, H / 3),
        inset(W * 0.62, H / 3, W * 0.38, H / 3),
        inset(W * 0.62, (2 * H) / 3, W * 0.38, H / 3),
      ];
    case 'fullbleed':
      return [{ x: 0, y: 0, w: W, h: H, rot: 0 }];
    case 'grid9': {
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) out.push(inset((c * W) / 3, (r * H) / 3, W / 3, H / 3));
      }
      return out;
    }
    case 'tilt':
      return [
        { x: W * 0.05, y: H * 0.08, w: W * 0.44, h: H * 0.6, rot: -0.1 },
        { x: W * 0.5, y: H * 0.05, w: W * 0.45, h: H * 0.62, rot: 0.07 },
        { x: W * 0.27, y: H * 0.42, w: W * 0.48, h: H * 0.5, rot: -0.035 },
      ];
    case 'strip':
      return [
        inset(0, 0, W / 3, H),
        inset(W / 3, 0, W / 3, H),
        inset((2 * W) / 3, 0, W / 3, H),
      ];
    case 'grid4':
    default:
      return [
        inset(0, 0, W / 2, H / 2),
        inset(W / 2, 0, W / 2, H / 2),
        inset(0, H / 2, W / 2, H / 2),
        inset(W / 2, H / 2, W / 2, H / 2),
      ];
  }
}

/** Where the title block sits for a layout: {x, y, w, h, align}. */
export function titleZone(layoutId, W, H) {
  if (layoutId === 'tilt') return { x: W * 0.05, y: H * 0.01, w: W * 0.9, h: H * 0.22, align: 'left' };
  if (layoutId === 'hero3') return { x: W * 0.03, y: H * 0.74, w: W * 0.56, h: H * 0.23, align: 'left' };
  return { x: W * 0.04, y: H * 0.74, w: W * 0.92, h: H * 0.23, align: 'center' };
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A 256-entry lookup table for a grade's gradient map. */
function gradeLut(grade) {
  const lut = new Array(256);
  const stops = grade.stops.map(([t, c]) => [t, hexRgb(c)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const f = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    lut[i] = [
      Math.round(a[1][0] + (b[1][0] - a[1][0]) * f),
      Math.round(a[1][1] + (b[1][1] - a[1][1]) * f),
      Math.round(a[1][2] + (b[1][2] - a[1][2]) * f),
    ];
  }
  return lut;
}

const lutCache = new Map();
function lutFor(grade) {
  if (!lutCache.has(grade.id)) lutCache.set(grade.id, gradeLut(grade));
  return lutCache.get(grade.id);
}

/**
 * Draws one photo into a panel rect, cover-fit, with the panel's pan/zoom,
 * then remaps its tones through the grade. Falls back to a colour overlay
 * when the canvas cannot be read back (a file:// page in some browsers).
 */
function drawGradedPhoto(ctx, photo, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * (panel.zoom || 1);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const dx = x + (w - pw) / 2 + (panel.ox || 0) * w;
  const dy = y + (h - ph) / 2 + (panel.oy || 0) * h;
  if (grade.id === 'natural' || !grade.stops) {
    ctx.filter = 'contrast(1.06) saturate(1.12)';
    ctx.drawImage(photo, dx, dy, pw, ph);
    ctx.filter = 'none';
  } else {
    const off = document.createElement('canvas');
    off.width = Math.max(2, Math.round(w));
    off.height = Math.max(2, Math.round(h));
    const octx = off.getContext('2d');
    octx.filter = 'contrast(1.08) saturate(1.15)';
    octx.drawImage(photo, dx - x, dy - y, pw, ph);
    octx.filter = 'none';
    let mapped = false;
    try {
      const img = octx.getImageData(0, 0, off.width, off.height);
      const lut = lutFor(grade);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8;
        const c = lut[l];
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
      }
      octx.putImageData(img, 0, 0);
      mapped = true;
    } catch (e) {
      mapped = false;
    }
    ctx.drawImage(off, x, y, w, h);
    if (!mapped) {
      // Overlay fallback: a tint wash plus the grade's overlay colour.
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grade.overlay;
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}

/** A placeholder panel: deep plum with diagonal sheen, so an empty panel never looks broken. */
function drawEmptyPanel(ctx, rect, i) {
  const { x, y, w, h } = rect;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#3b1a4e');
  g.addColorStop(1, '#160a24');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = Math.max(2, w * 0.01);
  for (let d = -h; d < w; d += w * 0.09) {
    ctx.beginPath();
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `600 ${Math.round(Math.min(w, h) * 0.055)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`PANEL ${i + 1}`, x + w / 2, y + h / 2);
}

/** Fits text to a width by shrinking, then wraps to at most two lines. */
function fitLines(ctx, text, maxWidth, size) {
  const words = text.split(/\s+/).filter(Boolean);
  let s = size;
  const set = () => {
    ctx.font = `${s}px Anton, 'Arial Narrow', sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(s * 0.02)}px`;
    } catch (e) {
      /* letterSpacing is Chromium-only */
    }
  };
  set();
  const widthOf = (line) => ctx.measureText(line).width;
  while (s > 10 && words.some((wd) => widthOf(wd) > maxWidth)) {
    s -= 2;
    set();
  }
  const lines = [];
  let line = '';
  for (const wd of words) {
    const next = line ? `${line} ${wd}` : wd;
    if (widthOf(next) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = wd;
    }
  }
  if (line) lines.push(line);
  while (lines.length > 2) {
    lines[1] = `${lines[1]} ${lines.pop()}`;
  }
  while (s > 10 && lines.some((ln) => widthOf(ln) > maxWidth)) {
    s -= 2;
    set();
  }
  return { lines: lines.slice(0, 2), size: s };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 128;
  t.height = 128;
  const c = t.getContext('2d');
  const img = c.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 96);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = t;
  return t;
}

/** Draws the title block: halftone band, title, script subtitle, heat stars. */
function drawTitleBlock(ctx, state, W, H) {
  const zone = titleZone(state.layout, W, H);
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (!title && !subtitle) return;
  const bandH = zone.h;
  // Scrim so lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, zone.y - bandH * 0.25, 0, zone.y + bandH);
  scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
  scrim.addColorStop(1, 'rgba(10, 4, 18, 0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(zone.x - W * 0.02, zone.y - bandH * 0.25, zone.w + W * 0.04, bandH * 1.25);
  if (state.halftone) {
    // Halftone dots along the top edge of the band.
    const dotR = Math.max(1.5, W * 0.0022);
    const gap = dotR * 3.4;
    ctx.fillStyle = 'rgba(255, 214, 120, 0.35)';
    for (let xx = zone.x; xx < zone.x + zone.w; xx += gap) {
      for (let row = 0; row < 2; row++) {
        ctx.beginPath();
        ctx.arc(xx + (row % 2 ? gap / 2 : 0), zone.y - bandH * 0.25 + row * gap * 0.9, dotR * (1 - row * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const cx = zone.align === 'left' ? zone.x : zone.x + zone.w / 2;
  ctx.textAlign = zone.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'alphabetic';
  let cursorY = zone.y + bandH * 0.62;
  if (title) {
    const maxSize = Math.round(bandH * 0.44);
    const { lines, size } = fitLines(ctx, title, zone.w, maxSize);
    const lineH = size * 1.02;
    let ty = cursorY - (lines.length - 1) * lineH;
    let lastBaseline = ty;
    for (const line of lines) {
      if (state.titleColor === 'sunset') {
        const g = ctx.createLinearGradient(zone.x, 0, zone.x + zone.w, 0);
        g.addColorStop(0, '#ffd166');
        g.addColorStop(0.5, '#ff5e78');
        g.addColorStop(1, '#ff2e88');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      if (state.outline) {
        ctx.lineWidth = Math.max(2, size * 0.07);
        ctx.strokeStyle = 'rgba(10, 4, 18, 0.9)';
        ctx.lineJoin = 'round';
        ctx.strokeText(line, cx, ty);
      }
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.round(size * 0.12);
      ctx.shadowOffsetY = Math.round(size * 0.04);
      ctx.fillText(line, cx, ty);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      lastBaseline = ty;
      ty += lineH;
    }
    cursorY = lastBaseline + size * 0.42;
  }
  if (subtitle) {
    ctx.font = `${Math.round(bandH * 0.22)}px Pacifico, cursive`;
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = Math.round(bandH * 0.05);
    ctx.fillText(subtitle, cx, cursorY);
    ctx.shadowBlur = 0;
  }
  if (state.heat > 0) {
    const starSize = Math.round(bandH * 0.16);
    ctx.font = `${starSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffcf3f';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < state.heat ? '★' : '☆';
    ctx.fillText(stars, cx, cursorY + starSize * 1.5);
  }
}

/** A tilted badge ribbon in the top-right corner. */
function drawBadge(ctx, state, W, H) {
  const text = (state.badge || '').trim();
  if (!text) return;
  const size = Math.round(Math.min(W, H) * 0.028);
  ctx.save();
  ctx.translate(W * 0.86, H * 0.045);
  ctx.rotate(-0.1);
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width + size * 1.6;
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = size * 0.25;
  ctx.shadowOffsetY = size * 0.08;
  ctx.fillRect(-tw / 2, -size * 0.75, tw, size * 1.5);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 0, size * 0.05);
  ctx.restore();
}

/**
 * Paints the whole cover onto ctx at the canvas's own size.
 * state: {layout, grade, title, subtitle, titleColor, outline, halftone,
 *         grain, vignette, badge, heat, panels:[{photo, zoom, ox, oy}]}
 * photos: array of HTMLImageElement (or null entries).
 */
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES.find((g) => g.id === state.grade) || GRADES[0];
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // Base: deep plum so gutters read as poster board.
  ctx.fillStyle = '#12061f';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutPanels(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: -1, zoom: 1, ox: 0, oy: 0 };
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = Math.round(Math.min(W, H) * 0.03);
      ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.012);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    const photo = panel.photo >= 0 ? photos[panel.photo] : null;
    if (photo) drawGradedPhoto(ctx, photo, rect, panel, grade);
    else drawEmptyPanel(ctx, rect, i);
    ctx.restore();
    // Thin white keyline around each panel, poster style.
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });
  drawTitleBlock(ctx, state, W, H);
  drawBadge(ctx, state, W, H);
  if (state.vignette) {
    const v = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.restore();
}

/** Default state: a four-panel sunset cover with the samples loaded. */
export function defaultState() {
  const panels = [];
  for (let i = 0; i < 9; i++) panels.push({ photo: i < 3 ? i : -1, zoom: 1, ox: 0, oy: 0 });
  return {
    layout: 'grid4',
    grade: 'sunset',
    title: 'Neon Shore',
    subtitle: 'a vice city story',
    titleColor: 'white',
    outline: true,
    halftone: true,
    grain: true,
    vignette: true,
    badge: 'Launch Week',
    heat: 4,
    size: '1080x1080',
    panels,
  };
}
