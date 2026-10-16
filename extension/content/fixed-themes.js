// Temas fijos (Daniel y Pablo): marcan el menú lateral, los títulos y las listas de personas para que su CSS
// (content/daniel.css y content/pablo.css) los rehaga, ponen una cortina al cambiar de página sin recargar y un
// efecto al hacer clic. Solo actúan mientras uno de ellos está puesto (ver rkLockedTheme en common/themes.js).
// Las marcas van en atributos data-p5-* y no en clases: Roblox (React) rehace las clases de sus elementos. Se llaman
// así por Daniel, el primer tema fijo; Pablo usa las mismas y cada CSS las pinta a su manera.
RX.features.push({
  id: 'fixed',
  // Lo que cambia de un tema a otro: cómo se escriben los títulos, la cortina y el efecto del clic.
  KINDS: {
    // Daniel: letras recortadas (nota de rescate) en los títulos y el menú, cortina negra y roja, golpe rojo.
    daniel: { name: 'Daniel', wipe: 'rk-p5-wipe', wipeMs: 800, hit: 'rk-p5-hit', hitMs: 460, turn: 'rk-p5-turn',
      title: function (el, max) { return rkRansomHost(el, max); }, label: function (el) { rkRansomHost(el, 18, 'list'); },
      clear: function (root) { rkUnransom(root); } },
    // Pablo: títulos con un eco eléctrico detrás (lo pinta pablo.css), descarga al cambiar de página y chispa al hacer clic.
    // También pone la palabra de la sección en la que estás (words): la gigante del fondo y la que pasa con las estelas.
    pablo: { name: 'Pablo', wipe: 'rk-pb-wipe', wipeMs: 860, hit: 'rk-pb-hit', hitMs: 520, turn: 'rk-pb-turn', words: true,
      title: function (el, max) { return rkEchoHost(el, max); }, label: function (el) { rkEchoHost(el, 24); },
      clear: function (root) { rkUnecho(root); } }
  },
  // Menú lateral de Roblox: el clásico (#navigation), el nuevo (.left-nav) y, si cambia de nombre o de forma, el bloque
  // que tenga sus enlaces. Se reconoce por los enlaces y no por cómo está montado.
  NAVS: '#navigation, .rbx-left-col, .left-nav',
  NAV_LINKS: /\/(home|my\/avatar|users\/friends|users\/connections|my\/messages|users\/profile|my\/inventory|users\/\d+\/inventory|users\/inventory|trades?|communities|groups|plus|giftcards|transactions)\b/i,
  // Lo que nunca es el menú lateral, aunque tenga esos enlaces.
  NOT_NAV: 'footer, #footer-container, .container-footer, #rk-home, #rk-home-fail, .p5-ransom, #rx-perf, #rx-toast',
  MARKS: ['data-p5-nav', 'data-p5-list', 'data-p5-row', 'data-p5-n', 'data-p5-item', 'data-p5-cmd', 'data-p5-here', 'data-p5-icon', 'data-p5-badge', 'data-p5-promo', 'data-p5-label',
    'data-p5-card', 'data-p5-cta', 'data-p5-people', 'data-p5-person', 'data-p5-face', 'data-p5-pname', 'data-p5-psub'],
  // Entradas del menú: enlaces y, desde 2026, algún botón sin enlace (la tienda oficial).
  ITEM: 'a[href], button',
  // Listas de personas: nunca dentro del menú, la cabecera, el pie, los menús que se abren, el chat ni las piezas de
  // RoCer0 (su Inicio, los amigos en común de los perfiles…), que ya tienen su propio estilo en cada tema.
  PEOPLE_NOT: '[data-p5-nav], #header, .rbx-header, footer, #footer-container, .container-footer, .p5-ransom, .dropdown-menu, .popover, ' +
    '.chat-container, #chat-container, .react-chat-root, [id^="rk-"], [id^="rx-"], [class^="rk-"], [class*=" rk-"], [class^="rc-"], [class*=" rc-"], [class^="rx-"], [class*=" rx-"]',
  PROFILE: /\/users\/(\d+)\/profile\b/i,
  FACE: 'img, .thumbnail-2d-container, .avatar-card-image, [class*="headshot"], [class*="avatar"]',
  // Títulos que cambia cada tema: [selector, máximo de letras]. Si el texto es más largo se queda como está.
  TARGETS: [
    ['#rk-home .rk-head h2 .rk-h-text', 28],
    ['#rk-home .rk-hero-title', 30],
    ['.container-header :is(h2, h3), .container-header + h2', 28],
    ['#container-main h1:not(.game-name):not(#rk-home *)', 22]
  ],

  run: function (s) { this.update(s); },
  update: function (s) {
    var t = rkLockedTheme(s);
    var kind = t && this.KINDS[t.id] && /^(www\.|web\.)?roblox\.com$/i.test(location.hostname) ? t.id : '';
    if (kind === (this.kind || '')) return;
    if (this.on) this.stop();
    this.kind = kind;
    this.k = this.KINDS[kind] || null;
    this.on = !!kind;
    if (this.on) this.start();
  },

  start: function () {
    var self = this;
    this.scans = 0;
    this.page();
    this.scan();
    // Solo cuenta lo que cambia Roblox: lo que pone RoCer0 (letras, cortina, efectos, contador de FPS) no vuelve a buscar.
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
    // Páginas que cambian sin recargar: cortina, fondo y menú al día.
    this.href = location.pathname;
    this.ticks = 0;
    this.poll = setInterval(function () {
      // Mientras no haya menú (Roblox lo pinta tarde o lo tiene escondido), se busca cada 2 s durante un rato.
      if (++self.ticks % 5 === 0 && self.ticks < 600 && !document.querySelector('[data-p5-nav] [data-p5-item]')) self.scan();
      if (location.pathname === self.href) return;
      self.href = location.pathname;
      self.page();
      self.wipe();
      self.scan();
    }, 400);
    this.onClick = function (e) { self.hit(e); };
    document.addEventListener('click', this.onClick, true);
    RX.diagInfo.fixed = function () { return self.report(); };
  },

  stop: function () {
    var self = this;
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
    clearInterval(this.poll);
    if (this.onClick) document.removeEventListener('click', this.onClick, true);
    // Se quita lo de los dos temas: así no queda nada al pasar de uno a otro.
    Object.keys(this.KINDS).forEach(function (id) {
      var k = self.KINDS[id];
      k.clear(document);
      var w = document.getElementById(k.wipe);
      if (w) w.remove();
      document.querySelectorAll('.' + k.hit).forEach(function (n) { n.remove(); });
      document.documentElement.classList.remove(k.turn, k.turn + '2');
    });
    this.MARKS.forEach(function (a) {
      document.querySelectorAll('[' + a + ']').forEach(function (n) { n.removeAttribute(a); });
    });
    rkPbSetWord(document.documentElement, '');
    this.box = null;
    this.on = false;
    delete RX.diagInfo.fixed;
  },

  // ¿Lo ha cambiado RoCer0? (dentro de las letras recortadas, de los avisos o del contador, o son piezas suyas)
  ours: function (m) {
    var k = this.k;
    var t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    if (t && t.closest('.p5-ransom, #rx-perf, #rx-toast, #' + k.wipe)) return true;
    if (m.type !== 'childList') return false;
    var mine = function (n) { return n.nodeType === 1 && (n.classList.contains('p5-ransom') || n.classList.contains(k.hit) || n.id === k.wipe); };
    return m.addedNodes.length + m.removedNodes.length > 0 &&
      Array.prototype.every.call(m.addedNodes, mine) && Array.prototype.every.call(m.removedNodes, mine);
  },

  scan: function () {
    if (!this.on) return;
    var k = this.k;
    this.scans++;
    this.TARGETS.forEach(function (tg) {
      document.querySelectorAll(tg[0]).forEach(function (el) { k.title(el, tg[1]); });
    });
    this.navs().forEach(this.nav, this);
    this.people();
  },

  // Menús laterales de la página: los conocidos (#navigation, .left-nav) y, si no hay, el bloque que reúna enlaces de
  // al menos 4 secciones distintas del menú de Roblox (Inicio, Perfil, Mensajes, Amigos, Avatar…) puestos uno debajo
  // de otro. Así se encuentra aunque Roblox cambie sus clases o deje de usar listas.
  navs: function () {
    var self = this, out = [];
    var add = function (n) { if (n && !out.some(function (o) { return o === n || o.contains(n) || n.contains(o); })) out.push(n); };
    document.querySelectorAll(this.NAVS).forEach(function (n) { if (self.keys(n).length >= 3) add(n); });
    if (out.length) return out;
    if (this.box && this.box.isConnected && this.keys(this.box).length >= 4) return [this.box];
    this.box = null;
    this.links(document).forEach(function (a) {
      if (out.some(function (o) { return o.contains(a); })) return;
      for (var p = a.parentElement, i = 0; p && p !== document.body && i < 14; p = p.parentElement, i++) {
        if (p.matches('main, #container-main, [role="main"], #wrap, #rk-home')) return;
        if (self.keys(p).length < 4) continue;
        if (self.stacked(p)) add(self.boxOf(p));
        return;
      }
    });
    this.box = out[0] || null;
    return out;
  },

  // Enlaces del menú de Roblox dentro de root (sin los del pie, el Inicio de RoCer0 ni las piezas de RoCer0).
  links: function (root) {
    var re = this.NAV_LINKS, not = this.NOT_NAV;
    return Array.prototype.filter.call(root.querySelectorAll('a[href]'), function (a) { return re.test(a.getAttribute('href')) && !a.closest(not); });
  },
  // Secciones distintas del menú a las que lleva root (Inicio, Amigos…; /users/123/inventory y /my/inventory cuentan igual).
  keys: function (root) {
    var re = this.NAV_LINKS, seen = {};
    this.links(root).forEach(function (a) {
      var m = re.exec(a.getAttribute('href'));
      if (m) seen[m[1].toLowerCase().replace(/^(users\/\d+\/|users\/|my\/)(?=inventory)/, '').replace(/^users\/connections$/, 'users/friends')] = 1;
    });
    return Object.keys(seen);
  },
  // ¿Los enlaces van uno debajo de otro (un menú lateral) y no en fila (una cabecera)?
  stacked: function (p) {
    var tops = {};
    this.links(p).forEach(function (a) { var r = a.getBoundingClientRect(); if (r.height) tops[Math.round(r.top / 8)] = 1; });
    return Object.keys(tops).length >= 4;
  },
  // El menú entero: el nav, aside o .left-nav que lo envuelva, si no abarca también el contenido de la página.
  boxOf: function (p) {
    var list = this.listOf(p);
    var box = list.closest('nav, aside, [role="navigation"], #navigation, .rbx-left-col, .left-nav');
    return box && !box.querySelector('main, #container-main, [role="main"]') && box.getBoundingClientRect().width < innerWidth * 0.5 ? box : list;
  },
  // La lista: el elemento más pequeño que tiene todos los enlaces del menú.
  listOf: function (box) {
    var all = this.keys(box).length, first = this.links(box)[0];
    if (!first) return box;
    for (var p = first.parentElement; p && p !== box; p = p.parentElement) if (this.keys(p).length >= all) return p;
    return box;
  },
  // Las filas de la lista: cada hijo con un solo enlace es una fila; los que tienen varios son sublistas (se abren).
  rows: function (el, out, depth) {
    var item = this.ITEM;
    Array.prototype.forEach.call(el.children, function (c) {
      if (c.matches('.p5-ransom, script, style, template, svg')) return;
      var n = c.matches(item) ? 1 : c.querySelectorAll(item).length;
      if (!n) return;
      if (n === 1 || depth >= 4) out.push(c); else this.rows(c, out, depth + 1);
    }, this);
    return out;
  },

  // Marca cada fila del menú (para el CSS) y le pone a su nombre la letra del tema.
  nav: function (box) {
    var set = function (n, a, v) { if (n.getAttribute(a) !== v) n.setAttribute(a, v); };
    var del = function (n, a) { if (n.hasAttribute(a)) n.removeAttribute(a); };
    set(box, 'data-p5-nav', '');
    var list = this.listOf(box);
    if (list !== box) set(list, 'data-p5-list', '');
    var here = this.here(), user = this.user(), self = this;
    this.rows(list, [], 0).forEach(function (row, i) {
      var a = row.matches(self.ITEM) ? row : row.querySelector(self.ITEM);
      var text = self.text(row);
      set(row, 'data-p5-row', String(i % 4));
      set(row, 'data-p5-n', String(Math.min(i, 8)));
      // Recuadros con frases (Premium, Roblox Plus): se quedan como panel, sin cambiar sus letras. Se notan por lo largo
      // del texto o por tener dos frases sin foto (el de Roblox Plus de 2026: «More fun for less Robux.» y «Subscribe»).
      var promo = text.length > 34 || (text.length > 20 && !row.querySelector('img') && self.phrases(row) >= 2 &&
        /plus|premium|upgrade|subscri|membership/i.test((a && a.getAttribute('href') || '') + ' ' + text));
      if (promo) {
        set(row, 'data-p5-promo', '');
        ['data-p5-item', 'data-p5-cmd', 'data-p5-here'].forEach(function (m) { del(a, m); });
        // La hoja (lo que reúne sus frases) y su llamada («Subscribe»: un enlace dentro o la última frase, si es corta).
        var bits = self.phraseEls(row), card = bits[0] || row;
        while (card !== row && !bits.every(function (b) { return card.contains(b); })) card = card.parentElement;
        set(card, 'data-p5-card', '');
        var cta = Array.prototype.find.call(card.querySelectorAll('a[href], button'), function (x) { return x !== card; }) ||
          (bits.length > 1 && self.text(bits[bits.length - 1]).length <= 20 ? bits[bits.length - 1] : null);
        if (cta) set(cta, 'data-p5-cta', '');
        return;
      }
      del(row, 'data-p5-promo');
      // Tu nombre de usuario (con tu cara): placa aparte, sin la letra del tema.
      var href = a.getAttribute('href') || '';
      var isUser = !!a.querySelector('img') || (!!user && (text === user.name || text === user.displayName || text === '@' + user.name ||
        (!!user.id && new RegExp('/users/' + user.id + '/profile\\b').test(href))));
      set(a, 'data-p5-item', '');
      set(a, 'data-p5-cmd', isUser ? 'user' : '');
      var p = '';
      if (href) try { p = RX.stripLocale(new URL(href, location.href).pathname).replace(/\/+$/, '') || '/'; } catch (e) { /* enlace raro */ }
      if (!!p && p === here) set(a, 'data-p5-here', ''); else del(a, 'data-p5-here');
      if (isUser) return;
      var label = self.parts(a);
      if (label) set(label, 'data-p5-label', '');
      // Sin hijos (el texto va suelto dentro del enlace): la letra va en el propio enlace.
      self.k.label(label || a);
    });
  },

  // Listas de personas: amigos en el Inicio y en los perfiles, la página de amigos, miembros de comunidades, gente
  // buscada… Cada tarjeta lleva al perfil de alguien con su cara dentro del enlace, y la lista es lo que reúne a varias.
  // Se reconocen así y no por sus clases (las que usa Roblox ahora también están en el CSS de cada tema por si esto
  // llega tarde).
  people: function () {
    var self = this, lists = [], cache = new Map();
    var who = function (el) {
      if (cache.has(el)) return cache.get(el);
      var ids = {};
      (el.matches('a[href]') ? [el] : []).concat(Array.prototype.slice.call(el.querySelectorAll('a[href*="/users/"]'))).forEach(function (a) {
        var m = self.PROFILE.exec(a.getAttribute('href') || '');
        if (m) ids[m[1]] = 1;
      });
      var n = Object.keys(ids).length;
      cache.set(el, n);
      return n;
    };
    document.querySelectorAll('a[href*="/users/"]').forEach(function (a) {
      if (a.closest('[data-p5-person]') || !self.PROFILE.test(a.getAttribute('href') || '')) return;
      if (!a.querySelector(self.FACE) || self.excluded(a)) return;
      // La tarjeta: lo más grande que solo lleva a esta persona. Su madre, que lleva a varias, es la lista.
      var p = a.parentElement;
      for (var i = 0; p && p !== document.body && i < 8 && who(p) < 2; i++) p = p.parentElement;
      if (p && p !== document.body && who(p) >= 2 && lists.indexOf(p) < 0) lists.push(p);
    });
    lists.forEach(function (list) {
      var tiles = Array.prototype.filter.call(list.children, function (c) {
        if (who(c) !== 1 || !c.querySelector(self.FACE)) return false;
        var r = c.getBoundingClientRect();
        return r.width > 0 && r.width <= 520 && r.height <= 520;
      });
      if (tiles.length < 2) return;
      if (!list.hasAttribute('data-p5-people')) list.setAttribute('data-p5-people', '');
      tiles.forEach(function (tile, i) { self.person(tile, i); });
    });
  },

  // ¿Está en algo que no es una lista de gente? (html y body llevan clases rk-/rx- de RoCer0: esos no cuentan)
  excluded: function (n) {
    var c = n.closest(this.PEOPLE_NOT);
    return !!c && c !== document.documentElement && c !== document.body;
  },

  // Marca una tarjeta: la cara (el marco que gira) y su nombre y la línea de debajo (para las letras).
  person: function (tile, i) {
    var set = function (n, a, v) { if (n && n.getAttribute(a) !== v) n.setAttribute(a, v); };
    set(tile, 'data-p5-person', String(i % 4));
    var link = Array.prototype.find.call(tile.querySelectorAll('a[href*="/users/"]'), function (a) { return this.PROFILE.test(a.getAttribute('href') || '') && a.querySelector(this.FACE); }, this);
    var img = link && link.querySelector('img');
    var face = link && (link.querySelector('.thumbnail-2d-container, .avatar-card-image, [class*="headshot"]') || (img && img.parentElement !== link ? img.parentElement : img));
    if (face) set(face, 'data-p5-face', '');
    var texts = [], w = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
    for (var n = w.nextNode(); n && texts.length < 2; n = w.nextNode()) {
      var el = n.parentElement;
      if (!n.nodeValue.trim() || !el || texts.indexOf(el) >= 0) continue;
      if (el.closest('[data-p5-face], .avatar-status, .p5-ransom, .rk-trash-tick, script, style')) continue;
      // Los botones de la tarjeta (aceptar, chatear…) no son su nombre; el botón que envuelve toda la tarjeta, sí.
      var b = el.closest('button, .btn, [class*="btn-"]');
      if (b && tile.contains(b) && !(link && b.contains(link))) continue;
      texts.push(el);
    }
    if (texts[0]) set(texts[0], 'data-p5-pname', '');
    if (texts[1] && !texts[1].contains(texts[0]) && !texts[0].contains(texts[1])) set(texts[1], 'data-p5-psub', '');
  },

  // El texto de un elemento sin el de las letras recortadas que le haya puesto Daniel (si no, al volver a mirar el
  // menú, cada nombre contaría el doble y una entrada larga pasaría por un recuadro).
  text: function (el) {
    var out = '', w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (var n = w.nextNode(); n; n = w.nextNode()) if (!(n.parentElement && n.parentElement.closest('.p5-ransom'))) out += n.nodeValue;
    return out.replace(/\s+/g, ' ').trim();
  },

  // Los trozos de texto con letras (no contadores) que hay dentro: una entrada tiene uno; un recuadro con frases, más.
  phraseEls: function (el) {
    var seen = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (var n = w.nextNode(); n; n = w.nextNode()) {
      var p = n.parentElement, t = n.nodeValue.trim();
      if (!t || !p || p.closest('.p5-ransom') || /^[\d.,]+[kKmM]?\+?$/.test(t) || seen.indexOf(p) >= 0) continue;
      seen.push(p);
    }
    return seen;
  },
  phrases: function (el) { return this.phraseEls(el).length; },

  // Iconos (y capas sin texto), contadores y el nombre de una entrada, bajando por las cajas que solo envuelven.
  parts: function (el) {
    var label = null;
    Array.prototype.forEach.call(el.children, function (c) {
      if (c.classList.contains('p5-ransom')) return;
      var t = this.text(c);
      if (!t) { if (!c.querySelector('img') && !c.hasAttribute('data-p5-icon')) c.setAttribute('data-p5-icon', ''); return; }
      if (/^[\d.,]+[kKmM]?\+?$/.test(t)) { if (!c.hasAttribute('data-p5-badge')) c.setAttribute('data-p5-badge', ''); return; }
      if (label) return;
      // Una caja con el nombre y algo más dentro (el contador): se mira por dentro.
      var inner = Array.prototype.filter.call(c.children, function (k) { return !k.classList.contains('p5-ransom') && this.text(k); }, this);
      label = inner.length > 1 ? (this.parts(c) || c) : c;
    }, this);
    return label;
  },

  here: function () { return RX.path().replace(/\/+$/, '') || '/'; },

  // La palabra de la sección (solo los temas con words), en el html como variables de CSS (ver rkPbSetWord).
  page: function () {
    rkPbSetWord(document.documentElement, this.k && this.k.words ? rkPbWord(location.pathname) : '');
  },

  user: function () {
    var m = document.querySelector('meta[name="user-data"]');
    return m ? { id: m.getAttribute('data-userid') || '', name: m.getAttribute('data-name') || '', displayName: m.getAttribute('data-displayname') || '' } : null;
  },

  reduced: function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; },

  // Cortina al cambiar de página sin recargar; el fondo da otra vuelta corta.
  wipe: function () {
    if (this.reduced()) return;
    var k = this.k;
    var old = document.getElementById(k.wipe);
    if (old) old.remove();
    var w = document.createElement('div');
    w.id = k.wipe;
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, k.wipeMs);
    // Dos nombres para la misma vuelta: al cambiar de uno a otro, la animación vuelve a empezar.
    var root = document.documentElement, odd = root.classList.contains(k.turn);
    root.classList.toggle(k.turn, !odd);
    root.classList.toggle(k.turn + '2', odd);
  },

  // Efecto donde haces clic (botones y enlaces): el golpe rojo y negro de Daniel o la chispa de Pablo.
  hit: function (e) {
    if (!e.isTrusted || e.button !== 0 || this.reduced()) return;
    var t = e.target && e.target.closest && e.target.closest('a, button, [role="button"], .btn, label');
    if (!t || t.closest('input, textarea, select')) return;
    var now = Date.now();
    if (now - (this.lastHit || 0) < 120) return;
    this.lastHit = now;
    var n = document.createElement('div');
    n.className = this.k.hit;
    n.style.left = e.clientX + 'px';
    n.style.top = e.clientY + 'px';
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, this.k.hitMs);
  },

  // Para el diagnóstico: qué menú ha encontrado, cuántas filas ha marcado y cómo es una fila por dentro (sin textos).
  report: function () {
    var self = this, navs = this.navs();
    var item = document.querySelector('[data-p5-nav] [data-p5-item]:not([data-p5-cmd="user"])');
    var shape = '';
    if (item) {
      var row = item.closest('[data-p5-row]') || item, chain = [];
      for (var n = row; n && !n.hasAttribute('data-p5-nav'); n = n.parentElement) chain.push(RX.diagName(n));
      shape = ' · fila: ' + chain.slice(0, 4).join(' < ') + ' · dentro: ' + Array.prototype.map.call(item.children, function (c) { return RX.diagName(c); }).join(' + ');
    }
    return this.k.name + ': menús ' + navs.length + ' (' + navs.map(function (n) { return RX.diagName(n) + ', secciones ' + self.keys(n).length; }).join('; ') + ')' +
      ' · filas ' + document.querySelectorAll('[data-p5-nav] [data-p5-row]').length +
      ' · entradas ' + document.querySelectorAll('[data-p5-nav] [data-p5-item]').length +
      ' · con letras ' + document.querySelectorAll('[data-p5-nav] :is([data-p5], [data-pb])').length +
      ' · recuadros ' + document.querySelectorAll('[data-p5-nav] [data-p5-promo]').length +
      ' · títulos ' + document.querySelectorAll(':is([data-p5], [data-pb]):not([data-p5-nav] *)').length +
      ' · búsquedas ' + this.scans + shape +
      ' · personas: listas ' + document.querySelectorAll('[data-p5-people]').length +
      ' (' + Array.prototype.slice.call(document.querySelectorAll('[data-p5-people]'), 0, 3).map(function (n) { return RX.diagName(n); }).join('; ') + ')' +
      ' · tarjetas ' + document.querySelectorAll('[data-p5-person]').length +
      ' · caras ' + document.querySelectorAll('[data-p5-face]').length +
      ' · amigos de Roblox ' + document.querySelectorAll('.friends-carousel-tile, .avatar-card').length;
  }
});
