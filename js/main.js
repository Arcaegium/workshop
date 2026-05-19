/* ============================================================
   ARCAEGIUM — main.js
   Reads content/*.json and renders the landing page.
   All hardcoded values live in content/ — edit via /admin/
   ============================================================ */

'use strict';

/* ── PALETTE MAP — accent_color_palette values → CSS vars / hex ── */
const PALETTE = {
  steam:   { accent: '#ff9a45', glow: 'rgba(255,154,69,0.22)'  },
  cyber:   { accent: '#00ffe7', glow: 'rgba(0,255,231,0.22)'   },
  chaos_a: { accent: '#c724ff', glow: 'rgba(199,36,255,0.22)'  },
  chaos_b: { accent: '#39ff6e', glow: 'rgba(57,255,110,0.22)'  },
  chaos_c: { accent: '#ff2d6f', glow: 'rgba(255,45,110,0.22)'  },
  chaos_d: { accent: '#ffe847', glow: 'rgba(255,232,71,0.22)'  },
  ui:      { accent: '#7ab8e0', glow: 'rgba(122,184,224,0.15)' },
};

/* ── GLOBALS — populated after JSON load ── */
let SITE    = {};   /* site-config.json */
let PORTALS = [];   /* portals.json     */

/* ============================================================
   BOOT — fetch JSON files then render
   ============================================================ */
async function boot() {
  try {
    const [portalsRes, siteRes] = await Promise.all([
      fetch('content/portals.json'),
      fetch('content/site-config.json'),
    ]);
    const portalsData = await portalsRes.json();
    PORTALS = Array.isArray(portalsData) ? portalsData : (portalsData.portals || []);
    SITE    = await siteRes.json();
  } catch (e) {
    console.error('Arcaegium: failed to load content JSON', e);
    return;
  }

  applySiteMeta();
  renderHeader();
  renderPortals();
  renderHudFooter();
  renderFooter();

  initBrickWall();
  initGlitchLayer();
  initWorkshopTitle();
  /* initCardScrambles() and initCardFlicker() re-enable with renderPortals() */
  initStatusBar();
}

/* ============================================================
   SITE META
   ============================================================ */
function applySiteMeta() {
  document.title = SITE.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', SITE.meta.description);
}

/* ============================================================
   HEADER
   ============================================================ */
function renderHeader() {
  const h = SITE.header;

  document.getElementById('coordLeft').textContent   = h.coord_left;
  document.getElementById('coordCenter').textContent = h.coord_center;
  document.getElementById('coordRight').textContent  = h.coord_right;

  document.getElementById('taglineSub').innerHTML =
    `${esc(h.tagline_line1)} &nbsp;/&nbsp; ${esc(h.tagline_line2)} &nbsp;/&nbsp; ${esc(h.tagline_line3)}`;

  document.getElementById('introText').textContent = h.intro_text;
  document.getElementById('portalsLabel').textContent = SITE.portals_section.label;
}

/* ============================================================
   PORTAL CARDS — currently hidden
   ============================================================ */
