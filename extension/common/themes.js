// Motor de temas de RoCer0: temas predefinidos, fondos, fuentes y cálculo de variables CSS.
// Lo usan roblox.com (theme-boot.js), la página de Ajustes y el popup.
// Cada tema guarda sus propios retoques en settings['theme.overrides'][idDelTema].

var RK_THEMES = [
  { id: 'medianoche', name: 'Medianoche', desc: 'Azul noche con tarjetas suaves, como tu captura.', tags: ['oscuro', 'azul'], scheme: 'dark',
    c: { bg: '#0a0d16', surface: '#10141f', surface2: '#181e2d', border: '#222a3c', text: '#eaf0fa', muted: '#8c95a8', accent: '#3b82f6', accent2: '#8b5cf6', success: '#22c55e', danger: '#ef4444' },
    bg: 'none', radius: 14 },
  { id: 'amoled', name: 'AMOLED', desc: 'Negro puro para pantallas OLED y máximo contraste.', tags: ['oscuro', 'negro', 'plano'], scheme: 'dark',
    c: { bg: '#000000', surface: '#0a0a0a', surface2: '#141414', border: '#232323', text: '#f5f5f5', muted: '#9a9a9a', accent: '#00a2ff', accent2: '#7c5cff', success: '#1fd660', danger: '#ff4d4d' },
    bg: 'none', radius: 12 },
  { id: 'vidrio', name: 'Vidrio esmerilado', desc: 'Paneles translúcidos y desenfocados sobre una aurora en movimiento.', tags: ['transparente', 'animado', 'azul'], scheme: 'dark',
    c: { bg: '#0b1020', surface: '#1a2238', surface2: '#24304d', border: '#33406a', text: '#f1f5ff', muted: '#a5b1cf', accent: '#38bdf8', accent2: '#a78bfa', success: '#34d399', danger: '#fb7185' },
    bg: 'aurora', glass: 0.55, panelBlur: 18, radius: 16 },
  { id: 'nebulosa', name: 'Nebulosa', desc: 'Morado espacial con nubes de color.', tags: ['espacio', 'morado', 'transparente'], scheme: 'dark',
    c: { bg: '#0c0716', surface: '#150e24', surface2: '#1f1533', border: '#2c2045', text: '#f1ebff', muted: '#a497c4', accent: '#a855f7', accent2: '#ec4899', success: '#22c55e', danger: '#f43f5e' },
    bg: 'nebula', glass: 0.25, panelBlur: 10, radius: 14 },
  { id: 'galaxia', name: 'Galaxia', desc: 'Cielo estrellado que parpadea despacio.', tags: ['espacio', 'animado', 'azul'], scheme: 'dark',
    c: { bg: '#05060f', surface: '#0d1022', surface2: '#151a33', border: '#222947', text: '#e8ecff', muted: '#8f97c0', accent: '#60a5fa', accent2: '#c084fc', success: '#4ade80', danger: '#f87171' },
    bg: 'stars', glass: 0.3, panelBlur: 8, radius: 14 },
  { id: 'synthwave', name: "Synthwave '84", desc: 'Rosa y cian neón sobre una cuadrícula retro que avanza.', tags: ['neón', 'animado', 'rosa'], scheme: 'dark',
    c: { bg: '#1b1029', surface: '#241734', surface2: '#2e1d44', border: '#43296a', text: '#fdf0ff', muted: '#b79ad6', accent: '#ff7edb', accent2: '#36f9f6', success: '#72f1b8', danger: '#fe4450' },
    bg: 'grid', glass: 0.2, radius: 10, glow: true },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Amarillo eléctrico, esquinas rectas y líneas de escáner.', tags: ['neón', 'amarillo', 'animado'], scheme: 'dark',
    c: { bg: '#0a0a0c', surface: '#121216', surface2: '#1b1b21', border: '#2d2d36', text: '#f2f2f2', muted: '#9a9aa5', accent: '#fcee0a', accent2: '#00f0ff', success: '#00ff9f', danger: '#ff003c' },
    bg: 'scan', radius: 2, glow: true, font: 'mono' },
  { id: 'matrix', name: 'Matrix', desc: 'Verde fósforo sobre negro, letra de terminal.', tags: ['verde', 'neón', 'negro'], scheme: 'dark',
    c: { bg: '#000500', surface: '#031003', surface2: '#062006', border: '#0d3d0d', text: '#c8ffc8', muted: '#5fbf5f', accent: '#00ff41', accent2: '#00c832', success: '#00ff41', danger: '#ff3b3b' },
    bg: 'scan', radius: 4, glow: true, font: 'mono' },
  { id: 'catppuccin', name: 'Catppuccin Mocha', desc: 'Paleta pastel oscura muy popular entre los temas de Discord.', tags: ['pastel', 'oscuro', 'morado'], scheme: 'dark',
    c: { bg: '#11111b', surface: '#1e1e2e', surface2: '#313244', border: '#45475a', text: '#cdd6f4', muted: '#a6adc8', accent: '#cba6f7', accent2: '#f5c2e7', success: '#a6e3a1', danger: '#f38ba8' },
    bg: 'none', radius: 14 },
  { id: 'dracula', name: 'Drácula', desc: 'El clásico de los editores de código: morado, rosa y verde.', tags: ['oscuro', 'morado'], scheme: 'dark',
    c: { bg: '#1e1f29', surface: '#282a36', surface2: '#343746', border: '#44475a', text: '#f8f8f2', muted: '#8f9bc9', accent: '#bd93f9', accent2: '#ff79c6', success: '#50fa7b', danger: '#ff5555' },
    bg: 'none', radius: 10 },
  { id: 'nord', name: 'Nord', desc: 'Gris azulado ártico, tranquilo y legible.', tags: ['oscuro', 'azul', 'plano'], scheme: 'dark',
    c: { bg: '#2a303c', surface: '#2e3440', surface2: '#3b4252', border: '#4c566a', text: '#eceff4', muted: '#a9b4c7', accent: '#88c0d0', accent2: '#81a1c1', success: '#a3be8c', danger: '#bf616a' },
    bg: 'none', radius: 10 },
  { id: 'tokyo', name: 'Tokyo Night', desc: 'Azules de ciudad de noche con acentos lila.', tags: ['oscuro', 'azul'], scheme: 'dark',
    c: { bg: '#16161e', surface: '#1a1b26', surface2: '#24283b', border: '#3b4261', text: '#c0caf5', muted: '#7a83ad', accent: '#7aa2f7', accent2: '#bb9af7', success: '#9ece6a', danger: '#f7768e' },
    bg: 'none', radius: 12 },
  { id: 'rosepine', name: 'Rosé Pine', desc: 'Tonos rosados apagados, elegante y suave.', tags: ['pastel', 'oscuro', 'rosa'], scheme: 'dark',
    c: { bg: '#191724', surface: '#1f1d2e', surface2: '#26233a', border: '#403d52', text: '#e0def4', muted: '#908caa', accent: '#ebbcba', accent2: '#c4a7e7', success: '#9ccfd8', danger: '#eb6f92' },
    bg: 'none', radius: 14 },
  { id: 'gruvbox', name: 'Gruvbox', desc: 'Retro cálido con naranjas y marrones.', tags: ['oscuro', 'naranja'], scheme: 'dark',
    c: { bg: '#1d2021', surface: '#282828', surface2: '#32302f', border: '#504945', text: '#ebdbb2', muted: '#a89984', accent: '#fe8019', accent2: '#fabd2f', success: '#b8bb26', danger: '#fb4934' },
    bg: 'none', radius: 8 },
  { id: 'oceano', name: 'Océano', desc: 'Azules profundos con un brillo cian que sube del fondo.', tags: ['azul', 'naturaleza'], scheme: 'dark',
    c: { bg: '#04141f', surface: '#082232', surface2: '#0c2e43', border: '#12405c', text: '#e0f7ff', muted: '#7fb2c8', accent: '#22d3ee', accent2: '#3b82f6', success: '#2dd4bf', danger: '#f87171' },
    bg: 'ocean', glass: 0.2, radius: 16 },
  { id: 'bosque', name: 'Bosque', desc: 'Verdes de bosque con luz suave.', tags: ['verde', 'naturaleza'], scheme: 'dark',
    c: { bg: '#0c140f', surface: '#121d16', surface2: '#1a281f', border: '#25392c', text: '#e6f4ea', muted: '#8fb39b', accent: '#4ade80', accent2: '#a3e635', success: '#4ade80', danger: '#f87171' },
    bg: 'forest', glass: 0.15, radius: 14 },
  { id: 'atardecer', name: 'Atardecer', desc: 'Degradado naranja y rosa de puesta de sol.', tags: ['naranja', 'rosa'], scheme: 'dark',
    c: { bg: '#170d14', surface: '#21121c', surface2: '#2c1825', border: '#432438', text: '#ffeef2', muted: '#c79aa9', accent: '#fb923c', accent2: '#f43f5e', success: '#4ade80', danger: '#f43f5e' },
    bg: 'sunset', glass: 0.2, radius: 14 },
  { id: 'lunasangre', name: 'Luna de sangre', desc: 'Rojo intenso sobre negro.', tags: ['rojo', 'oscuro'], scheme: 'dark',
    c: { bg: '#0f0507', surface: '#1a090c', surface2: '#250d12', border: '#3d141c', text: '#ffe9ea', muted: '#c58b91', accent: '#ef4444', accent2: '#f97316', success: '#22c55e', danger: '#ff6b6b' },
    bg: 'nebula', glass: 0.2, radius: 12, glow: true },
  { id: 'oro', name: 'Oro negro', desc: 'Negro y dorado, aspecto premium.', tags: ['amarillo', 'negro'], scheme: 'dark',
    c: { bg: '#0b0a07', surface: '#15130d', surface2: '#1f1c13', border: '#3a3320', text: '#f7f1de', muted: '#b3a77f', accent: '#f5c542', accent2: '#e8a317', success: '#7bd88f', danger: '#ff6b5b' },
    bg: 'gradient', radius: 10 },
  { id: 'menta', name: 'Menta', desc: 'Verde agua fresco sobre gris pizarra.', tags: ['verde', 'aqua'], scheme: 'dark',
    c: { bg: '#0d1514', surface: '#13201e', surface2: '#1b2c29', border: '#294440', text: '#e3fbf6', muted: '#86b5ab', accent: '#2dd4bf', accent2: '#5eead4', success: '#34d399', danger: '#fb7185' },
    bg: 'waves', radius: 16 },
  { id: 'claro', name: 'Clásico claro', desc: 'Claro y limpio, parecido al Roblox de siempre.', tags: ['claro', 'azul', 'plano'], scheme: 'light',
    c: { bg: '#f2f4f7', surface: '#ffffff', surface2: '#eef1f5', border: '#dde2ea', text: '#1d2433', muted: '#5f6b7d', accent: '#0b6cff', accent2: '#7c3aed', success: '#16a34a', danger: '#dc2626' },
    bg: 'none', radius: 12 },
  { id: 'latte', name: 'Catppuccin Latte', desc: 'La versión clara y pastel de Catppuccin.', tags: ['claro', 'pastel', 'morado'], scheme: 'light',
    c: { bg: '#e6e9ef', surface: '#eff1f5', surface2: '#dce0e8', border: '#ccd0da', text: '#4c4f69', muted: '#6c6f85', accent: '#8839ef', accent2: '#ea76cb', success: '#40a02b', danger: '#d20f39' },
    bg: 'none', radius: 14 },
  { id: 'sakura', name: 'Sakura', desc: 'Rosa cerezo pastel, claro y dulce.', tags: ['claro', 'rosa', 'pastel'], scheme: 'light',
    c: { bg: '#fff4f7', surface: '#ffffff', surface2: '#ffe8ef', border: '#f5cbd8', text: '#4a2b36', muted: '#9a6b7b', accent: '#e75480', accent2: '#b57edc', success: '#2f9e6b', danger: '#d64545' },
    bg: 'sakura', glass: 0.1, radius: 18 },
  { id: 'papel', name: 'Papel', desc: 'Crema cálido tipo Solarized, cómodo de día.', tags: ['claro', 'naranja'], scheme: 'light',
    c: { bg: '#f6efdc', surface: '#fdf6e3', surface2: '#eee8d5', border: '#dfd6bd', text: '#36454a', muted: '#6f7f84', accent: '#268bd2', accent2: '#d33682', success: '#859900', danger: '#dc322f' },
    bg: 'dots', radius: 10 },
  { id: 'contraste', name: 'Alto contraste', desc: 'Blanco, negro y amarillo para leer sin esfuerzo.', tags: ['alto contraste', 'negro', 'plano'], scheme: 'dark',
    c: { bg: '#000000', surface: '#000000', surface2: '#101010', border: '#ffffff', text: '#ffffff', muted: '#e6e6e6', accent: '#ffff00', accent2: '#00ffff', success: '#00ff00', danger: '#ff4040' },
    bg: 'none', radius: 4 },
  { id: 'halloween', name: 'Halloween', desc: 'Calabaza y morado bajo una luna llena. Se pone solo del 20 de octubre al 2 de noviembre si activas los temas de temporada.', tags: ['temporada', 'naranja', 'morado'], scheme: 'dark',
    c: { bg: '#0f0a14', surface: '#1a1222', surface2: '#241a30', border: '#3a2a4a', text: '#fff3e6', muted: '#bfa3c9', accent: '#ff7a1a', accent2: '#a855f7', success: '#7ee36f', danger: '#ff4d6d' },
    bg: 'spooky', glass: 0.15, radius: 14, glow: true },
  { id: 'navidad', name: 'Navidad', desc: 'Rojo y verde de árbol con nieve cayendo. Se pone solo del 15 de diciembre al 6 de enero si activas los temas de temporada.', tags: ['temporada', 'rojo', 'verde', 'animado'], scheme: 'dark',
    c: { bg: '#0b1410', surface: '#12201a', surface2: '#1a2c23', border: '#2c4436', text: '#f4fff8', muted: '#9cc3ad', accent: '#e63946', accent2: '#2a9d8f', success: '#52d68a', danger: '#ff6b6b' },
    bg: 'snow', glass: 0.15, radius: 16 }
];

