// Ajustes de RoCer0: menú lateral por secciones con buscador, generado a partir de RX_SECTIONS
// (common/defaults.js), más las pantallas de cuentas, estadísticas, calculadora y datos.
// Funciona como página suelta y dentro de Roblox (Ajustes → RoCer0), donde se carga en un marco con ?embed=1.
const B = globalThis.browser || globalThis.chrome;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const ORIGINS = ['*://*.roblox.com/*', '*://*.rbxcdn.com/*', 'https://www.rolimons.com/*', 'https://ipinfo.io/*', 'https://open.er-api.com/*'];
const EMBED = new URLSearchParams(location.search).has('embed') && window.parent !== window;
const ROBLOX_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*roblox\.com$/i;

function send(type, data) {
  return new Promise((resolve, reject) => {
    B.runtime.sendMessage(Object.assign({ type }, data || {}), res => {
      const err = B.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!res) return reject(new Error('Sin respuesta'));
      if (res.error) return reject(new Error(res.error));
      resolve(res.result);
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

// Iconos propios (sin emojis). Los elementos con data-icon reciben su icono delante del texto.
function ic(name, cls) { return rcIcon(name, { cls: 'ui-i' + (cls ? ' ' + cls : '') }); }
function ibtn(icon, text, attrs) {
  const b = h('button', Object.assign({ class: 'btn', type: 'button' }, attrs || {}), [ic(icon), text ? h('span', { text }) : null]);
  if (!text) b.classList.add('btn-icon');
  return b;
}
function paintIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(n => {
    if (n.querySelector(':scope > [data-rc-icon]')) return;
    n.prepend(ic(n.dataset.icon));
  });
}

// ---------- Avisos y diálogos dentro de la página ----------
// (dentro de Roblox la página va en un marco y los confirm()/prompt() del navegador no siempre funcionan)
let toastTimer;
function toast(text, ms) {
  const t = $('#toast');
  t.textContent = '';
  t.append(ic('info'), h('span', { text }));
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms || 2800);
}

function dialog(o) {
  return new Promise(resolve => {
    const field = o.input ? h('input', { type: 'text', maxlength: o.input.max || 60, placeholder: o.input.placeholder || '' }) : null;
    if (field) field.value = o.input.value || '';
    const back = h('div', { class: 'dlg-back' });
    const done = v => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    const no = () => done(field ? null : false);
    const ok = h('button', { class: 'btn ' + (o.danger ? 'btn-danger-solid' : 'btn-accent'), text: o.okText || 'Aceptar', onclick: () => done(field ? field.value.trim() : true) });
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); no(); }
      else if (e.key === 'Enter' && field && document.activeElement === field) { e.preventDefault(); ok.click(); }
    };
    document.addEventListener('keydown', onKey, true);
    back.addEventListener('mousedown', e => { if (e.target === back) no(); });
    back.append(h('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true' }, [
      o.title ? h('h2', {}, [ic(o.icon || (o.danger ? 'alert' : 'info')), h('span', { text: o.title })]) : null,
      o.text ? h('p', { text: o.text }) : null,
      field,
      h('div', { class: 'dlg-actions' }, [h('button', { class: 'btn', text: o.cancelText || 'Cancelar', onclick: no }), ok])
    ]));
    document.body.append(back);
    (field || ok).focus();
    if (field) field.select();
  });
}
const uiConfirm = (title, text, opts) => dialog(Object.assign({ title, text }, opts || {}));
const uiPrompt = (title, value, opts) => dialog(Object.assign({ title, input: { value, max: (opts && opts.max) || 40, placeholder: opts && opts.placeholder } }, opts || {}));

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function fmtTime(sec) { const m = Math.round(sec / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
function fmtMin(min) { return fmtTime((Number(min) || 0) * 60); }
const NF = new Intl.NumberFormat('es-ES');
function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

// Precio en dinero real con el formato elegido en "Robux y dinero".
function moneyText(robux, r) {
  if (!r || r.error || !r.perRobux || robux === null || robux === undefined) return '';
  const v = robux * r.perRobux;
  const d = settings['money.decimals'];
  const digits = d === '0' ? 0 : d === '2' ? 2 : (v >= 100 ? 0 : 2);
  const o = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  const txt = r.currency ? new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: r.currency }, o)).format(v)
    : v.toLocaleString('es-ES', o) + ' ' + (r.symbol || '¤');
  const st = settings['money.style'];
  return st === 'paren' ? '(' + txt + ')' : st === 'plain' ? txt : '≈ ' + txt;
}

// ---------- Ajustes ----------
let settings = {};
let saveTimer = null, savePending = false;
// Copia de lo último que hay guardado: sirve para distinguir los cambios hechos en otra ventana de los nuestros.
let savedCopy = {};
function rememberSaved() { savedCopy = JSON.parse(JSON.stringify(settings)); }
function save() {
  window.__rkLastSave = Date.now();
  savePending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
}
async function flushSave() {
  clearTimeout(saveTimer);
  if (!savePending) return;
  savePending = false;
  window.__rkLastSave = Date.now();
  rememberSaved();
  await B.storage.local.set({ settings });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

const SECTION_BY_ID = {};
const KEY_SECTION = {};
RX_SECTIONS.forEach(sec => {
  SECTION_BY_ID[sec.id] = sec;
  sec.cards.forEach(card => (card.items || []).forEach(it => {
    if (it.key && !KEY_SECTION[it.key]) KEY_SECTION[it.key] = sec;
    if (it.type === 'flags') it.options.forEach(o => { KEY_SECTION[o[0]] = KEY_SECTION[o[0]] || sec; });
  }));
});
function itemOf(key) {
  for (const sec of RX_SECTIONS) for (const card of sec.cards) for (const it of card.items || []) if (it.key === key) return it;
  return null;
}
function sectionKeys(sec) {
  const keys = [];
  sec.cards.forEach(card => (card.items || []).forEach(it => {
    if (it.key) keys.push(it.key);
    if (it.type === 'flags') it.options.forEach(o => keys.push(o[0]));
  }));
  return Array.from(new Set(keys));
}
const clone = v => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);

// Controles pintados en pantalla: cada uno sabe repintarse cuando cambia "su" clave.
const syncs = [];
const visRules = [];
function onSync(keys, el, fn) { syncs.push({ keys, el, fn }); fn(); }
function onVis(el, test) { visRules.push({ el, test }); }
function syncKeys(keys, src) {
  for (let i = syncs.length - 1; i >= 0; i--) {
    const s = syncs[i];
    if (!s.el.isConnected) { syncs.splice(i, 1); continue; }
    if (s.el === src) continue;
    if (!keys || s.keys.some(k => keys.includes(k))) s.fn();
  }
  refreshVisibility();
}
function syncAll() { syncKeys(null); refreshSections(); }
// Compatibilidad con las pantallas que piden repintar los ajustes.
function renderSettings() { syncAll(); }

let parentOf = null;
function cond(p, depth = 0) {
  if (!p) return true;
  const key = Array.isArray(p) ? p[0] : String(p).replace(/^!/, '');
  let ok;
  if (Array.isArray(p)) ok = String(settings[p[0]]) === String(p[1]);
  else {
    const v = settings[key];
    const on = Array.isArray(v) ? v.length > 0 : !!v;
    ok = p[0] === '!' ? !on : on;
  }
  // Una opción solo se ve si también se ve aquella de la que depende (una "nieta" con el "abuelo" apagado no sale).
  if (!parentOf) { parentOf = {}; rxAllItems().forEach(({ item }) => { if (item.parent) parentOf[item.key] = item.parent; }); }
  return ok && (depth > 8 || !parentOf[key] || cond(parentOf[key], depth + 1));
}
function refreshVisibility() {
  for (let i = visRules.length - 1; i >= 0; i--) {
    const r = visRules[i];
    if (!r.el.isConnected) { visRules.splice(i, 1); continue; }
    r.el.hidden = !r.test();
  }
  // Tarjetas cuyas filas están todas ocultas.
  $$('#pages .group').forEach(g => {
    const rows = g.querySelectorAll(':scope > .card.rows > .row');
    if (rows.length) g.classList.toggle('all-hidden', Array.from(rows).every(r => r.hidden));
  });
}

function setValue(key, value, src) {
  settings[key] = value;
  save();
  syncKeys([key], src);
  afterChange(key);
}

