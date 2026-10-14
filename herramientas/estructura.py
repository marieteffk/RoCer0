# Genera content/layout.css (estructura de los temas) a partir de listas de selectores.
T = 'html.rk-theme'
HEADER = ':is(#header, .rbx-header)'
SIDENAV = ':is(#navigation, .left-nav)'
CONTENT = ':is(#container-main > .content, .container-main > .content)'
FOOTER = ':is(#footer-container, footer.container-footer)'
PANELS = (':is(.section-content, .profile-header, .profile-header-top, .game-main-content, .game-about-container, .game-stats-container, .rbx-tab-content, '
          '.rbx-game-server-item, .game-server-item, .rbx-public-game-server-item, .rbx-friends-game-server-item, .card, .menu-vertical, .catalog-header, '
          '.search-options, .trade-row, .trades-list-detail, .item-details-info-content, .group-details, #settings-container .section-content)')
OWN_PANELS = ':is(#rk-home .rk-card, .rx-panel)'
GAMES = ':is(.game-card-container, .grid-item-container, [data-testid="game-tile"], .list-item.game-card, .hover-game-tile, #rk-home .rk-tile)'
THUMBS = (':is(.game-card-thumb-container, .game-card-thumb, .game-tile .thumbnail-2d-container, .game-card-container .thumbnail-2d-container, '
          '.item-card-thumb-container, .item-card-thumb, .catalog-item-container .thumbnail-2d-container, #rk-home .rk-thumb)')
BTN_PRIMARY = ':is(.btn-primary-md, .btn-primary-sm, .btn-primary-lg, .btn-primary-xs, .btn-cta-md, .btn-cta-sm, .btn-cta-lg, .btn-cta-xs)'
BTN_PLAY = ':is(.btn-growth-md, .btn-growth-lg, .btn-growth-sm, .btn-growth-xs, [class*="btn-common-play-game"])'
BTN_SECOND = ':is(.btn-secondary-md, .btn-secondary-sm, .btn-secondary-lg, .btn-secondary-xs, .btn-control-md, .btn-control-sm, .btn-control-xs, .btn-control-lg)'
OWN_PRIMARY = ':is(.rx-btn.rx-primary, .rx-btn.rx-on, #rk-home .rk-btn-accent)'
OWN_PLAY = ':is(.rx-btn.rx-play, #rk-home .rk-btn-play)'
OWN_BTNS = ':is(.rx-btn, #rk-home .rk-btn, .rc-chip)'
HEADS = ':is(.container-header h2, .container-header h3, .games-list-header h2, .game-sort-header-container h2, #rk-home .rk-head h2, .rx-panel-title)'
AVATARS = (':is(.avatar-card-image, .avatar-headshot, .avatar .thumbnail-2d-container, .friends-carousel-tile .thumbnail-2d-container, '
           '.avatar-card-container .thumbnail-2d-container, .user-profile-header .radius-circle, .profile-avatar-thumb, #rk-home .rk-avatar img, #rk-home .rk-avatar > div:first-child, .rc-avatars img, .rx-acc-item img)')

out = []
def r(sel, body): out.append(sel + ' { ' + body + ' }')
def L(name): return T + '.rk-l-' + name     # en roblox.com
def P(name): return '.rk-l-' + name          # también en la vista previa de Ajustes

out.append('/* RoCer0 · Estructura de los temas (generado). Cada opción es una clase rk-l-<opción>-<valor> en <html>.\n   Sin tema activo no hace nada. Lo que empieza por .rk-l- sin html.rk-theme también se ve en la vista previa de Ajustes. */')

