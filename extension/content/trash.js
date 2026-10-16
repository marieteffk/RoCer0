// Papelera de amigos: un botón con una papelera en el borde derecho de tu página de Amigos. Al pulsarlo se entra en
// el modo borrar: cada amigo se elige con un clic, varios a la vez manteniendo pulsado el ratón y arrastrando (o con
// Mayús, todos los que hay entre dos) y, cuando lo confirmas, se eliminan uno detrás de otro.
// Solo en tu propia lista y en la pestaña Amigos: nunca en la de otra persona, en Siguiendo, Seguidores ni Solicitudes.
// Las peticiones van solo a Roblox (friends.roblox.com) y con la sesión de la cuenta que se ve en la página.
RX.features.push({
  id: 'trash',
  PROFILE: /\/users\/(\d+)\/profile\b/i,
  FACE: 'img, .thumbnail-2d-container, .avatar-card-image, [class*="headshot"], [class*="avatar"]',
  // Lo que nunca es una tarjeta de amigo, aunque lleve a un perfil con su cara.
  NOT: '#rk-trash, #rk-trash-bar, .rx-modal-wrap, [data-p5-nav], #navigation, .left-nav, #header, .rbx-header, footer, #footer-container, .dropdown-menu, .popover, #rk-home',
  // Solicitudes de amistad (con Aceptar o Ignorar): no son amigos todavía y no se pueden tirar.
  REQUEST: '.accept-friend, .ignore-friend, [class*="accept-friend"], [class*="ignore-friend"], [class*="friend-request"]',
  // Ritmo. Roblox no publica un límite, pero en la práctica corta hacia las 10 eliminaciones por minuto. Las 8 primeras
  // van seguidas (0,7 s entre una y otra) y las demás, una cada 6,5 s más o menos. Si aun así corta (429), se espera lo
  // que diga Roblox o 1 minuto (luego 2, 4 y 5), se reintenta el mismo amigo y desde ahí se va un 25 % más despacio. Si
  // corta 4 veces seguidas, se para y los que faltan siguen elegidos.
  BURST: 8,
  GAP: 700,
  PACE: 6500,
  WAITS: [60000, 120000, 240000, 300000],

  run: function (s) {
    var self = this;
    this.sel = new Map();
    this.gone = {};
    this.update(s);
    RX.onUrlChange(function () { self.sync(); });
    window.addEventListener('hashchange', function () { self.sync(); });
  },
  // Roblox pinta la lista (y cambia de página dentro de ella) sin recargar: mientras estás en tu página de amigos, se
  // vuelve a mirar cuando cambia algo que no es de RoCer0. En las demás páginas no se mira nada.
  watch: function (on) {
    var self = this;
    if (!on) { if (this.obs) { this.obs.disconnect(); this.obs = null; } return; }
    if (this.obs) return;
    var timer = null;
    this.obs = new MutationObserver(function (list) {
      if (timer) return;
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target;
        if (t.nodeType === 1 && t.closest('#rk-trash, #rk-trash-bar, #rk-trash-lasso, .rk-trash-tick, .rx-modal-wrap, #rx-toast')) continue;
        timer = setTimeout(function () { timer = null; self.sync(); }, 250);
        return;
      }
    });
    this.obs.observe(document.body, { childList: true, subtree: true });
  },
  update: function (s) {
    this.enabled = s['trash.enabled'] !== false;
    this.sync();
  },

  // ¿Es tu propia página de amigos, en la pestaña Amigos, con la sesión iniciada?
  ownPage: function () {
    var me = RX.pageUser();
    if (!me) return false;
    var m = /^\/users\/(?:(\d+)\/)?(friends|connections)\/?$/i.exec(RX.path());
    if (!m || (m[1] && Number(m[1]) !== me.id)) return false;
    var h = decodeURIComponent(location.hash || '').toLowerCase();
    return !h || h === '#' || h === '#!' || /^#!?\/?(friends|connections)\b/.test(h);
  },
  wanted: function () { return this.enabled && RX.isTop && this.ownPage(); },

  // Pone o quita el botón según la página; con el modo puesto, vuelve a marcar las tarjetas que haya pintado Roblox.
  sync: function () {
    if (!this.sel || !document.body) return;
    var want = this.wanted();
    this.watch(want);
    if (!want) {
      if (this.mode) this.exit(true);
      if (this.btn) { this.btn.remove(); this.btn = null; }
      return;
    }
    if (!this.btn || !this.btn.isConnected) this.button();
    if (this.mode && !this.drag) this.mark();
  },

  // ---------- El botón ----------
  // Una papelera dibujada a mano (SVG propio): al entrar en el modo borrar se le abre la tapa y, con amigos elegidos,
  // asoman papeles arrugados. Cada pieza es [etiqueta, atributos, hijos] y se dibuja con createElementNS.
  CAN: ['svg', { viewBox: '0 0 48 48', 'aria-hidden': 'true', focusable: 'false' }, [
    ['g', { class: 'rk-trash-paper', fill: '#fff', stroke: 'var(--rk-trash-ink, currentColor)', 'stroke-width': '1.4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, [
      ['path', { d: 'M14.6 16.4l1.5-4 3.6-1.1 3.2 1.9.7 3.8-2.6 2.8-3.9.3z' }], ['path', { d: 'M17.4 13.6l1.8 2.2 2.6-.9' }],
      ['path', { d: 'M24.4 15.6l1.3-3.7 3.4-1.2 3.1 1.7.5 3.5-2.3 2.6-3.7.2z' }], ['path', { d: 'M27.2 12.9l.6 2.6 2.7.4' }]]],
    ['g', { class: 'rk-trash-lid' }, [
      ['path', { d: 'M18.5 9.5V7.8c0-1 .8-1.8 1.8-1.8h7.4c1 0 1.8.8 1.8 1.8v1.7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round' }],
      ['rect', { x: '8.5', y: '9.5', width: '31', height: '5.4', rx: '2.2', fill: 'var(--rk-trash-lid, transparent)', stroke: 'currentColor', 'stroke-width': '2.2' }]]],
    ['path', { class: 'rk-trash-body', d: 'M11.5 17.5h25l-2.3 22.3a3.2 3.2 0 0 1-3.2 2.9H17a3.2 3.2 0 0 1-3.2-2.9z', fill: 'var(--rk-trash-fill, transparent)', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linejoin': 'round' }],
    ['path', { d: 'M19.2 22.5l.6 14.5M24 22.5V37M28.8 22.5l-.6 14.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' }]]],
  TICK: ['svg', { viewBox: '0 0 24 24' }, [['path', { d: 'M6 12.5l4 4 8-9', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]]],
  svg: function (spec) {
    var self = this, n = document.createElementNS('http://www.w3.org/2000/svg', spec[0]);
    Object.keys(spec[1]).forEach(function (k) { n.setAttribute(k, spec[1][k]); });
    (spec[2] || []).forEach(function (c) { n.appendChild(self.svg(c)); });
    return n;
  },
  button: function () {
    var self = this;
    if (this.btn) this.btn.remove();
    var b = this.btn = RX.el('button', { id: 'rk-trash', type: 'button', 'aria-pressed': this.mode ? 'true' : 'false',
      'aria-label': 'Modo borrar amigos', title: 'Papelera: elegir amigos para eliminar' });
    b.appendChild(this.svg(this.CAN));
    b.appendChild(RX.el('span', { class: 'rk-trash-count', 'aria-hidden': 'true' }));
    b.addEventListener('click', function () { if (self.mode) self.exit(); else self.enter(); });
    document.body.appendChild(b);
    this.count();
  },

  // ---------- Modo borrar ----------
  enter: function () {
    if (this.mode || !this.wanted()) return;
    var self = this;
    this.mode = true;
    this.btn.setAttribute('aria-pressed', 'true');
    document.documentElement.classList.add('rk-trash-mode');
    this.bar();
    this.mark();
    this.on = {
      click: function (e) { self.click(e); },
      down: function (e) { self.down(e); },
      drag: function (e) { if (e.target.closest && e.target.closest('[data-rk-trash-id]')) e.preventDefault(); },
      key: function (e) {
        // Esc sale del modo (si hay una ventana abierta, la cierra ella; mientras se borra, no se sale).
        if (e.key === 'Escape' && !self.dialog && !self.busy && !document.querySelector('.rx-modal-wrap')) self.exit();
      }
    };
    window.addEventListener('click', this.on.click, true);
    window.addEventListener('pointerdown', this.on.down, true);
    window.addEventListener('dragstart', this.on.drag, true);
    document.addEventListener('keydown', this.on.key);
    // En la ventana y en captura: antes que nada de Roblox, así un clic en un amigo nunca abre su perfil.
    if (!this.tiles().length) this.say('No veo a ningún amigo en esta página. Si tu lista aún está cargando, espera un momento.');
  },
  // Sale del modo sin borrar nada. Mientras se está borrando no se sale, salvo que la página ya no sea la de amigos.
  exit: function (force) {
    if (!this.mode || (this.busy && !force)) return;
    if (this.busy) this.stopReq = true;
    this.mode = false;
    this.endDrag();
    if (this.on) {
      window.removeEventListener('click', this.on.click, true);
      window.removeEventListener('pointerdown', this.on.down, true);
      window.removeEventListener('dragstart', this.on.drag, true);
      document.removeEventListener('keydown', this.on.key);
      this.on = null;
    }
    document.documentElement.classList.remove('rk-trash-mode');
    if (this.btn) this.btn.setAttribute('aria-pressed', 'false');
    if (this.barEl) { this.barEl.remove(); this.barEl = null; }
    if (this.dialog) this.dialog.close();
    this.sel.clear();
    this.last = null;
    document.querySelectorAll('.rk-trash-tick').forEach(function (n) { n.remove(); });
    ['data-rk-trash', 'data-rk-trash-id', 'data-rk-trash-pos', 'data-rk-trash-hot'].forEach(function (a) {
      document.querySelectorAll('[' + a + ']').forEach(function (n) { n.removeAttribute(a); });
    });
    this.count();
  },

  // ---------- Tarjetas de amigos ----------
  // Cada tarjeta: lo más grande que solo lleva al perfil de ese amigo (con su cara), dentro de la lista. En la página de
  // Roblox de ahora es li.avatar-card (con el id del amigo); si cambia, se encuentra igual por los enlaces.
  tiles: function () {
    var self = this, me = RX.pageUser(), out = [], seen = {}, cache = new Map();
    var root = document.querySelector('#friends-web-app, [id$="friends-web-app"], [class*="friends-web-app"], #container-main, main, [role="main"]') || document.body;
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
    root.querySelectorAll('a[href*="/users/"]').forEach(function (a) {
      var m = self.PROFILE.exec(a.getAttribute('href') || '');
      if (!m || !a.querySelector(self.FACE) || a.closest(self.NOT)) return;
      var id = Number(m[1]);
      if (!id || seen[id] || (me && id === me.id)) return;
      var tile = a.closest('.avatar-card');
      if (!tile || who(tile) !== 1) {
        tile = a;
        for (var p = a.parentElement; p && p !== root && p !== document.body && who(p) < 2; p = p.parentElement) {
          var r = p.getBoundingClientRect();
          if (r.width > 520 || r.height > 520) break;
          tile = p;
        }
      }
      // En la tarjeta de Roblox el id del amigo también va en la propia tarjeta: si no coincide con el del enlace, mejor
      // no tocarla.
      if (tile.matches('.avatar-card[id]') && /^\d+$/.test(tile.id) && Number(tile.id) !== id) return;
      if (tile.querySelector(self.REQUEST) || tile.closest(self.REQUEST)) return;
      var r2 = tile.getBoundingClientRect();
      if (!r2.width || !r2.height) return;
      seen[id] = 1;
      out.push({ tile: tile, id: id, link: a });
    });
    // Cuentas borradas o bloqueadas: Roblox las deja en la lista, a veces sin enlace al perfil. Se reconocen por el id
    // de la tarjeta.
    root.querySelectorAll('li.avatar-card[id]').forEach(function (li) {
      var id = /^\d+$/.test(li.id) ? Number(li.id) : 0;
      if (!id || seen[id] || (me && id === me.id) || li.closest(self.NOT)) return;
      if (li.querySelector(self.REQUEST)) return;
      // Si dentro hay un enlace al perfil de otra persona, algo no cuadra: se deja.
      var mixed = Array.prototype.some.call(li.querySelectorAll('a[href*="/users/"]'), function (a) {
        var m = self.PROFILE.exec(a.getAttribute('href') || '');
        return m && Number(m[1]) !== id;
      });
      if (mixed) return;
      var r3 = li.getBoundingClientRect();
      if (!r3.width || !r3.height) return;
      seen[id] = 1;
      out.push({ tile: li, id: id, link: null });
    });
    return out;
  },
  // Nombre, @usuario y cara de una tarjeta, para la lista de la confirmación.
  who: function (t) {
    var tile = t.tile, name = '', user = '';
    var nameEl = tile.querySelector('.avatar-name, .friends-carousel-display-name, [class*="display-name"], [class*="displayName"], [data-p5-pname]');
    var w = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
    for (var n = w.nextNode(); n; n = w.nextNode()) {
      var v = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (!v || (n.parentElement && n.parentElement.closest('.rk-trash-tick, .p5-ransom, .avatar-status, button'))) continue;
      if (v.charAt(0) === '@') { if (!user) user = v.slice(1); } else if (!name) name = v;
    }
    if (nameEl && nameEl.textContent.trim()) name = nameEl.textContent.replace(/\s+/g, ' ').trim();
    var img = tile.querySelector('img');
    return { id: t.id, name: name || (img && img.getAttribute('alt')) || user || ('#' + t.id), user: user, img: img ? img.currentSrc || img.src : '' };
  },

  // Marca cada tarjeta (elegible, elegida o ya eliminada) y le pone su casilla.
  mark: function () {
    var self = this;
    this.tiles().forEach(function (t) {
      var st = self.gone[t.id] ? 'gone' : self.sel.has(t.id) ? 'on' : '';
      if (t.tile.getAttribute('data-rk-trash') !== st) t.tile.setAttribute('data-rk-trash', st);
      if (t.tile.getAttribute('data-rk-trash-id') !== String(t.id)) t.tile.setAttribute('data-rk-trash-id', String(t.id));
      // La casilla va por encima de la tarjeta: si la tarjeta no está posicionada, se le pone «relative» (solo entonces).
      if (!t.tile.hasAttribute('data-rk-trash-pos') && getComputedStyle(t.tile).position === 'static') t.tile.setAttribute('data-rk-trash-pos', '');
      if (!t.tile.querySelector(':scope > .rk-trash-tick')) {
        var tick = RX.el('span', { class: 'rk-trash-tick', 'aria-hidden': 'true' });
        tick.appendChild(self.svg(self.TICK));
        t.tile.appendChild(tick);
      }
    });
    this.count();
  },

  pick: function (t, on) {
    if (this.gone[t.id]) return;
    if (on) this.sel.set(t.id, this.who(t)); else this.sel.delete(t.id);
    t.tile.setAttribute('data-rk-trash', on ? 'on' : '');
  },
  tileOf: function (node) {
    var tile = node && node.closest && node.closest('[data-rk-trash-id]');
    if (!tile) return null;
    var id = Number(tile.getAttribute('data-rk-trash-id'));
    return this.tiles().filter(function (t) { return t.id === id; })[0] || null;
  },

  // Clic en una tarjeta: la elige o la suelta (y no abre el perfil). Con Mayús, todas las de en medio.
  click: function (e) {
    if (e.button !== 0 || !e.target.closest) return;
    if (e.target.closest('#rk-trash, #rk-trash-bar, .rx-modal-wrap')) return;
    var tile = e.target.closest('[data-rk-trash-id]');
    if (!tile) return;
    e.preventDefault();
    e.stopPropagation();
    if (this.dragged || this.busy) return;
    var t = this.tileOf(tile);
    if (!t) return;
    var on = !this.sel.has(t.id);
    if (e.shiftKey && this.last) {
      var all = this.tiles(), a = -1, b = -1, last = this.last;
      all.forEach(function (x, i) { if (x.id === last) a = i; if (x.id === t.id) b = i; });
      if (a >= 0 && b >= 0) {
        for (var i = Math.min(a, b); i <= Math.max(a, b); i++) this.pick(all[i], on);
        this.last = t.id;
        this.count();
        return;
      }
    }
    this.pick(t, on);
    this.last = t.id;
    this.count();
  },

  // Mantener pulsado y arrastrar: un recuadro que elige a todos los que toca (o los suelta, si empiezas sobre uno ya
  // elegido). Con el ratón cerca del borde de arriba o de abajo, la página se mueve sola.
  down: function (e) {
    if (e.button !== 0 || e.pointerType === 'touch' || this.busy || this.dialog) return;
    if (!e.target.closest || e.target.closest('#rk-trash, #rk-trash-bar, .rx-modal-wrap, input, textarea, select, [contenteditable]')) return;
    var all = this.tiles();
    if (!all.length) return;
    var start = this.tileOf(e.target);
    // Fuera de las tarjetas, solo dentro de la zona de la lista.
    if (!start) {
      var box = all.reduce(function (acc, t) {
        var r = t.tile.getBoundingClientRect();
        return acc ? { l: Math.min(acc.l, r.left), t: Math.min(acc.t, r.top), r: Math.max(acc.r, r.right), b: Math.max(acc.b, r.bottom) } : { l: r.left, t: r.top, r: r.right, b: r.bottom };
      }, null);
      if (e.clientX < box.l - 40 || e.clientX > box.r + 40 || e.clientY < box.t - 40 || e.clientY > box.b + 40) return;
    }
    e.preventDefault();
    var self = this;
    this.drag = { x: e.clientX + scrollX, y: e.clientY + scrollY, cx: e.clientX, cy: e.clientY, add: !(start && this.sel.has(start.id)), moved: false, all: all };
    this.on.move = function (ev) { self.move(ev); };
    this.on.up = function (ev) { self.up(ev); };
    window.addEventListener('pointermove', this.on.move, true);
    window.addEventListener('pointerup', this.on.up, true);
    window.addEventListener('pointercancel', this.on.up, true);
  },
  move: function (e) {
    var d = this.drag;
    if (!d) return;
    d.cx = e.clientX;
    d.cy = e.clientY;
    if (!d.moved && Math.hypot(e.clientX + scrollX - d.x, e.clientY + scrollY - d.y) < 6) return;
    if (!d.moved) {
      d.moved = true;
      this.lasso = RX.el('div', { id: 'rk-trash-lasso', 'data-mode': d.add ? 'add' : 'remove' });
      document.body.appendChild(this.lasso);
      this.autoScroll();
    }
    this.paint();
  },
  // El recuadro (en coordenadas de la página, para que siga bien al moverse la página) y quién queda dentro.
  paint: function () {
    var d = this.drag, l = this.lasso;
    if (!d || !l) return;
    var x2 = d.cx + scrollX, y2 = d.cy + scrollY;
    var L = Math.min(d.x, x2), T = Math.min(d.y, y2), R = Math.max(d.x, x2), Bt = Math.max(d.y, y2);
    l.style.left = (L - scrollX) + 'px';
    l.style.top = (T - scrollY) + 'px';
    l.style.width = (R - L) + 'px';
    l.style.height = (Bt - T) + 'px';
    var self = this, hits = {};
    d.hits = [];
    d.all.forEach(function (t) {
      if (self.gone[t.id] || !t.tile.isConnected) return;
      var r = t.tile.getBoundingClientRect();
      var hit = r.right + scrollX > L && r.left + scrollX < R && r.bottom + scrollY > T && r.top + scrollY < Bt;
      if (hit) { d.hits.push(t); hits[t.id] = 1; }
      // Vista previa: lo que quedará elegido al soltar.
      var will = hit ? d.add : self.sel.has(t.id);
      if (t.tile.getAttribute('data-rk-trash') !== (will ? 'on' : '')) t.tile.setAttribute('data-rk-trash', will ? 'on' : '');
      t.tile.toggleAttribute('data-rk-trash-hot', hit);
    });
    var n = 0;
    this.sel.forEach(function (v, id) { if (!hits[id]) n++; });
    this.count(d.add ? n + d.hits.length : n);
  },
  autoScroll: function () {
    var self = this;
    var step = function () {
      var d = self.drag;
      if (!d || !d.moved) return;
      var edge = 60, v = 0;
      if (d.cy < edge) v = -Math.ceil((edge - d.cy) / 4);
      else if (d.cy > innerHeight - edge) v = Math.ceil((d.cy - innerHeight + edge) / 4);
      if (v) { scrollBy(0, v); self.paint(); }
      self.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  up: function () {
    var d = this.drag, self = this;
    if (d && d.moved) {
      (d.hits || []).forEach(function (t) { self.pick(t, d.add); });
      if (d.hits && d.hits.length) this.last = d.hits[d.hits.length - 1].id;
      // El clic que llega justo al soltar no cuenta como otro clic.
      this.dragged = true;
      setTimeout(function () { self.dragged = false; }, 0);
    }
    this.endDrag();
    this.mark();
  },
  endDrag: function () {
    cancelAnimationFrame(this.raf);
    if (this.on && this.on.move) {
      window.removeEventListener('pointermove', this.on.move, true);
      window.removeEventListener('pointerup', this.on.up, true);
      window.removeEventListener('pointercancel', this.on.up, true);
      this.on.move = this.on.up = null;
    }
    if (this.lasso) { this.lasso.remove(); this.lasso = null; }
    document.querySelectorAll('[data-rk-trash-hot]').forEach(function (n) { n.removeAttribute('data-rk-trash-hot'); });
    this.drag = null;
  },

  // ---------- Barra del modo borrar ----------
  bar: function () {
    var self = this, el = RX.el;
    if (this.barEl) this.barEl.remove();
    this.barEl = el('div', { id: 'rk-trash-bar', role: 'region', 'aria-label': 'Papelera de amigos' }, [
      el('div', { class: 'rk-trash-head' }, [el('b', { text: 'Modo borrar' }), el('span', { class: 'rk-trash-n', 'aria-live': 'polite' })]),
      el('p', { class: 'rk-trash-help', text: 'Haz clic en los amigos que quieras quitar o mantén pulsado el ratón y arrastra para coger a varios.' }),
      el('div', { class: 'rk-trash-progress', hidden: true }, [el('i')]),
      el('p', { class: 'rk-trash-msg', hidden: true }),
      el('div', { class: 'rk-trash-actions' }, [
        el('button', { class: 'rx-btn rx-btn-small rk-trash-all', type: 'button', onclick: function () { self.all(true); } }, ['Todos']),
        el('button', { class: 'rx-btn rx-btn-small rk-trash-none', type: 'button', onclick: function () { self.all(false); } }, ['Ninguno']),
        el('button', { class: 'rx-btn rk-trash-go', type: 'button', disabled: true, onclick: function () { self.confirm(); } }, [RX.icon('trash'), el('span', { text: 'Eliminar' })]),
        el('button', { class: 'rx-btn rx-btn-small rk-trash-stop', type: 'button', hidden: true, onclick: function () { self.stopReq = true; this.disabled = true; } }, ['Parar'])
      ])
    ]);
    document.body.appendChild(this.barEl);
    this.count();
  },
  all: function (on) {
    var self = this;
    if (this.busy) return;
    this.tiles().forEach(function (t) { self.pick(t, on); });
    this.count();
  },
  // Número de elegidos: en el botón, en la barra y en «Eliminar».
  count: function (preview) {
    var n = typeof preview === 'number' ? preview : this.sel ? this.sel.size : 0;
    if (this.btn) {
      this.btn.querySelector('.rk-trash-count').textContent = n ? String(n) : '';
      this.btn.classList.toggle('rk-trash-full', n > 0);
      // La papelera da un saltito cada vez que le cae alguien más.
      if (n > (this.shown || 0)) {
        var b = this.btn;
        b.classList.remove('rk-trash-bump');
        void b.offsetWidth;
        b.classList.add('rk-trash-bump');
      }
      this.shown = n;
    }
    if (!this.barEl) return;
    this.barEl.querySelector('.rk-trash-n').textContent = n === 1 ? '1 elegido' : n + ' elegidos';
    var go = this.barEl.querySelector('.rk-trash-go');
    go.disabled = !n || !!this.busy;
    go.querySelector('span').textContent = n ? 'Eliminar (' + n + ')' : 'Eliminar';
  },
  say: function (text, kind) {
    if (!this.barEl) return;
    var m = this.barEl.querySelector('.rk-trash-msg');
    m.hidden = !text;
    m.textContent = text || '';
    m.setAttribute('data-kind', kind || '');
  },

  // ---------- Confirmar y eliminar ----------
  confirm: function () {
    if (this.busy || this.dialog || !this.sel.size) return;
    var self = this, el = RX.el, list = Array.from(this.sel.values());
    var n = list.length, ok = false;
    var who = el('ul', { class: 'rk-trash-list' }, list.map(function (f) {
      return el('li', {}, [f.img ? el('img', { src: f.img, alt: '' }) : el('span', { class: 'rk-trash-ph' }),
        el('div', {}, [el('b', { text: f.name }), f.user && f.user !== f.name ? el('span', { text: '@' + f.user }) : null])]);
    }));
    var cancel = el('button', { class: 'rx-btn', type: 'button', onclick: function () { self.dialog.close(); } }, ['Cancelar']);
    var go = el('button', { class: 'rx-btn rk-trash-danger', type: 'button', onclick: function () { ok = true; self.dialog.close(); } },
      [RX.icon('trash'), el('span', { text: n === 1 ? 'Eliminar a 1 amigo' : 'Eliminar a ' + n + ' amigos' })]);
    // Con muchos, se avisa de que irá poco a poco (Roblox no deja quitar muchos seguidos).
    var left = this.eta(-1, n, this.PACE), mins = Math.round(left / 60000);
    var slow = n > this.BURST ? el('p', { class: 'rk-trash-note', text: 'Roblox no deja quitar muchos amigos seguidos, así que irá poco a poco: ' +
      (left < 60000 ? 'tardará menos de un minuto' : mins <= 1 ? 'tardará cerca de 1 minuto' : 'tardará unos ' + mins + ' minutos') +
      '. Deja esta página abierta; puedes pararlo cuando quieras.' }) : null;
    this.dialog = RX.modal('¿Vaciar la papelera?', el('div', { class: 'rk-trash-confirm' }, [
      el('p', { class: 'rk-trash-warn', text: 'Vas a dejar de ser amigo de ' + (n === 1 ? 'esta persona' : 'estas ' + n + ' personas') +
        '. No se puede deshacer: para volver a ser amigos tendríais que enviaros otra solicitud.' }),
      who,
      slow,
      el('div', { class: 'rx-actions rk-trash-confirm-actions' }, [cancel, go])
    ]), function () {
      self.dialog = null;
      if (ok && self.mode) self.empty(list);
    });
    this.dialog.body.closest('.rx-modal').classList.add('rk-trash-modal');
    cancel.focus();
  },

  // Elimina a los elegidos, de uno en uno y sin prisa. Antes comprueba que la sesión que va a usar es la de la cuenta
  // de esta página (si no, podría borrar los amigos de otra cuenta tuya). Si el fondo de la extensión ve otra cuenta
  // (contenedores de Firefox), se prueba con la sesión de la propia pestaña y, si esa sí es, se usa esa.
  empty: async function (list) {
    if (this.busy) return;
    var me = RX.pageUser();
    this.busy = true;
    this.stopReq = false;
    this.lock(true);
    var done = 0, fails = [], stopped = '', pace = this.PACE;
    try {
      this.progress(0, list.length, 'Comprobando tu sesión…');
      var call = await this.session(me);
      if (!call) {
        stopped = 'La sesión de Roblox que ve RoCer0 no es la de esta página. Recarga la página y vuelve a probar.';
        return;
      }
      for (var i = 0; i < list.length; i++) {
        if (this.stopReq) { stopped = 'Parado: los que faltaban siguen elegidos.'; break; }
        var f = list[i];
        this.progress(i, list.length, 'Eliminando a ' + f.name + '…', this.eta(i, list.length, pace));
        var res = await this.unfriend(f.id, call);
        if (res.slow) pace = Math.min(Math.round(pace * 1.25), 20000);
        if (res.ok) {
          done++;
          this.gone[f.id] = true;
          this.sel.delete(f.id);
          var tile = document.querySelector('[data-rk-trash-id="' + f.id + '"]');
          if (tile) tile.setAttribute('data-rk-trash', 'gone');
          this.count();
        } else {
          // Lo que para todo (la sesión, Roblox que corta, «Parar») no es culpa de ese amigo: se cuenta aparte.
          if (res.stop) { stopped = res.why; break; }
          fails.push(f.name + ': ' + res.why);
        }
        if (i < list.length - 1) {
          var gap = i + 1 < this.BURST ? this.GAP : pace + Math.round((Math.random() - 0.5) * 1000);
          if (gap > 2000) this.progress(i + 1, list.length, 'Siguiente en un momento…', this.eta(i, list.length, pace));
          if (!(await this.wait(gap))) { stopped = 'Parado: los que faltaban siguen elegidos.'; break; }
        }
      }
      this.progress(list.length, list.length, '');
    } finally {
      this.busy = false;
      this.lock(false);
      if (this.mode) this.mark();
      var parts = [done ? (done === 1 ? 'Eliminado 1 amigo.' : 'Eliminados ' + done + ' amigos.') : 'No se ha eliminado a nadie.'];
      if (fails.length) parts.push('No se pudo con ' + fails.length + ': ' + fails.slice(0, 4).join(' · ') + (fails.length > 4 ? '…' : '.'));
      if (stopped) parts.push(stopped);
      else if (done) parts.push('Recarga la página para ver tu lista al día.');
      this.say(parts.join(' '), fails.length || stopped ? 'warn' : 'ok');
      RX.toast(done ? (done === 1 ? 'Eliminado 1 amigo' : 'Eliminados ' + done + ' amigos') : 'No se ha eliminado a nadie', 4000);
    }
  },
  // Qué camino usar para hablar con Roblox: el normal si su sesión es la de la página; si no, el de la pestaña si esa sí
  // lo es; si ninguno, nada (y no se elimina a nadie).
  session: async function (me) {
    if (!me) return null;
    var whoIs = async function (call) {
      try { var u = await call('https://users.roblox.com/v1/users/authenticated'); return u && Number(u.id); } catch (e) { return 0; }
    };
    try { await RX.me(); } catch (e) { /* da igual: lo que cuenta es la comprobación de abajo */ }
    if (await whoIs(RX.api) === me.id) return RX.api;
    if (await whoIs(RX.apiPage) === me.id) return RX.apiPage;
    return null;
  },
  // Una eliminación. Si Roblox pide esperar (429), se espera (lo que diga o 1, 2, 4 y 5 minutos) y se reintenta; si
  // falla su servidor, se reintenta un par de veces; si pide comprobar que eres tú o la sesión falla, se para todo.
  unfriend: async function (id, call) {
    var slow = false, waits = 0, flaky = 0;
    var STOP = 'Parado: los que faltaban siguen elegidos.';
    for (;;) {
      try {
        await call('https://friends.roblox.com/v1/users/' + id + '/unfriend', { method: 'POST' });
        return { ok: true, slow: slow };
      } catch (e) {
        var st = e.status || 0, h = e.headers || {};
        if (st === 429) {
          slow = true;
          if (waits >= this.WAITS.length) return { ok: false, stop: true, slow: true, why: 'Roblox sigue pidiendo esperar. Los que faltan siguen elegidos: vuelve a pulsar Eliminar dentro de un rato.' };
          var ms = this.retryAfter(h) || Math.round(this.WAITS[waits] * (0.8 + Math.random() * 0.4));
          waits++;
          if (!(await this.wait(ms, 'Roblox pide ir más despacio: sigo en {s} s…'))) return { ok: false, stop: true, slow: true, why: STOP };
          continue;
        }
        if (st === 403 && (h['rblx-challenge-id'] || h['rblx-challenge-type'] || /challenge/i.test(e.message || ''))) {
          return { ok: false, stop: true, slow: slow, why: 'Roblox pide comprobar que eres tú. Quita a un amigo a mano desde su perfil, pasa la comprobación y vuelve a pulsar Eliminar: los que faltan siguen elegidos.' };
        }
        if ((!st || st >= 500) && flaky < 2) {
          flaky++;
          if (!(await this.wait(3000 * flaky))) return { ok: false, stop: true, slow: slow, why: STOP };
          continue;
        }
        if (st === 401) return { ok: false, stop: true, slow: slow, why: 'Tu sesión de Roblox ha caducado. Vuelve a entrar y prueba otra vez.' };
        if (st === 403) return { ok: false, stop: true, slow: slow, why: 'Roblox no ha dejado hacerlo ahora. Recarga la página y vuelve a probar.' };
        if (st === 400) return { ok: false, slow: slow, why: 'ya no era tu amigo o la cuenta no existe' };
        return { ok: false, slow: slow, why: st ? 'error ' + st : 'Roblox no contesta' };
      }
    }
  },
  // Lo que pide esperar Roblox (Retry-After en segundos o como fecha; si no, x-ratelimit-reset), entre 1 s y 5 min.
  retryAfter: function (h) {
    var v = h['retry-after'] || h['x-ratelimit-reset'];
    if (!v) return 0;
    var ms = /^\s*\d+(\.\d+)?\s*$/.test(v) ? parseFloat(v) * 1000 : Date.parse(v) - Date.now();
    if (!(ms > 0)) return 0;
    return Math.min(Math.max(ms, 1000), 300000) + 500;
  },
  // Espera sin dejar de atender a «Parar» (mira cada cuarto de segundo). Con texto, va contando los segundos que faltan.
  // Devuelve false si se ha parado.
  wait: async function (ms, text) {
    var end = Date.now() + ms, shown = -1;
    while (!this.stopReq) {
      var left = end - Date.now();
      if (left <= 0) return true;
      if (text) {
        var sec = Math.ceil(left / 1000);
        if (sec !== shown) { shown = sec; this.say(text.replace('{s}', sec), 'warn'); }
      }
      await RX.sleep(Math.min(250, left));
    }
    return false;
  },
  // Cuánto falta, más o menos, después del amigo «i» (las 8 primeras van seguidas; luego, una cada «pace»).
  eta: function (i, n, pace) {
    var ms = 0;
    for (var k = i + 1; k < n; k++) ms += k < this.BURST ? this.GAP : pace;
    return ms;
  },
  progress: function (i, n, text, left) {
    if (!this.barEl) return;
    var p = this.barEl.querySelector('.rk-trash-progress');
    p.hidden = !this.busy;
    p.querySelector('i').style.width = (n ? Math.round(i / n * 100) : 0) + '%';
    if (!text) return;
    var mins = Math.round((left || 0) / 60000);
    var tail = (left || 0) < 45000 ? '' : mins <= 1 ? ' · queda cerca de 1 minuto' : ' · quedan unos ' + mins + ' minutos';
    this.say(text + ' (' + Math.min(i + 1, n) + ' de ' + n + ')' + tail);
  },
  // Mientras se borra: sin elegir ni salir, y con el botón de parar.
  lock: function (on) {
    if (!this.barEl) return;
    this.barEl.classList.toggle('rk-trash-busy', on);
    this.barEl.querySelectorAll('.rk-trash-all, .rk-trash-none').forEach(function (b) { b.disabled = on; });
    var stop = this.barEl.querySelector('.rk-trash-stop');
    stop.hidden = !on;
    stop.disabled = false;
    if (!on) this.barEl.querySelector('.rk-trash-progress').hidden = true;
    if (this.btn) this.btn.disabled = on;
    this.count();
  }
});