let reloadTimer = null;
function afterChange(key) {
  if (/^(theme|icons)\./.test(key)) { applyPageTheme(); if (window.__pvRefresh) window.__pvRefresh(); }
  if (key === 'nav.settingsTab') showHint();
  if (key === 'opts.density') applyDensity();
  refreshSections();
  const sec = KEY_SECTION[key];
  if (sec && sec.load && sec.id !== 'themes' && sec.id !== 'icons' && sec.id === shown && !searching) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(async () => { await flushSave(); runLoaders(sec.id); }, 300);
  }
}

// Texto de un deslizador: "1 h 30 min", "40 %", "Sin límite"...
function fmtVal(it, v) {
  const n = Number(v);
  if (it.zero && n === 0) return it.zero;
  const num = (Math.round(n * 10) / 10).toLocaleString('es-ES');
  if (it.unit === 'min') {
    if (n < 60) return num + ' min';
    const hh = Math.floor(n / 60), mm = Math.round(n % 60);
    return hh + ' h' + (mm ? ' ' + mm + ' min' : '');
  }
  if (!it.unit) return num;
  return num + (it.unit === '%' ? ' %' : ' ' + it.unit);
}

let uidSeq = 0;
const CTL = {};

CTL.bool = (it, id) => {
  const input = h('input', { type: 'checkbox', class: 'switch', id, 'aria-label': it.label });
  input.addEventListener('change', () => setValue(it.key, input.checked, input));
  onSync([it.key], input, () => { input.checked = !!settings[it.key]; });
  return input;
};

CTL.select = (it, id) => {
  const opts = typeof it.options === 'function' ? it.options() : it.options;
  const sel = h('select', { id }, opts.map(o => h('option', { value: String(o[0]), text: o[1] })));
  sel.addEventListener('change', () => { const o = opts.find(x => String(x[0]) === sel.value); setValue(it.key, o ? o[0] : sel.value, sel); });
  onSync([it.key], sel, () => { sel.value = String(settings[it.key]); if (sel.selectedIndex < 0) sel.value = String(it.default); });
  return sel;
};

CTL.seg = it => {
  const box = h('div', { class: 'segc', role: 'radiogroup', 'aria-label': it.label || '' });
  const btns = it.options.map(o => {
    const b = h('button', { type: 'button', role: 'radio', text: o[1], onclick: () => setValue(it.key, o[0]) });
    b.dataset.v = String(o[0]);
    box.append(b);
    return b;
  });
  onSync([it.key], box, () => btns.forEach(b => {
    const on = b.dataset.v === String(settings[it.key]);
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  }));
  return box;
};

CTL.range = (it, id) => {
  const input = h('input', { type: 'range', id, min: it.min, max: it.max, step: it.step || 1 });
  const out = h('output');
  input.addEventListener('input', () => { out.textContent = fmtVal(it, input.value); settings[it.key] = Number(input.value); save(); });
  input.addEventListener('change', () => setValue(it.key, Number(input.value), input));
  const box = h('span', { class: 'range' }, [input, out]);
  onSync([it.key], box, () => { input.value = settings[it.key]; out.textContent = fmtVal(it, settings[it.key]); });
  return box;
};

CTL.number = (it, id) => {
  const input = h('input', { type: 'number', id, min: it.min, max: it.max, step: it.step || 1, placeholder: it.empty || '' });
  const upd = () => { const v = Number(settings[it.key]) || 0; input.value = it.empty && !v ? '' : String(v); };
  input.addEventListener('change', () => {
    const raw = input.value.trim().replace(',', '.');
    let n = raw === '' ? (it.empty ? 0 : it.default) : Number(raw);
    if (!isFinite(n)) n = it.default;
    n = Math.min(it.max ?? n, Math.max(it.min ?? n, n));
    if (it.step !== 'any') n = Math.round(n);
    setValue(it.key, n, input);
    upd();
  });
  onSync([it.key], input, upd);
  return input;
};

CTL.text = (it, id) => {
  const input = h('input', { type: 'text', id, maxlength: it.max || 200, placeholder: it.placeholder || '', spellcheck: 'false', autocomplete: 'off' });
  input.addEventListener('input', () => setValue(it.key, input.value, input));
  onSync([it.key], input, () => { input.value = settings[it.key] || ''; });
  return input;
};

CTL.textarea = (it, id) => {
  const ta = h('textarea', { id, spellcheck: 'false', rows: 6, placeholder: it.placeholder || '' });
  ta.addEventListener('input', () => setValue(it.key, ta.value, ta));
  onSync([it.key], ta, () => { ta.value = settings[it.key] || ''; });
  return ta;
};

CTL.time = (it, id) => {
  const input = h('input', { type: 'time', id });
  input.addEventListener('change', () => { if (input.value) setValue(it.key, input.value, input); });
  onSync([it.key], input, () => { input.value = settings[it.key] || it.default; });
  return input;
};

CTL.color = (it, id) => {
  const input = h('input', { type: 'color', id });
  input.addEventListener('input', () => { settings[it.key] = input.value; save(); });
  input.addEventListener('change', () => setValue(it.key, input.value, input));
  onSync([it.key], input, () => { input.value = rkHex(settings[it.key]) || it.default; });
  return input;
};

// Atajo de teclado: se pulsa la combinación y se guarda.
CTL.hotkey = (it, id) => {
  const btn = h('button', { type: 'button', class: 'hotkey', id, title: 'Pulsa para cambiar el atajo' });
  const clear = ibtn('x', '', { class: 'btn btn-icon btn-ghost', title: 'Quitar el atajo', onclick: () => setValue(it.key, '') });
  let listening = false;
  const draw = () => {
    btn.textContent = '';
    if (listening) { btn.classList.add('listening'); btn.append(h('span', { text: 'Pulsa las teclas…' })); return; }
    btn.classList.remove('listening');
    const v = settings[it.key];
    if (!v) btn.append(h('span', { class: 'muted', text: 'Sin atajo' }));
    else String(v).split('+').forEach((k, i) => { if (i) btn.append('+'); btn.append(h('kbd', { text: k })); });
    clear.hidden = !v;
  };
  const stop = () => { listening = false; document.removeEventListener('keydown', onKey, true); draw(); };
  const onKey = e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { stop(); return; }
    if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.altKey && !e.metaKey) { stop(); setValue(it.key, ''); return; }
    const combo = rcHotkeyFromEvent(e);
    if (!combo) return;
    if (!/[+]/.test(combo) && combo.length === 1) { toast('Combínala con Ctrl, Alt o Shift para que no salte al escribir.'); return; }
    stop();
    setValue(it.key, combo);
  };
  btn.addEventListener('click', () => {
    if (listening) { stop(); return; }
    listening = true;
    draw();
    document.addEventListener('keydown', onKey, true);
  });
  btn.addEventListener('blur', () => { if (listening) stop(); });
  const box = h('span', { class: 'hotkey-box' }, [btn, clear]);
  onSync([it.key], box, draw);
  return box;
};

// Varias opciones a la vez (fichas).
CTL.multi = it => {
  const box = h('div', { class: 'chipset', role: 'group', 'aria-label': it.label || '' });
  const val = () => (Array.isArray(settings[it.key]) ? settings[it.key] : []);
  const btns = it.options.map(o => {
    const b = h('button', { type: 'button', class: 'chip-opt' }, [o[2] ? ic(o[2]) : null, h('span', { text: o[1] })]);
    b.addEventListener('click', () => {
      const cur = val();
      const on = cur.includes(o[0]);
      if (on && it.min && cur.length <= it.min) { toast(it.min === 1 ? 'Deja al menos una.' : 'Deja al menos ' + it.min + '.'); return; }
      if (!on && it.max && cur.length >= it.max) { toast('Como mucho ' + it.max + '. Quita otra antes.'); return; }
      setValue(it.key, it.options.map(x => x[0]).filter(x => (x === o[0] ? !on : cur.includes(x))));
    });
    box.append(b);
    return [o[0], b];
  });
  onSync([it.key], box, () => {
    const cur = val();
    btns.forEach(([v, b]) => {
      const on = cur.includes(v);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('maxed', !on && !!it.max && cur.length >= it.max);
    });
  });
  return box;
};

// Varias claves de sí/no presentadas como fichas.
CTL.flags = it => {
  const box = h('div', { class: 'chipset', role: 'group', 'aria-label': it.label || '' });
  const btns = it.options.map(o => {
    const b = h('button', { type: 'button', class: 'chip-opt', onclick: () => setValue(o[0], !settings[o[0]]) }, [o[2] ? ic(o[2]) : null, h('span', { text: o[1] })]);
    box.append(b);
    return [o[0], b];
  });
  onSync(it.options.map(o => o[0]), box, () => btns.forEach(([k, b]) => { b.classList.toggle('on', !!settings[k]); b.setAttribute('aria-pressed', String(!!settings[k])); }));
  return box;
};

