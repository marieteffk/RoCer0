// Popup de RoCer0. Las tarjetas salen en el orden de "popup.order" y cada una tiene su interruptor "popup.<id>".
const B = globalThis.browser || globalThis.chrome;
const $ = s => document.querySelector(s);
const RBX = 'https://www.roblox.com';
const ORIGINS = ['*://*.roblox.com/*', '*://*.rbxcdn.com/*', 'https://www.rolimons.com/*', 'https://ipinfo.io/*', 'https://open.er-api.com/*'];
const CARD_IDS = ['challenges', 'game', 'outfits', 'pins', 'theme', 'quick', 'accounts', 'links'];
// Interruptores rápidos ("popup.quickList"): [id, ajuste, texto, icono].
const QUICK = [
  ['streamer', 'streamer.enabled', 'Modo streamer', 'video'],
  ['perf', 'perf.overlay', 'FPS y ping', 'gauge'],
  ['theme', 'theme.enabled', 'Tema en Roblox', 'palette'],
  ['home', 'home.enabled', 'Inicio rediseñado', 'home'],
  ['notify', 'notify.all', 'Notificaciones', 'bell']
];
const LAYOUT_KEY = 'rc-popup-layout';

// ---------- Utilidades ----------

function send(type, data) {
  const msg = Object.assign({ type }, data || {});
  const done = res => {
    if (!res) throw new Error('Sin respuesta');
    if (res.error) throw new Error(res.error);
    return res.result;
  };
  if (globalThis.browser) return B.runtime.sendMessage(msg).then(done);
  return new Promise((resolve, reject) => {
    B.runtime.sendMessage(msg, res => {
      const err = B.runtime.lastError;
      if (err) return reject(new Error(err.message));
      try { resolve(done(res)); } catch (e) { reject(e); }
    });
  });
}

function h(tag, attrs, children) {
  const n = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  (children || []).forEach(c => c !== null && c !== undefined && c !== false && n.append(c));
  return n;
}

const icon = (name, opts) => rcIcon(name, opts);
const muted = text => h('div', { class: 'muted', text });
const btn = (ic, text, attrs) => h('button', Object.assign({ class: 'btn btn-sm' }, attrs || {}), [icon(ic), h('span', { text })]);
const open = url => { B.tabs.create({ url }); window.close(); };
// Secciones de los ajustes por su id (RX_SECTIONS); "start" = la sección de inicio que eligió el usuario.
const openSettings = section => {
  send('openSettings', { tab: section }).catch(() => B.runtime.openOptionsPage()).finally(() => window.close());
};

function say(box, text, kind) {
  box.className = 'msg' + (kind ? ' ' + kind : '');
  box.textContent = text || '';
}

// Confirmación dentro del popup (sin confirm() del navegador). Devuelve true o false.
let pendingAsk = null;
function askInline(box, text, okText) {
  if (pendingAsk) pendingAsk(false);
  return new Promise(resolve => {
    const finish = v => { pendingAsk = null; bar.remove(); resolve(v); };
    const ok = h('button', { class: 'btn btn-sm btn-accent', text: okText, onclick: () => finish(true) });
    const bar = h('div', { class: 'confirm', role: 'alertdialog', 'aria-label': text }, [
      h('span', { class: 'confirm-text', text }),
      h('span', { class: 'confirm-btns' }, [ok, h('button', { class: 'btn btn-sm', text: 'Cancelar', onclick: () => finish(false) })])
    ]);
    pendingAsk = finish;
    box.className = 'msg';
    box.replaceChildren(bar);
    ok.focus();
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pendingAsk) { e.preventDefault(); pendingAsk(false); } });

// Pone los iconos marcados con data-icon en el HTML.
function decorate(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(n => {
    const ic = icon(n.dataset.icon);
    if (n.tagName === 'SPAN' && !n.textContent.trim()) n.replaceChildren(ic);
    else n.prepend(ic);
  });
}

async function saveSettings(mutate) {
  const cur = rxMergeSettings((await B.storage.local.get('settings')).settings);
  mutate(cur);
  await B.storage.local.set({ settings: cur });
  return cur;
}

// ---------- Aspecto ----------

// Ancho ("popup.width") y tarjetas compactas ("popup.compact"). Se recuerdan aquí para no dar un salto al abrir.
function applyLayout(width, compact) {
  const root = document.documentElement;
  root.dataset.width = ['narrow', 'normal', 'wide'].indexOf(width) >= 0 ? width : 'normal';
  if (compact) root.dataset.compact = ''; else delete root.dataset.compact;
}
try {
  const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
  if (saved) applyLayout(saved.width, saved.compact);
} catch (e) { /* sin almacenamiento local */ }