out.append('\n/* ---------- Barra de arriba ---------- */')
r(L('nav-floating') + ' ' + HEADER, 'top: 10px !important; left: 12px !important; right: 12px !important; width: auto !important; border: 1px solid var(--rk-border) !important; border-radius: calc(var(--rk-radius) + 4px) !important; box-shadow: var(--rk-shadow) !important;')
r(L('nav-floating') + ' ' + SIDENAV, 'margin-top: 14px !important;')
r(L('nav-floating') + ' #container-main', 'margin-top: 14px !important;')
r(L('nav-minimal') + ' ' + HEADER, 'background: color-mix(in srgb, var(--rk-bg) 45%, transparent) !important; border-bottom-color: transparent !important; box-shadow: none !important; backdrop-filter: blur(18px) saturate(160%) !important; -webkit-backdrop-filter: blur(18px) saturate(160%) !important;')
r(L('nav-accent') + ' ' + HEADER, 'background: linear-gradient(90deg, var(--rk-accent), var(--rk-accent-2)) !important; border-bottom: 0 !important; box-shadow: var(--rk-glow), 0 4px 18px rgba(0,0,0,.25) !important;')
r(L('nav-accent') + ' ' + HEADER + ' :is(.text-header, .nav-menu-title, .font-header-2, .rbx-navbar a, #nav-robux-amount, .nav-robux-amount, .text-robux, .age-bracket-label, .text-overflow)', 'color: var(--rk-accent-text) !important;')
r(L('nav-accent') + ' ' + HEADER + ' :is([class^="icon-nav-"], [class*=" icon-nav-"], .icon-logo, .icon-logo-r, #nav-robux)', 'filter: var(--rk-nav-icon-filter, none);')
r(L('nav-autohide') + ' ' + HEADER, 'transition: transform .3s ease !important;')
r(L('nav-autohide') + '.rk-nav-away ' + HEADER, 'transform: translateY(calc(-100% - 14px)) !important;')
r(P('nav-floating') + ' .pv-header', 'margin: 8px 10px 0; border: 1px solid var(--rk-border); border-radius: calc(var(--rk-radius) + 2px); box-shadow: var(--rk-shadow);')
r(P('nav-minimal') + ' .pv-header', 'background: transparent; border-bottom-color: transparent;')
r(P('nav-accent') + ' .pv-header', 'background: linear-gradient(90deg, var(--rk-accent), var(--rk-accent-2)); color: var(--rk-accent-text); border-bottom: 0;')

out.append('\n/* ---------- Menú lateral ---------- */')
r(L('sidebar-floating') + ' ' + SIDENAV, 'margin: 10px 0 10px 10px !important; border: 1px solid var(--rk-border) !important; border-radius: var(--rk-radius) !important; box-shadow: var(--rk-shadow) !important;')
r(L('sidebar-icons') + ' ' + SIDENAV, 'width: 64px !important; min-width: 64px !important; overflow-x: hidden !important; transition: width .2s ease, box-shadow .2s ease; z-index: 1001;')
r(L('sidebar-icons') + ' ' + SIDENAV + ':hover', 'width: 240px !important; box-shadow: var(--rk-shadow) !important;')
r(L('sidebar-icons') + ' ' + SIDENAV + ':not(:hover) :is(.dynamic-ellipsis-item, .font-header-2, .text-label-small, .left-nav-label, .rbx-platform-event-container, #btr-blogfeed-container, .notification-blue)', 'opacity: 0 !important;')
r(L('sidebar-icons') + ' #wrap', '--left-nav-reserved-width: 76px !important;')
r(L('sidebar-hidden') + ' ' + SIDENAV, 'display: none !important;')
r(L('sidebar-hidden') + ' #wrap', '--left-nav-reserved-width: 0px !important;')

out.append('\n/* ---------- Ancho y tamaño ---------- */')
r(L('width-wide') + ' ' + CONTENT, 'max-width: none !important; width: auto !important;')
r(L('width-narrow') + ' ' + CONTENT, 'max-width: 1000px !important; margin-left: auto !important; margin-right: auto !important;')
r(L('zoom') + ' ' + CONTENT, 'zoom: var(--rk-zoom, 1);')
r(L('footer-hidden') + ' ' + FOOTER, 'display: none !important;')

out.append('\n/* ---------- Paneles ---------- */')
for sel in (L('cards-flat') + ' ' + PANELS, P('cards-flat') + ' ' + OWN_PANELS):
    r(sel, 'border-color: transparent !important; box-shadow: none !important;')
for sel in (L('cards-outlined') + ' ' + PANELS, P('cards-outlined') + ' ' + OWN_PANELS):
    r(sel, 'background: color-mix(in srgb, var(--rk-surface) 28%, transparent) !important; border: 1px solid var(--rk-border) !important; box-shadow: none !important;')
for sel in (L('cards-elevated') + ' ' + PANELS, P('cards-elevated') + ' ' + OWN_PANELS):
    r(sel, 'border-color: transparent !important; box-shadow: 0 14px 34px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.18) !important;')
for sel in (L('cards-glass') + ' ' + PANELS, P('cards-glass') + ' ' + OWN_PANELS):
    r(sel, 'background: color-mix(in srgb, var(--rk-surface) 50%, transparent) !important; border-color: color-mix(in srgb, var(--rk-text) 14%, transparent) !important; backdrop-filter: blur(16px) saturate(150%) !important; -webkit-backdrop-filter: blur(16px) saturate(150%) !important;')

