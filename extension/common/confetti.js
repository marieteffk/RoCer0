// Confeti a pantalla completa (sin imágenes ni librerías). Lo usan las páginas de Roblox y los Ajustes.
// opts: { doc, colors, amount, duration } (lo que devuelve rcConfettiFor). Sin colors se usan los del tema.
// Devuelve false si no se pinta porque el sistema pide reducir el movimiento.
function rcConfetti(opts) {
  opts = opts || {};
  var doc = opts.doc || document;
  var win = doc.defaultView || window;
  if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  var host = doc.body || doc.documentElement;
  if (!host) return false;
  var amount = Math.round(Math.min(800, Math.max(10, Number(opts.amount) || 170)));
  var dur = Math.round(Math.min(15000, Math.max(800, Number(opts.duration) || 3600)));
  var colors = (Array.isArray(opts.colors) ? opts.colors : []).filter(function (c) { return typeof c === 'string' && c.trim(); });
  if (!colors.length) {
    // Colores del tema: los dos acentos, el de éxito, versiones claras y blanco.
    var cs = win.getComputedStyle(host);
    var pick = function (v, d) { v = (cs.getPropertyValue(v) || '').trim(); return v || d; };
    var a = pick('--rk-accent', '#3b82f6'), b = pick('--rk-accent-2', '#8b5cf6');
    colors = [a, b, pick('--rk-success', '#22c55e')];
    if (typeof rkHex === 'function' && typeof rkMix === 'function') {
      if (rkHex(a)) colors.push(rkMix(rkHex(a), '#ffffff', 0.45));
      if (rkHex(b)) colors.push(rkMix(rkHex(b), '#ffffff', 0.45));
    }
    colors.push('#ffffff');
  }

  var canvas = doc.createElement('canvas');
  canvas.className = 'rc-confetti';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '2147483000' });
  host.appendChild(canvas);
  var dpr = Math.min(2, win.devicePixelRatio || 1);
  var W = win.innerWidth, H = win.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');

  var parts = [];
  var make = function (x, y, angle, spread, speed, rain) {
    var a = angle + (Math.random() - 0.5) * spread;
    var v = speed * (0.55 + Math.random() * 0.6);
    parts.push({
      x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, c: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.3, wob: Math.random() * 10, rain: rain
    });
  };
  // Algo más de la mitad sale de golpe desde las dos esquinas de abajo; el resto cae desde arriba
  // repartido en el tiempo, para que dure lo que pide "duration".
  var fade = Math.min(900, Math.max(350, dur * 0.22));
  var burst = Math.round(amount * 0.55);
  var shot = 17 + H / 90;
  for (var i = 0; i < burst; i++) {
    if (i % 2) make(0, H, -Math.PI / 3, 0.7, shot);
    else make(W, H, -2 * Math.PI / 3, 0.7, shot);
  }
  var queue = [], rainEnd = Math.max(0, dur - fade - 700);
  for (i = burst; i < amount; i++) queue.push(Math.random() * rainEnd);
  queue.sort(function (x, y) { return x - y; });

  var start = performance.now(), last = start;
  var frame = function (now) {
    var t = now - start;
    var k = Math.min(3, Math.max(0.2, (now - last) / 16.67));
    last = now;
    while (queue.length && queue[0] <= t) { queue.shift(); make(Math.random() * W, -20 - Math.random() * 40, Math.PI / 2, 0.8, 2.2, true); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = t > dur - fade ? Math.max(0, (dur - t) / fade) : 1;
    for (var j = parts.length - 1; j >= 0; j--) {
      var p = parts[j];
      // Suben rápido y, al empezar a caer, planean como papel.
      var falling = p.rain || p.vy > 0;
      var drag = Math.pow(falling ? 0.955 : 0.985, k);
      p.vy += (falling ? 0.11 : 0.32) * k;
      p.vx *= drag; p.vy *= drag;
      p.x += (p.vx + Math.sin(t / 180 + p.wob) * 0.6) * k;
      p.y += p.vy * k;
      p.r += p.vr * k;
      if (p.y > H + 40 || p.x < -80 || p.x > W + 80) { parts.splice(j, 1); continue; }
      var cos = Math.cos(p.r), sin = Math.sin(p.r);
      ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr);
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h / 1.6, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(t / 120 + p.wob)));
    }
    if (t < dur && (parts.length || queue.length)) win.requestAnimationFrame(frame);
    else canvas.remove();
  };
  win.requestAnimationFrame(frame);
  return true;
}
