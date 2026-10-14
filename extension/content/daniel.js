// Tema «Daniel» (al estilo Persona 5): letras recortadas en el menú lateral y en los títulos, la entrada elegida
// del menú marcada, una cortina al cambiar de página sin recargar y un golpe rojo al hacer clic.
// Solo actúa mientras Daniel está puesto (es un tema fijo: ver rkLockedTheme en common/themes.js).
// Las marcas van en atributos data-p5-* y no en clases: Roblox (React) rehace las clases de sus elementos.
RX.features.push({
  id: 'daniel',
  // Menú lateral de Roblox: el clásico (#navigation), el nuevo (.left-nav) y, si cambia de nombre, el que tenga sus enlaces.
  NAVS: '#navigation, .rbx-left-col, .left-nav',
  NAV_LINKS: /\/(home|my\/avatar|users\/friends|my\/messages|users\/profile|my\/inventory|trades?|communities|groups|plus|giftcards)\b/i,
  // Dónde van las letras recortadas: [selector, máximo de letras]. Si el texto es más largo se queda como está.
  TARGETS: [
    ['#rk-home .rk-head h2 .rk-h-text', 28],
    ['#rk-home .rk-hero-title', 30],
    ['.container-header :is(h2, h3), .container-header + h2', 28],
    ['#container-main h1:not(.game-name):not(#rk-home *)', 22]
  ],

  run: function (s) { this.update(s); },
  update: function (s) {
    var t = rkLockedTheme(s);
    var on = !!t && t.id === 'daniel' && /^(www\.|web\.)?roblox\.com$/i.test(location.hostname);
    if (on === this.on) return;
    this.on = on;
    if (on) this.start(); else this.stop();
  },

  start: function () {
    var self = this;
    this.scans = 0;
    this.scan();
    // Solo cuenta lo que cambia Roblox: lo que pone RoCer0 (letras, cortina, golpe, contador de FPS) no vuelve a buscar.
    var timer = null;
    this.obs = new MutationObserver(function (list) {
      if (timer) return;
      for (var i = 0; i < list.length; i++) {
        if (self.ours(list[i])) continue;
        timer = setTimeout(function () { timer = null; self.scan(); }, 200);
        return;
      }
    });
    this.obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Páginas que cambian sin recargar: cortina, estrellas y menú al día.
    this.href = location.pathname;
    this.poll = setInterval(function () {
      if (location.pathname === self.href) return;
      self.href = location.pathname;
      self.wipe();
      self.scan();
    }, 400);
    this.onClick = function (e) { self.hit(e); };
    document.addEventListener('click', this.onClick, true);
    RX.diagInfo.daniel = function () { return self.report(); };
  },

  stop: function () {
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
    clearInterval(this.poll);
    if (this.onClick) document.removeEventListener('click', this.onClick, true);
    rkUnransom(document);
    ['data-p5-nav', 'data-p5-cmd', 'data-p5-here', 'data-p5-icon', 'data-p5-badge', 'data-p5-promo', 'data-p5-label'].forEach(function (a) {
      document.querySelectorAll('[' + a + ']').forEach(function (n) { n.removeAttribute(a); });
    });
    var w = document.getElementById('rk-p5-wipe');
    if (w) w.remove();
    document.documentElement.classList.remove('rk-p5-turn', 'rk-p5-turn2');
    delete RX.diagInfo.daniel;
  },

  // ¿Lo ha cambiado RoCer0? (dentro de las letras recortadas, de los avisos o del contador, o son piezas suyas)
  ours: function (m) {
    var t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    if (t && t.closest('.p5-ransom, #rx-perf, #rx-toast, #rk-p5-wipe')) return true;
    if (m.type !== 'childList') return false;
    var mine = function (n) { return n.nodeType === 1 && (n.classList.contains('p5-ransom') || n.classList.contains('rk-p5-hit') || n.id === 'rk-p5-wipe'); };
    return m.addedNodes.length + m.removedNodes.length > 0 &&
      Array.prototype.every.call(m.addedNodes, mine) && Array.prototype.every.call(m.removedNodes, mine);
  },

  scan: function () {
    if (!this.on) return;
    this.scans++;
    this.TARGETS.forEach(function (tg) {
      document.querySelectorAll(tg[0]).forEach(function (el) { rkRansomHost(el, tg[1]); });
    });
    this.navs().forEach(this.nav, this);
  },

  // Menús laterales de la página: los conocidos y, si no hay, la lista que tenga varios enlaces del menú de Roblox.
  navs: function () {
    var out = Array.prototype.slice.call(document.querySelectorAll(this.NAVS)).filter(function (n) { return n.querySelector('li a[href]'); });
    if (out.length) return out;
    var re = this.NAV_LINKS, seen = [];
    document.querySelectorAll('ul').forEach(function (ul) {
      if (seen.length || ul.closest('#rk-home, footer, #header, .rbx-header')) return;
      var hits = 0;
      ul.querySelectorAll(':scope > li > a[href]').forEach(function (a) { if (re.test(a.getAttribute('href'))) hits++; });
      if (hits >= 4) seen.push(ul.closest('nav, aside') || ul);
    });
    return seen;
  },

  // Marca cada entrada del menú (para el CSS) y le pone las letras recortadas a su nombre.
  nav: function (box) {
    if (!box.hasAttribute('data-p5-nav')) box.setAttribute('data-p5-nav', '');
    var here = this.here();
    var user = this.user();
    box.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector(':scope > a[href]');
      var text = (li.textContent || '').replace(/\s+/g, ' ').trim();
      // Recuadros con frases (Premium, Roblox Plus): se quedan como panel, sin letras recortadas.
      if (text.length > 34) { if (!li.hasAttribute('data-p5-promo')) li.setAttribute('data-p5-promo', ''); return; }
      if (li.hasAttribute('data-p5-promo')) li.removeAttribute('data-p5-promo');
      if (!a) return;
      // Tu nombre de usuario (con tu cara): placa negra, sin letras recortadas.
      var isUser = !!a.querySelector('img') || (!!user && (text === user.name || text === user.displayName || text === '@' + user.name));
      var cmd = isUser ? 'user' : '';
      if (a.getAttribute('data-p5-cmd') !== cmd) a.setAttribute('data-p5-cmd', cmd);
      var p = '';
      try { p = RX.stripLocale(new URL(a.getAttribute('href'), location.href).pathname).replace(/\/+$/, '') || '/'; } catch (e) { /* enlace raro */ }
      if (!!p && p === here) { if (!a.hasAttribute('data-p5-here')) a.setAttribute('data-p5-here', ''); }
      else if (a.hasAttribute('data-p5-here')) a.removeAttribute('data-p5-here');
      // Iconos, contadores y el nombre.
      var label = null;
      Array.prototype.forEach.call(a.children, function (c) {
        if (c.classList.contains('p5-ransom')) return;
        var t = (c.textContent || '').trim();
        if (!t) { if (!isUser && !c.hasAttribute('data-p5-icon')) c.setAttribute('data-p5-icon', ''); return; }
        if (/^[\d.,]+[kKmM]?\+?$/.test(t)) { if (!c.hasAttribute('data-p5-badge')) c.setAttribute('data-p5-badge', ''); return; }
        if (!label) label = c;
      });
      if (isUser) return;
      if (label && !label.hasAttribute('data-p5-label')) label.setAttribute('data-p5-label', '');
      // Sin hijos (el texto va suelto dentro del enlace): las letras van en el propio enlace.
      rkRansomHost(label || a, 18, 'list');
    });
  },

  here: function () { return RX.path().replace(/\/+$/, '') || '/'; },

  user: function () {
    var m = document.querySelector('meta[name="user-data"]');
    return m ? { name: m.getAttribute('data-name') || '', displayName: m.getAttribute('data-displayname') || '' } : null;
  },

  reduced: function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; },

  // Cortina al cambiar de página sin recargar; las estrellas del fondo dan otra vuelta corta.
  wipe: function () {
    if (this.reduced()) return;
    var old = document.getElementById('rk-p5-wipe');
    if (old) old.remove();
    var w = document.createElement('div');
    w.id = 'rk-p5-wipe';
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, 800);
    // Dos nombres para la misma vuelta: al cambiar de uno a otro, la animación vuelve a empezar.
    var root = document.documentElement, odd = root.classList.contains('rk-p5-turn');
    root.classList.toggle('rk-p5-turn', !odd);
    root.classList.toggle('rk-p5-turn2', odd);
  },

  // Golpe rojo y negro donde haces clic (botones y enlaces).
  hit: function (e) {
    if (!e.isTrusted || e.button !== 0 || this.reduced()) return;
    var t = e.target && e.target.closest && e.target.closest('a, button, [role="button"], .btn, label');
    if (!t || t.closest('input, textarea, select')) return;
    var now = Date.now();
    if (now - (this.lastHit || 0) < 120) return;
    this.lastHit = now;
    var n = document.createElement('div');
    n.className = 'rk-p5-hit';
    n.style.left = e.clientX + 'px';
    n.style.top = e.clientY + 'px';
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 460);
  },

  // Para el diagnóstico: qué menú ha encontrado y cuántas entradas ha marcado (sin textos).
  report: function () {
    var navs = this.navs();
    return 'Daniel: menús ' + navs.length + ' (' + navs.map(function (n) { return RX.diagName(n); }).join(', ') + ')' +
      ' · entradas ' + document.querySelectorAll('[data-p5-nav] [data-p5-cmd]').length +
      ' · con letras ' + document.querySelectorAll('[data-p5-nav] [data-p5]').length +
      ' · títulos ' + document.querySelectorAll('[data-p5]:not([data-p5-nav] *)').length +
      ' · búsquedas ' + this.scans;
  }
});
