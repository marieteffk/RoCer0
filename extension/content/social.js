// Última conexión en perfiles, selector de cuentas en la barra, accesorios sin límite,
// detector de plugins y valores de Rolimons en intercambios.

// ---------- Última conexión ----------
RX.features.push({
  id: 'lastOnline',
  KEYS: ['lastOnline.enabled', 'lastOnline.format'],

  run: function (s) {
    var m = /^\/users\/(\d+)\/profile/.exec(RX.path());
    if (!m || !RX.isTop) return;
    this.uid = Number(m[1]);
    this.update(s);
  },

  update: function (s) {
    if (!this.uid) return;
    var sig = rcSettingsSig(s, this.KEYS), self = this, el = RX.el;
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    if (!s['lastOnline.enabled']) { if (this.box) this.box.remove(); return; }
    if (!this.box) {
      this.dot = el('span', { class: 'rc-status-dot' });
      this.label = el('span', { class: 'rc-lastonline-text', text: 'Comprobando conexión…' });
      this.box = el('div', { class: 'rx-panel rx-lastonline' }, [RX.icon('clock'), this.dot, this.label]);
    }
    if (!this.box.isConnected && !this.mounting) {
      this.mounting = true;
      RX.mount(['.profile-header-top', '.profile-header', '.user-profile-header', '#profile-header-container', '.profile-container'], this.box, 'after').then(function (box) {
        self.mounting = false;
        if (!self.s['lastOnline.enabled']) { box.remove(); return; }
        // Va justo encima del panel de RoCer0 del perfil (pages.js), sea cual sea el que se puso antes.
        var panel = document.getElementById('rc-profile');
        if (panel && panel.parentNode === box.parentNode && (panel.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)) panel.before(box);
      });
    }
    if (!this.req) this.req = this.load();
    this.paint();
  },

  load: async function () {
    var uid = this.uid;
    try {
      var d = await RX.api('https://presence.roblox.com/v1/presence/users', { method: 'POST', body: { userIds: [uid] } });
      var p = (d.userPresences || [])[0] || {};
      var seen = await RX.local('lastSeen', {});
      var meta = await RX.local('lastSeenMeta', null);
      var now = Date.now();
      if (p.userPresenceType > 0) {
        seen[uid] = { t: now, game: p.lastLocation || '', type: p.userPresenceType };
        await RX.setLocal({ lastSeen: seen, lastSeenMeta: meta || { since: now } });
        this.data = { live: p.userPresenceType, game: p.lastLocation || '' };
      } else {
        var api = p.lastOnline ? Date.parse(p.lastOnline) : 0;
        var rec = seen[uid];
        var best = Math.max(api > 946684800000 ? api : 0, rec ? rec.t : 0);
        this.data = { t: best, game: rec && rec.t === best ? rec.game : '', since: meta ? meta.since : 0 };
      }
    } catch (e) {
      this.data = { error: e };
    }
    this.paint();
  },

  // "14 oct 2026, 18:40 · hace 2 h", solo la fecha o solo hace cuánto (lastOnline.format).
  when: function (t, format) {
    var date = new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (format === 'date') return date;
    if (format === 'relative') return RX.ago(t);
    return date + ' · ' + RX.ago(t);
  },

  paint: function () {
    var d = this.data;
    if (!this.box || !d) return;
    var st = 'off', text, title = '';
    if (d.error) {
      text = 'No se pudo consultar su conexión ahora mismo.';
    } else if (d.live) {
      st = ['off', 'online', 'game', 'studio'][d.live] || 'online';
      text = d.live === 2 ? 'Jugando ahora' + (d.game ? ' a ' + d.game : '') : d.live === 3 ? 'En Roblox Studio ahora' : 'Conectado ahora';
    } else if (d.t) {
      text = 'Última conexión: ' + this.when(d.t, this.s['lastOnline.format']) + (d.game ? ' (jugando a ' + d.game + ')' : '');
      title = this.when(d.t, 'both');
    } else {
      text = 'Desconectado. Aún no hay registro de su última conexión' + (d.since ? ' (RoCer0 lo apunta desde el ' + new Date(d.since).toLocaleDateString('es-ES') + ')' : '') + '.';
    }
    this.dot.className = 'rc-status-dot rc-st-' + st;
    this.label.textContent = text;
    this.label.title = title;
  }
});

