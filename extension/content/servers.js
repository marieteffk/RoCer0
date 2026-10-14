// Panel de servidores: filtros por jugadores, huecos, ping y región; aleatorio, server hop y auto-hop.
RX.features.push({
  id: 'servers',
  cols: { players: ['Jugadores', '1.6fr'], ping: ['Ping', '.7fr'], fps: ['FPS', '.5fr'], region: ['Región', '1.3fr'] },
  sorts: [['few', 'Menos jugadores'], ['many', 'Más jugadores'], ['ping', 'Menor ping'], ['random', 'Aleatorio']],
  seq: 0,
  regionSeq: 0,

  run: function (s) {
    this.s = s;
    this.placeId = RX.isTop ? RX.placeIdFromUrl() : null;
    if (!this.placeId) return;
    this.update(s);
    // Server hop pedido desde el popup (#rx-hop).
    var self = this;
    var byHash = function () {
      if (location.hash !== '#rx-hop') return;
      history.replaceState(null, '', location.pathname + location.search);
      self.hop();
    };
    window.addEventListener('hashchange', byHash);
    byHash();
  },

  update: function (s) {
    var prev = this.s || s;
    this.s = s;
    if (!this.placeId) return;
    document.documentElement.classList.toggle('rx-hide-native-servers', !!(s['servers.enabled'] && s['servers.hideNative']));
    if (!s['servers.enabled']) { this.destroy(); return; }
    if (!this.panel) {
      this.build();
      if (s['servers.autoSearch']) this.search();
      return;
    }
    this.refresh(prev);
  },

  shuffle: function (list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  },

  num: function (v, lo, hi, def) {
    v = Math.round(Number(v));
    return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
  },

  build: function () {
    var el = RX.el, self = this, s = this.s;
    var num = function (ph, val, title) { return el('input', { type: 'number', min: 0, class: 'rx-num', placeholder: ph, value: val, title: title || null }); };
    this.f = {
      exact: num('—', '', 'Solo servidores con justo estos jugadores'),
      min: num('—', ''), max: num('—', ''),
      free: num('1', s['servers.minFree']),
      ping: num('—', s['servers.maxPing'] || ''),
      region: el('select', {}, [el('option', { value: '', text: 'Cualquiera' })].concat(Object.keys(RX_REGIONS).map(function (k) {
        return el('option', { value: k, text: RX_REGIONS[k].label });
      }))),
      sort: el('select', {}, this.sorts.map(function (o) { return el('option', { value: o[0], text: o[1] }); }))
    };
    this.f.region.value = s['servers.regionLookup'] && RX_REGIONS[s['servers.preferredRegion']] ? s['servers.preferredRegion'] : '';
    this.f.sort.value = this.sortOf(s['servers.defaultSort']);
    var label = function (t, input) { return el('label', { class: 'rx-field' }, [el('span', { text: t }), input]); };
    this.regionField = label('Región', this.f.region);
    this.status = el('div', { class: 'rx-muted rx-sv-status', role: 'status' });
    this.table = el('div', { class: 'rx-server-list' });
    this.autoBtn = RX.ibtn('timer', 'Auto-hop', { title: 'Cambiar de servidor cada cierto tiempo', onclick: function () { self.toggleAuto(); } });
    this.autoAsk = el('div', { class: 'rx-sv-ask', hidden: true });
    var panel = this.panel = el('div', { class: 'rx-panel', id: 'rx-servers' }, [
      RX.title('server', 'Servidores+'),
      el('div', { class: 'rx-filters' }, [
        label('Jugadores exactos', this.f.exact), label('Mín.', this.f.min), label('Máx.', this.f.max),
        label('Huecos libres ≥', this.f.free), label('Ping máx. (ms)', this.f.ping), this.regionField, label('Orden', this.f.sort)
      ]),
      el('div', { class: 'rx-actions' }, [
        RX.ibtn('search', 'Buscar', { class: 'rx-btn rx-primary', onclick: function () { self.search(); } }),
        RX.ibtn('dice', 'Servidor aleatorio', { onclick: function () { self.go('random', false); } }),
        RX.ibtn('shuffle', 'Server hop', { title: 'Saltar a otro servidor', onclick: function () { self.hop(); } }),
        RX.ibtn('empty', 'El más vacío', { onclick: function () { self.go('empty', false); } }),
        this.autoBtn
      ]),
      this.autoAsk, this.status, this.table
    ]);
    // Intro en un filtro = buscar.
    panel.querySelector('.rx-filters').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); self.search(); } });
    this.regionField.hidden = !s['servers.regionLookup'];
    this.applyColumns();
    this.viewKey = this.viewKeyOf(s);
    RX.mount(['#running-game-instances-container', '#rbx-running-games', '#game-instances', '.game-main-content', '#game-detail-page'], panel, 'before').then(function (n) {
      if (self.panel !== n) n.remove(); // se apagó mientras esperaba su sitio
    });
  },

  sortOf: function (v) { return this.sorts.some(function (o) { return o[0] === v; }) ? v : 'few'; },

  // Ajustes cambiados con el panel abierto: los filtros que no has tocado siguen al ajuste y la lista se repinta.
  refresh: function (prev) {
    var s = this.s, f = this.f;
    if (String(f.free.value) === String(prev['servers.minFree'])) f.free.value = s['servers.minFree'];
    if (String(f.ping.value) === String(prev['servers.maxPing'] || '')) f.ping.value = s['servers.maxPing'] || '';
    if (f.sort.value === this.sortOf(prev['servers.defaultSort'])) f.sort.value = this.sortOf(s['servers.defaultSort']);
    var lookup = !!s['servers.regionLookup'];
    var pref = RX_REGIONS[s['servers.preferredRegion']] ? s['servers.preferredRegion'] : '';
    if (!lookup) f.region.value = '';
    else if (!prev['servers.regionLookup'] || f.region.value === (prev['servers.preferredRegion'] || '')) f.region.value = pref;
    this.regionField.hidden = !lookup;
    if (!lookup) this.regionSeq++;
    var key = this.viewKeyOf(s);
    if (key === this.viewKey) return;
    this.viewKey = key;
    this.applyColumns();
    if (this.last) this.render(this.last);
  },
  viewKeyOf: function (s) {
    return JSON.stringify([s['servers.columns'], s['servers.copyLink'], s['servers.listMax'], s['servers.regionLookup'], s['servers.autoRegion'], s['servers.regionChecks']]);
  },

  colsOn: function () {
    var s = this.s, on = Array.isArray(s['servers.columns']) ? s['servers.columns'] : [];
    return ['players', 'ping', 'fps', 'region'].filter(function (c) { return on.indexOf(c) >= 0 && (c !== 'region' || s['servers.regionLookup']); });
  },
  applyColumns: function () {
    var self = this;
    var tpl = this.colsOn().map(function (c) { return self.cols[c][1]; }).concat(['auto']).join(' ');
    this.table.style.setProperty('--rx-sv-cols', tpl);
  },

  destroy: function () {
    this.seq++;
    this.regionSeq++;
    this.stopAuto(false);
    if (this.panel) { this.panel.remove(); this.panel = null; }
    this.f = null; this.status = null; this.table = null; this.last = null; this.regionField = null;
  },

  // Mensaje en el panel (o en un aviso si no hay panel, p. ej. el hop desde el popup con el panel apagado).
  say: function (text, toast) {
    if (this.status && this.status.isConnected) this.status.textContent = text;
    else if (toast) RX.toast(text, 4000);
  },

  filters: function () {
    var s = this.s, F = this.f;
    var minFree = this.num(s['servers.minFree'], 1, 100, 1), maxPing = this.num(s['servers.maxPing'], 0, 5000, 0);
    var lookup = !!s['servers.regionLookup'];
    if (!F) return { exact: null, min: null, max: null, free: minFree, ping: maxPing || null, region: lookup && RX_REGIONS[s['servers.preferredRegion']] ? s['servers.preferredRegion'] : '', sort: this.sortOf(s['servers.defaultSort']) };
    var v = function (i) { var x = String(i.value).trim(); return x === '' || !isFinite(Number(x)) ? null : Math.max(0, Number(x)); };
    return { exact: v(F.exact), min: v(F.min), max: v(F.max), free: Math.max(1, v(F.free) || 0), ping: v(F.ping) || null, region: lookup ? F.region.value : '', sort: F.sort.value };
  },

  page: async function (order, cursor) {
    var url = 'https://games.roblox.com/v1/games/' + this.placeId + '/servers/Public?limit=100&excludeFullGames=true&sortOrder=' + order + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    for (var tries = 0; tries < 4; tries++) {
      try { return await RX.api(url); }
      catch (e) {
        if (e.status !== 429) throw e;
        this.say('Roblox pide ir más despacio, esperando…');
        await RX.sleep(2500 * (tries + 1));
      }
    }
    var err = new Error('Demasiadas peticiones');
    err.status = 429;
    throw err;
  },

  passes: function (sv, f) {
    if (f.exact !== null && sv.playing !== f.exact) return false;
    if (f.min !== null && sv.playing < f.min) return false;
    if (f.max !== null && sv.playing > f.max) return false;
    if (sv.maxPlayers - sv.playing < f.free) return false;
    if (f.ping && sv.ping && sv.ping > f.ping) return false;
    return true;
  },

  // Recorre páginas de servidores (hasta "servers.maxPages") y devuelve los que cumplen los filtros (sin región).
  // wanted = 0: revisa todas las páginas (para ordenar por ping o al azar con más donde elegir).
  collect: async function (f, wanted, my) {
    var order = f.sort === 'many' ? 'Desc' : f.sort === 'random' ? (Math.random() < 0.5 ? 'Asc' : 'Desc') : 'Asc';
    var cursor = null, all = [], matches = [], pages = this.num(this.s['servers.maxPages'], 1, 100, 10), self = this;
    for (var i = 0; i < pages; i++) {
      if (my !== this.seq) break;
      var d = await this.page(order, cursor);
      (d.data || []).forEach(function (sv) { all.push(sv); if (self.passes(sv, f)) matches.push(sv); });
      this.say('Revisadas ' + (i + 1) + (i ? ' páginas, ' : ' página, ') + all.length + ' servidores, ' + matches.length + ' coinciden…');
      cursor = d.nextPageCursor;
      if (!cursor) break;
      if (wanted && matches.length >= wanted) break;
      // Van ordenados por jugadores: pasado el límite ya no puede haber más.
      var lastSv = all[all.length - 1];
      if (lastSv && order === 'Asc' && ((f.exact !== null && lastSv.playing > f.exact) || (f.max !== null && lastSv.playing > f.max))) break;
      if (lastSv && order === 'Desc' && ((f.exact !== null && lastSv.playing < f.exact) || (f.min !== null && lastSv.playing < f.min))) break;
      await RX.sleep(250);
    }
    if (f.sort === 'ping') matches.sort(function (a, b) { return (a.ping || 9999) - (b.ping || 9999); });
    if (f.sort === 'random') matches = this.shuffle(matches);
    return { all: all, matches: matches };
  },

  // Región de un servidor (la IP del servidor se localiza en el fondo). Nunca se llama con la detección apagada.
  lookup: async function (sv) {
    if (sv.loc) return sv.loc;
    if (!this.s['servers.regionLookup']) return null;
    try { sv.loc = await RX.send('serverRegion', { placeId: this.placeId, serverId: sv.id }); }
    catch (e) { sv.loc = { error: true }; }
    if (!sv.loc) sv.loc = { error: true };
    return sv.loc;
  },
  locText: function (l) { return [l.city, l.country].filter(Boolean).join(', ') || '?'; },

  // Filtra por región consultando la IP de cada servidor (hasta "servers.regionChecks" consultas).
  byRegion: async function (list, region, need, my) {
    if (!region || !RX_REGIONS[region] || !this.s['servers.regionLookup']) return list;
    var test = RX_REGIONS[region].test, label = RX_REGIONS[region].label, out = [], checked = 0;
    var max = this.num(this.s['servers.regionChecks'], 10, 200, 60);
    for (var i = 0; i < list.length; i++) {
      if (my !== this.seq) return out;
      var sv = list[i];
      if (!sv.loc) {
        if (checked >= max) break;
        checked++;
        await this.lookup(sv);
        this.say('Comprobando regiones: ' + checked + ' revisados, ' + out.length + ' en ' + label + '…');
      }
      if (sv.loc && !sv.loc.error && test(sv.loc)) { out.push(sv); if (need && out.length >= need) break; }
    }
    return out;
  },

  search: async function () {
    if (!this.panel) return;
    var my = ++this.seq, s = this.s, f = this.filters();
    this.regionSeq++;
    this.last = null;
    this.table.textContent = '';
    var listMax = this.num(s['servers.listMax'], 10, 200, 100);
    var wanted = f.sort === 'few' || f.sort === 'many' ? (f.region ? Math.max(listMax, this.num(s['servers.regionChecks'], 10, 200, 60)) : listMax) : 0;
    try {
      var r = await this.collect(f, wanted, my);
      if (my !== this.seq) return;
      var list = await this.byRegion(r.matches, f.region, listMax, my);
      if (my !== this.seq) return;
      this.say(list.length + (list.length === 1 ? ' servidor coincide' : ' servidores coinciden') + ' (de ' + r.all.length + ' revisados).');
      this.render(list);
    } catch (e) {
      if (my === this.seq) this.say(e.status === 429 ? 'Roblox está limitando las peticiones. Prueba otra vez en un momento.' : 'No se pudo cargar la lista de servidores. Prueba otra vez en un momento.');
    }
  },

  render: function (list) {
    var el = RX.el, self = this, s = this.s;
    if (!this.table) return;
    this.last = list;
    this.regionSeq++;
    var cols = this.colsOn();
    var max = this.num(s['servers.listMax'], 10, 200, 100);
    this.table.textContent = '';
    if (!list.length) { this.table.appendChild(el('div', { class: 'rx-muted rx-sv-empty', text: 'Ningún servidor cumple los filtros.' })); return; }
    this.table.appendChild(el('div', { class: 'rx-server-row rx-server-head' }, cols.map(function (c) { return el('span', { text: self.cols[c][0] }); }).concat([el('span')])));
    var shown = list.slice(0, max);
    shown.forEach(function (sv) { self.table.appendChild(self.row(sv, cols)); });
    if (list.length > max) this.table.appendChild(el('div', { class: 'rx-muted rx-sv-more', text: 'Y ' + (list.length - max) + ' más. Afina los filtros o sube "Servidores en la lista" en los ajustes.' }));
    if (s['servers.regionLookup'] && s['servers.autoRegion'] && cols.indexOf('region') >= 0) this.autoRegions(shown);
  },

  row: function (sv, cols) {
    var el = RX.el, self = this, s = this.s;
    var lvl = function (p) { return !p ? '' : p <= 80 ? ' rx-good' : p <= 150 ? ' rx-mid' : ' rx-bad'; };
    var cells = cols.map(function (c) {
      if (c === 'players') {
        var pct = sv.maxPlayers ? Math.round(100 * sv.playing / sv.maxPlayers) : 0;
        return el('span', { class: 'rx-sv-players' }, [el('span', { class: 'rx-bar' }, [el('i', { style: { width: pct + '%' } })]), ' ' + sv.playing + '/' + sv.maxPlayers]);
      }
      if (c === 'ping') return el('span', { class: 'rx-sv-ping' + lvl(sv.ping), text: sv.ping ? Math.round(sv.ping) + ' ms' : '—' });
      if (c === 'fps') return el('span', { text: sv.fps ? String(Math.round(sv.fps)) : '—' });
      return self.regionCell(sv);
    });
    var actions = el('span', { class: 'rx-server-actions' }, [
      s['servers.copyLink'] ? el('button', { class: 'rx-btn rx-btn-small rx-icon-only rx-sv-copy', title: 'Copiar el enlace de este servidor para que un amigo entre en el mismo', 'aria-label': 'Copiar enlace del servidor', onclick: function () {
        RX.copy('https://www.roblox.com/games/start?placeId=' + self.placeId + '&gameInstanceId=' + sv.id, 'Enlace del servidor copiado');
      } }, [RX.icon('link')]) : null,
      RX.ibtn('play', 'Unirse', { class: 'rx-btn rx-btn-small rx-primary', onclick: function () { RX.join(self.placeId, sv.id); } })
    ]);
    var row = el('div', { class: 'rx-server-row' }, cells.concat([actions]));
    row.setAttribute('data-sid', sv.id);
    return row;
  },

  regionCell: function (sv) {
    var el = RX.el, self = this;
    var cell = el('span', { class: 'rx-sv-region' });
    if (sv.loc) cell.textContent = sv.loc.error ? '?' : this.locText(sv.loc);
    else if (sv.pending) cell.textContent = '…';
    else cell.appendChild(el('button', { class: 'rx-link', text: 'ver', title: 'Ver dónde está este servidor', onclick: function () {
      sv.pending = true;
      cell.textContent = '…';
      self.lookup(sv).then(function () { sv.pending = false; self.paintRegion(sv); });
    } }));
    if (sv.loc && sv.loc.error) cell.title = 'No se pudo saber dónde está';
    return cell;
  },
  paintRegion: function (sv) {
    if (!this.table) return;
    var row = this.table.querySelector('[data-sid="' + CSS.escape(String(sv.id)) + '"]');
    var old = row && row.querySelector('.rx-sv-region');
    if (old) old.replaceWith(this.regionCell(sv));
  },

  // Región sin pulsar "ver": se consultan los servidores de la lista, uno a uno y con límite.
  autoRegions: async function (list) {
    var my = this.regionSeq, max = this.num(this.s['servers.regionChecks'], 10, 200, 60), n = 0;
    for (var i = 0; i < list.length && n < max; i++) {
      if (my !== this.regionSeq) return;
      var sv = list[i];
      if (sv.loc || sv.pending) continue;
      n++;
      sv.pending = true;
      this.paintRegion(sv);
      await this.lookup(sv);
      sv.pending = false;
      this.paintRegion(sv);
    }
  },

  // Saltar a otro servidor como pide "servers.hopMode", sin repetir los últimos en los que entraste.
  hop: function () { return this.go(this.s['servers.hopMode'] || 'random', true); },

  // mode: 'random' | 'few' | 'many' | 'empty' (el más vacío, sin filtros de jugadores).
  go: async function (mode, avoidRecent) {
    var s = this.s, f = this.filters(), my = ++this.seq;
    this.regionSeq++;
    if (mode === 'empty') { f.exact = null; f.min = null; f.max = null; mode = 'few'; }
    f.sort = mode === 'few' || mode === 'many' ? mode : 'random';
    var skip = {};
    var avoid = avoidRecent ? this.num(s['servers.avoidRecent'], 0, 100, 10) : 0;
    try {
      if (avoid > 0) {
        (await RX.local('recentServers', [])).slice(0, avoid).forEach(function (r) { if (r && r.serverId) skip[r.serverId] = 1; });
        var cur = await RX.local('myServer', null);
        if (cur && cur.gameId && Date.now() - (Number(cur.t) || 0) < 30 * 60000) skip[cur.gameId] = 1;
      }
      var r = await this.collect(f, f.sort === 'random' ? 150 : 40, my);
      if (my !== this.seq) return false;
      var list = r.matches.filter(function (sv) { return !skip[sv.id]; });
      if (f.sort === 'few') list.sort(function (a, b) { return a.playing - b.playing; });
      else if (f.sort === 'many') list.sort(function (a, b) { return b.playing - a.playing; });
      list = await this.byRegion(list, f.region, 1, my);
      if (my !== this.seq) return false;
      var sv = list[0];
      if (!sv) {
        this.say(avoid && r.matches.length ? 'Solo quedan servidores en los que ya has estado. Prueba con otros filtros.' : 'No encontré ningún servidor que cumpla los filtros.', true);
        return false;
      }
      this.say((avoidRecent ? 'Saltando' : 'Uniéndote') + ' a un servidor con ' + sv.playing + '/' + sv.maxPlayers + ' jugadores' + (sv.loc && !sv.loc.error ? ' en ' + this.locText(sv.loc) : '') + '.', true);
      RX.join(this.placeId, sv.id);
      return true;
    } catch (e) {
      if (my === this.seq) this.say(e.status === 429 ? 'Roblox está limitando las peticiones. Prueba otra vez en un momento.' : 'No se pudo buscar un servidor. Prueba otra vez en un momento.', true);
      return false;
    }
  },

  // ---------- Auto-hop ----------
  toggleAuto: function () {
    if (this.autoTimer) { this.stopAuto(true); return; }
    var min = this.num(this.s['servers.autoHopMinutes'], 0, 120, 0);
    if (min > 0) this.startAuto(min);
    else this.askAuto();
  },

  // Sin intervalo fijo en Ajustes, se pregunta aquí mismo (sin ventanas del navegador).
  askAuto: function () {
    var el = RX.el, self = this, box = this.autoAsk;
    if (!box.hidden) { box.hidden = true; return; }
    var input = el('input', { type: 'number', min: 1, max: 240, class: 'rx-num', value: this.lastAsk || 5, 'aria-label': 'Minutos entre cambios' });
    var go = function () {
      var m = Math.round(Number(input.value));
      if (!(m >= 1 && m <= 240)) { input.focus(); input.select(); return; }
      self.lastAsk = m;
      box.hidden = true;
      self.startAuto(m);
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      else if (e.key === 'Escape') { e.preventDefault(); box.hidden = true; }
    });
    box.textContent = '';
    box.appendChild(RX.icon('timer'));
    box.appendChild(el('span', { text: 'Cambiar de servidor cada' }));
    box.appendChild(input);
    box.appendChild(el('span', { text: 'min' }));
    box.appendChild(RX.ibtn('play', 'Empezar', { class: 'rx-btn rx-btn-small rx-primary', onclick: go }));
    box.appendChild(el('button', { class: 'rx-btn rx-btn-small', text: 'Cancelar', onclick: function () { box.hidden = true; } }));
    box.appendChild(el('span', { class: 'rx-muted', text: 'Puedes fijar el intervalo en los ajustes y no se volverá a preguntar.' }));
    box.hidden = false;
    input.focus();
    input.select();
  },

  startAuto: function (min) {
    var self = this;
    var next = Date.now() + min * 60000;
    this.hop();
    this.autoTimer = setInterval(function () {
      var left = Math.max(0, Math.round((next - Date.now()) / 1000));
      if (self.autoBtn) RX.setText(self.autoBtn, 'Parar auto-hop (' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') + ')', self.autoBtn.querySelector('[data-rc-icon="stop"]') ? null : 'stop');
      if (left <= 0) { next = Date.now() + min * 60000; self.hop(); }
    }, 1000);
    this.autoBtn.classList.add('rx-on');
    RX.toast('Auto-hop cada ' + rcMinText(min));
  },

  stopAuto: function (tell) {
    if (!this.autoTimer) return;
    clearInterval(this.autoTimer);
    this.autoTimer = null;
    if (this.autoBtn) { RX.setText(this.autoBtn, 'Auto-hop', 'timer'); this.autoBtn.classList.remove('rx-on'); }
    if (tell) RX.toast('Auto-hop parado');
  }
});