async function paintTheme(settings) {
  const root = document.documentElement;
  const t = settings['theme.extension'] ? rkEffectiveTheme(settings) : rkEffectiveTheme(rxMergeSettings({}), 'medianoche');
  let image = null;
  if (t.bg === 'upload') {
    const r = await B.storage.local.get(['rkImg:' + t.id, 'themeImages']);
    image = r['rkImg:' + t.id] || (r.themeImages || {})[t.id] || null;
  }
  rkApply(root, rkThemeVars(t, { animations: false, image }));
  rcApplyIconStyle(root, rcIconStyleOf(settings, t));
  // Tamaño y color de los iconos, como en los ajustes.
  root.style.setProperty('--rc-icon-scale', String(Math.max(50, Math.min(200, Number(settings['icons.scale']) || 100)) / 100));
  const col = rkHex(settings['icons.color'] || '');
  if (col) { root.style.setProperty('--rc-icon-color', col); root.classList.add('rc-ic-colored'); }
  else { root.style.removeProperty('--rc-icon-color'); root.classList.remove('rc-ic-colored'); }
}

// Miniaturas de juegos: las que no tienen imagen guardada se piden todas juntas al final.
function thumb(placeId, src) {
  const img = h('img', { class: 'thumb', alt: '', loading: 'lazy' });
  img.addEventListener('error', () => { img.removeAttribute('src'); img.classList.add('ph'); });
  if (src) img.src = src;
  else { img.classList.add('ph'); if (placeId) img.dataset.place = String(placeId); }
  return img;
}

async function fillThumbs() {
  const imgs = Array.from(document.querySelectorAll('img[data-place]'));
  const ids = [...new Set(imgs.map(i => i.dataset.place).filter(id => /^\d+$/.test(id)))].slice(0, 100);
  if (!ids.length) return;
  try {
    const r = await send('api', { url: 'https://thumbnails.roblox.com/v1/places/gameicons?placeIds=' + ids.join(',') + '&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false' });
    const map = {};
    ((r && r.data && r.data.data) || []).forEach(x => { if (x.imageUrl) map[x.targetId] = x.imageUrl; });
    imgs.forEach(i => { const u = map[i.dataset.place]; if (u) { i.classList.remove('ph'); i.src = u; } });
  } catch (e) { /* sin permiso o sin conexión: se quedan los cuadros de color */ }
}

// ---------- Tarjetas ----------

function card(id, ic, title, actions, body) {
  return h('section', { class: 'card', 'data-card': id }, [
    h('header', { class: 'card-head' }, [icon(ic), h('h2', { text: title }), h('div', { class: 'card-actions' }, actions || [])])
  ].concat(body));
}

const goto = (section, title) => h('button', { class: 'mini-btn', title: title || 'Abrir en los ajustes', 'aria-label': title || 'Abrir en los ajustes', onclick: () => openSettings(section) }, [icon('chevronRight')]);