// Tema automático: claro de día y oscuro de noche, y temas de temporada en sus fechas.
function rkSeasonTheme(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  if ((m === 10 && day >= 20) || (m === 11 && day <= 2)) return 'halloween';
  if ((m === 12 && day >= 15) || (m === 1 && day <= 6)) return 'navidad';
  return null;
}

function rkClock(hhmm, fallback) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  return m ? (+m[1]) * 60 + (+m[2]) : fallback;
}

function rkActiveThemeId(settings, now) {
  var mode = settings['theme.auto'] || 'off';
  var d = now || new Date();
  if (mode === 'seasonal' || mode === 'both') {
    var season = rkSeasonTheme(d);
    if (season) return season;
  }
  if (mode === 'daynight' || mode === 'both') {
    var t = d.getHours() * 60 + d.getMinutes();
    var a = rkClock(settings['theme.dayStart'], 480), b = rkClock(settings['theme.nightStart'], 1200);
    var day = a <= b ? (t >= a && t < b) : (t >= a || t < b);
    return day ? settings['theme.dayTheme'] : settings['theme.nightTheme'];
  }
  return settings['theme.id'];
}

var RK_THEME_BASE = {
  bg: 'none', bgUrl: '', bgBlur: 0, bgDim: 0, glass: 0, panelBlur: 0, radius: 14, font: 'roblox', fontCustom: '', glow: false,
  // Fuerza del brillo neón y de las sombras (50 = lo normal).
  glowSize: 50, shadow: 50,
  // Fondo: color propio, degradado propio, ajuste de imagen, efecto parallax y filtros.
  bgColor: '', gradKind: 'linear', gradAngle: 135, gradStops: null, gradAnim: false,
  bgFit: 'cover', bgPos: 'center', parallax: 0,
  bgBright: 100, bgContrast: 100, bgSat: 100, bgHue: 0, bgGray: 0, bgSepia: 0,
  // Capa por encima del fondo: viñeta, tinte, degradados, líneas o grano.
  overlay: 'none', overlayColor: '', overlayStrength: 40, grain: 0,
  // Partículas: nieve, estrellas, burbujas, luciérnagas, pétalos, lluvia, corazones, confeti, brasas, hojas.
  particles: 'none', pLayer: 'back', pDensity: 50, pSpeed: 50, pSize: 50, pColor: '', pOpacity: 80,
  // Pase de imágenes y vídeo (los archivos se guardan aparte, en la base de datos de la extensión).
  slideSeconds: 20, slideFx: 'fade', slideUrls: '', videoUrl: '', videoRate: 100, mediaFit: 'cover'
};

