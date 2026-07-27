/* Gemeinsame Logik aller Seiten: Theme, Menü, Fade-in */

function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  html.setAttribute('data-theme', isLight ? 'dark' : 'light');
  localStorage.setItem('theme', isLight ? 'dark' : 'light');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';
}

(function () {
  const btn = document.getElementById('theme-toggle');
  if (btn && document.documentElement.getAttribute('data-theme') === 'light') {
    btn.textContent = '☀️';
  }
})();

document.addEventListener('click', (e) => {
  const menu = document.getElementById('site-menu');
  const toggle = document.querySelector('.menu-toggle');
  if (menu && menu.classList.contains('show') && !menu.contains(e.target) && e.target !== toggle) {
    menu.classList.remove('show');
  }
});

(function () {
  const targets = document.querySelectorAll('main > *, main li, .footer-col');
  if (!targets.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach(el => el.classList.add('fade-in', 'visible'));
    return;
  }

  targets.forEach((el, i) => {
    el.classList.add('fade-in');
    el.style.transitionDelay = (i * 70) + 'ms';
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(el => obs.observe(el));
})();

/* Touch-Geraete haben kein Hover: erster Tap oeffnet das Dropdown,
   zweiter Tap folgt dem Link. */
(function () {
  if (!window.matchMedia('(hover: none)').matches) return;

  const items = document.querySelectorAll('.nav-item');
  items.forEach((item) => {
    const link = item.querySelector('a');
    const drop = item.querySelector('.nav-dropdown');
    if (!link || !drop) return;
    link.addEventListener('click', (e) => {
      if (!item.classList.contains('open')) {
        e.preventDefault();
        items.forEach(o => { if (o !== item) o.classList.remove('open'); });
        item.classList.add('open');
      }
    });
  });

  document.addEventListener('click', (e) => {
    items.forEach((item) => {
      if (item.classList.contains('open') && !item.contains(e.target)) {
        item.classList.remove('open');
      }
    });
  });
})();
