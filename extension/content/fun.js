// Diversión: ruleta de juegos, confeti cuando pasa algo bueno, la tarjeta de retos diarios
// y el aviso de descanso dentro de la página.
RX.rc = {
  // ---------- Ruleta ----------
  roulette: function (startSource) {
    var s = RX.settings || {};
    if (!s['fun.roulette']) { RX.toast('La ruleta está desactivada en los ajustes de RoCer0'); return; }
    if (document.getElementById('rc-roulette')) return;
    var el = RX.el, self = this;
    var max = Math.max(4, Math.min(24, Math.round(Number(s['fun.rouletteMax']) || 16)));
    var spinMs = { fast: 2500, normal: 4600, slow: 7000 }[s['fun.rouletteSpin']] || 4600;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) spinMs = 900;
    var first = startSource || s['fun.rouletteSource'];
    if (!self.sources[first]) first = 'pins';
    var size = 340;
    var canvas = el('canvas', { class: 'rc-wheel', width: size, height: size });
    var pointer = el('div', { class: 'rc-wheel-pointer' });
    var result = el('div', { class: 'rc-wheel-result', 'aria-live': 'polite' });
    var status = el('div', { class: 'rx-muted', text: 'Elige de dónde salen los juegos.' });
    var spinBtn = RX.ibtn('roulette', 'Girar', { class: 'rx-btn rx-primary rc-spin-btn', disabled: true });
    var sources = [['pins', 'Fijados', 'pin'], ['favs', 'Favoritos', 'heart'], ['recent', 'Recientes', 'history'], ['popular', 'Populares', 'trend']];
    var chips = el('div', { class: 'rc-sources' });
    var games = [], rotation = 0, spinning = false, current = null, autoTimer = null, raf = null, closed = false;
    sources.forEach(function (src) {
      chips.appendChild(el('button', { class: 'rx-btn rx-btn-small', 'data-src': src[0], onclick: function () { load(src[0]); } }, [RX.icon(src[2]), el('span', { text: src[1] })]));
    });
    var body = el('div', { id: 'rc-roulette' }, [chips, el('div', { class: 'rc-wheel-wrap' }, [canvas, pointer]), el('div', { class: 'rx-actions rc-center' }, [spinBtn]), status, result]);
    var m = RX.modal('Ruleta de juegos', body, function () {
      closed = true;
      clearTimeout(autoTimer);
      if (raf) cancelAnimationFrame(raf);
    });
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    var cs = getComputedStyle(document.body || document.documentElement);
    var col = function (v, d) { return (cs.getPropertyValue(v) || '').trim() || d; };
    var accent = col('--rk-accent', '#3b82f6'), accent2 = col('--rk-accent-2', '#8b5cf6'), surface = col('--rk-surface', '#10141f'), text = col('--rk-text', '#eaf0fa');
    var colorAt = function (i, n) {
      var t = n > 1 ? i / (n - 1) : 0;
      var base = typeof rkMix === 'function' ? rkMix(rkHex(accent) || '#3b82f6', rkHex(accent2) || '#8b5cf6', t) : (i % 2 ? accent : accent2);
      return i % 2 && typeof rkMix === 'function' ? rkMix(base, rkHex(surface) || '#10141f', 0.35) : base;
    };

    var draw = function () {
      var n = games.length, c = size / 2, r = c - 6;
      ctx.clearRect(0, 0, size, size);
      if (!n) {
        ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fillStyle = surface; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = accent; ctx.stroke();
        return;
      }
      var seg = Math.PI * 2 / n;
      var font = n > 18 ? 10 : n > 12 ? 11 : 13, cut = n > 18 ? 14 : 17;
      for (var i = 0; i < n; i++) {
        var a0 = -Math.PI / 2 + rotation + i * seg;
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a0 + seg); ctx.closePath();
        ctx.fillStyle = colorAt(i, n); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = surface; ctx.stroke();
        ctx.save();
        ctx.translate(c, c); ctx.rotate(a0 + seg / 2);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillStyle = typeof rkOn === 'function' ? rkOn(rkHex(colorAt(i, n)) || '#000000') : '#fff';
        ctx.font = '700 ' + font + 'px system-ui, sans-serif';
        var name = games[i].name || 'Juego';
        if (name.length > cut) name = name.slice(0, cut - 1) + '…';
        ctx.fillText(name, r - 12, 0);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(c, c, 26, 0, Math.PI * 2); ctx.fillStyle = surface; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = text; ctx.stroke();
    };

    var load = async function (src) {
      if (spinning) return;
      clearTimeout(autoTimer);
      current = src;
      chips.querySelectorAll('button').forEach(function (b) { b.classList.toggle('rx-on', b.dataset.src === src); });
      status.textContent = 'Cargando juegos…';
      result.textContent = '';
      spinBtn.disabled = true;
      var list;
      try { list = await self.sources[src](); }
      catch (e) { list = null; }
      if (closed || current !== src) return;
      if (!list) { games = []; draw(); status.textContent = src === 'favs' ? 'No se pudieron cargar tus favoritos (¿has iniciado sesión?).' : 'No se pudo cargar esta lista. Prueba con otra.'; return; }
      var seen = {};
      list = list.filter(function (g) { if (!g.placeId || !g.name || seen[g.placeId]) return false; seen[g.placeId] = 1; return true; });
      var before = list.length;
      if (RX.settings['fun.rouletteHidden']) list = await self.withoutHidden(list, RX.settings);
      if (closed || current !== src) return;
      var skipped = before - list.length;
      if (list.length > max) list = self.shuffle(list).slice(0, max);
      games = list;
      rotation = 0;
      draw();
      if (games.length < 2) { status.textContent = games.length ? 'Solo hay un juego en esta lista: prueba con otra.' : 'Esta lista está vacía: prueba con otra.'; return; }
      status.textContent = games.length + ' juegos en la ruleta.' + (skipped === 1 ? ' Se ha saltado 1 oculto.' : skipped > 1 ? ' Se han saltado ' + skipped + ' ocultos.' : '');
      spinBtn.disabled = false;
    };

    var spin = function () {
      if (spinning || games.length < 2) return;
      clearTimeout(autoTimer);
      spinning = true;
      spinBtn.disabled = true;
      result.textContent = '';
      var n = games.length, seg = Math.PI * 2 / n, TAU = Math.PI * 2;
      var pickIdx = Math.floor(Math.random() * n);
      var jitter = (Math.random() - 0.5) * seg * 0.6;
      var base = -(pickIdx + 0.5) * seg + jitter;
      var turns = Math.ceil((rotation - base) / TAU) + 2 + Math.round(spinMs / 1000);
      var target = base + turns * TAU;
      var from = rotation, t0 = performance.now();
      var ease = function (x) { return 1 - Math.pow(1 - x, 4); };
      var step = function (now) {
        if (closed) return;
        var x = Math.min(1, (now - t0) / spinMs);
        rotation = from + (target - from) * ease(x);
        draw();
        if (x < 1) { raf = requestAnimationFrame(step); return; }
        rotation = target % TAU;
        spinning = false;
        spinBtn.disabled = false;
        show(games[pickIdx]);
      };
      raf = requestAnimationFrame(step);
    };
    spinBtn.addEventListener('click', spin);

    var play = function (g) {
      clearTimeout(autoTimer);
      RX.challenge('roulette');
      RX.join(g.placeId);
      m.close();
    };

    var show = function (g) {
      var img = el('div', { class: 'rc-pick-ph' }, [RX.icon('gamepad')]);
      var actions = el('div', { class: 'rx-actions' }, [
        RX.ibtn('play', 'Jugar', { class: 'rx-btn rx-play', onclick: function () { play(g); } }),
        el('a', { class: 'rx-btn', href: '/games/' + g.placeId }, [RX.icon('external'), el('span', { text: 'Ver la página' })]),
        RX.ibtn('refresh', 'Otra vez', { onclick: spin })
      ]);
      var main = el('div', { class: 'rc-pick-main' }, [
        el('div', { class: 'rx-muted', text: 'Te toca jugar a…' }),
        el('div', { class: 'rc-pick-name', text: g.name }),
        actions
      ]);
      result.textContent = '';
      result.appendChild(el('div', { class: 'rc-pick' }, [img, main]));
      var setImg = function (src) { if (src) img.replaceWith(el('img', { src: src, alt: '' })); };
      if (g.icon) setImg(g.icon);
      else if (g.universeId) RX.thumbs('games', [g.universeId], '150x150').then(function (t) { setImg(t[g.universeId]); }).catch(function () {});
      var conf = rcConfettiFor(RX.settings, 'roulette');
      if (conf) rcConfetti(conf);
      // Entrar directamente: se ve el resultado un momento y se puede cancelar.
      if (RX.settings['fun.rouletteAutoPlay']) {
        var note = el('div', { class: 'rc-auto-note' }, [RX.icon('play'), el('span', { text: 'Entrando al juego…' }),
          el('button', { class: 'rx-link', text: 'Cancelar', onclick: function () { clearTimeout(autoTimer); note.remove(); } })]);
        main.appendChild(note);
        autoTimer = setTimeout(function () { if (!closed) play(g); }, 1200);
      }
    };

    draw();
    load(first);
  },

  shuffle: function (list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  },

  // Quita los juegos que has ocultado (por juego, por creador o por palabras de "Descubrir").
  withoutHidden: async function (games, s) {
    var b = (await RX.local('blocked', {})) || {};
    var bg = b.games || {}, bc = b.creators || {};
    var list = games.filter(function (g) { return !bg[g.placeId] && !(g.creator && bc[g.creator]) && !rcBlockedName(g.name, s); });
    if (!Object.keys(bc).length) return list;
    // Para los creadores hace falta saber de quién es cada juego: primero lo guardado, luego Roblox.
    var meta = (await RX.local('placeMeta', {})) || {};
    list.forEach(function (g) { if (!g.creator && meta[g.placeId] && meta[g.placeId].c) g.creator = meta[g.placeId].c; });
    var missing = list.filter(function (g) { return !g.creator && g.universeId; }).map(function (g) { return g.universeId; });
    for (var i = 0; i < missing.length; i += 50) {
      try {
        var d = await RX.api('https://games.roblox.com/v1/games?universeIds=' + missing.slice(i, i + 50).join(','));
        (d.data || []).forEach(function (x) {
          var c = x.creator ? x.creator.type + ':' + x.creator.id : null;
          list.forEach(function (g) { if (String(g.universeId) === String(x.id)) g.creator = c; });
        });
      } catch (e) { /* sin datos: no se filtra por creador */ }
    }
    return list.filter(function (g) { return !(g.creator && bc[g.creator]); });
  },

  sources: {
    pins: async function () {
      return (await RX.local('pinned', [])).map(function (p) { return { placeId: p.placeId, universeId: p.universeId, name: p.name, icon: p.icon }; });
    },
    favs: async function () {
      var me = await RX.me();
      if (!me) throw new Error('sin sesión');
      var d = await RX.api('https://games.roblox.com/v2/users/' + me.id + '/favorite/games?accessFilter=2&limit=50');
      return (d.data || []).map(function (g) {
        return { placeId: g.rootPlace && g.rootPlace.id, universeId: g.id, name: g.name, creator: g.creator && g.creator.id ? g.creator.type + ':' + g.creator.id : undefined };
      });
    },
    recent: async function () {
      var list = (await RX.local('myRecent', [])).map(function (r) { return { placeId: r.placeId, universeId: r.universeId, name: r.name }; });
      if (list.length >= 2) return list;
      var pins = await RX.local('pinned', []);
      return list.concat(pins.map(function (p) { return { placeId: p.placeId, universeId: p.universeId, name: p.name, icon: p.icon }; }));
    },
    popular: async function () {
      var d = await RX.api('https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=' + crypto.randomUUID() + '&device=computer&country=all');
      var sort = (d.sorts || []).find(function (x) { return x.games && x.games.length >= 4 && !/sponsor|patrocin/i.test(x.sortDisplayName || x.topic || ''); });
      return sort ? sort.games.slice(0, 30).map(function (g) { return { placeId: g.rootPlaceId, universeId: g.universeId, name: g.name }; }) : [];
    }
  },

  // ---------- Retos diarios (tarjeta del Inicio) ----------
  // Devuelve la tarjeta (home.js la coloca) o null con los retos apagados. Se repinta sola cuando cambian los retos.
  challengesCard: function () {
    if (!(RX.settings || {})['fun.challenges']) return null;
    var el = RX.el;
    var streak = el('span', { class: 'rc-streak' });
    var reroll = el('button', { class: 'rx-btn rx-btn-small rx-icon-only rc-ch-reroll', title: 'Cambiar los retos que te quedan (una vez al día)', hidden: true }, [RX.icon('dice')]);
    var list = el('div', { class: 'rc-ch-list' }, [el('div', { class: 'rk-empty', text: 'Cargando retos…' })]);
    var medals = el('div', { class: 'rc-medals' });
    var card = el('section', { class: 'rk-card rc-ch-card' }, [
      el('div', { class: 'rk-head' }, [el('h2', {}, [RX.icon('target'), el('span', { class: 'rk-h-text', text: 'Retos de hoy' })]), el('div', { class: 'rc-ch-tools' }, [reroll, streak])]),
      list, medals
    ]);
    var paint = function (st) {
      list.textContent = '';
      if (!st || !Array.isArray(st.list) || !st.list.length) {
        list.appendChild(el('div', { class: 'rk-empty', text: st ? 'Hoy no hay retos.' : 'Inicia sesión para ver tus retos.' }));
        reroll.hidden = true;
        return;
      }
      var diff = (RX.settings || {})['challenges.difficulty'];
      st.list.slice(0, 5).forEach(function (c) {
        var def = rcChallengeDef(c.id) || {};
        var goal = Number(c.goal) || rcChallengeGoal(c.id, diff) || 1;
        var prog = Math.max(0, Math.min(goal, Math.floor(Number(c.progress) || 0)));
        var pct = c.done ? 100 : Math.round(100 * prog / goal);
        list.appendChild(el('div', { class: 'rc-ch' + (c.done ? ' rc-done' : '') }, [
          RX.icon(c.done ? 'checkCircle' : 'target'),
          el('div', { class: 'rc-ch-main' }, [
            el('div', { class: 'rc-ch-text', text: rcChallengeText(c.id, goal) }),
            el('div', { class: 'rk-bar' }, [el('i', { style: { width: Math.max(3, pct) + '%' } })])
          ]),
          el('span', { class: 'rc-ch-num', text: c.done ? 'Hecho' : prog + ' / ' + goal + (def.unit === 'min' ? ' min' : '') })
        ]));
      });
      var days = st.streak || 0;
      streak.textContent = '';
      streak.appendChild(RX.icon('flame'));
      streak.appendChild(document.createTextNode(' ' + days + (days === 1 ? ' día' : ' días')));
      streak.title = 'Días seguidos con todos los retos' + (st.best ? ' (tu mejor racha: ' + st.best + ')' : '');
      reroll.hidden = st.list.every(function (c) { return c.done; }) || st.rerolled === st.day || st.rerolled === true;
      reroll.disabled = false;
      medals.textContent = '';
      RC_MEDALS.forEach(function (md) {
        var got = st.medals && st.medals[md.id];
        medals.appendChild(el('span', { class: 'rc-medal' + (got ? ' rc-got' : ''), title: md.name + ': ' + md.text + (got ? ' (conseguida el ' + got + ')' : ' (todavía no)') }, [RX.icon(md.icon, { color: got ? md.color : null })]));
      });
    };
    reroll.addEventListener('click', function () {
      reroll.disabled = true;
      RX.send('challenges:reroll').then(function (st) {
        if (st && Array.isArray(st.list)) paint(st);
        RX.toast('Retos cambiados');
      }).catch(function (e) {
        // El fondo explica por qué no se puede (ya cambiados hoy, no hay otros...).
        var msg = e && e.message ? String(e.message) : '';
        reroll.disabled = false;
        RX.toast(/^(Ya has|No hay|Los retos)/.test(msg) ? msg : 'No se pudieron cambiar los retos ahora');
      });
    });
    RX.send('challenges:get').then(paint).catch(function () { paint(null); });
    // Se repinta con cada cambio mientras la tarjeta está en la página; al quitarla, deja de escuchar.
    var wasIn = false;
    var onChange = function (ch, area) {
      if (area !== 'local' || !ch.challenges) return;
      if (card.isConnected) { wasIn = true; paint(ch.challenges.newValue); }
      else if (wasIn) RX.B.storage.onChanged.removeListener(onChange);
    };
    RX.B.storage.onChanged.addListener(onChange);
    return card;
  }
};