// ---------- Selector de cuentas en la barra de Roblox ----------
RX.features.push({
  id: 'accountsNav',

  run: function (s) {
    if (!RX.isTop) return;
    var self = this;
    document.addEventListener('click', function (e) { if (self.menu && !self.wrap.contains(e.target)) self.menu.hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && self.menu) self.menu.hidden = true; });
    this.update(s);
  },

  update: async function (s) {
    if (!RX.isTop) return;
    var self = this;
    var on = function () { return !!(self.s['accounts.enabled'] && self.s['accounts.navButton']); };
    this.s = s;
    if (!on()) { if (this.holder) this.holder.remove(); if (this.menu) this.menu.hidden = true; return; }
    if ((this.holder && this.holder.isConnected) || this.mounting) return;
    this.mounting = true;
    var nav = await RX.waitFor(['#navbar-settings', '.navbar-right', '#right-navigation-header'], 6000);
    this.mounting = false;
    if (!nav || !on()) return;
    if (!this.wrap) this.build();
    if (nav.tagName === 'LI') { this.holder = RX.el('li', { class: 'navbar-icon-item rx-acc-li' }, [this.wrap]); nav.parentNode.insertBefore(this.holder, nav); }
    else if (nav.tagName === 'UL' || nav.tagName === 'OL') { this.holder = RX.el('li', { class: 'navbar-icon-item rx-acc-li' }, [this.wrap]); nav.insertBefore(this.holder, nav.firstChild); }
    else { this.holder = this.wrap; nav.parentNode.insertBefore(this.wrap, nav); }
  },

  build: function () {
    var el = RX.el, self = this;
    this.menu = el('div', { class: 'rx-acc-menu', hidden: true });
    var btn = el('button', { type: 'button', class: 'rx-acc-btn', title: 'Cambiar de cuenta', 'aria-haspopup': 'true', onclick: function () {
      if (!self.menu.hidden) { self.menu.hidden = true; return; }
      self.menu.hidden = false;
      self.fill();
    } }, [RX.icon('swap')]);
    this.wrap = el('div', { class: 'rx-acc-wrap' }, [btn, this.menu]);
  },

  status: function (text, extra) {
    this.menu.textContent = '';
    this.menu.appendChild(RX.el('div', { class: 'rx-acc-status', text: text }));
    if (extra) this.menu.appendChild(extra);
  },

  label: function (a) { return a.displayName && a.displayName !== a.name ? a.displayName + ' (@' + a.name + ')' : '@' + a.name; },

  fill: async function () {
    var el = RX.el, self = this, menu = this.menu;
    this.status('Cargando…');
    try {
      var r = await RX.send('accounts:list');
      var heads = await RX.thumbs('users', r.accounts.map(function (a) { return a.userId; }));
      menu.textContent = '';
      if (!r.accounts.length) menu.appendChild(el('div', { class: 'rx-acc-status', text: 'Aún no has guardado ninguna cuenta.' }));
      r.accounts.forEach(function (a) {
        var cur = a.userId === r.current;
        menu.appendChild(el('button', { type: 'button', class: 'rx-acc-item' + (cur ? ' rx-on' : ''), disabled: cur, title: cur ? 'Es la cuenta que estás usando' : 'Cambiar a esta cuenta', onclick: function () { self.switchTo(a); } },
          [el('img', { src: heads[a.userId] || '', alt: '' }), el('span', { text: self.label(a) }), cur ? RX.icon('check') : null]));
      });
      menu.appendChild(el('div', { class: 'rx-acc-sep' }));
      menu.appendChild(el('button', { type: 'button', class: 'rx-acc-item', onclick: async function () {
        try { var me = await RX.send('accounts:save'); RX.toast('Cuenta ' + me.name + ' guardada'); menu.hidden = true; } catch (err) { self.status(err.message); }
      } }, [RX.icon('save'), el('span', { text: 'Guardar esta cuenta' })]));
      menu.appendChild(el('button', { type: 'button', class: 'rx-acc-item', onclick: async function () {
        menu.hidden = true;
        var ok = await RX.ask('Añadir otra cuenta', 'Se guardará la cuenta actual y se abrirá la página de inicio de sesión para entrar con otra.', 'Seguir');
        if (ok) RX.send('accounts:add').catch(function (err) { RX.toast(err.message); });
      } }, [RX.icon('plus'), el('span', { text: 'Añadir otra cuenta' })]));
      menu.appendChild(el('button', { type: 'button', class: 'rx-acc-item', onclick: function () { menu.hidden = true; RX.send('openSettings', { tab: 'accounts' }).catch(function () {}); } },
        [RX.icon('gear'), el('span', { text: 'Gestionar cuentas' })]));
    } catch (err) { this.status(err.message); }
  },

  switchTo: async function (a) {
    var name = this.label(a);
    if (this.s['accounts.confirm']) {
      this.menu.hidden = true;
      if (!(await RX.ask('Cambiar de cuenta', '¿Cambiar a ' + name + '?', 'Cambiar'))) return;
    }
    this.menu.hidden = false;
    this.status('Cambiando a ' + name + '…');
    try {
      await RX.send('accounts:switch', { userId: a.userId });
      // Si RoCer0 no recarga las pestañas solo (Ajustes → Cuentas), se ofrece hacerlo aquí.
      this.status('Ya estás en ' + name + '.', RX.ibtn('refresh', 'Recargar la página', { class: 'rx-btn rx-btn-small rx-primary', onclick: function () { location.reload(); } }));
    } catch (err) { this.status(err.message); }
  }
});

