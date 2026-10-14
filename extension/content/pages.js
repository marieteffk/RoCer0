// Juegos, perfiles y objetos: copiar IDs, notas y etiquetas, ocultar juegos y creadores,
// valor del inventario, amigos en común, historial de nombres, lista de deseos,
// precios en dinero real y filtros de juegos en Descubrir y el resto de listas.

var RC = {
  // ---------- Copiar IDs ----------
  // ¿Lleva chips de IDs este tipo de página? ("ids.where": games, profiles, items, groups, badges)
  idsIn: function (s, place) {
    var w = s['ids.where'];
    return !!s['ids.enabled'] && Array.isArray(w) && w.indexOf(place) >= 0;
  },

  // Enlace para "ids.copyAs" = enlace. El ID del juego (universo) no tiene página propia: se copia el número.
  link: function (kind, id) {
    if (kind === 'user') return 'https://www.roblox.com/users/' + id + '/profile';
    var path = { game: '/games/', item: '/catalog/', bundle: '/bundles/', group: '/communities/', badge: '/badges/' }[kind];
    return path ? 'https://www.roblox.com' + path + id : null;
  },

  idChip: function (label, value, kind, s) {
    var el = RX.el;
    var url = s['ids.copyAs'] === 'link' ? RC.link(kind, value) : null;
    var chip = el('button', { type: 'button', class: 'rc-chip' + (url ? ' rc-chip-link' : ''), title: url ? 'Copiar el enlace: ' + url : 'Copiar el ' + label }, [
      RX.icon('hash'), el('span', { text: label + ' ' }), el('b', { text: String(value) }), RX.icon(url ? 'link' : 'copy', { cls: 'rc-chip-copy' })
    ]);
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      RX.copy(url || String(value), url ? 'Enlace copiado' : label + ' copiado');
    });
    return chip;
  },

  // ---------- Notas y etiquetas ----------
  // expanded: la nota se ve abierta bajo los botones. Si no, se abre y se cierra con el botón "Nota",
  // que lleva un punto cuando hay algo escrito. name puede ser una función (se lee al guardar).
  note: function (key, name, extra, expanded) {
    var el = RX.el;
    var st = { expanded: !!expanded, open: false, editing: false, has: false };
    var box = el('div', { class: 'rc-note', hidden: true });
    var dot = el('i', { class: 'rc-note-dot', hidden: true });
    var btn = el('button', { type: 'button', class: 'rx-btn rx-btn-small rc-note-btn', title: 'Nota y etiquetas personales (solo las ves tú)', 'aria-expanded': 'false' },
      [RX.icon('note'), el('span', { text: 'Nota' }), dot]);
    var draw = async function () {
      var notes = await RX.local('notes', {});
      var n = notes[key];
      st.has = !!n;
      var show = st.editing || (!!n && (st.expanded || st.open));
      if (!show) st.open = false;
      box.textContent = '';
      box.hidden = !show;
      box.classList.toggle('rc-note-editing', st.editing);
      dot.hidden = !n || st.expanded;
      btn.setAttribute('aria-expanded', String(st.expanded ? st.editing : show));
      btn.title = n ? (st.expanded ? 'Editar tu nota' : (show ? 'Cerrar tu nota' : 'Ver tu nota')) : 'Escribir una nota y etiquetas (solo las ves tú)';
      if (!show) return;
      if (!st.editing) {
        if (n.text) box.appendChild(el('div', { class: 'rc-note-text', text: n.text }));
        if (n.tags && n.tags.length) box.appendChild(el('div', { class: 'rc-tags' }, n.tags.map(function (t) { return el('span', { class: 'rc-tag' }, [RX.icon('tag'), ' ' + t]); })));
        box.appendChild(el('div', { class: 'rc-note-foot' }, [
          el('span', { class: 'rx-muted', text: 'Nota personal · ' + new Date(n.t).toLocaleDateString('es-ES') }),
          el('button', { type: 'button', class: 'rx-link', text: 'Editar', onclick: function () { st.editing = true; draw(); } })
        ]));
        return;
      }
      var all = {};
      Object.keys(notes).forEach(function (k) { (notes[k].tags || []).forEach(function (t) { all[t] = 1; }); });
      var text = el('textarea', { class: 'rc-note-input', rows: 3, placeholder: 'Escribe lo que quieras recordar: "buen server para el boss", "no tradear"…' });
      text.value = n ? n.text : '';
      var tags = el('input', { class: 'rx-text', list: 'rc-tag-list', placeholder: 'Etiquetas separadas por comas (por ejemplo: favorito, terror, con amigos)' });
      tags.value = n && n.tags ? n.tags.join(', ') : '';
      var save = async function () {
        var list = tags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 12);
        var cur = await RX.local('notes', {});
        if (!text.value.trim() && !list.length) delete cur[key];
        else {
          var isNew = !cur[key];
          cur[key] = Object.assign({ text: text.value.trim().slice(0, 2000), tags: list, name: typeof name === 'function' ? name() : name, t: Date.now() }, extra || {});
          if (isNew) RX.challenge('note');
        }
        st.editing = false;
        st.open = true;
        await RX.setLocal({ notes: cur });
        draw();
      };
      var cancel = function () { st.editing = false; draw(); };
      var keys = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.target === tags)) { e.preventDefault(); save(); }
      };
      text.addEventListener('keydown', keys);
      tags.addEventListener('keydown', keys);
      box.appendChild(text);
      box.appendChild(tags);
      box.appendChild(el('datalist', { id: 'rc-tag-list' }, Object.keys(all).map(function (t) { return el('option', { value: t }); })));
      box.appendChild(el('div', { class: 'rx-actions' }, [
        RX.ibtn('save', 'Guardar', { class: 'rx-btn rx-btn-small rx-primary', title: 'Guardar (Ctrl+Intro)', onclick: save }),
        n ? RX.ibtn('trash', 'Borrar', { class: 'rx-btn rx-btn-small', onclick: async function () {
          var cur = await RX.local('notes', {});
          delete cur[key];
          st.editing = false;
          await RX.setLocal({ notes: cur });
          draw();
        } }) : null,
        el('button', { type: 'button', class: 'rx-btn rx-btn-small', text: 'Cancelar', onclick: cancel })
      ]));
      text.focus();
    };
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (st.expanded) st.editing = !st.editing; // abierta: el botón abre y cierra el editor
      else if (st.editing || st.open) { st.editing = false; st.open = false; } // plegada: abre y cierra la nota
      else { st.open = true; st.editing = !st.has; }
      draw();
    });
    draw();
    return {
      button: btn,
      box: box,
      refresh: function () { if (!st.editing) draw(); },
      setExpanded: function (v) {
        if (!!v === st.expanded) return;
        st.expanded = !!v;
        st.open = false;
        if (!st.editing) draw();
      }
    };
  },

  // ---------- Ocultar juegos y creadores ----------
  normBlocked: function (b) {
    b = b && typeof b === 'object' ? b : {};
    b.games = b.games || {};
    b.creators = b.creators || {};
    return b;
  },

  blocked: async function () { return RC.normBlocked(await RX.local('blocked', {})); },

  blockGame: async function (placeId, name) {
    var b = await this.blocked();
    b.games[placeId] = { name: name || 'Juego ' + placeId, t: Date.now() };
    await RX.setLocal({ blocked: b });
    this.undoToast('Ocultado "' + (name || placeId) + '" de las listas de juegos.', function () { return RC.unblock('games', placeId); });
  },

  blockCreator: async function (key, name) {
    var b = await this.blocked();
    b.creators[key] = { name: name || key, t: Date.now() };
    await RX.setLocal({ blocked: b });
    this.undoToast('Ocultados los juegos de ' + (name || key) + '.', function () { return RC.unblock('creators', key); });
  },

  unblock: async function (kind, key) {
    var b = await this.blocked();
    delete b[kind][key];
    await RX.setLocal({ blocked: b });
  },

  undoToast: function (text, undo) {
    var el = RX.el;
    var old = document.getElementById('rc-undo');
    if (old) old.remove();
    var bar = el('div', { id: 'rc-undo' }, [RX.icon('eyeOff'), el('span', { text: text }), el('button', { type: 'button', class: 'rx-link', text: 'Deshacer', onclick: async function () { await undo(); bar.remove(); RX.toast('Listo, vuelve a verse'); } })]);
    document.body.appendChild(bar);
    setTimeout(function () { bar.remove(); }, 8000);
  },

  // ---------- Precio en dinero real ----------
  parseRobux: function (text) {
    var t = String(text || '').replace(/[\s ]/g, '').replace(/^R\$/i, '');
    var m = /^([\d.,]+)([KkMm])?\+?$/.exec(t);
    if (!m) return null;
    if (m[2]) {
      var v = parseFloat(m[1].replace(',', '.'));
      return isNaN(v) ? null : Math.round(v * (m[2].toLowerCase() === 'k' ? 1e3 : 1e6));
    }
    var n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    return isNaN(n) ? null : n;
  },

  // Formato según "money.style" (≈ 4,99 € / (4,99 €) / 4,99 €) y "money.decimals" (auto, 0 o 2).
  money: function (robux, rate, s) {
    var v = robux * rate.perRobux;
    var dec = String(s['money.decimals'] || 'auto');
    var fixed = dec === '0' ? 0 : dec === '2' ? 2 : null;
    var opts = fixed === null ? {} : { minimumFractionDigits: fixed, maximumFractionDigits: fixed };
    var txt;
    if (!rate.currency) {
      if (fixed === null) opts.maximumFractionDigits = v < 1 ? 3 : 2;
      txt = v.toLocaleString('es-ES', opts) + (rate.symbol ? ' ' + rate.symbol : '');
    } else {
      try {
        if (fixed === null) {
          var digits = new Intl.NumberFormat('es-ES', { style: 'currency', currency: rate.currency }).resolvedOptions().maximumFractionDigits;
          opts.maximumFractionDigits = v < 1 && digits > 0 ? 3 : digits;
        }
        txt = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: rate.currency }, opts)).format(v);
      } catch (e) { txt = v.toFixed(fixed === null ? 2 : fixed) + ' ' + rate.currency; }
    }
    var style = s['money.style'];
    return style === 'paren' ? '(' + txt + ')' : style === 'plain' ? txt : '≈ ' + txt;
  }
};