RX.features.push({
  id: 'fun',
  run: function (s) {
    if (!RX.isTop) return;
    // #rc-ruleta (popup o enlaces): abre la ruleta, también si solo cambia el ancla de la página.
    var byHash = function () {
      if (location.hash !== '#rc-ruleta') return;
      history.replaceState(null, '', location.pathname + location.search);
      setTimeout(function () { RX.rc.roulette(); }, 300);
    };
    window.addEventListener('hashchange', byHash);
    byHash();
    // Confeti y aviso cuando el fondo cuenta algo bueno (insignia, retos, medalla, buen trade).
    // Solo lo enseña la pestaña que tienes delante, y una sola vez.
    var check = async function (fresh) {
      if (document.visibilityState !== 'visible') return;
      var c = fresh || await RX.local('celebrate', null);
      if (!c || !c.t || Date.now() - c.t > 10 * 60000) return;
      var shown = await RX.local('celebrateShown', 0);
      if (shown >= c.t) return;
      await RX.setLocal({ celebrateShown: c.t });
      var opts = rcConfettiFor(RX.settings, c.kind || null);
      if (opts) rcConfetti(opts);
      if (c.text) RX.toast(String(c.text), 5000);
    };
    RX.B.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.celebrate && ch.celebrate.newValue) check(ch.celebrate.newValue); });
    document.addEventListener('visibilitychange', function () { check(); });
    check();
  }
});

