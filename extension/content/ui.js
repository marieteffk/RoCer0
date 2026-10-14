// Retoques de interfaz, CSS personalizado, modo streamer y contador de FPS y ping.
// Casi todo se aplica con clases en <html>; las reglas están en rx.css (bloque 1.0 C).
RX.features.push({
  id: 'ui',
  run: function (s) { this.update(s); },
  update: function (s) {
    var root = document.documentElement;
    var on = !!s['ui.enabled'];
    // Las clases salen de rxPageClasses (defaults.js), igual que en theme-boot.js. Los anuncios van aparte de ui.enabled.
    var cls = rxPageClasses(s);
    Object.keys(cls).forEach(function (k) { if (k.indexOf('rx-streamer') !== 0) root.classList.toggle(k, cls[k]); });
    RX.css('rx-custom-css', on ? s['ui.customCss'] : '');
    if (cls['rx-hide-sponsored']) this.watchSponsored(); else this.stopSponsored();
  },

  // Filas y tarjetas patrocinadas: Roblox no les pone una clase fija, así que se buscan por su título o etiqueta.
  watchSponsored: function () {
    if (this.obs) return;
    var skip = '#rk-home, .rx-panel, .rx-modal-wrap, #rx-search, #rc-roulette';
    var title = /^\s*(sponsored|patrocinad[oa]s?|anuncios?|publicidad)\b/i;
    var scan = function () {
      document.querySelectorAll('h2, h3, .container-header, [class*="sort-header"], [data-testid*="header"]').forEach(function (h) {
        if (h.closest(skip) || !title.test(h.textContent || '')) return;
        var box = h.closest('[class*="game-sort"], [class*="sort-carousel"], .game-carousel, .container-list, section') || h.parentElement;
        if (box && box !== document.body && !box.contains(document.getElementById('container-main'))) box.classList.add('rx-sponsored');
      });
      document.querySelectorAll('body [class*="sponsored"], body [data-testid*="sponsored"], body [class*="native-ad"]').forEach(function (n) {
        // Nuestras propias clases (rx-hide-sponsored, rx-sponsored) también contienen la palabra.
        if (n.classList.contains('rx-sponsored') || n.closest(skip)) return;
        var card = n.closest('.game-card-container, [data-testid="game-tile"], .game-tile, li, .list-item') || n;
        card.classList.add('rx-sponsored');
      });
    };
    scan();
    var t;
    this.obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 400); });
    this.obs.observe(document.body, { childList: true, subtree: true });
  },
  stopSponsored: function () {
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
  }
});

