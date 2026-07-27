/* ===== Interaktiver Hintergrund – Partikelnetz in Grautönen =====
   - folgt der Maus (Partikel weichen aus, nahe Punkte verbinden sich)
   - Klick erzeugt eine Druckwelle
   - passt sich automatisch an Light-/Dark-Theme an
   - respektiert prefers-reduced-motion
*/
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Graustufen-Palette je Theme
  const PALETTE = {
    dark:  { dot: '160,162,170', line: '150,152,162', cursor: '190,192,200' },
    light: { dot: '120,118,112', line: '110,108,102', cursor: '80,78,72' }
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

  const LINK_DIST = 130;     // max. Abstand für Verbindungslinien
  const MOUSE_DIST = 170;    // Wirkradius der Maus
  const mouse = { x: -9999, y: -9999, active: false };

  function particleCount() {
    return Math.max(34, Math.min(110, Math.round((W * H) / 15000)));
  }

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 0.9
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
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Maus stößt Partikel sanft ab
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MOUSE_DIST * MOUSE_DIST && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / MOUSE_DIST) * 0.55;
          p.vx += (dx / d) * f * 0.08;
          p.vy += (dy / d) * f * 0.08;
        }
      }

      // Druckwellen durch Klick
      for (const w of waves) {
        const dx = p.x - w.x, dy = p.y - w.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const diff = Math.abs(d - w.r);
        if (diff < 46) {
          const f = (1 - diff / 46) * w.life * 0.9;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      // Reibung + Mindesttempo, damit es nie einfriert
      p.vx *= 0.985;
      p.vy *= 0.985;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp < 0.06) {
        const a = Math.random() * Math.PI * 2;
        p.vx += Math.cos(a) * 0.02;
        p.vy += Math.sin(a) * 0.02;
      } else if (sp > 2.4) {
        p.vx = (p.vx / sp) * 2.4;
        p.vy = (p.vy / sp) * 2.4;
      }

      // Ränder umschlagen
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
    }

    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].r += 9;
      waves[i].life -= 0.022;
      if (waves[i].life <= 0) waves.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Verbindungslinien
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const t = 1 - Math.sqrt(d2) / LINK_DIST;
          ctx.strokeStyle = 'rgba(' + col.line + ',' + (t * 0.22).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Linien zum Cursor
    if (mouse.active) {
      for (const p of particles) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MOUSE_DIST * MOUSE_DIST) {
          const t = 1 - Math.sqrt(d2) / MOUSE_DIST;
          ctx.strokeStyle = 'rgba(' + col.cursor + ',' + (t * 0.32).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // Druckwellen-Ringe
    for (const w of waves) {
      ctx.strokeStyle = 'rgba(' + col.cursor + ',' + (w.life * 0.18).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Punkte
    for (const p of particles) {
      let alpha = 0.42;
      if (mouse.active) {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (d < MOUSE_DIST) alpha += (1 - d / MOUSE_DIST) * 0.4;
      }
      ctx.fillStyle = 'rgba(' + col.dot + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });

    window.addEventListener('pointerleave', () => { mouse.active = false; });
    window.addEventListener('blur', () => { mouse.active = false; });

    window.addEventListener('pointerdown', (e) => {
      if (waves.length < 4) waves.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
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
