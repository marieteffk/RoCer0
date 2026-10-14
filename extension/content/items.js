// Insignias compactas, botones de objetos (Explorador, Contenido, Descarga, Propietarios) y vista rápida del catálogo.

// Firma de los ajustes que usa un módulo: si no cambia, no hace falta repintar nada cuando se guardan otros ajustes.
// La usan también social.js y pages.js (se cargan después de este archivo).
function rcSettingsSig(s, keys) {
  return JSON.stringify(keys.map(function (k) { return s[k]; }));
}

// ---------- Tabla de insignias en la página de un juego ----------
RX.features.push({
  id: 'badges',
  KEYS: ['badges.compact', 'badges.sort', 'badges.columns', 'badges.hideOwned', 'badges.hideNative'],
  COLS: {
    rarity: { head: 'Rareza', width: 'minmax(104px, 1.3fr)' },
    yesterday: { head: 'Ayer', width: 'minmax(44px, .6fr)' },
    total: { head: 'Total', width: 'minmax(52px, .6fr)' },
    owned: { head: '', width: '26px' }
  },

  run: function (s) {
    if (!RX.isTop || !/^\/games\/\d+/.test(RX.path())) return;
    this.placeId = RX.placeIdFromUrl();
    this.update(s);
  },

  update: function (s) {
    if (!this.placeId) return;
    var sig = rcSettingsSig(s, this.KEYS), self = this;
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    if (!s['badges.compact']) {
      document.documentElement.classList.remove('rx-hide-native-badges');
      if (this.box) this.box.remove();
      return;
    }
    if (!this.box) this.build();
    if (!this.box.isConnected && !this.mounting) {
      this.mounting = true;
      RX.mount(['#game-badges-container', '.badge-container', '#game-detail-page .tab-content', '#game-detail-page'], this.box, 'before').then(function () {
        self.mounting = false;
        if (!self.s['badges.compact']) self.box.remove();
      });
    }
    if (!this.data && !this.loading && !this.error) this.load();
    this.paint();
  },

  sortOptions: function () {
    var it = rxAllItems().filter(function (x) { return x.item.key === 'badges.sort'; })[0];
    return it && it.item.options ? it.item.options : [['default', 'El del juego']];
  },

  build: function () {
    var el = RX.el, self = this;
    this.sortSel = el('select', { class: 'rc-badges-sort', title: 'Orden de la tabla (se guarda en tus ajustes)' },
      this.sortOptions().map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    this.sortSel.addEventListener('change', function () { RX.saveSettings({ 'badges.sort': self.sortSel.value }); });
    this.sortWrap = el('label', { class: 'rc-badges-sortwrap', hidden: true }, [el('span', { text: 'Orden' }), this.sortSel]);
    this.summary = el('div', { class: 'rx-muted rc-badges-summary', text: 'Cargando…' });
    this.body = el('div', { class: 'rc-badges-body' });
    this.box = el('div', { class: 'rx-panel', id: 'rx-badges' }, [
      el('div', { class: 'rc-badges-head' }, [RX.title('award', 'Insignias'), this.sortWrap]),
      this.summary, this.body
    ]);
  },

  load: async function () {
    this.loading = true;
    try {
      var uni = await RX.universeOf(this.placeId), badges = [], cursor = '';
      for (var i = 0; i < 5; i++) {
        var d = await RX.api('https://badges.roblox.com/v1/universes/' + uni + '/badges?limit=100&sortOrder=Asc' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
        badges.push.apply(badges, d.data || []);
        cursor = d.nextPageCursor;
        if (!cursor) break;
      }
      var owned = {}, me = await RX.me();
      if (me) for (var j = 0; j < badges.length; j += 100) {
        try {
          var a = await RX.api('https://badges.roblox.com/v1/users/' + me.id + '/badges/awarded-dates?badgeIds=' + badges.slice(j, j + 100).map(function (b) { return b.id; }).join(','));
          (a.data || []).forEach(function (x) { owned[x.badgeId] = x.awardedDate; });
        } catch (e) { /* sin datos de las que tienes */ }
      }
      var icons = badges.length ? await RX.thumbs('badges', badges.map(function (b) { return b.id; }), '150x150') : {};
      this.data = { badges: badges, owned: owned, icons: icons, me: !!me };
    } catch (e) {
      this.error = e;
    }
    this.loading = false;
    this.paint();
  },

  rarity: function (p) { return p < 1 ? 'Imposible' : p < 5 ? 'Extrema' : p < 10 ? 'Muy difícil' : p < 25 ? 'Difícil' : p < 50 ? 'Media' : p < 80 ? 'Fácil' : 'Gratis'; },

  // Las insignias en el orden de "badges.sort" (las que no tienen datos van al final).
  sorted: function (list, mode) {
    var byIndex = function (a, b) { return a.i - b.i; };
    var byRate = function (dir) {
      return function (a, b) {
        if (a.rate === null || b.rate === null) return (a.rate === null) - (b.rate === null) || byIndex(a, b);
        return dir * (a.rate - b.rate) || byIndex(a, b);
      };
    };
    var cmp = {
      hard: byRate(1),
      easy: byRate(-1),
      missing: function (a, b) { return (a.own - b.own) || byIndex(a, b); },
      owned: function (a, b) { return (b.own - a.own) || byIndex(a, b); },
      name: function (a, b) { return String(a.b.name || '').localeCompare(String(b.b.name || ''), 'es', { sensitivity: 'base' }) || byIndex(a, b); }
    }[mode] || byIndex;
    return list.slice().sort(cmp);
  },

  paint: function () {
    var s = this.s, el = RX.el, d = this.data, self = this;
    if (!this.box || !s['badges.compact']) return;
    // La lista de Roblox se esconde mientras la tabla carga; si falla, vuelve a verse.
    document.documentElement.classList.toggle('rx-hide-native-badges', !!s['badges.hideNative'] && !this.error);
    this.body.textContent = '';
    this.sortSel.value = s['badges.sort'];
    this.sortWrap.hidden = !d || !d.badges.length;
    if (this.error) { this.summary.textContent = 'No se pudieron cargar las insignias ahora mismo.'; this.summary.title = this.error.message || ''; return; }
    if (!d) { this.summary.textContent = 'Cargando…'; return; }
    if (!d.badges.length) { this.summary.textContent = 'Este juego no tiene insignias.'; return; }

    var have = d.badges.filter(function (b) { return d.owned[b.id]; }).length;
    var hideOwned = !!s['badges.hideOwned'] && d.me;
    this.summary.textContent = (d.me ? 'Tienes ' + have + ' de ' + d.badges.length + '.' : d.badges.length + ' insignias.') +
      (hideOwned && have ? ' No se muestran las que ya tienes.' : '');

    var list = d.badges.map(function (b, i) {
      var st = b.statistics || {};
      var rate = typeof st.winRatePercentage === 'number' ? st.winRatePercentage * 100 : null;
      return { b: b, i: i, own: d.owned[b.id] ? 1 : 0, rate: rate };
    });
    if (hideOwned) list = list.filter(function (x) { return !x.own; });
    if (!list.length) { this.body.appendChild(el('div', { class: 'rc-badges-done' }, [RX.icon('checkCircle'), el('span', { text: 'Ya las tienes todas.' })])); return; }
    list = this.sorted(list, s['badges.sort']);

    var want = Array.isArray(s['badges.columns']) ? s['badges.columns'] : [];
    var cols = Object.keys(this.COLS).filter(function (c) { return want.indexOf(c) >= 0 && (c !== 'owned' || d.me); });
    var table = el('div', { class: 'rx-badge-table', 'data-cols': cols.join(' ') });
    table.style.setProperty('--rc-badge-cols', ['30px', 'minmax(0, 2fr)'].concat(cols.map(function (c) { return self.COLS[c].width; })).join(' '));
    table.appendChild(el('div', { class: 'rx-badge-row rx-server-head' }, ['', 'Nombre'].concat(cols.map(function (c) { return self.COLS[c].head; })).map(function (t) { return el('span', { text: t }); })));
    list.forEach(function (x) {
      var b = x.b, st = b.statistics || {};
      var cells = [
        el('img', { src: d.icons[b.id] || '', alt: '', loading: 'lazy' }),
        el('a', { class: 'rc-badge-name', href: '/badges/' + b.id, text: b.name, title: b.description || b.name })
      ];
      cols.forEach(function (c) {
        if (c === 'rarity') {
          cells.push(x.rate === null ? el('span', { class: 'rx-muted', text: '—' }) : el('span', { class: 'rc-rarity' }, [
            el('b', { text: x.rate.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' }), ' ',
            el('span', { text: self.rarity(x.rate) })
          ]));
        } else if (c === 'yesterday') cells.push(el('span', { text: RX.short(st.pastDayAwardedCount || 0), title: RX.fmt(st.pastDayAwardedCount || 0) + ' ayer' }));
        else if (c === 'total') cells.push(el('span', { text: RX.short(st.awardedCount || 0), title: RX.fmt(st.awardedCount || 0) + ' en total' }));
        else if (c === 'owned') cells.push(el('span', { class: 'rc-owned', title: x.own ? 'La tienes desde el ' + new Date(d.owned[b.id]).toLocaleDateString('es-ES') : '' }, [x.own ? RX.icon('checkCircle') : null]));
      });
      table.appendChild(el('div', { class: 'rx-badge-row' + (x.own ? ' rx-owned' : '') }, cells));
    });
    this.body.appendChild(table);
  }
});

// ---------- Botones en la página de un objeto ----------
RX.features.push({
  id: 'items',
  KEYS: ['items.buttons', 'items.buttonList', 'items.limitedOnly', 'items.rolimonsLink'],

  run: function (s) {
    var m = /^\/(catalog|library|bundles)\/(\d+)/.exec(RX.path());
    // Los paquetes no se pueden descargar ni explorar como un objeto.
    if (!m || !RX.isTop || m[1] === 'bundles') return;
    this.assetId = m[2];
    this.update(s);
  },

  update: async function (s) {
    if (!this.assetId) return;
    var sig = rcSettingsSig(s, this.KEYS);
    this.s = s;
    if (sig === this.sig) return;
    this.sig = sig;
    if (!s['items.buttons'] && !s['items.rolimonsLink']) { if (this.bar) this.bar.remove(); return; }
    if (!this.infoReq) {
      var id = this.assetId;
      this.infoReq = RX.api('https://economy.roblox.com/v2/assets/' + id + '/details').catch(function () { return null; });
    }
    this.info = await this.infoReq;
    this.paint();
  },

  limited: function () {
    var i = this.info;
    return !!(i && (i.IsLimited || i.IsLimitedUnique || (i.CollectiblesItemDetails && i.CollectiblesItemDetails.IsLimited)));
  },

  paint: function () {
    var s = this.s, el = RX.el, self = this, id = this.assetId;
    var limited = this.limited();
    var bar = this.bar || (this.bar = el('div', { class: 'rx-panel rx-item-bar' }));
    bar.textContent = '';
    var list = Array.isArray(s['items.buttonList']) ? s['items.buttonList'] : [];
    var has = function (k) { return list.indexOf(k) >= 0; };
    if (s['items.buttons'] && (limited || !s['items.limitedOnly'])) {
      if (has('explorer')) bar.appendChild(RX.ibtn('compass', 'Explorador', { 'data-btn': 'explorer', title: 'Ver las piezas que hay dentro del objeto', onclick: function () { self.explorer(id); } }));
      if (has('content')) bar.appendChild(RX.ibtn('layers', 'Contenido', { 'data-btn': 'content', title: 'Mallas, texturas, sonidos y animaciones que usa', onclick: function () { self.content(id); } }));
      if (has('download')) bar.appendChild(el('a', { class: 'rx-btn', 'data-btn': 'download', href: 'https://assetdelivery.roblox.com/v1/asset/?id=' + id, target: '_blank', rel: 'noopener', title: 'Descargar el archivo del objeto' }, [RX.icon('download'), el('span', { text: 'Descargar' })]));
      if (has('owners') && limited) bar.appendChild(RX.ibtn('users', 'Propietarios', { 'data-btn': 'owners', title: 'Quién tiene copias de este limitado', onclick: function () { self.owners(id); } }));
    }
    if (limited && s['items.rolimonsLink']) {
      var val = el('span', { class: 'rx-muted rc-rol-value' });
      bar.appendChild(el('a', { class: 'rx-btn', 'data-btn': 'rolimons', href: 'https://www.rolimons.com/item/' + id, target: '_blank', rel: 'noopener', title: 'Abrir el objeto en Rolimons' }, [RX.icon('trend'), el('span', { text: 'Rolimons' })]));
      bar.appendChild(val);
      if (!this.rolReq) this.rolReq = RX.send('rolimons').catch(function () { return null; });
      this.rolReq.then(function (r) {
        var it = r && r.items && r.items[id];
        if (it) val.textContent = 'Valor ' + RX.fmt(it[3] > 0 ? it[3] : it[2]) + ' · RAP ' + RX.fmt(it[2]) + (it[5] >= 0 ? ' · Demanda ' + (['pésima', 'baja', 'normal', 'alta', 'brutal'][it[5]] || '') : '');
        else val.textContent = r ? 'Rolimons aún no tiene su valor.' : '';
      });
    }
    if (!bar.childNodes.length) { bar.remove(); return; }
    if (!bar.isConnected && !this.mounting) {
      this.mounting = true;
      RX.mount(['#item-details', '.item-details-info-content', '#item-container', '.item-details'], bar, 'before').then(function () {
        self.mounting = false;
        if (!bar.childNodes.length) bar.remove();
      });
    }
  },

  inspect: async function (id, body) {
    body.textContent = 'Descargando y analizando…';
    var r = await RX.send('assetInspect', { assetId: id });
    if (r.error) { body.textContent = r.error; return null; }
    body.textContent = '';
    return r;
  },

  explorer: async function (id) {
    var m = RX.modal('Explorador del objeto ' + id, RX.el('div'));
    var r = await this.inspect(id, m.body).catch(function (e) { m.body.textContent = 'No se pudo analizar: ' + e.message; });
    if (!r) return;
    var el = RX.el;
    m.body.appendChild(el('div', { class: 'rx-muted', text: r.format.toUpperCase() + ' · ' + RX.fmt(r.size) + ' bytes · ' + r.count + ' instancias' + (r.unsupported ? ' · algunas partes usan compresión ZSTD y no se pudieron leer' : '') }));
    var draw = function (nodes) {
      var ul = el('ul', { class: 'rx-tree' });
      nodes.forEach(function (n) {
        var li = el('li', {}, [el('span', { class: 'rx-cls', text: n.c }), ' ', el('span', { text: n.n !== n.c ? n.n : '' })]);
        if (n.k.length) li.appendChild(draw(n.k));
        ul.appendChild(li);
      });
      return ul;
    };
    m.body.appendChild(r.tree.length ? draw(r.tree) : el('div', { text: 'Este tipo de objeto no tiene árbol de instancias (es una imagen, audio, malla…).' }));
  },

  content: async function (id) {
    var m = RX.modal('Contenido del objeto ' + id, RX.el('div'));
    var r = await this.inspect(id, m.body).catch(function (e) { m.body.textContent = 'No se pudo analizar: ' + e.message; });
    if (!r) return;
    var el = RX.el;
    if (!r.contentIds.length) { m.body.appendChild(el('div', { text: 'No hay referencias a otros recursos dentro.' })); return; }
    m.body.appendChild(el('div', { class: 'rx-muted', text: r.contentIds.length + ' recursos referenciados (mallas, texturas, sonidos, animaciones…)' }));
    var list = el('div', { class: 'rx-content-list' });
    r.contentIds.forEach(function (cid) {
      list.appendChild(el('div', {}, [
        el('a', { href: 'https://create.roblox.com/store/asset/' + cid, target: '_blank', rel: 'noopener', text: cid }), ' · ',
        el('a', { href: 'https://assetdelivery.roblox.com/v1/asset/?id=' + cid, target: '_blank', rel: 'noopener', text: 'descargar' })
      ]));
    });
    m.body.appendChild(list);
  },

  owners: async function (id) {
    var el = RX.el, m = RX.modal('Propietarios del objeto ' + id, el('div', { text: 'Cargando…' }));
    try {
      var d = await RX.api('https://inventory.roblox.com/v2/assets/' + id + '/owners?limit=100&sortOrder=Desc');
      var rows = d.data || [];
      var ids = rows.filter(function (r) { return r.owner; }).map(function (r) { return r.owner.id; });
      var names = {};
      if (ids.length) {
        var u = await RX.api('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: ids, excludeBannedUsers: false } });
        (u.data || []).forEach(function (x) { names[x.id] = x.name; });
      }
      m.body.textContent = '';
      m.body.appendChild(el('div', { class: 'rx-muted', text: 'Últimas ' + rows.length + ' copias (las ocultas aparecen como privadas).' }));
      var t = el('div', { class: 'rx-content-list' });
      rows.forEach(function (r) {
        t.appendChild(el('div', {}, [
          r.serialNumber ? '#' + r.serialNumber + ' · ' : '',
          r.owner ? el('a', { href: '/users/' + r.owner.id + '/profile', text: names[r.owner.id] || r.owner.id }) : 'Privado',
          ' · actualizado ' + new Date(r.updated).toLocaleDateString('es-ES')
        ]));
      });
      m.body.appendChild(t);
    } catch (e) { m.body.textContent = 'Roblox no deja ver los propietarios de este objeto.'; }
  }
});

// ---------- Vista previa rápida del catálogo ----------
RX.features.push({
  id: 'quickview',

  run: function (s) {
    // Dentro del marco de la vista previa: se oculta la cabecera y, si toca, se pulsa "Probar".
    if (!RX.isTop) { if (/[?&]rxqv=1/.test(location.search)) this.inFrame(s); return; }
    if (!/^\/(catalog|bundles|users\/\d+\/inventory|my\/avatar)/.test(RX.path())) return;
    this.here = true;
    this.update(s);
  },

  update: function (s) {
    if (!this.here) return;
    var self = this, on = !!s['catalog.quickView'];
    this.s = s;
    if (on === this.on) return;
    this.on = on;
    if (!on) {
      if (this.obs) { this.obs.disconnect(); this.obs = null; }
      document.querySelectorAll('.rx-qv-btn').forEach(function (b) { b.remove(); });
      document.querySelectorAll('[data-rxqv]').forEach(function (a) { a.removeAttribute('data-rxqv'); });
      return;
    }
    this.scan();
    var t;
    this.obs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { self.scan(); }, 400); });
    this.obs.observe(document.body, { childList: true, subtree: true });
  },

  scan: function () {
    var self = this;
    if (!this.on) return; // un repaso pendiente del observador tras apagarlo
    document.querySelectorAll('a[href*="/catalog/"], a[href*="/bundles/"]').forEach(function (a) {
      if (a.dataset.rxqv || !/\/(catalog|bundles)\/\d+/.test(a.getAttribute('href'))) return;
      if (a.closest('.rx-panel, .rx-modal-wrap, #rx-search, #rk-home')) return;
      if (!a.querySelector('img, .thumbnail-2d-container, [class*="thumb"]')) return;
      a.dataset.rxqv = '1';
      var holder = a.closest('.item-card-container, .catalog-item-container, li, .item-card') || a;
      if (holder.querySelector('.rx-qv-btn')) return;
      if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
      holder.appendChild(RX.el('button', { type: 'button', class: 'rx-qv-btn', title: 'Vista previa', onclick: function (e) { e.preventDefault(); e.stopPropagation(); self.open(a.href); } }, [RX.icon('eye')]));
    });
  },

  open: function (href) {
    var el = RX.el;
    var url = new URL(href, location.origin);
    url.searchParams.set('rxqv', '1');
    var frame = el('iframe', { class: 'rx-qv-frame', src: url.toString() });
    var foot = el('div', { class: 'rc-qv-foot' }, [
      el('span', { class: 'rx-muted', text: this.s['catalog.quickTryOn'] ? 'Si el objeto tiene botón "Probar", se pulsa solo para verlo sobre tu personaje.' : 'Pulsa "Probar" para verlo sobre tu personaje.' }),
      el('a', { class: 'rx-btn rx-btn-small', href: href }, [RX.icon('external'), el('span', { text: 'Abrir la página' })])
    ]);
    var m = RX.modal('Vista previa', el('div', {}, [frame, foot]), function () { window.removeEventListener('message', onMsg); });
    m.body.closest('.rx-modal').classList.add('rx-modal-wide');
    // Escape dentro del marco también cierra la vista previa.
    var onMsg = function (e) { if (e.source === frame.contentWindow && e.origin === location.origin && e.data && e.data.rxqv === 'close') m.close(); };
    window.addEventListener('message', onMsg);
  },

  inFrame: async function (s) {
    document.documentElement.classList.add('rx-qv-inner');
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') window.parent.postMessage({ rxqv: 'close' }, location.origin); });
    if (!s['catalog.quickTryOn']) return;
    // Pulsa el botón "Probar / Try On" de Roblox si existe.
    for (var i = 0; i < 20; i++) {
      var btn = Array.prototype.find.call(document.querySelectorAll('button, a.btn, [role="button"]'), function (b) { return /^(try on|probar|probártelo|try it on)$/i.test((b.textContent || '').trim()); });
      if (btn) { btn.click(); return; }
      await RX.sleep(500);
    }
  }
});