RX.features.push({
  id: 'streamer',
  swaps: new Map(), // texto original de cada nodo cambiado, para dejarlo como estaba al apagar
  attrSwaps: new Map(),
  run: function (s) {
    var self = this;
    this.update(s);
    // El atajo funciona en cualquier página de Roblox, también con el modo apagado.
    document.addEventListener('keydown', function (e) { self.hotkey(e); }, true);
  },

  hotkey: function (e) {
    var s = RX.settings || {};
    var spec = String(s['streamer.hotkey'] || '').trim();
    if (!spec || e.repeat || !rcHotkeyMatch(e, spec)) return;
    var t = (e.composedPath && e.composedPath()[0]) || e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
    e.preventDefault();
    e.stopPropagation();
    var on = !s['streamer.enabled'];
    RX.saveSettings({ 'streamer.enabled': on })
      .then(function () { RX.toast(on ? 'Modo streamer activado' : 'Modo streamer desactivado'); })
      .catch(function () { RX.toast('No se pudo cambiar el modo streamer'); });
  },

  update: async function (s) {
    var root = document.documentElement;
    var on = !!s['streamer.enabled'];
    var cls = rxPageClasses(s);
    Object.keys(cls).forEach(function (k) { if (k.indexOf('rx-streamer') === 0) root.classList.toggle(k, cls[k]); });
    RX.css('rx-streamer-vars', on ? ':root { --rx-streamer-blur: ' + rxStreamerBlur(s) + 'px; }' : '');
    this.badge(on && !!s['streamer.badge']);

    // Nombre y avatar propios: hace falta saber quién eres, así que solo se prepara cuando cambia algo de esto.
    var hideName = on && !!s['streamer.hideName'], hideAvatar = on && !!s['streamer.hideAvatar'];
    var repl = String(s['streamer.replacement'] || '').trim() || 'Streamer';
    var key = [hideName, hideAvatar, repl].join('|');
    if (key === this.key) return;
    this.key = key;
    this.stop();
    if (!hideName && !hideAvatar) return;
    var me = await RX.me();
    if (!me || this.key !== key) return;
    this.start(me, hideName, hideAvatar, repl);
  },

  // Aviso "Modo streamer" en una esquina (si el contador de FPS está en la misma esquina, se pone encima).
  badge: function (show) {
    var b = document.getElementById('rx-streamer-badge');
    if (!show) { if (b) b.remove(); return; }
    if (b) return;
    b = RX.el('div', { id: 'rx-streamer-badge', role: 'status' }, [RX.icon('video'), RX.el('span', { text: 'Modo streamer' })]);
    document.body.appendChild(b);
  },

  start: function (me, hideName, hideAvatar, repl) {
    var self = this, root = document.documentElement;
    var esc = function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    var names = [me.name, me.displayName].filter(Boolean).sort(function (a, b) { return b.length - a.length; }).map(esc);
    var re = hideName && names.length ? new RegExp('(^|[^\\p{L}\\p{N}_])@?(?:' + names.join('|') + ')(?![\\p{L}\\p{N}_])', 'gu') : null;
    var idRe = new RegExp('/users/' + me.id + '(?!\\d)');
    var mine = new RegExp('^/users/' + me.id + '(?!\\d)');
    var swap = function (v) { re.lastIndex = 0; return v.replace(re, function (m, pre) { return pre + repl; }); };
    var fixText = function (t) {
      var v = t.nodeValue;
      if (!v || v.length < 2) return;
      var p = t.parentNode;
      if (!p || /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(p.nodeName) || p.isContentEditable) return;
      var rec = self.swaps.get(t);
      if (rec && rec[1] === v) return; // ya es nuestro texto
      var nv = swap(v);
      if (nv === v) return;
      self.swaps.set(t, [v, nv]);
      t.nodeValue = nv;
    };
    var fixAttrs = function (e) {
      ['title', 'alt', 'aria-label'].forEach(function (a) {
        var v = e.getAttribute(a);
        if (!v) return;
        var recs = self.attrSwaps.get(e);
        if (recs && recs[a] && recs[a][1] === v) return;
        var nv = swap(v);
        if (nv === v) return;
        if (!recs) self.attrSwaps.set(e, recs = {});
        recs[a] = [v, nv];
        e.setAttribute(a, nv);
      });
    };
    var fix = function (node) {
      if (node.nodeType === 3) { if (re) fixText(node); return; }
      if (node.nodeType !== 1) return;
      if (re) {
        var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
        var t;
        while ((t = w.nextNode())) fixText(t);
        if (node.hasAttribute('title') || node.hasAttribute('alt') || node.hasAttribute('aria-label')) fixAttrs(node);
        node.querySelectorAll('[title], [alt], [aria-label]').forEach(fixAttrs);
      }
      // Enlaces a tu perfil: su imagen es tu avatar.
      if (hideAvatar) {
        if (node.matches('a[href*="/users/"]') && idRe.test(node.getAttribute('href'))) node.classList.add('rx-me-link');
        node.querySelectorAll('a[href*="/users/"]').forEach(function (a) { if (idRe.test(a.getAttribute('href'))) a.classList.add('rx-me-link'); });
      }
    };
    var page = function () { root.classList.toggle('rx-streamer-mine', hideAvatar && mine.test(RX.path())); };
    page();
    fix(document.documentElement);
    this.obs = new MutationObserver(function (muts) {
      page();
      muts.forEach(function (m) {
        if (m.type === 'characterData') { if (re) fixText(m.target); }
        else if (m.type === 'attributes') { if (re) fixAttrs(m.target); }
        else m.addedNodes.forEach(fix);
      });
      // No guardar para siempre textos que React ya quitó.
      if (self.swaps.size > 3000) self.swaps.forEach(function (rec, n) { if (!n.isConnected) self.swaps.delete(n); });
      if (self.attrSwaps.size > 1500) self.attrSwaps.forEach(function (rec, n) { if (!n.isConnected) self.attrSwaps.delete(n); });
    });
    var opts = { childList: true, subtree: true };
    if (re) { opts.characterData = true; opts.attributeFilter = ['title', 'alt', 'aria-label']; }
    this.obs.observe(document.documentElement, opts);
  },

  // Deja la página como estaba: vuelve a poner tu nombre donde lo cambió RoCer0.
  stop: function () {
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
    this.swaps.forEach(function (rec, n) { if (n.isConnected && n.nodeValue === rec[1]) n.nodeValue = rec[0]; });
    this.attrSwaps.forEach(function (recs, e) {
      for (var a in recs) if (e.isConnected && e.getAttribute(a) === recs[a][1]) e.setAttribute(a, recs[a][0]);
    });
    this.swaps.clear();
    this.attrSwaps.clear();
    document.querySelectorAll('.rx-me-link').forEach(function (a) { a.classList.remove('rx-me-link'); });
    document.documentElement.classList.remove('rx-streamer-mine');
  }
});