out.append('\n/* ---------- Tarjetas de juego y miniaturas ---------- */')
r(L('gameCards-boxed') + ' :is(.game-card-container, [data-testid="game-tile"], .hover-game-tile)', 'background: var(--rk-panel) !important; border: 1px solid var(--rk-border) !important; border-radius: var(--rk-radius) !important; padding: 6px 6px 8px !important;')
r(P('gameCards-boxed') + ' #rk-home .rk-tile', 'background: var(--rk-panel-2); border: 1px solid var(--rk-border); border-radius: var(--rk-radius-sm); padding: 6px 6px 8px;')
r(L('gameCards-minimal') + ' :is(.game-card-info, .game-card-native-ad, [class*="game-card-info"])', 'display: none !important;')
r(P('gameCards-minimal') + ' #rk-home .rk-tile .rk-meta', 'display: none !important;')
r(P('gameCards-outline') + ' ' + GAMES + ':hover ' + THUMBS, 'box-shadow: 0 0 0 2px var(--rk-accent), 0 0 16px var(--rk-accent-glow) !important;')
r(P('tiles-framed') + ' ' + THUMBS, 'box-shadow: 0 0 0 2px var(--rk-accent), 0 0 0 4px color-mix(in srgb, var(--rk-accent-2) 45%, transparent) !important;')

out.append('\n/* ---------- Al pasar el ratón ---------- */')
r(P('hover-lift') + '.rk-anim ' + GAMES, 'transition: transform .15s ease;')
r(P('hover-lift') + '.rk-anim ' + GAMES + ':hover', 'transform: translateY(-3px);')
r(P('hover-glow') + ' ' + GAMES + ':hover ' + THUMBS, 'box-shadow: 0 0 0 2px var(--rk-accent), 0 0 24px var(--rk-accent-glow) !important;')
r(P('hover-zoom') + ' ' + THUMBS + ' img', 'transition: transform .3s ease;')
r(P('hover-zoom') + ' ' + GAMES + ':hover ' + THUMBS + ' img', 'transform: scale(1.08);')
r(P('hover-tilt') + '.rk-anim ' + GAMES, 'transition: transform .2s ease;')
r(P('hover-tilt') + '.rk-anim ' + GAMES + ':hover', 'transform: perspective(700px) rotateX(5deg) rotateY(-6deg) translateY(-2px);')
r(P('hover-none') + ' #rk-home .rk-tile:hover .rk-thumb img', 'transform: none !important;')

out.append('\n/* ---------- Botones ---------- */')
r(P('buttons-pill') + ' ' + OWN_BTNS, 'border-radius: 999px !important;')
r(P('buttons-square') + ' ' + OWN_BTNS, 'border-radius: 2px !important;')
for sel in (L('buttons-outline') + ' ' + BTN_PRIMARY, P('buttons-outline') + ' ' + OWN_PRIMARY):
    r(sel, 'background: transparent !important; color: var(--rk-accent) !important; border: 2px solid var(--rk-accent) !important; box-shadow: none !important;')
for sel in (L('buttons-outline') + ' ' + BTN_PLAY, P('buttons-outline') + ' ' + OWN_PLAY):
    r(sel, 'background: transparent !important; color: var(--rk-success) !important; border: 2px solid var(--rk-success) !important; box-shadow: none !important;')
r(L('buttons-outline') + ' ' + BTN_SECOND, 'background: transparent !important;')
for sel in (L('buttons-soft') + ' ' + BTN_PRIMARY, P('buttons-soft') + ' ' + OWN_PRIMARY):
    r(sel, 'background: var(--rk-accent-soft) !important; color: var(--rk-accent) !important; border-color: transparent !important; box-shadow: none !important;')
for sel in (L('buttons-soft') + ' ' + BTN_PLAY, P('buttons-soft') + ' ' + OWN_PLAY):
    r(sel, 'background: color-mix(in srgb, var(--rk-success) 20%, transparent) !important; color: var(--rk-success) !important; border-color: transparent !important; box-shadow: none !important;')
r(L('buttons-soft') + ' ' + BTN_SECOND, 'border-color: transparent !important;')

out.append('\n/* ---------- Títulos ---------- */')
r(P('headings-big') + ' ' + HEADS, 'font-size: 25px !important; font-weight: 900 !important; letter-spacing: -.02em !important;')
r(P('headings-caps') + ' ' + HEADS, 'text-transform: uppercase !important; letter-spacing: .14em !important; font-size: 14px !important; font-weight: 800 !important;')
r(P('headings-accent') + ' ' + HEADS, 'border-left: 4px solid var(--rk-accent) !important; padding-left: 10px !important;')
r(P('headings-gradient') + ' ' + HEADS, 'background: linear-gradient(90deg, var(--rk-accent), var(--rk-accent-2)) !important; -webkit-background-clip: text !important; background-clip: text !important; -webkit-text-fill-color: transparent !important; width: fit-content;')

out.append('\n/* ---------- Espaciado ---------- */')
r(P('density-compact') + ' #rk-home', '--rk-gap: 9px !important;')
r(P('density-compact') + ' #rk-home .rk-card', 'padding: 10px 12px !important;')
r(L('density-compact') + ' .section-content', 'padding: 9px !important;')
r(P('density-spacious') + ' #rk-home', '--rk-gap: 22px !important;')
r(P('density-spacious') + ' #rk-home .rk-card', 'padding: 22px 26px !important;')
r(L('density-spacious') + ' .section-content', 'padding: 20px !important;')