// Lista de textos (palabras, amigos...).
CTL.tags = (it, id) => {
  const val = () => (Array.isArray(settings[it.key]) ? settings[it.key] : []);
  const list = h('span', { class: 'tag-list' });
  const input = h('input', { type: 'text', id, maxlength: 60, placeholder: it.placeholder || 'Escribe y pulsa Intro', autocomplete: 'off', spellcheck: 'false' });
  const add = raw => {
    const parts = String(raw).split(',').map(x => x.trim()).filter(Boolean);
    if (!parts.length) return;
    const cur = val().slice();
    parts.forEach(p => { if (cur.length < 200 && !cur.some(c => rcFold(c) === rcFold(p))) cur.push(p.slice(0, 40)); });
    setValue(it.key, cur);
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); input.value = ''; }
    else if (e.key === 'Backspace' && !input.value && val().length) setValue(it.key, val().slice(0, -1));
  });
  input.addEventListener('input', () => {
    if (!input.value.includes(',')) return;
    const parts = input.value.split(',');
    input.value = parts.pop();
    add(parts.join(','));
  });
  input.addEventListener('blur', () => { if (input.value.trim()) { add(input.value); input.value = ''; } });
  const box = h('div', { class: 'tagbox' }, [list, input]);
  box.addEventListener('mousedown', e => { if (e.target === box || e.target === list) { e.preventDefault(); input.focus(); } });
  onSync([it.key], box, () => {
    list.textContent = '';
    val().forEach((t, i) => list.append(h('span', { class: 'tag-pill' }, [
      h('span', { text: t }),
      h('button', { type: 'button', title: 'Quitar', onclick: () => setValue(it.key, val().filter((_, j) => j !== i)) }, [ic('x')])
    ])));
  });
  return box;
};

// Lista ordenable: cada fila con su interruptor. Se arrastra o se mueve con las flechas (o Alt + flechas).
CTL.order = it => {
  const byId = {};
  it.options.forEach(o => { byId[o[0]] = o; });
  const norm = () => {
    const v = (Array.isArray(settings[it.key]) ? settings[it.key] : []).filter(x => byId[x]);
    it.options.forEach(o => { if (!v.includes(o[0])) v.push(o[0]); });
    return v;
  };
  const box = h('div', { class: 'order' });
  let drag = null, focusId = null;
  const draw = () => {
    box.textContent = '';
    const v = norm();
    v.forEach((id, i) => {
      const o = byId[id];
      const sw = h('input', { type: 'checkbox', class: 'switch', 'aria-label': o[1] });
      sw.checked = !!settings[o[3]];
      sw.addEventListener('change', () => setValue(o[3], sw.checked));
      const move = d => {
        const n = norm();
        const j = i + d;
        if (j < 0 || j >= n.length) return;
        [n[i], n[j]] = [n[j], n[i]];
        focusId = id;
        setValue(it.key, n);
      };
      const row = h('div', { class: 'order-row' + (settings[o[3]] ? '' : ' off'), draggable: 'true', tabindex: '0', 'data-id': id }, [
        h('span', { class: 'grip', title: 'Arrastra para mover' }, [ic('grip')]),
        h('span', { class: 'order-ic' }, [ic(o[2] || 'dot')]),
        h('span', { class: 'order-label', text: o[1] }),
        h('span', { class: 'order-move' }, [
          ibtn('arrowUp', '', { class: 'btn btn-icon btn-ghost', title: 'Subir', disabled: i === 0, onclick: () => move(-1) }),
          ibtn('arrowDown', '', { class: 'btn btn-icon btn-ghost', title: 'Bajar', disabled: i === v.length - 1, onclick: () => move(1) })
        ]),
        sw
      ]);
      row.addEventListener('keydown', e => {
        if (e.target !== row || !e.altKey) return;
        if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      });
      row.addEventListener('dragstart', e => {
        drag = id;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
      });
      row.addEventListener('dragend', () => { drag = null; box.querySelectorAll('.order-row').forEach(r => r.classList.remove('dragging', 'drop-before', 'drop-after')); });
      row.addEventListener('dragover', e => {
        if (!drag || drag === id) return;
        e.preventDefault();
        const r = row.getBoundingClientRect();
        const after = e.clientY > r.top + r.height / 2;
        row.classList.toggle('drop-after', after);
        row.classList.toggle('drop-before', !after);
      });
      row.addEventListener('dragleave', () => row.classList.remove('drop-before', 'drop-after'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        if (!drag || drag === id) return;
        const after = row.classList.contains('drop-after');
        const n = norm().filter(x => x !== drag);
        n.splice(n.indexOf(id) + (after ? 1 : 0), 0, drag);
        setValue(it.key, n);
      });
      box.append(row);
    });
    if (focusId) {
      const r = box.querySelector('.order-row[data-id="' + focusId + '"]');
      focusId = null;
      if (r) r.focus();
    }
  };
  onSync([it.key].concat(it.options.map(o => o[3])), box, draw);
  return box;
};

// Botones de acción del esquema.
const ACTIONS = {
  pollNow: async () => { await send('social:poll'); toast('Consultado.'); },
  fxRefresh: async () => {
    const r = await send('fx:refresh');
    toast(r && r.updated ? 'Cambio actualizado (' + new Date(r.updated).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) + ').' : 'No se pudo actualizar el cambio ahora mismo.');
  },
  reroll: async () => {
    await flushSave();
    await send('challenges:reroll');
    toast('Retos cambiados. Suerte con los nuevos.');
    if (TAB_LOADERS.challenges) TAB_LOADERS.challenges();
  },
  confettiTest: () => {
    const opts = rcConfettiFor(Object.assign({}, settings, { 'fun.confetti': true }), null) || {};
    if (!rcConfetti(opts)) toast('Tu sistema tiene activado "reducir movimiento", así que el confeti no sale.');
  },
  notifyTest: async () => { await send('notify:test'); toast('Notificación enviada.'); },
  clearSearchHistory: async () => { await B.storage.local.remove('searchHistory'); toast('Búsquedas recientes borradas.'); }
};
CTL.action = it => {
  const b = ibtn(it.icon || 'zap', it.label, { class: 'btn' });
  b.addEventListener('click', async () => {
    const fn = ACTIONS[it.action];
    if (!fn) return;
    b.disabled = true;
    try { await fn(); } catch (e) { toast(e.message); }
    b.disabled = false;
  });
  return b;
};

const WIDE = ['multi', 'tags', 'order', 'textarea', 'flags'];
function buildRow(it, cardKeys, opts) {
  if (it.type === 'hidden' || !CTL[it.type]) return null;
  const id = 'o' + (++uidSeq);
  const ctl = CTL[it.type](it, id);
  let row;
  if (it.type === 'action') {
    row = h('div', { class: 'row row-action' }, [ctl, it.help ? h('span', { class: 'row-help', text: it.help }) : null]);
  } else {
    const hasFor = ctl.id === id || !!ctl.querySelector('#' + id);
    row = h('div', { class: 'row' + (WIDE.includes(it.type) ? ' row-stack' : '') }, [
      h('div', { class: 'row-text' }, [
        h(hasFor ? 'label' : 'div', { class: 'row-label', for: hasFor ? id : null, text: it.label || '' }),
        it.help ? h('div', { class: 'row-help', text: it.help }) : null
      ]),
      h('div', { class: 'row-ctl' }, [ctl])
    ]);
  }
  if (it.key) row.dataset.key = it.key;
  if (it.parent && !(opts && opts.search)) {
    onVis(row, () => cond(it.parent));
    const pk = Array.isArray(it.parent) ? it.parent[0] : String(it.parent).replace(/^!/, '');
    if (cardKeys && cardKeys.includes(pk)) row.classList.add('sub');
  }
  return row;
}

function groupHead(title, icon, actions, id) {
  if (!title) return null;
  return h('div', { class: 'group-head', id: id ? 'head-' + id : null }, [
    h('h3', {}, [icon ? ic(icon) : null, h('span', { text: title }), h('span', { class: 'group-sub' })]),
    actions || null
  ]);
}
// Texto extra junto al título de un panel ("últimos 30 días"...).
function setPanelSub(panelId, text) {
  const s = document.querySelector('#head-' + panelId + ' .group-sub');
  if (s) s.textContent = text ? ' · ' + text : '';
}

