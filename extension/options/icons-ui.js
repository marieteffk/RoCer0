// Pestaña "Iconos": estilo, tamaño y color de los iconos, y cambiar cualquiera (también los de la
// web de Roblox) por una imagen de tu PC. Las imágenes se guardan en storage.local → iconImages.
(function () {
  const SRC_RE = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
  let first = true;
  let target = null;
  let custom = {};

  async function store() {
    await B.storage.local.set({ iconImages: custom });
    rcSetCustomIcons(custom);
    rcRefreshIcons(document);
    drawGrids();
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
  }

  // Imagen lista para usar como icono: SVG tal cual, GIF pequeño tal cual (puede ir animado) y el resto a PNG de 96 px.
  async function iconData(file) {
    if (file.size > 4 * 1024 * 1024) throw new Error('pesa más de 4 MB');
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
      if (file.size > 300 * 1024) throw new Error('el SVG pesa más de 300 KB');
      const text = await file.text();
      if (!/<svg[\s>]/i.test(text)) throw new Error('no parece un SVG');
      const bytes = new TextEncoder().encode(text);
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      return 'data:image/svg+xml;base64,' + btoa(bin);
    }
    if (file.type === 'image/gif' && file.size <= 400 * 1024) return readDataUrl(file);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const max = 96, scale = Math.min(1, max / img.naturalWidth, max / img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    } finally { URL.revokeObjectURL(url); }
  }

  function pick(key) {
    target = key;
    $('#ic-file').click();
  }

  function preview(key) {
    if (key.startsWith('rbx:')) {
      const row = RC_RBX_ICONS.find(r => 'rbx:' + r[0] === key);
      const mine = custom[key];
      if (mine && mine.src) {
        if (mine.tint) { const s = h('span', { class: 'rk-i rc-i-mask ic-big' }); s.style.setProperty('--rc-mask', 'url("' + mine.src + '")'); return s; }
        return h('img', { class: 'rk-i rc-i-img ic-big', src: mine.src, alt: '' });
      }
      if (settings['icons.roblox'] && row) return rcIcon(row[3], { cls: 'ic-big' });
      return h('span', { class: 'ic-orig', text: 'Original' });
    }
    return rcIcon(key, { cls: 'ic-big' });
  }

  function tile(key, label, sub) {
    const mine = custom[key];
    const tint = h('input', { type: 'checkbox' });
    tint.checked = !!(mine && mine.tint);
    tint.addEventListener('change', () => { if (custom[key]) { custom[key].tint = tint.checked; store(); } });
    const text = (label + ' ' + key + ' ' + (sub || '')).toLowerCase();
    const name = [h('span', { class: 'ic-name', text: label }), sub ? h('span', { class: 'ic-sub', text: sub }) : null];
    // Sin imagen propia, toda la casilla es el botón (sin un "Cambiar" en cada una); con imagen, salen sus opciones.
    if (!mine) return h('button', { class: 'ic-tile', type: 'button', title: 'Cambiar por una imagen de tu PC', 'data-text': text, onclick: () => pick(key) }, [h('span', { class: 'ic-prev' }, [preview(key)])].concat(name));
    return h('div', { class: 'ic-tile mine', 'data-text': text }, [
      h('button', { class: 'ic-prev', type: 'button', title: 'Cambiar por otra imagen', onclick: () => pick(key) }, [preview(key)])
    ].concat(name, [
      h('div', { class: 'ic-actions' }, [
        h('label', { class: 'check small', title: 'Pintar la imagen de un solo color (el del texto o el que elijas arriba)' }, [tint, ' Teñir']),
        ibtn('x', '', { class: 'btn btn-icon btn-ghost', title: 'Volver al icono de RoCer0', onclick: () => { delete custom[key]; store(); } })
      ])
    ]));
  }

  function drawGrids() {
    const grid = $('#ic-grid');
    grid.textContent = '';
    Object.keys(RC_ICONS).filter(k => k !== 'dot').forEach(k => grid.append(tile(k, RC_ICON_LABELS[k] || k)));
    const rbx = $('#ic-rbx');
    rbx.textContent = '';
    RC_RBX_ICONS.forEach(r => rbx.append(tile('rbx:' + r[0], r[1])));
    filterTiles();
  }

  function filterTiles() {
    const q = $('#ic-filter').value.toLowerCase().trim();
    $$('#ic-grid .ic-tile').forEach(t => { t.hidden = !!q && !t.dataset.text.includes(q); });
  }

  function drawStyle() {
    const sel = $('#ic-style');
    if (!sel.childElementCount) {
      sel.append(h('option', { value: 'theme', text: 'El que trae el tema' }));
      RC_ICON_STYLES.forEach(([v, l]) => sel.append(h('option', { value: v, text: l })));
    }
    sel.value = settings['icons.style'] || 'theme';
    const sc = $('#ic-scale');
    sc.value = Number(settings['icons.scale']) || 100;
    sc.parentNode.querySelector('output').textContent = sc.value + '%';
    const col = rkHex(settings['icons.color'] || '');
    $('#ic-color-on').checked = !!col;
    $('#ic-color').value = col || '#3b82f6';
    $('#ic-color').disabled = !col;
    $('#ic-roblox').checked = !!settings['icons.roblox'];
  }

  function bind() {
    $('#ic-style').addEventListener('change', e => { settings['icons.style'] = e.target.value; save(); applyPageTheme(); });
    const sc = $('#ic-scale');
    sc.addEventListener('input', () => {
      sc.parentNode.querySelector('output').textContent = sc.value + '%';
      settings['icons.scale'] = Number(sc.value);
      applyPageTheme();
    });
    sc.addEventListener('change', save);
    $('#ic-color-on').addEventListener('change', e => {
      settings['icons.color'] = e.target.checked ? $('#ic-color').value : '';
      $('#ic-color').disabled = !e.target.checked;
      save(); applyPageTheme();
    });
    $('#ic-color').addEventListener('input', e => { settings['icons.color'] = e.target.value; applyPageTheme(); });
    $('#ic-color').addEventListener('change', save);
    $('#ic-roblox').addEventListener('change', e => { settings['icons.roblox'] = e.target.checked; save(); drawGrids(); });
    $('#ic-filter').addEventListener('input', filterTiles);

    $('#ic-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || !target) return;
      try {
        custom[target] = { src: await iconData(file), tint: false };
        await store();
        toast('Icono cambiado. Si sale de un solo color raro, prueba a marcar o desmarcar "Teñir".');
      } catch (err) { toast('No se pudo usar esa imagen: ' + (err && err.message || err), 4500); }
    });

    $('#ic-export').addEventListener('click', () => {
      if (!Object.keys(custom).length) { toast('Todavía no has cambiado ningún icono.'); return; }
      download(new Blob([JSON.stringify({ rocer0Icons: 1, icons: custom })], { type: 'application/json' }), 'rocer0-iconos.json');
    });
    $('#ic-import').addEventListener('click', () => $('#ic-import-file').click());
    $('#ic-import-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        const icons = d && d.icons;
        if (!icons || typeof icons !== 'object') throw new Error('no es un archivo de iconos de RoCer0');
        const valid = new Set(Object.keys(RC_ICONS).concat(RC_RBX_ICONS.map(r => 'rbx:' + r[0])));
        let n = 0;
        Object.keys(icons).forEach(k => {
          const v = icons[k];
          if (!valid.has(k) || !v || typeof v.src !== 'string' || !SRC_RE.test(v.src) || v.src.length > 600000) return;
          custom[k] = { src: v.src, tint: !!v.tint };
          n++;
        });
        await store();
        toast(n + (n === 1 ? ' icono importado.' : ' iconos importados.'));
      } catch (err) { toast('No se pudo importar: ' + err.message, 4500); }
    });
    $('#ic-clear').addEventListener('click', async () => {
      if (!Object.keys(custom).length) { toast('No hay imágenes que quitar.'); return; }
      if (!await uiConfirm('¿Quitar todas tus imágenes de iconos?', 'Vuelven los iconos de RoCer0 en todas partes.', { okText: 'Quitar', danger: true })) return;
      custom = {};
      await store();
    });
  }

  TAB_LOADERS.icons = async function () {
    if (first) { first = false; bind(); }
    custom = (await B.storage.local.get('iconImages')).iconImages || {};
    drawStyle();
    drawGrids();
  };
})();
