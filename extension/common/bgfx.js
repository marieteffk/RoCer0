// Efectos de fondo de los temas: partículas (nieve, estrellas, burbujas…), vídeo o pase de
// imágenes (en un marco de la extensión) y movimiento con el ratón (parallax).
// Lo usan theme-boot.js en roblox.com y la vista previa de Ajustes.
var RkFx = (function () {
  var KINDS = {
    snow: { colors: ['#ffffff'], fall: 1, sway: 1, size: [1.4, 3.6], speed: [0.35, 1.1] },
    stars: { colors: ['#ffffff', '#cfe3ff', '#fff3c4'], twinkle: 1, size: [0.6, 1.9], speed: [0.02, 0.08] },
    bubbles: { colors: null, rise: 1, sway: 0.6, size: [3, 11], speed: [0.25, 0.8], ring: 1 },
    fireflies: { colors: ['#f6f08a', '#c9ff7a'], wander: 1, glow: 1, size: [1.4, 2.8], speed: [0.15, 0.45] },
    petals: { colors: ['#ffc1d6', '#ffb0c8', '#ffd6e4', '#f7a1c4'], fall: 1, sway: 1.6, spin: 1, size: [4, 8], speed: [0.4, 1], shape: 'petal' },
    rain: { colors: ['#a9c7ff'], fall: 1, size: [10, 22], speed: [7, 12], shape: 'line' },
    hearts: { colors: ['#ff5c8a', '#ff8fb1', '#ff3d6e'], rise: 1, sway: 0.8, size: [5, 10], speed: [0.3, 0.8], shape: 'heart', fade: 1 },
    confetti: { colors: null, fall: 1, sway: 1.2, spin: 1, size: [4, 8], speed: [0.8, 1.8], shape: 'rect' },
    embers: { colors: ['#ff8a3d', '#ffb347', '#ff5e1a'], rise: 1, sway: 0.7, glow: 1, size: [1.2, 2.8], speed: [0.4, 1.1], fade: 1 },
    leaves: { colors: ['#e07a2f', '#c94f1f', '#e8b33a', '#9c6b2f', '#b5442a'], fall: 1, sway: 1.8, spin: 1, size: [6, 11], speed: [0.5, 1.1], shape: 'leaf' }
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  // ---------- Partículas ----------
  function Particles(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.kind = KINDS[opts.kind] || KINDS.snow;
    this.parts = [];
    this.running = false;
    this.last = 0;
    this.win = canvas.ownerDocument.defaultView;
    this.box = opts.box || null;
    var self = this;
    this.onResize = function () { self.resize(); };
    this.onVis = function () { if (self.win.document.hidden) self.pause(); else self.resume(); };
  }
  Particles.prototype.colors = function () {
    var o = this.opts;
    if (o.color) return [o.color];
    if (this.kind.colors) return this.kind.colors;
    return [o.accent || '#3b82f6', o.accent2 || '#8b5cf6', '#ffd166', '#ef476f', '#06d6a0', '#ffffff'];
  };
  Particles.prototype.resize = function () {
    var dpr = Math.min(2, this.win.devicePixelRatio || 1);
    var w = this.box ? this.box.clientWidth : this.win.innerWidth, h = this.box ? this.box.clientHeight : this.win.innerHeight;
    this.W = w; this.H = h;
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var want = Math.round((this.opts.density / 100) * 170 * Math.min(2.2, Math.max(0.25, (w * h) / (1600 * 900))));
    while (this.parts.length < want) this.parts.push(this.spawn(true));
    if (this.parts.length > want) this.parts.length = want;
  };
  Particles.prototype.spawn = function (anywhere) {
    var k = this.kind, o = this.opts;
    var sz = rnd(k.size[0], k.size[1]) * (0.5 + o.size / 66);
    var sp = rnd(k.speed[0], k.speed[1]) * (0.3 + o.speed / 55);
    var W = this.W || 1600, H = this.H || 900;
    var p = { x: rnd(0, W), y: anywhere ? rnd(0, H) : (k.rise ? H + 20 : -20), r: sz, v: sp, c: pick(this.colors()), a: rnd(0, Math.PI * 2), spin: rnd(-0.03, 0.03), ph: rnd(0, 100), life: 1 };
    if (k.wander) { p.dx = rnd(-1, 1); p.dy = rnd(-1, 1); }
    if (k.twinkle) { p.y = rnd(0, H); }
    return p;
  };
  Particles.prototype.step = function (dt) {
    var k = this.kind, W = this.W, H = this.H, ctx = this.ctx, o = this.opts;
    ctx.clearRect(0, 0, W, H);
    var alpha = Math.max(0.05, Math.min(1, o.opacity / 100));
    var t = this.t = (this.t || 0) + dt;
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      var f = dt * 0.06;
      if (k.fall) { p.y += p.v * f * (k.shape === 'line' ? 1 : 1); p.x += Math.sin(t * 0.0012 + p.ph) * (k.sway || 0) * 0.35 * f * 3; if (k.shape === 'line') p.x += p.v * 0.25 * f; }
      if (k.rise) { p.y -= p.v * f; p.x += Math.sin(t * 0.0015 + p.ph) * (k.sway || 0) * 0.3 * f * 3; }
      if (k.wander) { p.dx += rnd(-0.05, 0.05); p.dy += rnd(-0.05, 0.05); p.dx = Math.max(-1, Math.min(1, p.dx)); p.dy = Math.max(-1, Math.min(1, p.dy)); p.x += p.dx * p.v * f * 2; p.y += p.dy * p.v * f * 2; }
      if (k.twinkle) { p.x += p.v * f; }
      if (k.spin) p.a += p.spin * f * 3;
      if (k.fade && k.rise) p.life = Math.max(0, Math.min(1, p.y / H + 0.15));
      // Fuera de la pantalla: vuelve a salir por el otro lado.
      if (p.y > H + 30 || p.y < -30 || p.x < -40 || p.x > W + 40) {
        if (k.wander || k.twinkle) { p.x = (p.x + W) % W; p.y = (p.y + H) % H; }
        else { var n = this.spawn(false); n.x = rnd(0, W); this.parts[i] = p = n; }
      }
      var a = alpha * p.life;
      if (k.twinkle) a *= 0.45 + 0.55 * Math.abs(Math.sin(t * 0.0018 + p.ph));
      if (k.glow) a *= 0.6 + 0.4 * Math.sin(t * 0.004 + p.ph);
      this.draw(p, Math.max(0, a));
    }
  };
  Particles.prototype.draw = function (p, a) {
    var ctx = this.ctx, k = this.kind;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.c;
    ctx.strokeStyle = p.c;
    if (k.glow) {
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, p.c); g.addColorStop(0.35, p.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (k.shape === 'line') {
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.r * 0.25, p.y - p.r); ctx.stroke();
      return;
    }
    if (k.ring) {
      ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * 0.18; ctx.fill();
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.22, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    if (k.shape === 'rect') ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
    else if (k.shape === 'petal') { ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (k.shape === 'leaf') {
      ctx.beginPath(); ctx.moveTo(-p.r, 0); ctx.quadraticCurveTo(0, -p.r * 0.75, p.r, 0); ctx.quadraticCurveTo(0, p.r * 0.75, -p.r, 0); ctx.fill();
      ctx.globalAlpha = a * 0.5; ctx.lineWidth = 0.8; ctx.strokeStyle = '#3b2412'; ctx.beginPath(); ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0); ctx.stroke();
    } else if (k.shape === 'heart') {
      var s = p.r / 6;
      ctx.beginPath(); ctx.moveTo(0, 2 * s);
      ctx.bezierCurveTo(-6 * s, -2 * s, -3 * s, -7 * s, 0, -3.5 * s);
      ctx.bezierCurveTo(3 * s, -7 * s, 6 * s, -2 * s, 0, 2 * s);
      ctx.fill();
    } else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  };
  Particles.prototype.loop = function (now) {
    if (!this.running) return;
    var dt = this.last ? Math.min(50, now - this.last) : 16;
    this.last = now;
    this.step(dt);
    var self = this;
    this.raf = this.win.requestAnimationFrame(function (n) { self.loop(n); });
  };
  Particles.prototype.start = function () {
    this.resize();
    this.win.addEventListener('resize', this.onResize);
    this.win.document.addEventListener('visibilitychange', this.onVis);
    this.resume();
  };
  Particles.prototype.resume = function () {
    if (this.running || this.win.document.hidden) return;
    this.running = true; this.last = 0;
    var self = this;
    this.raf = this.win.requestAnimationFrame(function (n) { self.loop(n); });
  };
  Particles.prototype.pause = function () { this.running = false; if (this.raf) this.win.cancelAnimationFrame(this.raf); };
  Particles.prototype.destroy = function () {
    this.pause();
    this.win.removeEventListener('resize', this.onResize);
    this.win.document.removeEventListener('visibilitychange', this.onVis);
    this.canvas.remove();
  };

  // ---------- Configuración a partir del tema ----------
  function particleOpts(t) {
    if (!t || !t.particles || t.particles === 'none' || !KINDS[t.particles]) return null;
    return {
      kind: t.particles, layer: t.pLayer === 'front' ? 'front' : 'back',
      density: num(t.pDensity, 50, 1, 100), speed: num(t.pSpeed, 50, 1, 100), size: num(t.pSize, 50, 1, 100), opacity: num(t.pOpacity, 80, 5, 100),
      color: rkHex(t.pColor) || '', accent: t.c && t.c.accent, accent2: t.c && t.c.accent2
    };
  }
  function num(v, d, lo, hi) { v = Number(v); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); }

  function mediaCfg(t) {
    if (!t || (t.bg !== 'video' && t.bg !== 'slideshow')) return null;
    var urls = String(t.slideUrls || '').split(/\s+/).filter(function (u) { return /^https:\/\/\S+$/i.test(u); }).slice(0, 20);
    return {
      id: t.id, type: t.bg, seconds: num(t.slideSeconds, 20, 3, 3600), fx: t.slideFx || 'fade', urls: urls,
      video: /^https:\/\/\S+$/i.test(t.videoUrl || '') ? t.videoUrl : '', rate: num(t.videoRate, 100, 25, 200), fit: t.mediaFit === 'contain' ? 'contain' : 'cover'
    };
  }

  // ---------- Montaje en una página (roblox.com o la vista previa) ----------
  // opts: { doc, root (elemento donde van las capas; por defecto <html>), box (contenedor para medir; null = ventana), animations, mediaUrl (función que da la URL del marco) }
  function Mount(opts) {
    this.o = opts;
    this.doc = opts.doc || document;
    this.root = opts.root || this.doc.documentElement;
    this.fx = { back: null, front: null };
    this.mediaKey = '';
    this.partKey = '';
  }
  Mount.prototype.update = function (t, animations) {
    var reduce = this.doc.defaultView.matchMedia && this.doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var anim = animations !== false && !reduce;
    // Partículas
    var po = anim ? particleOpts(t) : null;
    var pk = po ? JSON.stringify(po) : '';
    if (pk !== this.partKey) {
      this.partKey = pk;
      ['back', 'front'].forEach(function (l) { if (this.fx[l]) { this.fx[l].destroy(); this.fx[l] = null; } }, this);
      if (po) {
        var c = this.doc.createElement('canvas');
        c.id = this.o.box ? '' : 'rk-particles-' + po.layer;
        c.className = 'rk-particles rk-particles-' + po.layer;
        c.setAttribute('aria-hidden', 'true');
        this.root.appendChild(c);
        var p = new Particles(c, Object.assign({ box: this.o.box }, po));
        p.start();
        this.fx[po.layer] = p;
      }
    }
    // Vídeo o pase de imágenes
    var mc = mediaCfg(t);
    if (mc && !anim && mc.type === 'video') mc.paused = true;
    var mk = mc ? JSON.stringify(mc) : '';
    if (mk !== this.mediaKey) {
      this.mediaKey = mk;
      var old = this.media;
      if (!mc) { if (old) old.remove(); this.media = null; }
      else {
        var url = this.o.mediaUrl(mc);
        if (old) old.src = url;
        else {
          var f = this.doc.createElement('iframe');
          if (!this.o.box) f.id = 'rk-bg-media';
          f.className = 'rk-bg-media';
          f.setAttribute('aria-hidden', 'true');
          f.setAttribute('tabindex', '-1');
          f.setAttribute('title', 'Fondo');
          f.src = url;
          // Detrás de las partículas de fondo (mismo z-index: manda el orden en la página).
          this.root.insertBefore(f, this.fx.back ? this.fx.back.canvas : null);
          this.media = f;
        }
      }
    }
  };
  Mount.prototype.destroy = function () {
    ['back', 'front'].forEach(function (l) { if (this.fx[l]) this.fx[l].destroy(); }, this);
    if (this.media) this.media.remove();
    this.fx = { back: null, front: null }; this.media = null; this.mediaKey = ''; this.partKey = '';
  };

  // Movimiento del fondo con el ratón.
  function parallax(doc) {
    var root = doc.documentElement, win = doc.defaultView, pending = false, mx = 0, my = 0;
    win.addEventListener('mousemove', function (e) {
      if (!root.classList.contains('rk-parallax')) return;
      mx = (e.clientX / win.innerWidth - 0.5) * 2;
      my = (e.clientY / win.innerHeight - 0.5) * 2;
      if (pending) return;
      pending = true;
      win.requestAnimationFrame(function () {
        pending = false;
        root.style.setProperty('--rk-mx', mx.toFixed(3));
        root.style.setProperty('--rk-my', my.toFixed(3));
      });
    }, { passive: true });
  }

  return { Particles: Particles, Mount: Mount, parallax: parallax, particleOpts: particleOpts, mediaCfg: mediaCfg, KINDS: KINDS };
})();
