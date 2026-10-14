// PowerSearch: buscador rápido con atajo de teclado (y #rx-search desde el popup).
RX.features.push({
  id: 'powerSearch',
  run: function (s) {
    var self = this;
    this.s = s;
    document.addEventListener('keydown', function (e) { self.onKey(e); }, true);
    var byHash = function () {
      if (location.hash !== '#rx-search') return;
      history.replaceState(null, '', location.pathname + location.search);
      if (self.s['powerSearch.enabled']) self.open();
      else RX.toast('PowerSearch está desactivado en los ajustes de RoCer0');
    };
    window.addEventListener('hashchange', byHash);
    byHash();
  },
  update: function (s) {
    this.s = s;
    if (!s['powerSearch.enabled']) this.close();
  },

  onKey: function (e) {
    var s = this.s;
    if (!s || !s['powerSearch.enabled'] || e.repeat || !rcHotkeyMatch(e, s['powerSearch.hotkey'])) return;
    // Un atajo sin Ctrl, Alt ni Cmd no se roba mientras escribes.
    var t = (e.composedPath && e.composedPath()[0]) || e.target;
    var typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
    if (typing && !(e.ctrlKey || e.altKey || e.metaKey)) return;
    e.preventDefault();
    e.stopPropagation();
    if (document.getElementById('rx-search')) this.close(); else this.open();
  },

  close: function () { if (this.closeFn) this.closeFn(false); },

  open: function () {
    if (document.getElementById('rx-search')) return;
    var self = this, el = RX.el, s = this.s;
    var timer, seq = 0, sel = 0, rows = [], lastQ = '', lastHits = false;
    var input = el('input', { class: 'rx-search-input', type: 'text', placeholder: 'Busca juegos, personas, objetos o grupos', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Buscar en Roblox' });
    var results = el('div', { class: 'rx-search-results', role: 'listbox' });
    var hint = function (k, t) { return el('span', {}, [el('b', { text: k }), ' ' + t]); };
    var foot = el('div', { class: 'rx-search-foot' }, [hint('u:', 'personas'), hint('j:', 'juegos'), hint('c:', 'catálogo'), hint('gr:', 'grupos'), hint('#123', 'por ID'), hint('↑ ↓', 'moverte'), hint('Intro', 'abrir')]);
    var wrap = el('div', { id: 'rx-search', onclick: function (e) { if (e.target === wrap) close(true); } }, [
      el('div', { class: 'rx-search-box', role: 'dialog', 'aria-label': 'PowerSearch' }, [
        el('div', { class: 'rx-search-bar' }, [RX.icon('search'), input, el('button', { class: 'rx-search-esc', text: 'Esc', title: 'Cerrar', onclick: function () { close(true); } })]),
        results, foot
      ])
    ]);
    // remember: si cierras tras ver resultados, esa búsqueda cuenta para las recientes.
    var close = function (remember) {
      if (!wrap.isConnected) return;
      if (remember && lastHits) self.remember(lastQ);
      clearTimeout(timer);
      seq++;
      wrap.remove();
      self.closeFn = null;
    };
    this.closeFn = close;
    document.body.appendChild(wrap);
    input.focus();

    var highlight = function () {
      rows.forEach(function (r, i) { r.classList.toggle('rx-active', i === sel); r.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
      if (rows[sel]) rows[sel].scrollIntoView({ block: 'nearest' });
    };
    var collect = function () {
      rows = Array.prototype.slice.call(results.querySelectorAll('.rx-search-row'));
      sel = Math.min(sel, Math.max(0, rows.length - 1));
      highlight();
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'ArrowDown') { sel = Math.min(rows.length - 1, sel + 1); highlight(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); highlight(); e.preventDefault(); }
      else if (e.key === 'Enter' && rows[sel]) { e.preventDefault(); rows[sel].click(); }
      else if (e.key === 'Delete' && !input.value && rows[sel] && rows[sel].hasAttribute('data-q')) { e.preventDefault(); forget(rows[sel].getAttribute('data-q')); }
    });
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (!q) { seq++; showHistory(); return; }
      timer = setTimeout(function () { run(q); }, 280);
    });

    var forget = function (q) { self.forget(q).then(function () { if (!input.value.trim()) showHistory(); }); };

    // Búsquedas recientes (con la caja vacía).
    var showHistory = async function () {
      var my = ++seq;
      lastQ = ''; lastHits = false;
      var list = s['powerSearch.history'] ? await self.loadHistory() : [];
      if (my !== seq || input.value.trim()) return;
      results.textContent = '';
      list = (Array.isArray(list) ? list : []).filter(function (h) { return h && typeof h.q === 'string' && h.q; }).slice(0, 8);
      if (!list.length) {
        results.appendChild(el('div', { class: 'rx-search-empty', text: 'Escribe para buscar en todo Roblox.' }));
        collect();
        return;
      }
      results.appendChild(el('div', { class: 'rx-search-group' }, [el('span', { text: 'Búsquedas recientes' })]));
      list.forEach(function (h) {
        var row = el('div', { class: 'rx-search-row rx-search-hist', role: 'option', 'data-q': h.q }, [
          el('span', { class: 'rx-search-noimg' }, [RX.icon('history')]),
          el('div', { class: 'rx-search-main' }, [el('div', { class: 'rx-search-title', text: h.q }), h.t ? el('div', { class: 'rx-search-sub', text: RX.ago(h.t) }) : null]),
          el('button', { class: 'rx-btn rx-btn-small rx-icon-only rx-search-del', title: 'Quitar de las recientes', 'aria-label': 'Quitar de las recientes', onclick: function (e) {
            e.preventDefault(); e.stopPropagation(); forget(h.q); input.focus();
          } }, [RX.icon('x')])
        ]);
        row.addEventListener('click', function () { input.value = h.q; clearTimeout(timer); run(h.q); input.focus(); });
        results.appendChild(row);
      });
      sel = 0;
      collect();
    };

    var row = function (it) {
      var attrs = { class: 'rx-search-row', href: it.url, role: 'option' };
      if (s['powerSearch.newTab']) { attrs.target = '_blank'; attrs.rel = 'noopener'; }
      var a = el('a', attrs, [
        it.img ? el('img', { src: it.img, alt: '', loading: 'lazy' }) : el('span', { class: 'rx-search-noimg' }, [RX.icon(it.icon || 'search')]),
        el('div', { class: 'rx-search-main' }, [
          el('div', { class: 'rx-search-title' }, [it.pin ? RX.icon('pin') : null, el('span', { text: it.title })]),
          it.sub ? el('div', { class: 'rx-search-sub' }, Array.isArray(it.sub) ? it.sub : [it.sub]) : null
        ]),
        it.play && s['powerSearch.playButton'] ? RX.ibtn('play', 'Jugar', { class: 'rx-btn rx-btn-small rx-play', title: 'Jugar ahora', onclick: function (e) {
          e.preventDefault(); e.stopPropagation();
          self.remember(lastQ);
          RX.join(it.play);
          close(false);
        } }) : null
      ]);
      a.addEventListener('click', function () {
        self.remember(lastQ);
        if (s['powerSearch.newTab']) setTimeout(function () { close(false); }, 0);
      });
      return a;
    };

    // Cada grupo se pinta en cuanto llega, en su sitio (fijados, juegos, personas, catálogo, grupos).
    var run = function (q) {
      var my = ++seq;
      lastQ = q; lastHits = false;
      results.textContent = '';
      rows = []; sel = 0;
      var groups = self.search(q);
      if (!groups.length) { results.appendChild(el('div', { class: 'rx-search-empty', text: 'No hay nada que buscar: activa algún tipo de resultado en los ajustes de PowerSearch.' })); return; }
      var loading = el('div', { class: 'rx-search-empty rx-search-loading', text: 'Buscando…' });
      var pending = groups.length;
      groups.forEach(function (g) {
        var box = el('div', { class: 'rx-search-section', hidden: true });
        results.appendChild(box);
        g.p.then(function (items) {
          if (my !== seq || !items || !items.length) return;
          box.appendChild(el('div', { class: 'rx-search-group' }, [el('span', { text: g.title }),
            g.more ? el('a', { class: 'rx-search-more', href: g.more, target: s['powerSearch.newTab'] ? '_blank' : null, rel: 'noopener', text: 'Ver todos' }) : null]));
          items.forEach(function (it) { box.appendChild(row(it)); });
          box.hidden = false;
          lastHits = true;
          collect();
        }).catch(function () {}).then(function () {
          if (my !== seq) return;
          if (--pending > 0) return;
          loading.remove();
          if (!lastHits) results.appendChild(el('div', { class: 'rx-search-empty', text: 'Sin resultados para «' + q + '».' }));
        });
      });
      results.appendChild(loading);
    };

    showHistory();
  },

  // Grupos de resultados para un texto: [{ title, more, p: Promise<lista> }].
  search: function (raw) {
    var s = this.s, q = raw, only = null;
    var m = /^(u|j|g|c|gr):\s*(.*)$/i.exec(raw);
    if (m) { only = { u: 'users', j: 'games', g: 'games', c: 'catalog', gr: 'groups' }[m[1].toLowerCase()]; q = m[2].trim(); }
    if (!q) return [];
    var n = Math.max(3, Math.min(15, Math.round(Number(s['powerSearch.perGroup']) || 8)));
    var want = function (k) { return only ? only === k : !!s['powerSearch.' + k]; };
    var R = 'https://www.roblox.com', enc = encodeURIComponent(q), out = [];
    var add = function (title, more, fn) { out.push({ title: title, more: more, p: fn().catch(function () { return []; }) }); };

    var idm = /^#?(\d{3,})$/.exec(q);
    if (idm) {
      var id = idm[1], byId = [];
      if (!only || only === 'games') byId.push({ title: 'Juego con ID ' + id, url: R + '/games/' + id, play: id, icon: 'gamepad' });
      if (!only || only === 'users') byId.push({ title: 'Persona con ID ' + id, url: R + '/users/' + id + '/profile', icon: 'user' });
      if (!only || only === 'catalog') byId.push({ title: 'Objeto con ID ' + id, url: R + '/catalog/' + id, icon: 'shirt' });
      if (only === 'groups') byId.push({ title: 'Grupo con ID ' + id, url: R + '/communities/' + id, icon: 'flag' });
      add('Ir por ID', null, function () { return Promise.resolve(byId); });
    }

    if (s['powerSearch.pins'] && (!only || only === 'games')) add('Fijados', null, async function () {
      var pins = await RX.local('pinned', []), ql = rcFold(q);
      return pins.filter(function (p) { return p.name && rcFold(p.name).indexOf(ql) >= 0; }).slice(0, n).map(function (p) {
        return { title: p.name, pin: true, url: R + '/games/' + p.placeId, img: p.icon, play: p.placeId, icon: 'gamepad' };
      });
    });

    if (want('games')) add('Juegos', R + '/discover/?Keyword=' + enc, async function () {
      var d = await RX.api('https://apis.roblox.com/search-api/omni-search?searchQuery=' + enc + '&sessionId=' + crypto.randomUUID() + '&pageType=all');
      var games = [];
      (d.searchResults || []).forEach(function (g) { if (g.contentGroupType === 'Game') games.push.apply(games, g.contents || []); });
      games = games.filter(function (g) { return g.rootPlaceId; }).slice(0, n);
      var icons = await RX.thumbs('games', games.map(function (g) { return g.universeId; }), '50x50');
      return games.map(function (g) {
        var votes = (g.totalUpVotes || 0) + (g.totalDownVotes || 0);
        return { title: g.name, url: R + '/games/' + g.rootPlaceId, img: icons[g.universeId], play: g.rootPlaceId, icon: 'gamepad',
          sub: [RX.short(g.playerCount || 0) + ' jugando'].concat(votes ? [' · ', RX.icon('thumb'), ' ' + Math.round(100 * g.totalUpVotes / votes) + '%'] : []) };
      });
    });

    if (want('users')) add('Personas', R + '/search/users?keyword=' + enc, async function () {
      var list = [], name = q.replace(/^@/, '');
      if (/^[A-Za-z0-9_]{3,20}$/.test(name)) {
        var ex = await RX.api('https://users.roblox.com/v1/usernames/users', { method: 'POST', body: { usernames: [name], excludeBannedUsers: true } }).catch(function () { return { data: [] }; });
        list = ex.data || [];
      }
      var d = await RX.api('https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(name) + '&limit=' + (n <= 10 ? 10 : 25)).catch(function () { return { data: [] }; });
      (d.data || []).forEach(function (u) { if (!list.some(function (x) { return x.id === u.id; })) list.push(u); });
      list = list.slice(0, n);
      var heads = await RX.thumbs('users', list.map(function (u) { return u.id; }));
      return list.map(function (u) {
        return { title: (u.displayName || u.name) + ' (@' + u.name + ')', url: R + '/users/' + u.id + '/profile', img: heads[u.id], icon: 'user' };
      });
    });

    if (want('catalog')) add('Catálogo', R + '/catalog?Keyword=' + enc, async function () {
      var d = await RX.api('https://catalog.roblox.com/v1/search/items/details?Keyword=' + enc + '&Limit=' + (n <= 10 ? 10 : 30));
      var items = (d.data || []).slice(0, n);
      var a = await RX.thumbs('assets', items.filter(function (i) { return i.itemType !== 'Bundle'; }).map(function (i) { return i.id; }), '110x110');
      var b = await RX.thumbs('bundles', items.filter(function (i) { return i.itemType === 'Bundle'; }).map(function (i) { return i.id; }), '150x150');
      return items.map(function (i) {
        var bundle = i.itemType === 'Bundle', price = i.lowestPrice !== undefined && i.lowestPrice !== null ? i.lowestPrice : i.price;
        return { title: i.name, url: R + (bundle ? '/bundles/' : '/catalog/') + i.id, img: (bundle ? b : a)[i.id], icon: 'shirt',
          sub: price !== undefined && price !== null ? (price === 0 ? 'Gratis' : 'R$ ' + RX.fmt(price)) : (i.creatorName || '') };
      });
    });

    if (want('groups')) add('Grupos', R + '/search/communities?keyword=' + enc, async function () {
      var d = await RX.api('https://groups.roblox.com/v1/groups/search?keyword=' + enc + '&limit=' + (n <= 10 ? 10 : 25));
      var gs = (d.data || []).slice(0, n);
      var icons = await RX.thumbs('groups', gs.map(function (g) { return g.id; }));
      return gs.map(function (g) {
        return { title: g.name, url: R + '/communities/' + g.id, img: icons[g.id], icon: 'flag', sub: RX.fmt(g.memberCount) + ' miembros' };
      });
    });

    return out;
  },

  // Búsquedas recientes: storage.local "searchHistory" = [{ q, t }], las 8 últimas, sin repetir.
  // Se guarda una copia al abrir la caja para escribir en el mismo clic (antes de que la página cambie).
  loadHistory: async function () {
    var list = await RX.local('searchHistory', []);
    this.hist = (Array.isArray(list) ? list : []).filter(function (h) { return h && typeof h.q === 'string' && h.q; });
    return this.hist;
  },
  remember: function (q) {
    q = String(q || '').trim();
    if (!this.s['powerSearch.history'] || q.length < 2) return;
    var key = rcFold(q);
    var list = (this.hist || []).filter(function (h) { return rcFold(h.q) !== key; });
    list.unshift({ q: q.slice(0, 100), t: Date.now() });
    this.hist = list.slice(0, 8);
    RX.setLocal({ searchHistory: this.hist }).catch(function () {});
  },
  forget: async function (q) {
    var key = rcFold(q);
    var list = (await this.loadHistory()).filter(function (h) { return rcFold(h.q) !== key; });
    this.hist = list;
    if (list.length) await RX.setLocal({ searchHistory: list });
    else await RX.B.storage.local.remove('searchHistory');
  }
});

// Juegos fijados: botón "Fijar" en la página del juego y fila en el Inicio original de Roblox.
RX.features.push({
  id: 'pinned',
  run: function (s) {
    var self = this;
    this.s = s;
    this.placeId = RX.isTop ? RX.placeIdFromUrl() : null;
    RX.B.storage.onChanged.addListener(function (ch, area) {
      if (area !== 'local') return;
      if ((ch.pinned || ch.pinFolders) && self.paint) self.paint();
      if ((ch.pinned || ch.myRecent || ch.myJoins) && self.row) self.homeRow(true);
    });
    this.update(s);
  },

  update: function (s) {
    this.s = s;
    if (!RX.isTop) return;
    var on = !!s['pinned.enabled'];
    if (this.placeId) {
      if (on && !this.wrap) this.gameButton(this.placeId);
      else if (!on && this.wrap) { this.wrap.remove(); this.wrap = null; this.paint = null; }
      else if (this.paint) this.paint();
    }
    // Con el Inicio rediseñado encendido, los fijados ya van dentro de él.
    if (on && RX.isHome() && s['pinned.showOnHome'] && !s['home.enabled']) this.homeRow(false);
    else this.removeRow();
  },

  gameButton: function (placeId) {
    var self = this, el = RX.el;
    var pinned = false;
    var btn = RX.ibtn('pin', 'Fijar', { class: 'rx-btn rx-pin-btn', title: 'Fijar este juego' });
    var folderSel = el('select', { class: 'rx-folder-sel', title: 'Carpeta del juego fijado', hidden: true });
    var newInput = el('input', { type: 'text', class: 'rx-pin-new-input', maxlength: '30', placeholder: 'Nombre de la carpeta', 'aria-label': 'Nombre de la carpeta nueva' });
    var newBox = el('span', { class: 'rx-pin-new', hidden: true }, [
      newInput,
      RX.ibtn('check', 'Crear', { class: 'rx-btn rx-btn-small rx-primary', onclick: function () { createFolder(); } }),
      el('button', { class: 'rx-btn rx-btn-small rx-icon-only', title: 'Cancelar', 'aria-label': 'Cancelar', onclick: function () { cancelNew(); } }, [RX.icon('x')])
    ]);
    var wrap = this.wrap = el('div', { class: 'rx-inline rx-pin-wrap' }, [btn, folderSel, newBox]);

    var paint = this.paint = async function () {
      var pins = await RX.local('pinned', []);
      pinned = pins.some(function (p) { return String(p.placeId) === placeId; });
      RX.setText(btn, pinned ? 'Fijado' : 'Fijar');
      btn.title = pinned ? 'Quitar de tus fijados' : 'Fijar este juego';
      btn.classList.toggle('rx-on', pinned);
      var folders = pinned && self.s['pinned.folders'];
      if (!folders) newBox.hidden = true;
      folderSel.hidden = !folders || !newBox.hidden;
      if (folders) await self.fillFolders(folderSel, placeId);
    };
    var cancelNew = function () { newBox.hidden = true; newInput.value = ''; paint(); };
    var setFolder = async function (v) {
      var list = await RX.local('pinned', []);
      list.forEach(function (p) { if (String(p.placeId) === placeId) { if (v) p.folder = v; else delete p.folder; } });
      await RX.setLocal({ pinned: list });
      RX.toast(v ? 'Guardado en la carpeta' : 'Sin carpeta');
    };
    var createFolder = async function () {
      var name = newInput.value.trim().slice(0, 30);
      if (!name) { newInput.focus(); return; }
      var folders = await RX.local('pinFolders', []);
      var same = folders.find(function (f) { return rcFold(f.name) === rcFold(name); });
      var f = same || { id: 'f' + Date.now().toString(36), name: name };
      if (!same) { folders.push(f); await RX.setLocal({ pinFolders: folders }); }
      newBox.hidden = true;
      newInput.value = '';
      await setFolder(f.id);
    };
    newInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); createFolder(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelNew(); }
    });

    btn.addEventListener('click', async function () {
      var list = await RX.local('pinned', []);
      var was = list.some(function (p) { return String(p.placeId) === placeId; });
      if (was) list = list.filter(function (p) { return String(p.placeId) !== placeId; });
      else {
        var info = { placeId: placeId, name: ((document.querySelector('.game-name, h1') || {}).textContent || '').trim() || 'Juego ' + placeId };
        try {
          info.universeId = await RX.universeOf(placeId);
          var g = await RX.api('https://games.roblox.com/v1/games?universeIds=' + info.universeId);
          if (g.data && g.data[0]) info.name = g.data[0].name;
          info.icon = (await RX.thumbs('games', [info.universeId]))[info.universeId];
        } catch (e) { /* se guarda con lo que haya */ }
        info.name = String(info.name).trim();
        list = list.filter(function (p) { return String(p.placeId) !== placeId; });
        list.push(info);
        RX.challenge('pin');
      }
      await RX.setLocal({ pinned: list });
      RX.toast(was ? 'Juego quitado de fijados' : 'Juego fijado');
      await paint();
      // Con carpetas, al fijar se ofrece elegir carpeta en el momento.
      if (!was && self.s['pinned.folders'] && !folderSel.hidden) folderSel.focus();
    });
    folderSel.addEventListener('change', function () {
      if (folderSel.value === '__new') {
        folderSel.hidden = true;
        newBox.hidden = false;
        newInput.focus();
        return;
      }
      setFolder(folderSel.value);
    });
    paint();
    RX.mount(['.game-title-container', '.game-name', '#game-detail-page h1'], wrap, 'after').then(function (n) {
      if (self.wrap !== n) n.remove(); // se apagó mientras esperaba su sitio
    });
  },

  fillFolders: async function (sel, placeId) {
    var folders = await RX.local('pinFolders', []);
    var pin = (await RX.local('pinned', [])).find(function (p) { return String(p.placeId) === placeId; });
    sel.textContent = '';
    sel.appendChild(RX.el('option', { value: '', text: 'Sin carpeta' }));
    folders.forEach(function (f) { sel.appendChild(RX.el('option', { value: f.id, text: f.name })); });
    sel.appendChild(RX.el('option', { value: '__new', text: 'Nueva carpeta…' }));
    sel.value = pin && pin.folder && folders.some(function (f) { return f.id === pin.folder; }) ? pin.folder : '';
  },

  // Fila de fijados en el Inicio original (ordenada como pide "pinned.sort").
  homeRow: async function (force) {
    var s = this.s, self = this;
    if (this.row && !force && this.rowSort === s['pinned.sort']) return;
    var my = this.rowSeq = (this.rowSeq || 0) + 1;
    this.rowSort = s['pinned.sort'];
    var st = await RX.B.storage.local.get(['pinned', 'myRecent', 'myJoins']);
    if (my !== this.rowSeq) return;
    var recent = [].concat(Array.isArray(st.myRecent) ? st.myRecent : [], Array.isArray(st.myJoins) ? st.myJoins : []);
    var pins = rcSortPins(Array.isArray(st.pinned) ? st.pinned : [], s['pinned.sort'], recent);
    if (!pins.length) { this.removeRow(); return; }
    var el = RX.el;
    var list = el('div', { class: 'rx-pin-list' });
    var row = el('div', { class: 'rx-panel rx-pins' }, [RX.title('pin', 'Juegos fijados'), list]);
    var universes = pins.map(function (p) { return p.universeId; }).filter(Boolean);
    var live = {};
    for (var i = 0; i < universes.length; i += 50) {
      try {
        var g = await RX.api('https://games.roblox.com/v1/games?universeIds=' + universes.slice(i, i + 50).join(','));
        (g.data || []).forEach(function (x) { live[x.id] = x; });
      } catch (e) { /* sin datos en vivo */ }
    }
    var icons = await RX.thumbs('games', universes);
    if (my !== this.rowSeq) return;
    pins.forEach(function (p) {
      var info = live[p.universeId];
      list.appendChild(el('div', { class: 'rx-pin-card' }, [
        el('a', { href: '/games/' + p.placeId, title: p.name }, [
          icons[p.universeId] || p.icon ? el('img', { src: icons[p.universeId] || p.icon, alt: '' }) : el('span', { class: 'rx-pin-ph' }, [RX.icon('gamepad')]),
          el('div', { class: 'rx-pin-name', text: p.name })
        ]),
        el('div', { class: 'rx-muted', text: info && info.playing !== undefined ? RX.short(info.playing) + ' jugando' : ' ' }),
        RX.ibtn('play', 'Jugar', { class: 'rx-btn rx-btn-small rx-play', onclick: function () { RX.join(p.placeId); } })
      ]));
    });
    var old = this.row;
    this.row = row;
    if (old && old.isConnected) { old.replaceWith(row); return; }
    RX.mount(['#HomeContainer', '.home-container', '#container-main .content', '#container-main'], row, 'prepend').then(function (n) {
      if (self.row !== n) n.remove();
    });
  },
  removeRow: function () {
    this.rowSeq = (this.rowSeq || 0) + 1;
    if (this.row) { this.row.remove(); this.row = null; }
  }
});