// ---------- IDs, notas, botones de ocultar, perfil y lista de deseos en cada página ----------
RX.features.push({
  id: 'pageTools',
  KEYS: ['ids.enabled', 'ids.where', 'ids.copyAs', 'ids.extra', 'notes.enabled', 'notes.onGames', 'notes.onProfiles', 'notes.expanded',
    'discover.enabled', 'discover.blockButton', 'discover.creatorButton', 'profile.inventoryValue', 'profile.inventoryTop',
    'profile.mutualFriends', 'profile.mutualMax', 'profile.nameHistory', 'profile.collapsed', 'trade.useValue', 'wishlist.enabled'],
  PROFILE_ANCHORS: ['.profile-header-top', '.profile-header', '.user-profile-header', '#profile-header-container', '.profile-container'],

  run: function (s) {
    if (!RX.isTop) return;
    var p = RX.path(), m, self = this;
    if ((m = /^\/games\/(\d+)/.exec(p))) this.page = { kind: 'game', id: m[1] };
    else if ((m = /^\/users\/(\d+)\/profile/.exec(p))) this.page = { kind: 'profile', id: Number(m[1]) };
    else if ((m = /^\/(catalog|bundles)\/(\d+)/.exec(p))) this.page = { kind: m[1] === 'bundles' ? 'bundle' : 'item', id: m[2] };
    else if ((m = /^\/(groups|communities)\/(\d+)/.exec(p))) this.page = { kind: 'group', id: m[2] };
    else if ((m = /^\/badges\/(\d+)/.exec(p))) this.page = { kind: 'badge', id: m[1] };
    if (!this.page) return;
    this.s = s;
    this.sig = rcSettingsSig(s, this.KEYS);
    if (this.page.kind === 'profile') RX.me().then(function (me) { if (!me || me.id !== self.page.id) RX.challenge('profile', { userId: self.page.id }); });
    RX.B.storage.onChanged.addListener(function (ch, area) {
      if (area !== 'local') return;
      if (ch.notes && self.noteCtl) self.noteCtl.refresh();
      if (ch.wishlist && self.wish) self.wish.paint();
      if (ch.blocked && self.page.kind === 'game') { self.blk = RC.normBlocked(ch.blocked.newValue); self.game(); }
    });
    if (this.page.kind === 'game') RC.blocked().then(function (b) { self.blk = b; self.game(); });
    this.render();
  },

  update: function (s) {
    if (!this.page) return;
    var sig = rcSettingsSig(s, this.KEYS);
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    this.render();
  },

  render: function () {
    var k = this.page.kind;
    if (k === 'game') this.game();
    else if (k === 'profile') this.profile();
    else if (k === 'item' || k === 'bundle') this.item();
    else this.simple();
  },

  // Pone el nodo junto a su ancla (una sola vez) o lo quita si ya no tiene nada que enseñar.
  place: function (node, show, anchors, where, done) {
    node.rcWanted = show;
    if (!show) { node.remove(); return; }
    if (node.isConnected || node.rcMounting) return;
    node.rcMounting = true;
    RX.mount(anchors, node, where).then(function () {
      node.rcMounting = false;
      if (!node.rcWanted) node.remove();
      else if (done) done(node);
    });
  },

  // ---------- Página de un juego ----------
  gameName: function () {
    var t = ((document.querySelector('.game-name, #game-detail-page h1, h1') || {}).textContent || '').trim();
    return (this.info && this.info.name) || t || 'Juego ' + this.page.id;
  },

  game: function () {
    var s = this.s, el = RX.el, self = this, placeId = this.page.id;
    var ids = RC.idsIn(s, 'games');
    var notes = s['notes.enabled'] && s['notes.onGames'];
    var hideGame = s['discover.enabled'] && s['discover.blockButton'];
    var hideCreator = s['discover.enabled'] && s['discover.creatorButton'];
    // El universo y el creador hacen falta para sus IDs y para ocultar al creador (se piden una vez).
    if (((ids && s['ids.extra']) || hideCreator) && !this.infoReq) {
      this.infoReq = this.loadGameInfo(placeId).then(function (i) { self.info = i; self.game(); });
    }
    var info = this.info || {}, c = info.creator;
    var wrap = this.wrap || (this.wrap = el('div', { class: 'rc-tools-wrap', id: 'rc-game-tools-wrap' }));
    var bar = this.bar || (this.bar = el('div', { class: 'rc-tools', id: 'rc-game-tools' }));
    bar.textContent = '';
    if (ids) {
      var chips = el('span', { class: 'rc-chips' }, [RC.idChip('ID del lugar', placeId, 'game', s)]);
      if (s['ids.extra'] && info.uni) chips.appendChild(RC.idChip('ID del juego', info.uni, null, s));
      if (s['ids.extra'] && c) chips.appendChild(RC.idChip(c.type === 'Group' ? 'ID del grupo creador' : 'ID del creador', c.id, c.type === 'Group' ? 'group' : 'user', s));
      bar.appendChild(chips);
    }
    if (notes) {
      if (!this.noteCtl) this.noteCtl = RC.note('g:' + placeId, function () { return self.gameName(); }, { placeId: placeId }, s['notes.expanded']);
      else this.noteCtl.setExpanded(s['notes.expanded']);
      bar.appendChild(this.noteCtl.button);
    } else if (this.noteCtl) { this.noteCtl.box.remove(); this.noteCtl = null; }
    var blk = this.blk || RC.normBlocked();
    if (hideGame) {
      var gHidden = !!blk.games[placeId];
      bar.appendChild(RX.ibtn(gHidden ? 'eye' : 'ban', gHidden ? 'Volver a mostrarlo' : 'Ocultar juego', {
        class: 'rx-btn rx-btn-small rc-hide-game' + (gHidden ? ' rx-on' : ''),
        title: gHidden ? 'Está oculto en Descubrir, el Inicio y las listas' : 'No volver a mostrar este juego en Descubrir, el Inicio y las listas',
        onclick: function () { if (gHidden) RC.unblock('games', placeId); else RC.blockGame(placeId, self.gameName()); }
      }));
    }
    if (hideCreator && c) {
      var cKey = c.type + ':' + c.id, cHidden = !!blk.creators[cKey];
      bar.appendChild(RX.ibtn(cHidden ? 'eye' : 'eyeOff', cHidden ? 'Volver a mostrar los de ' + c.name : 'Ocultar juegos de ' + c.name, {
        class: 'rx-btn rx-btn-small rc-hide-creator' + (cHidden ? ' rx-on' : ''),
        title: cHidden ? 'Los juegos de ' + c.name + ' están ocultos en las listas' : 'No volver a mostrar ningún juego de ' + c.name,
        onclick: function () { if (cHidden) RC.unblock('creators', cKey); else RC.blockCreator(cKey, c.name); }
      }));
    }
    if (bar.parentNode !== wrap) wrap.insertBefore(bar, wrap.firstChild);
    if (this.noteCtl && this.noteCtl.box.parentNode !== wrap) wrap.appendChild(this.noteCtl.box);
    this.place(wrap, bar.childNodes.length > 0, ['.game-title-container', '.game-name', '#game-detail-page h1'], 'after');
  },

  loadGameInfo: async function (placeId) {
    try {
      var uni = await RX.universeOf(placeId);
      var info = { uni: uni, creator: null, name: null };
      var g = await RX.api('https://games.roblox.com/v1/games?universeIds=' + uni).catch(function () { return {}; });
      var x = g.data && g.data[0];
      if (x) { info.creator = x.creator && x.creator.id ? x.creator : null; info.name = x.name || null; }
      return info;
    } catch (e) { return false; } // sin universo: solo el ID del lugar
  },

  // ---------- Perfil ----------
  userName: function () {
    var t = ((document.querySelector('.profile-name, .profile-display-name, .user-profile-header h1, h1') || {}).textContent || '').trim();
    return t || 'Usuario ' + this.page.id;
  },

  profile: async function () {
    var s = this.s, el = RX.el, self = this, uid = this.page.id;
    var ticket = this.ticket = (this.ticket || 0) + 1;
    var me = await RX.me();
    if (ticket !== this.ticket) return; // llegó otro cambio de ajustes mientras tanto
    var mine = !!me && me.id === uid;
    var rows = [];
    if (s['profile.inventoryValue']) rows.push({ key: 'inv', icon: 'gem', label: 'Valor del inventario' });
    if (s['profile.mutualFriends'] && me && !mine) rows.push({ key: 'mutual', icon: 'users', label: 'Amigos en común' });
    if (s['profile.nameHistory']) rows.push({ key: 'names', icon: 'history', label: 'Nombres anteriores' });
    // Plegado: al cambiar el ajuste se aplica; si no, se respeta lo que hayas abierto o cerrado tú.
    if (this.collapsedPref !== !!s['profile.collapsed']) { this.collapsedPref = !!s['profile.collapsed']; this.open = !this.collapsedPref; }
    var collapsed = !this.open && rows.length > 0;

    var panel = this.panel;
    if (!panel) {
      panel = this.panel = el('div', { class: 'rx-panel rc-profile', id: 'rc-profile' });
      this.head = el('div', { class: 'rc-profile-head' });
      this.rowsBox = el('div', { class: 'rc-rows' });
      // Un clic en la fila de arriba (fuera de los botones) abre el panel plegado.
      this.head.addEventListener('click', function (e) {
        if (!panel.classList.contains('rc-collapsed') || e.target.closest('button, a, input, textarea, select')) return;
        self.open = true;
        self.profile();
      });
    }
    panel.classList.toggle('rc-collapsed', collapsed);

    var tools = el('div', { class: 'rc-tools' });
    if (RC.idsIn(s, 'profiles')) tools.appendChild(RC.idChip('ID del usuario', uid, 'user', s));
    if (s['notes.enabled'] && s['notes.onProfiles']) {
      // Con el panel plegado la nota también se pliega tras su botón.
      var expanded = !!s['notes.expanded'] && !collapsed;
      if (!this.noteCtl) this.noteCtl = RC.note('u:' + uid, function () { return self.userName(); }, { userId: uid }, expanded);
      else this.noteCtl.setExpanded(expanded);
      tools.appendChild(this.noteCtl.button);
    } else if (this.noteCtl) { this.noteCtl.box.remove(); this.noteCtl = null; }
    this.head.textContent = '';
    if (tools.childNodes.length) this.head.appendChild(tools);
    if (rows.length) {
      var names = rows.map(function (r) { return r.label.toLowerCase(); });
      var what = names.length > 1 ? names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1] : names[0];
      this.head.appendChild(el('button', { type: 'button', class: 'rx-btn rx-btn-small rc-profile-toggle', 'aria-expanded': String(!collapsed),
        title: collapsed ? 'Ver ' + what : 'Plegar el panel', onclick: function () { self.open = collapsed; self.profile(); } }, [
        collapsed ? el('span', { class: 'rc-profile-icons' }, rows.map(function (r) { return RX.icon(r.icon); })) : null,
        el('span', { text: collapsed ? 'Ver más' : 'Plegar' }),
        RX.icon('chevronDown', { cls: 'rc-chev' })
      ]));
    }

    this.rowsBox.textContent = '';
    this.bodies = {};
    if (!collapsed) rows.forEach(function (r) {
      var body = el('div', { class: 'rc-row-body' });
      self.rowsBox.appendChild(el('div', { class: 'rc-row', 'data-row': r.key }, [el('div', { class: 'rc-row-label' }, [RX.icon(r.icon), ' ' + r.label]), body]));
      self.bodies[r.key] = body;
      self.paintRow(r.key);
    });

    // Orden fijo: botones, nota y filas (sin mover lo que ya está en su sitio, por si estás escribiendo la nota).
    [this.head, this.noteCtl && this.noteCtl.box, this.rowsBox].filter(Boolean).forEach(function (n, i) {
      if (panel.childNodes[i] !== n) panel.insertBefore(n, panel.childNodes[i] || null);
    });
    this.place(panel, this.head.childNodes.length > 0, this.PROFILE_ANCHORS, 'after', function () {
      // La última conexión (social.js) va justo encima de este panel.
      var lo = document.querySelector('.rx-lastonline');
      if (lo && lo.parentNode === panel.parentNode && (panel.compareDocumentPosition(lo) & Node.DOCUMENT_POSITION_FOLLOWING)) panel.before(lo);
    });
  },

  // Cada fila del perfil se carga una vez (al verse por primera vez) y se repinta al cambiar los ajustes.
  rowData: function (key) {
    var self = this, c = this.rows || (this.rows = {});
    if (c[key]) return c[key];
    var d = c[key] = { state: 'loading' };
    var load = { inv: this.loadInventory, mutual: this.loadMutual, names: this.loadNames }[key];
    load.call(this, d).then(function (v) { d.state = 'ok'; d.v = v; }, function (e) { d.state = 'error'; d.e = e; }).then(function () { self.paintRow(key); });
    return d;
  },

  paintRow: function (key) {
    var body = this.bodies && this.bodies[key];
    if (!body) return;
    var d = this.rowData(key), el = RX.el;
    body.textContent = '';
    if (d.state === 'loading') { body.appendChild(el('span', { class: 'rx-muted', text: d.progress || 'Cargando…' })); return; }
    if (d.state === 'error') {
      var e = d.e || {};
      var msg = {
        inv: e.status === 403 || /permission/i.test(e.message || '') ? 'Su inventario es privado.' : 'No se pudo leer el inventario ahora mismo.',
        mutual: 'No se pudieron comparar las listas de amigos ahora mismo.',
        names: 'No se pudieron leer sus nombres anteriores ahora mismo.'
      }[key];
      body.appendChild(el('span', { class: 'rx-muted', text: msg, title: e.message || '' }));
      return;
    }
    if (key === 'inv') this.paintInventory(body, d.v);
    else if (key === 'mutual') this.paintMutual(body, d.v);
    else this.paintNames(body, d.v);
  },

  loadInventory: async function (d) {
    var uid = this.page.id, items = [], cursor = '';
    for (var i = 0; i < 25; i++) {
      var r = await RX.api('https://inventory.roblox.com/v1/users/' + uid + '/assets/collectibles?sortOrder=Asc&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
      items.push.apply(items, r.data || []);
      cursor = r.nextPageCursor;
      if (!cursor) break;
      d.progress = 'Contando… ' + items.length + ' limiteds';
      this.paintRow('inv');
    }
    // De Rolimons solo se guarda lo de sus objetos: [RAP, valor].
    var rol = await RX.send('rolimons').catch(function () { return null; });
    var vals = null;
    if (rol && rol.items) {
      vals = {};
      items.forEach(function (it) { var x = rol.items[it.assetId]; if (x) vals[it.assetId] = [x[2], x[3]]; });
    }
    return { items: items, vals: vals };
  },

  paintInventory: function (body, v) {
    var s = this.s, el = RX.el, uid = this.page.id;
    if (!v.items.length) { body.appendChild(el('span', { class: 'rx-muted', text: 'No tiene limiteds (o no se pueden ver).' })); return; }
    // "trade.useValue": valor de Rolimons (o RAP si no tiene) o solo RAP.
    var useRap = s['trade.useValue'] === 'rap';
    var groups = {}, rapSum = 0, valSum = 0;
    v.items.forEach(function (it) {
      var x = v.vals && v.vals[it.assetId];
      var rap = x && x[0] > 0 ? x[0] : (it.recentAveragePrice || 0);
      var val = x && x[1] > 0 ? x[1] : rap;
      rapSum += rap;
      valSum += val;
      var g = groups[it.assetId] || (groups[it.assetId] = { id: it.assetId, name: it.name, count: 0, worth: useRap ? rap : val });
      g.count++;
    });
    var count = v.items.length;
    body.appendChild(el('div', { class: 'rc-big' }, [
      RX.icon('robux'), el('b', { text: RX.fmt(useRap ? rapSum : valSum) }),
      el('span', { class: 'rx-muted', text: (useRap ? 'de RAP' : 'de valor · RAP ' + RX.fmt(rapSum)) + ' · ' + count + (count === 1 ? ' limited' : ' limiteds') })
    ]));
    if (!v.vals) body.appendChild(el('span', { class: 'rx-muted', text: 'Rolimons no responde ahora mismo: se usa el RAP de Roblox.' }));
    var n = Math.max(0, Math.min(10, Number(s['profile.inventoryTop']) || 0));
    if (n) {
      var top = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.worth - a.worth; }).slice(0, n);
      var thumbs = this.assetThumbs(top.map(function (g) { return g.id; }));
      body.appendChild(el('div', { class: 'rc-inv-top' }, top.map(function (g) {
        return el('a', { class: 'rc-inv-item', href: '/catalog/' + g.id, title: g.name + ' · ' + RX.fmt(g.worth) + ' R$' + (g.count > 1 ? ' · tiene ' + g.count : '') }, [
          el('img', { src: thumbs[g.id] || '', alt: '', loading: 'lazy' }),
          el('span', { class: 'rc-inv-name', text: g.name }),
          g.count > 1 ? el('span', { class: 'rc-inv-count', text: '×' + g.count }) : null,
          el('b', { text: RX.short(g.worth) })
        ]);
      })));
    }
    body.appendChild(el('a', { class: 'rx-link', href: 'https://www.rolimons.com/player/' + uid, target: '_blank', rel: 'noopener', text: 'Ver en Rolimons' }));
  },

  // Miniaturas de objetos y de personas: se piden las que faltan y se repinta la fila al llegar.
  assetThumbs: function (ids) {
    var self = this, map = this.thumbMap || (this.thumbMap = {});
    var missing = ids.filter(function (id) { return !(id in map); });
    if (missing.length) {
      missing.forEach(function (id) { map[id] = ''; });
      RX.thumbs('assets', missing, '150x150').then(function (t) { Object.assign(map, t); self.paintRow('inv'); });
    }
    return map;
  },

  people: function (ids) {
    var self = this, p = this.peopleMap || (this.peopleMap = { heads: {}, names: {} });
    var missing = ids.filter(function (id) { return !(id in p.heads); });
    if (missing.length) {
      missing.forEach(function (id) { p.heads[id] = ''; });
      Promise.all([
        RX.thumbs('users', missing, '48x48'),
        RX.api('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: missing, excludeBannedUsers: false } }).catch(function () { return {}; })
      ]).then(function (r) {
        Object.assign(p.heads, r[0]);
        (r[1].data || []).forEach(function (x) { p.names[x.id] = x; });
        self.paintRow('mutual');
      });
    }
    return p;
  },

  friendList: async function (uid) {
    var ids = [], cursor = '';
    for (var i = 0; i < 20; i++) {
      var r = await RX.api('https://friends.roblox.com/v1/users/' + uid + '/friends/find?limit=50' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
      (r.PageItems || []).forEach(function (p) { ids.push(p.id); });
      cursor = r.NextCursor;
      if (!cursor) break;
    }
    return ids;
  },

  loadMutual: async function () {
    var me = await RX.me();
    var lists = await Promise.all([this.friendList(me.id), this.friendList(this.page.id)]);
    var mineSet = {};
    lists[0].forEach(function (id) { mineSet[id] = 1; });
    return lists[1].filter(function (id) { return mineSet[id]; });
  },

  paintMutual: function (body, common) {
    var el = RX.el;
    if (!common.length) { body.appendChild(el('span', { class: 'rx-muted', text: 'Ninguno.' })); return; }
    var max = Math.max(1, Math.min(40, Number(this.s['profile.mutualMax']) || 12));
    var show = common.slice(0, max);
    var p = this.people(show);
    body.appendChild(el('div', { class: 'rc-avatars' }, show.map(function (id) {
      var n = p.names[id];
      return el('a', { href: '/users/' + id + '/profile', title: n ? n.displayName + ' (@' + n.name + ')' : String(id) }, [el('img', { src: p.heads[id] || '', alt: '' })]);
    })));
    body.appendChild(el('span', { class: 'rx-muted', text: common.length + (common.length === 1 ? ' amigo en común' : ' amigos en común') + (common.length > show.length ? ' (se ven ' + show.length + ')' : '') }));
  },

  loadNames: async function () {
    var d = await RX.api('https://users.roblox.com/v1/users/' + this.page.id + '/username-history?limit=50&sortOrder=Desc');
    return (d.data || []).map(function (x) { return x.name; });
  },

  paintNames: function (body, list) {
    var el = RX.el;
    if (!list.length) { body.appendChild(el('span', { class: 'rx-muted', text: 'Nunca se ha cambiado el nombre.' })); return; }
    body.appendChild(el('div', { class: 'rc-tags' }, list.map(function (n) { return el('span', { class: 'rc-tag', text: '@' + n }); })));
  },

  // ---------- Objeto o paquete del catálogo ----------
  item: function () {
    var s = this.s, el = RX.el, id = this.page.id, bundle = this.page.kind === 'bundle';
    var bar = this.itemBar || (this.itemBar = el('div', { class: 'rc-tools', id: 'rc-item-tools' }));
    bar.textContent = '';
    if (RC.idsIn(s, 'items')) bar.appendChild(RC.idChip(bundle ? 'ID del paquete' : 'ID del objeto', id, bundle ? 'bundle' : 'item', s));
    if (s['wishlist.enabled']) {
      if (!this.wish) this.wish = this.wishControls(id, bundle ? 'Bundle' : 'Asset');
      this.wish.nodes.forEach(function (n) { bar.appendChild(n); });
      this.wish.paint();
    }
    this.place(bar, bar.childNodes.length > 0, ['#item-details', '.item-details-info-content', '#item-container', '.item-details'], 'before');
  },

  // Botón "Seguir precio" de la lista de deseos, con precio objetivo opcional.
  wishControls: function (id, type) {
    var el = RX.el;
    var follow = el('button', { type: 'button', class: 'rx-btn rx-btn-small rc-wish-btn', title: 'Te aviso cuando baje de precio, llegue a tu precio objetivo o vuelva a estar a la venta' });
    var target = el('input', { type: 'number', min: 0, class: 'rx-num rc-wish-target', placeholder: 'Objetivo R$', title: 'Precio objetivo (opcional)' });
    var info = el('span', { class: 'rx-muted rc-wish-info' });
    var find = function (list) { return list.find(function (x) { return String(x.id) === String(id) && (x.type || 'Asset') === type; }); };
    var paint = async function () {
      var it = find(await RX.local('wishlist', []));
      follow.textContent = '';
      follow.appendChild(RX.icon(it ? 'star' : 'starLine'));
      follow.appendChild(el('span', { text: it ? 'Siguiendo' : 'Seguir precio' }));
      follow.classList.toggle('rx-on', !!it);
      target.hidden = !it;
      if (document.activeElement !== target) target.value = it && it.target ? it.target : '';
      info.textContent = it ? (it.onSale ? 'Precio ahora: ' + RX.fmt(it.price) + ' R$' + (it.lowest != null ? ' · mínimo visto: ' + RX.fmt(it.lowest) + ' R$' : '') : 'Ahora no está a la venta: te aviso si vuelve.') : '';
    };
    follow.addEventListener('click', async function () {
      var it = find(await RX.local('wishlist', []));
      try {
        if (it) { await RX.send('wishlist:remove', { id: id, itemType: type }); RX.toast('Ya no sigues este objeto'); }
        else {
          var name = ((document.querySelector('.item-name-container h1, #item-container h1, .item-details h1, h1') || {}).textContent || '').trim();
          await RX.send('wishlist:add', { id: id, itemType: type, name: name });
          RX.challenge('wish');
          RX.toast('Añadido a tu lista de deseos');
        }
      } catch (e) { RX.toast('No se pudo: ' + e.message); }
      paint();
    });
    target.addEventListener('change', async function () {
      await RX.send('wishlist:update', { id: id, itemType: type, target: Number(target.value) || 0 }).catch(function () {});
      RX.toast(Number(target.value) > 0 ? 'Te aviso cuando cueste ' + RX.fmt(Number(target.value)) + ' R$ o menos' : 'Sin precio objetivo');
      paint();
    });
    return { nodes: [follow, target, info], paint: paint };
  },

  // ---------- Grupos e insignias: solo el ID ----------
  simple: function () {
    var k = this.page.kind, s = this.s;
    var group = k === 'group';
    var bar = this.simpleBar || (this.simpleBar = RX.el('div', { class: 'rc-tools', id: 'rc-id-tools' }));
    bar.textContent = '';
    var on = RC.idsIn(s, group ? 'groups' : 'badges');
    if (on) bar.appendChild(RC.idChip(group ? 'ID del grupo' : 'ID de la insignia', this.page.id, k, s));
    this.place(bar, on, group ? ['.group-header', '.group-title', '#group-container h1', '.profile-header'] : ['.badge-title', '#item-container h1', '.item-details h1', 'h1'], 'after');
  }
});

