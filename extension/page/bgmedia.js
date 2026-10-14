// Pinta el vídeo o el pase de imágenes de un tema. La configuración llega en el hash de la URL;
// los archivos subidos desde el PC están en storage.local (rkMedia:<tema>:video / :slides).
(function () {
  var B = globalThis.browser || globalThis.chrome;
  var cfg = {}, timer = null, objectUrls = [], els = [], idx = 0, list = [];

  function readCfg() {
    try { cfg = JSON.parse(decodeURIComponent(location.hash.slice(1))) || {}; } catch (e) { cfg = {}; }
  }

  function clear() {
    clearInterval(timer);
    timer = null;
    els.forEach(function (n) { n.remove(); });
    els = [];
    objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
    objectUrls = [];
    document.body.className = '';
  }

  function toUrl(src) {
    if (!/^data:/.test(src)) return Promise.resolve(src);
    return fetch(src).then(function (r) { return r.blob(); }).then(function (b) { var u = URL.createObjectURL(b); objectUrls.push(u); return u; });
  }

  function get(key) {
    return new Promise(function (resolve) {
      try {
        var p = B.storage.local.get(key, function (r) { resolve(r ? r[key] : undefined); });
        if (p && p.then) p.then(function (r) { resolve(r ? r[key] : undefined); }, function () { resolve(undefined); });
      } catch (e) { resolve(undefined); }
    });
  }

  async function start() {
    clear();
    readCfg();
    if (!cfg.id) return;
    if (cfg.type === 'video') {
      var src = cfg.video || await get('rkMedia:' + cfg.id + ':video');
      if (!src) return;
      var v = document.createElement('video');
      v.className = 'm on' + (cfg.fit === 'contain' ? ' contain' : '');
      v.muted = true; v.loop = true; v.autoplay = !cfg.paused; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = await toUrl(src);
      v.playbackRate = (Number(cfg.rate) || 100) / 100;
      v.addEventListener('loadedmetadata', function () { v.playbackRate = (Number(cfg.rate) || 100) / 100; });
      document.body.appendChild(v);
      els.push(v);
      if (!cfg.paused) v.play().catch(function () {});
      return;
    }
    if (cfg.type === 'slideshow') {
      var mine = (await get('rkMedia:' + cfg.id + ':slides')) || [];
      list = mine.concat(cfg.urls || []);
      if (!list.length) return;
      document.body.className = 'fx-' + (cfg.fx || 'fade');
      document.body.style.setProperty('--dur', (Number(cfg.seconds) || 20) + 's');
      for (var i = 0; i < 2; i++) {
        var d = document.createElement('div');
        d.className = 'm' + (cfg.fit === 'contain' ? ' contain' : '');
        document.body.appendChild(d);
        els.push(d);
      }
      idx = 0;
      await show(0);
      if (list.length > 1) timer = setInterval(next, Math.max(3, Number(cfg.seconds) || 20) * 1000);
    }
  }

  var flip = 0;
  async function show(i) {
    var url = await toUrl(list[i % list.length]);
    var cur = els[flip % 2], prev = els[(flip + 1) % 2];
    cur.classList.remove('out');
    cur.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
    // Forzar que la animación vuelva a empezar.
    cur.classList.remove('on'); void cur.offsetWidth; cur.classList.add('on');
    if (prev) { prev.classList.remove('on'); prev.classList.add('out'); }
    flip++;
  }
  function next() { if (!document.hidden) { idx = (idx + 1) % list.length; show(idx); } }

  document.addEventListener('visibilitychange', function () {
    els.forEach(function (n) { if (n.tagName === 'VIDEO') { if (document.hidden) n.pause(); else if (!cfg.paused) n.play().catch(function () {}); } });
  });
  window.addEventListener('hashchange', start);
  try {
    B.storage.onChanged.addListener(function (ch, area) {
      if (area === 'local' && cfg.id && (ch['rkMedia:' + cfg.id + ':video'] || ch['rkMedia:' + cfg.id + ':slides'])) start();
    });
  } catch (e) { /* sin acceso */ }
  start();
})();
