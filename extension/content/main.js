// Arranque: carga los ajustes y ejecuta cada módulo.
(async function () {
  var stored = await RX.B.storage.local.get(['settings', 'iconImages']);
  var s = RX.settings = rxMergeSettings(stored.settings);
  rcSetCustomIcons(stored.iconImages || {});

  // Fuera de la ventana principal (iframes) solo se usa la vista previa del catálogo.
  var features = RX.isTop ? RX.features : RX.features.filter(function (f) { return f.id === 'quickview'; });

  var start = function () {
    features.forEach(function (f) {
      try { Promise.resolve(f.run(s)).catch(function (e) { console.warn('[RX]', f.id, e); }); }
      catch (e) { console.warn('[RX]', f.id, e); }
    });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  RX.B.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    // Iconos cambiados por imágenes tuyas: se repintan los que ya están puestos.
    if (changes.iconImages) { rcSetCustomIcons(changes.iconImages.newValue || {}); rcRefreshIcons(document); }
    if (!changes.settings) return;
    s = RX.settings = rxMergeSettings(changes.settings.newValue);
    features.forEach(function (f) { if (f.update) try { f.update(s); } catch (e) { console.warn('[RX]', f.id, e); } });
  });

  if (!RX.isTop) return;

  // Tiempo en el sitio: un latido cada 30 s mientras la pestaña está visible y con foco.
  setInterval(function () {
    if (document.visibilityState === 'visible' && document.hasFocus()) RX.send('heartbeat').catch(function () {});
  }, 30000);

  // Último juego visitado, para el server hop desde el popup.
  var placeId = RX.placeIdFromUrl();
  if (placeId) {
    var name = ((document.querySelector('.game-name, h1') || {}).textContent || '').trim();
    RX.setLocal({ lastGame: { placeId: placeId, name: name || ('Juego ' + placeId), t: Date.now() } });
  }
})();
