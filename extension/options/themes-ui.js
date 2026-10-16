// Pestaña "Temas": tema automático, galería, editor por tema (colores, fondo, estructura, letra)
// y vista previa en vivo con la estructura, las partículas y el vídeo del tema.
(function () {
  const FILTERS = [['all', 'Todos'], ['oscuro', 'Oscuros'], ['claro', 'Claros'], ['transparente', 'Transparentes'], ['animado', 'Animados'],
    ['neón', 'Neón'], ['pastel', 'Pastel'], ['espacio', 'Espacio'], ['naturaleza', 'Naturaleza'], ['temporada', 'De temporada'], ['fijo', 'Fijos'], ['mine', 'Mis temas']];
  const BG_KEYS = ['bg', 'bgUrl', 'bgColor', 'gradKind', 'gradAngle', 'gradStops', 'gradAnim', 'bgFit', 'bgPos', 'parallax', 'bgBlur', 'bgDim', 'bgBright', 'bgContrast',
    'bgSat', 'bgHue', 'bgGray', 'bgSepia', 'overlay', 'overlayColor', 'overlayStrength', 'grain', 'particles', 'pLayer', 'pDensity', 'pSpeed', 'pSize', 'pColor',
    'pOpacity', 'slideSeconds', 'slideFx', 'slideUrls', 'videoUrl', 'videoRate', 'mediaFit'];
  const MAX_VIDEO_MB = 30, MAX_SLIDES = 12;
  let filter = 'all';
  let firstRun = true;
  let previewTimer = null;

  const customs = () => settings['theme.custom'] || (settings['theme.custom'] = []);
  const currentId = () => rkFindTheme(settings['theme.id'], customs()).id;
  const isCustom = id => customs().some(t => t.id === id);
  const eff = id => rkEffectiveTheme(settings, id);
  function ov(id) {
    const all = settings['theme.overrides'] || (settings['theme.overrides'] = {});
    return all[id] || (all[id] = {});
  }
  const IMG = id => 'rkImg:' + id;
  const SLIDES = id => 'rkMedia:' + id + ':slides';
  const VIDEO = id => 'rkMedia:' + id + ':video';
  async function getKey(k) { return (await B.storage.local.get(k))[k]; }

  // Repintado rápido mientras arrastras un control; al soltarlo se guarda.
  function live() { applyPageTheme(); drawPreview(); }
  function commit() {
    save();
    applyPageTheme();
    drawPreview();
    drawGallery();
    drawAuto();
  }

  // ---------- Tema automático ----------
  function themeOptions(sel, value) {
    sel.textContent = '';
    const mine = customs();
    if (mine.length) sel.append(h('optgroup', { label: 'Mis temas' }, mine.map(t => h('option', { value: t.id, text: t.name }))));
    sel.append(h('optgroup', { label: 'Temas de RoCer0' }, RK_THEMES.map(t => h('option', { value: t.id, text: t.name }))));
    sel.value = rkFindTheme(value, mine).id;
  }
  function drawAuto() {
    const mode = settings['theme.auto'] || 'off';
    $('#auto-mode').value = mode;
    $$('.auto-dn').forEach(n => { n.hidden = !(mode === 'daynight' || mode === 'both'); });
    themeOptions($('#auto-day'), settings['theme.dayTheme']);
    themeOptions($('#auto-night'), settings['theme.nightTheme']);
    $('#auto-day-start').value = settings['theme.dayStart'] || '08:00';
    $('#auto-night-start').value = settings['theme.nightStart'] || '20:00';
    const now = $('#auto-now');
    now.textContent = '';
    const fixed = rkFixedTheme(settings['theme.id']);
    const panel = $('#panel-theme-auto');
    panel.classList.toggle('locked', !!fixed);
    $$('#panel-theme-auto .row-ctl').forEach(n => { n.inert = !!fixed; });
    if (fixed) now.append(ic('lock'), ' Con ' + fixed.name + ' puesto, el tema automático no se usa: ' + fixed.name + ' es un tema fijo.');
    else if (mode === 'off') now.append('Se usa siempre el tema que elijas en la galería.');
    else {
      now.append(ic('clock'), ' Ahora mismo se usa ', h('b', { text: rkFindTheme(rkActiveThemeId(settings), customs()).name }), '.');
      if (mode !== 'daynight') now.append(h('br'), 'Halloween: del 20 de octubre al 2 de noviembre. Navidad: del 15 de diciembre al 6 de enero.');
    }
  }
  function bindAuto() {
    $('#auto-mode').addEventListener('change', e => { settings['theme.auto'] = e.target.value; commit(); });
    $('#auto-day').addEventListener('change', e => { settings['theme.dayTheme'] = e.target.value; commit(); });
    $('#auto-night').addEventListener('change', e => { settings['theme.nightTheme'] = e.target.value; commit(); });
    $('#auto-day-start').addEventListener('change', e => { if (e.target.value) { settings['theme.dayStart'] = e.target.value; commit(); } });
    $('#auto-night-start').addEventListener('change', e => { if (e.target.value) { settings['theme.nightStart'] = e.target.value; commit(); } });
  }

  // ---------- Galería ----------
  function drawFilters() {
    const box = $('#theme-filters');
    box.textContent = '';
    FILTERS.forEach(([id, label]) => {
      box.append(h('button', { class: 'chip' + (filter === id ? ' on' : ''), text: label, onclick: () => { filter = id; drawFilters(); drawGallery(); } }));
    });
  }

  function drawGallery() {
    const box = $('#theme-gallery');
    box.textContent = '';
    const cur = currentId();
    const active = (settings['theme.auto'] || 'off') !== 'off' ? rkFindTheme(rkActiveThemeId(settings), customs()).id : cur;
    const list = customs().concat(RK_THEMES).filter(t => filter === 'all' || (filter === 'mine' ? isCustom(t.id) : (t.tags || []).includes(filter)));
    if (!list.length) box.append(h('p', { class: 'muted', text: filter === 'mine' ? 'Todavía no tienes temas propios. Retoca uno y pulsa "Guardar como tema nuevo".' : 'Ningún tema con esa etiqueta.' }));
    list.forEach(t => {
      const e = eff(t.id);
      const badges = [];
      if (e.particles && e.particles !== 'none') badges.push(h('span', { class: 'tfx', title: 'Partículas' }, [ic('sparkles')]));
      if (e.bg === 'video') badges.push(h('span', { class: 'tfx', title: 'Vídeo' }, [ic('video')]));
      if (e.bg === 'slideshow') badges.push(h('span', { class: 'tfx', title: 'Pase de imágenes' }, [ic('image')]));
      const card = h('div', { class: 'tcard' + (t.id === cur ? ' on' : ''), title: t.desc || '', tabindex: '0', role: 'button' }, [
        rkMiniPreview(document, e),
        isCustom(t.id) ? h('span', { class: 'tmine', text: 'MÍO' }) : null,
        t.locked ? h('span', { class: 'tmine tfixed', title: 'Tema fijo: con él puesto no vale ninguna personalización' }, [ic('lock'), 'FIJO']) : null,
        badges.length ? h('span', { class: 'tbadges' }, badges) : null,
        h('div', { class: 'tname' }, [h('span', { text: t.name }),
          t.id === cur ? h('span', { class: 'tcheck', text: 'Elegido' }) : (t.id === active ? h('span', { class: 'tnow', text: 'Ahora' }) : null)]),
        h('div', { class: 'ttags', text: (t.tags || []).join(' · ') })
      ]);
      const choose = async () => {
        if (t.locked && t.id !== currentId() && !await uiConfirm('¿Poner ' + t.name + '?', t.name + ' es un tema fijo: mientras lo tengas puesto no vale ninguna personalización. ' +
          'Ni colores, ni fondo, ni letra, ni iconos, ni estructura, ni los retoques de Interfaz, y el tema automático tampoco. ' +
          'Lo que tengas guardado no se borra: vuelve en cuanto elijas otro tema.', { okText: 'Poner ' + t.name, icon: 'lock' })) return;
        settings['theme.id'] = t.id;
        commit();
        drawEditor();
        const mode = settings['theme.auto'] || 'off';
        if (!t.locked && (mode === 'daynight' || mode === 'both')) toast('Tienes el tema automático activado: cámbialo arriba si quieres usar siempre este.', 4500);
      };
      card.addEventListener('click', choose);
      card.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(); } });
      card.addEventListener('mouseenter', () => { clearTimeout(previewTimer); previewTimer = setTimeout(() => drawPreview(t.id), 140); });
      card.addEventListener('mouseleave', () => { clearTimeout(previewTimer); previewTimer = setTimeout(() => drawPreview(), 140); });
      box.append(card);
    });
  }

  // ---------- Editor: controles ----------
  // [selector, clave del tema, formato de la etiqueta, escala (valor guardado = valor del control / escala)]
  const RANGES = [
    ['#ed-bgblur', 'bgBlur', v => v + ' px'], ['#ed-bgdim', 'bgDim', v => v + '%'], ['#ed-bright', 'bgBright', v => v + '%'],
    ['#ed-contrast', 'bgContrast', v => v + '%'], ['#ed-sat', 'bgSat', v => v + '%'], ['#ed-hue', 'bgHue', v => v + '°'],
    ['#ed-gray', 'bgGray', v => v + '%'], ['#ed-sepia', 'bgSepia', v => v + '%'], ['#ed-parallax', 'parallax', v => Number(v) ? v + ' px' : 'No'],
    ['#ed-ovstrength', 'overlayStrength', v => v + '%'], ['#ed-grain', 'grain', v => Number(v) ? v + '%' : 'No'],
    ['#ed-pdensity', 'pDensity', v => v + '%'], ['#ed-pspeed', 'pSpeed', v => v + '%'], ['#ed-psize', 'pSize', v => v + '%'], ['#ed-popacity', 'pOpacity', v => v + '%'],
    ['#ed-gangle', 'gradAngle', v => v + '°'], ['#ed-slide-sec', 'slideSeconds', v => v + ' s'], ['#ed-video-rate', 'videoRate', v => (v / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + 'x'],
    ['#ed-glass', 'glass', v => v + '%', 100], ['#ed-pblur', 'panelBlur', v => v + ' px'], ['#ed-radius', 'radius', v => v + ' px'],
    ['#ed-shadow', 'shadow', v => Number(v) ? v * 2 + '%' : 'Sin sombra'], ['#ed-glowsize', 'glowSize', v => v * 2 + '%']
  ];
  const SELECTS = [['#ed-gkind', 'gradKind'], ['#ed-slide-fx', 'slideFx'], ['#ed-overlay', 'overlay'], ['#ed-particles', 'particles'], ['#ed-player', 'pLayer'], ['#ed-pos', 'bgPos']];
  const COLORS = [['#ed-bgcolor', 'bgColor', t => t.c.bg], ['#ed-ovcolor', 'overlayColor', t => t.overlay === 'tint' ? t.c.accent : '#000000'], ['#ed-pcolor', 'pColor', t => t.c.accent]];
  const CHECKS = [['#ed-ganim', 'gradAnim'], ['#ed-glow', 'glow']];

  function outOf(input) { return input.parentNode.querySelector('output'); }

  function bindControls() {
    RANGES.forEach(([sel, key, fmt, scale]) => {
      const input = $(sel), out = outOf(input);
      input.addEventListener('input', () => { out.textContent = fmt(input.value); ov(currentId())[key] = Number(input.value) / (scale || 1); live(); });
      input.addEventListener('change', commit);
    });
    SELECTS.forEach(([sel, key]) => $(sel).addEventListener('change', e => { ov(currentId())[key] = e.target.value; commit(); drawEditor(); }));
    COLORS.forEach(([sel, key]) => {
      const input = $(sel);
      input.addEventListener('input', () => { ov(currentId())[key] = input.value; live(); });
      input.addEventListener('change', commit);
    });
    CHECKS.forEach(([sel, key]) => $(sel).addEventListener('change', e => {
      ov(currentId())[key] = e.target.checked;
      commit();
      if (key === 'glow') $('#ed-glowsize').closest('.row').hidden = !e.target.checked;
    }));
    $('#ed-ovcolor-reset').addEventListener('click', () => { ov(currentId()).overlayColor = ''; commit(); drawEditor(); });
    $('#ed-pcolor-reset').addEventListener('click', () => { ov(currentId()).pColor = ''; commit(); drawEditor(); });

    $('#ed-bg').addEventListener('change', e => { ov(currentId()).bg = e.target.value; commit(); drawEditor(); });
    $('#ed-fit').addEventListener('change', e => {
      const o = ov(currentId()), t = eff(currentId());
      if (t.bg === 'slideshow' || t.bg === 'video') o.mediaFit = e.target.value === 'contain' ? 'contain' : 'cover';
      else o.bgFit = e.target.value;
      commit();
    });
    const urlField = (sel, key, extra) => $(sel).addEventListener('change', e => {
      const v = e.target.value.trim();
      if (v && !/^https:\/\/\S+$/i.test(v)) { toast('Tiene que ser una dirección que empiece por https://'); return; }
      const o = ov(currentId());
      o[key] = v;
      if (extra) extra(o, v);
      commit();
    });
    urlField('#ed-url', 'bgUrl', o => { o.bg = 'url'; });
    urlField('#ed-video-url', 'videoUrl');
    $('#ed-slide-urls').addEventListener('change', e => {
      const lines = e.target.value.split(/\s+/).filter(Boolean);
      const bad = lines.filter(u => !/^https:\/\/\S+$/i.test(u));
      if (bad.length) toast('Se ignoran las direcciones que no empiezan por https://');
      ov(currentId()).slideUrls = lines.filter(u => /^https:\/\/\S+$/i.test(u)).slice(0, 20).join('\n');
      commit();
    });

    // Fuente
    const fontSel = $('#ed-font');
    RK_FONTS.forEach(([v, l]) => fontSel.append(h('option', { value: v, text: l })));
    fontSel.addEventListener('change', () => { ov(currentId()).font = fontSel.value; $('#ed-fontc-row').hidden = fontSel.value !== 'custom'; commit(); });
    $('#ed-fontc').addEventListener('change', e => { ov(currentId()).fontCustom = e.target.value.trim().slice(0, 60); commit(); });

    // Listas fijas
    const bgSel = $('#ed-bg');
    const groups = {};
    RK_BACKGROUNDS.forEach(([v, l, g]) => { (groups[g] = groups[g] || []).push(h('option', { value: v, text: l })); });
    Object.keys(groups).forEach(g => bgSel.append(h('optgroup', { label: g }, groups[g])));
    RK_OVERLAYS.forEach(([v, l]) => $('#ed-overlay').append(h('option', { value: v, text: l })));
    RK_PARTICLES.forEach(([v, l]) => $('#ed-particles').append(h('option', { value: v, text: l })));

    // Subpestañas del editor
    $$('#ed-tabs button').forEach(b => b.addEventListener('click', () => {
      $$('#ed-tabs button').forEach(x => x.classList.toggle('on', x === b));
      $$('.editor-controls .pane').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.pane; });
    }));

    // Degradado propio
    $('#ed-gadd').addEventListener('click', () => {
      const id = currentId(), st = stopsOf(eff(id)).sort((a, b) => a[1] - b[1]);
      if (st.length >= 6) return;
      let gi = 0, gap = -1;
      for (let i = 0; i < st.length - 1; i++) if (st[i + 1][1] - st[i][1] > gap) { gap = st[i + 1][1] - st[i][1]; gi = i; }
      st.splice(gi + 1, 0, [rkMix(st[gi][0], st[gi + 1][0], 0.5), Math.round((st[gi][1] + st[gi + 1][1]) / 2)]);
      ov(id).gradStops = st;
      commit();
      drawStops();
    });

    // Botones de restablecer partes
    $('#ed-bg-reset').addEventListener('click', () => {
      const o = ov(currentId());
      BG_KEYS.forEach(k => delete o[k]);
      commit();
      drawEditor();
      toast('Fondo como lo trae el tema. Tus imágenes y vídeos siguen guardados.');
    });
    $('#ed-layout-reset').addEventListener('click', () => { delete ov(currentId()).layout; commit(); drawLayout(); });

    bindMedia();
    bindActions();
  }

  function setVal(sel, v) { const n = $(sel); if (n) n.value = v; }

  // Tema fijo: en lugar de los controles, qué decide el tema y cómo volver a personalizar.
  function drawLocked(preset) {
    const box = $('.editor-controls');
    box.classList.toggle('is-locked', !!preset.locked);
    let note = $('#ed-locked');
    if (!preset.locked) { if (note) note.remove(); return; }
    if (!note) { note = h('div', { id: 'ed-locked', class: 'ed-locked' }); box.prepend(note); }
    note.replaceChildren(
      h('div', { class: 'ed-locked-head' }, [ic('lock'), h('h2', { text: preset.name + ' es un tema fijo' })]),
      h('p', { text: preset.desc || '' }),
      h('ul', { class: 'ed-locked-list' }, [
        'Colores, fondo, letra, efectos y estructura: los del tema, sin retoques.',
        'Iconos: los del tema, sin tus imágenes ni tu color.',
        'Inicio: siempre el rediseñado y colocado a su manera. Qué tarjetas salen y en qué orden lo sigues eligiendo tú.',
        'Interfaz: no se aplica nada (ni el ancho, ni las partes ocultas, ni tu CSS).',
        'Animaciones: siempre puestas, salvo que tu sistema pida reducir el movimiento.',
        'Tema automático: no se usa.'
      ].map(x => h('li', { text: x }))),
      h('p', { class: 'muted small', text: 'Lo que tenías guardado no se borra: vuelve en cuanto elijas otro tema en la galería.' }),
      h('div', { class: 'btn-row' }, [ibtn('layers', 'Elegir otro tema', { class: 'btn btn-accent', onclick: () => goTo('themes', '[data-panel="panel-theme-gallery"]') })])
    );
  }

  function drawEditor() {
    const id = currentId(), t = eff(id), preset = rkFindTheme(id, customs());
    drawLocked(preset);
    $('#ed-name').textContent = '"' + t.name + '"';
    $('#ed-desc').textContent = preset.desc || '';
    $('#ed-rename').hidden = $('#ed-delete').hidden = !isCustom(id);

    // Colores
    const acc = $('#ed-accents');
    acc.textContent = '';
    RK_ACCENTS.forEach(col => acc.append(h('button', { class: 'swatch' + (t.c.accent === col ? ' on' : ''), title: col, style: 'background:' + col, onclick: () => {
      const o = ov(id); o.c = o.c || {}; o.c.accent = col; commit(); drawEditor();
    } })));
    const picker = h('input', { type: 'color', value: t.c.accent, title: 'Otro color' });
    picker.addEventListener('input', () => { const o = ov(id); o.c = o.c || {}; o.c.accent = picker.value; live(); });
    picker.addEventListener('change', () => { commit(); drawEditor(); });
    acc.append(h('label', { class: 'swatch custom', title: 'Otro color' }, [picker]));

    const grid = $('#ed-colors');
    grid.textContent = '';
    const o0 = ov(id);
    RK_COLOR_FIELDS.forEach(([key, label]) => {
      const changed = o0.c && o0.c[key];
      const input = h('input', { type: 'color', value: t.c[key] });
      const item = h('div', { class: 'color-item' + (changed ? ' changed' : '') }, [input, h('span', { text: label, title: label }),
        ibtn('refresh', '', { class: 'btn btn-icon btn-ghost', title: 'Volver al color del tema', onclick: () => { const o = ov(id); if (o.c) delete o.c[key]; commit(); drawEditor(); } })]);
      input.addEventListener('input', () => { const o = ov(id); o.c = o.c || {}; o.c[key] = input.value; item.classList.add('changed'); live(); });
      input.addEventListener('change', commit);
      grid.append(item);
    });

    // Fondo
    $('#ed-bg').value = t.bg;
    $$('.bg-block').forEach(b => { b.hidden = !b.dataset.show.split(' ').includes(t.bg); });
    $$('.bg-block [data-only]').forEach(r => { r.hidden = !r.dataset.only.split(' ').includes(t.bg); });
    setVal('#ed-url', t.bgUrl || '');
    setVal('#ed-video-url', t.videoUrl || '');
    setVal('#ed-slide-urls', String(t.slideUrls || '').split(/\s+/).filter(Boolean).join('\n'));
    setVal('#ed-fit', (t.bg === 'slideshow' || t.bg === 'video') ? (t.mediaFit || 'cover') : (t.bgFit || 'cover'));
    RANGES.forEach(([sel, key, fmt, scale]) => {
      const input = $(sel);
      let v = Number(t[key]);
      if (isNaN(v)) v = Number(RK_THEME_BASE[key]) || 0;
      input.value = Math.round(v * (scale || 1));
      outOf(input).textContent = fmt(input.value);
    });
    SELECTS.forEach(([sel, key]) => setVal(sel, t[key] || RK_THEME_BASE[key]));
    COLORS.forEach(([sel, key, auto]) => setVal(sel, rkHex(t[key]) || auto(t)));
    CHECKS.forEach(([sel, key]) => { $(sel).checked = !!t[key]; });
    $('.part-opts').hidden = !t.particles || t.particles === 'none';
    $('#ed-glowsize').closest('.row').hidden = !t.glow;
    $('#ed-ovcolor').closest('.row').hidden = $('#ed-ovstrength').closest('.row').hidden = !t.overlay || t.overlay === 'none';
    $('#ed-gangle').closest('.row').hidden = t.gradKind === 'radial';
    if (t.bg === 'custom') drawStops();
    drawMediaInfo(id, t);

    // Letra
    $('#ed-font').value = t.font || 'roblox';
    $('#ed-fontc-row').hidden = $('#ed-font').value !== 'custom';
    setVal('#ed-fontc', t.fontCustom || '');

    drawLayout();
  }

  // ---------- Degradado propio ----------
  function stopsOf(t) {
    const src = Array.isArray(t.gradStops) && t.gradStops.length >= 2 ? t.gradStops : [[t.c.accent, 0], [t.c.bg, 55], [t.c.accent2, 100]];
    return src.slice(0, 6).map(s => [rkHex(s[0]) || t.c.bg, Math.max(0, Math.min(100, Math.round(Number(s[1]) || 0)))]);
  }
  function gbar(stops) {
    $('#ed-gbar').style.background = 'linear-gradient(90deg, ' + stops.slice().sort((a, b) => a[1] - b[1]).map(s => s[0] + ' ' + s[1] + '%').join(', ') + ')';
  }
  function drawStops() {
    const id = currentId(), stops = stopsOf(eff(id));
    const box = $('#ed-gstops');
    box.textContent = '';
    stops.forEach((st, i) => {
      const col = h('input', { type: 'color', value: st[0], title: 'Color ' + (i + 1) });
      const pos = h('input', { type: 'range', min: 0, max: 100, value: st[1], title: 'Posición' });
      const out = h('output', { text: st[1] + '%' });
      const set = final => {
        const s2 = stopsOf(eff(id));
        s2[i] = [col.value, Number(pos.value)];
        ov(id).gradStops = s2;
        out.textContent = pos.value + '%';
        gbar(s2);
        if (final) commit(); else live();
      };
      col.addEventListener('input', () => set(false));
      col.addEventListener('change', () => set(true));
      pos.addEventListener('input', () => set(false));
      pos.addEventListener('change', () => set(true));
      const rm = ibtn('x', '', { class: 'btn btn-icon btn-ghost', title: 'Quitar este color', disabled: stops.length <= 2, onclick: () => {
        const s2 = stopsOf(eff(id));
        s2.splice(i, 1);
        ov(id).gradStops = s2;
        commit();
        drawStops();
      } });
      box.append(h('div', { class: 'stop' }, [col, h('span', { class: 'range' }, [pos, out]), rm]));
    });
    $('#ed-gadd').disabled = stops.length >= 6;
    gbar(stops);
  }

  // ---------- Estructura ----------
  function drawLayout() {
    const id = currentId(), t = eff(id);
    const mine = ov(id).layout || {};
    const box = $('#ed-layout');
    box.textContent = '';
    RK_LAYOUT_OPTIONS.forEach(opt => {
      let ctl;
      if (opt.range) {
        const input = h('input', { type: 'range', min: opt.range[0], max: opt.range[1], step: 5, value: Number(t.layout[opt.key]) || 100 });
        const out = h('output', { text: input.value + opt.unit });
        input.addEventListener('input', () => { out.textContent = input.value + opt.unit; setLayout(id, opt.key, Number(input.value), true); });
        input.addEventListener('change', () => { commit(); drawLayout(); });
        ctl = h('span', { class: 'range' }, [input, out]);
      } else {
        ctl = h('select', {}, opt.options.map(o => h('option', { value: o[0], text: o[1] })));
        ctl.value = t.layout[opt.key];
        ctl.addEventListener('change', () => { setLayout(id, opt.key, ctl.value); commit(); drawLayout(); });
      }
      const changed = Object.prototype.hasOwnProperty.call(mine, opt.key);
      box.append(h('div', { class: 'row layout-row' + (changed ? ' changed' : '') }, [
        h('label', { text: opt.label }),
        h('span', { class: 'row-ctl' }, [ctl, ibtn('refresh', '', { class: 'btn btn-icon btn-ghost revert', title: 'Volver a lo que trae el tema', onclick: () => {
          const L = ov(id).layout;
          if (L) { delete L[opt.key]; if (!Object.keys(L).length) delete ov(id).layout; }
          commit();
          drawLayout();
        } })])
      ]));
    });
  }
  function setLayout(id, key, value, quick) {
    const o = ov(id);
    o.layout = o.layout || {};
    o.layout[key] = value;
    if (quick) live();
  }

  // ---------- Imágenes y vídeo ----------
  function readDataUrl(file) {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
  }
  // Reduce la imagen a un tamaño razonable (WebP si el navegador puede, que conserva la transparencia).
  async function readImage(file, max) {
    if (file.type === 'image/gif' && file.size < 3 * 1024 * 1024) return readDataUrl(file);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, max / img.naturalWidth, max / img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const webp = c.toDataURL('image/webp', 0.86);
      return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', 0.86);
    } finally { URL.revokeObjectURL(url); }
  }
  const kb = s => Math.round(String(s || '').length * 0.75 / 1024);
  const sizeText = n => n >= 1024 ? (n / 1024).toFixed(1).replace('.', ',') + ' MB' : n + ' KB';

  async function drawMediaInfo(id, t) {
    const r = await B.storage.local.get([IMG(id), SLIDES(id), VIDEO(id), 'themeImages']);
    if (id !== currentId()) return;
    const img = r[IMG(id)] || (r.themeImages || {})[id];
    const up = $('#ed-upload-info');
    up.textContent = '';
    if (img) up.append('Imagen guardada (' + sizeText(kb(img)) + ') ', h('button', { class: 'linkbtn', text: 'Quitar', onclick: async () => {
      await B.storage.local.remove(IMG(id));
      await dropLegacyImage(id);
      if (eff(id).bg === 'upload') ov(id).bg = 'none';
      commit(); drawEditor();
    } }));
    else up.append('Ninguna todavía');
    // Pase de imágenes
    const slides = r[SLIDES(id)] || [];
    const box = $('#ed-slides');
    box.textContent = '';
    slides.forEach((src, i) => box.append(h('div', { class: 'slide' }, [h('img', { src, alt: '' }),
      ibtn('x', '', { class: 'btn btn-icon', title: 'Quitar esta imagen', onclick: async () => {
        const list = (await getKey(SLIDES(id))) || [];
        list.splice(i, 1);
        if (list.length) await B.storage.local.set({ [SLIDES(id)]: list }); else await B.storage.local.remove(SLIDES(id));
        drawMediaInfo(id, eff(id));
        drawPreview(null, true);
      } })])));
    if (!slides.length) box.append(h('p', { class: 'muted small', text: 'Sin imágenes de tu PC todavía (máximo ' + MAX_SLIDES + ').' }));
    $('#ed-slide-add').disabled = slides.length >= MAX_SLIDES;
    // Vídeo
    const vi = $('#ed-video-info');
    vi.textContent = '';
    if (r[VIDEO(id)]) vi.append('Vídeo guardado (' + sizeText(kb(r[VIDEO(id)])) + ') ', h('button', { class: 'linkbtn', text: 'Quitar', onclick: async () => {
      await B.storage.local.remove(VIDEO(id));
      drawMediaInfo(id, eff(id));
      drawPreview(null, true);
    } }));
    else vi.append('Ninguno todavía');
  }

  async function dropLegacyImage(id) {
    const legacy = await getKey('themeImages');
    if (legacy && legacy[id]) { delete legacy[id]; await B.storage.local.set({ themeImages: legacy }); }
  }

  function bindMedia() {
    $('#ed-upload').addEventListener('click', () => $('#ed-file').click());
    $('#ed-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const id = currentId();
      try {
        toast('Preparando la imagen…');
        const data = await readImage(file, 2560);
        await B.storage.local.set({ [IMG(id)]: data });
        await dropLegacyImage(id);
        imageCache.delete(id);
        ov(id).bg = 'upload';
        commit();
        drawEditor();
        toast('Imagen puesta de fondo.');
      } catch (err) { toast('No se pudo leer la imagen: ' + (err && err.message || err)); }
    });

    $('#ed-slide-add').addEventListener('click', () => $('#ed-slide-file').click());
    $('#ed-slide-file').addEventListener('change', async e => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      const id = currentId();
      const list = (await getKey(SLIDES(id))) || [];
      const room = MAX_SLIDES - list.length;
      if (files.length > room) toast('Caben ' + MAX_SLIDES + ' imágenes: se añaden las ' + Math.max(0, room) + ' primeras.');
      toast('Preparando las imágenes…');
      for (const f of files.slice(0, Math.max(0, room))) {
        try { list.push(await readImage(f, 1920)); } catch (err) { toast('No se pudo leer ' + f.name); }
      }
      await B.storage.local.set({ [SLIDES(id)]: list });
      ov(id).bg = 'slideshow';
      commit();
      drawEditor();
      drawPreview(null, true);
    });

    $('#ed-video').addEventListener('click', () => $('#ed-video-file').click());
    $('#ed-video-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) { toast('Ese vídeo pesa ' + Math.round(file.size / 1048576) + ' MB. El máximo es ' + MAX_VIDEO_MB + ' MB: recórtalo o bájale la calidad.', 6000); return; }
      const id = currentId();
      try {
        toast('Guardando el vídeo…');
        await B.storage.local.set({ [VIDEO(id)]: await readDataUrl(file) });
        ov(id).bg = 'video';
        commit();
        drawEditor();
        drawPreview(null, true);
        toast('Vídeo puesto de fondo. Va sin sonido y en bucle.');
      } catch (err) { toast('No se pudo guardar el vídeo: ' + (err && err.message || err)); }
    });
  }

  // ---------- Guardar como, exportar, importar, borrar ----------
  function snapshot(t) {
    const out = { c: Object.assign({}, t.c), layout: Object.assign({}, t.layout) };
    for (const k in RK_THEME_BASE) out[k] = Array.isArray(t[k]) ? JSON.parse(JSON.stringify(t[k])) : t[k];
    return out;
  }

  async function mediaOf(id) {
    const r = await B.storage.local.get([IMG(id), SLIDES(id), VIDEO(id), 'themeImages']);
    return { image: r[IMG(id)] || (r.themeImages || {})[id] || null, slides: r[SLIDES(id)] || null, video: r[VIDEO(id)] || null };
  }
  async function putMedia(id, m) {
    const set = {};
    if (m.image) set[IMG(id)] = m.image;
    if (m.slides && m.slides.length) set[SLIDES(id)] = m.slides;
    if (m.video) set[VIDEO(id)] = m.video;
    if (Object.keys(set).length) await B.storage.local.set(set);
  }

  async function addCustom(base, name, tags, media) {
    const id = 'mio-' + Date.now().toString(36);
    const theme = Object.assign({ id, name, desc: 'Tema creado por ti.', tags: ['mío'].concat((tags || []).filter(x => x !== 'mío' && x !== 'temporada')) }, base);
    customs().unshift(theme);
    if (media) await putMedia(id, media);
    settings['theme.id'] = id;
    filter = 'all';
    drawFilters();
    commit();
    drawEditor();
    return id;
  }

  // Limpia un tema que llega de un archivo (solo valores conocidos y con el tipo correcto).
  function cleanTheme(d) {
    const base = { c: {}, layout: {} };
    RK_COLOR_FIELDS.forEach(([k]) => { base.c[k] = rkHex(d.c && d.c[k]) || RK_THEMES[0].c[k]; });
    for (const k in RK_THEME_BASE) {
      const v = d[k], def = RK_THEME_BASE[k];
      if (v === undefined || v === null) continue;
      if (k === 'gradStops') { if (Array.isArray(v)) base.gradStops = v.slice(0, 6).filter(s => Array.isArray(s) && rkHex(s[0])).map(s => [rkHex(s[0]), Math.max(0, Math.min(100, Number(s[1]) || 0))]); continue; }
      if (typeof def === 'number' && typeof v === 'number' && isFinite(v)) base[k] = v;
      else if (typeof def === 'boolean' && typeof v === 'boolean') base[k] = v;
      else if (typeof def === 'string' && typeof v === 'string') base[k] = v.slice(0, 2000);
    }
    if (!RK_BACKGROUNDS.some(b => b[0] === base.bg)) base.bg = 'none';
    if (!RK_FONTS.some(f => f[0] === base.font)) base.font = 'roblox';
    if (!RK_PARTICLES.some(p => p[0] === base.particles)) base.particles = 'none';
    if (!RK_OVERLAYS.some(p => p[0] === base.overlay)) base.overlay = 'none';
    ['bgColor', 'overlayColor', 'pColor'].forEach(k => { if (base[k] && !rkHex(base[k])) base[k] = ''; });
    const L = d.layout || {};
    RK_LAYOUT_OPTIONS.forEach(opt => {
      const v = L[opt.key];
      if (opt.range) { if (typeof v === 'number' && v >= opt.range[0] && v <= opt.range[1]) base.layout[opt.key] = v; }
      else if (opt.options.some(o => o[0] === v)) base.layout[opt.key] = v;
    });
    return base;
  }

  function bindActions() {
    $('#ed-reset').addEventListener('click', async () => {
      const id = currentId();
      const custom = isCustom(id);
      if (!await uiConfirm('¿Restablecer "' + eff(id).name + '"?', custom ? 'Se quitan los retoques que le hiciste después de guardarlo.' : 'Se quitan todos tus retoques y también la imagen, las imágenes del pase y el vídeo que subiste para este tema.', { okText: 'Restablecer', danger: true })) return;
      delete settings['theme.overrides'][id];
      if (!custom) { await B.storage.local.remove([IMG(id), SLIDES(id), VIDEO(id)]); await dropLegacyImage(id); imageCache.delete(id); }
      commit();
      drawEditor();
    });

    $('#ed-saveas').addEventListener('click', async () => {
      const t = eff(currentId());
      const name = await uiPrompt('Nombre del tema nuevo', t.name + ' (mío)', { okText: 'Guardar', icon: 'save' });
      if (!name) return;
      addCustom(snapshot(t), name.slice(0, 40), rkFindTheme(t.id, customs()).tags, await mediaOf(t.id));
      toast('Tema guardado en "Mis temas".');
    });

    $('#ed-export').addEventListener('click', async () => {
      const t = eff(currentId());
      const data = Object.assign({ rocer0Theme: 2, name: t.name }, snapshot(t));
      const m = await mediaOf(t.id);
      if (t.bg === 'upload' && m.image) data.image = m.image;
      if (t.bg === 'slideshow' && m.slides) data.slides = m.slides;
      download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'tema-' + (t.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rocer0') + '.json');
      if (t.bg === 'video' && m.video) toast('El vídeo no va dentro del archivo (pesa mucho): quien lo importe tendrá que poner el suyo.', 5000);
    });

    $('#ed-import').addEventListener('click', () => $('#ed-import-file').click());
    $('#ed-import-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        if (!d || typeof d !== 'object' || !d.c) throw new Error('no es un tema de RoCer0');
        const base = cleanTheme(d);
        const media = {};
        if (typeof d.image === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(d.image)) media.image = d.image;
        if (Array.isArray(d.slides)) media.slides = d.slides.filter(s => typeof s === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(s)).slice(0, MAX_SLIDES);
        if (base.bg === 'upload' && !media.image) base.bg = 'none';
        if (base.bg === 'video' && !base.videoUrl) toast('El tema usaba un vídeo de su PC: ponle el tuyo en Fondo.', 5000);
        await addCustom(base, String(d.name || 'Tema importado').slice(0, 40), [], media);
        toast('Tema importado.');
      } catch (err) { toast('No se pudo importar: ' + err.message, 4500); }
    });

    $('#ed-rename').addEventListener('click', async () => {
      const t = customs().find(x => x.id === currentId());
      const name = t && await uiPrompt('Nuevo nombre', t.name, { okText: 'Renombrar', icon: 'edit' });
      if (!name) return;
      t.name = name.slice(0, 40);
      commit();
      drawEditor();
    });

    $('#ed-delete').addEventListener('click', async () => {
      const id = currentId();
      const t = customs().find(x => x.id === id);
      if (!t || !await uiConfirm('¿Borrar el tema "' + t.name + '"?', 'Se borran también su imagen, sus imágenes y su vídeo.', { okText: 'Borrar', danger: true })) return;
      settings['theme.custom'] = customs().filter(x => x.id !== id);
      delete settings['theme.overrides'][id];
      ['theme.dayTheme', 'theme.nightTheme'].forEach(k => { if (settings[k] === id) settings[k] = RX_DEFAULTS[k]; });
      await B.storage.local.remove([IMG(id), SLIDES(id), VIDEO(id)]);
      await dropLegacyImage(id);
      imageCache.delete(id);
      settings['theme.id'] = 'medianoche';
      commit();
      drawEditor();
    });
  }

  // ---------- Vista previa ----------
  const GAMES = [
    ['Aventura Pirata', 210, 92, '48K'], ['Torre Imposible', 12, 88, '9,1K'], ['Simulador de Mascotas', 330, 95, '210K'], ['Carreras Turbo', 40, 90, '15K'],
    ['Escape del Laboratorio', 280, 86, '3,2K'], ['Ciudad RP', 160, 93, '76K'], ['Arena de Espadas', 0, 89, '22K'], ['Parkour Nocturno', 300, 91, '5,4K']
  ];
  const FRIENDS = [['Luna', 'Ciudad RP', 'rk-ingame', 25], ['Max', 'Torre Imposible', 'rk-ingame', 200], ['Sofi', 'En línea', 'rk-online', 320], ['Leo', 'Desconectado · hace 2 h', '', 140]];
  const SIDE = [['home', 'Inicio'], ['profile', 'Perfil'], ['messages', 'Mensajes'], ['friends', 'Amigos'], ['avatar', 'Avatar'], ['inventory', 'Inventario'], ['trade', 'Intercambios'], ['groups', 'Comunidades']];

  function art(hue, wide) {
    const w = wide ? 320 : 160, hh = 160;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + hh + '" preserveAspectRatio="xMidYMid slice">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(' + hue + ',75%,58%)"/><stop offset="1" stop-color="hsl(' + (hue + 50) + ',70%,26%)"/></linearGradient>' +
      '<radialGradient id="r" cx=".28" cy=".28" r=".55"><stop offset="0" stop-color="hsla(' + (hue + 40) + ',95%,78%,.85)"/><stop offset="1" stop-color="hsla(' + (hue + 40) + ',95%,78%,0)"/></radialGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>' +
      '<path d="M0 ' + (hh - 30) + ' L' + w * 0.3 + ' ' + (hh - 80) + ' L' + w * 0.5 + ' ' + (hh - 55) + ' L' + w * 0.75 + ' ' + (hh - 100) + ' L' + w + ' ' + (hh - 60) + ' L' + w + ' ' + hh + ' L0 ' + hh + 'Z" fill="rgba(0,0,0,.28)"/>' +
      '<circle cx="' + w * 0.78 + '" cy="40" r="14" fill="rgba(255,255,255,.55)"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function rbxIcon(key) {
    const row = RC_RBX_ICONS.find(r => r[0] === key);
    const custom = RC_ICON_CUSTOM['rbx:' + key];
    if (custom && custom.src) {
      if (custom.tint) { const s = h('span', { class: 'rk-i rc-i-mask' }); s.style.setProperty('--rc-mask', 'url("' + custom.src + '")'); return s; }
      return h('img', { class: 'rk-i rc-i-img', src: custom.src, alt: '' });
    }
    return rcIcon(row ? row[3] : 'dot');
  }
  const meta = (r, p) => h('div', { class: 'rk-meta' }, [h('span', {}, [rcIcon('thumb'), r + '%']), h('span', {}, [rcIcon('users'), p])]);

  function buildInner() {
    const head = (title, extra) => h('div', { class: 'rk-head' }, [h('h2', {}, [title]), extra || h('a', { class: 'rk-viewall', href: '#' }, ['Ver todo ', rcIcon('arrow')])]);
    const home = h('div', { id: 'rk-home' });
    home.append(
      h('section', { class: 'rk-card rk-hero', style: 'grid-column: span 12' }, [
        h('div', { class: 'rk-hero-img', style: 'background-image:url("' + art(265, true) + '")' }),
        h('div', { class: 'rk-hero-body' }, [
          h('div', {}, [h('div', { class: 'rk-eyebrow', text: 'Continuar' }), h('h1', { class: 'rk-hero-title', text: '[2026] Aventura Pirata' }),
            h('div', { class: 'rk-meta' }, [h('span', {}, [h('span', { class: 'rk-star' }, [rcIcon('star')]), '92%']), h('span', { text: '· 48.213 jugando' })])]),
          h('div', { class: 'rk-hero-actions' }, [h('button', { class: 'rk-btn rk-btn-play' }, [rcIcon('play'), 'Continuar']), h('button', { class: 'rk-btn rk-btn-ghost rk-btn-icon' }, [rcIcon('heart')])])
        ])
      ]),
      h('section', { class: 'rk-card', style: 'grid-column: span 12' }, [head('Actividad de amigos'), h('div', { class: 'rk-friends' }, FRIENDS.map(([n, st, cls, hue]) =>
        h('div', { class: 'rk-friend' }, [
          h('div', { class: 'rk-avatar' }, [h('div', { style: 'width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,hsl(' + hue + ',70%,60%),hsl(' + (hue + 40) + ',70%,35%))' }), h('span', { class: 'rk-dot ' + cls })]),
          h('div', { class: 'rk-friend-info' }, [h('div', { class: 'rk-friend-name', text: n }), h('div', { class: 'rk-friend-status' }, [h('i', { class: cls }), h('span', { text: st })])]),
          cls === 'rk-ingame' ? h('button', { class: 'rk-btn rk-btn-accent', text: 'Unirse' }) : h('span', { class: 'rk-btn rk-btn-ghost', text: 'Perfil' })
        ])))]),
      h('section', { class: 'rk-card', style: 'grid-column: span 7' }, [head('Continuar', h('span')), h('div', { class: 'rk-grid' }, GAMES.map(([n, hue, r, pl], i) =>
        h('div', { class: 'rk-tile' }, [h('div', { class: 'rk-thumb' }, [h('img', { src: art(hue), alt: '' }), i === 2 ? h('span', { class: 'rk-pill' }, [rcIcon('star'), 'Muy valorado']) : null]), h('div', { class: 'rk-tile-name', text: n }), meta(r, pl)])))]),
      h('section', { class: 'rk-card', style: 'grid-column: span 5' }, [
        h('div', { class: 'rk-head' }, [h('h2', { text: 'Juegos recientes' }), h('div', { class: 'rk-tabs' }, [h('button', { class: 'rk-tab rk-on', text: '30d' }), h('button', { class: 'rk-tab', text: '7d' }), h('button', { class: 'rk-tab', text: 'Todo' })])]),
        h('div', { class: 'rk-list' }, GAMES.slice(0, 5).map(([n, hue], i) => h('div', { class: 'rk-row' }, [
          h('img', { src: art(hue), alt: '', style: 'width:42px;height:42px;border-radius:var(--rk-thumb-radius, var(--rk-radius-sm));flex:none;object-fit:cover' }),
          h('div', { class: 'rk-row-main' }, [h('div', { class: 'rk-row-name', text: n }), h('div', { class: 'rk-row-sub', text: [5, 3, 2, 1, 0.5][i].toString().replace('.', ',') + ' h jugadas' }),
            h('div', { class: 'rk-bar' }, [h('i', { style: 'width:' + [100, 62, 40, 22, 10][i] + '%' })])])
        ])))
      ])
    );
    return [
      h('div', { class: 'pv-header' }, [h('span', { class: 'pv-logo' }, [rcIcon('logo')]), h('span', { text: 'Inicio' }), h('span', { text: 'Descubrir' }), h('span', { text: 'Avatar' }), h('span', { text: 'Tienda' }),
        h('div', { class: 'pv-search' }, [rcIcon('search'), h('span', { text: 'Buscar' })]), h('span', { class: 'pv-robux' }, [rbxIcon('robux'), ' 1.250'])]),
      h('div', { class: 'pv-body' }, [
        h('nav', { class: 'pv-side' }, SIDE.map(([k, l], i) => h('span', { class: 'pv-side-item' + (i === 0 ? ' on' : '') }, [rbxIcon(k), h('span', { text: l })]))),
        h('div', { class: 'pv-main' }, [home, h('div', { class: 'pv-footer', text: 'Sobre nosotros · Empleo · Blog · Padres · Tarjetas regalo · Ayuda · Términos · Privacidad' })])
      ])
    ];
  }

  let fxMount = null, pvSeq = 0;
  async function drawPreview(themeId, rebuild) {
    const box = $('#preview');
    if (!box) return;
    const seq = ++pvSeq;
    const t = eff(themeId || currentId());
    const image = t.bg === 'upload' ? await themeImage(t.id) : null;
    if (seq !== pvSeq) return;
    const anim = settings['theme.animations'] !== false;
    const p = rkThemeVars(t, { animations: anim, image });
    for (let i = box.style.length - 1; i >= 0; i--) { const k = box.style[i]; if (k.startsWith('--rk-') || k.startsWith('--p5-')) box.style.removeProperty(k); }
    for (const k in p.vars) box.style.setProperty(k, p.vars[k]);
    box.className = 'preview ' + p.classes.filter(c => c.startsWith('rk-l-') || c.startsWith('rk-t-') || ['rk-anim', 'rk-glow', 'rk-glass', 'rk-font', 'rk-parallax', 'rk-dark', 'rk-light', 'rk-locked'].includes(c)).join(' ');
    if (!box.querySelector('.preview-inner')) {
      box.textContent = '';
      box.append(h('div', { class: 'preview-bg' }), h('div', { class: 'pv-fx' }), h('div', { class: 'preview-ov' }), h('div', { class: 'preview-inner' }));
      box.addEventListener('mousemove', e => {
        const r = box.getBoundingClientRect();
        box.style.setProperty('--rk-mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        box.style.setProperty('--rk-my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
    }
    const inner = box.querySelector('.preview-inner');
    if (rebuild || inner.dataset.tid !== t.id || !inner.firstChild) {
      inner.textContent = '';
      inner.append(...buildInner());
      inner.dataset.tid = t.id;
      // Temas fijos: el menú y los títulos como en roblox.com (letras recortadas en Daniel, eco eléctrico en Pablo).
      if (t.locked) rkFixedFonts(document, t.id);
      if (t.locked && t.id === 'daniel') {
        inner.querySelectorAll('.pv-side-item > span').forEach(n => rkRansomHost(n, 18, 'list'));
        inner.querySelectorAll('#rk-home .rk-head h2, #rk-home .rk-hero-title').forEach(n => rkRansomHost(n, 30, 'title'));
      }
      // En Pablo el menú lleva dorsales (01, 02…) y no eco, como en roblox.com.
      if (t.locked && t.id === 'pablo') inner.querySelectorAll('#rk-home .rk-head h2, #rk-home .rk-hero-title').forEach(n => rkEchoHost(n, 30));
    }
    if (typeof RkFx !== 'undefined') {
      if (!fxMount) fxMount = new RkFx.Mount({ doc: document, root: box.querySelector('.pv-fx'), box, mediaUrl: cfg => B.runtime.getURL('page/bgmedia.html') + '#' + encodeURIComponent(JSON.stringify(cfg)) });
      if (rebuild && fxMount.media) fxMount.mediaKey = '';
      fxMount.update(t, anim);
    }
  }

  // Al salir de la pestaña se paran las partículas y el vídeo de la vista previa.
  window.addEventListener('hashchange', () => { if (currentTab() !== 'themes' && fxMount) fxMount.destroy(); });

  window.renderThemes = function () {
    if (firstRun) {
      firstRun = false;
      bindAuto();
      bindControls();
    }
    drawAuto();
    drawFilters();
    drawGallery();
    drawEditor();
    drawPreview(null, true);
  };
  TAB_LOADERS.themes = window.renderThemes;
  window.__pvRefresh = () => { if (!firstRun) { drawGallery(); drawPreview(null, true); } };
})();
