// Pantallas de RoCer0 que no son solo opciones: Fijados, Notas y ocultos, Lista de deseos, Retos y Wrapped.
(function () {
  const RBX = 'https://www.roblox.com';
  const empty = (icon, text) => h('div', { class: 'empty' }, [ic(icon), h('span', { text })]);
  const ago = t => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 90) return 'hace un momento';
    if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
    const d = Math.round(s / 86400);
    return d === 1 ? 'ayer' : 'hace ' + d + ' días';
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  async function gameIcons(universeIds) {
    const ids = universeIds.filter(Boolean);
    if (!ids.length) return {};
    try {
      const r = await send('api', { url: 'https://thumbnails.roblox.com/v1/games/icons?universeIds=' + ids.slice(0, 100).join(',') + '&size=150x150&format=Png&isCircular=false' });
      const out = {};
      ((r.data && r.data.data) || []).forEach(x => { if (x.imageUrl) out[x.targetId] = x.imageUrl; });
      return out;
    } catch (e) { return {}; }
  }

  // ======================= Fijados =======================
  async function pinsData() { const r = await B.storage.local.get(['pinned', 'pinFolders']); return { pins: r.pinned || [], folders: r.pinFolders || [] }; }
  async function setPins(pins, folders) {
    const set = {};
    if (pins) set.pinned = pins;
    if (folders) set.pinFolders = folders;
    await B.storage.local.set(set);
    loadPins();
  }
  function move(list, i, d) { const j = i + d; if (j < 0 || j >= list.length) return; const x = list[i]; list[i] = list[j]; list[j] = x; }

  async function loadPins() {
    const { pins, folders } = await pinsData();
    const fl = $('#folder-list');
    fl.textContent = '';
    if (!folders.length) fl.append(empty('folder', 'Sin carpetas todavía. Crea una y elige en cada juego en qué carpeta va.'));
    folders.forEach((f, i) => {
      const n = pins.filter(p => p.folder === f.id).length;
      fl.append(h('div', { class: 'item' }, [
        h('span', { class: 'item-ic' }, [ic('folder')]),
        h('div', { class: 'grow' }, [h('b', { text: f.name }), h('div', { class: 'muted', text: n + (n === 1 ? ' juego' : ' juegos') })]),
        ibtn('arrowUp', '', { class: 'btn btn-icon btn-ghost', title: 'Subir', disabled: i === 0, onclick: async () => { const d = await pinsData(); move(d.folders, i, -1); setPins(null, d.folders); } }),
        ibtn('arrowDown', '', { class: 'btn btn-icon btn-ghost', title: 'Bajar', disabled: i === folders.length - 1, onclick: async () => { const d = await pinsData(); move(d.folders, i, 1); setPins(null, d.folders); } }),
        ibtn('edit', 'Renombrar', { onclick: async () => {
          const name = await uiPrompt('Nuevo nombre de la carpeta', f.name, { okText: 'Renombrar', icon: 'folder', max: 30 });
          if (!name) return;
          const d = await pinsData();
          const x = d.folders.find(y => y.id === f.id);
          if (x) x.name = name.slice(0, 30);
          setPins(null, d.folders);
        } }),
        ibtn('trash', '', { class: 'btn btn-icon btn-ghost', title: 'Borrar carpeta', onclick: async () => {
          if (!await uiConfirm('¿Borrar la carpeta "' + f.name + '"?', 'Sus juegos siguen fijados, solo se quedan sin carpeta.', { okText: 'Borrar', danger: true })) return;
          const d = await pinsData();
          d.pins.forEach(p => { if (p.folder === f.id) delete p.folder; });
          setPins(d.pins, d.folders.filter(y => y.id !== f.id));
        } })
      ]));
    });

    const pl = $('#pin-list');
    pl.textContent = '';
    if (!pins.length) { pl.append(empty('pin', 'No tienes juegos fijados. Entra en la página de un juego y pulsa "Fijar".')); return; }
    const sort = settings['pinned.sort'];
    if (sort && sort !== 'manual') pl.append(h('p', { class: 'muted small', text: 'Ahora se muestran ' + (sort === 'name' ? 'por nombre' : 'por los jugados hace menos') + '. Este orden es el que se usa con «El tuyo».' }));
    const useFolders = !!settings['pinned.folders'];
    pins.forEach((p, i) => {
      const sel = h('select', { title: 'Carpeta' }, [h('option', { value: '', text: 'Sin carpeta' })].concat(folders.map(f => h('option', { value: f.id, text: f.name }))));
      sel.value = p.folder && folders.some(f => f.id === p.folder) ? p.folder : '';
      sel.addEventListener('change', async () => {
        const d = await pinsData();
        const x = d.pins.find(y => String(y.placeId) === String(p.placeId));
        if (x) { if (sel.value) x.folder = sel.value; else delete x.folder; }
        setPins(d.pins);
      });
      pl.append(h('div', { class: 'item' }, [
        h('img', { class: 'thumb', src: p.icon || '', alt: '', 'data-u': p.universeId || '' }),
        h('div', { class: 'grow' }, [h('a', { href: RBX + '/games/' + p.placeId, target: '_blank', text: p.name || 'Juego ' + p.placeId }), h('div', { class: 'muted small', text: 'ID ' + p.placeId })]),
        useFolders && folders.length ? sel : null,
        ibtn('arrowUp', '', { class: 'btn btn-icon btn-ghost', title: 'Subir', disabled: i === 0, onclick: async () => { const d = await pinsData(); move(d.pins, i, -1); setPins(d.pins); } }),
        ibtn('arrowDown', '', { class: 'btn btn-icon btn-ghost', title: 'Bajar', disabled: i === pins.length - 1, onclick: async () => { const d = await pinsData(); move(d.pins, i, 1); setPins(d.pins); } }),
        ibtn('trash', '', { class: 'btn btn-icon btn-ghost', title: 'Quitar de fijados', onclick: async () => {
          const d = await pinsData();
          setPins(d.pins.filter(y => String(y.placeId) !== String(p.placeId)));
          toast('"' + (p.name || p.placeId) + '" ya no está fijado.');
        } })
      ]));
    });
    const icons = await gameIcons(pins.map(p => p.universeId));
    pl.querySelectorAll('img[data-u]').forEach(img => { if (icons[img.dataset.u]) img.src = icons[img.dataset.u]; });
  }
  TAB_LOADERS.pins = loadPins;

  async function addFolder() {
    const name = $('#folder-name').value.trim().slice(0, 30);
    if (!name) { $('#folder-name').focus(); return; }
    const d = await pinsData();
    d.folders.push({ id: 'f' + Date.now().toString(36), name });
    $('#folder-name').value = '';
    setPins(null, d.folders);
    toast('Carpeta creada. Elige en cada juego si va en ella.');
  }
  $('#folder-add').addEventListener('click', addFolder);
  $('#folder-name').addEventListener('keydown', e => { if (e.key === 'Enter') addFolder(); });

  // ======================= Notas y ocultos =======================
  let noteTag = '';
  function noteLink(key, n) {
    if (key.startsWith('g:')) return RBX + '/games/' + (n.placeId || key.slice(2));
    if (key.startsWith('u:')) return RBX + '/users/' + (n.userId || key.slice(2)) + '/profile';
    return null;
  }
  function creatorLink(key) {
    const m = /^(User|Group):(\d+)$/.exec(key);
    if (!m) return null;
    return m[1] === 'User' ? RBX + '/users/' + m[2] + '/profile' : RBX + '/communities/' + m[2];
  }

  async function loadNotes() {
    const { notes = {}, blocked = {} } = await B.storage.local.get(['notes', 'blocked']);
    const q = $('#note-filter').value.toLowerCase().trim();
    const tags = {};
    Object.values(notes).forEach(n => (n.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
    if (noteTag && !tags[noteTag]) noteTag = '';
    const chips = $('#note-tags');
    chips.textContent = '';
    if (Object.keys(tags).length) {
      chips.append(h('button', { class: 'chip' + (!noteTag ? ' on' : ''), text: 'Todas', onclick: () => { noteTag = ''; loadNotes(); } }));
      Object.keys(tags).sort((a, b) => tags[b] - tags[a]).forEach(t => chips.append(h('button', { class: 'chip' + (noteTag === t ? ' on' : ''), onclick: () => { noteTag = t; loadNotes(); } }, [ic('tag'), ' ' + t + ' (' + tags[t] + ')'])));
    }
    const list = $('#note-list');
    list.textContent = '';
    const rows = Object.entries(notes)
      .filter(([, n]) => !noteTag || (n.tags || []).includes(noteTag))
      .filter(([, n]) => !q || ((n.name || '') + ' ' + (n.text || '') + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q))
      .sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
    if (!Object.keys(notes).length) list.append(empty('note', 'Sin notas todavía. En la página de un juego o de un perfil pulsa "Nota".'));
    else if (!rows.length) list.append(empty('search', 'Ninguna nota coincide.'));
    rows.forEach(([key, n]) => list.append(noteRow(key, n)));

    const games = Object.entries(blocked.games || {}).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
    const hg = $('#hidden-games');
    hg.textContent = '';
    if (!games.length) hg.append(empty('eye', 'No has ocultado ningún juego.'));
    games.forEach(([id, g]) => hg.append(h('div', { class: 'item' }, [
      h('span', { class: 'item-ic' }, [ic('gamepad')]),
      h('div', { class: 'grow' }, [h('a', { href: RBX + '/games/' + id, target: '_blank', text: g.name || 'Juego ' + id }), h('div', { class: 'muted', text: 'Oculto ' + (g.t ? ago(g.t) : '') })]),
      ibtn('eye', 'Mostrar otra vez', { onclick: () => unblock('games', id) })
    ])));
    const creators = Object.entries(blocked.creators || {}).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
    const hc = $('#hidden-creators');
    hc.textContent = '';
    if (!creators.length) hc.append(empty('eye', 'No has ocultado a ningún creador.'));
    creators.forEach(([key, c]) => {
      const link = creatorLink(key);
      hc.append(h('div', { class: 'item' }, [
        h('span', { class: 'item-ic' }, [ic(key.startsWith('Group:') ? 'flag' : 'user')]),
        h('div', { class: 'grow' }, [link ? h('a', { href: link, target: '_blank', text: c.name || key }) : h('b', { text: c.name || key }),
          h('div', { class: 'muted', text: (key.startsWith('Group:') ? 'Comunidad' : 'Usuario') + ' · oculto ' + (c.t ? ago(c.t) : '') })]),
        ibtn('eye', 'Mostrar otra vez', { onclick: () => unblock('creators', key) })
      ]));
    });
  }
  TAB_LOADERS.notes = loadNotes;
  $('#note-filter').addEventListener('input', () => loadNotes());

  async function unblock(kind, key) {
    const b = (await B.storage.local.get('blocked')).blocked || {};
    b.games = b.games || {}; b.creators = b.creators || {};
    delete b[kind][key];
    await B.storage.local.set({ blocked: b });
    toast('Vuelve a verse en las listas de Roblox.');
    loadNotes();
  }

  function noteRow(key, n) {
    const link = noteLink(key, n);
    const row = h('div', { class: 'item note' });
    const view = () => {
      row.textContent = '';
      row.append(
        h('span', { class: 'item-ic' }, [ic(key.startsWith('u:') ? 'user' : 'gamepad')]),
        h('div', { class: 'grow' }, [
          h('div', {}, [link ? h('a', { href: link, target: '_blank', text: n.name || key }) : h('b', { text: n.name || key }), h('span', { class: 'muted', text: ' · ' + (n.t ? new Date(n.t).toLocaleDateString('es-ES') : '') })]),
          n.text ? h('div', { class: 'note-text', text: n.text }) : null,
          (n.tags || []).length ? h('div', { class: 'tags' }, n.tags.map(t => h('span', { class: 'tag' }, [ic('tag'), ' ' + t]))) : null
        ]),
        ibtn('edit', '', { class: 'btn btn-icon btn-ghost', title: 'Editar', onclick: edit }),
        ibtn('trash', '', { class: 'btn btn-icon btn-ghost', title: 'Borrar la nota', onclick: async () => {
          if (!await uiConfirm('¿Borrar la nota de "' + (n.name || key) + '"?', '', { okText: 'Borrar', danger: true })) return;
          const all = (await B.storage.local.get('notes')).notes || {};
          delete all[key];
          await B.storage.local.set({ notes: all });
          loadNotes();
        } })
      );
    };
    const edit = () => {
      row.textContent = '';
      const text = h('textarea', { rows: 3, maxlength: 2000 });
      text.value = n.text || '';
      const tags = h('input', { type: 'text', placeholder: 'Etiquetas separadas por comas' });
      tags.value = (n.tags || []).join(', ');
      row.append(h('div', { class: 'grow note-edit' }, [h('b', { text: n.name || key }), text, tags, h('div', { class: 'row-inline' }, [
        ibtn('save', 'Guardar', { class: 'btn btn-accent', onclick: async () => {
          const all = (await B.storage.local.get('notes')).notes || {};
          const list = tags.value.split(',').map(t => t.trim()).filter(Boolean).slice(0, 12);
          if (!text.value.trim() && !list.length) delete all[key];
          else all[key] = Object.assign({}, all[key] || n, { text: text.value.trim().slice(0, 2000), tags: list, t: Date.now() });
          await B.storage.local.set({ notes: all });
          loadNotes();
        } }),
        h('button', { class: 'btn', text: 'Cancelar', onclick: view })
      ])]));
      text.focus();
    };
    view();
    return row;
  }

  // ======================= Lista de deseos =======================
  async function money(robux) {
    if (!settings['money.enabled'] || robux === null || robux === undefined) return '';
    try { return moneyText(robux, await send('moneyRate')); } catch (e) { return ''; }
  }

  async function loadWishlist() {
    const { wishlist = [] } = await B.storage.local.get('wishlist');
    const box = $('#wish-list');
    box.textContent = '';
    if (!wishlist.length) { box.append(empty('bookmark', 'Tu lista está vacía. En la página de cualquier objeto del catálogo pulsa "Seguir precio".')); return; }
    for (const it of wishlist) {
      const url = RBX + (it.type === 'Bundle' ? '/bundles/' : '/catalog/') + it.id;
      const target = h('input', { type: 'number', min: 0, step: 1, value: it.target || '', placeholder: 'Cualquier bajada', title: 'Avisarme cuando cueste esto o menos. Vacío: te avisa de cualquier bajada de precio.' });
      target.addEventListener('change', async () => {
        try { await send('wishlist:update', { id: it.id, itemType: it.type, target: Math.max(0, Math.round(Number(target.value) || 0)) }); toast(Number(target.value) > 0 ? 'Te aviso cuando llegue a ' + NF.format(Number(target.value)) + ' R$.' : 'Sin precio objetivo.'); }
        catch (e) { toast(e.message); }
      });
      const priceLine = h('div', { class: 'wish-price' }, [
        it.onSale && it.price !== null ? h('b', {}, [ic('robux'), ' ' + NF.format(it.price)]) : h('b', { class: 'muted', text: 'No está a la venta' }),
        it.lowest !== undefined && it.lowest !== null && it.onSale ? h('span', { class: 'muted', text: ' · mínimo visto ' + NF.format(it.lowest) }) : null,
        it.targetHit ? h('span', { class: 'pill ok', text: 'A tu precio' }) : null
      ]);
      const row = h('div', { class: 'item' }, [
        h('img', { class: 'thumb', src: it.img || '', alt: '' }),
        h('div', { class: 'grow' }, [h('a', { href: url, target: '_blank', text: it.name }), priceLine,
          h('div', { class: 'muted small', text: (it.type === 'Bundle' ? 'Paquete' : 'Objeto') + ' · comprobado ' + (it.lastCheck ? ago(it.lastCheck) : 'nunca') })]),
        h('label', { class: 'field small wish-target' }, [h('span', { text: 'Avisar a' }), target]),
        ibtn('trash', '', { class: 'btn btn-icon btn-ghost', title: 'Dejar de seguir', onclick: async () => {
          try { await send('wishlist:remove', { id: it.id, itemType: it.type }); } catch (e) { toast(e.message); }
          loadWishlist();
        } })
      ]);
      box.append(row);
      if (it.onSale && it.price) money(it.price).then(m => { if (m) priceLine.append(h('span', { class: 'muted', text: ' · ' + m })); });
    }
  }
  TAB_LOADERS.wishlist = loadWishlist;
  $('#wish-check').addEventListener('click', async e => {
    const b = e.currentTarget;
    b.disabled = true;
    try { await send('wishlist:check'); toast('Precios comprobados.'); } catch (err) { toast(err.message); }
    b.disabled = false;
    loadWishlist();
  });

  // ======================= Retos =======================
  const goalOf = (st, d) => Number((st.counts || {})[d]) || 3;
  const progressText = c => {
    const def = rcChallengeDef(c.id);
    if (c.done) return 'Hecho';
    const p = Math.floor(Number(c.progress) || 0);
    return def && def.unit === 'min' ? p + ' / ' + c.goal + ' min' : p + ' / ' + c.goal;
  };

  async function loadChallenges() {
    let st = null;
    try { st = await send('challenges:get'); } catch (e) { /* sin datos */ }
    const live = !!st;
    if (!st) st = (await B.storage.local.get('challenges')).challenges || null;
    const today = $('#ch-today');
    today.textContent = '';
    if (live && st && st.list && st.list.length) {
      st.list.forEach(c => {
        const pct = Math.min(100, Math.round(100 * (Number(c.progress) || 0) / (c.goal || 1)));
        today.append(h('div', { class: 'item ch' + (c.done ? ' done' : '') }, [
          h('span', { class: 'item-ic' }, [ic(c.done ? 'checkCircle' : 'target')]),
          h('div', { class: 'grow' }, [h('div', { text: rcChallengeText(c.id, c.goal) }), h('div', { class: 'meter' }, [h('i', { style: 'width:' + pct + '%' })])]),
          h('span', { class: 'ch-num', text: progressText(c) })
        ]));
      });
    } else {
      today.append(empty('target', settings['fun.challenges'] ? 'Todavía no hay retos hoy. Abre Roblox con la sesión iniciada.' : 'Los retos diarios están apagados.'));
    }
    const s = st || { streak: 0, best: 0, total: 0, medals: {}, history: {}, counts: {} };
    const hist = s.history || {};
    const pill = $('#ch-streak');
    pill.textContent = '';
    pill.append(ic('flame'), ' ' + (s.streak || 0) + ((s.streak || 0) === 1 ? ' día' : ' días'));
    const perfect = Object.keys(hist).filter(d => hist[d] >= goalOf(s, d)).length;
    const stats = $('#ch-stats');
    stats.textContent = '';
    [['flame', s.streak || 0, 'Racha actual'], ['trophy', s.best || 0, 'Mejor racha'], ['checkCircle', s.total || 0, 'Retos completados'], ['star', perfect, 'Días perfectos']]
      .forEach(([icon, n, label]) => stats.append(h('div', { class: 'stat' }, [ic(icon), h('b', { text: NF.format(n) }), h('span', { text: label })])));

    const md = $('#ch-medals');
    md.textContent = '';
    RC_MEDALS.forEach(m => {
      const got = s.medals && s.medals[m.id];
      const prog = m.streak ? Math.min(1, (s.best || 0) / m.streak) : Math.min(1, (s.total || 0) / m.total);
      const icn = ic(m.icon);
      icn.style.color = m.color;
      md.append(h('div', { class: 'medal' + (got ? ' got' : '') }, [
        h('span', { class: 'medal-ic' }, [icn]),
        h('div', { class: 'grow' }, [h('b', { text: m.name }), h('div', { class: 'muted small', text: m.text }),
          got ? h('div', { class: 'medal-date' }, [ic('checkCircle'), h('span', { text: 'Conseguida el ' + new Date(got + 'T12:00:00').toLocaleDateString('es-ES') })]) : h('div', { class: 'meter' }, [h('i', { style: 'width:' + Math.round(prog * 100) + '%' })])])
      ]));
    });

    // Calendario: 12 semanas, de lunes a domingo.
    const cal = $('#ch-calendar');
    cal.textContent = '';
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 83 - ((end.getDay() + 6) % 7));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d);
      const v = Number(hist[k]) || 0, of = goalOf(s, k);
      const lv = !v ? 0 : v >= of ? 3 : v / of >= 0.5 ? 2 : 1;
      cal.append(h('i', { class: 'lv' + lv, title: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + (v ? v + ' de ' + of : 'ninguno') }));
    }
  }
  TAB_LOADERS.challenges = loadChallenges;

  // ======================= Wrapped =======================
  const MONTH = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  const monthName = mk => cap(MONTH.format(new Date(mk + '-15T12:00:00')));
  let wrData = null, wrStats = null;

  function wrapStats(mk, d) {
    const inMonth = k => k.slice(0, 7) === mk;
    const playLog = d.playLog || {}, myGames = d.myGames || {};
    const dayMin = {};
    Object.keys(playLog).filter(inMonth).forEach(k => { dayMin[k] = (dayMin[k] || 0) + (Number(playLog[k]) || 0); });
    const games = {};
    Object.keys(myGames).filter(inMonth).forEach(k => {
      let sum = 0;
      Object.entries(myGames[k]).forEach(([u, g]) => {
        const a = games[u] = games[u] || { universeId: u, name: g.name, placeId: g.placeId, minutes: 0 };
        a.minutes += Number(g.minutes) || 0;
        if (g.name) a.name = g.name;
        sum += Number(g.minutes) || 0;
      });
      if (!(k in dayMin)) dayMin[k] = sum;
    });
    const top = Object.values(games).sort((a, b) => b.minutes - a.minutes);
    const minutes = Object.values(dayMin).reduce((a, b) => a + b, 0);
    const days = Object.keys(dayMin).filter(k => dayMin[k] >= 1);
    let bestDay = null;
    days.forEach(k => { if (!bestDay || dayMin[k] > dayMin[bestDay]) bestDay = k; });
    const dow = [0, 0, 0, 0, 0, 0, 0];
    days.forEach(k => { dow[new Date(k + 'T12:00:00').getDay()] += dayMin[k]; });
    const favDow = minutes ? dow.indexOf(Math.max(...dow)) : -1;
    const newGames = Object.values(d.playedEver || {}).filter(t => typeof t === 'number' && t > 1e12 && dayKey(new Date(t)).slice(0, 7) === mk).length;
    const together = Object.entries((d.together || {})[mk] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, m]) => ({ id, minutes: m, name: (d.nameCache && d.nameCache[id] && (d.nameCache[id].displayName || d.nameCache[id].name)) || 'Amigo ' + id }));
    const ch = d.challenges || {};
    const hist = ch.history || {};
    const chDone = Object.keys(hist).filter(inMonth).reduce((a, k) => a + (Number(hist[k]) || 0), 0);
    const chPerfect = Object.keys(hist).filter(inMonth).filter(k => hist[k] >= (Number((ch.counts || {})[k]) || 3)).length;
    const site = Object.keys(d.timeLog || {}).filter(inMonth).reduce((a, k) => a + (Number(d.timeLog[k]) || 0), 0);
    let robux = null;
    const me = d.me && d.me.id;
    const rl = ((d.robuxHistory || {})[me] || []).filter(p => dayKey(new Date(p.t)).slice(0, 7) === mk);
    if (rl.length) robux = { start: rl[0].r, end: rl[rl.length - 1].r, delta: rl[rl.length - 1].r - rl[0].r };
    return { mk, minutes, days: days.length, bestDay, bestDayMin: bestDay ? dayMin[bestDay] : 0, favDow, top, distinct: top.length, newGames, together,
      badges: Number((d.badgesLog || {})[mk]) || 0, chDone, chPerfect, site, robux };
  }

  async function loadWrapped() {
    wrData = await B.storage.local.get(['myGames', 'playLog', 'together', 'challenges', 'badgesLog', 'robuxHistory', 'me', 'nameCache', 'timeLog', 'playedEver']);
    const months = new Set([dayKey(new Date()).slice(0, 7)]);
    ['myGames', 'playLog', 'timeLog'].forEach(k => Object.keys(wrData[k] || {}).forEach(d => months.add(d.slice(0, 7))));
    ['together', 'badgesLog'].forEach(k => Object.keys(wrData[k] || {}).forEach(m => months.add(m)));
    Object.keys((wrData.challenges && wrData.challenges.history) || {}).forEach(d => months.add(d.slice(0, 7)));
    const sel = $('#wr-month');
    const prev = sel.value;
    sel.textContent = '';
    Array.from(months).filter(m => /^\d{4}-\d{2}$/.test(m)).sort().reverse().forEach(m => sel.append(h('option', { value: m, text: monthName(m) })));
    if (prev && Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;
    drawWrapped();
  }
  TAB_LOADERS.wrapped = loadWrapped;
  $('#wr-month').addEventListener('change', drawWrapped);

  const DOW = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
  const plural = (n, one, many) => (n === 1 ? one : many);

  // Datos que se pueden poner en la tarjeta (wrapped.stats).
  function wrapFacts(s) {
    return {
      games: [NF.format(s.distinct), plural(s.distinct, 'juego distinto', 'juegos distintos')],
      days: [NF.format(s.days), plural(s.days, 'día con partida', 'días con partida')],
      badges: [NF.format(s.badges), plural(s.badges, 'insignia', 'insignias')],
      challenges: [NF.format(s.chDone), plural(s.chDone, 'reto completado', 'retos completados')],
      newGames: [NF.format(s.newGames), plural(s.newGames, 'juego nuevo', 'juegos nuevos')],
      perfect: [NF.format(s.chPerfect), plural(s.chPerfect, 'día perfecto', 'días perfectos')],
      site: [s.site >= 3600 ? Math.round(s.site / 3600) + ' h' : Math.round(s.site / 60) + ' min', 'en roblox.com'],
      robux: [s.robux ? (s.robux.delta >= 0 ? '+' : '') + NF.format(s.robux.delta) : '0', 'Robux de diferencia']
    };
  }

  async function drawWrapped() {
    const mk = $('#wr-month').value;
    if (!mk || !wrData) return;
    const s = wrStats = wrapStats(mk, wrData);
    const body = $('#wr-body');
    body.textContent = '';
    if (!s.minutes && !s.distinct && !s.badges && !s.chDone && !s.site) {
      body.append(h('div', { class: 'card' }, [empty('gift', 'Todavía no hay datos de ' + monthName(mk).toLowerCase() + '. RoCer0 los apunta mientras el navegador está abierto, con «Tu tiempo en cada juego» encendido en Estadísticas.')]));
    } else {
      const tiles = [
        ['clock', fmtMin(s.minutes), 'jugando'], ['calendar', s.days, plural(s.days, 'día con partida', 'días con partida')],
        ['gamepad', s.distinct, plural(s.distinct, 'juego distinto', 'juegos distintos')], ['sparkles', s.newGames, plural(s.newGames, 'juego nuevo para ti', 'juegos nuevos para ti')],
        ['award', s.badges, plural(s.badges, 'insignia', 'insignias')], ['trophy', s.chDone, plural(s.chDone, 'reto completado', 'retos completados')],
        ['globe', fmtTime(s.site), 'en roblox.com'], ['robux', s.robux ? (s.robux.delta >= 0 ? '+' : '') + NF.format(s.robux.delta) : '—', 'Robux de diferencia']
      ];
      body.append(h('div', { class: 'wr-tiles' }, tiles.map(([icon, n, label]) => h('div', { class: 'stat' }, [ic(icon), h('b', { text: typeof n === 'number' ? NF.format(n) : n }), h('span', { text: label })]))));
      const facts = [];
      if (s.bestDay) facts.push('Tu día más largo fue el ' + new Date(s.bestDay + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) + ': ' + fmtMin(s.bestDayMin) + '.');
      if (s.favDow >= 0) facts.push('Juegas sobre todo los ' + DOW[s.favDow] + '.');
      if (s.chPerfect) facts.push(s.chPerfect + plural(s.chPerfect, ' día completaste', ' días completaste') + ' todos los retos.');
      if (facts.length) body.append(h('p', { class: 'wr-facts', text: facts.join(' ') }));
      const grid = h('div', { class: 'grid2 top' });
      const maxG = s.top.length ? s.top[0].minutes : 1;
      grid.append(h('div', { class: 'card' }, [h('h4', {}, [ic('gamepad'), ' Tus juegos del mes']),
        s.top.length ? h('div', { class: 'rank' }, s.top.slice(0, 8).map((g, i) => h('div', { class: 'rank-row' }, [
          h('span', { class: 'rank-n', text: String(i + 1) }),
          h('img', { class: 'thumb', src: '', alt: '', 'data-u': g.universeId }),
          h('div', { class: 'grow' }, [g.placeId ? h('a', { href: RBX + '/games/' + g.placeId, target: '_blank', text: g.name }) : h('b', { text: g.name }), h('div', { class: 'meter' }, [h('i', { style: 'width:' + Math.max(4, Math.round(100 * g.minutes / maxG)) + '%' })])]),
          h('span', { class: 'muted small', text: fmtMin(g.minutes) })
        ]))) : h('p', { class: 'muted', text: 'Sin juegos registrados.' })]));
      grid.append(h('div', { class: 'card' }, [h('h4', {}, [ic('users'), ' Con quién más jugaste']),
        s.together.length ? h('div', { class: 'rank' }, s.together.map((f, i) => h('div', { class: 'rank-row' }, [
          h('span', { class: 'rank-n', text: String(i + 1) }),
          h('div', { class: 'grow' }, [h('a', { href: RBX + '/users/' + f.id + '/profile', target: '_blank', text: f.name })]),
          h('span', { class: 'muted small', text: fmtMin(f.minutes) })
        ]))) : h('p', { class: 'muted', text: 'Sin datos: hace falta tener encendido «Registrar a qué juegan tus amigos» (Personas, Amigos).' })]));
      body.append(grid);
    }
    const icons = await gameIcons(s.top.slice(0, 8).map(g => g.universeId));
    s.icons = icons;
    body.querySelectorAll('img[data-u]').forEach(img => { if (icons[img.dataset.u]) img.src = icons[img.dataset.u]; });
    drawCard(s);
  }

  // ---------- Tarjeta para compartir ----------
  async function loadBitmap(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await createImageBitmap(await r.blob());
    } catch (e) { return null; }
  }
  function loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r);
    ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fit(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t + '…';
  }
  // Parte un texto en líneas que quepan en "max" (la última se corta con "…" si hace falta).
  function wrap(ctx, text, max, lines) {
    const out = [];
    let cur = '';
    text.split(' ').forEach(w => {
      const next = cur ? cur + ' ' + w : w;
      if (!cur || ctx.measureText(next).width <= max) cur = next;
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    if (out.length > lines) out.splice(lines - 1, out.length, out.slice(lines - 1).join(' '));
    return out.map(l => fit(ctx, l, max));
  }
  // Baja el tamaño de letra hasta que el texto quepa.
  function fitFont(ctx, text, weight, size, min, font, max) {
    ctx.font = weight + ' ' + size + 'px ' + font;
    while (size > min && ctx.measureText(text).width > max) { size -= 2; ctx.font = weight + ' ' + size + 'px ' + font; }
  }

  // Tu avatar y tu nombre para la tarjeta (respeta el modo streamer y las opciones del Wrapped).
  let meInfo;
  async function meCard() {
    const st = settings['streamer.enabled'];
    const wantName = settings['wrapped.showName'], wantImg = settings['wrapped.showAvatar'] && !(st && settings['streamer.hideAvatar']);
    if (!wantName && !wantImg) return null;
    if (meInfo === undefined) {
      meInfo = null;
      const { me } = await B.storage.local.get('me');
      if (me && me.id) {
        let img = null;
        try {
          const r = await send('api', { url: 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + Number(me.id) + '&size=150x150&format=Png&isCircular=false' });
          const u = r && r.data && r.data.data && r.data.data[0] && r.data.data[0].imageUrl;
          if (u) img = await loadBitmap(u);
        } catch (e) { /* sin avatar */ }
        meInfo = { name: me.displayName || me.name || '', img };
      }
    }
    const name = !wantName ? '' : st && settings['streamer.hideName'] ? (settings['streamer.replacement'] || 'Streamer') : (meInfo && meInfo.name) || '';
    const img = wantImg && meInfo ? meInfo.img : null;
    return name || img ? { name, img } : null;
  }

  const FORMATS = { wide: [1200, 630], square: [1080, 1080], story: [1080, 1920] };
  let cardSeq = 0;
  async function drawCard(s) {
    const seq = ++cardSeq;
    const fmt = FORMATS[settings['wrapped.format']] ? settings['wrapped.format'] : 'wide';
    const [W, H] = FORMATS[fmt];
    const cv = $('#wr-canvas');
    const css = getComputedStyle(document.documentElement);
    const v = n => css.getPropertyValue(n).trim();
    const custom = settings['wrapped.colors'] === 'custom';
    const accent = (custom && rkHex(settings['wrapped.color1'])) || rkHex(v('--rk-accent')) || '#3b82f6';
    const accent2 = (custom && rkHex(settings['wrapped.color2'])) || rkHex(v('--rk-accent-2')) || '#8b5cf6';
    const base = rkMix(rkHex(v('--rk-bg')) || '#0a0d16', '#05070d', 0.6);
    const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    const topN = Math.max(0, Math.min(5, Number(settings['wrapped.topGames']) || 0));
    const top = s.top.slice(0, topN);
    const logo = await loadImage((RC_ICON_CUSTOM.logo && RC_ICON_CUSTOM.logo.src) || rcLogoUrl());
    const icons = [];
    for (const g of top) icons.push(s.icons && s.icons[g.universeId] ? await loadBitmap(s.icons[g.universeId]) : null);
    const who = await meCard();
    if (seq !== cardSeq) return;
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    cv.dataset.format = fmt;
    const ctx = cv.getContext('2d');
    const S = fmt === 'story' ? 1.4 : fmt === 'square' ? 1.12 : 1;
    const pad = Math.round(56 * (fmt === 'story' ? 1.3 : 1));

    // Fondo
    const g1 = ctx.createLinearGradient(0, 0, W, H);
    g1.addColorStop(0, rkMix(base, accent, 0.6));
    g1.addColorStop(0.55, rkMix(base, accent2, 0.4));
    g1.addColorStop(1, base);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    [[W * 0.87, H * 0.14, 260 * S, accent2, 0.35], [W * 0.12, H * 0.95, 300 * S, accent, 0.28], [W * 0.63, H * 0.82, 180 * S, '#ffffff', 0.06]].forEach(([x, y, r, c, a]) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rkA(c, a)); rg.addColorStop(1, rkA(c, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    });
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(0, 0, W, H);

    // Cabecera: logo y título a la izquierda; tu nombre, avatar y el mes a la derecha.
    const hy = Math.round((fmt === 'story' ? 110 : 69) * (fmt === 'square' ? 1.05 : 1));
    const title = String(settings['wrapped.title'] || '').trim() || 'RoCer0 Wrapped';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    if (logo) ctx.drawImage(logo, pad, hy - 24 * S, 48 * S, 48 * S);
    ctx.font = '800 ' + Math.round(26 * S) + 'px ' + font;
    ctx.fillText(fit(ctx, title, W / 2 - pad - 62 * S), pad + 62 * S, hy);
    ctx.textAlign = 'right';
    let tx = W - pad;
    if (who && who.img) {
      const r = 28 * S;
      ctx.save();
      ctx.beginPath();
      ctx.arc(W - pad - r, hy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(who.img, W - pad - 2 * r, hy - r, 2 * r, 2 * r);
      ctx.restore();
      tx = W - pad - 2 * r - 14 * S;
    }
    if (who && who.name) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 ' + Math.round(22 * S) + 'px ' + font;
      ctx.fillText(fit(ctx, who.name, W / 2 - pad - 90 * S), tx, hy - 12 * S);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '600 ' + Math.round(18 * S) + 'px ' + font;
      ctx.fillText(monthName(s.mk), tx, hy + 16 * S);
    } else {
      ctx.font = '600 ' + Math.round(22 * S) + 'px ' + font;
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText(monthName(s.mk), tx, hy);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Bloques
    const hours = Math.floor(s.minutes / 60), mins = Math.round(s.minutes % 60);
    const big = hours ? hours + ' h' + (mins ? ' ' + mins + ' min' : '') : mins + ' min';
    const thisMonth = s.mk === dayKey(new Date()).slice(0, 7);
    const sub = 'jugando a Roblox ' + (thisMonth ? 'este mes' : 'en ' + monthName(s.mk).toLowerCase());
    const facts = wrapFacts(s);
    const boxes = (settings['wrapped.stats'] || []).filter(k => facts[k]).slice(0, 4).map(k => facts[k]);
    const hideFriend = settings['streamer.enabled'] && settings['streamer.hideFriends'];
    const duo = !settings['wrapped.friend'] ? null
      : s.together.length ? ['Con quién más jugaste', (hideFriend ? 'Un amigo' : s.together[0].name) + ' · ' + fmtMin(s.together[0].minutes)]
      : s.favDow >= 0 ? ['Tu día de juego', 'los ' + DOW[s.favDow]] : null;

    const drawBoxes = (list, x, y, w, hh, cols, gap, nSize, lSize) => {
      list.forEach(([n, label], i) => {
        const bx = x + (i % cols) * (w + gap), by = y + Math.floor(i / cols) * (hh + gap);
        roundRect(ctx, bx, by, w, hh, 18 * S);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        fitFont(ctx, n, 900, nSize, 18, font, w - 28 * S);
        ctx.fillText(n, bx + 14 * S, by + hh * 0.5);
        ctx.font = '600 ' + lSize + 'px ' + font;
        ctx.fillStyle = 'rgba(255,255,255,.78)';
        wrap(ctx, label, w - 28 * S, 2).forEach((line, k) => ctx.fillText(line, bx + 14 * S, by + hh * 0.5 + lSize * 1.35 + k * lSize * 1.25));
      });
    };
    const drawDuo = (x, y, maxW) => {
      ctx.font = '600 ' + Math.round(19 * S) + 'px ' + font;
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillText(fit(ctx, duo[0], maxW), x, y);
      ctx.font = '800 ' + Math.round(28 * S) + 'px ' + font;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(fit(ctx, duo[1], maxW), x, y + 38 * S);
    };
    const drawTop = (x, y, w, rowH, iconS) => {
      const hh = 70 * S + top.length * rowH;
      roundRect(ctx, x, y, w, hh, 24 * S);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 ' + Math.round(24 * S) + 'px ' + font;
      ctx.fillText('Tus juegos del mes', x + 28 * S, y + 46 * S);
      if (!top.length) return hh;
      top.forEach((g, i) => {
        const ry = y + 66 * S + i * rowH;
        ctx.save();
        roundRect(ctx, x + 28 * S, ry, iconS, iconS, iconS * 0.22);
        ctx.clip();
        if (icons[i]) ctx.drawImage(icons[i], x + 28 * S, ry, iconS, iconS);
        else {
          const gg = ctx.createLinearGradient(x, ry, x + iconS, ry + iconS);
          gg.addColorStop(0, accent); gg.addColorStop(1, accent2);
          ctx.fillStyle = gg;
          ctx.fillRect(x + 28 * S, ry, iconS, iconS);
        }
        ctx.restore();
        const tx2 = x + 28 * S + iconS + 18 * S;
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.font = '900 ' + Math.round(20 * S) + 'px ' + font;
        ctx.fillText('#' + (i + 1), tx2, ry + iconS * 0.42);
        const nx = tx2 + ctx.measureText('#' + (i + 1)).width + 10 * S;
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 ' + Math.round(21 * S) + 'px ' + font;
        ctx.fillText(fit(ctx, g.name, x + w - nx - 24 * S), nx, ry + iconS * 0.42);
        ctx.font = '600 ' + Math.round(17 * S) + 'px ' + font;
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fillText(fmtMin(g.minutes), tx2, ry + iconS * 0.84);
      });
      return hh;
    };

    if (fmt === 'wide') {
      const leftW = top.length || !boxes.length ? 570 : 520;
      fitFont(ctx, big, 900, 86, 40, font, leftW);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(big, pad, 210);
      fitFont(ctx, sub, 600, 26, 16, font, leftW);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText(sub, pad + 4, 252);
      let y = 292;
      if (top.length) {
        if (boxes.length) {
          const gap = 12, w = (leftW - (boxes.length - 1) * gap) / boxes.length;
          drawBoxes(boxes, pad, y, w, 104, boxes.length, gap, 38, 14);
          y += 104 + 50;
        }
        if (duo) drawDuo(pad + 4, y + 4, leftW);
        const rowH = top.length <= 3 ? 92 : 68, iconS = top.length <= 3 ? 72 : 52;
        const ph = 70 + top.length * rowH;
        drawTop(660, Math.max(130, (H - ph) / 2 + 10), 484, rowH, iconS);
      } else {
        if (duo) drawDuo(pad + 4, 330, leftW);
        if (boxes.length) {
          const cols = boxes.length > 2 ? 2 : boxes.length, rows = Math.ceil(boxes.length / 2);
          const gap = 16, w = (484 - (cols - 1) * gap) / cols, hh = rows > 1 ? 150 : 200;
          drawBoxes(boxes, 660, Math.max(140, (H - rows * hh - (rows - 1) * gap) / 2 + 10), w, hh, cols, gap, 52, 18);
        }
      }
    } else {
      const innerW = W - 2 * pad;
      let y = hy + (fmt === 'story' ? 260 : 190);
      fitFont(ctx, big, 900, Math.round(fmt === 'story' ? 150 : 112), 50, font, innerW);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(big, pad, y);
      y += Math.round(56 * S);
      fitFont(ctx, sub, 600, Math.round(26 * S), 16, font, innerW);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText(sub, pad + 4, y);
      y += Math.round(44 * S);
      if (boxes.length) {
        const cols = fmt === 'story' ? Math.min(2, boxes.length) : boxes.length;
        const rows = Math.ceil(boxes.length / cols);
        const gap = Math.round(16 * S), w = (innerW - (cols - 1) * gap) / cols, hh = Math.round((fmt === 'story' ? 150 : 128) * S);
        drawBoxes(boxes, pad, y, w, hh, cols, gap, Math.round(44 * S), Math.round(15 * S));
        y += rows * hh + (rows - 1) * gap + Math.round(64 * S);
      }
      if (duo) { drawDuo(pad + 4, y, innerW); y += Math.round(84 * S); }
      if (top.length) {
        const rowH = Math.round((fmt === 'story' ? 96 : 76) * S * (top.length > 3 && fmt === 'square' ? 0.82 : 1));
        const iconS = Math.round(rowH * 0.78);
        const ph = 70 * S + top.length * rowH;
        const bottom = H - (settings['wrapped.footer'] ? 96 * S : 50 * S);
        drawTop(pad, Math.min(y, bottom - ph), innerW, rowH, iconS);
      }
    }

    // Pie
    if (settings['wrapped.footer']) {
      ctx.font = '600 ' + Math.round(18 * S) + 'px ' + font;
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillText(fit(ctx, 'Hecho con RoCer0 · datos guardados solo en tu navegador', W - 2 * pad), pad, H - Math.round(40 * S));
    }
  }

  function cardBlob() { return new Promise(resolve => $('#wr-canvas').toBlob(resolve, 'image/png')); }
  $('#wr-download').addEventListener('click', async () => {
    const b = await cardBlob();
    if (b) download(b, 'rocer0-wrapped-' + ($('#wr-month').value || 'mes') + '-' + ($('#wr-canvas').dataset.format || 'wide') + '.png');
  });
  $('#wr-copy').addEventListener('click', async () => {
    try {
      const b = await cardBlob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
      toast('Imagen copiada: pégala donde quieras.');
    } catch (e) { toast('Este navegador no deja copiar imágenes desde aquí. Usa "Descargar la tarjeta".', 4500); }
  });
})();