// ---------- Robux a dinero real ----------
RX.features.push({
  id: 'money',
  KEYS: ['money.enabled', 'money.currency', 'money.symbol', 'money.basis', 'money.per100', 'money.style', 'money.decimals', 'money.hover'],

  run: function (s) {
    if (!RX.isTop) return;
    var self = this;
    // Cambio de moneda actualizado (botón de Ajustes o cada 12 h): se vuelve a pedir.
    RX.B.storage.onChanged.addListener(function (ch, area) {
      if (area === 'local' && ch.fxCache && self.s && self.s['money.enabled']) { self.sig = null; self.update(self.s); }
    });
    this.update(s);
  },

  update: async function (s) {
    if (!RX.isTop) return;
    var self = this, sig = rcSettingsSig(s, this.KEYS);
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    // Solo al pasar el ratón: lo hace el CSS con esta clase.
    document.documentElement.classList.toggle('rc-money-hover', !!(s['money.enabled'] && s['money.hover']));
    var rate = null;
    if (s['money.enabled']) { try { rate = await RX.send('moneyRate'); } catch (e) { rate = null; } }
    if (sig !== this.sig) return; // hubo otro cambio mientras llegaba el cambio de moneda
    if (this.obs) { this.obs.disconnect(); this.obs = null; }
    document.querySelectorAll('.rc-money').forEach(function (n) { n.remove(); });
    this.seen = new WeakMap();
    this.rate = rate && !rate.error && rate.perRobux ? rate : null;
    if (!this.rate) return;
    this.scan();
    var t;
    this.obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { self.scan(); }, 500); });
    this.obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  },

  scan: function () {
    var self = this, rate = this.rate, s = this.s;
    if (!rate) return; // un repaso pendiente del observador tras apagarlo
    var title = 'Precio aproximado en ' + (rate.currency || rate.symbol || 'tu moneda') +
      (rate.manual ? ' (con el valor que pusiste en Ajustes)' : s['money.basis'] === 'devex' ? ' (lo que cobraría un creador con DevEx)' : ' (lo que cuestan esos Robux al comprarlos)') +
      (rate.fxUpdated ? ' · cambio del ' + new Date(rate.fxUpdated).toLocaleDateString('es-ES') : '');
    document.querySelectorAll('[class*="text-robux"], .robux-amount, [class*="icon-robux"] + span').forEach(function (n) {
      if (n.closest('#navbar-robux, #nav-robux-amount, #nav-robux-balance, .rbx-navbar-right, .rx-panel, #rk-home, .rc-money, .rx-modal-wrap') || n.id === 'nav-robux-amount') return;
      var text = (n.textContent || '').trim();
      if (self.seen.get(n) === text) return;
      self.seen.set(n, text);
      var next = n.nextSibling;
      if (next && next.nodeType === 1 && next.classList.contains('rc-money')) next.remove();
      var r = RC.parseRobux(text);
      if (!r || r <= 0) return;
      n.after(RX.el('span', { class: 'rc-money', title: title, text: RC.money(r, rate, s) }));
    });
  }
});