// Estructura: los temas no solo cambian los colores, también la forma de la web.
var RK_LAYOUT_OPTIONS = [
  { key: 'nav', label: 'Barra de arriba', options: [['normal', 'Normal'], ['floating', 'Flotante (isla)'], ['minimal', 'Transparente'], ['accent', 'Del color del tema'], ['autohide', 'Se esconde al bajar']] },
  { key: 'sidebar', label: 'Menú lateral', options: [['normal', 'Normal'], ['floating', 'Flotante'], ['icons', 'Solo iconos (se abre al pasar)'], ['hidden', 'Oculto']] },
  { key: 'width', label: 'Ancho del contenido', options: [['normal', 'Normal'], ['wide', 'Toda la pantalla'], ['narrow', 'Estrecho y centrado']] },
  { key: 'cards', label: 'Paneles', options: [['normal', 'Normales'], ['flat', 'Planos, sin borde'], ['outlined', 'Solo el borde'], ['elevated', 'Con sombra'], ['glass', 'Cristal']] },
  { key: 'gameCards', label: 'Tarjetas de juego', options: [['normal', 'Normales'], ['boxed', 'En una caja'], ['minimal', 'Solo imagen y nombre'], ['outline', 'Borde de color al pasar']] },
  { key: 'tiles', label: 'Esquinas de las miniaturas', options: [['normal', 'Como el tema'], ['rounded', 'Muy redondeadas'], ['square', 'Rectas'], ['framed', 'Con marco de color']] },
  { key: 'buttons', label: 'Botones', options: [['normal', 'Normales'], ['pill', 'Píldora'], ['square', 'Rectos'], ['outline', 'Solo el borde'], ['soft', 'Suaves']] },
  { key: 'headings', label: 'Títulos', options: [['normal', 'Normales'], ['big', 'Grandes'], ['caps', 'Mayúsculas espaciadas'], ['accent', 'Con barra de color'], ['gradient', 'Degradado']] },
  { key: 'hover', label: 'Al pasar el ratón', options: [['lift', 'Se elevan'], ['glow', 'Brillan'], ['zoom', 'Zoom en la imagen'], ['tilt', 'Se inclinan'], ['none', 'Nada']] },
  { key: 'density', label: 'Espaciado', options: [['normal', 'Normal'], ['compact', 'Compacto'], ['spacious', 'Amplio']] },
  { key: 'home', label: 'Inicio rediseñado', options: [['normal', 'Tarjetas'], ['stacked', 'Una columna'], ['compact', 'Compacto'], ['showcase', 'Escaparate (banner grande)']] },
  { key: 'avatars', label: 'Avatares', options: [['circle', 'Redondos'], ['rounded', 'Esquinas redondeadas'], ['square', 'Cuadrados'], ['hex', 'Hexágonos']] },
  { key: 'iconStyle', label: 'Iconos', options: [['normal', 'Normales'], ['fina', 'Finos'], ['gruesa', 'Gruesos'], ['duotono', 'Duotono']] },
  { key: 'cursor', label: 'Cursor', options: [['normal', 'Normal'], ['accent', 'Flecha del color del tema'], ['ring', 'Anillo'], ['dot', 'Punto']] },
  { key: 'scrollbar', label: 'Barra de desplazamiento', options: [['normal', 'Normal'], ['thin', 'Fina'], ['accent', 'Del color del tema'], ['hidden', 'Oculta']] },
  { key: 'animIn', label: 'Animación al abrir una página', options: [['none', 'Ninguna'], ['fade', 'Aparecer'], ['rise', 'Subir'], ['pop', 'Rebote']] },
  { key: 'footer', label: 'Pie de página de Roblox', options: [['normal', 'Visible'], ['hidden', 'Oculto']] },
  { key: 'zoom', label: 'Tamaño del contenido', range: [80, 125], unit: '%' }
];
var RK_LAYOUT_BASE = { nav: 'normal', sidebar: 'normal', width: 'normal', cards: 'normal', gameCards: 'normal', tiles: 'normal', buttons: 'normal', headings: 'normal',
  hover: 'lift', density: 'normal', home: 'normal', avatars: 'circle', iconStyle: 'normal', cursor: 'normal', scrollbar: 'normal', animIn: 'none', footer: 'normal', zoom: 100 };

