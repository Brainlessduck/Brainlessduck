/* Sprachumschaltung DE/EN.
   Deutsch steht im HTML, Englisch hier. Elemente werden ueber
   data-i18n (Text), data-i18n-html (mit Markup) und
   data-i18n-title / data-i18n-aria / data-i18n-value markiert.
   Dynamische Strings aus Seitenskripten holen sich ihren Text ueber t(key). */

(function () {
  const EN = {
    /* Navigation + Footer */
    'nav.volleyball': 'Volleyball',
    'nav.home': 'Home',
    'nav.minecraft': 'Minecraft',
    'nav.modpacks': 'Modpacks',
    'nav.theme': 'Light/dark mode',
    'nav.menu': 'Menu',

    /* Startseite */
    'home.h1': 'Welcome',
    'home.intro': "Hey, I'm Brainlessduck. Here you'll find a bit about me, my interests and my projects.",
    'home.social': 'My social media profiles',
    'home.bedwars': 'Bedwars stats',

    /* Volleyball */
    'vb.projects': 'My projects',
    'vb.tag.tool': 'Tool',
    'vb.zones': 'The six zones',
    'vb.court.alt': 'Volleyball court with the six zones: front row from left to right 4, 3, 2 and back row from left to right 5, 6, 1',
    'vb.zones.p1': 'The numbering looks confusing at first because it does not run from left to right &ndash; it follows the serving order. Zone 1 serves, then the right to serve moves on clockwise: <strong>1 &rarr; 6 &rarr; 5 &rarr; 4 &rarr; 3 &rarr; 2</strong>.',
    'vb.zones.p2': 'Here is the key part: these zones only matter for a single moment &ndash; until the server strikes the ball. Up to that point every front-row player must have a foot closer to the net than their back-row partner, and neighbours within a row have to keep their order. If that is not the case, it is a rotation fault and the point goes to the other team.',
    'vb.zones.p3': 'After that everyone may move freely. This is exactly what the 5-1 system lives on: the setter starts in the back row as the rules require and sprints to the net in the same second. You can walk through that run for every rotation in the Läufer Trainer.',
    'vb.zones.p4': 'The white line is the 3-metre line. Anyone attacking above the net from the back row has to take off behind it &ndash; landing in the front zone afterwards is fine.',
    'vb.positions': 'The positions',
    'vb.pos.z': '<strong>Setter</strong> &ndash; plays the second ball and decides who attacks. In the 5-1 system there is only one, running from the back row up to position 2/3.',
    'vb.pos.aa': '<strong>Outside hitter</strong> &ndash; attacks from position 4 and takes part in serve receive. There are two per team.',
    'vb.pos.mb': '<strong>Middle blocker</strong> &ndash; blocks in the middle and hits quick attacks over position 3. Also two per team.',
    'vb.pos.d': '<strong>Opposite</strong> &ndash; always stands diagonally to the setter and attacks from position 2, usually without receiving duties.',
    'vb.pos.l': '<strong>Libero</strong> &ndash; defensive specialist in the back row with a different shirt. They may swap in and out for back-row players as often as they like.',
    'vb.pos.note': 'You can go through the setter run for every rotation step by step in the Läufer Trainer.',

    /* Minecraft */
    'mc.modpacks': 'Modpacks',
    'mc.favourites': 'Favourites',
    'mc.more': 'More recommendations',
    'mc.by': 'by',
    'mc.close': 'Close',

    /* Punktezaehler */
    'pz.h1': 'Score counter',
    'pz.intro': 'Counts points and sets by volleyball rules, for indoor or beach. Two-point lead, end of set and tie-break are handled automatically. The score is stored in your browser and survives a reload.',
    'pz.set': 'Set',
    'pz.to': 'to',
    'pz.points': 'points',
    'pz.hall': 'Indoor',
    'pz.beach': 'Beach',
    'pz.undo': 'Undo',
    'pz.new': 'New game',
    'pz.sets': 'Sets',
    'pz.name1': 'Name of team 1',
    'pz.name2': 'Name of team 2',
    'pz.point1': 'Point for team 1',
    'pz.point2': 'Point for team 2',
    'pz.team1': 'Us',
    'pz.team2': 'Opponent',
    'pz.setpoint': 'Set point for ',
    'pz.matchpoint': 'Match point for ',
    'pz.wins': ' wins ',
    'pz.sidechange': 'Switch sides',
    'pz.confirm.court': 'Switching the court starts a new game. Continue?',
    'pz.confirm.mode': 'Switching the mode starts a new game. Continue?',
    'pz.confirm.reset': 'Start a new game?',
    'pz.team': 'Team ',

    /* 404 */
    'e404.text': 'This page does not exist (any more). Maybe a typo in the address?',
    'e404.where': 'Where you can go instead',
    'e404.tag': 'Page'
  };

  /* Deutsche Texte, die nicht im HTML stehen, sondern aus Skripten kommen */
  const DE = {
    'pz.team1': 'Wir',
    'pz.team2': 'Gegner',
    'pz.setpoint': 'Satzball für ',
    'pz.matchpoint': 'Matchball für ',
    'pz.wins': ' gewinnt ',
    'pz.sidechange': 'Seitenwechsel',
    'pz.confirm.court': 'Feld wechseln startet ein neues Spiel. Fortfahren?',
    'pz.confirm.mode': 'Modus wechseln startet ein neues Spiel. Fortfahren?',
    'pz.confirm.reset': 'Neues Spiel starten?',
    'pz.team': 'Team ',
    'pz.sets': 'Sätze'
  };

  const ATTR_MAP = {
    'data-i18n-title': 'title',
    'data-i18n-aria': 'aria-label',
    'data-i18n-value': 'value'
  };

  const originals = new Map();
  const listeners = [];
  let lang = 'de';

  try {
    if (localStorage.getItem('lang') === 'en') lang = 'en';
  } catch (e) {}

  function remember(el, prop, value) {
    if (!originals.has(el)) originals.set(el, {});
    const store = originals.get(el);
    if (!(prop in store)) store[prop] = value;
  }

  function restore(el, prop) {
    const store = originals.get(el);
    return store && prop in store ? store[prop] : null;
  }

  function apply() {
    const en = lang === 'en';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      remember(el, 'text', el.textContent);
      el.textContent = en && EN[key] != null ? EN[key] : restore(el, 'text');
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      remember(el, 'html', el.innerHTML);
      el.innerHTML = en && EN[key] != null ? EN[key] : restore(el, 'html');
    });

    Object.keys(ATTR_MAP).forEach((dataAttr) => {
      const target = ATTR_MAP[dataAttr];
      document.querySelectorAll('[' + dataAttr + ']').forEach((el) => {
        const key = el.getAttribute(dataAttr);
        remember(el, target, el.getAttribute(target) || '');
        const value = en && EN[key] != null ? EN[key] : restore(el, target);
        if (target === 'value') el.value = value;
        el.setAttribute(target, value);
      });
    });

    const label = document.getElementById('lang-label');
    if (label) label.textContent = lang.toUpperCase();

    listeners.forEach((fn) => {
      try { fn(lang); } catch (e) {}
    });
  }

  window.t = function (key) {
    const dict = lang === 'en' ? EN : DE;
    return dict[key] != null ? dict[key] : (DE[key] != null ? DE[key] : key);
  };

  window.getLang = function () {
    return lang;
  };

  window.setLang = function (next) {
    lang = next === 'en' ? 'en' : 'de';
    try { localStorage.setItem('lang', lang); } catch (e) {}
    apply();
  };

  window.toggleLang = function () {
    window.setLang(lang === 'de' ? 'en' : 'de');
  };

  window.onLangChange = function (fn) {
    listeners.push(fn);
  };

  apply();
})();
