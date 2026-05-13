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

const CHAOS_COLS = [
  [199,36,255], [57,255,110], [255,45,110],
  [0,255,231],  [255,232,71], [255,154,69],
];

/* ── GLOBALS — populated after JSON load ── */
let CFG   = {};   /* effects-config.json */
let SITE  = {};   /* site-config.json    */
let PORTALS = []; /* portals.json        */

/* ============================================================
   BOOT — fetch all three JSON files then render
   ============================================================ */
async function boot() {
  try {
    const [portalsRes, effectsRes, siteRes] = await Promise.all([
      fetch('content/portals.json'),
      fetch('content/effects-config.json'),
      fetch('content/site-config.json'),
    ]);
    const portalsData = await portalsRes.json();
    PORTALS = Array.isArray(portalsData) ? portalsData : (portalsData.portals || []);
    CFG     = await effectsRes.json();
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

  initBackground();
  initTitleSpans();
  initCardScrambles();
  initCardFlicker();
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
   PORTAL CARDS
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
  /* resolve accent color */
  const colors = resolveAccent(p);
  const isUnknown = p.state === 'unknown';
  const isCycle   = p.accent_color_mode === 'cycle';
  const hasUrl    = p.url && p.url.trim() !== '';

  /* wrapper — <a> if has url and resolvable, <div> otherwise */
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

  /* apply accent CSS vars unless cycling (cycling handled by CSS animation) */
  if (!isCycle) {
    el.style.setProperty('--card-accent', colors.accent);
    el.style.setProperty('--card-glow',   colors.glow);
  }

  /* stagger fade-in */
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
  /* cycle — CSS handles it, return fallback for non-color uses */
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
  /* convert #rrggbb to rgba with 0.22 alpha for glow */
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
  const link = document.getElementById('hudGithub');
  link.href        = hud.github_url;
  link.textContent = hud.github_label;
}

/* ============================================================
   PAGE FOOTER
   ============================================================ */
function renderFooter() {
  document.getElementById('footerCredit').textContent = SITE.footer.credit_text;
}

/* ============================================================
   BACKGROUND: PARALLAX STARS + NEBULAE + SCANLINES + PINGS
   ============================================================ */
function initBackground() {
  const sc = CFG.stars;
  const sl = CFG.scanlines;

  const layerDefs = [
    { id: 'layer0', count: sc.layer_far_count,  speed: sc.layer_far_parallax,  rMax: 0.9, aMax: 0.4 },
    { id: 'layer1', count: sc.layer_mid_count,  speed: sc.layer_mid_parallax,  rMax: 1.2, aMax: 0.6 },
    { id: 'layer2', count: sc.layer_near_count, speed: sc.layer_near_parallax, rMax: 1.8, aMax: 0.8 },
  ];

  const layers = layerDefs.map(d => ({
    ...d,
    canvas: document.getElementById(d.id),
    ctx: document.getElementById(d.id).getContext('2d'),
    stars: [],
  }));

  const fx    = document.getElementById('fxCanvas');
  const fxCtx = fx.getContext('2d');

  let W, H, scrollY = 0;

  const NEBULAE = [
    { fx:0.15, fy:0.25, frx:0.55, fry:0.45, c:'rgba(30,80,200,',  a:0.50 },
    { fx:0.82, fy:0.65, frx:0.50, fry:0.42, c:'rgba(80,0,160,',   a:0.46 },
    { fx:0.50, fy:0.08, frx:0.38, fry:0.28, c:'rgba(0,140,100,',  a:0.24 },
    { fx:0.88, fy:0.12, frx:0.22, fry:0.18, c:'rgba(180,50,0,',   a:0.18 },
    { fx:0.05, fy:0.78, frx:0.28, fry:0.22, c:'rgba(160,0,140,',  a:0.16 },
  ];

  /* scanline state */
  const hScan = { pos:-2, speed:0, next:0 };
  const vScan = { pos:-2, speed:0, next:0 };

  function newH(t) {
    const rev = Math.random() < sl.reverse_probability;
    hScan.speed = (H / (sl.h_speed_min_ms + Math.random()*(sl.h_speed_max_ms - sl.h_speed_min_ms))) * (rev?-1:1);
    hScan.pos   = rev ? H+2 : -2;
    hScan.next  = t + sl.h_speed_min_ms + Math.random()*(sl.h_speed_max_ms - sl.h_speed_min_ms);
  }
  function newV(t) {
    const rev = Math.random() < sl.reverse_probability;
    vScan.speed = (W / (sl.v_speed_min_ms + Math.random()*(sl.v_speed_max_ms - sl.v_speed_min_ms))) * (rev?-1:1);
    vScan.pos   = rev ? W+2 : -2;
    vScan.next  = t + sl.v_speed_min_ms + Math.random()*(sl.v_speed_max_ms - sl.v_speed_min_ms);
  }

  /* pings */
  const pc   = CFG.pings;
  const pings = [];

  function tryPing(x, y, now) {
    if (Math.random() > pc.probability_per_frame * 125) return;
    if (pings.length >= pc.max_simultaneous) return;
    const col = CHAOS_COLS[Math.floor(Math.random()*CHAOS_COLS.length)];
    /* 33% chance each scanline gets a new speed/direction from current position */
    if (Math.random() < 0.33) {
      const rev = Math.random() < sl.reverse_probability;
      hScan.speed = (H / (sl.h_speed_min_ms + Math.random()*(sl.h_speed_max_ms - sl.h_speed_min_ms))) * (rev?-1:1);
      hScan.next  = now + sl.h_speed_min_ms + Math.random()*(sl.h_speed_max_ms - sl.h_speed_min_ms);
    }
    if (Math.random() < 0.33) {
      const rev = Math.random() < sl.reverse_probability;
      vScan.speed = (W / (sl.v_speed_min_ms + Math.random()*(sl.v_speed_max_ms - sl.v_speed_min_ms))) * (rev?-1:1);
      vScan.next  = now + sl.v_speed_min_ms + Math.random()*(sl.v_speed_max_ms - sl.v_speed_min_ms);
    }
    pings.push({
      x, y, born:now,
      life: pc.lifetime_min_ms + Math.random()*(pc.lifetime_max_ms - pc.lifetime_min_ms),
      col,
      startAngle: Math.random() * Math.PI * 2,
      spinDir: Math.random() < 0.5 ? 1 : -1,   /* 50/50 CW vs CCW */
      failed: Math.random() < 0.15,              /* 15% chance of failed lock */
      failAt: 0.35 + Math.random() * 0.3,        /* fail triggers between 35-65% through lifetime */
    });
  }

  function drawPings(now) {
    for (let i = pings.length-1; i >= 0; i--) {
      const p   = pings[i];
      const age = (now - p.born) / p.life;
      if (age >= 1) { pings.splice(i,1); continue; }
      const [r,g,b] = p.col;

      /* ── FAILED LOCK: reverse and unwind after failAt point ── */
      let effectiveAge = age;
      let failed = false;
      if (p.failed && age >= p.failAt) {
        failed = true;
        const failProgress = (age - p.failAt) / (1 - p.failAt);
        effectiveAge = p.failAt * (1 - failProgress);
        /* once fully unwound, kill the ping */
        if (failProgress >= 1) { pings.splice(i,1); continue; }
      }

      const al = failed
        ? (1 - (age - p.failAt) / (1 - p.failAt)) * 0.6   /* fade faster on failure */
        : 1 - age;

      /* outer ring — expands normally until fail, then contracts */
      const rr = failed
        ? effectiveAge * pc.size_px
        : age * pc.size_px;

      fxCtx.beginPath(); fxCtx.arc(p.x,p.y,rr,0,Math.PI*2);
      fxCtx.strokeStyle=`rgba(${r},${g},${b},${al*0.55})`; fxCtx.lineWidth=1.5; fxCtx.stroke();

      if (effectiveAge < 0.5) {
        fxCtx.beginPath(); fxCtx.arc(p.x,p.y,rr*0.35,0,Math.PI*2);
        fxCtx.strokeStyle=`rgba(${r},${g},${b},${al*0.25})`; fxCtx.lineWidth=1; fxCtx.stroke();
      }

      /* crosshair arms — use effectiveAge so they unwind on failure */
      const closeEase  = 1 - Math.pow(1 - effectiveAge, 2.5);
      const armStart   = pc.size_px * 0.55 * (1 - closeEase * 0.75);
      const armEnd     = pc.size_px * 0.08 + (pc.size_px * 0.04) * (1 - closeEase);
      /* on failure, spin reverses direction */
      const spinMult   = failed ? -p.spinDir : p.spinDir;
      const rotation   = p.startAngle + spinMult * effectiveAge * Math.PI * 0.75;

      fxCtx.save();
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(rotation);
      fxCtx.strokeStyle=`rgba(${r},${g},${b},${al*0.95})`; fxCtx.lineWidth=1.5;
      for (let a = 0; a < 4; a++) {
        fxCtx.rotate(Math.PI / 2);
        fxCtx.beginPath();
        fxCtx.moveTo(0, armEnd);
        fxCtx.lineTo(0, armStart);
        fxCtx.stroke();
      }
      fxCtx.restore();

      /* center lock flash — suppressed on failed locks */
      const lockProgress = closeEase;
      if (!failed && lockProgress > 0.3) {
        const flashAlpha = (lockProgress - 0.3) / 0.7 * al;
        fxCtx.beginPath(); fxCtx.arc(p.x,p.y,2.5,0,Math.PI*2);
        fxCtx.fillStyle=`rgba(${r},${g},${b},${flashAlpha})`;
        fxCtx.fill();
        if (lockProgress > 0.6) {
          const glowR = armEnd * 1.8;
          fxCtx.beginPath(); fxCtx.arc(p.x,p.y,glowR,0,Math.PI*2);
          fxCtx.strokeStyle=`rgba(${r},${g},${b},${(lockProgress-0.6)/0.4 * al * 0.6})`;
          fxCtx.lineWidth=1; fxCtx.stroke();
        }
      }
    }
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    layers.forEach(l => { l.canvas.width=W; l.canvas.height=H; });
    fx.width=W; fx.height=H;
  }

  function initStars(l) {
    l.stars = [];
    for (let i=0; i<l.count; i++) {
      l.stars.push({
        x:    Math.random()*W,
        y:    Math.random()*H,
        r:    Math.random()*l.rMax + 0.2,
        base: Math.random()*l.aMax + 0.1,
        sp:   Math.random()*0.01 + 0.002,
        ph:   Math.random()*Math.PI*2,
        dr:   (Math.random()-0.5)*0.02*l.speed,
        hue:  Math.random() < sc.chaos_color_probability
              ? `rgb(${CHAOS_COLS[Math.floor(Math.random()*CHAOS_COLS.length)].join(',')})` : null,
      });
    }
  }

  function drawLayer(l, t) {
    const offsetY = -(scrollY * l.speed) % H;
    l.ctx.clearRect(0,0,W,H);
    l.ctx.save();
    l.ctx.translate(0, offsetY);
    l.stars.forEach(s => {
      const tw = Math.sin(t*s.sp*55+s.ph)*0.25+0.75;
      l.ctx.beginPath(); l.ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      l.ctx.fillStyle = s.hue ? s.hue : `rgba(210,232,255,${s.base*tw})`;
      l.ctx.fill();
      if (s.y+offsetY < -10) { l.ctx.beginPath(); l.ctx.arc(s.x,s.y+H,s.r,0,Math.PI*2); l.ctx.fill(); }
      if (s.y+offsetY > H+10){ l.ctx.beginPath(); l.ctx.arc(s.x,s.y-H,s.r,0,Math.PI*2); l.ctx.fill(); }
      s.x += s.dr; if(s.x<0)s.x=W; if(s.x>W)s.x=0;
    });
    l.ctx.restore();
  }

  function drawNebulae() {
    NEBULAE.forEach(n => {
      const x=n.fx*W, y=n.fy*H, rx=n.frx*W, ry=n.fry*H, r=Math.max(rx,ry);
      const g=fxCtx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0, n.c+n.a+')'); g.addColorStop(1, n.c+'0)');
      fxCtx.save(); fxCtx.scale(rx/r,ry/r); fxCtx.fillStyle=g; fxCtx.beginPath();
      fxCtx.arc(x/(rx/r),y/(ry/r),r,0,Math.PI*2); fxCtx.fill(); fxCtx.restore();
    });
  }

  document.addEventListener('mousemove', e => {
    fx.style.transform = `translate(${(e.clientX/W-0.5)*10}px,${(e.clientY/H-0.5)*6}px)`;
  });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; });

  let lastT=0, hInit=false, vInit=false;

  function loop(ts) {
    if (!hInit) { newH(ts); hInit=true; }
    if (!vInit) { newV(ts); vInit=true; }
    const dt = ts - lastT; lastT = ts;
    const t  = ts / 1000;

    layers.forEach(l => drawLayer(l, t));

    fxCtx.clearRect(0,0,W,H);
    drawNebulae();

    hScan.pos += hScan.speed * dt;
    vScan.pos += vScan.speed * dt;

    const hVis = hScan.pos>0 && hScan.pos<H;
    const vVis = vScan.pos>0 && vScan.pos<W;
    if (hVis && vVis && Math.random() < pc.probability_per_frame) tryPing(vScan.pos, hScan.pos, ts);

    if (hScan.pos>-2 && hScan.pos<H+2) {
      const hg = fxCtx.createLinearGradient(0,0,W,0);
      hg.addColorStop(0,'transparent'); hg.addColorStop(0.3,'rgba(122,184,224,0.22)');
      hg.addColorStop(0.5,'rgba(199,36,255,0.14)'); hg.addColorStop(0.7,'rgba(122,184,224,0.22)');
      hg.addColorStop(1,'transparent');
      fxCtx.fillStyle=hg; fxCtx.fillRect(0,hScan.pos-0.5,W,1.5);
    }
    if ((hScan.speed>0&&hScan.pos>H)||(hScan.speed<0&&hScan.pos<-2)) newH(ts);

    if (vScan.pos>-2 && vScan.pos<W+2) {
      const vg = fxCtx.createLinearGradient(0,0,0,H);
      vg.addColorStop(0,'transparent'); vg.addColorStop(0.3,'rgba(57,255,110,0.18)');
      vg.addColorStop(0.5,'rgba(0,255,231,0.12)'); vg.addColorStop(0.7,'rgba(57,255,110,0.18)');
      vg.addColorStop(1,'transparent');
      fxCtx.fillStyle=vg; fxCtx.fillRect(vScan.pos-0.5,0,1.5,H);
    }
    if ((vScan.speed>0&&vScan.pos>W)||(vScan.speed<0&&vScan.pos<-2)) newV(ts);

    drawPings(ts);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); layers.forEach(initStars); });
  resize();
  layers.forEach(initStars);
  requestAnimationFrame(loop);
}

