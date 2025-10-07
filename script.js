const htmlEl = document.documentElement;
const glow = document.querySelector('.cursor-glow');
const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');

let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
}

document.addEventListener('pointermove', (e) => {
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
}, { passive: true });

function initCustomCursor() {
  if (!cursorDot || !cursorRing) return;
  let dx = lastPointer.x, dy = lastPointer.y;
  let rx = lastPointer.x, ry = lastPointer.y;

  function loop() {
    dx += (lastPointer.x - dx) * 0.45;
    dy += (lastPointer.y - dy) * 0.45;
    rx += (lastPointer.x - rx) * 0.18;
    ry += (lastPointer.y - ry) * 0.18;

    cursorDot.style.transform = `translate(${dx}px, ${dy}px)`;
    cursorRing.style.transform = `translate(${rx}px, ${ry}px)`;
    if (glow) {
      glow.style.left = `${rx}px`;
      glow.style.top = `${ry}px`;
    }
    requestAnimationFrame(loop);
  }
  cursorDot.style.transform = `translate(${dx}px, ${dy}px)`;
  cursorRing.style.transform = `translate(${rx}px, ${ry}px)`;
  requestAnimationFrame(loop);

  const activate = (on) => cursorRing.classList.toggle('active', on);
  document.addEventListener('pointerdown', () => activate(true));
  document.addEventListener('pointerup', () => activate(false));
  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (t.closest && t.closest('.card, .avatar-wrap, a, button, .clock')) activate(true);
  });
  document.addEventListener('mouseout', (e) => {
    const t = e.target;
    if (t.closest && t.closest('.card, .avatar-wrap, a, button, .clock')) activate(false);
  });
}

function initCanvasSnow() {
  const canvas = document.querySelector('.snow-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height, dpr;
  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const GRAVITY = 2.0;
  const WIND = 1.1;
  const ANGLE_SPEED = 0.03;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const FLAKES = isMobile ? 80 : 160; // reduced for performance
  const flakes = new Array(FLAKES).fill(0).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() < 0.3 ? Math.random() * 3.2 + 2.2 : Math.random() * 2.2 + 1.2, // slightly larger max
    a: Math.random() * Math.PI * 2,
    v: Math.random() * 1.1 + 0.7,
    drift: Math.random() * 0.9 + 0.3,
    o: Math.random() * 0.35 + 0.6 // raise base opacity a bit
  }));

  function step() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      f.a += ANGLE_SPEED + f.drift * 0.01;
      f.y += (f.v * GRAVITY) + f.r * 0.04;
      f.x += Math.sin(f.a) * (f.drift * WIND);

      if (f.y > height + 8) { f.y = -8; f.x = Math.random() * width; }
      if (f.x > width + 8) { f.x = -8; }
      if (f.x < -8) { f.x = width + 8; }

      const tw = 0.15 * Math.sin(f.a * 3 + i) + 0.85;
      const alpha = Math.min(1, Math.max(0.45, f.o * tw));

      // draw faint halo for contrast on white (cheap: second filled circle)
      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      ctx.globalAlpha = 1; // halo not multiplied by alpha
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r + 0.6, 0, Math.PI * 2);
      ctx.fill();

      // draw flake
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initCardLighting() {
  const card = document.querySelector('.card');
  if (!card) return;
  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--px', `${x}px`);
    card.style.setProperty('--py', `${y}px`);
  }, { passive: true });
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolveBounce(ax, ay, aw, ah, vx, vy, cardRect) {
  // Determine minimal translation to push out and reflect appropriate axis
  const leftPen = (ax + aw) - cardRect.left;
  const rightPen = (cardRect.right) - ax;
  const topPen = (ay + ah) - cardRect.top;
  const bottomPen = (cardRect.bottom) - ay;
  // Find smallest penetration
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
  if (minPen === leftPen) { ax = cardRect.left - aw; vx = -Math.abs(vx); }
  else if (minPen === rightPen) { ax = cardRect.right; vx = Math.abs(vx); }
  else if (minPen === topPen) { ay = cardRect.top - ah; vy = -Math.abs(vy); }
  else { ay = cardRect.bottom; vy = Math.abs(vy); }
  return { ax, ay, vx, vy };
}

function initClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const pad = (n) => String(n).padStart(2, '0');
  function update() {
    const d = new Date();
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    el.textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);

  // bounce digital clock
  let x = 20, y = 20;
  let vx = 2.2, vy = 1.8;
  function tick() {
      const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    x += vx; y += vy;

    // window bounds
    if (x <= 10 || x + rect.width >= vw - 10) vx *= -1;
    if (y <= 10 || y + rect.height >= vh - 10) vy *= -1;

    // bounce off center card
    const card = document.querySelector('.card');
    if (card) {
      const c = card.getBoundingClientRect();
      if (rectsOverlap(x, y, rect.width, rect.height, c.left, c.top, c.width, c.height)) {
        const res = resolveBounce(x, y, rect.width, rect.height, vx, vy, c);
        x = res.ax; y = res.ay; vx = res.vx; vy = res.vy;
      }
    }

    el.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initAnalogClock() {
  const canvas = document.getElementById('analogClock');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const size = 90;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Start analog clock away from digital: random on right half, mid vertical
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let ax = Math.max(20, Math.min(vw - 130, vw * 0.6 + Math.random() * (vw * 0.35)));
  let ay = Math.max(20, Math.min(vh - 130, vh * 0.25 + Math.random() * (vh * 0.5)));
  let avx = (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 0.8);
  let avy = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 0.8);

  function tickAnalog() {
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width || 90;
    const ch = rect.height || 90;
    const vw2 = window.innerWidth;
    const vh2 = window.innerHeight;
    ax += avx; ay += avy;

    // window bounds
    if (ax <= 10 || ax + cw >= vw2 - 10) avx *= -1;
    if (ay <= 10 || ay + ch >= vh2 - 10) avy *= -1;

    // bounce off center card
    const card = document.querySelector('.card');
    if (card) {
      const c = card.getBoundingClientRect();
      if (rectsOverlap(ax, ay, cw, ch, c.left, c.top, c.width, c.height)) {
        const res = resolveBounce(ax, ay, cw, ch, avx, avy, c);
        ax = res.ax; ay = res.ay; avx = res.vx; avy = res.vy;
      }
    }

    canvas.style.transform = `translate(${ax}px, ${ay}px)`;
    requestAnimationFrame(tickAnalog);
  }
  requestAnimationFrame(tickAnalog);

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 6;

    ctx.clearRect(0, 0, w, h);

    // gradient face
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#f4f6ff');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // outer ring
    const rg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rg.addColorStop(0, 'rgba(0,0,0,0.10)');
    rg.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.strokeStyle = rg;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 12 major ticks
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const inner = r - 10;
      const outer = r - 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.lineWidth = i % 3 === 0 ? 2 : 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;

    // hands
    drawHand(hr * 30 * Math.PI / 180, r * 0.5, 3.5, 'rgba(0,0,0,0.85)');
    drawHand(min * 6 * Math.PI / 180, r * 0.72, 2.5, 'rgba(0,0,0,0.8)');
    drawHand(sec * 6 * Math.PI / 180, r * 0.80, 1.5, '#5b6cff');

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#5b6cff';
    ctx.fill();

    requestAnimationFrame(draw);

    function drawHand(angle, length, width, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle - Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(length, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }
  requestAnimationFrame(draw);
}

function initOtterCardClock() {
  const root = document.querySelector('.ui-otter-card');
  if (!root) return;
  const timeText = root.querySelector('.time-text');
  const ampmSpan = root.querySelector('.time-sub-text');
  const dayText = root.querySelector('.day-text');
  if (!timeText || !ampmSpan || !dayText) return;

  const pad = (n) => String(n).padStart(2, '0');
  const ord = (n) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function update() {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes();
    const am = h < 12;
    const ampm = am ? 'AM' : 'PM';
    h = h % 12; if (h === 0) h = 12;
    timeText.firstElementChild && (timeText.firstElementChild.textContent = `${pad(h)}:${pad(m)}`);
    ampmSpan.textContent = ampm;
    const wd = weekdays[d.getDay()];
    const mo = months[d.getMonth()];
    const day = d.getDate();
    dayText.textContent = `${wd}, ${mo} ${day}${ord(day)}`;
  }
  update();
  setInterval(update, 1000);
}

function initThemeToggle() {
  const toggle = document.getElementById('toggle');
  if (!toggle) return;
  const html = document.documentElement;
  const saved = localStorage.getItem('site-theme');
  if (saved) {
    html.setAttribute('data-theme', saved);
    toggle.checked = saved === 'dark';
  } else {
    html.setAttribute('data-theme', 'light');
    toggle.checked = false;
  }
  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'dark' : 'light';
    html.setAttribute('data-theme', theme);
    localStorage.setItem('site-theme', theme);
  });
}