const CARDS = {
  // Retos de hoy, con racha y el cambio de retos de una vez al día.
  challenges(s) {
    if (!s['fun.challenges']) return null;
    const list = h('div', { class: 'ch-list' }, [muted('Cargando…')]);
    const streak = h('span', { class: 'pill', hidden: true });
    const reroll = h('button', { class: 'mini-btn', title: 'Cambiar los que te faltan (una vez al día)', 'aria-label': 'Cambiar los retos de hoy', hidden: true }, [icon('dice')]);
    const msg = h('div', { class: 'msg', role: 'status' });
    const el = card('challenges', 'target', 'Retos de hoy', [streak, reroll, goto('challenges', 'Retos y medallas')], [list, msg]);
    const paint = st => {
      list.replaceChildren(...st.list.map(c => {
        const def = rcChallengeDef(c.id) || {};
        const goal = Math.max(1, Number(c.goal) || 1);
        const prog = Math.max(0, Math.min(goal, Math.floor(Number(c.progress) || 0)));
        const text = rcChallengeText(c.id, c.goal);
        return h('div', { class: 'ch' + (c.done ? ' done' : '') }, [
          icon(c.done ? 'checkCircle' : 'target'),
          h('div', { class: 'grow' }, [
            h('div', { class: 'ch-row' }, [
              h('span', { class: 'ch-text', text, title: text }),
              h('span', { class: 'ch-count', text: c.done ? 'Hecho' : prog + ' / ' + goal + (def.unit === 'min' ? ' min' : '') })
            ]),
            h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': goal, 'aria-valuenow': prog }, [h('i', { style: 'width:' + Math.round(100 * prog / goal) + '%' })])
          ])
        ]);
      }));
      const n = st.streak || 0;
      streak.hidden = !n;
      streak.title = 'Racha: ' + n + (n === 1 ? ' día seguido' : ' días seguidos') + ' con todos los retos';
      streak.replaceChildren(icon('flame'), h('span', { text: n + (n === 1 ? ' día' : ' días') }));
      reroll.hidden = st.rerolled === st.day || st.list.every(c => c.done);
    };
    reroll.addEventListener('click', async () => {
      if (!await askInline(msg, '¿Cambiar los retos que te faltan? Solo se puede una vez al día.', 'Cambiar')) return;
      try { paint(await send('challenges:reroll')); say(msg, 'Listo: tienes retos nuevos.', 'ok'); }
      catch (e) { say(msg, e.message, 'err'); }
    });
    send('challenges:get').then(st => { if (st) paint(st); else el.remove(); }).catch(e => list.replaceChildren(muted(e.message)));
    return el;
  },

  // Último juego abierto (server hop) y enlace a tu servidor.
  game(s, store) {
    const g = store.lastGame;
    const msg = h('div', { class: 'msg', role: 'status' });
    const body = [];
    if (g && g.placeId) {
      const pin = (store.pinned || []).find(p => String(p.placeId) === String(g.placeId));
      body.push(h('div', { class: 'item' }, [
        h('button', { class: 'item-main', title: 'Abrir la página del juego', onclick: () => open(RBX + '/games/' + g.placeId) }, [
          thumb(g.placeId, pin && pin.icon),
          h('span', { class: 'grow' }, [h('span', { class: 'name', text: g.name || 'Juego ' + g.placeId }), h('span', { class: 'sub', text: 'Último juego abierto' })])
        ]),
        btn('shuffle', 'Server hop', { class: 'btn btn-sm btn-accent', title: 'Abre el juego y salta a otro servidor', onclick: () => open(RBX + '/games/' + g.placeId + '#rx-hop') })
      ]));
    } else {
      body.push(muted('Abre la página de un juego para hacer server hop desde aquí.'));
    }
    if (s['servers.copyLink']) {
      body.push(h('div', { class: 'btn-row' }, [btn('link', 'Copiar el enlace de mi servidor', { onclick: () => copyServer(msg) })]));
    }
    body.push(msg);
    return card('game', 'gamepad', 'Partida', [goto('servers', 'Ajustes de servidores')], body);
  },

  // Trajes de Roblox y looks guardados con RoCer0.
  outfits(s) {
    const showRoblox = !!s['outfits.showRoblox'], showLooks = !!s['outfits.showLooks'];
    if (!s['outfits.enabled'] || (!showRoblox && !showLooks)) return null;
    const grid = h('div', { class: 'outfits' }, [muted('Cargando…')]);
    const msg = h('div', { class: 'msg', role: 'status' });
    const body = [grid];

    const wear = async (o, isLook) => {
      if (s['outfits.confirm'] && !await askInline(msg, '¿Ponerte «' + o.name + '»?', 'Ponérmelo')) return;
      say(msg, 'Poniéndote «' + o.name + '»…');
      try {
        const r = await send(isLook ? 'look:wear' : 'outfit:wear', { id: o.id });
        say(msg, 'Listo: llevas «' + o.name + '».' + (r.warnings && r.warnings.length ? ' Roblox no aplicó: ' + r.warnings.join(', ') + '.' : ''), 'ok');
      } catch (e) { say(msg, e.message, 'err'); }
    };
    const remove = async o => {
      if (!await askInline(msg, '¿Borrar el look «' + o.name + '»?', 'Borrar')) return;
      try { await send('look:delete', { id: o.id }); say(msg, 'Look borrado.'); load(); } catch (e) { say(msg, e.message, 'err'); }
    };
    // mark: con looks y trajes a la vez, los looks llevan una marca para distinguirlos.
    const tile = (o, isLook, mark) => h('div', { class: 'outfit' + (isLook ? ' look' : '') }, [
      h('button', { class: 'outfit-btn', title: (isLook ? 'Look guardado: ' : 'Traje: ') + o.name, onclick: () => wear(o, isLook) }, [
        o.img ? h('img', { src: o.img, alt: '', loading: 'lazy' }) : h('span', { class: 'ph' }),
        h('span', { class: 'outfit-name', text: o.name })
      ]),
      mark ? h('span', { class: 'look-mark', title: 'Look guardado con RoCer0' }, [icon('bookmark')]) : null,
      isLook ? h('button', { class: 'outfit-del', title: 'Borrar este look', 'aria-label': 'Borrar el look ' + o.name, onclick: () => remove(o) }, [icon('x')]) : null
    ]);
    const load = async () => {
      try {
        const r = await send('outfits:list', { roblox: showRoblox });
        const looks = showLooks ? r.looks || [] : [];
        const outfits = showRoblox ? r.outfits || [] : [];
        grid.replaceChildren();
        const both = !!(looks.length && outfits.length);
        looks.forEach(l => grid.append(tile(l, true, both)));
        outfits.forEach(o => grid.append(tile(o, false)));
        if (!grid.children.length) grid.append(muted(showLooks ? 'Todavía no hay trajes. Guarda tu look actual con el botón de abajo.' : 'No tienes trajes guardados en Roblox.'));
      } catch (e) { grid.replaceChildren(muted(e.message)); }
    };

    if (showLooks) {
      const name = h('input', { type: 'text', placeholder: 'Nombre del look', maxlength: 40, 'aria-label': 'Nombre del look' });
      const save = btn('save', 'Guardar el actual', { onclick: async () => {
        say(msg, 'Guardando tu look…');
        try {
          const look = await send('look:save', { name: name.value });
          name.value = '';
          say(msg, 'Guardado «' + look.name + '».', 'ok');
          load();
        } catch (e) { say(msg, e.message, 'err'); }
      } });
      name.addEventListener('keydown', e => { if (e.key === 'Enter') save.click(); });
      body.push(h('div', { class: 'inline-form' }, [name, save]));
    }
    body.push(msg);
    load();
    return card('outfits', 'shirt', 'Trajes', [goto('catalog', 'Ajustes de trajes')], body);
  },

  // Juegos fijados: como mucho "popup.pinsMax", en el orden de "pinned.sort" y en carpetas si están encendidas.
  pins(s, store) {
    if (!s['pinned.enabled']) return null;
    const all = rcSortPins(store.pinned || [], s['pinned.sort'], (store.myRecent || []).concat(store.myJoins || []));
    const max = Math.max(1, Number(s['popup.pinsMax']) || 8);
    const shown = all.slice(0, max);
    const body = [];
    if (!all.length) body.push(muted('Ninguno todavía. Pulsa «Fijar» en la página de un juego.'));
    const row = p => h('div', { class: 'item' }, [
      h('button', { class: 'item-main', title: 'Abrir la página del juego', onclick: () => open(RBX + '/games/' + p.placeId) }, [
        thumb(p.placeId, p.icon), h('span', { class: 'name grow', text: p.name || 'Juego ' + p.placeId })
      ]),
      h('button', { class: 'mini-btn', title: 'Server hop', 'aria-label': 'Server hop en ' + (p.name || 'el juego'), onclick: () => open(RBX + '/games/' + p.placeId + '#rx-hop') }, [icon('shuffle')])
    ]);
    const folders = s['pinned.folders'] ? store.pinFolders || [] : [];
    const groups = [];
    folders.forEach(f => { const list = shown.filter(p => p.folder === f.id); if (list.length) groups.push([f.name, list]); });
    const loose = shown.filter(p => !p.folder || !folders.some(f => f.id === p.folder));
    if (loose.length) groups.push([groups.length ? 'Sin carpeta' : '', loose]);
    groups.forEach(([name, list]) => {
      if (name) body.push(h('div', { class: 'folder' }, [icon('folder'), h('span', { text: name })]));
      list.forEach(p => body.push(row(p)));
    });
    if (all.length > shown.length) {
      body.push(h('button', { class: 'more', onclick: () => openSettings('pins') }, [h('span', { text: 'Ver los ' + all.length + ' fijados' }), icon('chevronRight')]));
    }
    return card('pins', 'pin', 'Juegos fijados', [goto('pins', 'Ordenar y carpetas')], body);
  },

  // Tema y color de acento.
  theme(s) {
    const sel = h('select', { 'aria-label': 'Tema' });
    const note = h('div', { class: 'note', hidden: true });
    const sw = h('div', { class: 'swatches' });
    const count = { narrow: 10, normal: 12, wide: 15 }[s['popup.width']] || 12;
    const draw = cur => {
      sel.replaceChildren();
      const custom = cur['theme.custom'] || [];
      if (custom.length) sel.append(h('optgroup', { label: 'Mis temas' }, custom.map(t => h('option', { value: t.id, text: t.name }))));
      sel.append(h('optgroup', { label: 'Temas' }, RK_THEMES.map(t => h('option', { value: t.id, text: t.name }))));
      sel.value = cur['theme.id'];
      const active = rkEffectiveTheme(cur);
      const auto = cur['theme.auto'] && cur['theme.auto'] !== 'off';
      const text = auto ? 'Tema automático: ahora se usa ' + active.name + '.' : !cur['theme.enabled'] ? 'Apagado en roblox.com. Elige un tema para encenderlo.' : '';
      note.hidden = !text;
      note.textContent = text;
      sw.replaceChildren(...RK_ACCENTS.slice(0, count).map(col => h('button', {
        class: 'swatch' + (String(active.c.accent).toLowerCase() === col ? ' on' : ''), title: 'Acento ' + col, 'aria-label': 'Color de acento ' + col, style: 'background:' + col,
        onclick: async () => {
          const next = await saveSettings(c => {
            const all = c['theme.overrides'] || (c['theme.overrides'] = {});
            const o = all[active.id] || (all[active.id] = {});
            o.c = o.c || {};
            o.c.accent = col;
          });
          paintTheme(next);
          draw(next);
        }
      })));
    };
    sel.addEventListener('change', async () => {
      const next = await saveSettings(c => { c['theme.id'] = sel.value; c['theme.enabled'] = true; });
      paintTheme(next);
      draw(next);
    });
    draw(s);
    return card('theme', 'palette', 'Tema', [goto('themes', 'Editar el tema')], [sel, note, sw]);
  },

  // Interruptores rápidos ("popup.quickList").
  quick(s) {
    const want = Array.isArray(s['popup.quickList']) ? s['popup.quickList'] : [];
    const items = QUICK.filter(q => want.indexOf(q[0]) >= 0);
    if (!items.length) return null;
    return h('section', { class: 'card card-quick', 'data-card': 'quick' }, [h('div', { class: 'toggles' }, items.map(([id, key, label, ic]) => {
      const input = h('input', { type: 'checkbox', class: 'switch', role: 'switch', 'data-quick': id });
      input.checked = !!s[key];
      input.addEventListener('change', () => saveSettings(c => { c[key] = input.checked; }));
      return h('label', { class: 'toggle', title: label }, [icon(ic), h('span', { class: 'toggle-label', text: label }), input]);
    }))]);
  },

  // Selector de cuentas ("accounts.confirm" pregunta antes de cambiar).
  accounts(s) {
    if (!s['accounts.enabled']) return null;
    const list = h('div', { class: 'acc-list' }, [muted('Cargando…')]);
    const msg = h('div', { class: 'msg', role: 'status' });
    const use = async a => {
      if (s['accounts.confirm'] && !await askInline(msg, '¿Cambiar a ' + a.displayName + ' (@' + a.name + ')?', 'Cambiar')) return;
      say(msg, 'Cambiando de cuenta…');
      try {
        const r = await send('accounts:switch', { userId: a.userId });
        say(msg, 'Ahora usas @' + r.name + '.' + (r.reloadTabs ? '' : ' Recarga las pestañas de Roblox para verlo.'), 'ok');
        load();
      } catch (e) { say(msg, e.message, 'err'); }
    };
    const load = async () => {
      try {
        const r = await send('accounts:list');
        const heads = {};
        if (r.accounts.length) {
          const t = await send('api', { url: 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + r.accounts.map(a => a.userId).join(',') + '&size=48x48&format=Png&isCircular=false' }).catch(() => null);
          ((t && t.data && t.data.data) || []).forEach(x => { heads[x.targetId] = x.imageUrl; });
        }
        list.replaceChildren();
        if (!r.accounts.length) list.append(muted('Guarda tu cuenta para cambiar de una a otra con un clic.'));
        r.accounts.forEach(a => {
          const cur = a.userId === r.current;
          const img = heads[a.userId] ? h('img', { class: 'thumb round', src: heads[a.userId], alt: '' }) : h('span', { class: 'thumb round ph' });
          list.append(h('div', { class: 'item acc' + (cur ? ' current' : '') }, [
            img,
            h('span', { class: 'grow' }, [h('span', { class: 'name', text: a.displayName || a.name }), h('span', { class: 'sub', text: '@' + a.name })]),
            cur ? h('span', { class: 'tag', text: 'En uso' }) : h('button', { class: 'btn btn-sm', text: 'Usar', title: 'Cambiar a esta cuenta', onclick: () => use(a) })
          ]));
        });
      } catch (e) { list.replaceChildren(muted(e.message)); }
    };
    const actions = h('div', { class: 'btn-row' }, [
      btn('save', 'Guardar la actual', { onclick: async () => {
        try { const me = await send('accounts:save'); say(msg, 'Guardada @' + me.name + '.', 'ok'); load(); } catch (e) { say(msg, e.message, 'err'); }
      } }),
      btn('plus', 'Añadir otra', { onclick: async () => {
        if (!await askInline(msg, 'Se guarda la cuenta actual y se abre Roblox para entrar con otra.', 'Seguir')) return;
        try { await send('accounts:add'); window.close(); } catch (e) { say(msg, e.message, 'err'); }
      } })
    ]);
    load();
    return card('accounts', 'key', 'Cuentas', [goto('accounts', 'Ajustes de cuentas')], [list, actions, msg]);
  },

  // Accesos directos a secciones de los ajustes.
  links(s) {
    const items = [['wishlist', 'Lista de deseos', 'bookmark', s['wishlist.enabled']], ['wrapped', 'Wrapped', 'gift', true], ['stats', 'Estadísticas', 'chart', true]].filter(x => x[3]);
    return h('nav', { class: 'links', 'data-card': 'links' }, items.map(([id, label, ic]) => h('button', { class: 'link', 'data-section': id, onclick: () => openSettings(id) }, [icon(ic), h('span', { text: label })])));
  }
};