/* ============================================================
   TITLE — ARCAEGIUM color chaos spans
   ============================================================ */
function initTitleSpans() {
  const el = document.getElementById('mainTitle');
  'ARCAEGIUM'.split('').forEach(ch => {
    const s = document.createElement('span');
    s.className   = 'tc';
    s.textContent = ch;
    el.appendChild(s);
  });
}

/* ============================================================
   CARD TITLE SCRAMBLE
   ============================================================ */
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
   CARD FLICKER
   ============================================================ */
function initCardFlicker() {
  const fc = CFG.card_flicker;
  document.querySelectorAll('.portal').forEach(card => {
    const flicker  = card.querySelector('.card-flicker');
    const staticEl = card.querySelector('.card-static');
    function scheduleNext() {
      const delay = fc.interval_min_ms + Math.random()*(fc.interval_max_ms - fc.interval_min_ms);
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
    setTimeout(scheduleNext, Math.random() * fc.initial_stagger_max_ms);
  });
}

/* ============================================================
   STATUS BAR — live clock + drifting dimensional coords
   ============================================================ */
function initStatusBar() {
  const ec = CFG.entropy;
  const timeEl = document.getElementById('liveTime');
  const freqEl = document.getElementById('dimFreq');
  const ridxEl = document.getElementById('realityIdx');
  const entEl  = document.getElementById('entropyVal');

  let freq = 312.847;
  let ridx = 0x1000 + Math.floor(Math.random()*0xEFFF);

  /* ── ENTROPY: four independent velocity layers ──
     Mean ~14.14, sd ~0.33 — bell curve, no hard clamp.
     Layer speeds as fractions of base (4th decimal = 100%):
       d1 (tenths)       = 25%
       d2 (hundredths)   = 50%
       d3 (thousandths)  = 70%
       d4 (ten-thousandths) = 100%
     Each layer has its own position and velocity.
     Combined: entropy = d1 + d2/10 + d3/100 + d4/1000
     ... but we track each at its own scale then sum.
  */
  const MEAN = 14.14;
  const SD   = 0.33;

  /* each layer: pos = value at that decimal place scale, vel = velocity */
  /* d1 ranges ~13–15 (integer + tenths), d2–d4 are 0–9 scale */
  const d = [
    { pos: MEAN,  vel: 0, scale: 1,      rev: 0.04, vol: ec.volatility * 0.25, joltP: ec.jolt_probability * 0.25, joltS: ec.jolt_strength * 0.25 },
    { pos: 0,     vel: 0, scale: 0.1,    rev: 0.06, vol: ec.volatility * 0.50, joltP: ec.jolt_probability * 0.50, joltS: ec.jolt_strength * 0.50 },
    { pos: 0,     vel: 0, scale: 0.01,   rev: 0.08, vol: ec.volatility * 0.70, joltP: ec.jolt_probability * 0.70, joltS: ec.jolt_strength * 0.70 },
    { pos: 0,     vel: 0, scale: 0.001,  rev: 0.10, vol: ec.volatility * 1.00, joltP: ec.jolt_probability * 1.00, joltS: ec.jolt_strength * 1.00 },
  ];

  /* initialise d2–d4 to random 0–9 positions */
  d[1].pos = Math.random() * 9;
  d[2].pos = Math.random() * 9;
  d[3].pos = Math.random() * 9;

  function pad(n, d=2) { return String(n).padStart(d,'0'); }

  setInterval(() => {
    /* update each layer independently */
    d.forEach((layer, i) => {
      layer.vel += (Math.random()-0.5) * layer.vol;
      if (Math.random() < layer.joltP) layer.vel += (Math.random()-0.5) * layer.joltS;
      layer.vel *= 0.78; /* friction */

      if (i === 0) {
        /* d1: mean reversion toward MEAN, bell curve via gaussian-like reversion */
        const pull = (MEAN - layer.pos) * layer.rev;
        layer.vel += pull;
        layer.pos += layer.vel;
        /* soft clamp — reversion strengthens dramatically at extremes */
        if (layer.pos < MEAN - SD*3) layer.vel += 0.08;
        if (layer.pos > MEAN + SD*3) layer.vel -= 0.08;
      } else {
        /* d2–d4: free drift 0–9, wrap around */
        layer.pos += layer.vel;
        if (layer.pos > 9)  { layer.pos = 9  - (layer.pos - 9);  layer.vel *= -0.6; }
        if (layer.pos < 0)  { layer.pos = -layer.pos;             layer.vel *= -0.6; }
      }
    });

    /* combine layers into display value */
    const tenths      = Math.abs(d[1].pos);
    const hundredths  = Math.abs(d[2].pos);
    const thousandths = Math.abs(d[3].pos);

    /* build the string manually to show layered decimal speeds */
    const intAndTenth = d[0].pos;
    const intPart     = Math.floor(Math.abs(intAndTenth));
    const sign        = intAndTenth < 0 ? '-' : '';
    const d1digit     = Math.floor((Math.abs(intAndTenth) - intPart) * 10) % 10;
    const d2digit     = Math.floor(tenths)      % 10;
    const d3digit     = Math.floor(hundredths)  % 10;
    const d4digit     = Math.floor(thousandths) % 10;

    entEl.textContent = `ENTROPY: ${sign}${intPart}.${d1digit}${d2digit}${d3digit}${d4digit} %`;
  }, ec.update_interval_ms);

  /* clock + slow-drifting values on 1s interval */
  function tick() {
    const now = new Date();
    timeEl.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`;
    freq += (Math.random()-0.499)*0.004;
    if (Math.random()<0.015) ridx=(ridx+Math.floor(Math.random()*3-1))&0xFFFF;
    freqEl.textContent = `DIM-FREQ: ${freq.toFixed(3)} THz`;
    ridxEl.textContent = `REALITY-IDX: 0x${ridx.toString(16).toUpperCase().padStart(4,'0')}`;
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