// ---------- Accesorios sin límite en el editor de avatar ----------
RX.features.push({
  id: 'avatar',

  run: function (s) {
    if (!RX.isTop || !/^\/my\/avatar/.test(RX.path())) return;
    this.here = true;
    this.update(s);
  },

  update: function (s) {
    if (!this.here) return;
    var self = this;
    this.s = s;
    if (!s['avatar.unlimited']) { if (this.panel) this.panel.remove(); return; }
    if (!this.panel) this.build();
    if (this.panel.isConnected || this.mounting) return;
    this.mounting = true;
    RX.mount(['#avatar-web-app', '.avatar-back', '#avatar-container', '#container-main .content'], this.panel, 'before').then(function () {
      self.mounting = false;
      if (!self.s['avatar.unlimited']) self.panel.remove();
    });
    this.load();
  },

  build: function () {
    var el = RX.el, self = this;
    this.list = el('div', { class: 'rx-content-list' });
    this.status = el('div', { class: 'rx-muted' });
    var input = el('input', { class: 'rx-text', placeholder: 'IDs o enlaces de accesorios, separados por comas' });
    var add = function () {
      var ids = (input.value.match(/\d{3,}/g) || []).map(Number);
      if (ids.length) self.add(ids).then(function () { input.value = ''; });
    };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    this.panel = el('div', { class: 'rx-panel', id: 'rx-avatar' }, [
      RX.title('hat', 'Accesorios sin límite'),
      el('div', { class: 'rx-muted', text: 'Añade accesorios que ya tengas, aunque superes el límite del editor (por ejemplo más de 3 sombreros). Roblox decide en su servidor si los acepta.' }),
      el('div', { class: 'rx-actions' }, [input,
        RX.ibtn('plus', 'Equipar', { class: 'rx-btn rx-primary', onclick: add }),
        RX.ibtn('refresh', 'Recargar', { onclick: function () { self.load(); } })
      ]),
      this.status, this.list
    ]);
  },

  load: async function () {
    var el = RX.el, self = this;
    try {
      var a = await RX.api('https://avatar.roblox.com/v1/avatar');
      this.assets = a.assets || [];
      this.list.textContent = '';
      this.status.textContent = 'Llevas ' + this.assets.length + ' objetos puestos.';
      this.assets.forEach(function (x) {
        self.list.appendChild(el('div', {}, [
          el('a', { href: '/catalog/' + x.id, text: x.name }), ' · ' + (x.assetType && x.assetType.name || '') + ' ',
          el('button', { type: 'button', class: 'rx-link', text: 'quitar', onclick: function () { self.set(self.assets.filter(function (y) { return y.id !== x.id; })); } })
        ]));
      });
    } catch (e) { this.status.textContent = 'No se pudo leer tu avatar ahora mismo.'; }
  },

  add: function (ids) {
    var cur = (this.assets || []).slice();
    ids.forEach(function (id) { if (!cur.some(function (a) { return a.id === id; })) cur.push({ id: id }); });
    return this.set(cur);
  },

  set: async function (assets) {
    this.status.textContent = 'Guardando…';
    var body = { assets: assets.map(function (a) { var o = { id: a.id }; if (a.meta) o.meta = a.meta; return o; }) };
    try {
      var r = await RX.api('https://avatar.roblox.com/v2/avatar/set-wearing-assets', { method: 'POST', body: body });
      var bad = (r.invalidAssetIds || []).concat((r.invalidAssets || []).map(function (x) { return x.id; }));
      await RX.api('https://avatar.roblox.com/v1/avatar/redraw-thumbnail', { method: 'POST', body: {} }).catch(function () {});
      await this.load();
      this.status.textContent += bad.length ? ' Roblox rechazó: ' + bad.join(', ') + ' (no lo tienes o no se permite esa combinación).' : ' Guardado. Recarga la página para ver el editor actualizado.';
    } catch (e) { this.status.textContent = 'Roblox rechazó el cambio: ' + e.message; }
  }
});

