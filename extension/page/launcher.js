// Se ejecuta en el contexto de la propia página de Roblox para usar su lanzador de juegos.
(function () {
  if (window.__rxLauncher) return;
  window.__rxLauncher = true;
  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data || e.data.source !== 'rx-ext') return;
    var action = e.data.action;
    if (action !== 'join' && action !== 'follow') return;
    var placeId = Number(e.data.placeId), serverId = e.data.serverId;
    var gl = window.Roblox && window.Roblox.GameLauncher;
    if (action === 'follow') {
      try { if (gl && gl.followPlayerIntoGame) return gl.followPlayerIntoGame(Number(e.data.userId)); } catch (err) { /* se usa el enlace directo */ }
      if (!placeId) { window.location.href = 'roblox://experiences/start?userId=' + Number(e.data.userId); return; }
    }
    try {
      if (gl && serverId && gl.joinGameInstance) return gl.joinGameInstance(placeId, serverId);
      if (gl && !serverId && gl.joinMultiplayerGame) return gl.joinMultiplayerGame(placeId);
    } catch (err) { /* se usa el enlace directo */ }
    var url = 'roblox://experiences/start?placeId=' + placeId + (serverId ? '&gameInstanceId=' + encodeURIComponent(serverId) : '');
    window.location.href = url;
  });
})();