// ---------- Filtros de juegos en Descubrir y listas ----------
RX.features.push({
  id: 'discover',
  KEYS: ['discover.enabled', 'discover.minRating', 'discover.blockWords', 'discover.blockButton'],

  run: function (s) {
    if (!RX.isTop) return;
    var self = this;
    RX.B.storage.onChanged.addListener(function (ch, area) {
      if (area === 'local' && ch.blocked && self.on) { self.blocked = RC.normBlocked(ch.blocked.newValue); self.rescan(); }
    });
    this.update(s);
  },

  update: async function (s) {
    if (!RX.isTop) return;
    var self = this, sig = rcSettingsSig(s, this.KEYS);
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    this.on = !!s['discover.enabled'];
    if (!this.on) {
      if (this.obs) { this.obs.disconnect(); this.obs = null; }
      this.reset();
      return;
    }
    if (!this.blocked) this.blocked = await RC.blocked();
    if (!this.meta) this.meta = await RX.local('placeMeta', {});
    if (sig !== this.sig) return;
    this.rescan();
    if (!this.obs) {
      var t;
      this.obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { self.scan(); }, 450); });
      this.obs.observe(document.body, { childList: true, subtree: true });
    }
  },

  // Quita lo que se puso (marcas, juegos ocultos y botones) para volver a mirar las tarjetas con los ajustes nuevos.
  reset: function () {
    document.querySelectorAll('[data-rc-card]').forEach(function (n) { n.removeAttribute('data-rc-card'); n.classList.remove('rc-hidden-game'); });
    document.querySelectorAll('.rc-block-btn').forEach(function (b) { b.remove(); });
  },

  rescan: function () {
    this.reset();
    this.scan();
  },

  cards: function () {
    var out = [];
    document.querySelectorAll('a[href*="/games/"]').forEach(function (a) {
      if (a.closest('#rk-home, .rx-panel, .rx-modal-wrap, #rx-search, #rc-roulette, .rc-tools-wrap')) return;
      var m = /\/games\/(\d+)/.exec(a.getAttribute('href') || '');
      if (!m) return;
      var card = a.closest('.game-card-container, .game-card, li.list-item, [data-testid="game-tile"], .grid-item-container, .game-tile, .hover-game-tile') || a;
      if (!card.querySelector('img, [class*="thumb"]')) return;
      if (card.getAttribute('data-rc-card')) return;
      out.push({ card: card, placeId: m[1], link: a });
    });
    return out;
  },

  rating: function (card) {
    var lab = card.querySelector('.vote-percentage-label, [class*="vote-percentage"], [data-testid*="rating"]');
    var m = /(\d{1,3})\s?%/.exec(lab ? lab.textContent : card.textContent || '');
    return m ? Number(m[1]) : null;
  },

  name: function (card, link) {
    var n = card.querySelector('.game-card-name, [class*="game-card-name"], .game-name-title, [data-testid*="name"], [class*="name"]');
    var t = n && (n.getAttribute('title') || n.textContent);
    if (!t) { var img = card.querySelector('img[alt]'); t = (link.getAttribute('title') || link.textContent || '').trim() || (img && img.getAttribute('alt')); }
    return String(t || '').trim();
  },

  scan: function () {
    var self = this, s = this.s;
    if (!this.on || !this.blocked) return;
    var min = Number(s['discover.minRating']) || 0;
    var found = this.cards();
    if (!found.length) return;
    var needCreators = Object.keys(this.blocked.creators).length > 0;
    found.forEach(function (f) {
      f.card.setAttribute('data-rc-card', '1');
      var r = self.rating(f.card), name = self.name(f.card, f.link);
      var meta = self.meta[f.placeId];
      var hide = !!self.blocked.games[f.placeId] || (min > 0 && r !== null && r < min) || rcBlockedName(name, s) ||
        !!(needCreators && meta && meta.c && self.blocked.creators[meta.c]);
      f.card.classList.toggle('rc-hidden-game', hide);
      if (s['discover.blockButton'] && !hide && !f.card.querySelector('.rc-block-btn')) {
        if (getComputedStyle(f.card).position === 'static') f.card.style.position = 'relative';
        f.card.appendChild(RX.el('button', { type: 'button', class: 'rc-block-btn', title: 'Ocultar este juego', onclick: function (e) {
          e.preventDefault();
          e.stopPropagation();
          f.card.classList.add('rc-hidden-game');
          RC.blockGame(f.placeId, self.name(f.card, f.link));
        } }, [RX.icon('ban')]));
      }
    });
    if (needCreators) this.lookupCreators(found.filter(function (f) { return !self.meta[f.placeId]; }));
  },

  // Para ocultar por creador hace falta saber de quién es cada juego (se guarda para no repetir).
  lookupCreators: async function (list) {
    var self = this;
    var ids = list.map(function (f) { return f.placeId; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).slice(0, 100);
    if (!ids.length) return;
    for (var i = 0; i < ids.length; i += 50) {
      try {
        var places = await RX.api('https://games.roblox.com/v1/games/multiget-place-details?placeIds=' + ids.slice(i, i + 50).join(','));
        var uni = {};
        (places || []).forEach(function (p) { if (p.universeId) uni[p.universeId] = String(p.placeId); });
        var u = Object.keys(uni);
        if (!u.length) continue;
        var g = await RX.api('https://games.roblox.com/v1/games?universeIds=' + u.join(','));
        (g.data || []).forEach(function (x) { if (uni[x.id]) self.meta[uni[x.id]] = { u: x.id, c: x.creator ? x.creator.type + ':' + x.creator.id : null }; });
      } catch (e) { /* sin datos: no se filtra por creador */ }
    }
    var keys = Object.keys(this.meta);
    if (keys.length > 3000) keys.slice(0, 1000).forEach(function (k) { delete self.meta[k]; });
    await RX.setLocal({ placeMeta: this.meta });
    list.forEach(function (f) {
      var m = self.meta[f.placeId];
      if (m && m.c && self.blocked.creators[m.c]) f.card.classList.add('rc-hidden-game');
    });
  }
});
