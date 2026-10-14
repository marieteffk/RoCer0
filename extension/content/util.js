// Utilidades compartidas por todos los módulos de contenido.
var RX = (function () {
  var B = globalThis.browser || globalThis.chrome;
  var meCache = null;
  var launcherReady = false;

  function send(type, data) {
    return new Promise(function (resolve, reject) {
      var msg = Object.assign({ type: type }, data || {});
      B.runtime.sendMessage(msg, function (res) {
        var err = B.runtime.lastError;
        if (err) return reject(new Error(err.message));
        if (!res) return reject(new Error('Sin respuesta del fondo de la extensión'));
        if (res.error) return reject(new Error(res.error));
        resolve(res.result);
      });
    });
  }

  // Las peticiones a Roblox las hace el fondo de la extensión con las cookies normales del navegador. Si la pestaña va
  // con otra sesión (contenedores de Firefox, ventana privada) el fondo no la ve: entonces se piden desde la propia
  // página, con su sesión. Solo a roblox.com.
  var viaPage = false, pageCsrf = null;
  async function fromPage(url, opts) {
    if (!/^https:\/\/([a-z0-9-]+\.)*roblox\.com\//i.test(url)) return null;
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'include', headers: Object.assign({}, opts.headers || {}) };
    if (opts.body !== undefined) {
      init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
      if (!init.headers['Content-Type']) init.headers['Content-Type'] = 'application/json';
    }
    if (init.method !== 'GET') {
      var meta = document.querySelector('meta[name="csrf-token"]');
      pageCsrf = pageCsrf || (meta && meta.getAttribute('data-token')) || null;
      if (pageCsrf) init.headers['x-csrf-token'] = pageCsrf;
    }
    try {
      var res = await fetch(url, init);
      if (res.status === 403 && res.headers.get('x-csrf-token')) {
        pageCsrf = init.headers['x-csrf-token'] = res.headers.get('x-csrf-token');
        res = await fetch(url, init);
      }
      var text = await res.text(), data = text;
      try { data = JSON.parse(text); } catch (e) { /* texto plano */ }
      return { ok: res.ok, status: res.status, data: data };
    } catch (e) { return null; }
  }

  async function api(url, opts) {
    var r = viaPage ? await fromPage(url, opts) : null;
    if (!r) r = await send('api', Object.assign({ url: url }, opts || {}));
    if (r.status === 401 && !viaPage && pageUser()) {
      var again = await fromPage(url, opts);
      if (again && again.ok) { viaPage = true; r = again; }
    }
    if (!r.ok) {
      var m = r.data && r.data.errors && r.data.errors[0] && r.data.errors[0].message;
      var e = new Error(m || ('Error ' + r.status));
      e.status = r.status;
      throw e;
    }
    return r.data;
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else if (k.indexOf('on') === 0 && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }

  function css(id, text) {
    var s = document.getElementById(id);
    if (!text) { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('style'); s.id = id; (document.head || document.documentElement).appendChild(s); }
    s.textContent = text;
  }

  function waitFor(selectors, timeout) {
    if (typeof selectors === 'string') selectors = [selectors];
    return new Promise(function (resolve) {
      var find = function () { for (var i = 0; i < selectors.length; i++) { var x = document.querySelector(selectors[i]); if (x) return x; } return null; };
      var found = find();
      if (found) return resolve(found);
      var obs = new MutationObserver(function () { var f = find(); if (f) { obs.disconnect(); resolve(f); } });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function () { obs.disconnect(); resolve(find()); }, timeout || 8000);
    });
  }

  function dock() {
    var d = document.getElementById('rx-dock');
    if (!d) {
      d = el('div', { id: 'rx-dock' });
      document.body.appendChild(d);
    }
    return d;
  }

  function place(a, node, where) {
    if (where === 'before') a.parentNode.insertBefore(node, a);
    else if (where === 'prepend') a.insertBefore(node, a.firstChild);
    else if (where === 'append') a.appendChild(node);
    else a.parentNode.insertBefore(node, a.nextSibling);
  }

  // Roblox repinta partes de la página (React) y a veces se lleva lo que RoCer0 añadió.
  // Si desaparece el nodo junto con su ancla, se vuelve a poner junto al ancla nueva.
  // Si el ancla sigue ahí, es que lo quitó RoCer0 a propósito y se deja de vigilar.
  function keep(anchors, anchor, node, where) {
    var path = location.pathname, tries = 0, timer = null;
    var obs = new MutationObserver(function () {
      if (node.isConnected) return;
      if (anchor.isConnected || location.pathname !== path) { obs.disconnect(); return; }
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (node.isConnected) return;
        if (location.pathname !== path || ++tries > 20) { obs.disconnect(); return; }
        for (var i = 0; i < anchors.length; i++) {
          var a = document.querySelector(anchors[i]);
          if (a && a.parentNode) { anchor = a; place(a, node, where); return; }
        }
      }, 150);
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // Inserta un nodo después del primer ancla que aparezca; si no hay, lo pone en el panel flotante.
  async function mount(anchors, node, where) {
    if (typeof anchors === 'string') anchors = [anchors];
    var a = await waitFor(anchors, 6000);
    if (a && a.parentNode) {
      place(a, node, where);
      keep(anchors, a, node, where);
    } else {
      node.classList.add('rx-docked');
      dock().appendChild(node);
    }
    return node;
  }

  // Tu cuenta. Si Roblox no contesta a la extensión (o la pestaña va con otra sesión, como en los contenedores de
  // Firefox), vale la que dice la propia página.
  var meStatus = 'sin comprobar';
  async function me() {
    if (meCache) return meCache;
    var fromApi = null, err = '';
    try { fromApi = await api('https://users.roblox.com/v1/users/authenticated'); } catch (e) { err = e.status ? 'error ' + e.status : 'sin respuesta'; }
    var page = pageUser();
    // La extensión ve otra cuenta que la pestaña: manda la de la pestaña y se le pide todo a Roblox desde la página.
    if (fromApi && fromApi.id && page && Number(fromApi.id) !== page.id) viaPage = true;
    meCache = page && (viaPage || !(fromApi && fromApi.id)) ? page : fromApi;
    meStatus = 'API ' + (fromApi && fromApi.id ? 'bien' : err || 'vacía') + ' · página ' + (page ? 'con usuario' : 'sin usuario') +
      (fromApi && fromApi.id && page ? ' · misma cuenta: ' + (Number(fromApi.id) === page.id ? 'sí' : 'no') : '') +
      (viaPage ? ' · pide los datos desde la página' : '');
    return meCache;
  }
  function pageUser() {
    var m = document.querySelector('meta[name="user-data"]');
    var id = m && Number(m.getAttribute('data-userid'));
    if (!id) return null;
    var name = m.getAttribute('data-name') || '';
    return { id: id, name: name, displayName: m.getAttribute('data-displayname') || name };
  }

  async function thumbs(kind, ids, size) {
    var out = {};
    ids = ids.filter(Boolean);
    if (!ids.length) return out;
    var paths = {
      games: ['v1/games/icons', 'universeIds', '150x150'],
      users: ['v1/users/avatar-headshot', 'userIds', '48x48'],
      assets: ['v1/assets', 'assetIds', '150x150'],
      bundles: ['v1/bundles/thumbnails', 'bundleIds', '150x150'],
      badges: ['v1/badges/icons', 'badgeIds', '150x150'],
      groups: ['v1/groups/icons', 'groupIds', '150x150']
    };
    if (kind === 'gameWide') {
      for (var j = 0; j < ids.length; j += 50) {
        try {
          var w = await api('https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=' + ids.slice(j, j + 50).join(',') + '&countPerUniverse=1&defaults=true&size=' + (size || '768x432') + '&format=Png&isCircular=false');
          (w.data || []).forEach(function (u) { if (u.thumbnails && u.thumbnails[0]) out[u.universeId] = u.thumbnails[0].imageUrl; });
        } catch (e) { /* sin miniaturas */ }
      }
      return out;
    }
    var p = paths[kind];
    for (var i = 0; i < ids.length; i += 100) {
      try {
        var d = await api('https://thumbnails.roblox.com/' + p[0] + '?' + p[1] + '=' + ids.slice(i, i + 100).join(',') + '&size=' + (size || p[2]) + '&format=Png');
        (d.data || []).forEach(function (t) { out[t.targetId] = t.imageUrl; });
      } catch (e) { /* sin miniaturas */ }
    }
    return out;
  }

  function ensureLauncher() {
    if (launcherReady) return false;
    launcherReady = true;
    var s = document.createElement('script');
    s.src = B.runtime.getURL('page/launcher.js');
    (document.head || document.documentElement).appendChild(s);
    return true;
  }

  function post(msg) {
    var fresh = ensureLauncher();
    msg.source = 'rx-ext';
    setTimeout(function () { window.postMessage(msg, location.origin); }, fresh ? 400 : 20);
  }

  function remember(placeId) {
    local('myJoins', []).then(function (list) {
      list = list.filter(function (x) { return String(x.placeId) !== String(placeId); });
      list.unshift({ placeId: String(placeId), t: Date.now() });
      setLocal({ myJoins: list.slice(0, 40) });
    });
  }

  function join(placeId, serverId) {
    if (serverId) send('recordJoin', { placeId: placeId, serverId: serverId }).catch(function () {});
    remember(placeId);
    post({ action: 'join', placeId: String(placeId), serverId: serverId || '' });
    toast(serverId ? 'Uniéndose al servidor…' : 'Abriendo el juego…');
  }

  // Unirse a la partida de un amigo.
  function follow(userId, placeId, serverId) {
    if (placeId) remember(placeId);
    challenge('joinFriend');
    post({ action: 'follow', userId: String(userId), placeId: placeId ? String(placeId) : '', serverId: serverId || '' });
    toast('Uniéndote a tu amigo…');
  }

  var LOCALE = /^\/(?:en|es|de|fr|pt|pt-br|ja|ko|zh-cn|zh-tw|zh-cjv|it|id|th|tr|vi|pl|ru|ar)(?=\/)/i;
  function stripLocale(p) { return String(p).replace(LOCALE, ''); }
  function path() { return stripLocale(location.pathname); }
  function isHome() { return /^\/home\/?$/i.test(path()); }

  // Iconos propios (common/icons.js). Se pueden cambiar por imágenes tuyas en Ajustes.
  function icon(name, opts) { return rcIcon(name, opts); }

  // Botón con icono y texto. El texto va en un <span> para poder cambiarlo luego con setText.
  function ibtn(name, text, attrs) {
    var b = el('button', Object.assign({ class: 'rx-btn' }, attrs || {}), [icon(name), text ? el('span', { text: text }) : null]);
    return b;
  }
  function setText(btn, text, iconName) {
    // El texto es el <span> hijo que no es un icono (un icono propio teñido también es un <span>).
    var span = Array.prototype.find.call(btn.children, function (c) { return c.tagName === 'SPAN' && !c.hasAttribute('data-rc-icon'); });
    if (span) span.textContent = text; else btn.appendChild(el('span', { text: text }));
    if (iconName) {
      var old = btn.querySelector('[data-rc-icon]');
      var fresh = icon(iconName);
      if (old) old.replaceWith(fresh); else btn.insertBefore(fresh, btn.firstChild);
    }
  }
  function title(name, text, tag) {
    return el(tag || 'h2', { class: 'rx-panel-title' }, [icon(name), ' ', text]);
  }

  function copy(text, label) {
    var done = function () { toast((label || 'Copiado') + ': ' + (text.length > 60 ? text.slice(0, 57) + '…' : text)); };
    var fallback = function () {
      var t = el('textarea', { style: { position: 'fixed', top: '-1000px', opacity: '0' } });
      t.value = text;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('No se pudo copiar'); }
      t.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  // Avisa al fondo de algo que cuenta para los retos diarios.
  function challenge(kind, data) { send('challenge:event', { kind: kind, data: data || {} }).catch(function () {}); }

  var toastTimer;
  function toast(msg, ms) {
    var t = document.getElementById('rx-toast');
    if (!t) { t = el('div', { id: 'rx-toast' }); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('rx-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('rx-show'); }, ms || 3000);
  }

  function modal(titleText, content, onClose) {
    var close = function () { if (!wrap.isConnected) return; wrap.remove(); if (onClose) onClose(); };
    var wrap = el('div', { class: 'rx-modal-wrap', onclick: function (e) { if (e.target === wrap) close(); } }, [
      el('div', { class: 'rx-modal' }, [
        el('div', { class: 'rx-modal-head' }, [el('b', { text: titleText }), el('button', { class: 'rx-btn rx-btn-small rx-icon-only', title: 'Cerrar', onclick: close }, [icon('x')])]),
        el('div', { class: 'rx-modal-body' }, [content])
      ])
    ]);
    document.body.appendChild(wrap);
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    return { close: close, body: wrap.querySelector('.rx-modal-body') };
  }

  // Pregunta con el estilo de RoCer0 en vez de confirm(). Resuelve true (aceptar) o false.
  function ask(titleText, text, okLabel) {
    return new Promise(function (resolve) {
      var answer = false;
      var m = modal(titleText, el('div', { class: 'rx-ask' }, [
        el('p', { text: text }),
        el('div', { class: 'rx-actions rx-ask-actions' }, [
          el('button', { class: 'rx-btn', onclick: function () { m.close(); } }, ['Cancelar']),
          el('button', { class: 'rx-btn rx-primary', onclick: function () { answer = true; m.close(); } }, [okLabel || 'Aceptar'])
        ])
      ]), function () { resolve(answer); });
      var ok = m.body.querySelector('.rx-primary');
      if (ok) ok.focus();
    });
  }

  // Cambia ajustes desde la página (atajos, botones) sin pisar los demás.
  async function saveSettings(patch) {
    var r = await B.storage.local.get('settings');
    var cur = Object.assign({}, r.settings || {}, patch);
    await B.storage.local.set({ settings: cur });
    return cur;
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('es-ES');
  }

  function short(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  function ago(t) {
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'hace unos segundos';
    if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
    if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
    var d = Math.floor(s / 86400);
    return d === 1 ? 'hace 1 día' : 'hace ' + d + ' días';
  }

  function placeIdFromUrl(u) { var m = /\/games\/(\d+)/.exec(u || location.pathname); return m ? m[1] : null; }

  async function universeOf(placeId) {
    var d = await api('https://apis.roblox.com/universes/v1/places/' + placeId + '/universe');
    return d.universeId;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function local(key, fallback) {
    return B.storage.local.get(key).then(function (r) { return r[key] === undefined ? fallback : r[key]; });
  }
  function setLocal(obj) { return B.storage.local.set(obj); }

  // ---------- Diagnóstico ----------
  // Resumen de cómo está hecha la página, para arreglar fallos del Roblox de verdad sin poder abrirlo. Solo lleva
  // etiquetas, ids, clases y tamaños: ningún texto, nombre ni enlace, y los números se cambian por #. No se envía
  // a ningún sitio: se copia al portapapeles para que lo pegues tú.
  var diagInfo = {};
  function mask(v) { return String(v).replace(/\d+/g, '#'); }
  function diagName(n) {
    if (!n || n.nodeType !== 1) return '—';
    var out = n.tagName.toLowerCase();
    if (n.id) out += '#' + mask(n.id);
    var cls = Array.prototype.slice.call(n.classList);
    if (cls.length) out += '.' + cls.slice(0, 7).map(mask).join('.') + (cls.length > 7 ? '…' : '');
    ['role', 'data-testid', 'data-p5-nav', 'data-p5-cmd', 'data-p5-promo', 'data-rk-home-hidden'].forEach(function (a) {
      if (n.hasAttribute(a)) out += '[' + a + (n.getAttribute(a) ? '=' + mask(n.getAttribute(a)).slice(0, 30) : '') + ']';
    });
    return out;
  }
  function outline(root, depth, max, lines) {
    var skip = /^(SCRIPT|STYLE|LINK|META|NOSCRIPT|TEMPLATE|svg|path)$/i;
    (function walk(n, d) {
      if (lines.length >= max) return;
      var kids = Array.prototype.filter.call(n.children, function (c) { return !skip.test(c.tagName); });
      var r = n.getBoundingClientRect();
      var cs = getComputedStyle(n);
      var shown = cs.display === 'none' ? ' oculto' : cs.visibility === 'hidden' ? ' invisible' : '';
      lines.push(new Array(d + 2).join('  ') + diagName(n) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) +
        (cs.display !== 'block' && !shown ? ' ' + cs.display : '') + shown + (kids.length ? ' [' + kids.length + ']' : ''));
      if (d >= depth || n.id === 'rk-home' || n.classList.contains('p5-ransom')) return;
      kids.slice(0, 12).forEach(function (c) { walk(c, d + 1); });
      if (kids.length > 12) lines.push(new Array(d + 3).join('  ') + '… ' + (kids.length - 12) + ' más');
    })(root, 0);
  }
  function diag() {
    var L = [], s = RX.settings || {};
    var m = /(Firefox|Edg|OPR|Chrome)\/(\d+)/.exec(navigator.userAgent);
    var t = typeof rkLockedTheme === 'function' ? rkLockedTheme(s) : null;
    L.push('RoCer0 ' + B.runtime.getManifest().version + ' · diagnóstico (sin nombres, textos ni números)');
    L.push('Navegador: ' + (m ? m[1] + ' ' + m[2] : 'otro') + ' · ventana ' + innerWidth + 'x' + innerHeight + ' · escala ' + devicePixelRatio);
    L.push('Página: ' + mask(path()) + ' · tema ' + (t ? t.id + ' (fijo)' : s['theme.id'] || '—') +
      ' · ' + document.documentElement.className.split(/\s+/).filter(function (c) { return /^r[kx]-/.test(c); }).join(' '));
    L.push('Sesión: ' + meStatus);
    Object.keys(diagInfo).forEach(function (k) {
      try { L.push(diagInfo[k]()); } catch (e) { L.push(k + ': fallo al leer (' + e.message + ')'); }
    });
    var main = document.querySelector('#container-main, main, [role="main"]') || document.body;
    L.push('Contenido:');
    outline(main, 5, 70, L);
    // El menú lateral: el que haya marcado Daniel, uno conocido o el que Daniel encuentre por sus enlaces.
    var finder = RX.features.filter(function (f) { return f.id === 'daniel'; })[0];
    var nav = document.querySelector('[data-p5-nav], #navigation, .rbx-left-col, .left-nav');
    if (!nav && finder) { try { nav = finder.navs()[0]; } catch (e) { /* sin menú */ } }
    if (nav) {
      var n0 = L.length;
      L.push('Menú lateral:');
      outline(nav, 6, n0 + 34, L);
    } else {
      // Sin menú: dónde están los enlaces del menú de Roblox (Avatar, Amigos, Mensajes), de dentro afuera.
      var a = document.querySelector('a[href*="/my/avatar"], a[href*="/users/friends"], a[href*="/my/messages"], a[href*="/users/connections"]');
      var chain2 = [];
      for (var k = a; k && k !== document.body && chain2.length < 10; k = k.parentElement) chain2.push(diagName(k));
      L.push('Menú lateral: no encontrado' + (a ? ' · un enlace del menú está en: ' + chain2.join(' < ') : ' · no hay enlaces del menú en la página'));
    }
    var h1 = document.querySelector('#container-main h1, main h1');
    if (h1) {
      var chain = [];
      for (var n = h1; n && n !== document.body; n = n.parentElement) chain.push(diagName(n));
      L.push('Título de la página, de dentro afuera: ' + chain.join(' < '));
    }
    return L.join('\n');
  }

  function onUrlChange(fn) {
    var last = location.href;
    setInterval(function () { if (location.href !== last) { last = location.href; fn(); } }, 700);
  }

  return {
    B: B, settings: null, features: [], send: send, api: api, el: el, css: css, waitFor: waitFor, mount: mount, dock: dock,
    me: me, pageUser: pageUser, thumbs: thumbs, join: join, follow: follow, path: path, stripLocale: stripLocale, isHome: isHome, icon: icon, ibtn: ibtn, setText: setText, title: title, copy: copy, challenge: challenge,
    toast: toast, modal: modal, ask: ask, saveSettings: saveSettings, fmt: fmt, short: short, ago: ago,
    placeIdFromUrl: placeIdFromUrl, universeOf: universeOf, sleep: sleep, local: local, setLocal: setLocal,
    onUrlChange: onUrlChange, isTop: window === window.top, diag: diag, diagInfo: diagInfo, diagName: diagName
  };
})();