function initWidgets() {
  const dock = document.getElementById('widgets');
  if (!dock) return;

  // Battery
  const battLevel = document.getElementById('battery-level');
  const battChg = document.getElementById('battery-charging');
  if (navigator.getBattery && battLevel && battChg) {
    navigator.getBattery().then((b) => {
      function updateBatt() {
        battLevel.textContent = Math.round(b.level * 100) + '%';
        battChg.textContent = b.charging ? '⚡' : '';
      }
      ['levelchange','chargingchange'].forEach((ev)=>b.addEventListener(ev, updateBatt));
      updateBatt();
    }).catch(()=>{});
  } else if (battLevel) {
    battLevel.textContent = 'N/A';
  }

  // Network
  const net = document.getElementById('net-status');
  if (net) {
    function updNet(){ net.textContent = navigator.onLine ? 'Online' : 'Offline'; }
    window.addEventListener('online', updNet);
    window.addEventListener('offline', updNet);
    updNet();
  }

  // Color Picker
  const colorInput = document.getElementById('color-input');
  const colorHex = document.getElementById('color-hex');
  if (colorInput && colorHex) {
    colorInput.addEventListener('input', ()=>{ colorHex.value = colorInput.value.toUpperCase(); });
  }

  // Clipboard helper (char count only; reading requires user gesture)
  const clipText = document.getElementById('clip-text');
  const clipCount = document.getElementById('clip-count');
  if (clipText && clipCount) {
    function updCount(){ clipCount.textContent = `${clipText.value.length} chars`; }
    clipText.addEventListener('input', updCount);
    updCount();
  }

  // Stopwatch
  const swTime = document.getElementById('sw-time');
  const swToggle = document.getElementById('sw-toggle');
  const swReset = document.getElementById('sw-reset');
  if (swTime && swToggle && swReset) {
    let running = false;
    let start = 0;
    let elapsed = 0;
    let raf;
    function fmt(ms){ const s = Math.floor(ms/1000); const m = Math.floor(s/60); const ss = s%60; const d = Math.floor((ms%1000)/100); return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${d}`; }
    function tick(){ const now = performance.now(); swTime.textContent = fmt(elapsed + (now - start)); raf = requestAnimationFrame(tick); }
    swToggle.addEventListener('click', ()=>{
      if (!running) { running = true; start = performance.now(); swToggle.textContent = 'Pause'; raf = requestAnimationFrame(tick); }
      else { running = false; cancelAnimationFrame(raf); elapsed += performance.now() - start; swToggle.textContent = 'Start'; }
    });
    swReset.addEventListener('click', ()=>{ running=false; cancelAnimationFrame(raf); elapsed=0; swTime.textContent='00:00.0'; swToggle.textContent='Start'; });
  }
}

(function enhanceThemeVariables(){
  const style = document.createElement('style');
  style.textContent = `
    [data-theme="dark"] {
      --bg: #0b0b10;
      --elev: #0f0f14;
      --text: #e8e8ef;
      --muted: #acb0bf;
      --stroke: rgba(255,255,255,0.12);
      --shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3);
    }
    [data-theme="dark"] body { background: radial-gradient(1200px 600px at 80% -10%, rgba(124,92,255,0.04), transparent 60%), radial-gradient(800px 400px at 10% 0%, rgba(46,230,166,0.03), transparent 50%), var(--bg); }
  `;
  document.head.appendChild(style);
})();

function init() {
  initReveal();
  initCanvasSnow();
  initCardLighting();
  initClock();
  initCustomCursor();
  initAnalogClock();
  initOtterCardClock();
  initThemeToggle();
  initWidgets();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);