function buildCard(card, sec) {
  if (card.panel) {
    const p = document.getElementById(card.panel);
    if (!p) return null;
    const actions = p.querySelector(':scope > .panel-actions');
    // El icono del panel va en su título; se quita del panel para que paintIcons no lo pinte también dentro.
    const icon = p.dataset.icon;
    delete p.dataset.icon;
    p.dataset.headIcon = icon || '';
    const g = h('div', { class: 'group group-panel', 'data-panel': card.panel }, [
      groupHead(p.dataset.title, icon, actions, card.panel),
      p.dataset.bare ? p : h('div', { class: 'card' }, [p])
    ]);
    if (card.parent) onVis(g, () => cond(card.parent));
    return g;
  }
  if (card.links) {
    const box = h('div', { class: 'card links' }, card.links.map(([target, label]) => {
      const t = SECTION_BY_ID[target];
      return h('a', { class: 'link-row', href: '#' + target }, [ic(t ? t.icon : 'link'), h('span', { class: 'grow', text: label }), h('span', { class: 'muted small', text: t ? t.title : '' }), ic('chevronRight')]);
    }));
    return h('div', { class: 'group always' }, [groupHead(card.title, card.icon), box]);
  }
  const items = (card.items || []).filter(it => it.type !== 'hidden' && !(it.key && it.key === sec.master));
  if (!items.length) return null;
  const keys = (card.items || []).map(it => it.key).filter(Boolean);
  const box = h('div', { class: 'card rows' });
  items.forEach(it => { const r = buildRow(it, keys); if (r) box.append(r); });
  return h('div', { class: 'group' + (card.always || !sec.master ? ' always' : ' needs-master') }, [groupHead(card.title, card.icon), box]);
}

function buildPage(sec) {
  const master = sec.master ? itemOf(sec.master) : null;
  let head;
  if (master) {
    const id = 'm-' + sec.id;
    const sw = CTL.bool(master, id);
    sw.classList.add('switch-lg');
    head = h('label', { class: 'page-master', for: id, title: master.label }, [h('span', { class: 'page-master-text' }), sw]);
  }
  const page = h('section', { class: 'page', 'data-section': sec.id, hidden: true }, [
    h('header', { class: 'page-head' }, [
      h('span', { class: 'page-ic' }, [ic(sec.icon)]),
      h('div', { class: 'page-titles' }, [h('h1', { text: sec.title }), h('p', { class: 'page-desc', text: sec.desc || '' })]),
      head || null
    ]),
    master ? h('div', { class: 'page-off' }, [ic('info'), h('span', { text: 'Enciende el interruptor de arriba para usar «' + master.label + '».' }),
      h('button', { class: 'btn btn-accent btn-small', type: 'button', text: 'Encender', onclick: () => setValue(sec.master, true) })]) : null
  ]);
  const body = h('div', { class: 'page-body' });
  sec.cards.forEach(card => { const g = buildCard(card, sec); if (g) body.append(g); });
  page.append(body);
  const keys = sectionKeys(sec).filter(k => k !== sec.master);
  if (keys.length) page.append(h('footer', { class: 'page-foot' }, [ibtn('refresh', 'Restablecer esta sección', { class: 'btn btn-ghost btn-small', onclick: () => resetSection(sec) })]));
  return page;
}

async function resetSection(sec) {
  if (!await uiConfirm('¿Restablecer «' + sec.title + '»?', 'Las opciones de esta sección vuelven a como venían. Lo demás no se toca.', { okText: 'Restablecer', icon: 'refresh' })) return;
  sectionKeys(sec).filter(k => k !== sec.master).forEach(k => { settings[k] = clone(RX_DEFAULTS[k]); });
  save();
  syncAll();
  if (/^(themes|icons)$/.test(sec.id)) { applyPageTheme(); if (window.__pvRefresh) window.__pvRefresh(); }
  applyDensity();
  showHint();
  runLoaders(sec.id);
  toast('Sección restablecida.');
}

function buildNav() {
  const nav = $('#nav');
  nav.textContent = '';
  RX_GROUPS.forEach(g => {
    const secs = RX_SECTIONS.filter(s => s.group === g.id);
    if (!secs.length) return;
    nav.append(h('div', { class: 'nav-group', text: g.title }));
    secs.forEach(s => nav.append(h('a', { href: '#' + s.id, 'data-tab': s.id, title: s.desc || s.title }, [ic(s.icon), h('span', { class: 'nav-label', text: s.title })])));
  });
}

// Secciones apagadas: atenuadas en el menú y con el aviso de "apagado" en su página.
function refreshSections() {
  RX_SECTIONS.forEach(sec => {
    if (!sec.master) return;
    const on = !!settings[sec.master];
    const a = $('#nav a[data-tab="' + sec.id + '"]');
    if (a) a.classList.toggle('off', !on);
    const page = $('#pages .page[data-section="' + sec.id + '"]');
    if (!page) return;
    page.classList.toggle('is-off', !on);
    const t = page.querySelector('.page-master-text');
    if (t) t.textContent = on ? 'Activado' : 'Desactivado';
  });
}

function applyDensity() { document.documentElement.classList.toggle('dense', settings['opts.density'] === 'compact'); }

// ---------- Secciones (navegación) ----------
const TAB_LOADERS = {};
const ALIASES = { settings: 'start', funciones: 'start', calc: 'trades', calculadora: 'trades', notas: 'notes' };
let shown = null, lastSection = 'themes', searching = false;

function resolveSection(name) {
  let id = String(name || '').toLowerCase().replace(/[^a-z-]/g, '');
  id = ALIASES[id] || id;
  if (!id || id === 'start') {
    const st = settings['opts.start'];
    id = st && st !== 'last' ? st : lastSection;
  }
  return SECTION_BY_ID[id] ? id : 'themes';
}
function currentTab() { return shown || resolveSection((location.hash || '').slice(1)); }

function runLoaders(id) {
  const sec = SECTION_BY_ID[id];
  (sec && sec.load || []).forEach(n => {
    const f = TAB_LOADERS[n];
    if (f) Promise.resolve().then(f).catch(e => toast(e.message));
  });
}

function showTab() {
  const raw = (location.hash || '').slice(1);
  const id = resolveSection(raw);
  if (raw !== id) history.replaceState(null, '', '#' + id);
  if (searching) endSearch();
  const changed = shown !== id;
  shown = id;
  $$('#pages > .page').forEach(p => { p.hidden = p.dataset.section !== id; });
  $('#search-page').hidden = true;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === id));
  const sec = SECTION_BY_ID[id];
  $('#topbar-title').textContent = sec.title;
  document.title = sec.title + ' · RoCer0';
  document.documentElement.classList.remove('side-open');
  keepInNav($('#nav a.active'));
  if (changed) window.scrollTo(0, 0);
  runLoaders(id);
  lastSection = id;
  B.storage.local.set({ optsLastSection: id }).catch(() => {});
  if (EMBED) window.parent.postMessage({ rocer0: 'tab', tab: id }, '*');
}
window.addEventListener('hashchange', showTab);

// Desplaza solo el menú (no la página de Roblox que contiene el marco) para que se vea la sección activa.
function keepInNav(a) {
  const nav = $('#nav');
  if (!a || !nav) return;
  const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect();
  if (r.top < n.top) nav.scrollTop -= n.top - r.top + 8;
  else if (r.bottom > n.bottom) nav.scrollTop += r.bottom - n.bottom + 8;
}

// Lleva a una sección y resalta una parte de ella.
function goTo(sectionId, selector) {
  if (location.hash.slice(1) !== sectionId || searching) {
    if (searching) endSearch();
    if (location.hash.slice(1) === sectionId) showTab(); else location.hash = sectionId;
  }
  if (!selector) return;
  setTimeout(() => {
    const el = $('#pages .page[data-section="' + sectionId + '"] ' + selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, r.top + window.scrollY - (window.innerHeight - Math.min(r.height, window.innerHeight)) / 2), behavior: 'smooth' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1600);
  }, 60);
}

if (EMBED) {
  document.documentElement.classList.add('embed');
  // Roblox pide una sección concreta (desde el popup, la rueda dentada...).
  window.addEventListener('message', e => {
    if (!ROBLOX_ORIGIN.test(e.origin) || !e.data || e.data.rocer0 !== 'show') return;
    const id = resolveSection(e.data.tab);
    if (searching) endSearch();
    if (id !== currentTab()) location.hash = id;
  });
}