function renderPortals() {
  const container = document.getElementById('portalsContainer');
  container.innerHTML = '';

  const visible = PORTALS
    .filter(p => p.visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  visible.forEach((portal, idx) => {
    const el = buildPortalCard(portal, idx);
    container.appendChild(el);
  });
}

function buildPortalCard(p, idx) {
  const colors = resolveAccent(p);
  const isUnknown = p.state === 'unknown';
  const isCycle   = p.accent_color_mode === 'cycle';
  const hasUrl    = p.url && p.url.trim() !== '';

  const el = document.createElement(hasUrl && !isUnknown ? 'a' : 'div');
  if (hasUrl && !isUnknown) el.href = p.url;

  el.className = [
    'portal',
    isCycle   ? 'portal-cycle'  : '',
    isUnknown ? 'portal-unknown' : '',
  ].filter(Boolean).join(' ');

  el.dataset.portalId = p.id;
  el.dataset.unknown  = isUnknown ? 'true' : 'false';
  if (p.title) el.dataset.title = p.title;

  if (!isCycle) {
    el.style.setProperty('--card-accent', colors.accent);
    el.style.setProperty('--card-glow',   colors.glow);
  }

  el.style.animationDelay = `${1.0 + idx * 0.2}s`;

  el.innerHTML = `
    <div class="card-flicker"></div>
    <div class="card-static"><span class="card-static-txt">// SIGNAL LOST //</span></div>
    <div class="portal-accent-line"></div>
    <div class="portal-wash"></div>
    <div class="portal-text">
      <p class="portal-id">GATEWAY-${esc(p.gateway_number)} &nbsp;·&nbsp; ${esc(p.genre_label)}</p>
      <h2 class="portal-name"><span class="name-inner"></span></h2>
      <p class="portal-desc">${esc(p.description)}</p>
      <span class="portal-tag">${esc(p.tag)}</span>
    </div>
    <div class="portal-image">${buildImagePanel(p)}</div>
  `;

  return el;
}

function resolveAccent(p) {
  if (p.accent_color_mode === 'palette') {
    return PALETTE[p.accent_color_palette] || PALETTE.ui;
  }
  if (p.accent_color_mode === 'custom' && p.accent_color_hex) {
    return { accent: p.accent_color_hex, glow: hexToGlow(p.accent_color_hex) };
  }
  return PALETTE.ui;
}

function buildImagePanel(p) {
  switch (p.image_type) {
    case 'upload':
      return `<img src="${esc(p.image)}" alt="${esc(p.title || 'Portal')}" loading="lazy">`;
    case 'css_cyber':
      return `<div class="portal-placeholder placeholder-cyber"></div>`;
    case 'css_void_magenta':
      return `<div class="portal-placeholder placeholder-void1"></div>`;
    case 'css_void_green':
      return `<div class="portal-placeholder placeholder-void2"></div>`;
    default:
      return '';
  }
}

function hexToGlow(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},0.22)`;
}

/* ============================================================
   HUD FOOTER
   ============================================================ */
function renderHudFooter() {
  const hud = SITE.hud_footer;
  document.getElementById('hudStatus').textContent = hud.status_label;
}

/* ============================================================
   PAGE FOOTER
   ============================================================ */
function renderFooter() {
  document.getElementById('footerCredit').textContent = SITE.footer.credit_text;
}

/* ============================================================
   BRICK WALL BACKGROUND
   Draws on #brickCanvas (position:fixed, sits above the video).
   Transparent window holes let the video show through.
   Canvas is redrawn on resize.
   ============================================================ */
function initBrickWall() {
  const cv = document.getElementById('brickCanvas');
  if (!cv) return;

  /* size the canvas to cover the full page — not just the viewport —
     so the wall extends as portal cards are added below the fold */
  const W = window.innerWidth;
  const H = Math.max(window.innerHeight, document.documentElement.scrollHeight);
  cv.width  = W;
  cv.height = H;

  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  /* ── position hash — deterministic per (x,y,salt) ── */
  function ph(x, y, s) {
    let h = ((x|0)*374761393 + (y|0)*1234567 + (s|0)*999983)|0;
    h ^= h>>>13; h = Math.imul(h, 0xd3a0fd7b); h ^= h>>>17;
    return (h>>>0) / 4294967296;
  }

  /* ── brick constants ── */
  const BH = 22, MH = 4, CH = 26;   /* brick height, mortar, course height */
  const BW = 50, BP = 54;            /* brick width, brick pitch */

  /* ── window layout ──
     One row of windows per ROW_H pixels of wall height.
     Gaps are measured in brick units: 4 bricks horizontal, 4 courses vertical. */
  const N_COLS  = W >= 700 ? 2 : 1;
  const B_GAP_H = 4 * BP;    /* 4 bricks wide between columns = 216px */
  const B_GAP_V = 4 * CH;    /* 4 brick courses between rows   = 104px */
  const B_OUTER = 4 * BP;    /* 4 bricks outer margin each side */
  const WIN_W   = N_COLS > 1
    ? Math.floor((W - B_GAP_H - 2 * B_OUTER) / 2)
    : Math.floor(W - 2 * B_OUTER);
  const WIN_H   = Math.min(Math.round(WIN_W * 1.35), Math.round(window.innerHeight * 0.58));
  const ROW_H   = WIN_H + B_GAP_V;
  const FIRST_Y = B_GAP_V;

  /* window x positions: centered within each column */
  const col0X = B_OUTER;                        /* left column x start */
  const col1X = B_OUTER + WIN_W + B_GAP_H;      /* right column x start */

  const wins = [];
  for (let row = 0; FIRST_Y + row * ROW_H < H + WIN_H; row++) {
    for (let col = 0; col < N_COLS; col++) {
      const wx = col === 0 ? col0X : col1X;
      const cx = wx + WIN_W / 2;
      wins.push({
        cx,
        x:   wx,
        y:   FIRST_Y + row * ROW_H,
        w:   WIN_W,
        h:   WIN_H,
        row,
      });
    }
  }

  /* ─────────────────────────────────────────────────
     BUILD WALL ON OFFSCREEN CANVAS
     Draw bricks → soot → punch holes → return canvas
  ───────────────────────────────────────────────── */
  const off    = document.createElement('canvas');
  off.width = W; off.height = H;
  const c = off.getContext('2d');

  /* mortar base */
  c.fillStyle = '#1a0c06';
  c.fillRect(0, 0, W, H);

  /* bricks */
  for (let row = -1; row * CH < H + CH; row++) {
    const ry  = row * CH;
    const odd = ((row % 2) + 2) % 2;
    const ox  = odd ? BP / 2 : 0;

    for (let col = -1; ; col++) {
      const rx = col * BP + ox;
      if (rx > W + BP) break;

      const h1 = ph(col, row, 1);
      let r, g, b;
      if      (h1 < 0.05) { r=42;  g=10; b=8;  }
      else if (h1 < 0.18) { r=58;  g=16; b=11; }
      else if (h1 < 0.62) { r=72;  g=22; b=14; }
      else if (h1 < 0.84) { r=84;  g=28; b=18; }
      else                { r=94;  g=34; b=20; }

      if (ph(col, row, 2) > 0.90) { r += 10; g += 6; }
      if (ph(col, row, 3) < 0.06) { r -= 12; g -= 5; }

      c.fillStyle = `rgb(${r},${g},${b})`;
      c.fillRect(rx + 1, ry + 1, BW - 1, BH - 1);

      /* dark stain on some bricks */
      if (ph(col, row, 7) < 0.08) {
        c.fillStyle = 'rgba(0,0,0,0.20)';
        const sw = 8 + ph(col, row, 8) * 20;
        const sx = rx + 2 + ph(col, row, 9) * (BW - sw - 4);
        c.fillRect(sx, ry + 1, sw, BH - 1);
      }
    }
  }

  /* soot darkening around each window opening */
  wins.forEach(w => {
    const sg = c.createRadialGradient(w.cx, w.y + w.h * 0.4, 0, w.cx, w.y + w.h * 0.4, w.w * 0.9);
    sg.addColorStop(0, 'rgba(0,0,0,0.38)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg;
    c.fillRect(w.x - 50, w.y - 30, w.w + 100, w.h + 60);
  });

  /* moisture fade at bottom of each section */
  const bf = c.createLinearGradient(0, H * 0.82, 0, H);
  bf.addColorStop(0, 'rgba(0,0,0,0)');
  bf.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = bf;
  c.fillRect(0, H * 0.82, W, H * 0.18);

  /* punch transparent holes where windows are */
  c.globalCompositeOperation = 'destination-out';
  wins.forEach(w => {
    c.fillStyle = 'rgba(0,0,0,1)';
    c.fillRect(w.x, w.y, w.w, w.h);
  });
  c.globalCompositeOperation = 'source-over';

  /* composite brick wall onto main canvas */
  ctx.drawImage(off, 0, 0);

  /* ─────────────────────────────────────────────────
     WINDOW FRAMES — drawn on main canvas on top of wall
  ───────────────────────────────────────────────── */
  function rivet(x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#302820'; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(140,110,55,0.45)'; ctx.fill();
  }

  wins.forEach(w => {
    const FW = 10;
    ctx.fillStyle = '#222018';
    /* side pillars */
    ctx.fillRect(w.x - FW,      w.y, FW,         w.h);
    ctx.fillRect(w.x + w.w,     w.y, FW,         w.h);
    /* top and bottom rails */
    ctx.fillRect(w.x - FW,      w.y - FW, w.w + FW * 2, FW);
    ctx.fillRect(w.x - FW,      w.y + w.h, w.w + FW * 2, FW + 2);

    /* corner rivets */
    [
      [w.x - FW / 2,       w.y + 18],
      [w.x - FW / 2,       w.y + w.h - 18],
      [w.x + w.w + FW / 2, w.y + 18],
      [w.x + w.w + FW / 2, w.y + w.h - 18],
    ].forEach(([rx, ry]) => rivet(rx, ry, 3.5));

    /* mullions */
    ctx.strokeStyle = '#282018'; ctx.lineWidth = 5; ctx.lineCap = 'square';
    ctx.beginPath(); ctx.moveTo(w.cx,  w.y); ctx.lineTo(w.cx,  w.y + w.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w.x,   w.y + w.h * 0.38); ctx.lineTo(w.x + w.w, w.y + w.h * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w.x,   w.y + w.h * 0.70); ctx.lineTo(w.x + w.w, w.y + w.h * 0.70); ctx.stroke();

    /* mullion intersection rivets */
    [w.cx, w.x + w.w * 0.25, w.x + w.w * 0.75].forEach(mx => {
      rivet(mx, w.y + w.h * 0.38, 2.5);
      rivet(mx, w.y + w.h * 0.70, 2.5);
    });
  });

  /* ─────────────────────────────────────────────────
     PIPE SYSTEM — drawn on main canvas
  ───────────────────────────────────────────────── */
  function flange(x, y, pr) {
    ctx.beginPath(); ctx.arc(x, y, pr + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2218'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, pr + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#353025'; ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      rivet(x + Math.cos(a) * (pr + 3.5), y + Math.sin(a) * (pr + 3.5), 2);
    }
  }

  function bracket(x, y, pr) {
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - pr - 4, y - 8);
    ctx.lineTo(x - pr - 4, y + pr + 2);
    ctx.arc(x, y + pr + 2, pr + 4, Math.PI, 0);
    ctx.lineTo(x + pr + 4, y - 8);
    ctx.stroke();
    rivet(x - pr - 4, y - 8, 3);
    rivet(x + pr + 4, y - 8, 3);
  }

  function valve(x, y, pr) {
    const R = pr * 2.2;
    ctx.strokeStyle = '#c8860a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#8a5a0e';
    ctx.beginPath(); ctx.arc(x, y, R * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c8860a'; ctx.lineWidth = 1.8;
    for (let s = 0; s < 5; s++) {
      const a = s / 5 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * R * 0.28, y + Math.sin(a) * R * 0.28);
      ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a0e';
    ctx.fillRect(x - 3, y - R - R * 0.45, 6, R * 0.45);
    ctx.fillRect(x - 7, y - R - R * 0.45, 14, 4);
  }

  function gauge(x, y, pr) {
    const R = pr * 2.0;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1810'; ctx.fill();
    ctx.strokeStyle = '#8a5a0e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R - 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ccc4a0'; ctx.fill();
    const na = -Math.PI * 0.7 + ph(x, y, 42) * Math.PI * 1.4;
    ctx.strokeStyle = '#5a1010'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(na) * (R - 5), y + Math.sin(na) * (R - 5));
    ctx.stroke();
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  }

  function hpipe(x1, x2, y, pr, col) {
    if (x2 <= x1) return;
    ctx.fillStyle = col || '#252018';
    ctx.fillRect(x1, y - pr, x2 - x1, pr * 2);
    /* highlight and shadow */
    ctx.fillStyle = 'rgba(80,65,40,0.35)';
    ctx.fillRect(x1, y - pr, x2 - x1, pr * 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x1, y + pr * 0.5, x2 - x1, pr * 0.5);
    /* fittings only drawn at pipe intersections via tjoint() calls */
  }

  function vpipe(x, y1, y2, pr) {
    ctx.fillStyle = '#222018';
    ctx.fillRect(x - pr, y1, pr * 2, y2 - y1);
    ctx.fillStyle = 'rgba(70,58,35,0.30)';
    ctx.fillRect(x - pr, y1, pr * 0.5, y2 - y1);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + pr * 0.5, y1, pr * 0.5, y2 - y1);
  }

  function tjoint(x, y, hpr, vpr) {
    const r = Math.max(hpr, vpr);
    ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#2e2620'; ctx.fill();
    flange(x, y, r);
  }

  /* one set of pipe runs per window row */
  const uniqueRows = [...new Set(wins.map(w => w.row))];
  uniqueRows.forEach(rowIdx => {
    const rowWins  = wins.filter(w => w.row === rowIdx);
    const rowFirstY = rowWins[0].y;
    const PA = rowFirstY - 55;    /* main run above windows */
    const PB = rowFirstY + WIN_H + 50; /* secondary run below windows */

    if (PA > 0) hpipe(0, W, PA, 9, '#252018');
    hpipe(0, W, PB, 6, '#201c15');

    /* seeded vertical drops between PA and PB */
    const ZONE = 62;
    for (let zx = ZONE * 0.5; zx < W; zx += ZONE) {
      if (ph(zx, rowIdx, 60) > 0.42) continue;
      const bx = zx + ph(zx, rowIdx, 61) * ZONE * 0.6 - ZONE * 0.3 + ZONE * 0.5;
      let skip = false;
      rowWins.forEach(w => { if (bx > w.x - 18 && bx < w.x + w.w + 18) skip = true; });
      if (skip || bx < 12 || bx > W - 12) continue;

      const topY = PA > 0 ? PA : 0;
      vpipe(bx, topY, PB, 5);
      if (PA > 0) tjoint(bx, PA, 9, 5);
      tjoint(bx, PB, 6, 5);

      const midY = (PA + PB) / 2 + (ph(zx, rowIdx, 62) - 0.5) * 80;
      if (ph(zx, rowIdx, 63) < 0.45)      valve(bx, midY, 5);
      else if (ph(zx, rowIdx, 64) < 0.60) gauge(bx, midY, 5);
    }
  });

  /* thin edge pipes along top and bottom of canvas */
  const topY = 18, botY = H - 22;
  let lx = 0;
  while (lx < W) {
    const seg = ph(lx, topY, 71) * 120 + 60;
    hpipe(lx, lx + seg, topY, 4, '#1e1a12');
    lx += seg + ph(lx, topY, 72) * 30 + 20;
  }
  lx = 0;
  while (lx < W) {
    const seg = ph(lx, botY, 81) * 90 + 50;
    hpipe(lx, lx + seg, botY, 4, '#1e1a12');
    lx += seg + ph(lx, botY, 82) * 40 + 15;
  }
}

/* debounced resize — redraws brick wall to fit new viewport */
let _brickResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_brickResizeTimer);
  _brickResizeTimer = setTimeout(initBrickWall, 160);
});

/* ============================================================
   GLITCH LAYER — masks the video loop seam
   Canvas at z-index 1 (between video and brick wall).
   Detects the video loop reset and plays a brief glitch burst.
   ============================================================ */
function initGlitchLayer() {
  const video = document.getElementById('bg-video');
  const cv    = document.getElementById('glitchCanvas');
  if (!video || !cv) return;

  const ctx = cv.getContext('2d');

  function resize() {
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let glitching = false;
  let glitchStart = 0;
  let glitchRaf   = null;
  let triggered   = false;
  let lastT       = 0;

  const GLITCH_MS = 480;

  function startGlitch() {
    if (glitching) return;
    glitching  = true;
    glitchStart = performance.now();
    if (glitchRaf) cancelAnimationFrame(glitchRaf);
    runGlitch();
  }

  function runGlitch(ts) {
    if (!ts) ts = performance.now();
    const elapsed  = ts - glitchStart;
    const progress = Math.min(elapsed / GLITCH_MS, 1);

    ctx.clearRect(0, 0, cv.width, cv.height);
    const W = cv.width, H = cv.height;
    const intensity = Math.sin(progress * Math.PI); /* bell curve, peaks at middle */

    /* scanline tears */
    const tears = Math.floor(2 + intensity * 7);
    for (let i = 0; i < tears; i++) {
      if (Math.random() > 0.5) continue;
      const ty  = Math.random() * H;
      const th  = Math.random() * H * 0.06 + 3;
      const off = (Math.random() - 0.5) * 55 * intensity;
      ctx.fillStyle = `rgba(${Math.floor(Math.random()*50)},${Math.floor(Math.random()*15)},0,${0.28 + Math.random()*0.35*intensity})`;
      ctx.fillRect(off, ty, W, th);
    }

    /* RGB fringe */
    if (Math.random() < 0.35 * intensity) {
      ctx.fillStyle = `rgba(255,0,0,${0.04 * intensity})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (Math.random() < 0.25 * intensity) {
      ctx.fillStyle = `rgba(0,180,255,${0.03 * intensity})`;
      ctx.fillRect(4, 0, W, H);
    }

    /* dark crush bands */
    if (Math.random() < 0.45 * intensity) {
      const by = Math.random() * H;
      ctx.fillStyle = `rgba(0,0,0,${0.55 * intensity})`;
      ctx.fillRect(0, by, W, Math.random() * 28 + 4);
    }

    /* brief white flash at the seam moment */
    if (progress < 0.18 && Math.random() < 0.12) {
      ctx.fillStyle = `rgba(255,255,255,${0.10 * (1 - progress / 0.18)})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (progress < 1) {
      glitchRaf = requestAnimationFrame(runGlitch);
    } else {
      ctx.clearRect(0, 0, W, H);
      glitching = false;
    }
  }

  /* detect loop seam: trigger when near end, reset when back at start */
  video.addEventListener('timeupdate', () => {
    const cur = video.currentTime;
    const dur = video.duration || 10;
    if (!triggered && cur > dur - 0.45) {
      triggered = true;
      startGlitch();
    }
    if (cur < 0.4) triggered = false;
    lastT = cur;
  });
}

/* ============================================================
   WORKSHOP TITLE — animated mechanical canvas
   One contiguous brass chain runs right→left through all 12
   node gears plus S gears and O1.
   W K H rendered behind chain. R rendered in front.
   ============================================================ */
function initWorkshopTitle() {
  const h1 = document.getElementById('mainTitle');
  if (!h1) return;

  const cv = document.createElement('canvas');
  cv.id = 'titleCanvas';
  cv.style.cssText = 'display:block;width:100%;';
  h1.replaceWith(cv);

  let raf = null;

  function run() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    const W  = (cv.parentElement || document.body).clientWidth || 800;
    const FS = Math.min(Math.round(W * 0.086), 104);
    const CH = Math.round(FS * 2.05);
    cv.width = W; cv.height = CH;
    const ctx = cv.getContext('2d');

    const BR = '#c8860a', BR_L = '#e0a830', BR_D = '#7a4e06';
    const IR = '#2c2218', IR_L = '#483c30', TX = '#f0e4c8';

    ctx.font = `900 ${FS}px Orbitron, monospace`;
    const WORD = 'WORKSHOP', GAP = FS * 0.055;
    const lms = WORD.split('').map(ch => ({ ch, w: ctx.measureText(ch).width }));
    const totW = lms.reduce((s, l) => s + l.w + GAP, -GAP);
    let xc = (W - totW) / 2;
    lms.forEach(l => { l.x = xc; l.cx = xc + l.w / 2; xc += l.w + GAP; });

    const BASELINE = CH * 0.83, CAP_Y = BASELINE - FS * 0.86, SH = BASELINE - CAP_Y;
    const [lW, lO1, lR, lK, lS, lH, lO2, lP] = lms;

    const O_R = FS * 0.40, O_Y = BASELINE - O_R - 1;
    const P_R = FS * 0.26, P_CX = lP.x + lP.w * 0.60, P_Y = CAP_Y + SH * 0.30;
    const S_R = FS * 0.14, SG1Y = CAP_Y + SH * 0.28, SG2Y = CAP_Y + SH * 0.72;
    const P_TEETH = 10, GR = FS * 0.055, GR2 = FS * 0.115;
    const H_BAR_Y = CAP_Y + SH * 0.50, H_LS_X = lH.x + lH.w * 0.09;

    const gs = {
      1:  { x: lW.x - O_R * 4.5,            y: O_Y,                 r: S_R  },
      2:  { x: lW.x - O_R * 2.5,            y: O_Y,                 r: O_R  },
      3:  { x: lW.x + GR * 1.4,             y: CAP_Y + GR * 1.4,    r: GR   },
      4:  { x: lW.x + lW.w * 0.26,          y: BASELINE - GR * 1.2, r: GR   },
      5:  { x: lW.cx,                        y: CAP_Y + SH * 0.32,   r: GR   },
      6:  { x: lW.x + lW.w * 0.74,          y: BASELINE - GR * 1.2, r: GR   },
      7:  { x: lW.x + lW.w - GR * 1.4,      y: CAP_Y + GR * 1.4,    r: GR   },
      8:  { x: lK.x + lK.w * 0.40,          y: CAP_Y + SH * 0.62,   r: GR   },
      9:  { x: lK.x + lK.w * 0.88,          y: BASELINE - GR,        r: GR   },
      10: { x: H_LS_X,                       y: CAP_Y + SH * 0.15,   r: GR   },
      11: { x: H_LS_X,                       y: H_BAR_Y,             r: GR   },
      12: { x: lH.x + lH.w * 0.88,          y: H_BAR_Y,             r: GR   },
    };

    const CR_o1 = O_R + 4, CR_s = S_R + 3, LINK_L = FS * 0.052;

    function arcPts(cx, cy, r, a1, a2, n) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a1 + (a2 - a1) * i / n;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      return pts;
    }

    function pLen(pts) {
      let l = 0;
      for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
      return l;
    }

    function ptAt(pts, d) {
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const seg = Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y);
        if (acc + seg >= d) {
          const t = (d - acc) / seg;
          return { x: pts[i-1].x+(pts[i].x-pts[i-1].x)*t, y: pts[i-1].y+(pts[i].y-pts[i-1].y)*t,
                   a: Math.atan2(pts[i].y-pts[i-1].y, pts[i].x-pts[i-1].x) };
        }
        acc += seg;
      }
      const n2 = pts.length-1;
      return { ...pts[n2], a: Math.atan2(pts[n2].y-pts[n2-1].y, pts[n2].x-pts[n2-1].x) };
    }

    function drawChain(pts, phase, linkL, bright) {
      const total = pLen(pts); if (total < 1) return;
      const PITCH = linkL * 2.5;
      const offset = ((phase * PITCH) % PITCH + PITCH) % PITCH;
      for (let d = offset; d < total - linkL * 0.4; d += PITCH) {
        const p = ptAt(pts, d);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        const hw = linkL*0.52, hh = linkL*0.28;
        ctx.fillStyle = bright ? BR_D : IR;
        ctx.fillRect(-hw-1,-hh-1,hw*2+2,hh*2+2);
        ctx.fillStyle = bright ? BR : IR_L;
        ctx.fillRect(-hw,-hh,hw*2,hh*2);
        const pinR = hh*0.32;
        ctx.fillStyle = bright ? BR_D : IR;
        ctx.beginPath(); ctx.arc(-hw+hh,0,pinR,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(hw-hh,0,pinR,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    function gearBase(cx, cy, R, teeth, ang, sharp, col, rimCol) {
      const iR = sharp ? R*0.60 : R*0.72, hR = R*0.26;
      if (sharp) {
        /* flat-top teeth */
        const tw = (Math.PI/teeth)*0.60;
        ctx.beginPath();
        for (let i = 0; i < teeth; i++) {
          const a=(i/teeth)*Math.PI*2+ang, a1=a-tw, a2=a+tw;
          if(i===0) ctx.moveTo(cx+Math.cos(a1)*iR, cy+Math.sin(a1)*iR);
          else ctx.lineTo(cx+Math.cos(a1)*iR, cy+Math.sin(a1)*iR);
          ctx.lineTo(cx+Math.cos(a1)*R, cy+Math.sin(a1)*R);
          ctx.arc(cx,cy,R,a1,a2);
          ctx.lineTo(cx+Math.cos(a2)*iR, cy+Math.sin(a2)*iR);
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i < teeth*2; i++) {
          const a=(i/(teeth*2))*Math.PI*2+ang, r=i%2===0?R:iR;
          i===0 ? ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)
                : ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
        }
      }
      ctx.closePath(); ctx.fillStyle=col; ctx.fill();
      if (rimCol) { ctx.strokeStyle=rimCol; ctx.lineWidth=1.5; ctx.stroke(); }
      const spokeW = Math.max(1.5, R*0.09);
      ctx.strokeStyle=IR; ctx.lineWidth=spokeW; ctx.lineCap='round';
      const nSpokes = sharp ? 4 : 4;
      for (let i=0; i<nSpokes; i++) {
        const a = i*(Math.PI*2/nSpokes) + ang + (sharp ? Math.PI*0.12 : 0);
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*hR*1.1, cy+Math.sin(a)*hR*1.1);
        ctx.lineTo(cx+Math.cos(a)*iR*0.80, cy+Math.sin(a)*iR*0.80);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx,cy,hR,0,Math.PI*2); ctx.fillStyle=IR; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,hR*0.42,0,Math.PI*2); ctx.fillStyle=IR_L; ctx.fill();
    }

    const gearStd  = (cx,cy,R,t,a,c,r)  => gearBase(cx,cy,R,t,a,false,c,r);
    const gearFlat = (cx,cy,R,t,a,c,r)  => gearBase(cx,cy,R,t,a,true ,c,r);

    function gearRing(cx, cy, R, teeth, ang, col, rimCol) {
      const iR=R*0.70, hR=R*0.44;
      ctx.beginPath();
      for (let i=0; i<teeth*2; i++) {
        const a=(i/(teeth*2))*Math.PI*2+ang, r=i%2===0?R:iR;
        i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)
             :ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fillStyle=col; ctx.fill();
      if(rimCol){ctx.strokeStyle=rimCol;ctx.lineWidth=1.5;ctx.stroke();}
      ctx.strokeStyle=IR; ctx.lineWidth=Math.max(4,R*0.16); ctx.lineCap='round';
      for (let i=0;i<3;i++){
        const a=(i/3)*Math.PI*2+ang;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*hR*1.06,cy+Math.sin(a)*hR*1.06);
        ctx.lineTo(cx+Math.cos(a)*iR*0.80,cy+Math.sin(a)*iR*0.80);
        ctx.stroke();
      }
      ctx.beginPath();ctx.arc(cx,cy,hR,0,Math.PI*2);ctx.fillStyle=IR;ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,hR*0.52,0,Math.PI*2);ctx.fillStyle=IR_L;ctx.fill();
    }

    function gearPointed(cx, cy, R, teeth, ang, col, rimCol) {
      const iR=R*0.60, hR=R*0.28;
      ctx.beginPath();
      for (let i=0;i<teeth*2;i++){
        const a=(i/(teeth*2))*Math.PI*2+ang, r=i%2===0?R:iR;
        i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)
             :ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fillStyle=col; ctx.fill();
      if(rimCol){ctx.strokeStyle=rimCol;ctx.lineWidth=1.2;ctx.stroke();}
      ctx.strokeStyle=IR; ctx.lineWidth=Math.max(2,R*0.09); ctx.lineCap='round';
      for (let i=0;i<4;i++){
        const a=i*Math.PI*0.5+ang;
        ctx.beginPath();
        ctx.moveTo(cx+Math.cos(a)*hR*1.1,cy+Math.sin(a)*hR*1.1);
        ctx.lineTo(cx+Math.cos(a)*iR*0.80,cy+Math.sin(a)*iR*0.80);
        ctx.stroke();
      }
      ctx.beginPath();ctx.arc(cx,cy,hR,0,Math.PI*2);ctx.fillStyle=IR;ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,hR*0.40,0,Math.PI*2);ctx.fillStyle=IR_L;ctx.fill();
    }

    /* main chain path: O2 exit → 12→11→10→S→9→8→O1→7→6→5→4→3→2→1 */
    function buildMainChain() {
      const pts = [], cn = GR+2, c2 = O_R+3;

      /* right screen edge → P bowl → O2 (integrates the old separate chain) */
      pts.push({x: W, y: P_Y});
      pts.push({x: P_CX + P_R + 2, y: P_Y});
      /* arc P: 3 o'clock → 10 o'clock CCW (over top, continuing to upper-left) */
      pts.push(...arcPts(P_CX, P_Y, P_R+2, 0, -5*Math.PI/6, 12));
      /* straight from P's 10 o'clock to O2's 2 o'clock */
      pts.push({x: lO2.cx + (O_R+2)*Math.cos(-Math.PI/6), y: O_Y + (O_R+2)*Math.sin(-Math.PI/6)});
      /* arc OVER O2: 2 o'clock → top → 9 o'clock CCW */
      pts.push(...arcPts(lO2.cx, O_Y, O_R+2, -Math.PI/6, -Math.PI, 10));

      /* → gear 12 (right end H crossbar) — arc CCW over top */
      pts.push({x: gs[12].x+cn, y: gs[12].y});
      pts.push(...arcPts(gs[12].x, gs[12].y, cn, 0, -Math.PI, 8));

      /* → gear 11 (left end H crossbar) — arc CW right→bottom→left; exit tangent = up */
      pts.push({x: gs[11].x+cn, y: gs[11].y});
      pts.push(...arcPts(gs[11].x, gs[11].y, cn, 0, Math.PI, 8));

      /* → gear 10 (top H left vertical) — arrives from below; arc CCW OVER top → exit left */
      pts.push({x: gs[10].x, y: gs[10].y+cn});
      pts.push(...arcPts(gs[10].x, gs[10].y, cn, Math.PI*0.5, -Math.PI, 10));

      /* → SG1 (top of S) — arc CCW over top = upper S curve */
      pts.push({x: lS.cx+CR_s, y: SG1Y});
      pts.push(...arcPts(lS.cx, SG1Y, CR_s, 0, -Math.PI, 14));

      /* crossing SG1→SG2 */
      pts.push({x: lS.cx+CR_s, y: SG2Y});

      /* SG2 lower arc CW, exit at 6 o'clock (bottom) */
      pts.push(...arcPts(lS.cx, SG2Y, CR_s, 0, Math.PI*0.5, 7));
      pts.push({x: lS.cx, y: SG2Y + CR_s});

      /* → gear 9 (bottom K lower-right diagonal) — chain UNDER */
      pts.push({x: gs[9].x+cn, y: gs[9].y});
      pts.push(...arcPts(gs[9].x, gs[9].y, cn, 0, Math.PI, 8));

      /* → gear 8 (K centre) — up diagonal; arc CCW over top */
      pts.push({x: gs[8].x+cn, y: gs[8].y});
      pts.push(...arcPts(gs[8].x, gs[8].y, cn, 0, -Math.PI, 8));

      /* → O1 right side (behind R) */
      pts.push({x: lO1.cx+CR_o1, y: O_Y});

      /* O1: 3 o'clock → 12 o'clock CCW (upper-right quarter) */
      pts.push(...arcPts(lO1.cx, O_Y, CR_o1, 0, -Math.PI*0.5, 12));

      /* W section: OVER 7 → UNDER 6 → OVER 5 → UNDER 4 → OVER 3 */
      /* → gear 7 (top-right W) — OVER top */
      pts.push({x: gs[7].x+cn, y: gs[7].y});
      pts.push(...arcPts(gs[7].x, gs[7].y, cn, 0, -Math.PI, 8));

      /* → gear 6 (bottom-right valley W) — UNDER bottom */
      pts.push({x: gs[6].x+cn, y: gs[6].y});
      pts.push(...arcPts(gs[6].x, gs[6].y, cn, 0, Math.PI, 8));

      /* → gear 5 (middle peak W) — OVER top */
      pts.push({x: gs[5].x+cn, y: gs[5].y});
      pts.push(...arcPts(gs[5].x, gs[5].y, cn, 0, -Math.PI, 8));

      /* → gear 4 (bottom-left valley W) — UNDER bottom */
      pts.push({x: gs[4].x+cn, y: gs[4].y});
      pts.push(...arcPts(gs[4].x, gs[4].y, cn, 0, Math.PI, 8));

      /* → gear 3 (top-left W) — OVER top */
      pts.push({x: gs[3].x+cn, y: gs[3].y});
      pts.push(...arcPts(gs[3].x, gs[3].y, cn, 0, -Math.PI, 8));

      /* → gear 2: approach at 2 o'clock (-π/6), arc CCW over top to 9 o'clock */
      pts.push({x: gs[2].x + c2*0.866, y: gs[2].y - c2*0.5});
      pts.push(...arcPts(gs[2].x, gs[2].y, c2, -Math.PI/6, -Math.PI, 10));
      const cn1 = gs[1].r + 2;
      pts.push({x: gs[1].x + cn1, y: gs[1].y});
      pts.push(...arcPts(gs[1].x, gs[1].y, cn1, 0, -Math.PI, 8));
      pts.push({x: 0, y: gs[1].y});

      return pts;
    }

    const mainChainPts = buildMainChain();

    function frame(ts) {
      ctx.clearRect(0, 0, W, CH);
      const t = ts*0.001, ω = 0.34;
      const o1A = -t*ω, o2A = -t*ω, pA = -t*ω*(O_R/P_R);
      const sA1 = -t*ω*(O_R/S_R), sA2 =  t*ω*(O_R/S_R);
      /* chain phase: 0.4× factor syncs link-rate to O1's 8-tooth pitch */
      const mPh = (t * O_R * ω * 0.4) % LINK_L;

      /* ── 1. W K H text behind chain ── */
      ctx.font=`900 ${FS}px Orbitron, monospace`;
      ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle=TX;
      ctx.shadowColor='rgba(200,136,10,0.38)'; ctx.shadowBlur=FS*0.10;
      ctx.fillText('W',lW.x,BASELINE);
      ctx.fillText('K',lK.x,BASELINE);
      ctx.fillText('H',lH.x,BASELINE);
      ctx.shadowBlur=0;

      /* ── 2. main chain ── */
      drawChain(mainChainPts, mPh, LINK_L, true);

      /* ── 4. node gears 1-12: sign lookup encodes correct chain-direction spin ── */
      const SIGNS = {1:-1,2:-1,3:-1,4:1,5:-1,6:1,7:-1,8:-1,9:1,10:-1,11:1,12:-1};
      [1,2,3,4,5,6,7,8,9,10,11,12].forEach(n => {
        const g = gs[n];
        const ang = SIGNS[n] * t * ω * (O_R / g.r);
        gearStd(g.x, g.y, g.r, 8, ang, BR, BR_D);
      });

      /* ── 5. S gears ── */
      gearStd(lS.cx, SG1Y, S_R, 8, sA1, BR, BR_D);
      gearStd(lS.cx, SG2Y, S_R, 8, sA2, BR, BR_D);

      /* ── 6. O1 gearFlat ── */
      gearFlat(lO1.cx, O_Y, O_R, 8, o1A, BR, BR_D);

      /* ── 7. coupling rod O1→gear 2 (both pins rotate, counter-phase for pump effect) ── */
      const rodX1 = lO1.cx + Math.cos(o1A)*O_R*0.70;
      const rodY1 = O_Y    + Math.sin(o1A)*O_R*0.70;
      const g2Ang = -o1A; /* opposite direction → pump action */
      const rodX2 = gs[2].x + Math.cos(g2Ang)*O_R*0.70;
      const rodY2 = gs[2].y + Math.sin(g2Ang)*O_R*0.70;
      ctx.strokeStyle=BR_D; ctx.lineWidth=FS*0.028; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(rodX1,rodY1); ctx.lineTo(rodX2,rodY2); ctx.stroke();
      ctx.strokeStyle=BR; ctx.lineWidth=FS*0.012;
      ctx.beginPath(); ctx.moveTo(rodX1,rodY1); ctx.lineTo(rodX2,rodY2); ctx.stroke();
      ctx.beginPath(); ctx.arc(rodX1,rodY1,FS*0.018,0,Math.PI*2);
      ctx.fillStyle=BR_L; ctx.fill();
      ctx.beginPath(); ctx.arc(rodX2,rodY2,FS*0.018,0,Math.PI*2);
      ctx.fillStyle=BR_L; ctx.fill();

      /* ── 8. O2 gearRing ── */
      gearRing(lO2.cx, O_Y, O_R, 12, o2A, BR, BR_D);

      /* ── 9. P stem + bowl + pawl ── */
      const stW = FS*0.115;
      ctx.fillStyle=TX;
      ctx.shadowColor='rgba(200,136,10,0.3)'; ctx.shadowBlur=FS*0.08;
      ctx.fillRect(lP.x, CAP_Y, stW, BASELINE-CAP_Y);
      ctx.shadowBlur=0;
      ctx.fillStyle=TX;
      ctx.fillRect(lP.x+stW, P_Y-stW*0.5, P_CX-P_R*0.7-(lP.x+stW), stW);
      gearPointed(P_CX, P_Y, P_R, P_TEETH, pA, IR_L, BR_D);
      const pawCycle=(Math.PI*2)/P_TEETH;
      const pawPhase=(((pA%pawCycle)+pawCycle)%pawCycle)/pawCycle;
      const pawAng=pawPhase<0.72?(pawPhase/0.72)*0.30:0.30*(1-(pawPhase-0.72)/0.28);
      ctx.save(); ctx.translate(lP.x+stW, P_Y); ctx.rotate(-pawAng);
      ctx.fillStyle=IR_L; ctx.strokeStyle=BR; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(0,-FS*0.038); ctx.lineTo(P_R*0.50,-FS*0.018);
      ctx.lineTo(P_R*0.48,FS*0.048); ctx.lineTo(0,FS*0.038);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();

      /* ── 10. R text in front ── */
      ctx.font=`900 ${FS}px Orbitron, monospace`;
      ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle=TX;
      ctx.shadowColor='rgba(200,136,10,0.38)'; ctx.shadowBlur=FS*0.10;
      ctx.fillText('R', lR.x, BASELINE);
      ctx.shadowBlur=0;

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
  }

  document.fonts.ready.then(run);

  let _titleResizeT;
  window.addEventListener('resize', () => {
    clearTimeout(_titleResizeT);
    _titleResizeT = setTimeout(() => { if (raf) cancelAnimationFrame(raf); run(); }, 160);
  });
}


function initCardScrambles() {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefΔΨΩλφ∞≠±0123456789!@#$%^&*';
  const CHAOS  = ['#c724ff','#39ff6e','#ff2d6f','#00ffe7','#ffe847','#ff9a45'];
  const rc = () => CHARS[Math.floor(Math.random()*CHARS.length)];
  const rk = () => CHAOS[Math.floor(Math.random()*CHAOS.length)];

  function measureWidths(text, refEl) {
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;
      font-family:'Orbitron',sans-serif;
      font-size:${getComputedStyle(refEl).fontSize};
      font-weight:700;letter-spacing:0.06em;`;
    document.body.appendChild(probe);
    const widths = [];
    for (const ch of text) { probe.textContent=ch; widths.push(probe.getBoundingClientRect().width); }
    document.body.removeChild(probe);
    return widths;
  }

  function initKnown(card) {
    const realTitle = card.dataset.title || '';
    const nameEl    = card.querySelector('.portal-name');
    const inner     = nameEl.querySelector('.name-inner');

    document.fonts.ready.then(() => {
      const widths = measureWidths(realTitle, nameEl);
      const spans  = [];

      realTitle.split('').forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'sc';
        s.style.width   = widths[i] + 'px';
        s.style.display = 'inline-block';
        s.style.textAlign = 'center';
        s.style.color   = rk();
        s.textContent   = rc();
        inner.appendChild(s);
        spans.push({ el:s, real:ch, scrambling:true });
      });

      setInterval(() => {
        spans.forEach(s => {
          if (!s.scrambling) return;
          if (Math.random() < 0.15) { s.el.textContent=rc(); s.el.style.color=rk(); }
        });
      }, 80);

      let hovered=false, timers=[];

      card.addEventListener('mouseenter', () => {
        if (hovered) return; hovered=true;
        const order=[];
        let lo=0, hi=spans.length-1;
        while (lo<=hi) {
          if (lo===hi) order.push(lo);
          else { order.push(lo); order.push(hi); }
          lo++; hi--;
        }
        timers = order.map((idx,step) => setTimeout(() => {
          spans[idx].scrambling=false;
          spans[idx].el.textContent=spans[idx].real;
          spans[idx].el.style.color='';
        }, (step/order.length)*1200));
      });

      card.addEventListener('mouseleave', () => {
        hovered=false;
        timers.forEach(id => clearTimeout(id)); timers=[];
        spans.forEach(s => { s.scrambling=true; });
        const shuffled = [...Array(spans.length).keys()].sort(()=>Math.random()-0.5);
        shuffled.forEach((idx,step) => {
          setTimeout(() => {
            spans[idx].el.textContent=rc();
            spans[idx].el.style.color=rk();
          }, (step/spans.length)*500);
        });
      });
    });
  }

  function initUnknown(card) {
    const nameEl = card.querySelector('.portal-name');
    const inner  = nameEl.querySelector('.name-inner');
    document.fonts.ready.then(() => {
      const probe = document.createElement('span');
      probe.style.cssText = `position:absolute;visibility:hidden;
        font-family:'Orbitron',sans-serif;
        font-size:${getComputedStyle(nameEl).fontSize};
        font-weight:700;letter-spacing:0.06em;`;
      probe.textContent = 'M';
      document.body.appendChild(probe);
      const cw = probe.getBoundingClientRect().width;
      document.body.removeChild(probe);

      const spans = [];
      for (let i=0; i<12; i++) {
        const s = document.createElement('span');
        s.className = 'sc';
        s.style.width   = cw+'px';
        s.style.display = 'inline-block';
        s.style.textAlign = 'center';
        s.style.color   = rk();
        s.textContent   = rc();
        inner.appendChild(s);
        spans.push(s);
      }
      setInterval(() => {
        spans.forEach(s => { if(Math.random()<0.18){s.textContent=rc();s.style.color=rk();} });
      }, 80);
    });
  }

  document.querySelectorAll('.portal').forEach(card => {
    if (card.dataset.unknown==='true') initUnknown(card);
    else initKnown(card);
  });
}

