// Tema «Daniel» (al estilo Persona 5): letras recortadas en el menú lateral y en los títulos, la entrada elegida
// del menú marcada, una cortina al cambiar de página sin recargar y un golpe rojo al hacer clic.
// Solo actúa mientras Daniel está puesto (es un tema fijo: ver rkLockedTheme en common/themes.js).
RX.features.push({
  id: 'daniel',
  // Dónde van las letras recortadas: [selector, máximo de letras, estilo]. Si el texto es más largo se queda como está.
  TARGETS: [
    [':is(#navigation, .rbx-left-col) li > a :is(.dynamic-ellipsis-item, .left-nav-label, .text-label-small, span.font-header-2)', 18, 'list'],
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
    this.scan();
    var timer = null;
    this.obs = new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () { timer = null; self.scan(); }, 140);
    });
    this.obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Páginas que cambian sin recargar: cortina y menú al día.
    this.href = location.pathname;
    this.poll = setInterval(function () {
      if (location.pathname === self.href) return;
      self.href = location.pathname;
      self.wipe();
      self.scan();
    }, 400);
    this.onClick = function (e) { self.hit(e); };
    document.addEventListener('click', this.onClick, true);
  },

  stop: function () {
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
    clearInterval(this.poll);
    if (this.onClick) document.removeEventListener('click', this.onClick, true);
    rkUnransom(document);
    document.querySelectorAll('.p5-here').forEach(function (n) { n.classList.remove('p5-here'); });
    var w = document.getElementById('rk-p5-wipe');
    if (w) w.remove();
  },

  scan: function () {
    if (!this.on) return;
    this.TARGETS.forEach(function (tg) {
      document.querySelectorAll(tg[0]).forEach(function (el) { rkRansomHost(el, tg[1], tg[2]); });
    });
    // Entrada del menú de la página en la que estás.
    var here = location.pathname.replace(/^\/(?:[a-z]{2}(?:-[a-z]{2,4})?\/)?/i, '/').replace(/\/+$/, '') || '/';
    document.querySelectorAll(':is(#navigation, .rbx-left-col) li > a[href]').forEach(function (a) {
      var p = '';
      try { p = new URL(a.getAttribute('href'), location.href).pathname.replace(/\/+$/, ''); } catch (e) { /* enlace raro */ }
      a.classList.toggle('p5-here', !!p && p === here);
    });
  },

  reduced: function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; },

  wipe: function () {
    if (this.reduced()) return;
    var old = document.getElementById('rk-p5-wipe');
    if (old) old.remove();
    var w = document.createElement('div');
    w.id = 'rk-p5-wipe';
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, 800);
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
  }
});