out.append('\n/* ---------- Inicio rediseñado ---------- */')
r(P('home-stacked') + ' #rk-home .rk-card', 'grid-column: 1 / -1 !important;')
r(P('home-compact') + ' #rk-home .rk-hero', 'min-height: 118px !important;')
r(P('home-compact') + ' #rk-home .rk-hero-title', 'font-size: 22px !important;')
r(P('home-compact') + ' #rk-home .rk-grid', 'grid-template-columns: repeat(6, minmax(0, 1fr)) !important;')
r(P('home-compact') + ' #rk-home .rk-featured', 'min-height: 210px !important;')
r(P('home-showcase') + ' #rk-home .rk-hero', 'min-height: 330px !important;')
r(P('home-showcase') + ' #rk-home .rk-hero-img', 'inset: 0 !important; -webkit-mask-image: linear-gradient(0deg, transparent 0%, rgba(0,0,0,.65) 35%, #000 70%) !important; mask-image: linear-gradient(0deg, transparent 0%, rgba(0,0,0,.65) 35%, #000 70%) !important;')
r(P('home-showcase') + ' #rk-home .rk-hero-title', 'font-size: 46px !important; text-shadow: 0 3px 18px rgba(0,0,0,.45) !important;')
r(P('home-showcase') + ' #rk-home .rk-featured', 'min-height: 380px !important;')

out.append('\n/* ---------- Avatares ---------- */')
r(P('avatars-rounded') + ' ' + AVATARS, 'border-radius: var(--rk-radius-sm) !important;')
r(P('avatars-square') + ' ' + AVATARS, 'border-radius: 3px !important;')
r(P('avatars-hex') + ' ' + AVATARS, 'border-radius: 0 !important; clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);')

out.append('\n/* ---------- Cursor ---------- */')
CUR = ':is(.rk-l-cursor-accent, .rk-l-cursor-ring, .rk-l-cursor-dot)'
r(T + CUR + ', ' + T + CUR + ' body', 'cursor: var(--rk-cursor, auto);')
r(T + CUR + ' :is(a, button, [role="button"], label, select, summary, [class*="btn-"], .rk-tile, .rk-coll, .rc-chip, .rx-btn)', 'cursor: var(--rk-cursor-link, pointer) !important;')
r(T + CUR + ' :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), textarea, [contenteditable="true"])', 'cursor: text !important;')

out.append('\n/* ---------- Barra de desplazamiento ---------- */')
r(L('scrollbar-thin'), 'scrollbar-width: thin;')
r(L('scrollbar-thin') + ' ::-webkit-scrollbar', 'width: 6px !important; height: 6px !important;')
r(L('scrollbar-accent'), 'scrollbar-color: var(--rk-accent) transparent;')
r(L('scrollbar-accent') + ' ::-webkit-scrollbar-thumb', 'background: var(--rk-accent) !important;')
r(L('scrollbar-hidden') + ', ' + L('scrollbar-hidden') + ' body', 'scrollbar-width: none;')
r(L('scrollbar-hidden') + ' ::-webkit-scrollbar', 'display: none !important;')

out.append('\n/* ---------- Animación al abrir una página ---------- */')
out.append('@keyframes rk-in-fade { from { opacity: 0; } to { opacity: 1; } }')
out.append('@keyframes rk-in-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }')
out.append('@keyframes rk-in-pop { 0% { opacity: 0; transform: scale(.94); } 60% { opacity: 1; transform: scale(1.015); } 100% { opacity: 1; transform: none; } }')
for kind, dur in (('fade', '.5s ease'), ('rise', '.5s cubic-bezier(.2,.8,.2,1)'), ('pop', '.45s cubic-bezier(.2,.9,.3,1.2)')):
    r(T + '.rk-anim.rk-l-animIn-' + kind + ' ' + CONTENT, 'animation: rk-in-fade .4s ease both;')
    r('.rk-anim.rk-l-animIn-' + kind + ' :is(#rk-home .rk-card, .section-content, .container-list)', 'animation: rk-in-' + kind + ' ' + dur + ' both;')
for i in range(2, 9):
    r('.rk-anim[class*="rk-l-animIn-"] #rk-home .rk-card:nth-child(' + str(i) + ')', 'animation-delay: ' + str((i - 1) * 45) + 'ms;')
out.append('@media (prefers-reduced-motion: reduce) { [class*="rk-l-animIn-"] * { animation-duration: .01ms !important; animation-delay: 0s !important; } }')

import sys
open(sys.argv[1], 'w').write('\n'.join(out) + '\n')
print(len(out), 'reglas')