RX.features.push({
  id: 'perf',
  run: function (s) { this.update(s); },
  update: function (s) {
    var root = document.documentElement;
    var show = (Array.isArray(s['perf.show']) ? s['perf.show'] : []).filter(function (k) { return k === 'fps' || k === 'ping'; });
    var on = !!s['perf.overlay'] && show.length > 0;
    var pos = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].indexOf(s['perf.position']) >= 0 ? s['perf.position'] : 'bottom-right';
    var size = ['small', 'normal', 'big'].indexOf(s['perf.size']) >= 0 ? s['perf.size'] : 'normal';
    // Para apartar el aviso del modo streamer si comparten esquina.
    root.classList.toggle('rx-perf-bl', on && pos === 'bottom-left');
    root.classList.toggle('rx-perf-bl-big', on && pos === 'bottom-left' && size === 'big');
    var box = document.getElementById('rx-perf');
    if (!on) { this.stop(); this.key = null; if (box) box.remove(); return; }
    this.s = s;
    if (!box) { box = RX.el('div', { id: 'rx-perf', 'aria-hidden': 'true' }); document.body.appendChild(box); this.key = null; }
    box.className = 'rx-pos-' + pos + ' rx-perf-' + size;
    box.style.opacity = String(Math.max(30, Math.min(100, Number(s['perf.opacity']) || 100)) / 100);
    var key = show.join(',') + '|' + s['perf.pingInterval'];
    if (key !== this.key) {
      this.key = key;
      this.stop();
      this.start(box, show, Math.max(2, Math.min(60, Number(s['perf.pingInterval']) || 5)));
    }
    this.draw();
  },

  start: function (box, show, every) {
    var self = this, el = RX.el;
    var item = function (unit) { return el('span', { class: 'rx-perf-item' }, [el('b', { text: '…' }), el('span', { class: 'rx-perf-unit', text: unit })]); };
    box.textContent = '';
    this.fpsEl = show.indexOf('fps') >= 0 ? box.appendChild(item('FPS')) : null;
    this.pingEl = show.indexOf('ping') >= 0 ? box.appendChild(item('ms')) : null;
    this.fps = null;
    this.ping = null;
    if (this.fpsEl) {
      var frames = 0, last = performance.now();
      var loop = function (now) {
        frames++;
        var dt = now - last;
        if (dt > 2500) { frames = 0; last = now; } // la pestaña estuvo en segundo plano
        else if (dt >= 1000) { self.fps = Math.round(frames * 1000 / dt); frames = 0; last = now; self.draw(); }
        self.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    if (this.pingEl) {
      var measure = function () {
        if (document.hidden) return;
        var t = performance.now();
        fetch('https://apis.roblox.com/?rx=' + Date.now(), { mode: 'no-cors', cache: 'no-store', credentials: 'omit' })
          .then(function () { self.ping = Math.round(performance.now() - t); self.draw(); })
          .catch(function () { self.ping = -1; self.draw(); });
      };
      measure();
      this.pingTimer = setInterval(measure, every * 1000);
    }
  },

  stop: function () {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  },

  // Verde si va bien, ámbar regular y rojo mal (FPS: 50 y 30; ping: 80 y 150 ms).
  draw: function () {
    var colors = this.s && this.s['perf.colors'];
    var paint = function (node, val, lvl) {
      if (!node) return;
      node.firstChild.textContent = val;
      node.className = 'rx-perf-item' + (colors && lvl ? ' rx-' + lvl : '');
    };
    var f = this.fps, p = this.ping;
    paint(this.fpsEl, f === null ? '…' : f, f === null ? '' : f >= 50 ? 'good' : f >= 30 ? 'mid' : 'bad');
    paint(this.pingEl, p === null ? '…' : p < 0 ? '—' : p, p === null || p < 0 ? '' : p <= 80 ? 'good' : p <= 150 ? 'mid' : 'bad');
  }
});
