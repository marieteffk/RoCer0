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

  async function api(url, opts) {
    var r = await send('api', Object.assign({ url: url }, opts || {}));
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

  async function me() {
    if (meCache) return meCache;
    try { meCache = await api('https://users.roblox.com/v1/users/authenticated'); } catch (e) { meCache = null; }
    return meCache;
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
  function path() { return location.pathname.replace(LOCALE, ''); }
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

  function onUrlChange(fn) {
    var last = location.href;
    setInterval(function () { if (location.href !== last) { last = location.href; fn(); } }, 700);
  }

  return {
    B: B, settings: null, features: [], send: send, api: api, el: el, css: css, waitFor: waitFor, mount: mount, dock: dock,
    me: me, thumbs: thumbs, join: join, follow: follow, path: path, isHome: isHome, icon: icon, ibtn: ibtn, setText: setText, title: title, copy: copy, challenge: challenge,
    toast: toast, modal: modal, ask: ask, saveSettings: saveSettings, fmt: fmt, short: short, ago: ago,
    placeIdFromUrl: placeIdFromUrl, universeOf: universeOf, sleep: sleep, local: local, setLocal: setLocal,
    onUrlChange: onUrlChange, isTop: window === window.top
  };
})();