// ---------- Buscador ----------
let INDEX = null;
function optionText(it) {
  try {
    const opts = typeof it.options === 'function' ? it.options() : it.options;
    return (opts || []).map(o => o[1]).join(' ');
  } catch (e) { return ''; }
}
function buildIndex() {
  INDEX = [];
  RX_SECTIONS.forEach(sec => {
    INDEX.push({ kind: 'section', sec, text: rcFold([sec.title, sec.desc, sec.keywords || ''].join(' ')) });
    sec.cards.forEach(card => {
      if (card.panel) {
        const p = document.getElementById(card.panel);
        if (p && p.dataset.title) INDEX.push({ kind: 'panel', sec, card, title: p.dataset.title, icon: p.dataset.headIcon || p.dataset.icon, text: rcFold([p.dataset.title, card.keywords || '', sec.title, sec.keywords || ''].join(' ')) });
        return;
      }
      (card.items || []).forEach(it => {
        if (it.type === 'hidden' || !CTL[it.type]) return;
        INDEX.push({ kind: 'item', sec, card, it, text: rcFold([it.label, it.help || '', card.title || '', sec.title, optionText(it)].join(' ')) });
      });
    });
  });
}

function doSearch(q) {
  const tokens = rcFold(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) { endSearch(); return; }
  if (!INDEX) buildIndex();
  searching = true;
  const match = e => tokens.every(t => e.text.includes(t));
  const found = INDEX.filter(match);
  $$('#pages > .page').forEach(p => { p.hidden = true; });
  $('#search-page').hidden = false;
  $$('#nav a').forEach(a => a.classList.remove('active'));
  const box = $('#search-results');
  box.textContent = '';
  $('#search-title').textContent = 'Resultados de «' + q.trim() + '»';
  const secs = found.filter(e => e.kind === 'section');
  const rest = found.filter(e => e.kind !== 'section');
  const n = rest.length + secs.length;
  $('#search-count').textContent = n ? (n === 1 ? '1 resultado' : n + ' resultados') : '';
  if (!n) {
    box.append(h('div', { class: 'empty big' }, [ic('search'), h('span', { text: 'Nada coincide. Prueba con otra palabra.' })]));
    return;
  }
  if (secs.length) {
    box.append(h('div', { class: 'group' }, [groupHead('Secciones', 'layers'), h('div', { class: 'card links' }, secs.map(e =>
      h('a', { class: 'link-row', href: '#' + e.sec.id, onclick: ev => { ev.preventDefault(); goTo(e.sec.id); } }, [ic(e.sec.icon), h('span', { class: 'grow', text: e.sec.title }), h('span', { class: 'muted small', text: e.sec.desc }), ic('chevronRight')])))]));
  }
  const bySec = new Map();
  rest.slice(0, 80).forEach(e => { if (!bySec.has(e.sec)) bySec.set(e.sec, []); bySec.get(e.sec).push(e); });
  bySec.forEach((list, sec) => {
    const card = h('div', { class: 'card rows' });
    list.forEach(e => {
      if (e.kind === 'panel') {
        card.append(h('a', { class: 'link-row', href: '#' + sec.id, onclick: ev => { ev.preventDefault(); goTo(sec.id, '[data-panel="' + e.card.panel + '"]'); } }, [ic(e.icon || 'layers'), h('span', { class: 'grow', text: e.title }), ic('chevronRight')]));
      } else {
        const r = buildRow(e.it, null, { search: true });
        if (r) card.append(r);
      }
    });
    const off = sec.master && !settings[sec.master] && !list.some(e => e.it && e.it.key === sec.master);
    const head = h('div', { class: 'group-head' }, [h('h3', {}, [
      h('a', { href: '#' + sec.id, class: 'sec-link', onclick: ev => { ev.preventDefault(); goTo(sec.id); } }, [ic(sec.icon), h('span', { text: sec.title }), ic('chevronRight')]),
      off ? h('span', { class: 'pill', text: 'Apagada' }) : null
    ])]);
    box.append(h('div', { class: 'group' }, [head, card]));
  });
  refreshVisibility();
}

function endSearch() {
  searching = false;
  $('#q').value = '';
  $('#search-results').textContent = '';
  $('#search-page').hidden = true;
  if (shown) {
    $$('#pages > .page').forEach(p => { p.hidden = p.dataset.section !== shown; });
    $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === shown));
  }
}

let searchTimer = null;
$('#q').addEventListener('input', e => {
  clearTimeout(searchTimer);
  const v = e.target.value;
  searchTimer = setTimeout(() => { if (v.trim()) doSearch(v); else endSearch(); }, 120);
});
$('#q').addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); endSearch(); e.target.blur(); }
  if (e.key === 'Enter') {
    const first = $('#search-results .row input, #search-results .row select, #search-results .row button, #search-results .link-row');
    if (first) { e.preventDefault(); first.focus(); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== '/' || e.ctrlKey || e.altKey || e.metaKey) return;
  const a = document.activeElement;
  if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
  if ($('.dlg-back')) return;
  e.preventDefault();
  document.documentElement.classList.add('side-open');
  $('#q').focus();
  $('#q').select();
});
$('#nav').addEventListener('click', e => {
  const a = e.target.closest('a[data-tab]');
  if (!a) return;
  if (searching) {
    e.preventDefault();
    endSearch();
    if (location.hash.slice(1) === a.dataset.tab) showTab(); else location.hash = a.dataset.tab;
  }
  document.documentElement.classList.remove('side-open');
});

// Menú en pantallas estrechas.
$('#side-open').addEventListener('click', () => document.documentElement.classList.add('side-open'));
$('#side-close').addEventListener('click', () => document.documentElement.classList.remove('side-open'));
$('#side-shade').addEventListener('click', () => document.documentElement.classList.remove('side-open'));

// ---------- Permisos ----------
async function hasPerms() { try { return await B.permissions.contains({ origins: ORIGINS }); } catch (e) { return true; } }
async function requestPerms() {
  try { await B.permissions.request({ origins: ORIGINS }); }
  catch (e) { toast('No se pudo pedir el permiso desde aquí. Abre los ajustes en una pestaña y vuelve a intentarlo.', 5000); }
  checkPerms();
  if (currentTab() === 'data') loadPerms();
}
async function checkPerms() { $('#perm-warning').hidden = await hasPerms(); }
$('#perm-grant').addEventListener('click', requestPerms);
async function loadPerms() {
  const ok = await hasPerms();
  const box = $('#perm-status');
  box.textContent = '';
  box.append(h('span', { class: 'status-line ' + (ok ? 'ok' : 'bad') }, [ic(ok ? 'checkCircle' : 'alert'),
    h('span', { text: ok ? 'Acceso a Roblox, Rolimons, ipinfo.io y open.er-api.com concedido.' : 'Falta el permiso para acceder a esos sitios.' })]));
  if (!ok) box.append(' ', ibtn('shield', 'Dar permiso', { class: 'btn btn-accent', onclick: requestPerms }));
}
TAB_LOADERS.data = loadPerms;

