// Pestaña "RoCer0" dentro de los Ajustes de Roblox (roblox.com/my/account) y entrada en el
// menú de la rueda dentada. Los ajustes se cargan en un marco con la página de ajustes de la extensión.
RX.features.push({
  id: 'settingsTab',
  run: function (s) {
    if (!RX.isTop || !s['nav.settingsTab']) return;
    this.extOrigin = RX.B.runtime.getURL('').replace(/\/$/, '');
    this.gearMenu();
    if (/^\/my\/account\/?$/i.test(RX.path())) this.accountPage();
  },

  tabName: function (t) { return String(t || '').replace(/[^a-z-]/gi, '').slice(0, 20) || 'start'; },

  // ---------- Menú de la rueda dentada ----------
  gearMenu: function () {
    var self = this;
    var add = function () {
      document.querySelectorAll('a[href*="/my/account"]').forEach(function (a) {
        if (a.closest('.rc-gear-item, .rc-menu-item, #rc-settings, #rk-home, .rx-panel')) return;
        var li = a.closest('li');
        var ul = li && li.parentElement;
        if (!ul || ul.querySelector(':scope > .rc-gear-item')) return;
        // Solo en menús desplegables (la rueda dentada), no en la propia página de Ajustes.
        if (!ul.closest('#settings-popover-menu, .popover, [class*="popover"], [role="menu"]') && !ul.classList.contains('dropdown-menu')) return;
        var item = li.cloneNode(true);
        item.classList.add('rc-gear-item');
        item.classList.remove('active');
        item.removeAttribute('id');
        item.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
        var link = item.querySelector('a') || item;
        link.setAttribute('href', '/my/account?rocer0=start');
        link.textContent = '';
        link.appendChild(RX.icon('logo', { cls: 'rc-gear-logo' }));
        link.appendChild(document.createTextNode(' RoCer0'));
        link.addEventListener('click', function (e) {
          // Si ya estás en Ajustes, se abre la pestaña sin recargar.
          if (self.menu && document.contains(self.menu)) { e.preventDefault(); self.open('start'); document.body.click(); }
        });
        li.after(item);
      });
    };
    add();
    var t;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(add, 200); }).observe(document.body, { childList: true, subtree: true });
  },

  // ---------- Página de Ajustes ----------
  accountPage: async function () {
    var self = this;
    var want = new URLSearchParams(location.search).get('rocer0');
    var menu = await this.waitMenu(12000);
    if (!menu) { this.fallback(want); return; }
    this.install(menu);
    if (want) this.open(want);

    window.addEventListener('message', function (e) {
      if (e.origin !== self.extOrigin || !e.data || typeof e.data.rocer0 !== 'string') return;
      if (e.data.rocer0 === 'ready') { self.ready = true; clearTimeout(self.failTimer); }
      if (e.data.rocer0 === 'tab' && self.isOpen) { self.tab = self.tabName(e.data.tab); self.setUrl(self.tab); }
    });
    // Roblox puede volver a pintar el menú o el contenido: se vuelve a poner la pestaña.
    var t;
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!self.menu || !document.contains(self.menu) || !document.contains(self.item)) {
          var m = self.findMenu();
          if (m) self.install(m);
        }
        if (self.isOpen) self.show();
      }, 150);
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', function () { if (self.isOpen) self.close(); });
  },

  waitMenu: function (timeout) {
    var self = this;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function check() {
        var m = self.findMenu();
        if (m || Date.now() - start > timeout) resolve(m);
        else setTimeout(check, 300);
      })();
    });
  },

  findMenu: function () {
    var sels = ['#vertical-menu', '#settings-container .menu-vertical', 'ul.menu-vertical', '.menu-vertical[role="tablist"]', '#settings-container [role="tablist"]'];
    for (var i = 0; i < sels.length; i++) {
      var m = document.querySelector(sels[i]);
      if (m && m.querySelector('li, a') && m.offsetParent !== null) return m;
    }
    // Si Roblox cambia las clases: la lista que tiene los enlaces a las secciones de Ajustes.
    var a = document.querySelector('a[href*="#!/info"], a[href*="#!/account-info"], a[href*="#!/security"], a[href*="#!/privacy"], a[href*="#!/notifications"]');
    var li = a && a.closest('li');
    return li && li.parentElement ? li.parentElement : null;
  },

  findContent: function (menu) {
    var sels = ['.tab-content', '.rbx-tab-content', '.settings-content', '[role="tabpanel"]', '#settings-container .col-sm-9'];
    var node = menu.parentElement;
    for (var up = 0; up < 6 && node && node !== document.body; up++) {
      for (var i = 0; i < sels.length; i++) {
        var found = Array.prototype.find.call(node.querySelectorAll(sels[i]), function (c) { return !c.contains(menu) && c.id !== 'rc-settings'; });
        if (found) return found;
      }
      node = node.parentElement;
    }
    // Último recurso: la columna que está al lado del menú.
    var col = menu;
    for (var k = 0; k < 5 && col && col.parentElement; k++) {
      var sib = col.nextElementSibling;
      while (sib && (sib.id === 'rc-settings' || sib.offsetHeight < 30)) sib = sib.nextElementSibling;
      if (sib) return sib;
      col = col.parentElement;
    }
    return null;
  },

  install: function (menu) {
    var self = this;
    this.menu = menu;
    if (this.item && this.item.parentElement === menu) return;
    var old = menu.querySelector(':scope > .rc-menu-item');
    if (old) old.remove();
    var tpl = Array.prototype.find.call(menu.children, function (c) { return c.tagName === 'LI'; });
    var item, link;
    if (tpl) {
      item = tpl.cloneNode(true);
      item.removeAttribute('id');
      item.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      item.classList.remove('active', 'selected');
      item.removeAttribute('aria-selected');
      link = item.querySelector('a') || item;
      var label = null;
      link.querySelectorAll('*').forEach(function (n) { if (!label && !n.children.length && (n.textContent || '').trim()) label = n; });
      (label || link).textContent = '';
      (label || link).appendChild(RX.icon('logo', { cls: 'rc-menu-logo' }));
      (label || link).appendChild(document.createTextNode(' RoCer0'));
    } else {
      item = RX.el('li', {}, [link = RX.el('a', {}, [RX.icon('logo', { cls: 'rc-menu-logo' }), ' RoCer0'])]);
    }
    item.classList.add('rc-menu-item');
    if (link.tagName === 'A') link.setAttribute('href', '/my/account?rocer0=start');
    item.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); self.open(self.tab || 'start'); }, true);
    menu.appendChild(item);
    this.item = item;
    // Al pulsar otra sección de Roblox se cierra la de RoCer0.
    if (!menu.__rcListen) {
      menu.__rcListen = true;
      menu.addEventListener('click', function (e) { if (self.isOpen && !e.target.closest('.rc-menu-item')) self.close(); }, true);
    }
    // Menú horizontal (pantallas estrechas).
    var hz = document.querySelector('#horizontal-tabs, .rbx-tabs-horizontal');
    if (hz && hz !== menu && !hz.querySelector('.rc-menu-item')) {
      var htpl = hz.querySelector('li');
      if (htpl) {
        var hi = htpl.cloneNode(true);
        hi.classList.remove('active');
        hi.classList.add('rc-menu-item');
        hi.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
        var hl = hi.querySelector('a') || hi;
        hl.textContent = '';
        hl.appendChild(RX.icon('logo', { cls: 'rc-menu-logo' }));
        hl.appendChild(document.createTextNode(' RoCer0'));
        hi.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); self.open(self.tab || 'start'); }, true);
        hz.appendChild(hi);
        hz.addEventListener('click', function (e) { if (self.isOpen && !e.target.closest('.rc-menu-item')) self.close(); }, true);
      }
    }
  },

  panel: function () {
    var self = this;
    if (this.box) return this.box;
    var el = RX.el;
    this.ready = false;
    this.frame = el('iframe', { id: 'rc-settings-frame', title: 'Ajustes de RoCer0', allow: 'clipboard-read; clipboard-write' });
    this.fail = el('div', { class: 'rc-settings-fail', hidden: true }, [
      el('p', { text: 'No se pudieron cargar los ajustes dentro de Roblox.' }),
      RX.ibtn('external', 'Abrirlos en una pestaña', { class: 'rx-btn rx-primary', onclick: function () { RX.send('openOptions', { hash: self.tab || 'start' }); } })
    ]);
    this.box = el('div', { id: 'rc-settings' }, [this.frame, this.fail]);
    return this.box;
  },

  open: function (tab) {
    this.tab = this.tabName(tab);
    this.isOpen = true;
    var box = this.panel();
    var fresh = !this.frame.getAttribute('src');
    this.show();
    if (fresh) this.load();
    else if (this.frame.contentWindow) this.frame.contentWindow.postMessage({ rocer0: 'show', tab: this.tab }, '*');
    this.setUrl(this.tab);
    var top = box.getBoundingClientRect().top + window.scrollY - 90;
    if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  },

  // Carga los ajustes en el marco (también si Roblox lo sacó de la página y se vuelve a poner).
  load: function () {
    var self = this;
    this.ready = false;
    this.fail.hidden = true;
    this.frame.setAttribute('src', RX.B.runtime.getURL('options/options.html') + '?embed=1#' + this.tab);
    clearTimeout(this.failTimer);
    this.failTimer = setTimeout(function () { if (!self.ready) self.fail.hidden = false; }, 8000);
  },

  show: function () {
    var box = this.panel();
    var attached = document.contains(box);
    if (!this.content || !document.contains(this.content) || this.content.contains(this.menu)) this.content = this.menu ? this.findContent(this.menu) : null;
    if (this.content) {
      if (box.parentElement !== this.content) this.content.appendChild(box);
      this.content.classList.add('rc-settings-on');
    } else if (!document.contains(box)) {
      (this.menu && this.menu.parentElement ? this.menu.parentElement : document.body).after(box);
    }
    box.hidden = false;
    if (!attached && document.contains(box) && this.frame.getAttribute('src')) this.load();
    var self = this;
    if (this.menu) {
      this.menu.querySelectorAll(':scope > li.active:not(.rc-menu-item)').forEach(function (li) {
        li.classList.remove('active');
        (self.wasActive = self.wasActive || []).indexOf(li) < 0 && self.wasActive.push(li);
      });
    }
    document.querySelectorAll('.rc-menu-item').forEach(function (n) { n.classList.add('active'); });
  },

  close: function () {
    this.isOpen = false;
    if (this.content) this.content.classList.remove('rc-settings-on');
    if (this.box) this.box.hidden = true;
    document.querySelectorAll('.rc-menu-item').forEach(function (n) { n.classList.remove('active'); });
    (this.wasActive || []).forEach(function (li) { if (document.contains(li)) li.classList.add('active'); });
    this.wasActive = [];
    this.setUrl(null);
  },

  setUrl: function (tab) {
    var u = new URL(location.href);
    if (tab) u.searchParams.set('rocer0', tab); else u.searchParams.delete('rocer0');
    if (u.href !== location.href) history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  },

  // Si no se encuentra el menú de Roblox: un recuadro al principio de la página.
  fallback: function (want) {
    var self = this, el = RX.el;
    var anchor = document.querySelector('#settings-container, #container-main .content, main, #container-main');
    if (!anchor) return;
    var box = this.panel();
    box.hidden = !want;
    var bar = el('div', { class: 'rx-panel rc-settings-bar' }, [
      el('div', { class: 'rc-settings-bar-title' }, [RX.icon('logo', { cls: 'rc-menu-logo' }), el('b', { text: 'RoCer0' }), el('span', { class: 'rx-muted', text: 'Ajustes de la extensión' })]),
      RX.ibtn('gear', want ? 'Ocultar' : 'Abrir los ajustes', { class: 'rx-btn rx-primary', onclick: function (e) {
        if (box.hidden) { self.open(self.tab || 'start'); RX.setText(e.currentTarget, 'Ocultar'); }
        else { self.close(); RX.setText(e.currentTarget, 'Abrir los ajustes'); }
      } })
    ]);
    anchor.insertBefore(bar, anchor.firstChild);
    bar.after(box);
    this.content = null;
    this.menu = null;
    window.addEventListener('message', function (e) {
      if (e.origin === self.extOrigin && e.data && e.data.rocer0 === 'ready') { self.ready = true; clearTimeout(self.failTimer); }
      if (e.origin === self.extOrigin && e.data && e.data.rocer0 === 'tab' && self.isOpen) { self.tab = self.tabName(e.data.tab); self.setUrl(self.tab); }
    });
    if (want) this.open(want);
  }
});