/* ============================================================
   CARD FLICKER — re-enable with renderPortals()
   ============================================================ */
function initCardFlicker() {
  const INTERVAL_MIN = 15000;
  const INTERVAL_MAX = 20000;
  const STAGGER_MAX  = 10000;

  document.querySelectorAll('.portal').forEach(card => {
    const flicker  = card.querySelector('.card-flicker');
    const staticEl = card.querySelector('.card-static');
    function scheduleNext() {
      const delay = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);
      setTimeout(() => {
        flicker.classList.remove('firing'); staticEl.classList.remove('firing');
        void flicker.offsetWidth;
        flicker.classList.add('firing'); staticEl.classList.add('firing');
        setTimeout(() => {
          flicker.classList.remove('firing'); staticEl.classList.remove('firing');
          scheduleNext();
        }, 1300);
      }, delay);
    }
    setTimeout(scheduleNext, Math.random() * STAGGER_MAX);
  });
}

/* ============================================================
   STATUS BAR — live clock + drifting dimensional coords
   ============================================================ */
function initStatusBar() {
  const ec = {
    update_interval_ms: 50,
    volatility: 0.18,
    jolt_probability: 0.2,
    jolt_strength: 0.55,
  };

  const timeEl = document.getElementById('liveTime');
  const freqEl = document.getElementById('dimFreq');
  const ridxEl = document.getElementById('realityIdx');
  const entEl  = document.getElementById('entropyVal');

  let freq = 312.847;
  let ridx = 0x1000 + Math.floor(Math.random()*0xEFFF);

  const MEAN = 14.14;
  const SD   = 0.33;

  const d = [
    { pos: MEAN, vel: 0, rev: 0.04, vol: ec.volatility * 0.25, joltP: ec.jolt_probability * 0.25, joltS: ec.jolt_strength * 0.25 },
    { pos: 0,    vel: 0, rev: 0.06, vol: ec.volatility * 0.50, joltP: ec.jolt_probability * 0.50, joltS: ec.jolt_strength * 0.50 },
    { pos: 0,    vel: 0, rev: 0.08, vol: ec.volatility * 0.70, joltP: ec.jolt_probability * 0.70, joltS: ec.jolt_strength * 0.70 },
    { pos: 0,    vel: 0, rev: 0.10, vol: ec.volatility * 1.00, joltP: ec.jolt_probability * 1.00, joltS: ec.jolt_strength * 1.00 },
  ];

  d[1].pos = Math.random() * 9;
  d[2].pos = Math.random() * 9;
  d[3].pos = Math.random() * 9;

  function pad(n, digits=2) { return String(n).padStart(digits,'0'); }

  setInterval(() => {
    d.forEach((layer, i) => {
      layer.vel += (Math.random()-0.5) * layer.vol;
      if (Math.random() < layer.joltP) layer.vel += (Math.random()-0.5) * layer.joltS;
      layer.vel *= 0.78;

      if (i === 0) {
        const pull = (MEAN - layer.pos) * layer.rev;
        layer.vel += pull;
        layer.pos += layer.vel;
        if (layer.pos < MEAN - SD*3) layer.vel += 0.08;
        if (layer.pos > MEAN + SD*3) layer.vel -= 0.08;
      } else {
        layer.pos += layer.vel;
        if (layer.pos > 9)  { layer.pos = 9  - (layer.pos - 9);  layer.vel *= -0.6; }
        if (layer.pos < 0)  { layer.pos = -layer.pos;             layer.vel *= -0.6; }
      }
    });

    const intAndTenth  = d[0].pos;
    const intPart      = Math.floor(Math.abs(intAndTenth));
    const sign         = intAndTenth < 0 ? '-' : '';
    const d1digit      = Math.floor((Math.abs(intAndTenth) - intPart) * 10) % 10;
    const d2digit      = Math.floor(Math.abs(d[1].pos)) % 10;
    const d3digit      = Math.floor(Math.abs(d[2].pos)) % 10;
    const d4digit      = Math.floor(Math.abs(d[3].pos)) % 10;

    entEl.textContent = `FORGE-TEMP: ${sign}${intPart}.${d1digit}${d2digit}${d3digit}${d4digit} \u00b0C`;
  }, ec.update_interval_ms);

  function tick() {
    const now = new Date();
    timeEl.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
    freq += (Math.random()-0.499)*0.004;
    if (Math.random()<0.015) ridx=(ridx+Math.floor(Math.random()*3-1))&0xFFFF;
    freqEl.textContent = `BOILER-PSI: ${freq.toFixed(3)} bar`;
    ridxEl.textContent = `MANIFEST-NO: #${ridx.toString(16).toUpperCase().padStart(4,'0')}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   UTILITY
   ============================================================ */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* ============================================================
   GO
   ============================================================ */
document.addEventListener('DOMContentLoaded', boot);
