/* ===== Interaktiver Hintergrund – elastisches Punktraster =====
   - Punktraster wölbt sich federnd unter dem Cursor weg
   - Klick schickt einen kompakten Ring durchs Raster, getroffene Punkte
     blitzen kurz in Akzentgelb auf
   - passt sich automatisch an Light-/Dark-Theme an
   - respektiert prefers-reduced-motion

   >>> Intensität hier oben schrauben <<<
*/
(function () {
  const CFG = {
    spacing:    30,   // Abstand der Rasterpunkte
    dotSize:    2.2,  // Grundgröße
    wave:       2.2,  // ständige leichte Wellenbewegung
    cursorDist: 160,  // Wirkradius des Cursors
    cursorPush: 52,   // wie weit der Cursor die Punkte wegdrückt
    stiff:      0.13, // Federhärte (höher = strafferer Rückzug)
    damp:       0.87, // Dämpfung (niedriger = weniger Nachschwingen)
    ringBand:   20,   // Dicke des Klick-Rings  << Angriffsfläche
    ringSpeed:  7,    // Ausbreitungstempo
    ringDecay:  0.035,// je höher, desto kürzer die Reichweite
    maxRings:   5
  };

  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PALETTE = {
    dark:  { dot: [180, 182, 190], base: 0.30, lift: 0.65 },
    light: { dot: [110, 108, 102], base: 0.34, lift: 0.60 }
  };
  const ACCENT = [245, 197, 24];

  // Vorberechnete Farbstrings – spart pro Frame tausende String-Operationen
  const STEPS = 26;
  let GREY = [], YELLOW = [], theme = PALETTE.dark;

  function bakeColors() {
    const c = theme.dot;
    GREY = []; YELLOW = [];
    for (let i = 0; i < STEPS; i++) {
      const a = (i / (STEPS - 1));
      GREY.push('rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (theme.base + a * theme.lift).toFixed(3) + ')');
      YELLOW.push('rgba(' + ACCENT[0] + ',' + ACCENT[1] + ',' + ACCENT[2] + ',' + (0.35 + a * 0.65).toFixed(3) + ')');
    }
  }
  function readTheme() {
    theme = document.documentElement.getAttribute('data-theme') === 'light' ? PALETTE.light : PALETTE.dark;
    bakeColors();
  }
  readTheme();
  new MutationObserver(readTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  let W = 0, H = 0, dpr = 1, t = 0;
  let pts = [];
  const rings = [];
  const mouse = { x: -9999, y: -9999, on: false };

  function build() {
    pts = [];
    const S = CFG.spacing;
    for (let x = S / 2; x < W + S; x += S) {
      for (let y = S / 2; y < H + S; y += S) {
        pts.push({ hx: x, hy: y, ox: 0, oy: 0, vx: 0, vy: 0 });
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    if (reduced) frame(true);
  }

  function frame(staticOnly) { // Achtung: nie direkt an requestAnimationFrame übergeben
    if (!staticOnly) {
      t += 0.016;
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].r += CFG.ringSpeed;
        rings[i].life -= CFG.ringDecay;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }
    }

    ctx.clearRect(0, 0, W, H);

    const CD = CFG.cursorDist, BAND = CFG.ringBand, half = CFG.dotSize / 2;
    const nRings = rings.length;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];

      // Zielversatz: leichte Dauerwelle + Cursor-Abstoßung
      const w = Math.sin(p.hx * 0.02 + t * 1.1) * Math.cos(p.hy * 0.02 - t * 0.8);
      let tx = w * CFG.wave, ty = w * CFG.wave, lift = 0;

      if (mouse.on) {
        const dx = p.hx - mouse.x, dy = p.hy - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CD * CD) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / CD) * (1 - d / CD);
          tx += (dx / d) * f * CFG.cursorPush;
          ty += (dy / d) * f * CFG.cursorPush;
          lift = f;
        }
      }

      // Federung
      p.vx += (tx - p.ox) * CFG.stiff;
      p.vy += (ty - p.oy) * CFG.stiff;
      p.vx *= CFG.damp;
      p.vy *= CFG.damp;
      p.ox += p.vx;
      p.oy += p.vy;

      // Klick-Ring
      let flash = 0;
      for (let k = 0; k < nRings; k++) {
        const r = rings[k];
        const d = Math.abs(Math.hypot(p.hx - r.x, p.hy - r.y) - r.r);
        if (d < BAND) {
          const f = (1 - d / BAND) * r.life;
          if (f > flash) flash = f;
        }
      }

      const x = p.hx + p.ox, y = p.hy + p.oy;

      if (flash > 0.02) {
        const s = CFG.dotSize + flash * 6.5;
        ctx.fillStyle = YELLOW[(flash * (STEPS - 1)) | 0];
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else {
        const s = CFG.dotSize + lift * 4.4;
        ctx.fillStyle = GREY[(lift * (STEPS - 1)) | 0];
        if (lift > 0.01) ctx.fillRect(x - s / 2, y - s / 2, s, s);
        else ctx.fillRect(x - half, y - half, CFG.dotSize, CFG.dotSize);
      }
    }

  }

  let running = true;
  function loop() {
    if (!running) return;
    frame(false);
    requestAnimationFrame(loop);
  }

  // ===== Events =====
  window.addEventListener('resize', resize);

  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
    }, { passive: true });

    window.addEventListener('pointerleave', () => { mouse.on = false; });
    window.addEventListener('blur', () => { mouse.on = false; });

    window.addEventListener('pointerdown', (e) => {
      if (rings.length < CFG.maxRings) rings.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        requestAnimationFrame(loop);
      }
    });
  }

  resize();
  if (!reduced) requestAnimationFrame(loop);
})();