// ---------- Cuentas ----------
async function loadAccounts() {
  const list = $('#acc-list');
  if (!list.childElementCount) list.append(h('p', { class: 'muted', text: 'Cargando…' }));
  try {
    const r = await send('accounts:list');
    list.textContent = '';
    if (!r.accounts.length) list.append(h('div', { class: 'empty' }, [ic('key'), h('span', { text: 'Todavía no hay cuentas guardadas.' })]));
    for (const a of r.accounts) {
      const cur = a.userId === r.current;
      list.append(h('div', { class: 'item acc' + (cur ? ' current' : '') }, [
        h('img', { class: 'thumb round', src: '', alt: '', 'data-uid': a.userId }),
        h('div', { class: 'grow' }, [h('div', {}, [h('b', { text: a.displayName }), h('span', { class: 'muted', text: ' @' + a.name }), cur ? h('span', { class: 'pill', text: 'En uso' }) : null]),
          h('div', { class: 'muted small', text: 'Guardada el ' + new Date(a.savedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) })]),
        cur ? null : ibtn('swap', 'Usar', { class: 'btn btn-accent btn-small', onclick: async () => {
          if (settings['accounts.confirm'] && !await uiConfirm('¿Cambiar a ' + a.name + '?', 'Se recargarán las pestañas de Roblox abiertas.', { okText: 'Cambiar', icon: 'swap' })) return;
          act(() => send('accounts:switch', { userId: a.userId }), 'Ahora usas ' + a.name + '.');
        } }),
        ibtn('trash', '', { class: 'btn btn-icon btn-ghost', title: 'Olvidar esta cuenta', onclick: async () => { if (await uiConfirm('¿Olvidar la cuenta ' + a.name + '?', 'Se borra su sesión guardada de este navegador. No cierra la sesión en Roblox.', { okText: 'Olvidar', danger: true })) act(() => send('accounts:remove', { userId: a.userId }), 'Cuenta olvidada.'); } })
      ]));
    }
    const ids = r.accounts.map(a => a.userId).join(',');
    if (ids) {
      const t = await send('api', { url: 'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + ids + '&size=48x48&format=Png' });
      ((t.data && t.data.data) || []).forEach(x => { const img = list.querySelector('img[data-uid="' + x.targetId + '"]'); if (img && x.imageUrl) img.src = x.imageUrl; });
    }
  } catch (e) { list.textContent = ''; list.append(h('div', { class: 'empty' }, [ic('alert'), h('span', { text: e.message })])); }
}
TAB_LOADERS.accounts = loadAccounts;
async function act(fn, ok) {
  $('#acc-msg').textContent = 'Un momento…';
  try { await fn(); $('#acc-msg').textContent = ok; } catch (e) { $('#acc-msg').textContent = e.message; }
  loadAccounts();
}
$('#acc-save').addEventListener('click', () => act(() => send('accounts:save'), 'Cuenta guardada.'));
$('#acc-add').addEventListener('click', async () => {
  if (await uiConfirm('Añadir otra cuenta', 'Se guardará la cuenta actual y se abrirá la página para entrar con otra.', { okText: 'Seguir', icon: 'key' })) {
    act(() => send('accounts:add'), 'Entra con la otra cuenta en la pestaña nueva y luego pulsa "Guardar la cuenta actual".');
  }
});

// ---------- Estadísticas ----------
const daysText = n => (Number(n) ? 'últimos ' + n + ' días' : 'desde el principio');
function gameLink(g) { return g.placeId ? h('a', { href: 'https://www.roblox.com/games/' + g.placeId, target: '_blank', text: g.name }) : h('span', { text: g.name }); }
// Tabla con barra de proporción en la primera columna de números.
function rankTable(rows, cols) {
  const max = Math.max(1, ...rows.map(r => r.minutes));
  return h('div', { class: 'rank' }, rows.map((r, i) => h('div', { class: 'rank-row' }, [
    h('span', { class: 'rank-n', text: String(i + 1) }),
    h('div', { class: 'grow' }, [gameLink(r), h('div', { class: 'meter' }, [h('i', { style: 'width:' + Math.max(3, Math.round(100 * r.minutes / max)) + '%' })])]),
    ...cols.map(c => h('span', { class: 'muted small rank-v', text: c(r) }))
  ])));
}

async function loadStats() {
  const { timeLog = {}, friendGames = {}, lastSeen = {}, nameCache = {}, lastSeenMeta, myGames = {} } =
    await B.storage.local.get(['timeLog', 'friendGames', 'lastSeen', 'nameCache', 'lastSeenMeta', 'myGames']);
  const nDays = Number(settings['stats.days']) || 14;
  const chart = $('#time-chart');
  chart.textContent = '';
  chart.style.setProperty('--bars', nDays);
  const days = [];
  for (let i = nDays - 1; i >= 0; i--) days.push(dayKey(new Date(Date.now() - i * 86400000)));
  const max = Math.max(60, ...days.map(d => timeLog[d] || 0));
  days.forEach((d, i) => chart.append(h('div', { class: 'bar', title: new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + fmtTime(timeLog[d] || 0) },
    [h('i', { style: 'height:' + (100 * (timeLog[d] || 0) / max) + '%' }), nDays > 14 && i % 2 ? '' : d.slice(8)])));
  const week = days.slice(-7).reduce((a, d) => a + (timeLog[d] || 0), 0);
  const total = days.reduce((a, d) => a + (timeLog[d] || 0), 0);
  setPanelSub('panel-stats-time', daysText(nDays));
  $('#time-summary').textContent = settings['social.trackTime']
    ? 'Hoy: ' + fmtTime(timeLog[days[days.length - 1]] || 0) + ' · Últimos 7 días: ' + fmtTime(week) + ' · Media diaria: ' + fmtTime(total / nDays)
    : 'No se está registrando: enciende «Tu tiempo en roblox.com» más abajo.';

  const gDays = Number(settings['stats.gamesDays']) || 0;
  const since = gDays ? dayKey(new Date(Date.now() - (gDays - 1) * 86400000)) : '';
  const mine = {};
  Object.keys(myGames).filter(k => !since || k >= since).forEach(k => Object.entries(myGames[k] || {}).forEach(([u, g]) => {
    const a = mine[u] = mine[u] || { name: g.name, placeId: g.placeId, minutes: 0 };
    a.minutes += Number(g.minutes) || 0;
    if (g.name) a.name = g.name;
  }));
  const mineTop = Object.values(mine).sort((a, b) => b.minutes - a.minutes).slice(0, Number(settings['stats.gamesCount']) || 15);
  setPanelSub('panel-stats-games', daysText(gDays));
  const mg = $('#my-games');
  mg.textContent = '';
  if (!mineTop.length) mg.append(h('div', { class: 'empty' }, [ic('gamepad'), h('span', { text: settings['home.trackPlaytime'] ? 'Sin datos todavía. RoCer0 apunta lo que juegas mientras el navegador está abierto.' : 'No se está registrando: enciende «Tu tiempo en cada juego» más abajo.' })]));
  else mg.append(rankTable(mineTop, [g => fmtMin(g.minutes)]));

  const fDays = Number(settings['social.statsDays']) || 7;
  const fd = [];
  for (let i = fDays - 1; i >= 0; i--) fd.push(dayKey(new Date(Date.now() - i * 86400000)));
  const agg = {};
  fd.forEach(d => Object.entries(friendGames[d] || {}).forEach(([k, g]) => {
    const a = agg[k] = agg[k] || { name: g.name, placeId: g.placeId, minutes: 0, friends: new Set() };
    a.minutes += g.minutes;
    (g.friends || []).forEach(f => a.friends.add(f));
  }));
  const top = Object.values(agg).sort((a, b) => b.minutes - a.minutes).slice(0, 15);
  setPanelSub('panel-stats-friends', daysText(fDays));
  const fg = $('#friend-games');
  fg.textContent = '';
  if (!top.length) fg.append(h('div', { class: 'empty' }, [ic('users'), h('span', { text: settings['social.trackFriends'] ? 'Sin datos todavía. Deja el navegador abierto un rato.' : 'No se está registrando: enciéndelo en Personas, Amigos.' })]));
  else fg.append(rankTable(top, [g => fmtMin(g.minutes), g => g.friends.size + (g.friends.size === 1 ? ' amigo' : ' amigos')]));

  const ls = $('#last-seen');
  ls.textContent = '';
  const rows = Object.entries(lastSeen).filter(([id]) => nameCache[id]).sort((a, b) => b[1].t - a[1].t).slice(0, Number(settings['social.lastSeenCount']) || 50);
  if (lastSeenMeta) setPanelSub('panel-stats-seen', 'desde el ' + new Date(lastSeenMeta.since).toLocaleDateString('es-ES'));
  if (!rows.length) ls.append(h('div', { class: 'empty' }, [ic('history'), h('span', { text: 'Sin datos todavía.' })]));
  else ls.append(h('table', {}, rows.map(([id, v]) => h('tr', {}, [
    h('td', {}, [h('a', { href: 'https://www.roblox.com/users/' + id + '/profile', target: '_blank', text: nameCache[id].displayName }), h('span', { class: 'muted', text: ' @' + nameCache[id].name })]),
    h('td', { class: 'muted', text: new Date(v.t).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) }), h('td', { text: v.game || '' })
  ]))));
  loadRobux();
}
TAB_LOADERS.stats = loadStats;

$('#poll-now').addEventListener('click', async e => {
  const b = e.currentTarget;
  b.disabled = true;
  try { await send('social:poll'); toast('Consultado.'); } catch (err) { toast(err.message); }
  b.disabled = false;
  loadStats();
});

// Gráfico del saldo de Robux (escalones: el saldo cambia de golpe).
async function loadRobux() {
  const { robuxHistory = {}, me } = await B.storage.local.get(['robuxHistory', 'me']);
  const uid = me && me.id;
  const all = (uid && robuxHistory[uid]) || [];
  const rDays = Number(settings['stats.robuxDays']) || 0;
  const since = rDays ? Date.now() - rDays * 86400000 : 0;
  const pts = all.filter(p => p.t >= since);
  if (since && pts.length && all.length > pts.length) pts.unshift({ t: since, r: all[all.length - pts.length - 1].r });
  setPanelSub('panel-stats-robux', daysText(rDays));
  const box = $('#robux-chart');
  box.textContent = '';
  const sum = $('#robux-summary');
  if (!pts.length) {
    box.append(h('div', { class: 'empty' }, [ic('robux'), h('span', { text: settings['robux.track'] ? 'Sin datos todavía. RoCer0 apunta tu saldo mientras el navegador está abierto, o pulsa "Actualizar".' : 'No se está registrando: enciende «Tu saldo de Robux» más abajo.' })]));
    sum.textContent = '';
    return;
  }
  const now = Date.now();
  const series = pts.concat([{ t: now, r: pts[pts.length - 1].r }]);
  box.append(lineChart(series, v => NF.format(v) + ' R$', box.clientWidth));
  const cur = pts[pts.length - 1].r;
  const monthAgo = all.filter(p => p.t <= now - 30 * 86400000).pop() || pts[0];
  const diff = cur - monthAgo.r;
  const rs = series.map(p => p.r);
  sum.textContent = 'Ahora: ' + NF.format(cur) + ' R$ · En 30 días: ' + (diff >= 0 ? '+' : '') + NF.format(diff) + ' R$ · Máximo: ' + NF.format(Math.max(...rs)) + ' · Mínimo: ' + NF.format(Math.min(...rs));
}
$('#robux-now').addEventListener('click', async e => {
  const b = e.currentTarget;
  b.disabled = true;
  try { const r = await send('robux:now'); toast(r && r.robux !== null ? 'Saldo: ' + NF.format(r.robux) + ' R$' : 'Roblox no ha dado el saldo ahora mismo.'); }
  catch (err) { toast(err.message); }
  b.disabled = false;
  loadRobux();
});

// Se dibuja al ancho real del hueco para que las letras no crezcan al estirarse.
function lineChart(series, fmt, width) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = Math.max(300, Math.round(width || 640)), H = 200, P = { l: 8, r: 8, t: 18, b: 22 };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('class', 'line-svg');
  const mk = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
  const t0 = series[0].t, t1 = series[series.length - 1].t || t0 + 1;
  const vals = series.map(p => p.r);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const pad = (hi - lo) * 0.12;
  lo = Math.max(0, lo - pad); hi += pad;
  const x = t => P.l + (W - P.l - P.r) * ((t - t0) / Math.max(1, t1 - t0));
  const y = v => P.t + (H - P.t - P.b) * (1 - (v - lo) / (hi - lo));
  let d = 'M' + x(series[0].t).toFixed(1) + ' ' + y(series[0].r).toFixed(1);
  for (let i = 1; i < series.length; i++) d += ' H' + x(series[i].t).toFixed(1) + ' V' + y(series[i].r).toFixed(1);
  const grad = mk('defs', {});
  const lg = document.createElementNS(NS, 'linearGradient');
  lg.setAttribute('id', 'rk-area'); lg.setAttribute('x1', '0'); lg.setAttribute('y1', '0'); lg.setAttribute('x2', '0'); lg.setAttribute('y2', '1');
  [['0%', '.35'], ['100%', '0']].forEach(([o, op]) => { const s = document.createElementNS(NS, 'stop'); s.setAttribute('offset', o); s.setAttribute('stop-color', 'var(--rk-accent)'); s.setAttribute('stop-opacity', op); lg.append(s); });
  grad.append(lg);
  [0.25, 0.5, 0.75].forEach(f => mk('line', { x1: P.l, x2: W - P.r, y1: P.t + (H - P.t - P.b) * f, y2: P.t + (H - P.t - P.b) * f, class: 'grid' }));
  mk('path', { d: d + ' V' + (H - P.b) + ' H' + x(series[0].t).toFixed(1) + ' Z', fill: 'url(#rk-area)', class: 'area' });
  mk('path', { d, class: 'line' });
  const last = series[series.length - 1];
  mk('circle', { cx: x(last.t), cy: y(last.r), r: 4, class: 'dot' });
  const txt = (s, xx, yy, anchor) => { const n = mk('text', { x: xx, y: yy, 'text-anchor': anchor || 'start', class: 'lbl' }); n.textContent = s; };
  txt(new Date(t0).toLocaleDateString('es-ES'), P.l, H - 5);
  txt('Hoy', W - P.r, H - 5, 'end');
  txt(fmt(Math.max(...vals)), P.l, P.t - 5);
  return svg;
}
let chartResize;
window.addEventListener('resize', () => {
  clearTimeout(chartResize);
  chartResize = setTimeout(() => { if (currentTab() === 'stats' && !searching) loadRobux(); }, 250);
});

