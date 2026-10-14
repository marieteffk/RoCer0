// Se ejecuta al empezar a cargar cada página de Roblox (document_start) para pintar el tema
// antes de que se vea la página. Usa una copia en localStorage para no esperar a storage.local.
(function () {
  var B = globalThis.browser || globalThis.chrome;
  var KEY = 'rocer0-theme-v1';
  var ICON_KEY = 'rocer0-icons-v1';
  var root = document.documentElement;
  var isTop = window === window.top;
  var host = location.hostname;
  // El rediseño completo solo se aplica a la web principal; en el resto de subdominios
  // (create.roblox.com, etc.) solo se usan los colores para los paneles de RoCer0.
  var fullSite = /^(www\.|web\.)?roblox\.com$/i.test(host);
  var HOME_RE = /^\/(?:(?:en|es|de|fr|pt|pt-br|ja|ko|zh-cn|zh-tw|zh-cjv|it|id|th|tr|vi|pl|ru|ar)\/)?home\/?$/i;
  var scheme = null;
  var pendingTimer = null;

  function adapt(payload) {
    if (!payload || fullSite) return payload;
    return { vars: payload.vars, classes: ['rk-vars'], scheme: payload.scheme };
  }

  function setPending(on) {
    clearTimeout(pendingTimer);
    root.classList.toggle('rk-home-pending', !!on);
    // Si el Inicio rediseñado no llega a montarse, se vuelve a mostrar el original.
    if (on) pendingTimer = setTimeout(function () { root.classList.remove('rk-home-pending'); }, 7000);
  }

  // ---------- Iconos: estilo, tamaño, color e iconos de la propia web de Roblox ----------
  function setStyle(id, text) {
    var st = document.getElementById(id);
    if (!text) { if (st) st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = id; (document.head || root).appendChild(st); }
    if (st.textContent !== text) st.textContent = text;
  }
  function paintIcons(ic) {
    if (!ic) return;
    rcApplyIconStyle(root, ic.style);
    root.style.setProperty('--rc-icon-scale', String(ic.scale || 1));
    if (ic.color) { root.style.setProperty('--rc-icon-color', ic.color); root.classList.add('rc-ic-colored'); }
    else { root.style.removeProperty('--rc-icon-color'); root.classList.remove('rc-ic-colored'); }
    setStyle('rocer0-rbx-icons', fullSite ? ic.css : '');
  }
  function iconState(s, t, custom) {
    var scale = Math.max(50, Math.min(200, Number(s['icons.scale']) || 100)) / 100;
    return { style: rcIconStyleOf(s, t), scale: scale, color: rkHex(s['icons.color'] || '') || '', css: fullSite ? rcRobloxIconsCss(s, custom, t) : '' };
  }

  // ---------- Partes ocultas y modo streamer: se ponen ya, para que no se vean ni un instante al cargar ----------
  var PAGE_KEY = 'rocer0-page-v1';
  // Solo se tocan las clases que salen de rxPageClasses; otras rx-hide-* (insignias, servidores…) son de sus funciones.
  var PAGE_ALL = Object.keys(rxPageClasses({}));
  function pageClasses(list, blur) {
    var on = {};
    (list || []).forEach(function (k) { on[k] = true; });
    PAGE_ALL.forEach(function (k) { root.classList.toggle(k, !!on[k]); });
    if (blur) root.style.setProperty('--rx-streamer-blur', blur + 'px'); else root.style.removeProperty('--rx-streamer-blur');
  }
  try { var early = JSON.parse(localStorage.getItem(PAGE_KEY) || 'null'); if (early) pageClasses(early.cls, early.blur); } catch (e) { /* sin caché */ }

  // ---------- Pintar desde la caché (antes de que se vea nada) ----------
  try { paintIcons(JSON.parse(localStorage.getItem(ICON_KEY) || 'null')); } catch (e) { /* sin caché */ }
  try {
    var cached = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (cached && cached.on) {
      rkApply(root, adapt(cached.payload));
      scheme = cached.syncRoblox ? cached.payload.scheme : null;
    }
    if (cached && cached.home && isTop && fullSite && HOME_RE.test(location.pathname)) setPending(true);
  } catch (e) { /* sin caché */ }

  // ---------- Modo claro/oscuro de Roblox ----------
  // Se recuerda el modo que tenía Roblox para devolverlo si se apaga el tema o esta opción.
  var robloxOrig = null;
  function syncRoblox() {
    var b = document.body;
    if (!b || !fullSite) return;
    if (!scheme) {
      if (!robloxOrig) return;
      var back = robloxOrig, now = (back === 'dark-theme' ? 'light' : 'dark') + '-theme';
      robloxOrig = null;
      [b, root].forEach(function (el) {
        if (el.classList.contains(now)) { el.classList.remove(now); el.classList.add(back); }
      });
      return;
    }
    var want = scheme + '-theme', other = (scheme === 'dark' ? 'light' : 'dark') + '-theme';
    [b, root].forEach(function (el) {
      if (el.classList.contains(other)) { el.classList.remove(other); el.classList.add(want); if (!robloxOrig) robloxOrig = other; }
    });
  }
  var bodyObs = null;
  function watchBody() {
    if (bodyObs || !document.body) return;
    bodyObs = new MutationObserver(syncRoblox);
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    syncRoblox();
  }
  if (document.body) watchBody();
  else {
    var waitBody = new MutationObserver(function () { if (document.body) { waitBody.disconnect(); watchBody(); } });
    waitBody.observe(root, { childList: true });
  }

  // ---------- Efectos de fondo (partículas, vídeo, pase de imágenes, parallax) ----------
  var fxMount = null;
  function fx(t, s) {
    if (!isTop || !fullSite || typeof RkFx === 'undefined') return;
    if (!fxMount) {
      if (!t) return;
      fxMount = new RkFx.Mount({ doc: document, mediaUrl: function (cfg) { return B.runtime.getURL('page/bgmedia.html') + '#' + encodeURIComponent(JSON.stringify(cfg)); } });
      RkFx.parallax(document);
    }
    var go = function () { fxMount.update(t, s['theme.animations']); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go, { once: true });
  }

  // Barra de arriba que se esconde al bajar.
  if (isTop && fullSite) {
    var lastY = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (root.classList.contains('rk-l-nav-autohide')) root.classList.toggle('rk-nav-away', y > 90 && y > lastY + 2);
      else root.classList.remove('rk-nav-away');
      if (Math.abs(y - lastY) > 2) lastY = y;
    }, { passive: true });
  }

  // Imagen de fondo subida desde el PC (cada tema tiene la suya).
  async function themeImage(id) {
    var k = 'rkImg:' + id;
    var r = await B.storage.local.get([k, 'themeImages']);
    return r[k] || (r.themeImages || {})[id] || null;
  }

  // ---------- Aplicar los ajustes ----------
  var activeId = null, autoTimer = null;
  async function refresh() {
    var r = await B.storage.local.get(['settings', 'iconImages']);
    var s = rxMergeSettings(r.settings);
    var pc = rxPageClasses(s);
    var pcList = Object.keys(pc).filter(function (k) { return pc[k]; });
    var pcBlur = pc['rx-streamer'] ? rxStreamerBlur(s) : 0;
    pageClasses(pcList, pcBlur);
    try {
      if (pcList.length) localStorage.setItem(PAGE_KEY, JSON.stringify({ cls: pcList, blur: pcBlur }));
      else localStorage.removeItem(PAGE_KEY);
    } catch (e) { /* lleno o bloqueado */ }
    var homeOn = s['home.enabled'] && s['home.hideOriginal'];
    var custom = r.iconImages || {};
    rcSetCustomIcons(custom);
    // Tema automático (día/noche o de temporada): se vuelve a mirar cada minuto.
    clearInterval(autoTimer);
    if (s['theme.enabled'] && s['theme.auto'] && s['theme.auto'] !== 'off' && isTop) {
      autoTimer = setInterval(function () { if (rkActiveThemeId(s) !== activeId) refresh(); }, 60000);
    }
    activeId = rkActiveThemeId(s);
    var t = s['theme.enabled'] ? rkEffectiveTheme(s) : null;
    var ic = iconState(s, t, custom);
    paintIcons(ic);
    try {
      if (ic.css.length > 150000) ic.css = '';   // imágenes muy grandes: sin caché, se pintan al cargar
      localStorage.setItem(ICON_KEY, JSON.stringify(ic));
    } catch (e) { /* lleno o bloqueado */ }
    if (!t) {
      rkApply(root, null);
      scheme = null;
      syncRoblox();
      fx(null, s);
      try { localStorage.setItem(KEY, JSON.stringify({ on: false, home: homeOn })); } catch (e) { /* lleno o bloqueado */ }
      return;
    }
    var image = t.bg === 'upload' ? await themeImage(t.id) : null;
    var payload = rkThemeVars(t, { animations: s['theme.animations'], image: image });
    rkApply(root, adapt(payload));
    scheme = s['theme.syncRoblox'] ? payload.scheme : null;
    syncRoblox();
    fx(t, s);
    // La imagen subida puede pesar mucho: no se guarda en la caché.
    var cachePayload = payload;
    if (image) {
      cachePayload = JSON.parse(JSON.stringify(payload));
      cachePayload.vars['--rk-bg-layer'] = 'none';
    }
    try { localStorage.setItem(KEY, JSON.stringify({ on: true, payload: cachePayload, home: homeOn, syncRoblox: s['theme.syncRoblox'] })); } catch (e) { /* lleno o bloqueado */ }
  }

  refresh();
  B.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes.settings || changes.themeImages || changes.iconImages || Object.keys(changes).some(function (k) { return k.indexOf('rkImg:') === 0; })) refresh();
  });

  window.__rkSetHomePending = setPending;
})();