// La estructura que trae cada tema (cada uno se ve distinto, no solo de color).
var RK_THEME_LAYOUTS = {
  medianoche: { nav: 'floating', buttons: 'pill', animIn: 'fade' },
  amoled: { nav: 'minimal', cards: 'flat', tiles: 'square', density: 'compact', hover: 'zoom' },
  vidrio: { nav: 'floating', sidebar: 'floating', cards: 'glass', buttons: 'pill', hover: 'glow', animIn: 'rise', iconStyle: 'fina' },
  nebulosa: { nav: 'floating', cards: 'glass', headings: 'gradient', hover: 'glow', iconStyle: 'duotono' },
  galaxia: { nav: 'minimal', cards: 'glass', headings: 'caps', hover: 'glow', cursor: 'ring', animIn: 'fade' },
  synthwave: { nav: 'accent', headings: 'gradient', buttons: 'outline', hover: 'glow', cursor: 'accent', gameCards: 'outline', tiles: 'framed' },
  cyberpunk: { nav: 'accent', buttons: 'square', tiles: 'square', headings: 'caps', cards: 'outlined', hover: 'tilt', cursor: 'dot', avatars: 'hex', iconStyle: 'gruesa' },
  matrix: { buttons: 'square', cards: 'outlined', headings: 'caps', tiles: 'square', sidebar: 'icons', scrollbar: 'thin', cursor: 'accent', avatars: 'square' },
  catppuccin: { buttons: 'soft', tiles: 'rounded', nav: 'floating', iconStyle: 'duotono' },
  dracula: { buttons: 'pill', headings: 'accent' },
  nord: { density: 'spacious', cards: 'flat', buttons: 'soft', hover: 'none' },
  tokyo: { nav: 'floating', cards: 'elevated', hover: 'lift' },
  rosepine: { tiles: 'rounded', buttons: 'pill', avatars: 'rounded', iconStyle: 'fina' },
  gruvbox: { buttons: 'square', cards: 'outlined', headings: 'caps', tiles: 'square' },
  oceano: { sidebar: 'floating', cards: 'glass', tiles: 'rounded', hover: 'zoom', animIn: 'rise' },
  bosque: { cards: 'elevated', tiles: 'rounded', density: 'spacious', iconStyle: 'duotono' },
  atardecer: { headings: 'gradient', gameCards: 'boxed', buttons: 'pill' },
  lunasangre: { headings: 'accent', cards: 'outlined', hover: 'glow', cursor: 'accent' },
  oro: { headings: 'caps', buttons: 'outline', cards: 'outlined', tiles: 'framed', nav: 'minimal' },
  menta: { buttons: 'pill', tiles: 'rounded', cards: 'flat', iconStyle: 'fina' },
  claro: {},
  latte: { buttons: 'soft', tiles: 'rounded', iconStyle: 'duotono' },
  sakura: { buttons: 'pill', tiles: 'rounded', avatars: 'rounded', animIn: 'pop', nav: 'floating' },
  papel: { cards: 'outlined', buttons: 'square', density: 'spacious', headings: 'big' },
  contraste: { cards: 'outlined', buttons: 'outline', hover: 'none', zoom: 110, iconStyle: 'gruesa', scrollbar: 'accent' },
  halloween: { headings: 'accent', gameCards: 'boxed', cursor: 'accent', animIn: 'pop' },
  navidad: { nav: 'accent', buttons: 'pill', headings: 'accent', animIn: 'fade' }
};
// Partículas que traen los temas de temporada.
var RK_THEME_FX = {
  navidad: { particles: 'snow', pDensity: 45 },
  halloween: { particles: 'embers', pDensity: 30 },
  galaxia: { particles: 'stars', pDensity: 35, pSpeed: 25 },
  sakura: { particles: 'petals', pDensity: 25, pSpeed: 35 }
};
RK_THEMES.forEach(function (t) {
  t.layout = RK_THEME_LAYOUTS[t.id] || {};
  var fx = RK_THEME_FX[t.id];
  if (fx) for (var k in fx) if (!(k in t)) t[k] = fx[k];
});

var RK_PARTICLES = [['none', 'Ninguna'], ['snow', 'Nieve'], ['stars', 'Estrellas que brillan'], ['bubbles', 'Burbujas'], ['fireflies', 'Luciérnagas'], ['petals', 'Pétalos'],
  ['rain', 'Lluvia'], ['hearts', 'Corazones'], ['confetti', 'Confeti'], ['embers', 'Brasas'], ['leaves', 'Hojas']];
var RK_OVERLAYS = [['none', 'Ninguna'], ['vignette', 'Viñeta (bordes oscuros)'], ['tint', 'Tinte de color'], ['top', 'Degradado desde arriba'], ['bottom', 'Degradado desde abajo'], ['scanlines', 'Líneas de monitor antiguo']];

var RK_COLOR_FIELDS = [
  ['bg', 'Fondo de la página'], ['surface', 'Tarjetas y paneles'], ['surface2', 'Botones e inputs'], ['border', 'Bordes'],
  ['text', 'Texto'], ['muted', 'Texto secundario'], ['accent', 'Acento'], ['accent2', 'Acento 2 (degradados)'],
  ['success', 'Botón jugar / éxito'], ['danger', 'Peligro']
];

var RK_ACCENTS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#ffffff'];