// ---------- Calculadora ----------
let rolis = null;
const sides = { give: [], get: [] };
const DEMAND = ['Pésima', 'Baja', 'Normal', 'Alta', 'Brutal'];
const TREND = ['Bajando', 'Inestable', 'Estable', 'Subiendo', 'Fluctuando'];

function worth(it) { return settings['trade.useValue'] === 'rap' ? it[2] : (it[3] > 0 ? it[3] : it[2]); }

async function loadCalc(force) {
  try {
    rolis = await send('rolimons', { force: !!force });
    $('#calc-source').textContent = 'Valores de Rolimons de las ' + new Date(rolis.t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' · ' + NF.format(Object.keys(rolis.items).length) + ' objetos · calculando con ' + (settings['trade.useValue'] === 'rap' ? 'el RAP' : 'el valor (o el RAP si no tiene)') + '.';
    const dl = $('#calc-items');
    if (!dl.childElementCount || force) {
      dl.textContent = '';
      Object.entries(rolis.items).forEach(([id, it]) => dl.append(h('option', { value: it[0] + (it[1] ? ' [' + it[1] + ']' : '') + ' #' + id })));
    }
    renderCalc();
  } catch (e) { $('#calc-source').textContent = 'No se pudieron cargar los valores: ' + e.message; }
}
TAB_LOADERS.calc = () => loadCalc();

function findItem(q) {
  if (!rolis) return null;
  const idm = /#?(\d{3,})\s*$/.exec(q);
  if (idm && rolis.items[idm[1]]) return idm[1];
  const ql = q.toLowerCase().trim();
  if (!ql) return null;
  for (const [id, it] of Object.entries(rolis.items)) if ((it[1] || '').toLowerCase() === ql || it[0].toLowerCase() === ql) return id;
  for (const [id, it] of Object.entries(rolis.items)) if (it[0].toLowerCase().includes(ql)) return id;
  return null;
}

$$('.calc-side > input').forEach(inp => {
  inp.addEventListener('change', () => {
    const id = findItem(inp.value);
    if (id) { sides[inp.closest('.calc-side').dataset.side].push(id); inp.value = ''; renderCalc(); }
    else if (inp.value.trim()) toast('No encuentro ese objeto en Rolimons.');
  });
});
['robux-give', 'robux-get'].forEach(id => $('#' + id).addEventListener('input', renderCalc));
$('#calc-clear').addEventListener('click', () => { sides.give = []; sides.get = []; $('#robux-give').value = 0; $('#robux-get').value = 0; renderCalc(); });
$('#calc-refresh').addEventListener('click', () => loadCalc(true));

function renderCalc() {
  if (!rolis) return;
  const totals = {};
  ['give', 'get'].forEach(side => {
    const box = document.querySelector('.calc-side[data-side="' + side + '"]');
    const list = box.querySelector('.calc-list');
    list.textContent = '';
    let total = 0, rap = 0;
    sides[side].forEach((id, i) => {
      const it = rolis.items[id];
      total += worth(it); rap += it[2];
      const info = [NF.format(worth(it))];
      if (it[5] >= 0) info.push(DEMAND[it[5]]);
      if (it[6] >= 0) info.push(TREND[it[6]]);
      if (it[9] === 1) info.push('raro');
      if (it[8] === 1) info.push('hypeado');
      list.append(h('div', { class: 'calc-item' }, [
        h('a', { href: 'https://www.rolimons.com/item/' + id, target: '_blank', text: it[0] }),
        h('span', { class: 'calc-info' }, [it[7] === 1 ? h('span', { class: 'warn', title: 'Proyectado: su precio está inflado artificialmente' }, [ic('alert'), ' proyectado · ']) : null, info.join(' · ')]),
        ibtn('x', '', { class: 'btn btn-icon btn-ghost', title: 'Quitar', onclick: () => { sides[side].splice(i, 1); renderCalc(); } })
      ]));
    });
    if (!sides[side].length) list.append(h('div', { class: 'muted small calc-empty', text: 'Sin objetos.' }));
    const robux = Number($('#robux-' + side).value) || 0;
    total += side === 'get' ? Math.floor(robux * 0.7) : robux;
    totals[side] = total;
    box.querySelector('.calc-total').textContent = 'Total ' + NF.format(total) + ' · RAP ' + NF.format(rap);
  });
  const diff = totals.get - totals.give;
  const pct = totals.give ? (100 * diff / totals.give) : 0;
  const res = $('#calc-result');
  res.className = diff > 0 ? 'win' : diff < 0 ? 'loss' : '';
  const any = sides.give.length || sides.get.length || Number($('#robux-give').value) || Number($('#robux-get').value);
  res.textContent = any ? (diff >= 0 ? 'Ganas ' : 'Pierdes ') + NF.format(Math.abs(diff)) + (totals.give ? ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + ' %)' : '') : '';
}

// ---------- Datos ----------
$('#export').addEventListener('click', async () => {
  await flushSave();
  download(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }), 'rocer0-ajustes.json');
});
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('no es un archivo de ajustes');
    settings = rxMergeSettings(data);
    window.__rkLastSave = Date.now();
    rememberSaved();
    await B.storage.local.set({ settings });
    afterSettingsReplaced();
    toast('Ajustes importados.');
  } catch (err) { toast('Archivo no válido: ' + err.message, 4000); }
});
$('#reset').addEventListener('click', async () => {
  if (!await uiConfirm('¿Volver a los ajustes por defecto?', 'Se pierden tus temas propios y tus retoques. Tus fijados, notas, cuentas y estadísticas no se tocan.', { okText: 'Restablecer', danger: true })) return;
  settings = rxMergeSettings({});
  window.__rkLastSave = Date.now();
  rememberSaved();
  await B.storage.local.set({ settings });
  afterSettingsReplaced();
  toast('Ajustes restablecidos.');
});
const STAT_KEYS = ['timeLog', 'lastBeat', 'friendGames', 'lastSeen', 'lastSeenMeta', 'prevPresence', 'groupAnnounced', 'recentServers', 'serverRegions', 'myGames', 'myRecent', 'myJoins',
  'playLog', 'together', 'challenges', 'wellbeing', 'wellbeingAlert', 'wellbeingAlertSeen', 'myServer', 'robuxHistory', 'badgesSeen', 'badgesLog', 'playedEver', 'celebrate',
  'celebrateShown', 'lastPollAt', 'prevSelf', 'nameCache', 'lastGame', 'searchHistory', 'taskTimes', 'tradesSeen'];
