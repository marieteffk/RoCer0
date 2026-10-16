// Arranque: carga los ajustes y ejecuta cada módulo.
(async function () {
  var stored = await RX.B.storage.local.get(['settings', 'iconImages']);
  // rkLookLock: con un tema fijo puesto (Daniel, Pablo), los ajustes de aspecto valen lo que decide el tema.
  var s = RX.settings = rkLookLock(rxMergeSettings(stored.settings));
  var iconImages = stored.iconImages || {};
  // Con un tema fijo tampoco valen los iconos cambiados por imágenes tuyas.
  var setIcons = function () { rcSetCustomIcons(rkLockedTheme(s) ? {} : iconImages); };
  setIcons();

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
    if (changes.iconImages) { iconImages = changes.iconImages.newValue || {}; setIcons(); rcRefreshIcons(document); }
    if (!changes.settings) return;
    var wasLocked = !!rkLockedTheme(s);
    s = RX.settings = rkLookLock(rxMergeSettings(changes.settings.newValue));
    if (wasLocked !== !!rkLockedTheme(s)) { setIcons(); rcRefreshIcons(document); }
    features.forEach(function (f) { if (f.update) try { f.update(s); } catch (e) { console.warn('[RX]', f.id, e); } });
  });

  if (!RX.isTop) return;

  // Diagnóstico de esta página, pedido desde el popup (solo se devuelve al popup, que lo copia al portapapeles).
  RX.B.runtime.onMessage.addListener(function (msg, sender, reply) {
    if (!msg || msg.type !== 'rx:diag' || sender.id !== RX.B.runtime.id) return false;
    try { reply({ text: RX.diag() }); } catch (e) { reply({ error: String(e && e.message || e) }); }
    return false;
  });

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