var RK_FONTS = [
  ['roblox', 'La de Roblox', ''],
  ['builder', 'Builder Sans', '"Builder Sans", "HCo Gotham SSm", system-ui, sans-serif'],
  ['gotham', 'Gotham (Roblox antiguo)', '"HCo Gotham SSm", "Gotham SSm A", "Gotham SSm B", "Builder Sans", system-ui, sans-serif'],
  ['system', 'Del sistema', 'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif'],
  ['rounded', 'Redondeada', '"Nunito", "Varela Round", "Quicksand", "Comfortaa", "Segoe UI", system-ui, sans-serif'],
  ['serif', 'Con serifa', 'Georgia, "Times New Roman", serif'],
  ['mono', 'Terminal', '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace'],
  ['comic', 'Cómica', '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive'],
  ['verdana', 'Verdana', 'Verdana, Geneva, sans-serif'],
  ['trebuchet', 'Trebuchet', '"Trebuchet MS", "Lucida Grande", sans-serif'],
  ['custom', 'Otra (escribe el nombre)', '']
];

var RK_BACKGROUNDS = [
  ['none', 'Color liso del tema', 'Básicos'], ['color', 'Un color que elijas', 'Básicos'], ['custom', 'Degradado a tu gusto', 'Básicos'],
  ['gradient', 'Degradado suave', 'Del tema'], ['mesh', 'Malla de colores', 'Del tema'], ['nebula', 'Nebulosa', 'Del tema'], ['ocean', 'Océano', 'Del tema'],
  ['forest', 'Bosque', 'Del tema'], ['sunset', 'Atardecer', 'Del tema'], ['sakura', 'Pétalos', 'Del tema'], ['spooky', 'Noche de Halloween', 'Del tema'],
  ['aurora', 'Aurora', 'Animados'], ['stars', 'Estrellas', 'Animados'], ['grid', 'Cuadrícula retro', 'Animados'], ['scan', 'Líneas de escáner', 'Animados'], ['snow', 'Nieve', 'Animados'],
  ['waves', 'Ondas', 'Dibujos'], ['dots', 'Puntos', 'Dibujos'], ['stripes', 'Rayas', 'Dibujos'], ['checks', 'Cuadros', 'Dibujos'], ['diagonal', 'Líneas diagonales', 'Dibujos'],
  ['upload', 'Una imagen de tu PC', 'Imágenes y vídeo'], ['url', 'Una imagen de internet (URL)', 'Imágenes y vídeo'],
  ['slideshow', 'Varias imágenes que van cambiando', 'Imágenes y vídeo'], ['video', 'Un vídeo (de tu PC o de internet)', 'Imágenes y vídeo']
];