$('#clear-stats').addEventListener('click', async () => {
  if (!await uiConfirm('¿Borrar estadísticas y registros?', 'Se borran el tiempo registrado, tu historial de juego, a qué juegan tus amigos, las últimas conexiones, el saldo de Robux guardado, los retos (racha y medallas), los datos del Wrapped y tus búsquedas recientes. Tus temas, fijados, notas, lista de deseos y cuentas no se tocan.', { okText: 'Borrar', danger: true })) return;
  await B.storage.local.remove(STAT_KEYS);
  toast('Borrado.');
});
$('#clear-accounts').addEventListener('click', async () => {
  if (!await uiConfirm('¿Borrar todas las cuentas guardadas?', 'Tu sesión actual en Roblox no se cierra.', { okText: 'Borrar', danger: true })) return;
  await B.storage.local.remove('accounts');
  toast('Cuentas borradas.');
});

function afterSettingsReplaced() {
  syncAll();
  applyPageTheme();
  applyDensity();
  showHint();
  if (window.__pvRefresh) window.__pvRefresh();
  if (shown) runLoaders(shown);
}

// ---------- Tema de la propia página ----------
// Imagen de fondo subida para un tema (con caché: los deslizadores repintan muchas veces por segundo).
const imageCache = new Map();
async function themeImage(id) {
  if (imageCache.has(id)) return imageCache.get(id);
  const k = 'rkImg:' + id;
  const r = await B.storage.local.get([k, 'themeImages']);
  const img = r[k] || (r.themeImages || {})[id] || null;
  imageCache.set(id, img);
  return img;
}

let pageThemeSeq = 0;
async function applyPageTheme() {
  const seq = ++pageThemeSeq;
  const t = settings['theme.extension'] ? rkEffectiveTheme(settings) : rkEffectiveTheme(rxMergeSettings({}), 'medianoche');
  const image = t.bg === 'upload' ? await themeImage(t.id) : null;
  if (seq !== pageThemeSeq) return;
  const p = rkThemeVars(t, { animations: settings['theme.animations'], image });
  // La estructura del tema se ve en la vista previa; aquí solo el cursor y la barra de desplazamiento.
  p.classes = p.classes.filter(c => !c.startsWith('rk-l-') || /^rk-l-(cursor|scrollbar)-/.test(c));
  const root = document.documentElement;
  rkApply(root, p);
  rcApplyIconStyle(root, rcIconStyleOf(settings, t));
  root.style.setProperty('--rc-icon-scale', String(Math.max(50, Math.min(200, Number(settings['icons.scale']) || 100)) / 100));
  const col = rkHex(settings['icons.color'] || '');
  if (col) { root.style.setProperty('--rc-icon-color', col); root.classList.add('rc-ic-colored'); }
  else { root.style.removeProperty('--rc-icon-color'); root.classList.remove('rc-ic-colored'); }
}

// Botón para abrir estos ajustes dentro de Roblox (solo en la página suelta).
function showHint() { $('#open-in-roblox').hidden = EMBED || !settings['nav.settingsTab']; }
$('#open-in-roblox').addEventListener('click', () => send('openSettings', { tab: currentTab() }).catch(e => toast(e.message)));

// ---------- Cambios desde otras ventanas (popup, Roblox) ----------
B.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.iconImages) {
    rcSetCustomIcons(changes.iconImages.newValue || {});
    rcRefreshIcons(document);
  }
  if (changes.themeImages || Object.keys(changes).some(k => k.startsWith('rkImg:'))) { imageCache.clear(); applyPageTheme(); }
  if (!changes.settings) return;
  // Solo se toman las opciones que cambiaron fuera de esta página; si una la estás tocando aquí y aún no se ha guardado, gana la tuya.
  const nv = rxMergeSettings(changes.settings.newValue);
  const J = v => JSON.stringify(v);
  let outside = false;
  Object.keys(nv).forEach(k => {
    if (J(nv[k]) === J(savedCopy[k])) return;
    if (J(settings[k]) === J(savedCopy[k]) && J(settings[k]) !== J(nv[k])) { settings[k] = nv[k]; outside = true; }
  });
  savedCopy = JSON.parse(J(nv));
  if (!outside) return;
  const a = document.activeElement;
  const typing = a && (/^(INPUT|TEXTAREA)$/.test(a.tagName) && !/^(checkbox|range|color)$/.test(a.type));
  if (!typing) syncAll(); else refreshSections();
  applyPageTheme();
  applyDensity();
  showHint();
  const tab = currentTab();
  if (['themes', 'icons'].includes(tab) && TAB_LOADERS[tab]) TAB_LOADERS[tab]();
});

// Arranque (lo llama start.js cuando ya están cargadas todas las pantallas).
async function startOptions() {
  const stored = await B.storage.local.get(['settings', 'iconImages', 'optsLastSection']);
  settings = rxMergeSettings(stored.settings);
  rememberSaved();
  if (stored.optsLastSection && SECTION_BY_ID[stored.optsLastSection]) lastSection = stored.optsLastSection;
  rcSetCustomIcons(stored.iconImages || {});
  const version = 'v' + B.runtime.getManifest().version;
  $('#version').textContent = version;
  $('#about-version').textContent = version;
  buildNav();
  const pages = $('#pages');
  RX_SECTIONS.forEach(sec => pages.append(buildPage(sec)));
  paintIcons(document);
  applyDensity();
  await applyPageTheme();
  syncAll();
  showHint();
  checkPerms();
  showTab();
  document.documentElement.classList.add('ready');
  if (EMBED) window.parent.postMessage({ rocer0: 'ready' }, '*');
}
