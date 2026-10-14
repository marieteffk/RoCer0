// Iconos propios de RoCer0 (24x24, trazo). Se dibujan con createElementNS, sin innerHTML.
// Cualquier icono se puede cambiar por una imagen tuya desde Ajustes → Temas → Iconos.
// Las piezas con "duo: 1" se rellenan en el estilo duotono; las que llevan "fill" van siempre rellenas.

var RC_ICONS = {
  logo: [['rect', { x: 2.5, y: 2.5, width: 19, height: 19, rx: 6, duo: 1 }], ['path', { d: 'M7.5 16.5v-9h3.2a2.6 2.6 0 0 1 0 5.2H7.5M10.6 12.7l2.4 3.8' }], ['rect', { x: 14.2, y: 7.5, width: 3.6, height: 9, rx: 1.8 }]],
  home: [['path', { d: 'M3.5 10.5 12 3.5l8.5 7' }], ['path', { d: 'M5.5 9v11.5h4.5v-6h4v6h4.5V9', duo: 1 }]],
  search: [['circle', { cx: 10.5, cy: 10.5, r: 6.5, duo: 1 }], ['path', { d: 'M20 20l-4.6-4.6' }]],
  gear: [['path', { d: 'M19.2 10.27 21.46 10.35v3.3l-2.26.08-.89 2.14 1.54 1.65-2.33 2.33-1.65-1.54-2.14.89-.08 2.26h-3.3l-.08-2.26-2.14-.89-1.65 1.54-2.33-2.33 1.54-1.65-.89-2.14-2.26-.08v-3.3l2.26-.08.89-2.14-1.54-1.65 2.33-2.33 1.65 1.54 2.14-.89.08-2.26h3.3l.08 2.26 2.14.89 1.65-1.54 2.33 2.33-1.54 1.65z', duo: 1 }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  palette: [['path', { d: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z', duo: 1 }], ['circle', { cx: 7.5, cy: 11.5, r: 1.3, fill: 1 }], ['circle', { cx: 9.8, cy: 7.3, r: 1.3, fill: 1 }], ['circle', { cx: 14.6, cy: 7.3, r: 1.3, fill: 1 }], ['circle', { cx: 17.2, cy: 11, r: 1.3, fill: 1 }]],
  sliders: [['path', { d: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1' }], ['circle', { cx: 15, cy: 6, r: 2, duo: 1 }], ['circle', { cx: 9, cy: 12, r: 2, duo: 1 }], ['circle', { cx: 17, cy: 18, r: 2, duo: 1 }]],
  grid: [['rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 1.6, duo: 1 }], ['rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 1.6 }], ['rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 1.6 }], ['rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 1.6, duo: 1 }]],
  user: [['circle', { cx: 12, cy: 8, r: 4, duo: 1 }], ['path', { d: 'M4.5 20.5c.9-4 3.8-6.5 7.5-6.5s6.6 2.5 7.5 6.5' }]],
  users: [['circle', { cx: 9, cy: 8, r: 3.5, duo: 1 }], ['path', { d: 'M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5' }], ['path', { d: 'M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.5 3 5.2' }]],
  swap: [['path', { d: 'M7 3.5 3.5 7 7 10.5M3.5 7H16M17 13.5l3.5 3.5-3.5 3.5M20.5 17H8' }]],
  chart: [['path', { d: 'M3.5 3.5v17h17' }], ['path', { d: 'M7 15l4-4.5 3 3 5.5-6.5' }]],
  bars: [['rect', { x: 4, y: 12, width: 4, height: 8, rx: 1, duo: 1 }], ['rect', { x: 10, y: 7, width: 4, height: 13, rx: 1, duo: 1 }], ['rect', { x: 16, y: 4, width: 4, height: 16, rx: 1, duo: 1 }]],
  calculator: [['rect', { x: 5, y: 3, width: 14, height: 18, rx: 2.5, duo: 1 }], ['rect', { x: 8, y: 6, width: 8, height: 3.5, rx: .8 }], ['path', { d: 'M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01', 'stroke-width': 2.4 }]],
  lock: [['rect', { x: 4.5, y: 10.5, width: 15, height: 10, rx: 2.5, duo: 1 }], ['path', { d: 'M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2' }]],
  shield: [['path', { d: 'M12 3l7.5 3v5.2c0 4.8-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5-7.5-9.8V6z', duo: 1 }], ['path', { d: 'M8.8 12.2l2.2 2.2 4.2-4.4' }]],
  pin: [['path', { d: 'M9 3.5h6l-.9 5.2 3.4 3.3v2H6.5v-2l3.4-3.3z', duo: 1 }], ['path', { d: 'M12 14v6.5' }]],
  star: [['path', { d: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z', fill: 1 }]],
  starLine: [['path', { d: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9z', duo: 1 }]],
  heart: [['path', { d: 'M12 20.5s-7.5-4.6-9.6-9.1C.9 8.1 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.7 3.6 4.2 6.9-2.1 4.5-7.6 9.1-7.6 9.1z', duo: 1 }]],
  thumb: [['path', { d: 'M7 11v9H4v-9h3zm0 0l4-8c1.7 0 2.5 1 2.2 2.6L12.6 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7', duo: 1 }]],
  play: [['path', { d: 'M7 4.5l12.5 7.5L7 19.5z', fill: 1 }]],
  stop: [['rect', { x: 6, y: 6, width: 12, height: 12, rx: 2.5, fill: 1 }]],
  arrow: [['path', { d: 'M5 12h14M13 6l6 6-6 6' }]],
  arrowDown: [['path', { d: 'M12 5v14M6 13l6 6 6-6' }]],
  arrowUp: [['path', { d: 'M12 19V5M6 11l6-6 6 6' }]],
  chevronDown: [['path', { d: 'M6 9l6 6 6-6' }]],
  chevronRight: [['path', { d: 'M9 6l6 6-6 6' }]],
  info: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M12 11v6M12 7.5v.5' }]],
  alert: [['path', { d: 'M10.3 4.2 2.6 17.6A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0z', duo: 1 }], ['path', { d: 'M12 9.5v4.5M12 17.2v.3' }]],
  check: [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  checkCircle: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M8 12.3l2.8 2.8L16.2 9.6' }]],
  x: [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  minus: [['path', { d: 'M5 12h14' }]],
  ban: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M5.6 5.6l12.8 12.8' }]],
  brush: [['path', { d: 'M14.5 4.5l5 5L10 19a3 3 0 0 1-4.2 0l-.8-.8a3 3 0 0 1 0-4.2z', duo: 1 }], ['path', { d: 'M4 20c.5-1.5 1.5-2.5 3-3' }]],
  clock: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M12 7v5l3 2' }]],
  timer: [['circle', { cx: 12, cy: 13.5, r: 7.5, duo: 1 }], ['path', { d: 'M12 10v3.5l2.2 1.6M9.5 2.5h5M12 2.5v3.5M18.5 6.5l1.2-1.2' }]],
  history: [['path', { d: 'M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5' }], ['path', { d: 'M3.5 3.5v5h5' }], ['path', { d: 'M12 7.5v4.5l3 2' }]],
  calendar: [['rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 2.5, duo: 1 }], ['path', { d: 'M3.5 10h17M8 3v4M16 3v4' }]],
  trophy: [['path', { d: 'M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z', duo: 1 }], ['path', { d: 'M7.5 6H5a2.5 2.5 0 0 0 2.6 4M16.5 6H19a2.5 2.5 0 0 1-2.6 4M12 14v4M8.5 20.5h7M9.5 18h5' }]],
  medal: [['path', { d: 'M8 2.5h3l2 5.5M16 2.5h-3' }], ['path', { d: 'M8 2.5l3 6.3M16 2.5l-3 6.3' }], ['circle', { cx: 12, cy: 15, r: 6, duo: 1 }], ['path', { d: 'M12 12.2l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z', fill: 1 }]],
  crown: [['path', { d: 'M3.5 7.5l4.5 4 4-6.5 4 6.5 4.5-4-1.8 11H5.3z', duo: 1 }], ['path', { d: 'M5.5 21h13' }]],
  target: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1.4, fill: 1 }]],
  flame: [['path', { d: 'M12 2.5c1.1 3.2 5.5 5.4 5.5 10.8a5.5 5.5 0 0 1-11 0c0-2.7 1.3-4.4 2.7-5.5.3 1.6 1.1 2.7 2.2 3.2-.1-3.2-.1-5.8.6-8.5z', duo: 1 }], ['path', { d: 'M12 20.5a2.5 2.5 0 0 1-2.5-2.5c0-1.6 1.3-2.4 2-3.5.6 1 3 1.9 3 3.5a2.5 2.5 0 0 1-2.5 2.5z' }]],
  roulette: [['circle', { cx: 12, cy: 13, r: 8.5, duo: 1 }], ['path', { d: 'M12 4.5v17M3.5 13h17M6 7l12 12M18 7L6 19' }], ['circle', { cx: 12, cy: 13, r: 2.2, fill: 1 }], ['path', { d: 'M10.4 1.8h3.2L12 4.2z', fill: 1 }]],
  dice: [['rect', { x: 4, y: 4, width: 16, height: 16, rx: 3.5, duo: 1 }], ['circle', { cx: 8.5, cy: 8.5, r: 1.3, fill: 1 }], ['circle', { cx: 12, cy: 12, r: 1.3, fill: 1 }], ['circle', { cx: 15.5, cy: 15.5, r: 1.3, fill: 1 }]],
  shuffle: [['path', { d: 'M3 7h3c4 0 6 10 10 10h4.5M18 14l3 3-3 3M3 17h3c1.5 0 2.7-1.4 3.8-3.2M13.2 9.2C14.3 7.8 15.3 7 17 7h3.5M18 4l3 3-3 3' }]],
  empty: [['circle', { cx: 12, cy: 12, r: 8.5, 'stroke-dasharray': '3 2.6' }], ['path', { d: 'M9 12h6' }]],
  server: [['rect', { x: 3.5, y: 4, width: 17, height: 7, rx: 2, duo: 1 }], ['rect', { x: 3.5, y: 13, width: 17, height: 7, rx: 2, duo: 1 }], ['path', { d: 'M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6', 'stroke-width': 2.2 }]],
  globe: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z' }]],
  signal: [['path', { d: 'M5 19.5v-3M9.5 19.5v-6M14 19.5v-9M18.5 19.5V5', 'stroke-width': 2.4 }]],
  gauge: [['path', { d: 'M3.8 17.5a8.5 8.5 0 1 1 16.4 0z', duo: 1 }], ['path', { d: 'M12 14.5l4-5' }], ['circle', { cx: 12, cy: 14.5, r: 1.3, fill: 1 }]],
  zap: [['path', { d: 'M13 2.5 4.5 13.5h6.5l-1 8 8.5-11H12z', duo: 1 }]],
  award: [['circle', { cx: 12, cy: 9, r: 6, duo: 1 }], ['path', { d: 'M8.4 13.8 7 21l5-2.8 5 2.8-1.4-7.2' }]],
  hat: [['path', { d: 'M7 15V7.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V15', duo: 1 }], ['path', { d: 'M7 11.5h10' }], ['ellipse', { cx: 12, cy: 17, rx: 9, ry: 2.6 }]],
  compass: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z' }]],
  layers: [['path', { d: 'M12 3l9 5-9 5-9-5z', duo: 1 }], ['path', { d: 'M3 12.5l9 5 9-5M3 16.5l9 5 9-5' }]],
  download: [['path', { d: 'M12 3.5v11M7 10l5 5 5-5M4.5 20h15' }]],
  upload: [['path', { d: 'M12 15.5v-11M7 9l5-5 5 5M4.5 20h15' }]],
  trend: [['path', { d: 'M3 17l6-6 4 4 8-8' }], ['path', { d: 'M15 7h6v6' }]],
  eye: [['path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', duo: 1 }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  eyeOff: [['path', { d: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.5 4.9-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2' }]],
  save: [['path', { d: 'M5 3.5h11l3.5 3.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z', duo: 1 }], ['path', { d: 'M7.5 3.5v5h8v-5M7.5 20.5v-6h9v6' }]],
  refresh: [['path', { d: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 3.5V8h4.5M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20.5V16h-4.5' }]],
  trash: [['path', { d: 'M4 7h16M10 11v6M14 11v6M9 7V4.5h6V7' }], ['path', { d: 'M6 7l1 13h10l1-13', duo: 1 }]],
  edit: [['path', { d: 'M4 20h4L19 9l-4-4L4 16z', duo: 1 }], ['path', { d: 'M14 6l4 4' }]],
  folder: [['path', { d: 'M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v9.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z', duo: 1 }]],
  filter: [['path', { d: 'M3.5 5h17l-6.7 7.8v6.2l-3.6 1.8v-8z', duo: 1 }]],
  external: [['path', { d: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }]],
  link: [['path', { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' }]],
  copy: [['rect', { x: 8.5, y: 8.5, width: 12, height: 12, rx: 2.2, duo: 1 }], ['path', { d: 'M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5' }]],
  hash: [['path', { d: 'M5 9h14.5M4.5 15h14.5M10 3.5 8 20.5M16 3.5l-2 17' }]],
  note: [['path', { d: 'M5.5 3.5h9l4 4v13h-13z', duo: 1 }], ['path', { d: 'M14.5 3.5v4h4M8.5 12h7M8.5 16h4.5' }]],
  tag: [['path', { d: 'M3.5 11.6V4.5a1 1 0 0 1 1-1h7.1l8.9 8.9-8.1 8.1z', duo: 1 }], ['circle', { cx: 8, cy: 8, r: 1.6 }]],
  money: [['circle', { cx: 12, cy: 12, r: 9, duo: 1 }], ['path', { d: 'M15 9.4c-.5-.9-1.6-1.4-3-1.4-1.7 0-3 .8-3 2s1.3 1.6 3 1.9 3 .8 3 2-1.3 2.1-3 2.1c-1.4 0-2.5-.5-3-1.4M12 6.5V8M12 16v1.5' }]],
  robux: [['path', { d: 'M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z', duo: 1 }], ['path', { d: 'M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z' }], ['rect', { x: 10.6, y: 10.6, width: 2.8, height: 2.8, rx: .4, fill: 1 }]],
  gem: [['path', { d: 'M6.5 3.5h11l3.5 5.5-9 11.5L3 9z', duo: 1 }], ['path', { d: 'M3 9h18M9.5 3.5 12 9l2.5-5.5M12 9v11.5M3.5 9 12 20.5 20.5 9' }]],
  shirt: [['path', { d: 'M8.5 3.5 3 6.5l2 4.3 2.3-1V20.5h9.4V9.8l2.3 1 2-4.3-5.5-3c-.4 1.6-1.8 2.7-3.5 2.7S8.9 5.1 8.5 3.5z', duo: 1 }]],
  share: [['circle', { cx: 18, cy: 5.5, r: 2.5, duo: 1 }], ['circle', { cx: 6, cy: 12, r: 2.5, duo: 1 }], ['circle', { cx: 18, cy: 18.5, r: 2.5, duo: 1 }], ['path', { d: 'M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1' }]],
  image: [['rect', { x: 3.5, y: 4.5, width: 17, height: 15, rx: 2.5, duo: 1 }], ['circle', { cx: 9, cy: 9.5, r: 1.6 }], ['path', { d: 'M20.5 15.5 15.5 11 6 19.5' }]],
  sparkles: [['path', { d: 'M11 3l1.7 4.8L17.5 9.5l-4.8 1.7L11 16l-1.7-4.8L4.5 9.5l4.8-1.7z', duo: 1 }], ['path', { d: 'M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8zM5 16.5v4M3 18.5h4' }]],
  sun: [['circle', { cx: 12, cy: 12, r: 4, duo: 1 }], ['path', { d: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' }]],
  moon: [['path', { d: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z', duo: 1 }]],
  snowflake: [['path', { d: 'M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2M4.2 10.2l3-.7-1-3M19.8 13.8l-3 .7 1 3M4.2 13.8l3 .7-1 3M19.8 10.2l-3-.7 1-3' }]],
  pumpkin: [['path', { d: 'M12 7.5c5 0 8.5 2.6 8.5 6.5s-3.5 6.5-8.5 6.5-8.5-2.6-8.5-6.5 3.5-6.5 8.5-6.5z', duo: 1 }], ['path', { d: 'M12 7.5c-2.5 2-2.5 11 0 13M12 7.5c2.5 2 2.5 11 0 13M12 7.5c0-2 .8-3.3 2.5-4' }]],
  coffee: [['path', { d: 'M4 8.5h13V13a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z', duo: 1 }], ['path', { d: 'M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5V5M12 2.5V5' }]],
  bell: [['path', { d: 'M6 16v-5a6 6 0 0 1 12 0v5l1.8 2H4.2z', duo: 1 }], ['path', { d: 'M10 21h4' }]],
  message: [['path', { d: 'M4 5.5h16v11H9l-5 4z', duo: 1 }]],
  gamepad: [['path', { d: 'M6.5 8.5h11a4.5 4.5 0 0 1 4.5 4.5v1.5a3 3 0 0 1-5.4 1.8L15 14.5H9l-1.6 1.8A3 3 0 0 1 2 14.5V13a4.5 4.5 0 0 1 4.5-4.5z', duo: 1 }], ['path', { d: 'M7 10.8v3.4M5.3 12.5h3.4M16 11.5h.01M18 13.5h.01', 'stroke-width': 2 }]],
  box: [['path', { d: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z', duo: 1 }], ['path', { d: 'M4 7.5l8 4.5 8-4.5M12 12v9' }]],
  bag: [['path', { d: 'M5 8h14l-1 13H6z', duo: 1 }], ['path', { d: 'M9 10V6.5a3 3 0 0 1 6 0V10' }]],
  gift: [['rect', { x: 3.5, y: 8, width: 17, height: 4, rx: 1 }], ['rect', { x: 5, y: 12, width: 14, height: 8.5, rx: 1, duo: 1 }], ['path', { d: 'M12 8v12.5M12 8c-1-2.8-5-4-5-1.5S9.5 8 12 8zm0 0c1-2.8 5-4 5-1.5S14.5 8 12 8z' }]],
  bookmark: [['path', { d: 'M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z', duo: 1 }]],
  list: [['path', { d: 'M8.5 6h12M8.5 12h12M8.5 18h12M3.8 6h.01M3.8 12h.01M3.8 18h.01', 'stroke-width': 2 }]],
  menu: [['path', { d: 'M4 6.5h16M4 12h16M4 17.5h16' }]],
  video: [['rect', { x: 2.5, y: 6, width: 13.5, height: 12, rx: 2.5, duo: 1 }], ['path', { d: 'M16 10.2l5.5-3v9.6l-5.5-3z' }]],
  cursor: [['path', { d: 'M5 3.5l13.5 6.6-5.8 1.9-2 5.8z', duo: 1 }], ['path', { d: 'M13 13l5.5 5.5' }]],
  flag: [['path', { d: 'M5 21V4M5 4.5h11l-2 4 2 4H5', duo: 1 }]],
  key: [['circle', { cx: 8, cy: 15, r: 4.5, duo: 1 }], ['path', { d: 'M11.2 11.8 20 3M17 6l2.5 2.5M14.5 8.5 16.5 10.5' }]],
  dot: [['circle', { cx: 12, cy: 12, r: 4, fill: 1 }]],
  grip: [['circle', { cx: 9, cy: 6, r: 1.4, fill: 1 }], ['circle', { cx: 15, cy: 6, r: 1.4, fill: 1 }], ['circle', { cx: 9, cy: 12, r: 1.4, fill: 1 }],
    ['circle', { cx: 15, cy: 12, r: 1.4, fill: 1 }], ['circle', { cx: 9, cy: 18, r: 1.4, fill: 1 }], ['circle', { cx: 15, cy: 18, r: 1.4, fill: 1 }]]
};

// Nombres para la lista de Ajustes → Iconos.
var RC_ICON_LABELS = {
  logo: 'Logo de RoCer0', home: 'Inicio', search: 'Buscar', gear: 'Ajustes', palette: 'Temas', sliders: 'Funciones', grid: 'Estructura',
  user: 'Perfil', users: 'Amigos', swap: 'Cambiar / intercambiar', chart: 'Estadísticas', bars: 'Gráfico', calculator: 'Calculadora', lock: 'Privacidad',
  shield: 'Seguridad', pin: 'Fijar', star: 'Estrella', starLine: 'Seguir precio', heart: 'Favorito', thumb: 'Valoración', play: 'Jugar', stop: 'Parar',
  arrow: 'Flecha', arrowDown: 'Baja', arrowUp: 'Sube', chevronDown: 'Desplegar', chevronRight: 'Abrir', info: 'Información', alert: 'Aviso',
  check: 'Hecho', checkCircle: 'Completado', x: 'Cerrar', plus: 'Añadir', minus: 'Quitar', ban: 'Ocultar', brush: 'Personalizar', clock: 'Tiempo',
  timer: 'Auto-hop', history: 'Historial', calendar: 'Calendario', trophy: 'Retos', medal: 'Medalla', crown: 'Premium', target: 'Objetivo',
  flame: 'Racha', roulette: 'Ruleta', dice: 'Aleatorio', shuffle: 'Server hop', empty: 'Servidor vacío', server: 'Servidores', globe: 'Región',
  signal: 'Ping', gauge: 'FPS', zap: 'Rendimiento', award: 'Insignias', hat: 'Accesorios', compass: 'Explorador', layers: 'Contenido',
  download: 'Descargar', upload: 'Subir', trend: 'Rolimons', eye: 'Vista previa', eyeOff: 'Oculto', save: 'Guardar', refresh: 'Recargar',
  trash: 'Borrar', edit: 'Editar', folder: 'Carpeta', filter: 'Filtros', external: 'Abrir fuera', link: 'Enlace', copy: 'Copiar', hash: 'ID',
  note: 'Nota', tag: 'Etiqueta', money: 'Dinero', robux: 'Robux', gem: 'Valor', shirt: 'Trajes', share: 'Compartir', image: 'Imagen',
  sparkles: 'Confeti', sun: 'Día', moon: 'Noche', snowflake: 'Navidad', pumpkin: 'Halloween', coffee: 'Descanso', bell: 'Avisos',
  message: 'Mensajes', gamepad: 'Juego', box: 'Inventario', bag: 'Tienda', gift: 'Wrapped', bookmark: 'Lista de deseos', list: 'Lista',
  menu: 'Menú', video: 'Modo streamer', cursor: 'Cursor', flag: 'Grupos', key: 'Cuentas', dot: 'Punto', grip: 'Arrastrar'
};

// Iconos de la propia web de Roblox que se pueden cambiar.
var RC_RBX_ICONS = [
  ['home', 'Inicio', '.icon-nav-home', 'home'],
  ['profile', 'Perfil', '.icon-nav-profile', 'user'],
  ['messages', 'Mensajes', '.icon-nav-message', 'message'],
  ['friends', 'Amigos', '.icon-nav-friends', 'users'],
  ['avatar', 'Avatar', '.icon-nav-charactercustomizer', 'shirt'],
  ['inventory', 'Inventario', '.icon-nav-inventory', 'box'],
  ['trade', 'Intercambios', '.icon-nav-trade', 'swap'],
  ['groups', 'Comunidades', '.icon-nav-group', 'flag'],
  ['blog', 'Blog', '.icon-nav-blog', 'note'],
  ['store', 'Tienda oficial', '.icon-nav-shop', 'bag'],
  ['giftcards', 'Tarjetas regalo', '.icon-nav-giftcards', 'gift'],
  ['premium', 'Premium', '.icon-nav-premium', 'crown'],
  ['robux', 'Robux (barra de arriba)', '.icon-nav-robux, .icon-robux-28x28', 'robux'],
  ['settings', 'Ajustes (barra de arriba)', '.icon-nav-settings', 'gear'],
  ['notifications', 'Notificaciones', '.icon-nav-notification-stream', 'bell'],
  ['search', 'Buscar (barra de arriba)', '.icon-nav-search', 'search'],
  ['menu', 'Menú', '.icon-nav-menu', 'menu']
];

var RC_ICON_STYLES = [['normal', 'Normal'], ['fina', 'Fina'], ['gruesa', 'Gruesa'], ['duotono', 'Duotono (relleno suave)']];

var RC_ICON_CUSTOM = {};

function rcSetCustomIcons(map) { RC_ICON_CUSTOM = map || {}; }

function rcIcon(name, opts) {
  opts = opts || {};
  var doc = opts.doc || document;
  var cls = 'rk-i rc-i-' + name + (opts.cls ? ' ' + opts.cls : '');
  var custom = RC_ICON_CUSTOM[name];
  var node;
  if (custom && custom.src) {
    if (custom.tint) {
      node = doc.createElement('span');
      node.className = cls + ' rc-i-mask';
      node.style.setProperty('--rc-mask', 'url("' + custom.src + '")');
    } else {
      node = doc.createElement('img');
      node.className = cls + ' rc-i-img';
      node.src = custom.src;
      node.alt = '';
    }
  } else {
    var ns = 'http://www.w3.org/2000/svg';
    node = doc.createElementNS(ns, 'svg');
    node.setAttribute('viewBox', '0 0 24 24');
    node.setAttribute('class', cls);
    node.setAttribute('aria-hidden', 'true');
    (RC_ICONS[name] || RC_ICONS.dot).forEach(function (part) {
      var el = doc.createElementNS(ns, part[0]);
      var a = part[1];
      for (var k in a) {
        if (k === 'duo' || k === 'fill') continue;
        el.setAttribute(k, a[k]);
      }
      if (a.duo) el.setAttribute('class', 'rc-d');
      if (a.fill) el.setAttribute('class', 'rc-f');
      node.appendChild(el);
    });
  }
  if (opts.title) node.setAttribute('title', opts.title);
  if (opts.color) node.style.color = opts.color;
  node.setAttribute('data-rc-icon', name);
  if (opts.cls) node.setAttribute('data-rc-cls', opts.cls);
  return node;
}

// Vuelve a pintar los iconos ya puestos (cuando cambias una imagen o el estilo).
function rcRefreshIcons(root) {
  (root || document).querySelectorAll('[data-rc-icon]').forEach(function (n) {
    var fresh = rcIcon(n.getAttribute('data-rc-icon'), { doc: n.ownerDocument, cls: n.getAttribute('data-rc-cls') || '', title: n.getAttribute('title') || '' });
    if (n.style.color) fresh.style.color = n.style.color;
    n.replaceWith(fresh);
  });
}

// Texto SVG de un icono (para usarlo como máscara CSS en los iconos de Roblox).
function rcIconSvgText(name, style) {
  var w = style === 'fina' ? 1.4 : style === 'gruesa' ? 2.4 : 1.8;
  var esc = function (v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
  var parts = (RC_ICONS[name] || RC_ICONS.dot).map(function (part) {
    var a = part[1], attrs = '';
    for (var k in a) {
      if (k === 'duo' || k === 'fill') continue;
      attrs += ' ' + k + '="' + esc(a[k]) + '"';
    }
    var fill = a.fill ? '#000' : (a.duo && style === 'duotono' ? 'rgba(0,0,0,.35)' : 'none');
    return '<' + part[0] + attrs + ' fill="' + fill + '"/>';
  }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round">' + parts + '</svg>';
}

function rcIconDataUrl(name, style) {
  return 'data:image/svg+xml,' + encodeURIComponent(rcIconSvgText(name, style));
}

// Clases de estilo de icono en <html>: rc-ic-fina, rc-ic-gruesa, rc-ic-duotono.
function rcApplyIconStyle(root, style) {
  ['rc-ic-fina', 'rc-ic-gruesa', 'rc-ic-duotono'].forEach(function (c) { root.classList.remove(c); });
  if (style && style !== 'normal') root.classList.add('rc-ic-' + style);
}

// CSS que cambia los iconos de la web de Roblox (por los de RoCer0 o por tus imágenes).
function rcRobloxIconsCss(settings, custom, theme) {
  custom = custom || {};
  var style = rcIconStyleOf(settings, theme);
  var rules = [];
  RC_RBX_ICONS.forEach(function (r) {
    var mine = custom['rbx:' + r[0]];   // imagen tuya para ese icono de Roblox
    var mapped = custom[r[3]];          // imagen tuya para el icono equivalente de RoCer0
    if (!(mine && mine.src) && !settings['icons.roblox']) return;
    var src, tint;
    if (mine && mine.src) { src = mine.src; tint = !!mine.tint; }
    else if (mapped && mapped.src) { src = mapped.src; tint = !!mapped.tint; }
    else { src = rcIconDataUrl(r[3], style); tint = true; }
    var url = 'url("' + src.replace(/"/g, '%22') + '")';
    rules.push(r[2] + (tint
      ? ' { background-image: none !important; background-color: currentColor !important; -webkit-mask: ' + url + ' center / 78% 78% no-repeat !important; mask: ' + url + ' center / 78% 78% no-repeat !important; }'
      : ' { background: ' + url + ' center / contain no-repeat !important; -webkit-mask: none !important; mask: none !important; }'));
  });
  return rules.join('\n');
}

function rcIconStyleOf(settings, theme) {
  var st = settings && settings['icons.style'];
  if (st && st !== 'theme') return st;
  return (theme && theme.iconStyle) || 'normal';
}
