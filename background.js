/* ===== Interaktiver Hintergrund – Partikelnetz in Grautönen =====
   - dichtes, schnelles Netz das auf die Maus reagiert
   - Cursor-Glow + Sog/Abstoßung, Partikel "laden" sich auf
   - Klick erzeugt eine Druckwelle
   - passt sich automatisch an Light-/Dark-Theme an
   - respektiert prefers-reduced-motion

   >>> Intensität hier oben schrauben <<<
*/
(function () {
  const CFG = {
    density:     6200,  // kleiner = mehr Partikel
    maxDots:     210,
    minDots:     70,
    speed:       0.85,  // Grundtempo
    maxSpeed:    5.2,
    linkDist:    165,   // Reichweite der Verbindungslinien
    mouseDist:   280,   // Wirkradius der Maus
    push:        0.22,  // Abstoßkraft der Maus
    swirl:       0.10,  // Wirbel um den Cursor
    lineAlpha:   0.40,
    cursorAlpha: 0.62,
    dotAlpha:    0.62,
    glow:        true,  // Leuchtkreis am Cursor
    maxWaves:    8
  };

  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Graustufen-Palette je Theme
  const PALETTE = {
    dark:  { dot: '186,188,196', line: '158,160,170', cursor: '225,227,234' },
    light: { dot: '104,102,96',  line: '116,114,108', cursor: '54,52,48' }
  };
  let col = PALETTE.dark;

  function readTheme() {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    col = light ? PALETTE.light : PALETTE.dark;
  }
  readTheme();
  new MutationObserver(readTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  const waves = [];
  let t = 0;

  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };

  function particleCount() {
    return Math.max(CFG.minDots, Math.min(CFG.maxDots, Math.round((W * H) / CFG.density)));
  }

  function makeParticle() {
    const a = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(a) * CFG.speed,
      vy: Math.sin(a) * CFG.speed,
      r: Math.random() * 1.8 + 1.0,
      ph: Math.random() * Math.PI * 2,  // Pulsphase
      ch: 0                             // Aufladung durch Cursor
    };
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

    const target = particleCount();
    if (particles.length > target) particles.length = target;
    while (particles.length < target) particles.push(makeParticle());
    if (reduced) draw();
  }

  function step() {
    t += 0.016;
    const MD = CFG.mouseDist, MD2 = MD * MD;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.ph += 0.09;
      p.ch *= 0.94;

      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MD2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / MD);
          // wegdrücken
          p.vx += (dx / d) * f * CFG.push;
          p.vy += (dy / d) * f * CFG.push;
          // seitlicher Wirbel
          p.vx += (-dy / d) * f * CFG.swirl;
          p.vy += (dx / d) * f * CFG.swirl;
          // Mausbewegung reißt Partikel mit
          p.vx += mouse.vx * f * 0.05;
          p.vy += mouse.vy * f * 0.05;
          p.ch = Math.max(p.ch, f);
        }
      }

      // Druckwellen durch Klick
      for (const w of waves) {
        const dx = p.x - w.x, dy = p.y - w.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const diff = Math.abs(d - w.r);
        if (diff < 60) {
          const f = (1 - diff / 60) * w.life * 1.8;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
          p.ch = Math.max(p.ch, w.life * 0.9);
        }
      }

      // Reibung + Mindest-/Höchsttempo
      p.vx *= 0.988;
      p.vy *= 0.988;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp < CFG.speed * 0.55) {
        const a = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 0.6;
        p.vx += Math.cos(a) * 0.06;
        p.vy += Math.sin(a) * 0.06;
      } else if (sp > CFG.maxSpeed) {
        p.vx = (p.vx / sp) * CFG.maxSpeed;
        p.vy = (p.vy / sp) * CFG.maxSpeed;
      }

      // Ränder umschlagen
      if (p.x < -25) p.x = W + 25; else if (p.x > W + 25) p.x = -25;
      if (p.y < -25) p.y = H + 25; else if (p.y > H + 25) p.y = -25;
    }

    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].r += 14;
      waves[i].life -= 0.02;
      if (waves[i].life <= 0) waves.splice(i, 1);
    }

    mouse.vx *= 0.82;
    mouse.vy *= 0.82;
  }

  // Gitter-Buckets, damit die Linienprüfung auch bei vielen Partikeln schnell bleibt
  function buildGrid() {
    const cs = CFG.linkDist;
    const cols = Math.max(1, Math.ceil(W / cs));
    const rows = Math.max(1, Math.ceil(H / cs));
    const cells = new Array(cols * rows);
    for (const p of particles) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cs)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cs)));
      const k = cy * cols + cx;
      (cells[k] || (cells[k] = [])).push(p);
    }
    return { cells, cols, rows, cs };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Cursor-Glow
    if (CFG.glow && mouse.active) {
      const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, CFG.mouseDist * 0.75);
      g.addColorStop(0, 'rgba(' + col.cursor + ',0.13)');
      g.addColorStop(1, 'rgba(' + col.cursor + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(mouse.x - CFG.mouseDist, mouse.y - CFG.mouseDist, CFG.mouseDist * 2, CFG.mouseDist * 2);
    }

    // Verbindungslinien über Gitter
    const LD = CFG.linkDist, LD2 = LD * LD;
    const { cells, cols, rows } = buildGrid();
    ctx.lineWidth = 1;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const a_list = cells[cy * cols + cx];
        if (!a_list) continue;
        for (let ny = cy; ny <= cy + 1; ny++) {
          for (let nx = cx - 1; nx <= cx + 1; nx++) {
            if (ny === cy && nx < cx) continue;
            if (nx < 0 || nx >= cols || ny >= rows) continue;
            const b_list = cells[ny * cols + nx];
            if (!b_list) continue;
            const same = (nx === cx && ny === cy);
            for (let i = 0; i < a_list.length; i++) {
              const a = a_list[i];
              for (let j = same ? i + 1 : 0; j < b_list.length; j++) {
                const b = b_list[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < LD2) {
                  const tt = 1 - Math.sqrt(d2) / LD;
                  const boost = 1 + (a.ch + b.ch) * 1.1;
                  ctx.strokeStyle = 'rgba(' + col.line + ',' +
                    Math.min(0.85, tt * CFG.lineAlpha * boost).toFixed(3) + ')';
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y);
                  ctx.lineTo(b.x, b.y);
                  ctx.stroke();
                }
              }
            }
          }
        }
      }
    }

    // Linien zum Cursor
    if (mouse.active) {
      const MD = CFG.mouseDist, MD2 = MD * MD;
      for (const p of particles) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MD2) {
          const tt = 1 - Math.sqrt(d2) / MD;
          ctx.strokeStyle = 'rgba(' + col.cursor + ',' + (tt * CFG.cursorAlpha).toFixed(3) + ')';
          ctx.lineWidth = 0.6 + tt * 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
      ctx.lineWidth = 1;
    }

    // Druckwellen-Ringe
    for (const w of waves) {
      ctx.strokeStyle = 'rgba(' + col.cursor + ',' + (w.life * 0.3).toFixed(3) + ')';
      ctx.lineWidth = 1 + w.life * 2.2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Punkte
    for (const p of particles) {
      const pulse = 1 + Math.sin(p.ph) * 0.22 + p.ch * 1.3;
      const alpha = Math.min(1, CFG.dotAlpha + p.ch * 0.5);
      ctx.fillStyle = 'rgba(' + col.dot + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cursor-Kern
    if (mouse.active) {
      ctx.fillStyle = 'rgba(' + col.cursor + ',0.5)';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 2.6 + Math.sin(t * 5) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let running = true;
  function loop() {
    if (!running) return;
    step();
    draw();
    requestAnimationFrame(loop);
  }

  // ===== Events =====
  window.addEventListener('resize', resize);

  if (!reduced) {
    let lx = null, ly = null;
    window.addEventListener('pointermove', (e) => {
      if (lx !== null) {
        mouse.vx = e.clientX - lx;
        mouse.vy = e.clientY - ly;
      }
      lx = e.clientX; ly = e.clientY;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });

    window.addEventListener('pointerleave', () => { mouse.active = false; });
    window.addEventListener('blur', () => { mouse.active = false; });

    window.addEventListener('pointerdown', (e) => {
      if (waves.length < CFG.maxWaves) waves.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
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