// Orden de "popup.order": ids desconocidos fuera, los que falten al final, y sin las apagadas.
function cardOrder(s) {
  const order = [];
  (Array.isArray(s['popup.order']) ? s['popup.order'] : []).forEach(id => { if (CARD_IDS.indexOf(id) >= 0 && order.indexOf(id) < 0) order.push(id); });
  CARD_IDS.forEach(id => { if (order.indexOf(id) < 0) order.push(id); });
  return order.filter(id => s['popup.' + id] !== false);
}

async function copyServer(msg) {
  say(msg, 'Buscando tu servidor…');
  try {
    const r = await send('myServer:get');
    await navigator.clipboard.writeText(r.url);
    say(msg, 'Enlace copiado: pásaselo a un amigo para que entre en tu servidor de ' + (r.name || 'tu juego') + '.', 'ok');
  } catch (e) { say(msg, e.message, 'err'); }
}

// ---------- Inicio ----------

async function init() {
  const store = await B.storage.local.get(['settings', 'pinned', 'pinFolders', 'myRecent', 'myJoins', 'lastGame', 'iconImages']);
  rcSetCustomIcons(store.iconImages);
  const s = rxMergeSettings(store.settings);
  applyLayout(s['popup.width'], s['popup.compact']);
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify({ width: s['popup.width'], compact: !!s['popup.compact'] })); } catch (e) { /* sin almacenamiento local */ }
  paintTheme(s);
  decorate();
  $('#logo').replaceChildren(icon('logo'));

  $('#options').addEventListener('click', () => openSettings('start'));
  $('#search').hidden = !s['powerSearch.enabled'];
  $('#search').addEventListener('click', () => open(RBX + '/home#rx-search'));
  $('#roulette').hidden = !s['fun.roulette'];
  $('#roulette').addEventListener('click', () => open(RBX + '/home#rc-ruleta'));

  try { $('#perm').hidden = await B.permissions.contains({ origins: ORIGINS }); } catch (e) { /* navegadores sin permisos opcionales */ }
  $('#grant').addEventListener('click', () => B.permissions.request({ origins: ORIGINS }).then(ok => { $('#perm').hidden = ok; }));

  const box = $('#cards');
  cardOrder(s).forEach(id => {
    try { const el = CARDS[id](s, store); if (el) box.append(el); } catch (e) { console.warn('[RC] popup ' + id, e); }
  });
  if (!box.children.length) {
    box.append(h('section', { class: 'card empty' }, [
      muted('Has apagado todas las tarjetas del popup.'),
      h('div', { class: 'btn-row' }, [btn('sliders', 'Elegir tarjetas', { onclick: () => openSettings('popup') })])
    ]));
  }
  fillThumbs();
}

init();