// ---------- Detector de plugins y modelos ----------
RX.features.push({
  id: 'plugins',
  KEYS: ['plugins.enabled', 'plugins.models', 'plugins.scanCode', 'plugins.hideSafe'],

  run: function (s) {
    if (!RX.isTop) return;
    var self = this;
    this.s = s;
    this.sig = rcSettingsSig(s, this.KEYS);
    this.details = {};
    this.scans = {};
    this.check(false);
    RX.onUrlChange(function () { self.check(false); });
  },

  update: function (s) {
    if (!this.details) return;
    var sig = rcSettingsSig(s, this.KEYS);
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    this.check(true);
  },

  // Analiza el objeto de la página al entrar, al cambiar de objeto o al cambiar los ajustes del detector.
  check: function (force) {
    var m = /^\/(?:store\/asset|library|marketplace\/asset)\/(\d+)/.exec(RX.path());
    var id = m ? m[1] : null;
    if (!force && id === this.current) return;
    this.current = id;
    this.ticket = (this.ticket || 0) + 1;
    var old = document.getElementById('rx-plugin');
    if (old) old.remove();
    if (id && this.s['plugins.enabled']) this.analyze(id, this.ticket);
  },

  POPULAR: ['Building Tools by F3X', 'F3X', 'Moon Animator', 'Moon Animator 2', 'Rojo', 'Archimedes', 'GapFill & Extrude', 'Brushtool', 'Model Reflect', 'Tag Editor', 'Reclass', 'Load Character', 'Autoscale Lite', 'Easy Weld', 'Material Flip', 'Part to Terrain', 'Resizer', 'Rig Builder', 'Studio Build Suite', 'Realism', 'Interface Tools', 'Weld Constraint', 'Stravant', 'Roblox Animation Editor', 'Hoarcekat', 'TopbarPlus', 'Ro-Defender', 'Anti Virus', 'Antivirus', 'Free Admin', 'HD Admin', 'Adonis', 'Kohls Admin', 'Character Creator', 'Terrain Tools', 'Lighting Presets', 'UI Design', 'AutoScale'],

  similar: function (a, b) {
    a = a.toLowerCase().replace(/[^a-z0-9]/g, ''); b = b.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a || !b) return false;
    if (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
    var dp = [];
    for (var i = 0; i <= a.length; i++) { dp[i] = [i]; }
    for (var j = 0; j <= b.length; j++) dp[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length] <= Math.max(1, Math.floor(b.length / 6));
  },

  // Datos del objeto y análisis del código: se piden una vez por objeto (cambiar un ajuste no los repite).
  info: function (id) {
    if (!this.details[id]) this.details[id] = RX.api('https://economy.roblox.com/v2/assets/' + id + '/details').catch(function () { return null; });
    return this.details[id];
  },
  scan: function (id) {
    if (!this.scans[id]) this.scans[id] = RX.send('assetInspect', { assetId: id }).catch(function (e) { return { error: e.message }; });
    return this.scans[id];
  },

  analyze: async function (id, ticket) {
    var el = RX.el, s = this.s;
    var info = await this.info(id);
    if (ticket !== this.ticket || !info) return;
    var types = s['plugins.models'] ? [38, 10] : [38];
    if (types.indexOf(info.AssetTypeId) < 0) return;
    var kind = info.AssetTypeId === 38 ? 'plugin' : 'modelo';
    var box = el('div', { id: 'rx-plugin', class: 'rx-panel rx-floating', 'data-id': id }, [el('b', {}, [RX.icon('shield'), ' Analizando el ' + kind + '…'])]);
    // Con "no mostrar nada si parece seguro" no se enseña nada hasta tener el resultado.
    if (!s['plugins.hideSafe']) document.body.appendChild(box);
    var code = s['plugins.scanCode'] ? await this.scan(id) : null;
    if (ticket !== this.ticket) { box.remove(); return; }
    var v = this.verdict(info, code, kind);
    if (v.risk === 'ok' && s['plugins.hideSafe']) { box.remove(); return; }
    box.textContent = '';
    box.className = 'rx-panel rx-floating rx-risk-' + v.risk;
    box.appendChild(el('div', { class: 'rx-modal-head' }, [
      el('b', {}, [el('span', { class: 'rc-status-dot rc-risk-' + v.risk }), v.level + ' (' + kind + ')']),
      el('button', { type: 'button', class: 'rx-btn rx-btn-small rx-icon-only', title: 'Cerrar', onclick: function () { box.remove(); } }, [RX.icon('x')])
    ]));
    var ul = el('ul', { class: 'rc-findings' });
    v.warn.forEach(function (w) {
      ul.appendChild(el('li', { class: 'rc-lvl-' + Math.min(3, w.level) }, [RX.icon(w.level >= 3 ? 'ban' : w.level === 2 ? 'alert' : 'dot'), el('span', { text: w.msg })]));
    });
    v.good.forEach(function (g) { ul.appendChild(el('li', { class: 'rc-lvl-ok' }, [RX.icon('check'), el('span', { text: g })])); });
    box.appendChild(ul);
    if (v.scanNote) box.appendChild(el('div', { class: 'rx-muted', text: v.scanNote }));
    box.appendChild(el('div', { class: 'rx-muted', text: 'Análisis automático orientativo: no garantiza nada al 100%.' }));
    if (!box.isConnected) document.body.appendChild(box);
  },

  // Puntuación de riesgo con los datos del objeto y, si se revisó, su código.
  verdict: function (info, code, kind) {
    var self = this, warn = [], good = [], score = 0;
    var add = function (lvl, msg) { score += lvl; warn.push({ level: lvl, msg: msg }); };
    var verified = info.Creator && info.Creator.HasVerifiedBadge;
    if (verified) good.push('Creador verificado por Roblox.'); else add(1, 'El creador no está verificado.');
    var ageDays = (Date.now() - Date.parse(info.Created)) / 86400000;
    if (ageDays < 14) add(2, 'Publicado hace solo ' + Math.max(0, Math.round(ageDays)) + ' días.');
    else if (ageDays > 365) good.push('Publicado hace más de un año.');
    var lookalike = this.POPULAR.find(function (p) { return self.similar(info.Name || '', p); });
    if (lookalike && !verified) add(2, 'El nombre se parece a "' + lookalike + '", un ' + kind + ' muy conocido: podría ser una copia falsa.');
    if (/free|gratis|robux|admin|anti.?virus|anti.?exploit|backdoor/i.test(info.Name + ' ' + (info.Description || ''))) add(1, 'El nombre o la descripción usa palabras típicas de cebos (gratis, admin, antivirus…).');
    if (info.Sales !== undefined && info.Sales !== null && info.IsForSale && info.PriceInRobux > 0 && info.Sales < 5) add(1, 'De pago y casi sin ventas.');
    var scanNote;
    if (!code) scanNote = 'El código no se ha revisado (se activa en Ajustes → Detector de plugins).';
    else if (code.error) scanNote = 'No se pudo descargar el código: ' + code.error;
    else {
      (code.findings || []).forEach(function (f) { add(f.level, f.msg); });
      scanNote = 'Código analizado: ' + code.count + ' instancias.' + (code.unsupported ? ' Parte del archivo no se pudo leer.' : '');
      if (!(code.findings || []).length) good.push('No se encontraron patrones peligrosos en el código.');
    }
    warn.sort(function (a, b) { return b.level - a.level; });
    var risk = score >= 5 ? 'high' : score >= 3 ? 'mid' : score >= 1 ? 'low' : 'ok';
    var level = { high: 'Peligroso', mid: 'Sospechoso', low: 'Revisar con cuidado', ok: 'Parece seguro' }[risk];
    return { risk: risk, level: level, warn: warn, good: good, scanNote: scanNote };
  }
});

