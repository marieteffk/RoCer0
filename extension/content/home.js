// Inicio rediseñado: banner, actividad de amigos, fijados, retos de hoy, continuar, recientes con tu
// tiempo de juego, recomendación destacada, recomendados y colecciones. Las tarjetas, su orden, su
// colocación y su contenido se eligen en Ajustes → Inicio, y el Inicio se vuelve a pintar al momento
// cuando cambia un ajuste (con los datos ya cargados; solo se pide a Roblox lo que falte).
(function () {
  // Quita repetidos y deja los IDs como números.
  function uniq(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (id) {
      id = Number(id);
      if (!id || seen[id]) return;
      seen[id] = 1;
      out.push(id);
    });
    return out;
  }
  function num(v, min, max, def) {
    v = Number(v);
    if (!isFinite(v)) v = def;
    return Math.max(min, Math.min(max, Math.round(v)));
  }
  // Clave del creador como la guarda "Ocultar juegos de…" (Tipo:ID), si los datos la traen.
  function creatorKey(g) {
    var c = g && g.creator;
    if (c && c.id) return (c.type || 'User') + ':' + c.id;
    if (g && g.creatorId && g.creatorType) return (g.creatorType === 2 ? 'Group' : g.creatorType === 1 ? 'User' : g.creatorType) + ':' + g.creatorId;
    return null;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  RX.features.push({
    id: 'home',
    CARDS: ['hero', 'friends', 'pinned', 'challenges', 'continue', 'recent', 'featured', 'recommended', 'collections'],
    // Ancho que prefiere cada tarjeta en el mosaico de 12 columnas.
    WIDTH: { hero: 12, friends: 8, pinned: 8, challenges: 4, continue: 7, recent: 5, featured: 5, recommended: 4, collections: 3 },
    // Alto aproximado de cada tarjeta mientras carga.
    SKEL: { hero: 170, friends: 128, pinned: 230, challenges: 230, continue: 320, recent: 320, featured: 300, recommended: 300, collections: 300 },
    ANCHORS: ['#HomeContainer', '.home-container', '#home-page-container', '#container-main .content > div:not(#rk-home)', '#container-main .content'],

    s: null, me: null, root: null, anchor: null, canHide: false,
    loaded: null, starting: null, seq: 0, timer: null, wanted: null, force: false, listening: false,
    store: null, info: {}, users: {}, favs: {}, omniSorts: [], exploreSorts: [], joinUids: [],
    friendData: null, friendsP: null, exploreP: null, heroPick: undefined,
    chCard: null, chSig: null, observers: [], fits: [], ui: {},
    img: { wide: {}, icon: {}, big: {}, head: {} },
    tried: { info: {}, users: {}, wide: {}, icon: {}, big: {}, head: {} },

    run: async function (s) {
      var pending = window.__rkSetHomePending || function () {};
      this.s = s;
      if (RX.isTop && RX.isHome() && s['home.enabled']) {
        try { await this.start(); }
        catch (e) { console.warn('[RX] home', e); this.stop(); }
      }
      pending(false);
    },

    update: function (s) {
      var self = this;
      this.s = s;
      if (!RX.isTop || !RX.isHome()) return;
      if (!s['home.enabled']) { this.stop(); return; }
      if (!this.root) { this.start().catch(function (e) { console.warn('[RX] home', e); self.stop(); }); return; }
      this.schedule();
    },

    start: function () {
      var self = this;
      if (!this.starting) this.starting = this.boot().finally(function () { self.starting = null; });
      return this.starting;
    },

    boot: async function () {
      var self = this;
      var me = await RX.me();
      if (!me) throw new Error('Sin sesión');
      this.me = me;
      var anchor = await RX.waitFor(this.ANCHORS, 8000);
      if (!anchor) throw new Error('No encuentro el Inicio');
      if (!this.s['home.enabled'] || this.root) return;
      this.anchor = anchor;
      this.root = RX.el('div', { id: 'rk-home' });
      this.place();
      this.skeleton();
      if (!this.loaded) this.loaded = this.load().catch(function (e) { self.loaded = null; throw e; });
      await this.loaded;
      if (!this.listening) {
        this.listening = true;
        // Al cambiar el tamaño de la ventana, Roblox puede cambiar cómo coloca el Inicio.
        var wt = null;
        window.addEventListener('resize', function () { clearTimeout(wt); wt = setTimeout(function () { self.widen(); }, 250); });
        // Fijados, carpetas u ocultos cambiados en otra pestaña o en los ajustes: se repinta.
        RX.B.storage.onChanged.addListener(function (ch, area) {
          if (area !== 'local' || !self.store) return;
          var hit = false;
          ['pinned', 'pinFolders', 'blocked'].forEach(function (k) { if (ch[k]) { self.store[k] = ch[k].newValue; hit = true; } });
          if (hit && self.root) self.schedule(true);
        });
      }
      await this.render(true);
    },

    // Quita el Inicio de RoCer0 y deja el de Roblox tal cual.
    stop: function () {
      clearTimeout(this.timer);
      this.seq++;
      this.wanted = null;
      this.observers.forEach(function (o) { o.disconnect(); });
      this.observers = [];
      if (this.anchor) this.anchor.classList.remove('rk-home-hidden');
      if (this.root) this.root.remove();
      this.root = null;
    },

    schedule: function (force) {
      var self = this;
      this.force = this.force || !!force;
      clearTimeout(this.timer);
      this.timer = setTimeout(function () {
        if (!self.root || !self.loaded) return;
        var f = self.force;
        self.force = false;
        self.loaded.then(function () { return self.render(f); }).catch(function (e) { console.warn('[RX] home', e); });
      }, 150);
    },

    findAnchor: function () {
      for (var i = 0; i < this.ANCHORS.length; i++) {
        var a = document.querySelector(this.ANCHORS[i]);
        if (a) return a;
      }
      return null;
    },

    // Pone el Inicio de RoCer0 delante del de Roblox y oculta (o no) el original.
    place: function () {
      var a = this.anchor;
      if (!a || !a.isConnected) a = this.anchor = this.findAnchor();
      if (!a || !this.root) return;
      var isContent = a.classList.contains('content');
      this.canHide = !isContent;
      if (!this.root.isConnected) {
        if (isContent) a.insertBefore(this.root, a.firstChild);
        else a.parentNode.insertBefore(this.root, a);
      }
      a.classList.toggle('rk-home-hidden', this.canHide && !!this.s['home.hideOriginal'] && !this.ui.showOriginal);
      this.widen();
    },

    // En el PC, la web nueva de Roblox centra el Inicio y lo encoge al ancho de lo que lleva dentro: el de
    // RoCer0 se quedaba en una columna estrecha, como en el móvil. home.css ya le da todo el ancho de su
    // contenedor; si aun así no lo llena, o el contenedor solo crece cuando crece el Inicio, se sube un nivel
    // (sin salir del contenido de la página) hasta dar con un contenedor que tenga el ancho de verdad.
    widen: function () {
      var r = this.root;
      if (!r || !r.isConnected) return;
      for (var i = 0; i < 4; i++) {
        var p = r.parentElement, up = p && p.parentElement;
        if (!up || p === document.body || p.id === 'container-main' || p.matches('main, #wrap')) return;
        if (up.querySelector('#navigation, .rbx-left-col, #header, .rbx-header')) return;
        var cs = getComputedStyle(p);
        var inner = p.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        var before = p.getBoundingClientRect().width;
        r.style.width = Math.ceil(before + 400) + 'px';
        var grows = p.getBoundingClientRect().width > before + 200;
        r.style.width = '';
        if (!grows && r.getBoundingClientRect().width >= inner - 40) return;
        up.insertBefore(r, p);
      }
    },

    // ---------- Qué tarjetas y dónde ----------
    // Orden guardado (sin IDs desconocidos ni repetidos; las que falten van al final) y solo las encendidas.
    order: function (s) {
      var all = this.CARDS, seen = {}, out = [];
      (Array.isArray(s['home.order']) ? s['home.order'] : []).concat(all).forEach(function (id) {
        if (all.indexOf(id) < 0 || seen[id]) return;
        seen[id] = 1;
        out.push(id);
      });
      return out.filter(function (id) {
        if (!s['home.' + id]) return false;
        if (id === 'challenges') return !!s['fun.challenges'];
        if (id === 'pinned') return !!s['pinned.enabled'];
        return true;
      });
    },

    layout: function (s) {
      // El diseño "Una columna" del tema pone todas las tarjetas a lo ancho.
      if (document.documentElement.classList.contains('rk-l-home-stacked')) return 'stack';
      var l = s['home.layout'];
      return l === 'columns' || l === 'stack' ? l : 'auto';
    },

    // Reparte las tarjetas en filas de 12 columnas: [[id, ancho], ...] por fila.
    pack: function (ids, layout) {
      var W = this.WIDTH, rows = [], row = [], used = 0;
      var close = function () { if (row.length) rows.push(row); row = []; used = 0; };
      if (layout === 'stack') return ids.map(function (id) { return [[id, 12]]; });
      ids.forEach(function (id) {
        if (layout === 'columns') {
          if (id === 'hero') { close(); rows.push([[id, 12]]); return; }
          row.push([id, 6]);
          if (row.length === 2) close();
          return;
        }
        var w = W[id] || 6;
        if (used + w > 12) close();
        row.push([id, w]);
        used += w;
      });
      close();
      return rows.map(this.scaleRow);
    },

    // Estira una fila incompleta para que sume 12 columnas (enteros, por restos mayores).
    scaleRow: function (row) {
      var sum = row.reduce(function (a, x) { return a + x[1]; }, 0);
      if (sum === 12) return row;
      var exact = row.map(function (x) { return x[1] * 12 / sum; });
      var out = exact.map(Math.floor);
      var left = 12 - out.reduce(function (a, b) { return a + b; }, 0);
      exact.map(function (v, i) { return [v - Math.floor(v), i]; })
        .sort(function (a, b) { return (b[0] - a[0]) || (a[1] - b[1]); })
        .slice(0, left).forEach(function (x) { out[x[1]]++; });
      return row.map(function (x, i) { return [x[0], out[i]]; });
    },

    // Juegos por fila según lo ancha que sea la tarjeta (columnas de las 12).
    cols: function (kind, span) {
      var t = kind === 'pinned' ? [1, 1, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7] : [1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6];
      return t[Math.max(1, Math.min(12, span || 12))];
    },

    // Firma de los ajustes que cambian el Inicio: si no cambia, no se repinta.
    sig: function (s) {
      var keys = Object.keys(s).filter(function (k) {
        return /^(home|discover|pinned|challenges)\./.test(k) || k === 'friends.favorites' || k === 'fun.roulette' || k === 'fun.challenges';
      }).sort();
      return JSON.stringify(keys.map(function (k) { return s[k]; })) + this.layout(s);
    },

    skeleton: function () {
      var self = this, el = RX.el;
      this.root.textContent = '';
      this.pack(this.order(this.s), this.layout(this.s)).forEach(function (row) {
        row.forEach(function (x) {
          self.root.appendChild(el('div', { class: 'rk-card rk-skel', style: { height: self.SKEL[x[0]] + 'px', gridColumn: 'span ' + x[1] } }));
        });
      });
    },

    // ---------- Datos ----------
    load: async function () {
      var self = this, s = this.s;
      this.store = await RX.B.storage.local.get(['pinned', 'pinFolders', 'myGames', 'myRecent', 'myJoins', 'lastSeen', 'blocked', 'placeMeta']);
      var order = this.order(s);
      var res = await Promise.all([
        this.omni().catch(function () { return null; }),
        this.has(order, ['featured', 'recommended', 'collections']) ? this.loadExplore() : null,
        order.indexOf('friends') >= 0 ? this.loadFriends() : null
      ]);
      var omni = res[0];
      if (omni) {
        var meta = (omni.contentMetadata && omni.contentMetadata.Game) || {};
        for (var k in meta) this.addInfo(Object.assign({ universeId: Number(k) }, meta[k]));
        (omni.sorts || []).forEach(function (so) {
          var ids = (so.recommendationList || []).filter(function (r) { return r.contentType === 'Game'; }).map(function (r) { return r.contentId; });
          if (ids.length) self.omniSorts.push({ name: so.topic || '', ids: uniq(ids), source: 'omni' });
        });
      }
      (this.store.pinned || []).forEach(function (p) { if (p && p.universeId) self.addInfo({ universeId: p.universeId, placeId: p.placeId, name: p.name }); });
      (this.store.myRecent || []).forEach(function (r) { if (r && r.universeId) self.addInfo({ universeId: r.universeId, rootPlaceId: r.placeId, name: r.name }); });
      this.joinUids = await this.joinsToUniverses(this.store.myJoins || []);
      // Los juegos que Roblox dice que ya jugaste no cuentan como "nuevos" para los retos.
      var cont = this.omniSorts.find(function (x) { return /continu|seguir|jugar de nuevo|play again/i.test(x.name); });
      if (cont) RX.send('played:seed', { universeIds: cont.ids.slice(0, 80) }).catch(function () {});
    },

    has: function (order, ids) { return ids.some(function (id) { return order.indexOf(id) >= 0; }); },

    omni: function () {
      return RX.api('https://apis.roblox.com/discovery-api/omni-recommendation', {
        method: 'POST',
        body: { pageType: 'Home', sessionId: crypto.randomUUID(), supportedTreatmentTypes: ['SortlessGrid'], authIntentData: null }
      });
    },

    // Listas de "Descubrir" (para destacados, recomendados y colecciones). Se piden una vez y solo si hacen falta.
    loadExplore: function () {
      var self = this;
      if (!this.exploreP) {
        this.exploreP = RX.api('https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=' + crypto.randomUUID() + '&device=computer&country=all')
          .then(function (d) { return (d.sorts || []).filter(function (x) { return x.games && x.games.length; }); })
          .catch(function () { return []; })
          .then(function (list) {
            self.exploreSorts = [];
            list.forEach(function (so) {
              so.games.forEach(function (g) { self.addInfo(g); });
              var ids = uniq(so.games.map(function (g) { return g.universeId; }));
              if (ids.length) self.exploreSorts.push({ name: so.sortDisplayName || so.sortId || '', ids: ids, source: 'explore' });
            });
          });
      }
      return this.exploreP;
    },

    // Tus amigos con su estado. Los nombres y las caras se piden luego, solo de los que se ven.
    loadFriends: function () {
      var self = this;
      if (!this.friendsP) {
        this.friendsP = (async function () {
          var ids = [], cursor = '';
          for (var i = 0; i < 4; i++) {
            var r = await RX.api('https://friends.roblox.com/v1/users/' + self.me.id + '/friends/find?limit=50' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
            (r.PageItems || []).forEach(function (p) { if (p && p.id) ids.push(Number(p.id)); });
            cursor = r.NextCursor;
            if (!cursor) break;
          }
          ids = uniq(ids);
          var pres = {};
          for (var j = 0; j < ids.length; j += 50) {
            var pr = await RX.api('https://presence.roblox.com/v1/presence/users', { method: 'POST', body: { userIds: ids.slice(j, j + 50) } }).catch(function () { return {}; });
            (pr.userPresences || []).forEach(function (p) { pres[p.userId] = p; });
          }
          return { ids: ids, pres: pres };
        })().then(function (d) { self.friendData = d; }, function () { self.friendData = { ids: [], pres: {}, error: true }; });
      }
      return this.friendsP;
    },

    addInfo: function (g) {
      var id = Number(g && (g.universeId || g.id));
      if (!id) return;
      var x = this.info[id] = this.info[id] || { uid: id };
      if (g.rootPlaceId && !x.placeId) x.placeId = g.rootPlaceId;
      if (g.placeId) {
        if (!x.placeId) x.placeId = g.placeId;
        else if (String(g.placeId) !== String(x.placeId)) (x.places = x.places || []).push(String(g.placeId));
      }
      if (!x.name && g.name) x.name = g.name;
      if (g.totalUpVotes !== undefined) { x.up = g.totalUpVotes; x.down = g.totalDownVotes; }
      if (g.playerCount !== undefined) x.playing = g.playerCount;
      var c = creatorKey(g);
      if (c && !x.creator) x.creator = c;
    },

    joinsToUniverses: async function (joins) {
      var self = this, known = {}, meta = this.store.placeMeta || {};
      for (var k in this.info) if (this.info[k].placeId) known[this.info[k].placeId] = Number(k);
      var list = await Promise.all(joins.slice(0, 8).map(async function (j) {
        var pid = j && j.placeId;
        if (!pid) return null;
        var uid = known[pid] || (meta[pid] && meta[pid].u);
        if (!uid) {
          try { uid = await RX.universeOf(pid); } catch (e) { return null; }   // sitio borrado o privado
        }
        if (!uid) return null;
        self.addInfo({ universeId: uid, placeId: pid });
        return Number(uid);
      }));
      return uniq(list);
    },

    // Nombre, sitio, jugadores, creador y votos de los juegos que no los traían.
    fillInfo: async function (ids) {
      var self = this, info = this.info, tried = this.tried.info;
      var missing = uniq(ids).filter(function (id) {
        var x = info[id];
        return !tried[id] && (!x || !x.name || x.playing === undefined || x.up === undefined || !x.placeId);
      });
      missing.forEach(function (id) { tried[id] = 1; });
      for (var i = 0; i < missing.length; i += 50) {
        var chunk = missing.slice(i, i + 50).join(',');
        var res = await Promise.all([
          RX.api('https://games.roblox.com/v1/games?universeIds=' + chunk).catch(function () { return null; }),
          RX.api('https://games.roblox.com/v1/games/votes?universeIds=' + chunk).catch(function () { return null; })
        ]);
        ((res[0] || {}).data || []).forEach(function (x) {
          var t = info[x.id] = info[x.id] || { uid: x.id };
          if (x.name) t.name = x.name;
          if (x.rootPlaceId) {
            if (t.placeId && String(t.placeId) !== String(x.rootPlaceId)) (t.places = t.places || []).push(String(t.placeId));
            t.placeId = x.rootPlaceId;
          }
          if (x.playing !== undefined) t.playing = x.playing;
          t.creator = creatorKey(x) || t.creator || null;
        });
        ((res[1] || {}).data || []).forEach(function (x) {
          var t = info[x.id] = info[x.id] || { uid: x.id };
          t.up = x.upVotes; t.down = x.downVotes;
        });
      }
      return self;
    },

    ensureImg: async function (kind, ids) {
      var cache = this.img[kind], tried = this.tried[kind];
      var missing = uniq(ids).filter(function (id) { return !cache[id] && !tried[id]; });
      if (!missing.length) return;
      missing.forEach(function (id) { tried[id] = 1; });
      var type = { wide: 'gameWide', icon: 'games', big: 'games', head: 'users' }[kind];
      var size = { icon: '150x150', big: '256x256', head: '150x150' }[kind];
      Object.assign(cache, await RX.thumbs(type, missing, size));
    },

    ensureUsers: async function (ids) {
      var users = this.users, tried = this.tried.users;
      var missing = uniq(ids).filter(function (id) { return !users[id] && !tried[id]; });
      missing.forEach(function (id) { tried[id] = 1; });
      for (var i = 0; i < missing.length; i += 100) {
        try {
          var u = await RX.api('https://users.roblox.com/v1/users', { method: 'POST', body: { userIds: missing.slice(i, i + 100), excludeBannedUsers: false } });
          (u.data || []).forEach(function (x) { users[x.id] = { name: x.name, displayName: x.displayName || x.name }; });
        } catch (e) { /* sin nombres: se ve el ID */ }
      }
    },

    // ---------- Filtros de "Descubrir" (no se aplican a fijados ni amigos) ----------
    makeFilter: function (s) {
      var info = this.info, self = this;
      if (!s['discover.enabled'] || !s['discover.applyHome']) return function () { return false; };
      var blocked = (this.store && this.store.blocked) || {};
      var games = blocked.games || {}, creators = blocked.creators || {};
      var meta = (this.store && this.store.placeMeta) || {};
      var hasCreators = Object.keys(creators).length > 0;
      var min = Number(s['discover.minRating']) || 0;
      // Lo que ya se sabe por otras páginas: de qué universo es cada sitio oculto y de quién es cada juego.
      var blockedUid = {}, creatorOf = {};
      Object.keys(meta).forEach(function (pid) {
        var x = meta[pid];
        if (!x || !x.u) return;
        if (games[pid]) blockedUid[x.u] = 1;
        if (x.c && !creatorOf[x.u]) creatorOf[x.u] = x.c;
      });
      return function (uid) {
        var g = info[uid];
        if (blockedUid[uid]) return true;
        if (!g) return false;
        if (g.placeId && games[g.placeId]) return true;
        if (g.places && g.places.some(function (p) { return games[p]; })) return true;
        if (hasCreators) {
          var c = g.creator || creatorOf[uid];
          if (c && creators[c]) return true;
        }
        if (rcBlockedName(g.name, s)) return true;
        var r = self.rating(g);
        return min > 0 && r !== null && r < min;
      };
    },

    // ---------- Qué se enseña en cada tarjeta ----------
    // final = false: primera pasada, solo para saber de qué juegos hace falta información.
    model: function (s, order, final) {
      var self = this, info = this.info, store = this.store || {};
      var on = function (id) { return order.indexOf(id) >= 0; };
      var hidden = this.makeFilter(s);
      var ok = function (id) { return !!(info[id] && info[id].placeId); };
      var m = { needInfo: [], wide: [], icons: [], big: [] };
      var need = function (list) { m.needInfo = m.needInfo.concat(list); };

      // Listas de Roblox: "Continuar", destacados, recomendados y el resto como colecciones.
      var sorts = this.omniSorts.concat(this.exploreSorts || []);
      var find = function (re, source, not) {
        return sorts.find(function (x) { return re.test(x.name) && (!source || x.source === source) && (not || []).indexOf(x) < 0; });
      };
      var contSort = find(/continu|seguir|jugar de nuevo|play again/i);
      var featSort = find(/featured|destacad|picks|selecci|spotlight/i, null, [contSort]);
      var recSort = find(/recommend|recomend|for you|para ti/i, 'omni', [contSort, featSort]) || find(/trending|tendencia|popular/i, null, [contSort, featSort]) ||
        sorts.find(function (x) { return x !== contSort && x !== featSort; });

      // Fijados, en el orden de "pinned.sort". No se filtran.
      var pins = [];
      if (s['pinned.enabled']) {
        pins = rcSortPins((store.pinned || []).filter(function (p) { return p && p.universeId && p.placeId; }), s['pinned.sort'], (store.myRecent || []).concat(store.myJoins || []));
      }
      var pinUids = uniq(pins.map(function (p) { return p.universeId; }));
      m.pins = pins;
      if (on('pinned')) { need(pinUids); m.wide = m.wide.concat(pinUids); }

      // Continuar: lo que Roblox propone, tus recientes, tus partidas y tus fijados.
      var recentList = (store.myRecent || []).filter(function (r) { return r && r.universeId; });
      var contAll = uniq((contSort ? contSort.ids : []).concat(recentList.map(function (r) { return r.universeId; }), this.joinUids || [], pinUids));
      m.rows = num(s['home.continueRows'], 1, 5, 2);
      if (on('continue')) {
        var contMax = m.rows * 8;
        need(contAll.slice(0, contMax + 16));
        m.cont = contAll.filter(function (id) { return ok(id) && !hidden(id); }).slice(0, contMax);
        m.contFiltered = !m.cont.length && contAll.some(ok);
        m.wide = m.wide.concat(m.cont);
      }

      // Tiempo de juego por periodo.
      var myGames = store.myGames || {};
      var playedUids = [];
      Object.keys(myGames).forEach(function (d) { playedUids = playedUids.concat(Object.keys(myGames[d] || {})); });
      playedUids = uniq(playedUids);

      // Banner.
      m.hero = null;
      if (on('hero')) {
        var src = s['home.heroSource'];
        if (src === 'pinned' && pins.length) {
          m.hero = { id: Number(pins[0].universeId), kind: 'pinned', placeId: pins[0].placeId, name: pins[0].name, icon: pins[0].icon };
        } else if (src === 'random') {
          // Se elige una vez por visita al Inicio, no en cada repintado.
          var poolAll = uniq(contAll.concat(pinUids, playedUids));
          need(poolAll.slice(0, 80));
          var pool = poolAll.filter(function (id) { return ok(id) && !hidden(id); });
          if (final && (this.heroPick === undefined || pool.indexOf(this.heroPick) < 0)) this.heroPick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
          if (this.heroPick && pool.indexOf(this.heroPick) >= 0) m.hero = { id: this.heroPick, kind: 'random' };
        }
        if (!m.hero) {
          var first = contAll.find(ok);
          if (first) m.hero = { id: first, kind: 'continue' };
        }
        if (m.hero) { need([m.hero.id]); m.wide.push(m.hero.id); }
      }

      // Juegos recientes: los tres periodos (se cambian con los botones de la tarjeta sin repintar).
      if (on('recent')) {
        var count = num(s['home.recentCount'], 3, 15, 6);
        var lists = {}, hasTime = false;
        ['7', '30', 'all'].forEach(function (key) {
          var cutoff = key === 'all' ? 0 : Date.now() - Number(key) * 86400000;
          var totals = {};
          Object.keys(myGames).forEach(function (d) {
            if (cutoff && new Date(d + 'T23:59:59').getTime() < cutoff) return;
            Object.keys(myGames[d] || {}).forEach(function (uid) {
              var g = myGames[d][uid] || {}, n = Number(uid);
              var t = totals[n] = totals[n] || { uid: n, minutes: 0, name: g.name, placeId: g.placeId };
              t.minutes += Number(g.minutes) || 0;
              if (!t.placeId && g.placeId) t.placeId = g.placeId;
            });
          });
          var ranked = Object.keys(totals).map(function (k) { return totals[k]; })
            .filter(function (t) { return t.minutes > 0 && (t.placeId || ok(t.uid)); })
            .sort(function (a, b) { return b.minutes - a.minutes; });
          if (ranked.length) hasTime = true;
          need(ranked.slice(0, count + 8).map(function (t) { return t.uid; }));
          var vis = ranked.filter(function (t) { return !hidden(t.uid); });
          lists[key] = { items: vis.slice(0, count), filtered: ranked.length > 0 && !vis.length };
          m.icons = m.icons.concat(lists[key].items.map(function (t) { return t.uid; }));
        });
        var last = {};
        recentList.forEach(function (r) { if (!last[r.universeId]) last[r.universeId] = r.t; });
        var fallback = contAll.filter(function (id) { return ok(id) && !hidden(id); }).slice(0, count);
        if (!hasTime) { need(contAll.slice(0, count + 8)); m.icons = m.icons.concat(fallback); }
        m.recent = { hasTime: hasTime, lists: lists, fallback: fallback, last: last };
      }

      // Recomendación destacada (nunca el mismo juego que el banner).
      if (on('featured')) {
        var fc = uniq((featSort ? featSort.ids : []).concat(recSort ? recSort.ids : []));
        need(fc.slice(0, 10));
        var heroId = m.hero && m.hero.id;
        m.featured = fc.find(function (id) { return id !== heroId && ok(id) && !hidden(id); }) || null;
        m.featFiltered = !m.featured && fc.some(ok);
        if (m.featured) m.wide.push(m.featured);
      }

      // Recomendados (sin repetir el destacado).
      if (on('recommended')) {
        var rc = recSort ? recSort.ids : [];
        var rn = num(s['home.recommendedCount'], 3, 12, 6);
        need(rc.slice(0, rn + 12));
        m.rec = rc.filter(function (id) { return id !== m.featured && ok(id) && !hidden(id); }).slice(0, rn);
        m.recFiltered = !m.rec.length && rc.some(ok);
        m.recName = recSort ? recSort.name : '';
        m.icons = m.icons.concat(m.rec);
      }

      // Colecciones: el resto de listas (sin patrocinados, amigos ni favoritos, y sin nombres repetidos).
      if (on('collections')) {
        var names = {};
        var cand = sorts.filter(function (x) {
          if (x === contSort || x === recSort || x === featSort || /sponsor|patrocin|friend|amig|favorit/i.test(x.name)) return false;
          var key = rcFold(x.name).trim();
          if (!key || names[key]) return false;
          names[key] = 1;
          return true;
        });
        var cn = num(s['home.collectionsCount'], 2, 12, 6);
        cand.slice(0, cn + 4).forEach(function (c) { need(c.ids.slice(0, 3)); });
        m.collections = cand.map(function (c) { return { name: c.name, ids: c.ids.filter(function (id) { return !hidden(id); }) }; })
          .filter(function (c) { return c.ids.some(ok); })
          .slice(0, cn);
        m.collFiltered = !m.collections.length && cand.length > 0;
        m.collections.forEach(function (c) { c.cover = c.ids.find(ok); m.big.push(c.cover); });
      }
      return m;
    },

    // Amigos a mostrar, ya ordenados.
    friendsModel: async function (s) {
      var d = this.friendData;
      if (!d) return { ids: [], total: 0, online: 0, error: true };
      var mode = s['home.friendsSort'];
      var byName = (s['friends.favorites'] || []).some(function (f) { return !/^\s*@?\d+\s*$/.test(String(f)); });
      // Para ordenar por nombre (o por favoritos guardados por nombre) hacen falta los nombres de todos.
      if (mode === 'name' || (mode === 'favorites' && byName)) await this.ensureUsers(d.ids);
      var users = this.users, seen = (this.store && this.store.lastSeen) || {};
      var type = function (id) { return (d.pres[id] && d.pres[id].userPresenceType) || 0; };
      // Jugando, en línea, en Studio y desconectados; entre iguales, el que se conectó hace menos.
      var order = [3, 1, 0, 2];   // posición según userPresenceType (0 desconectado, 1 en línea, 2 jugando, 3 Studio)
      var rank = function (id) { var r = order[type(id)]; return r === undefined ? 3 : r; };
      var seenAt = function (id) { return (seen[id] && seen[id].t) || 0; };
      var byStatus = function (a, b) { return (rank(a) - rank(b)) || (seenAt(b) - seenAt(a)); };
      var cmp = byStatus;
      if (mode === 'favorites') {
        var fav = {};
        d.ids.forEach(function (id) { var u = users[id] || {}; fav[id] = rcIsFavorite(s, { id: id, name: u.name, displayName: u.displayName }) ? 0 : 1; });
        cmp = function (a, b) { return (fav[a] - fav[b]) || byStatus(a, b); };
      } else if (mode === 'recent') {
        // Conectados (jugando, en línea o en Studio) cuentan como "ahora".
        var when = function (id) { return type(id) > 0 ? Infinity : seenAt(id); };
        cmp = function (a, b) { var x = when(a), y = when(b); return x === y ? byStatus(a, b) : (y > x ? 1 : -1); };
      } else if (mode === 'name') {
        var label = function (id) { var u = users[id] || {}; return rcFold(u.displayName || u.name || String(id)); };
        cmp = function (a, b) { return label(a).localeCompare(label(b), 'es') || (a - b); };
      }
      var ids = d.ids.slice();
      if (!s['home.friendsOffline']) ids = ids.filter(function (id) { return type(id) > 0; });
      ids.sort(cmp);
      ids = ids.slice(0, num(s['home.friendsCount'], 1, 50, 10));
      await this.ensureUsers(ids);
      return { ids: ids, total: d.ids.length, online: d.ids.filter(function (id) { return type(id) > 0; }).length, error: !!d.error };
    },

    // Tarjeta de retos (la pone fun.js). Se reutiliza mientras no cambien los ajustes de retos.
    challenges: async function (s) {
      if (!s['fun.challenges'] || !RX.rc || typeof RX.rc.challengesCard !== 'function') return null;
      var sig = JSON.stringify(Object.keys(s).filter(function (k) { return /^(challenges|fun)\./.test(k); }).sort().map(function (k) { return s[k]; }));
      if (this.chSig === sig && this.chCard) return this.chCard;
      var card = null;
      try { card = await RX.rc.challengesCard(); } catch (e) { console.warn('[RX] retos', e); }
      this.chCard = card && card.nodeType === 1 ? card : null;
      this.chSig = sig;
      return this.chCard;
    },

    // ---------- Pintar ----------
    render: async function (force) {
      var self = this, s = this.s;
      if (!this.root) return;
      var sig = this.sig(s);
      if (!force && sig === this.wanted) return;
      this.wanted = sig;
      var seq = ++this.seq;
      var alive = function () { return seq === self.seq && !!self.root; };
      try {
        var order = this.order(s);
        var jobs = [];
        if (this.has(order, ['featured', 'recommended', 'collections'])) jobs.push(this.loadExplore());
        if (order.indexOf('friends') >= 0) jobs.push(this.loadFriends());
        await Promise.all(jobs);
        if (!alive()) return;
        await this.fillInfo(this.model(s, order, false).needInfo);
        if (!alive()) return;
        var m = this.model(s, order, true);
        var fr = order.indexOf('friends') >= 0 ? await this.friendsModel(s) : null;
        var ch = order.indexOf('challenges') >= 0 ? await this.challenges(s) : null;
        if (!alive()) return;
        await Promise.all([
          this.ensureImg('wide', m.wide),
          this.ensureImg('icon', m.icons),
          this.ensureImg('big', m.big),
          fr ? this.ensureImg('head', fr.ids) : null
        ]);
        if (!alive()) return;
        this.paint(s, order, m, fr, ch);
      } catch (e) {
        this.wanted = null;
        throw e;
      }
    },

    paint: function (s, order, m, fr, ch) {
      var self = this;
      if (this.ui.hideSetting !== s['home.hideOriginal']) { this.ui.hideSetting = s['home.hideOriginal']; this.ui.showOriginal = false; }
      this.observers.forEach(function (o) { o.disconnect(); });
      this.observers = [];
      this.fits = [];
      var avail = order.filter(function (id) {
        if (id === 'hero') return !!m.hero;
        if (id === 'challenges') return !!ch;
        return true;
      });
      var frag = document.createDocumentFragment();
      this.pack(avail, this.layout(s)).forEach(function (row) {
        row.forEach(function (x) {
          var card = self.build(s, x[0], x[1], m, fr, ch);
          card.style.gridColumn = 'span ' + x[1];
          card.setAttribute('data-card', x[0]);
          frag.appendChild(card);
        });
      });
      if (s['home.footer']) frag.appendChild(this.footer(s));
      this.place();
      this.root.replaceChildren(frag);
      this.fits.forEach(function (f) { f(); });
      // Las animaciones de entrada del tema solo al abrir el Inicio, no al cambiar un ajuste.
      if (!this.root.classList.contains('rk-live')) {
        var root = this.root;
        setTimeout(function () { root.classList.add('rk-live'); }, 1500);
      }
    },

    build: function (s, id, span, m, fr, ch) {
      switch (id) {
        case 'hero': return this.heroCard(s, m);
        case 'friends': return this.friendsCard(s, fr);
        case 'pinned': return this.pinnedCard(s, m, span);
        case 'challenges': return ch;
        case 'continue': return this.continueCard(s, m, span);
        case 'recent': return this.recentCard(s, m);
        case 'featured': return this.featuredCard(s, m);
        case 'recommended': return this.recommendedCard(s, m);
        default: return this.collectionsCard(s, m);
      }
    },

    // ---------- Piezas ----------
    card: function (id, cls, children) {
      return RX.el('section', { class: 'rk-card rk-c-' + id + (cls ? ' ' + cls : '') }, children);
    },

    head: function (icon, title, side, extra) {
      var el = RX.el;
      side = (side || []).filter(Boolean);
      return el('div', { class: 'rk-head' }, [
        el('h2', {}, [icon ? RX.icon(icon) : null, el('span', { class: 'rk-h-text', text: title })].concat(extra || [])),
        side.length ? el('div', { class: 'rk-head-side' }, side) : null
      ]);
    },

    viewAll: function (text, href) {
      return RX.el('a', { class: 'rk-viewall', href: href }, [text, RX.icon('arrow')]);
    },

    // Estado vacío: icono, texto corto y, si hace falta, una pista.
    empty: function (icon, text, sub) {
      var el = RX.el;
      return el('div', { class: 'rk-empty-state' }, [
        el('span', { class: 'rk-es-icon' }, [RX.icon(icon)]),
        el('div', { class: 'rk-es-text', text: text }),
        sub ? el('div', { class: 'rk-es-sub', text: sub }) : null
      ]);
    },

    rating: function (g) {
      var total = ((g && g.up) || 0) + ((g && g.down) || 0);
      return total ? Math.round(100 * g.up / total) : null;
    },

    metaRow: function (g) {
      var el = RX.el, r = this.rating(g);
      return el('div', { class: 'rk-meta' }, [
        r !== null ? el('span', { title: 'Valoración' }, [RX.icon('thumb'), r + '%']) : null,
        g.playing !== undefined ? el('span', { title: 'Jugando ahora' }, [RX.icon('users'), RX.short(g.playing || 0)]) : null
      ]);
    },

    thumbPh: function () { return RX.el('span', { class: 'rk-thumb-ph' }, [RX.icon('gamepad')]); },

    rowImg: function (id) {
      var img = this.img.icon[id] || this.img.wide[id];
      return img ? RX.el('img', { src: img, alt: '', loading: 'lazy' }) : RX.el('span', { class: 'rk-row-ph' }, [RX.icon('gamepad')]);
    },

    // Tarjeta de juego (Continuar y Fijados). g: { placeId, name, up, down, playing }.
    tile: function (g, img, pill) {
      var el = RX.el, s = this.s;
      return el('a', { class: 'rk-tile', href: '/games/' + g.placeId, title: g.name || '' }, [
        el('div', { class: 'rk-thumb' }, [
          img ? el('img', { src: img, loading: 'lazy', alt: '' }) : this.thumbPh(),
          pill ? el('span', { class: 'rk-pill', title: pill }, [RX.icon('star'), el('span', { text: pill })]) : null,
          s['home.tileQuickPlay'] ? el('button', { class: 'rk-quickplay', title: 'Jugar', 'aria-label': 'Jugar a ' + (g.name || 'este juego'), onclick: function (e) { e.preventDefault(); e.stopPropagation(); RX.join(g.placeId); } }, [RX.icon('play')]) : null
        ]),
        el('div', { class: 'rk-tile-name', text: g.name || 'Juego' }),
        s['home.tileMeta'] ? this.metaRow(g) : null
      ]);
    },

    // Oculta los juegos que no caben en las filas pedidas (según las columnas que se ven de verdad).
    fit: function (grid, rows) {
      var apply = function () {
        if (!grid.isConnected) return;
        var cols = String(getComputedStyle(grid).gridTemplateColumns || '').split(' ').filter(function (x) { return /\dpx$/.test(x); }).length;
        if (!cols) cols = Number(grid.style.getPropertyValue('--rk-cols')) || 4;
        Array.prototype.forEach.call(grid.children, function (t, i) { t.classList.toggle('rk-cut', i >= rows * cols); });
      };
      this.fits.push(apply);
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { requestAnimationFrame(apply); });
        ro.observe(grid);
        if (grid.firstElementChild) ro.observe(grid.firstElementChild);
        this.observers.push(ro);
      }
    },

    heroCard: function (s, m) {
      var el = RX.el, h = m.hero, g = this.info[h.id] || {};
      var placeId = h.placeId || g.placeId, name = g.name || h.name || 'Juego';
      var img = this.img.wide[h.id] || h.icon || this.img.icon[h.id];
      var r = this.rating(g);
      var label = h.kind === 'pinned' ? ['pin', 'Fijado'] : h.kind === 'random' ? ['shuffle', 'Elegido al azar'] : ['history', 'Continuar'];
      var actions = [el('button', { class: 'rk-btn rk-btn-play', onclick: function () { RX.join(placeId); } }, [RX.icon('play'), h.kind === 'continue' ? 'Continuar' : 'Jugar'])];
      if (s['home.heroRoulette'] && s['fun.roulette'] && RX.rc && typeof RX.rc.roulette === 'function') {
        actions.push(el('button', { class: 'rk-btn rk-btn-ghost', title: 'Ruleta de juegos: para cuando no sabes a qué jugar', onclick: function () { RX.rc.roulette(); } }, [RX.icon('roulette'), 'Ruleta']));
      }
      if (s['home.heroFavorite']) actions.push(this.favButton(h.id));
      return this.card('hero', 'rk-hero', [
        el('div', { class: 'rk-hero-img', style: { backgroundImage: img ? 'url("' + img + '")' : 'none' } }),
        el('div', { class: 'rk-hero-body' }, [
          el('div', { class: 'rk-hero-main' }, [
            el('div', { class: 'rk-eyebrow' }, [RX.icon(label[0]), el('span', { text: label[1] })]),
            el('a', { href: '/games/' + placeId, title: name }, [el('h1', { class: 'rk-hero-title', text: name })]),
            el('div', { class: 'rk-meta' }, [
              r !== null ? el('span', {}, [el('span', { class: 'rk-star' }, [RX.icon('star')]), r + '%']) : null,
              g.playing !== undefined ? el('span', { text: (r !== null ? '· ' : '') + RX.fmt(g.playing) + ' jugando' }) : null
            ])
          ]),
          el('div', { class: 'rk-hero-actions' }, actions)
        ])
      ]);
    },

    favButton: function (uid) {
      var el = RX.el, self = this;
      var url = 'https://games.roblox.com/v1/games/' + uid + '/favorites';
      var b = el('button', { class: 'rk-btn rk-btn-ghost rk-btn-icon', title: 'Añadir a favoritos', 'aria-label': 'Favorito' }, [RX.icon('heart')]);
      var paint = function () {
        var on = !!self.favs[uid];
        b.classList.toggle('rk-on', on);
        b.title = on ? 'Quitar de favoritos' : 'Añadir a favoritos';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      };
      if (self.favs[uid] === undefined) {
        self.favs[uid] = null;
        RX.api(url).then(function (d) { self.favs[uid] = !!d.isFavorited; paint(); }).catch(function () { self.favs[uid] = undefined; });
      }
      paint();
      b.addEventListener('click', function () {
        var next = !self.favs[uid];
        RX.api(url, { method: 'POST', body: { isFavorited: next } }).then(function () {
          self.favs[uid] = next;
          paint();
          RX.toast(next ? 'Añadido a favoritos' : 'Quitado de favoritos');
        }).catch(function (e) { RX.toast('No se pudo cambiar: ' + e.message); });
      });
      return b;
    },

    friendsCard: function (s, fr) {
      var el = RX.el, self = this;
      var count = fr && fr.total ? el('span', { class: 'rk-count', title: 'Amigos conectados ahora' }, [el('i', { class: 'rk-online' }), plural(fr.online, 'conectado', 'conectados')]) : null;
      var card = this.card('friends', '', [this.head('users', 'Actividad de amigos', [count, this.viewAll('Ver todos', '/users/friends')])]);
      if (!fr || fr.error) { card.appendChild(this.empty('alert', 'No se pudo cargar a tus amigos.', 'Prueba a recargar la página.')); return card; }
      if (!fr.ids.length) {
        card.appendChild(fr.total ? this.empty('moon', 'Ninguno de tus amigos está conectado ahora.') : this.empty('users', 'Aún no tienes amigos en Roblox.', 'Cuando añadas a alguien, aquí verás a qué juega.'));
        return card;
      }
      var list = el('div', { class: 'rk-friends' });
      fr.ids.forEach(function (id) { list.appendChild(self.friendChip(s, id)); });
      card.appendChild(this.scroller(list));
      return card;
    },

    // Fila con desplazamiento lateral: flechas a los lados cuando hay más por ver.
    scroller: function (inner) {
      var el = RX.el;
      var left = el('button', { class: 'rk-arrow rk-arrow-l', title: 'Anteriores', 'aria-label': 'Anteriores', tabindex: '-1' }, [RX.icon('chevronRight')]);
      var right = el('button', { class: 'rk-arrow rk-arrow-r', title: 'Siguientes', 'aria-label': 'Siguientes', tabindex: '-1' }, [RX.icon('chevronRight')]);
      var wrap = el('div', { class: 'rk-scroller' }, [inner, left, right]);
      var sync = function () {
        var max = inner.scrollWidth - inner.clientWidth;
        wrap.classList.toggle('rk-can-l', inner.scrollLeft > 4);
        wrap.classList.toggle('rk-can-r', inner.scrollLeft < max - 4);
      };
      var go = function (dir) { inner.scrollBy({ left: dir * Math.max(240, inner.clientWidth * 0.8), behavior: 'smooth' }); };
      left.addEventListener('click', function () { go(-1); });
      right.addEventListener('click', function () { go(1); });
      inner.addEventListener('scroll', sync, { passive: true });
      this.fits.push(sync);
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () { requestAnimationFrame(sync); });
        ro.observe(inner);
        this.observers.push(ro);
      }
      return wrap;
    },

    friendChip: function (s, id) {
      var el = RX.el;
      var p = this.friendData.pres[id] || { userPresenceType: 0 };
      var u = this.users[id] || { name: String(id), displayName: String(id) };
      var seen = ((this.store && this.store.lastSeen) || {})[id];
      var t = p.userPresenceType || 0;
      var cls = ['rk-offline', 'rk-online', 'rk-ingame', 'rk-studio'][t] || 'rk-offline';
      var game = s['home.friendsGame'] && p.lastLocation ? p.lastLocation : '';
      var ago = seen && seen.t ? RX.ago(seen.t) : '';
      var status = t === 2 ? (game || 'Jugando') : t === 3 ? 'En Studio' : t === 1 ? 'En línea' : ago ? 'Visto ' + ago : 'Desconectado';
      var tip = t === 2 && game ? 'Jugando a ' + game : t === 0 && ago ? 'Desconectado, visto ' + ago : status;
      var profile = '/users/' + id + '/profile';
      var head = this.img.head[id];
      return el('div', { class: 'rk-friend' }, [
        el('a', { class: 'rk-avatar rc-friend-avatar', href: profile, 'aria-label': 'Perfil de ' + u.displayName }, [
          head ? el('img', { src: head, alt: '' }) : el('span', { class: 'rk-avatar-ph' }, [RX.icon('user')]),
          el('span', { class: 'rk-dot ' + cls })
        ]),
        el('div', { class: 'rk-friend-info' }, [
          el('a', { class: 'rk-friend-name rc-friend-name', href: profile, text: u.displayName || u.name, title: '@' + u.name }),
          el('div', { class: 'rk-friend-status', title: tip }, [el('i', { class: cls }), el('span', { text: status })])
        ]),
        t === 2 && s['home.friendsJoin']
          ? el('button', { class: 'rk-btn rk-btn-accent', text: 'Unirse', title: game ? 'Unirse a ' + game : 'Unirse a su partida', onclick: function () { RX.follow(id, p.rootPlaceId || p.placeId, p.gameId); } })
          : el('a', { class: 'rk-btn rk-btn-ghost rk-btn-mini', href: profile, title: 'Ver perfil', 'aria-label': 'Ver el perfil de ' + (u.displayName || u.name) }, [RX.icon('user')])
      ]);
    },

    pinnedCard: function (s, m, span) {
      var el = RX.el, self = this, pins = m.pins;
      var manage = el('button', { class: 'rk-viewall', title: 'Ordenar fijados y carpetas', onclick: function () { RX.send('openSettings', { tab: 'pins' }).catch(function () {}); } }, ['Gestionar', RX.icon('arrow')]);
      var card = this.card('pinned', '', [this.head('pin', 'Fijados', [manage], pins.length ? [el('span', { class: 'rk-count', text: String(pins.length) })] : null)]);
      if (!pins.length) {
        card.appendChild(this.empty('pin', 'Aún no tienes juegos fijados.', 'Pulsa «Fijar» en la página de un juego para tenerlo siempre a mano.'));
        return card;
      }
      var folders = s['pinned.folders'] ? (this.store.pinFolders || []) : [];
      var known = {};
      folders.forEach(function (f) { known[f.id] = f; });
      var used = folders.filter(function (f) { return pins.some(function (p) { return p.folder === f.id; }); });
      var loose = pins.some(function (p) { return !p.folder || !known[p.folder]; });
      var opts = used.length ? [[null, 'Todos']].concat(used.map(function (f) { return [f.id, f.name]; }), loose ? [['', 'Otros']] : []) : [];
      var cur = this.ui.pinFolder;
      if (!opts.some(function (o) { return o[0] === cur; })) cur = this.ui.pinFolder = null;
      var max = num(s['home.pinnedMax'], 0, 1000, 0);
      var cols = this.cols('pinned', span);
      var body = el('div', { class: 'rk-body' });
      var draw = function () {
        body.textContent = '';
        var list = pins.filter(function (p) { return cur === null ? true : cur === '' ? (!p.folder || !known[p.folder]) : p.folder === cur; });
        if (!list.length) { body.appendChild(self.empty('folder', 'No hay juegos en esta carpeta.')); return; }
        var cut = max && list.length > max && !self.ui.pinsAll;
        var grid = el('div', { class: 'rk-grid rk-grid-pins' });
        grid.style.setProperty('--rk-cols', cols);
        (cut ? list.slice(0, max) : list).forEach(function (p) { grid.appendChild(self.pinTile(p)); });
        if (max && list.length > max) {
          grid.appendChild(el('button', { class: 'rk-ghost', onclick: function () { self.ui.pinsAll = !self.ui.pinsAll; draw(); } },
            cut ? [el('b', { text: '+' + (list.length - max) }), el('span', { text: 'Ver todos' })] : [RX.icon('arrowUp'), el('span', { text: 'Ver menos' })]));
        } else if (cur === null && list.length < cols) {
          grid.appendChild(el('div', { class: 'rk-ghost rk-ghost-hint' }, [RX.icon('pin'), el('span', { text: 'Fija más juegos desde su página' })]));
        }
        body.appendChild(grid);
      };
      if (opts.length) {
        var chips = el('div', { class: 'rk-chips', role: 'tablist' });
        opts.forEach(function (o) {
          var b = el('button', { class: 'rk-chip' + (o[0] === cur ? ' rk-on' : ''), role: 'tab', onclick: function () {
            cur = self.ui.pinFolder = o[0];
            chips.querySelectorAll('.rk-chip').forEach(function (x) { x.classList.toggle('rk-on', x === b); });
            draw();
          } }, [o[0] ? RX.icon('folder') : null, el('span', { text: o[1] })]);
          chips.appendChild(b);
        });
        card.appendChild(chips);
      }
      draw();
      card.appendChild(body);
      return card;
    },

    pinTile: function (p) {
      var uid = Number(p.universeId), g = this.info[uid] || {};
      var game = { placeId: p.placeId, name: g.name || p.name, up: g.up, down: g.down, playing: g.playing };
      return this.tile(game, this.img.wide[uid] || p.icon || this.img.icon[uid]);
    },

    continueCard: function (s, m, span) {
      var el = RX.el, self = this;
      var card = this.card('continue', '', [this.head('gamepad', 'Continuar')]);
      if (!m.cont.length) {
        card.appendChild(m.contFiltered ? this.empty('filter', 'Tus filtros ocultan todos estos juegos.') : this.empty('gamepad', 'Cuando juegues a algo, aparecerá aquí.'));
        return card;
      }
      var cols = this.cols('continue', span);
      var grid = el('div', { class: 'rk-grid rk-grid-cont' });
      grid.style.setProperty('--rk-cols', cols);
      m.cont.forEach(function (id, i) {
        var g = self.info[id], r = self.rating(g), votes = (g.up || 0) + (g.down || 0);
        var t = self.tile(g, self.img.wide[id] || self.img.icon[id], s['home.tileBadge'] && r !== null && r >= 90 && votes > 5000 ? 'Muy valorado' : null);
        if (i >= cols * m.rows) t.classList.add('rk-cut');
        grid.appendChild(t);
      });
      card.appendChild(grid);
      this.fit(grid, m.rows);
      return card;
    },

    recentCard: function (s, m) {
      var el = RX.el, self = this, r = m.recent;
      // home.trackPlaytime lo aplica el fondo (deja de apuntar); aquí solo avisamos de que los datos no avanzan.
      var tracking = s['home.trackPlaytime'] !== false;
      var tip = el('span', { class: 'rk-tip', title: tracking
        ? 'RoCer0 apunta tu tiempo de juego consultando tu estado cada pocos minutos mientras el navegador está abierto.'
        : 'No se está apuntando tu tiempo de juego. Actívalo en Ajustes › Estadísticas › «Tu tiempo en cada juego».' }, [RX.icon('info')]);
      var paused = !tracking && r.hasTime ? el('span', { class: 'rk-count rk-paused', title: 'El registro de tu tiempo de juego está apagado: estos datos no se actualizan.', 'aria-label': 'Registro en pausa' }, [RX.icon('timer'), el('span', { text: 'En pausa' })]) : null;
      var tabs = el('div', { class: 'rk-tabs', role: 'tablist' });
      var body = el('div', { class: 'rk-body' });
      var card = this.card('recent', '', [this.head('history', 'Juegos recientes', r.hasTime ? [paused, tabs] : null, [tip]), body]);
      // El periodo del ajuste manda al cambiarlo; si no, se queda el que elegiste con los botones.
      var setting = ['7', '30', 'all'].indexOf(String(s['home.recentRange'])) >= 0 ? String(s['home.recentRange']) : '30';
      if (this.ui.recentSetting !== setting) { this.ui.recentSetting = setting; this.ui.recentRange = setting; }
      var cur = this.ui.recentRange;
      var row = function (uid, name, placeId, sub, bar) {
        var g = self.info[uid] || {};
        return el('a', { class: 'rk-row', href: '/games/' + (g.placeId || placeId), title: g.name || name }, [
          self.rowImg(uid),
          el('div', { class: 'rk-row-main' }, [el('div', { class: 'rk-row-name', text: g.name || name || 'Juego' }), sub, bar])
        ]);
      };
      var draw = function () {
        body.textContent = '';
        var list;
        if (!r.hasTime) {
          list = self.list(r.fallback.length);
          if (!r.fallback.length) { body.appendChild(self.empty('history', 'Todavía no hay partidas.', tracking ? 'Juega a algo y aquí verás en qué se te va el tiempo.' : 'Enciende «Tu tiempo en cada juego» en Ajustes › Estadísticas para verlo aquí.')); return; }
          body.appendChild(el('div', { class: 'rk-note', text: tracking ? 'Aún no hay tiempo de juego apuntado: estos son tus últimos juegos.' : 'No se está apuntando tu tiempo de juego: estos son tus últimos juegos.' }));
          r.fallback.forEach(function (uid) {
            var g = self.info[uid];
            var sub = r.last[uid] ? el('div', { class: 'rk-row-sub' }, [RX.icon('clock'), ' Jugado ' + RX.ago(r.last[uid])]) : (s['home.tileMeta'] ? self.metaRow(g) : null);
            list.appendChild(row(uid, g.name, g.placeId, sub, null));
          });
          body.appendChild(list);
          return;
        }
        var L = r.lists[cur];
        if (!L.items.length) {
          body.appendChild(L.filtered ? self.empty('filter', 'Tus filtros ocultan estos juegos.') : self.empty('clock', 'No has jugado en los últimos ' + cur + ' días.', 'Prueba con otro periodo.'));
          return;
        }
        list = self.list(L.items.length);
        var top = L.items[0].minutes;
        L.items.forEach(function (t) {
          list.appendChild(row(t.uid, t.name, t.placeId,
            el('div', { class: 'rk-row-sub' }, [RX.icon('clock'), ' ' + self.minutes(t.minutes)]),
            el('div', { class: 'rk-bar' }, [el('i', { style: { width: Math.max(4, Math.round(100 * t.minutes / top)) + '%' } })])));
        });
        body.appendChild(list);
      };
      [['7', '7d', 'Últimos 7 días'], ['30', '30d', 'Últimos 30 días'], ['all', 'Todo', 'Desde que usas RoCer0']].forEach(function (o) {
        var b = el('button', { class: 'rk-tab' + (o[0] === cur ? ' rk-on' : ''), role: 'tab', text: o[1], title: o[2], onclick: function () {
          cur = self.ui.recentRange = o[0];
          tabs.querySelectorAll('.rk-tab').forEach(function (x) { x.classList.toggle('rk-on', x === b); });
          draw();
        } });
        tabs.appendChild(b);
      });
      draw();
      return card;
    },

    // Lista de filas; en tarjetas anchas se reparte en dos columnas (de arriba abajo).
    list: function (n) {
      var list = RX.el('div', { class: 'rk-list rk-list-2' });
      list.style.setProperty('--rk-half', Math.max(1, Math.ceil(n / 2)));
      return list;
    },

    minutes: function (m) {
      m = Math.round(m);
      if (m < 60) return m + ' min';
      return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
    },

    featuredCard: function (s, m) {
      var el = RX.el, id = m.featured;
      if (!id) {
        var c = this.card('featured', '', [this.head('star', 'Recomendación destacada')]);
        c.appendChild(m.featFiltered ? this.empty('filter', 'Tus filtros ocultan la recomendación de hoy.') : this.empty('star', 'Hoy no hay ninguna recomendación destacada.'));
        return c;
      }
      var g = this.info[id], img = this.img.wide[id] || this.img.icon[id];
      return this.card('featured', 'rk-featured', [
        el('div', { class: 'rk-featured-img', style: { backgroundImage: img ? 'url("' + img + '")' : 'none' } }),
        el('div', { class: 'rk-featured-body' }, [
          el('div', { class: 'rk-badge' }, [RX.icon('star'), el('span', { text: 'Recomendación destacada' })]),
          el('div', { class: 'rk-featured-bottom' }, [
            el('a', { class: 'rk-featured-title', href: '/games/' + g.placeId, title: g.name, text: g.name }),
            el('div', { class: 'rk-featured-foot' }, [
              s['home.tileMeta'] ? this.metaRow(g) : el('span'),
              el('button', { class: 'rk-btn rk-btn-play', onclick: function () { RX.join(g.placeId); } }, [RX.icon('play'), 'Jugar'])
            ])
          ])
        ])
      ]);
    },

    recommendedCard: function (s, m) {
      var el = RX.el, self = this;
      var card = this.card('recommended', '', [this.head('trend', 'Recomendados para ti', [this.viewAll('Ver todos', '/charts')])]);
      if (!m.rec.length) {
        card.appendChild(m.recFiltered ? this.empty('filter', 'Tus filtros ocultan todas las recomendaciones.') : this.empty('trend', 'No hay recomendaciones ahora mismo.', 'Vuelve a mirar dentro de un rato.'));
        return card;
      }
      var list = this.list(m.rec.length);
      m.rec.forEach(function (id, i) {
        var g = self.info[id];
        list.appendChild(el('a', { class: 'rk-row', href: '/games/' + g.placeId, title: g.name }, [
          el('span', { class: 'rk-rank', text: String(i + 1) }),
          self.rowImg(id),
          el('div', { class: 'rk-row-main' }, [el('div', { class: 'rk-row-name', text: g.name }), s['home.tileMeta'] ? self.metaRow(g) : null])
        ]));
      });
      card.appendChild(list);
      return card;
    },

    collectionsCard: function (s, m) {
      var el = RX.el, self = this;
      var card = this.card('collections', '', [this.head('layers', 'Colecciones', [this.viewAll('Ver todas', '/charts')])]);
      if (!m.collections.length) {
        card.appendChild(m.collFiltered ? this.empty('filter', 'Tus filtros ocultan todas las colecciones.') : this.empty('layers', 'No hay colecciones ahora mismo.', 'Vuelve a mirar dentro de un rato.'));
        return card;
      }
      var grid = el('div', { class: 'rk-collections' });
      m.collections.forEach(function (c) {
        var img = self.img.big[c.cover] || self.img.icon[c.cover] || self.img.wide[c.cover];
        grid.appendChild(el('button', { class: 'rk-coll', title: c.name, onclick: function () { self.openCollection(c); } }, [
          img ? el('img', { src: img, alt: '', loading: 'lazy' }) : el('span', { class: 'rk-coll-ph' }, [RX.icon('layers')]),
          el('span', { class: 'rk-coll-main' }, [el('span', { class: 'rk-coll-name', text: c.name }), el('span', { class: 'rk-coll-sub', text: plural(c.ids.length, 'juego', 'juegos') })])
        ]));
      });
      card.appendChild(grid);
      return card;
    },

    openCollection: async function (c) {
      var el = RX.el, self = this, s = this.s;
      var box = el('div', { class: 'rk-modal-grid' }, [el('div', { class: 'rx-muted', text: 'Cargando…' })]);
      RX.modal(c.name, box);
      var ids = c.ids.slice(0, 40);
      await this.fillInfo(ids);
      var hidden = this.makeFilter(s);
      ids = ids.filter(function (id) { return self.info[id] && self.info[id].placeId && !hidden(id); }).slice(0, 30);
      await this.ensureImg('icon', ids);
      box.textContent = '';
      if (!ids.length) { box.appendChild(el('div', { class: 'rx-muted', text: 'No hay juegos que mostrar en esta colección.' })); return; }
      ids.forEach(function (id) {
        var g = self.info[id], img = self.img.icon[id];
        box.appendChild(el('a', { class: 'rk-mg-item', href: '/games/' + g.placeId, title: g.name }, [
          img ? el('img', { src: img, alt: '', loading: 'lazy' }) : el('span', { class: 'rk-mg-ph' }, [RX.icon('gamepad')]),
          el('div', { class: 'rk-mg-name', text: g.name }),
          s['home.tileMeta'] ? self.metaRow(g) : null
        ]));
      });
    },

    footer: function (s) {
      var el = RX.el, self = this;
      var link = function (icon, text, tab) {
        return el('button', { class: 'rk-foot-link', onclick: function () { RX.send('openSettings', { tab: tab }).catch(function () {}); } }, [RX.icon(icon), el('span', { text: text })]);
      };
      var items = [];
      if (this.canHide && s['home.hideOriginal']) {
        var toggle = el('button', { class: 'rk-foot-link' });
        var label = function () {
          var shown = !!self.ui.showOriginal;
          toggle.replaceChildren(RX.icon(shown ? 'eyeOff' : 'eye'), el('span', { text: shown ? 'Ocultar el Inicio original de Roblox' : 'Mostrar el Inicio original de Roblox' }));
        };
        toggle.addEventListener('click', function () {
          self.ui.showOriginal = !self.ui.showOriginal;
          self.place();
          label();
          if (self.ui.showOriginal && self.anchor) self.anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        label();
        items.push(toggle);
      }
      items.push(link('sliders', 'Personalizar el Inicio', 'home'), link('palette', 'Cambiar el tema', 'themes'));
      return el('div', { class: 'rk-foot' }, items);
    }
  });
})();