function rkHex(h) {
  h = String(h || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : null;
}
function rkRgb(h) { h = rkHex(h) || '#000000'; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function rkA(h, a) { var c = rkRgb(h); return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + Math.round(a * 1000) / 1000 + ')'; }
function rkMix(a, b, t) {
  var x = rkRgb(a), y = rkRgb(b);
  return '#' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0'); }).join('');
}
function rkLum(h) {
  var c = rkRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function rkOn(h) { return rkLum(h) > 0.42 ? '#111111' : '#ffffff'; }

function rkFindTheme(id, custom) {
  var all = (custom || []).concat(RK_THEMES);
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return RK_THEMES[0];
}

// Tema efectivo = base + tema elegido + retoques que el usuario guardó para ese tema.
function rkEffectiveTheme(settings, themeId) {
  var id = themeId || rkActiveThemeId(settings);
  var preset = rkFindTheme(id, settings['theme.custom']);
  var ov = (settings['theme.overrides'] || {})[preset.id] || {};
  var t = {};
  var k;
  for (k in RK_THEME_BASE) t[k] = RK_THEME_BASE[k];
  for (k in preset) if (k !== 'c' && k !== 'layout') t[k] = preset[k];
  for (k in ov) if (k !== 'c' && k !== 'layout') t[k] = ov[k];
  t.c = {};
  for (k in preset.c) t.c[k] = preset.c[k];
  if (ov.c) for (k in ov.c) if (rkHex(ov.c[k])) t.c[k] = rkHex(ov.c[k]);
  t.layout = {};
  for (k in RK_LAYOUT_BASE) t.layout[k] = RK_LAYOUT_BASE[k];
  var pl = preset.layout || RK_THEME_LAYOUTS[preset.id] || {};
  for (k in pl) t.layout[k] = pl[k];
  if (ov.layout) for (k in ov.layout) t.layout[k] = ov.layout[k];
  t.iconStyle = t.layout.iconStyle;
  t.id = preset.id;
  t.name = preset.name;
  return t;
}

// Posición y tamaño de una imagen de fondo.
function rkImageFit(t) {
  var pos = { center: 'center', top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center' }[t.bgPos] || 'center';
  var fit = t.bgFit || 'cover';
  if (fit === 'tile') return pos + ' / auto repeat';
  if (fit === 'contain') return pos + ' / contain no-repeat';
  if (fit === 'stretch') return pos + ' / 100% 100% no-repeat';
  return pos + ' / cover no-repeat';
}

// Degradado hecho por ti: lineal, radial o cónico, con 2 a 6 colores.
function rkCustomGradient(t) {
  var c = t.c;
  var stops = Array.isArray(t.gradStops) && t.gradStops.length >= 2 ? t.gradStops : [[c.accent, 0], [c.bg, 55], [c.accent2, 100]];
  var list = stops.slice(0, 6).map(function (st) { return (rkHex(st[0]) || c.bg) + ' ' + Math.max(0, Math.min(100, Number(st[1]) || 0)) + '%'; }).join(', ');
  var ang = Number(t.gradAngle) || 0;
  var g = t.gradKind === 'radial' ? 'radial-gradient(circle at 50% 50%, ' + list + ')'
    : t.gradKind === 'conic' ? 'conic-gradient(from ' + ang + 'deg at 50% 50%, ' + list + ')'
    : 'linear-gradient(' + ang + 'deg, ' + list + ')';
  return t.gradAnim ? { layer: g + ' 0 0 / 300% 300%', anim: 'rk-bg-aurora 22s ease-in-out infinite alternate' } : { layer: g };
}

function rkBackground(t, image) {
  var c = t.c, a = c.accent, b = c.accent2, bg = c.bg;
  switch (t.bg) {
    case 'gradient': return { layer: 'linear-gradient(135deg, ' + rkMix(bg, a, 0.22) + ' 0%, ' + bg + ' 45%, ' + bg + ' 60%, ' + rkMix(bg, b, 0.22) + ' 100%)' };
    case 'nebula': return { layer: 'radial-gradient(ellipse at 18% 25%, ' + rkA(a, 0.32) + ', transparent 55%), radial-gradient(ellipse at 82% 18%, ' + rkA(b, 0.28) + ', transparent 50%), radial-gradient(ellipse at 60% 90%, ' + rkA(a, 0.18) + ', transparent 55%), ' + bg };
    case 'aurora': return { layer: 'linear-gradient(120deg, ' + rkA(a, 0.38) + ', ' + rkA(b, 0.32) + ', ' + rkA(c.success, 0.22) + ', ' + rkA(a, 0.34) + ') 0 0 / 300% 300%, ' + bg, anim: 'rk-bg-aurora 24s ease-in-out infinite alternate' };
    case 'stars': {
      var s = function (x, y, o, size) { return 'radial-gradient(' + size + 'px ' + size + 'px at ' + x + 'px ' + y + 'px, rgba(255,255,255,' + o + '), transparent)'; };
      return { layer: [s(25, 35, 0.9, 1.5), s(140, 80, 0.7, 1), s(80, 160, 0.8, 1.5), s(190, 190, 0.6, 1), s(230, 40, 0.9, 1), s(60, 230, 0.5, 1)].map(function (g) { return g + ' 0 0 / 260px 260px'; }).join(', ') + ', ' +
        'radial-gradient(ellipse at 30% 20%, ' + rkA(a, 0.18) + ', transparent 60%), radial-gradient(ellipse at 75% 80%, ' + rkA(b, 0.16) + ', transparent 55%), ' + bg, anim: 'rk-bg-stars 120s linear infinite' };
    }
    case 'grid': return { layer: 'linear-gradient(' + rkA(a, 0.28) + ' 1px, transparent 1px) 0 0 / 56px 56px, linear-gradient(90deg, ' + rkA(b, 0.22) + ' 1px, transparent 1px) 0 0 / 56px 56px, radial-gradient(ellipse at 50% 110%, ' + rkA(a, 0.35) + ', transparent 60%), linear-gradient(180deg, ' + bg + ' 0%, ' + rkMix(bg, b, 0.18) + ' 100%)', anim: 'rk-bg-grid 4s linear infinite' };
    case 'scan': return { layer: 'repeating-linear-gradient(0deg, ' + rkA(a, 0.05) + ' 0 1px, transparent 1px 4px) 0 0 / 100% 400px, radial-gradient(ellipse at 50% 0%, ' + rkA(a, 0.14) + ', transparent 60%), ' + bg, anim: 'rk-bg-scan 10s linear infinite' };
    case 'ocean': return { layer: 'radial-gradient(ellipse at 50% 115%, ' + rkA(a, 0.42) + ', transparent 60%), radial-gradient(ellipse at 10% 0%, ' + rkA(b, 0.18) + ', transparent 50%), linear-gradient(180deg, ' + bg + ', ' + rkMix(bg, a, 0.12) + ')' };
    case 'forest': return { layer: 'radial-gradient(ellipse at 80% 0%, ' + rkA(b, 0.20) + ', transparent 55%), radial-gradient(ellipse at 0% 100%, ' + rkA(a, 0.22) + ', transparent 55%), linear-gradient(180deg, ' + rkMix(bg, a, 0.08) + ', ' + bg + ')' };
    case 'sunset': return { layer: 'radial-gradient(ellipse at 50% 120%, ' + rkA(a, 0.45) + ', transparent 60%), linear-gradient(180deg, ' + rkMix(bg, b, 0.28) + ' 0%, ' + rkMix(bg, a, 0.14) + ' 55%, ' + bg + ' 100%)' };
    case 'sakura': return { layer: 'radial-gradient(circle at 12% 18%, ' + rkA(a, 0.18) + ', transparent 35%), radial-gradient(circle at 88% 30%, ' + rkA(b, 0.16) + ', transparent 35%), radial-gradient(circle at 70% 88%, ' + rkA(a, 0.14) + ', transparent 40%), ' + bg };
    case 'waves': return { layer: 'repeating-radial-gradient(circle at 0 100%, ' + rkA(a, 0.07) + ' 0 2px, transparent 2px 34px), repeating-radial-gradient(circle at 100% 0, ' + rkA(b, 0.06) + ' 0 2px, transparent 2px 40px), ' + bg };
    case 'dots': return { layer: 'radial-gradient(' + rkA(c.text, 0.09) + ' 1px, transparent 1.5px) 0 0 / 22px 22px, ' + bg };
    case 'snow': {
      // Seis capas de copos en mosaicos de 220, 330 y 440 px que caen a distinta velocidad (ver rk-bg-snow).
      var f = function (x, y, r, o, tile) { return 'radial-gradient(' + r + 'px ' + r + 'px at ' + x + 'px ' + y + 'px, rgba(255,255,255,' + o + '), transparent) 0 0 / ' + tile + 'px ' + tile + 'px'; };
      return { layer: [f(30, 40, 2, 0.9, 220), f(150, 160, 1.5, 0.7, 220), f(90, 250, 2.5, 0.8, 330), f(260, 60, 2, 0.6, 330), f(120, 330, 3, 0.85, 440), f(360, 120, 2.5, 0.7, 440)].join(', ') +
        ', radial-gradient(ellipse at 50% 120%, ' + rkA(b, 0.30) + ', transparent 60%), ' + bg, anim: 'rk-bg-snow 40s linear infinite' };
    }
    case 'spooky': return { layer: 'radial-gradient(circle at 84% 14%, rgba(255,214,150,.85) 0 34px, rgba(255,170,80,.28) 36px, transparent 130px), radial-gradient(ellipse at 50% 125%, ' + rkA(b, 0.38) + ', transparent 60%), radial-gradient(ellipse at 0% 0%, ' + rkA(a, 0.20) + ', transparent 50%), ' + bg };
    case 'color': return { layer: 'linear-gradient(' + (rkHex(t.bgColor) || bg) + ', ' + (rkHex(t.bgColor) || bg) + ')' };
    case 'custom': return rkCustomGradient(t);
    case 'mesh': return { layer: 'radial-gradient(at 0% 0%, ' + rkA(a, 0.38) + ' 0, transparent 52%), radial-gradient(at 100% 0%, ' + rkA(b, 0.32) + ' 0, transparent 50%), radial-gradient(at 100% 100%, ' + rkA(c.success, 0.22) + ' 0, transparent 52%), radial-gradient(at 0% 100%, ' + rkA(b, 0.26) + ' 0, transparent 50%), radial-gradient(at 50% 50%, ' + rkA(a, 0.10) + ' 0, transparent 60%), ' + bg };
    case 'stripes': return { layer: 'repeating-linear-gradient(45deg, ' + rkA(a, 0.08) + ' 0 14px, transparent 14px 28px), ' + bg };
    case 'checks': return { layer: 'conic-gradient(' + rkA(a, 0.07) + ' 25%, transparent 0 50%, ' + rkA(a, 0.07) + ' 0 75%, transparent 0) 0 0 / 48px 48px, ' + bg };
    case 'diagonal': return { layer: 'repeating-linear-gradient(-45deg, ' + rkA(b, 0.10) + ' 0 2px, transparent 2px 22px), radial-gradient(ellipse at 50% 0%, ' + rkA(a, 0.18) + ', transparent 60%), ' + bg };
    case 'url': return /^https:\/\//i.test(t.bgUrl || '') ? { layer: 'url("' + String(t.bgUrl).replace(/["\\\n]/g, '') + '") ' + rkImageFit(t) + ', ' + bg, image: true } : { layer: 'none' };
    case 'upload': return image ? { layer: 'url("' + image + '") ' + rkImageFit(t) + ', ' + bg, image: true } : { layer: 'none' };
    case 'slideshow': case 'video': return { layer: 'linear-gradient(' + bg + ', ' + bg + ')', media: true };
    default: return { layer: 'none' };
  }
}

// Cursor propio pintado con el color del tema (flecha, anillo o punto).
function rkCursorVars(kind, color) {
  var col = rkHex(color) || '#3b82f6';
  var enc = function (svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; };
  var arrow = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 2.5l15 7.2-6.4 2.1-2.2 6.5z" fill="' + col + '" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  var hand = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 2.5l15 7.2-6.4 2.1-2.2 6.5z" fill="#fff" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/></svg>';
  var ring = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="none" stroke="' + col + '" stroke-width="2.5"/><circle cx="14" cy="14" r="2.2" fill="' + col + '"/></svg>';
  var ringOn = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="' + rkA(col, 0.25) + '" stroke="' + col + '" stroke-width="2.5"/><circle cx="14" cy="14" r="3" fill="' + col + '"/></svg>';
  var dot = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5" fill="' + col + '" stroke="#fff" stroke-width="1.5"/></svg>';
  var dotOn = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="' + col + '" stroke="#fff" stroke-width="1.5"/></svg>';
  if (kind === 'ring') return { '--rk-cursor': enc(ring) + ' 14 14, auto', '--rk-cursor-link': enc(ringOn) + ' 14 14, pointer' };
  if (kind === 'dot') return { '--rk-cursor': enc(dot) + ' 10 10, auto', '--rk-cursor-link': enc(dotOn) + ' 10 10, pointer' };
  return { '--rk-cursor': enc(arrow) + ' 4 2, auto', '--rk-cursor-link': enc(hand) + ' 4 2, pointer' };
}

// Grano de película (ruido SVG en mosaico).
function rkGrain(amount) {
  var o = Math.max(0, Math.min(100, Number(amount) || 0)) / 100 * 0.35;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="' + o.toFixed(3) + '"/></svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 0 0 / 180px 180px';
}

// Capa por encima del fondo: oscurecer + efecto + grano.
function rkOverlay(t) {
  var c = t.c, layers = [];
  var col = rkHex(t.overlayColor) || (t.overlay === 'tint' ? c.accent : '#000000');
  var k = Math.max(0, Math.min(100, Number(t.overlayStrength) || 0)) / 100;
  if (Number(t.grain) > 0) layers.push(rkGrain(t.grain));
  switch (t.overlay) {
    case 'vignette': layers.push('radial-gradient(ellipse at center, transparent 40%, ' + rkA(col, Math.min(0.95, k * 1.2)) + ' 100%)'); break;
    case 'tint': layers.push('linear-gradient(' + rkA(col, k * 0.6) + ', ' + rkA(col, k * 0.6) + ')'); break;
    case 'top': layers.push('linear-gradient(180deg, ' + rkA(col, Math.min(0.95, k * 1.3)) + ', transparent 60%)'); break;
    case 'bottom': layers.push('linear-gradient(0deg, ' + rkA(col, Math.min(0.95, k * 1.3)) + ', transparent 60%)'); break;
    case 'scanlines': layers.push('repeating-linear-gradient(0deg, ' + rkA('#000000', k * 0.55) + ' 0 1px, transparent 1px 3px)'); break;
  }
  var dim = Math.max(0, Math.min(0.95, (Number(t.bgDim) || 0) / 100));
  if (dim > 0) layers.push('linear-gradient(' + rkA(c.bg, dim) + ', ' + rkA(c.bg, dim) + ')');
  return layers.length ? layers.join(', ') : 'none';
}

function rkBgFilter(t) {
  var f = [];
  if (Number(t.bgBlur) > 0) f.push('blur(' + Number(t.bgBlur) + 'px)');
  if (t.bgBright != null && Number(t.bgBright) !== 100) f.push('brightness(' + Number(t.bgBright) + '%)');
  if (t.bgContrast != null && Number(t.bgContrast) !== 100) f.push('contrast(' + Number(t.bgContrast) + '%)');
  if (t.bgSat != null && Number(t.bgSat) !== 100) f.push('saturate(' + Number(t.bgSat) + '%)');
  if (Number(t.bgHue)) f.push('hue-rotate(' + Number(t.bgHue) + 'deg)');
  if (Number(t.bgGray) > 0) f.push('grayscale(' + Number(t.bgGray) + '%)');
  if (Number(t.bgSepia) > 0) f.push('sepia(' + Number(t.bgSepia) + '%)');
  return f.length ? f.join(' ') : 'none';
}

// Devuelve las variables CSS y las clases para aplicar un tema.
function rkThemeVars(t, opts) {
  opts = opts || {};
  var c = t.c, dark = rkLum(c.bg) < 0.3;
  var L = t.layout || RK_LAYOUT_BASE;
  var glass = Math.max(0, Math.min(0.9, Number(t.glass) || 0));
  var bgx = rkBackground(t, opts.image);
  var font = '';
  if (t.font === 'custom') font = t.fontCustom ? '"' + String(t.fontCustom).replace(/["\\]/g, '') + '", system-ui, sans-serif' : '';
  else RK_FONTS.forEach(function (f) { if (f[0] === t.font) font = f[2]; });
  var radius = Math.max(0, Math.min(30, Number(t.radius)));
  if (isNaN(radius)) radius = 14;
  var thumbR = { rounded: Math.max(16, radius + 6) + 'px', square: '0px', framed: Math.round(radius * 0.6) + 'px' }[L.tiles] || Math.round(radius * 0.6) + 'px';
  var btnR = { pill: '999px', square: '2px' }[L.buttons] || Math.round(radius * 0.6) + 'px';
  var gk = Math.max(0, Math.min(100, t.glowSize == null ? 50 : Number(t.glowSize) || 0)) / 50;
  var sk = Math.max(0, Math.min(100, t.shadow == null ? 50 : Number(t.shadow) || 0)) / 50;
  var vars = {
    '--rk-bg': c.bg, '--rk-surface': c.surface, '--rk-surface-2': c.surface2, '--rk-border': c.border,
    '--rk-text': c.text, '--rk-muted': c.muted, '--rk-accent': c.accent, '--rk-accent-2': c.accent2,
    '--rk-accent-text': rkOn(c.accent), '--rk-accent-soft': rkA(c.accent, 0.16), '--rk-accent-glow': rkA(c.accent, 0.55),
    '--rk-success': c.success, '--rk-success-text': rkOn(c.success), '--rk-danger': c.danger,
    '--rk-panel': rkA(c.surface, 1 - glass), '--rk-panel-2': rkA(c.surface2, Math.max(0.35, 1 - glass * 0.8)),
    '--rk-hover': rkA(c.text, dark ? 0.06 : 0.05),
    '--rk-backdrop': (Number(t.panelBlur) > 0 && glass > 0) ? 'blur(' + Number(t.panelBlur) + 'px) saturate(140%)' : 'none',
    '--rk-radius': radius + 'px', '--rk-radius-sm': Math.round(radius * 0.6) + 'px',
    '--rk-thumb-radius': thumbR, '--rk-btn-radius': btnR,
    '--rk-density': { compact: '0.72', spacious: '1.35' }[L.density] || '1',
    '--rk-zoom': String(Math.max(0.8, Math.min(1.25, (Number(L.zoom) || 100) / 100))),
    '--rk-font': font || 'inherit',
    '--rk-bg-layer': bgx.layer, '--rk-bg-anim': (opts.animations !== false && bgx.anim) ? bgx.anim : 'none',
    '--rk-bg-blur': (Number(t.bgBlur) || 0) + 'px', '--rk-bg-dim': rkA(c.bg, Math.max(0, Math.min(0.95, (Number(t.bgDim) || 0) / 100))),
    '--rk-bg-filter': rkBgFilter(t), '--rk-overlay': rkOverlay(t),
    '--rk-parallax': String(Math.max(0, Math.min(40, Number(t.parallax) || 0))),
    '--rk-scroll': rkA(c.text, dark ? 0.22 : 0.28),
    '--rk-shadow': sk <= 0 ? 'none' : dark ? '0 ' + Math.round(10 * sk) + 'px ' + Math.round(30 * sk) + 'px rgba(0,0,0,' + Math.min(0.8, 0.35 * sk).toFixed(2) + ')'
      : '0 ' + Math.round(6 * sk) + 'px ' + Math.round(20 * sk) + 'px rgba(20,30,60,' + Math.min(0.3, 0.08 * sk).toFixed(2) + ')',
    '--rk-glow': t.glow && gk > 0 ? '0 0 ' + Math.round(14 * gk) + 'px ' + rkA(c.accent, Math.min(0.95, 0.55 * gk)) + ', 0 0 2px ' + rkA(c.accent, 0.8) : 'none',
    '--rk-text-glow': t.glow && gk > 0 ? '0 0 ' + Math.round(10 * gk) + 'px ' + rkA(c.accent, Math.min(0.95, 0.6 * gk)) : 'none',
    '--rk-scheme': dark ? 'dark' : 'light',
    '--rk-nav-icon-filter': rkOn(c.accent) === '#ffffff' ? 'brightness(0) invert(1)' : 'brightness(0)'
  };
  if (L.cursor && L.cursor !== 'normal') { var cv = rkCursorVars(L.cursor, c.accent); for (var cvk in cv) vars[cvk] = cv[cvk]; }
  var classes = ['rk-vars', 'rk-theme', dark ? 'rk-dark' : 'rk-light'];
  if (t.glow) classes.push('rk-glow');
  if (glass > 0) classes.push('rk-glass');
  if (font) classes.push('rk-font');
  if (bgx.layer !== 'none') classes.push('rk-bgimg');
  if (bgx.media) classes.push('rk-media');
  if (opts.animations !== false) classes.push('rk-anim');
  if (Number(t.parallax) > 0 && opts.animations !== false) classes.push('rk-parallax');
  // Estructura: una clase por cada opción que no es la normal (rk-l-nav-floating, rk-l-buttons-pill…).
  for (var k in RK_LAYOUT_BASE) {
    if (k === 'zoom' || k === 'iconStyle') continue;
    var v = L[k];
    if (v && v !== 'normal' && !(k === 'avatars' && v === 'circle') && !(k === 'animIn' && v === 'none')) classes.push('rk-l-' + k + '-' + v);
  }
  if (Number(L.zoom) && Number(L.zoom) !== 100) classes.push('rk-l-zoom');
  return { vars: vars, classes: classes, scheme: dark ? 'dark' : 'light', needsImage: t.bg === 'upload', media: !!bgx.media };
}

var RK_ALL_CLASSES = ['rk-vars', 'rk-theme', 'rk-dark', 'rk-light', 'rk-glow', 'rk-glass', 'rk-font', 'rk-bgimg', 'rk-anim', 'rk-media', 'rk-parallax'];

function rkApply(el, payload) {
  RK_ALL_CLASSES.forEach(function (k) { el.classList.remove(k); });
  Array.prototype.slice.call(el.classList).forEach(function (k) { if (k.indexOf('rk-l-') === 0) el.classList.remove(k); });
  for (var i = el.style.length - 1; i >= 0; i--) { var p = el.style[i]; if (p.indexOf('--rk-') === 0) el.style.removeProperty(p); }
  if (!payload) return;
  for (var k in payload.vars) el.style.setProperty(k, payload.vars[k]);
  payload.classes.forEach(function (cl) { el.classList.add(cl); });
}

// Pequeña maqueta de la web de Roblox pintada con un tema (galería y vista previa).
function rkMiniPreview(doc, t) {
  var p = rkThemeVars(t, { animations: false });
  var box = doc.createElement('div');
  box.className = 'rk-mini';
  for (var k in p.vars) box.style.setProperty(k, p.vars[k]);
  var add = function (parent, tag, cls) { var n = doc.createElement(tag); if (cls) n.className = cls; parent.appendChild(n); return n; };
  add(box, 'div', 'rk-mini-bg');
  var top = add(box, 'div', 'rk-mini-top'); add(top, 'i'); add(top, 'b');
  var body = add(box, 'div', 'rk-mini-body');
  var hero = add(body, 'div', 'rk-mini-hero'); add(hero, 'span'); add(hero, 'em');
  var row = add(body, 'div', 'rk-mini-row'); for (var i = 0; i < 4; i++) add(row, 'div');
  var row2 = add(body, 'div', 'rk-mini-row rk-mini-row2'); add(row2, 'div'); add(row2, 'div');
  return box;
}