// ---------- Valores de Rolimons en los intercambios ----------
RX.features.push({
  id: 'trade',
  KEYS: ['trade.enabled', 'trade.annotate', 'trade.floatButton', 'trade.useValue'],

  run: function (s) {
    if (!RX.isTop) return;
    var p = RX.path();
    this.tradePage = /^\/(trades|users\/\d+\/trade)/.test(p);
    this.invPage = /^\/users\/\d+\/inventory/.test(p);
    if (!this.tradePage && !this.invPage) return;
    this.here = true;
    this.update(s);
  },

  update: async function (s) {
    if (!this.here) return;
    var sig = rcSettingsSig(s, this.KEYS), self = this;
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    var on = !!s['trade.enabled'];
    // Botón flotante de la calculadora (independiente de los valores sobre los objetos).
    if (on && s['trade.floatButton'] && this.tradePage) {
      if (!this.btn) this.btn = RX.ibtn('calculator', 'Calculadora', { class: 'rx-btn rx-floating-btn', title: 'Abrir la calculadora de intercambios de RoCer0', onclick: function () { RX.send('openSettings', { tab: 'trades' }).catch(function () {}); } });
      if (!this.btn.isConnected) document.body.appendChild(this.btn);
    } else if (this.btn) this.btn.remove();
    // Valores sobre cada objeto: se quitan y se vuelven a poner con el ajuste nuevo.
    this.clear();
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
    if (!on || !s['trade.annotate']) return;
    if (!this.data) {
      try { this.data = await RX.send('rolimons'); } catch (e) { RX.toast('No se pudieron cargar los valores de Rolimons'); return; }
      if (this.sig !== sig) return;
    }
    this.scan();
    var t;
    this.obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { self.scan(); }, 500); });
    this.obs.observe(document.body, { childList: true, subtree: true });
  },

  clear: function () {
    document.querySelectorAll('.rx-value-tag, .rx-side-total').forEach(function (n) { n.remove(); });
    document.querySelectorAll('[data-rxv]').forEach(function (a) { a.removeAttribute('data-rxv'); });
  },

  scan: function () {
    var data = this.data, s = this.s, useRap = s['trade.useValue'] === 'rap';
    if (!data || !data.items || !s['trade.enabled'] || !s['trade.annotate']) return;
    document.querySelectorAll('a[href*="/catalog/"]').forEach(function (a) {
      if (a.dataset.rxv || a.closest('.rx-panel, .rx-modal-wrap')) return;
      var m = /\/catalog\/(\d+)/.exec(a.getAttribute('href'));
      var it = m && data.items[m[1]];
      if (!it) return;
      a.dataset.rxv = '1';
      var rap = it[2] > 0 ? it[2] : 0, isValue = !useRap && it[3] > 0, worth = isValue ? it[3] : rap;
      var tag = RX.el('span', { class: 'rx-value-tag' + (isValue ? '' : ' rx-value-rap'), 'data-v': worth,
        title: (it[3] > 0 ? 'Valor ' + RX.fmt(it[3]) + ' · ' : 'Sin valor en Rolimons · ') + 'RAP ' + RX.fmt(rap),
        text: (isValue ? 'Valor ' : 'RAP ') + RX.short(worth) });
      (a.closest('.item-card-container, li, .trade-item') || a).appendChild(tag);
    });
    // Totales por lado cuando la página separa lo que das y lo que recibes.
    document.querySelectorAll('[class*="trade-list-detail-offer"], [class*="trades-list-detail-offer"]').forEach(function (side) {
      var total = 0;
      side.querySelectorAll('.rx-value-tag').forEach(function (t) { total += Number(t.dataset.v) || 0; });
      if (!total) return;
      var sum = side.querySelector('.rx-side-total') || side.appendChild(RX.el('div', { class: 'rx-side-total' }));
      sum.textContent = 'Total (' + (useRap ? 'RAP' : 'valor') + '): ' + RX.fmt(total);
    });
  }
});