// Aviso de descanso o de límite diario dentro de la página. Lo escribe el fondo en "wellbeingAlert"
// ({ t, kind: 'break' | 'limit', title, text }); al cerrarlo se guarda "wellbeingAlertSeen" = t.
RX.features.push({
  id: 'wellbeingBanner',
  maxAge: 15 * 60000,
  run: function (s) {
    var self = this;
    this.s = s;
    if (!RX.isTop) return;
    RX.B.storage.onChanged.addListener(function (ch, area) {
      if (area === 'local' && (ch.wellbeingAlert || ch.wellbeingAlertSeen)) self.check();
    });
    this.check();
  },
  update: function (s) { this.s = s; if (RX.isTop) this.check(); },
  check: async function () {
    var r = await RX.B.storage.local.get(['wellbeingAlert', 'wellbeingAlertSeen']);
    var a = r.wellbeingAlert, seen = Number(r.wellbeingAlertSeen) || 0;
    var t = a && Number(a.t);
    if (!this.s['wellbeing.inPage'] || !t || t <= seen || Date.now() - t >= this.maxAge) { this.hide(); return; }
    this.show(a, t);
  },
  show: function (a, t) {
    var el = RX.el, self = this;
    var old = document.getElementById('rc-wellbeing');
    if (old && old.getAttribute('data-t') === String(t)) return;
    if (old) old.remove();
    var limit = a.kind === 'limit';
    var title = String(a.title || (limit ? 'Límite diario' : 'Hora de un descanso')).slice(0, 120);
    var text = String(a.text || '').slice(0, 400);
    var box = el('div', { id: 'rc-wellbeing', class: limit ? 'rc-wb-limit' : 'rc-wb-break', role: 'alert', 'data-t': String(t) }, [
      el('span', { class: 'rc-wb-icon' }, [RX.icon(limit ? 'timer' : 'coffee')]),
      el('div', { class: 'rc-wb-main' }, [el('div', { class: 'rc-wb-title', text: title }), text ? el('div', { class: 'rc-wb-text', text: text }) : null]),
      el('button', { class: 'rx-btn rx-btn-small rx-icon-only rc-wb-close', title: 'Cerrar', 'aria-label': 'Cerrar', onclick: function () {
        box.remove();
        RX.setLocal({ wellbeingAlertSeen: t });
      } }, [RX.icon('x')])
    ]);
    document.body.appendChild(box);
    // Pasados 15 minutos ya no tiene sentido: se quita sin darlo por visto.
    clearTimeout(this.timer);
    this.timer = setTimeout(function () { self.check(); }, Math.max(1000, t + this.maxAge - Date.now() + 500));
  },
  hide: function () {
    clearTimeout(this.timer);
    var old = document.getElementById('rc-wellbeing');
    if (old) old.remove();
  }
});
