// Ajustes de RoCer0, compartidos por el fondo, los content scripts, el popup y la página de ajustes.
// Cada opción tiene una clave plana ("grupo.opcion"), un tipo y un valor por defecto.
// La página de ajustes se genera a partir de RX_SECTIONS: cada sección del menú lateral tiene
// tarjetas con opciones (items) o con paneles fijos de options.html (panel).
//
// Tipos de opción: bool, select, seg (botones), range (deslizador), number, text, textarea, time,
// hotkey (atajo), color, multi (varias a la vez, valor = lista), tags (lista de textos),
// flags (varias claves bool como fichas), order (lista ordenable, cada fila con su clave bool),
// action (botón) y hidden (se guarda pero no se pinta).
// "parent": la fila solo se ve si esa clave está encendida ("!clave" al revés, [clave, valor] si vale eso).

// Monedas para el conversor de Robux (códigos ISO 4217). Los nombres salen del navegador en español.
var RC_CURRENCIES = ['AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR',
  'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD',
  'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP',
  'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR',
  'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND',
  'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'];

function rcCurrencyName(code) {
  try {
    var n = new Intl.DisplayNames(['es'], { type: 'currency' }).of(code);
    if (n && n !== code) return n.charAt(0).toUpperCase() + n.slice(1);
  } catch (e) { /* navegador sin Intl.DisplayNames */ }
  return code;
}

// Se calcula al abrir el desplegable (son 160 nombres y los content scripts no los necesitan).
function rcCurrencyOptions() {
  var list = RC_CURRENCIES.map(function (c) { return [c, rcCurrencyName(c) + ' (' + c + ')']; });
  list.sort(function (a, b) { return a[1].localeCompare(b[1], 'es'); });
  return list.concat([['custom', 'Otra moneda (escribe el símbolo y el valor)']]);
}

// "90" → "1 h 30 min"; para textos de retos y deslizadores en minutos.
function rcMinText(n) {
  n = Math.round(Number(n) || 0);
  if (n < 60) return n + (n === 1 ? ' minuto' : ' minutos');
  var h = Math.floor(n / 60), m = n % 60;
  if (!m) return h + (h === 1 ? ' hora' : ' horas');
  return h + ' h ' + m + ' min';
}

var RX_REGIONS = {
  'us-va': { label: 'Virginia (EE. UU.)', test: function (l) { return l.country === 'US' && /virginia/i.test(l.region || ''); } },
  'us-east': { label: 'EE. UU. Este', test: function (l) { return l.country === 'US' && /virginia|new york|new jersey|georgia|florida|north carolina|pennsylvania|massachusetts|maryland|ohio/i.test(l.region || ''); } },
  'us-central': { label: 'EE. UU. Centro', test: function (l) { return l.country === 'US' && /texas|illinois|missouri|kansas|minnesota|colorado|iowa|nebraska/i.test(l.region || ''); } },
  'us-west': { label: 'EE. UU. Oeste', test: function (l) { return l.country === 'US' && /california|washington|oregon|nevada|arizona|utah/i.test(l.region || ''); } },
  'de': { label: 'Frankfurt (Alemania)', test: function (l) { return l.country === 'DE'; } },
  'eu': { label: 'Europa', test: function (l) { return ['DE', 'NL', 'GB', 'FR', 'PL', 'ES', 'IT', 'SE', 'IE', 'BE', 'AT', 'CH', 'DK', 'FI', 'NO', 'PT', 'CZ'].indexOf(l.country) >= 0; } },
  'sg': { label: 'Singapur', test: function (l) { return l.country === 'SG'; } },
  'asia': { label: 'Asia', test: function (l) { return ['SG', 'JP', 'HK', 'IN', 'KR', 'TW', 'MY', 'TH', 'ID', 'PH', 'VN'].indexOf(l.country) >= 0; } },
  'br': { label: 'Brasil', test: function (l) { return l.country === 'BR'; } },
  'au': { label: 'Australia', test: function (l) { return l.country === 'AU'; } }
};

// ---------- Retos diarios ----------
// goals: objetivo en fácil, normal y difícil. text(n): el texto con ese objetivo.
var RC_CHALLENGES = [
  { id: 'play30', cat: 'play', unit: 'min', goals: [15, 30, 45], short: 'Jugar un rato', text: function (n) { return 'Juega ' + rcMinText(n); } },
  { id: 'play60', cat: 'play', unit: 'min', goals: [30, 60, 120], short: 'Jugar más tiempo', text: function (n) { return 'Juega ' + rcMinText(n); } },
  { id: 'threeGames', cat: 'play', goals: [2, 3, 5], short: 'Varios juegos', text: function (n) { return 'Juega a ' + n + ' juegos distintos'; } },
  { id: 'joinFriend', cat: 'social', goals: [1, 1, 1], short: 'Unirte a un amigo', text: function () { return 'Únete a la partida de un amigo'; } },
  { id: 'withFriends', cat: 'social', goals: [1, 2, 3], short: 'Coincidir con amigos', needs: 'social.trackFriends',
    text: function (n) { return n === 1 ? 'Coincide en un juego con un amigo' : 'Coincide en un juego con ' + n + ' amigos a la vez'; } },
  { id: 'profiles', cat: 'social', goals: [2, 3, 5], short: 'Visitar perfiles', text: function (n) { return 'Visita el perfil de ' + n + ' personas'; } },
  { id: 'newGame', cat: 'misc', goals: [1, 1, 1], short: 'Probar un juego nuevo', text: function () { return 'Prueba un juego nuevo para ti'; } },
  { id: 'badge', cat: 'misc', goals: [1, 1, 2], short: 'Conseguir insignias', text: function (n) { return n === 1 ? 'Consigue una insignia' : 'Consigue ' + n + ' insignias'; } },
  { id: 'roulette', cat: 'misc', goals: [1, 1, 1], short: 'Girar la ruleta', needs: 'fun.roulette', text: function () { return 'Gira la ruleta y juega a lo que salga'; } },
  { id: 'pin', cat: 'misc', goals: [1, 1, 1], short: 'Fijar un juego', needs: 'pinned.enabled', text: function () { return 'Fija un juego nuevo'; } },
  { id: 'note', cat: 'misc', goals: [1, 1, 1], short: 'Escribir una nota', needs: 'notes.enabled', text: function () { return 'Escribe una nota en un juego o perfil'; } },
  { id: 'wish', cat: 'misc', goals: [1, 1, 1], short: 'Lista de deseos', needs: 'wishlist.enabled', text: function () { return 'Añade algo a tu lista de deseos'; } }
];

var RC_MEDALS = [
  { id: 'bronce', icon: 'medal', color: '#cd7f32', name: 'Bronce', streak: 3, text: '3 días seguidos con todos los retos' },
  { id: 'plata', icon: 'medal', color: '#c3ccd8', name: 'Plata', streak: 7, text: '7 días seguidos con todos los retos' },
  { id: 'oro', icon: 'medal', color: '#f5c542', name: 'Oro', streak: 30, text: '30 días seguidos con todos los retos' },
  { id: 'centenario', icon: 'crown', color: '#a855f7', name: 'Centenario', total: 100, text: '100 retos completados' }
];

function rcDay(d) {
  var x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

function rcChallengeDef(id) {
  for (var i = 0; i < RC_CHALLENGES.length; i++) if (RC_CHALLENGES[i].id === id) return RC_CHALLENGES[i];
  return null;
}

function rcChallengeGoal(id, difficulty) {
  var def = rcChallengeDef(id);
  if (!def) return 1;
  var i = { easy: 0, normal: 1, hard: 2 }[difficulty];
  return def.goals[i === undefined ? 1 : i];
}

// Texto de un reto con su objetivo (el objetivo se guarda al sacar los retos del día).
function rcChallengeText(id, goal) {
  var def = rcChallengeDef(id);
  if (!def) return String(id);
  return def.text(goal || def.goals[1]);
}

// Firma de la configuración de retos: si cambia y aún no has completado ninguno hoy, se vuelven a sacar.
function rcChallengeSig(s) {
  s = s || {};
  var pool = (s['challenges.pool'] || []).slice().sort().join(',');
  return [s['challenges.count'] || 3, s['challenges.difficulty'] || 'normal', pool].join('|');
}

// Elige los retos del día de forma fija para esa fecha (salt cambia la tirada al pedir otros).
function rcPickChallenges(day, settings, salt) {
  var s = settings || RX_DEFAULTS;
  var key = day + (salt ? '#' + salt : '');
  var seed = 2166136261;
  for (var i = 0; i < key.length; i++) { seed ^= key.charCodeAt(i); seed = Math.imul(seed, 16777619) >>> 0; }
  var rand = function () {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  var count = Math.max(1, Math.min(5, Number(s['challenges.count']) || 3));
  var pool = Array.isArray(s['challenges.pool']) && s['challenges.pool'].length ? s['challenges.pool'] : null;
  var usable = function (c) { return !c.needs || s[c.needs]; };
  var avail = RC_CHALLENGES.filter(function (c) { return usable(c) && (!pool || pool.indexOf(c.id) >= 0); });
  if (!avail.length) avail = RC_CHALLENGES.filter(usable);
  var cats = ['play', 'social', 'misc'], out = [];
  for (var n = 0; out.length < count && n < count * 4; n++) {
    var opts = avail.filter(function (c) { return c.cat === cats[n % 3] && out.indexOf(c.id) < 0; });
    if (!opts.length) opts = avail.filter(function (c) { return out.indexOf(c.id) < 0; });
    if (!opts.length) break;
    out.push(opts[Math.floor(rand() * opts.length)].id);
  }
  return out;
}

// ---------- Utilidades compartidas ----------

// Para comparar textos sin mayúsculas ni tildes.
function rcFold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// ¿Hay que ocultar un juego por las palabras de "discover.blockWords"?
function rcBlockedName(name, s) {
  var words = s && s['discover.blockWords'];
  if (!s || !s['discover.enabled'] || !Array.isArray(words) || !words.length || !name) return false;
  var n = rcFold(name);
  return words.some(function (w) { w = rcFold(w).trim(); return !!w && n.indexOf(w) >= 0; });
}

// ¿Es uno de tus amigos favoritos? user: { id, name, displayName }. En la lista puede haber nombres o IDs.
function rcIsFavorite(s, user) {
  var fav = s && s['friends.favorites'];
  if (!Array.isArray(fav) || !fav.length || !user) return false;
  var id = String(user.id || user.userId || ''), a = rcFold(user.name), b = rcFold(user.displayName);
  return fav.some(function (f) { f = rcFold(f).trim().replace(/^@/, ''); return !!f && (f === id || f === a || f === b); });
}

// Ordena los fijados como pide "pinned.sort". recent: lista de {placeId, universeId, t} (myRecent y myJoins).
function rcSortPins(pins, mode, recent) {
  var list = (pins || []).slice();
  if (mode === 'name') {
    list.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }); });
  } else if (mode === 'recent') {
    var last = {};
    (recent || []).forEach(function (r) {
      var t = Number(r.t) || 0;
      if (r.placeId) last['p' + r.placeId] = Math.max(last['p' + r.placeId] || 0, t);
      if (r.universeId) last['u' + r.universeId] = Math.max(last['u' + r.universeId] || 0, t);
    });
    var when = function (p) { return Math.max(last['p' + p.placeId] || 0, last['u' + p.universeId] || 0); };
    list = list.map(function (p, i) { return [p, i]; })
      .sort(function (a, b) { return (when(b[0]) - when(a[0])) || (a[1] - b[1]); })
      .map(function (x) { return x[0]; });
  }
  return list;
}

// ¿Estamos en el horario de silencio de las notificaciones?
function rcInQuietHours(s, date) {
  if (!s || !s['notify.quiet']) return false;
  var toMin = function (t) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim()); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  var a = toMin(s['notify.quietFrom']), b = toMin(s['notify.quietTo']);
  if (a === null || b === null || a === b) return false;
  var n = date || new Date(), now = n.getHours() * 60 + n.getMinutes();
  return a < b ? (now >= a && now < b) : (now >= a || now < b);
}

// Confeti para un suceso ("badge", "challenge", "challenges", "medal", "trade", "roulette"):
// null si no toca, o las opciones para rcConfetti().
function rcConfettiFor(s, kind) {
  if (!s || !s['fun.confetti']) return null;
  var ev = s['fun.confettiEvents'];
  if (kind && Array.isArray(ev) && ev.indexOf(kind) < 0) return null;
  var opts = {
    amount: Math.max(20, Math.min(600, Number(s['fun.confettiAmount']) || 170)),
    duration: Math.round(Math.max(1, Math.min(10, Number(s['fun.confettiDuration']) || 3.5)) * 1000)
  };
  if (s['fun.confettiColors'] === 'rainbow') opts.colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
  else if (s['fun.confettiColors'] === 'gold') opts.colors = ['#f5c542', '#ffd76a', '#e0a526', '#fff1b8', '#c98a12', '#ffffff'];
  return opts;
}

// Atajos de teclado ("Ctrl+K", "Alt+Shift+S"...).
function rcHotkeyMatch(e, spec) {
  if (!spec || !e || !e.key) return false;
  var parts = String(spec).toLowerCase().split('+').map(function (x) { return x.trim(); }).filter(Boolean);
  var key = parts.pop();
  if (!key) return false;
  var k = e.key.toLowerCase();
  if (k === ' ') k = 'space';
  return k === key && e.ctrlKey === (parts.indexOf('ctrl') >= 0) && e.altKey === (parts.indexOf('alt') >= 0) &&
    e.shiftKey === (parts.indexOf('shift') >= 0) && e.metaKey === (parts.indexOf('meta') >= 0 || parts.indexOf('cmd') >= 0);
}

// Convierte una pulsación en el texto del atajo (null si es solo una tecla modificadora).
function rcHotkeyFromEvent(e) {
  if (!e.key || /^(Control|Shift|Alt|Meta|AltGraph|Dead|Unidentified)$/.test(e.key)) return null;
  var key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  var mods = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Meta');
  return mods.concat([key]).join('+');
}

// ---------- Secciones de los ajustes ----------

var RX_GROUPS = [
  { id: 'look', title: 'Apariencia' },
  { id: 'games', title: 'Juegos' },
  { id: 'people', title: 'Personas' },
  { id: 'shop', title: 'Catálogo y Robux' },
  { id: 'activity', title: 'Tu actividad' },
  { id: 'tools', title: 'Herramientas' },
  { id: 'app', title: 'RoCer0' }
];

var RX_SECTIONS = [
  // ======================= Apariencia =======================
  {
    id: 'themes', group: 'look', title: 'Temas', icon: 'palette', load: ['themes'],
    desc: 'Colores, fondo y forma de toda la web. Cada tema recuerda tus retoques.',
    keywords: 'tema colores fondo estructura editor galería vídeo imagen partículas fuente letra cristal',
    cards: [
      { panel: 'panel-theme-gallery' },
      { panel: 'panel-theme-editor' },
      { panel: 'panel-theme-auto', keywords: 'automático día noche temporada halloween navidad' },
      { title: 'Dónde se aplica', icon: 'layers', items: [
        { key: 'theme.enabled', type: 'bool', default: true, label: 'Aplicar el tema a roblox.com' },
        { key: 'theme.extension', type: 'bool', default: true, label: 'Usarlo también en estos ajustes y en el popup' },
        { key: 'theme.animations', type: 'bool', default: true, label: 'Fondos animados y efectos de movimiento' },
        { key: 'theme.syncRoblox', type: 'bool', default: true, label: 'Poner Roblox en modo claro u oscuro según el tema', help: 'Así lo que el tema no cubre se sigue leyendo bien.' }
      ] }
    ]
  },
  {
    id: 'icons', group: 'look', title: 'Iconos', icon: 'brush', load: ['icons'],
    desc: 'Iconos dibujados para RoCer0, sin emojis. Cambia su estilo o pon imágenes de tu PC.',
    keywords: 'iconos imagen png svg trazo tamaño color subir',
    cards: [{ panel: 'panel-icons-style' }, { panel: 'panel-icons-grid' }, { panel: 'panel-icons-rbx' }, { panel: 'panel-icons-io' }]
  },
  {
    id: 'home', group: 'look', title: 'Inicio', icon: 'home', master: 'home.enabled',
    desc: 'Cambia el Inicio de Roblox por un panel de tarjetas que eliges y ordenas tú.',
    cards: [
      { title: 'Tarjetas', icon: 'grid', items: [
        { key: 'home.enabled', type: 'bool', default: true, label: 'Inicio rediseñado' },
        { key: 'home.order', type: 'order', label: 'Orden y tarjetas visibles', help: 'Arrastra para ordenar y apaga las que no quieras ver.',
          default: ['hero', 'friends', 'pinned', 'challenges', 'continue', 'recent', 'featured', 'recommended', 'collections'],
          options: [
            ['hero', 'Banner "Continuar"', 'play', 'home.hero'],
            ['friends', 'Actividad de amigos', 'users', 'home.friends'],
            ['pinned', 'Juegos fijados', 'pin', 'home.pinned'],
            ['challenges', 'Retos de hoy', 'target', 'home.challenges'],
            ['continue', 'Continuar', 'gamepad', 'home.continue'],
            ['recent', 'Juegos recientes', 'history', 'home.recent'],
            ['featured', 'Recomendación destacada', 'star', 'home.featured'],
            ['recommended', 'Recomendados para ti', 'trend', 'home.recommended'],
            ['collections', 'Colecciones', 'layers', 'home.collections']
          ] },
        { key: 'home.hero', type: 'hidden', default: true },
        { key: 'home.friends', type: 'hidden', default: true },
        { key: 'home.pinned', type: 'hidden', default: true },
        { key: 'home.challenges', type: 'hidden', default: true },
        { key: 'home.continue', type: 'hidden', default: true },
        { key: 'home.recent', type: 'hidden', default: true },
        { key: 'home.featured', type: 'hidden', default: true },
        { key: 'home.recommended', type: 'hidden', default: true },
        { key: 'home.collections', type: 'hidden', default: true },
        { key: 'home.layout', type: 'seg', default: 'auto', label: 'Colocación', options: [['auto', 'Mosaico'], ['columns', 'Dos columnas'], ['stack', 'Una por fila']] }
      ] },
      { title: 'Banner "Continuar"', icon: 'play', items: [
        { key: 'home.heroSource', type: 'seg', default: 'continue', parent: 'home.hero', label: 'Juego del banner', options: [['continue', 'Último jugado'], ['pinned', 'Primer fijado'], ['random', 'Al azar']] },
        { key: 'home.heroRoulette', type: 'bool', default: true, parent: 'home.hero', label: 'Botón de la ruleta' },
        { key: 'home.heroFavorite', type: 'bool', default: true, parent: 'home.hero', label: 'Botón de favorito' }
      ] },
      { title: 'Actividad de amigos', icon: 'users', items: [
        { key: 'home.friendsCount', type: 'range', default: 10, min: 1, max: 50, parent: 'home.friends', label: 'Amigos a mostrar' },
        { key: 'home.friendsSort', type: 'select', default: 'status', parent: 'home.friends', label: 'Orden',
          options: [['status', 'Primero los que están jugando'], ['favorites', 'Primero tus favoritos'], ['recent', 'Conectados hace menos'], ['name', 'Por nombre']] },
        { key: 'home.friendsOffline', type: 'bool', default: true, parent: 'home.friends', label: 'Incluir a los desconectados' },
        { key: 'home.friendsGame', type: 'bool', default: true, parent: 'home.friends', label: 'Ver a qué juega cada uno' },
        { key: 'home.friendsJoin', type: 'bool', default: true, parent: 'home.friends', label: 'Botón "Unirse"' }
      ] },
      { title: 'Fijados y Continuar', icon: 'pin', items: [
        { key: 'home.pinnedMax', type: 'range', default: 0, min: 0, max: 40, zero: 'Todos', parent: 'home.pinned', label: 'Fijados a mostrar' },
        { key: 'home.continueRows', type: 'range', default: 2, min: 1, max: 5, parent: 'home.continue', label: 'Filas de "Continuar"' },
        { key: 'home.tileBadge', type: 'bool', default: true, parent: 'home.continue', label: 'Etiqueta "Muy valorado"' }
      ] },
      { title: 'Recientes y recomendados', icon: 'history', items: [
        { key: 'home.recentRange', type: 'seg', default: '30', parent: 'home.recent', label: 'Periodo de "Juegos recientes"', options: [['7', '7 días'], ['30', '30 días'], ['all', 'Todo']] },
        { key: 'home.recentCount', type: 'range', default: 6, min: 3, max: 15, parent: 'home.recent', label: 'Juegos recientes a mostrar' },
        { key: 'home.recommendedCount', type: 'range', default: 6, min: 3, max: 12, parent: 'home.recommended', label: 'Recomendados a mostrar' },
        { key: 'home.collectionsCount', type: 'range', default: 6, min: 2, max: 12, parent: 'home.collections', label: 'Colecciones a mostrar' }
      ] },
      { title: 'Tarjetas de juego', icon: 'gamepad', items: [
        { key: 'home.tileQuickPlay', type: 'bool', default: true, label: 'Botón "Jugar" al pasar el ratón' },
        { key: 'home.tileMeta', type: 'bool', default: true, label: 'Valoración y jugadores' }
      ] },
      { title: 'Más', icon: 'sliders', items: [
        { key: 'home.hideOriginal', type: 'bool', default: true, label: 'Ocultar el Inicio original de Roblox', help: 'Siempre puedes verlo con el enlace del final de la página.' },
        { key: 'home.footer', type: 'bool', default: true, label: 'Enlaces al final del Inicio' }
      ] }
    ]
  },
  {
    id: 'ui', group: 'look', title: 'Interfaz', icon: 'grid', master: 'ui.enabled',
    desc: 'Retoques de la web de Roblox: el ancho, las tarjetas y las partes que prefieres no ver.',
    cards: [
      { title: 'Diseño', icon: 'grid', items: [
        { key: 'ui.enabled', type: 'bool', default: true, label: 'Retoques de interfaz' },
        { key: 'ui.wideLayout', type: 'bool', default: false, label: 'Usar todo el ancho de la pantalla' },
        { key: 'ui.compactCards', type: 'bool', default: false, label: 'Tarjetas de juego compactas' }
      ] },
      { title: 'Ocultar de la barra y la página', icon: 'eyeOff', items: [
        { key: 'ui.hide', type: 'multi', default: [], label: 'Partes ocultas', options: [
          ['chat', 'Chat flotante', 'message'], ['robux', 'Botón de Robux', 'robux'], ['create', 'Botón "Crear"', 'edit'],
          ['notifications', 'Campana de avisos', 'bell'], ['age', 'Etiqueta de edad', 'info'], ['footer', 'Pie de página', 'menu']
        ] }
      ] },
      { title: 'Ocultar del menú lateral', icon: 'menu', items: [
        { key: 'ui.hideSide', type: 'multi', default: [], label: 'Entradas ocultas', options: [
          ['profile', 'Perfil', 'user'], ['messages', 'Mensajes', 'message'], ['friends', 'Amigos', 'users'], ['avatar', 'Avatar', 'shirt'],
          ['inventory', 'Inventario', 'box'], ['trades', 'Intercambios', 'swap'], ['groups', 'Comunidades', 'flag'], ['blog', 'Blog', 'note'],
          ['store', 'Tienda oficial', 'bag'], ['giftcards', 'Tarjetas regalo', 'gift'], ['premium', 'Premium', 'crown']
        ] }
      ] },
      { title: 'CSS propio', icon: 'brush', items: [
        { key: 'ui.customCss', type: 'textarea', default: '', label: 'CSS que se añade a todas las páginas de Roblox', placeholder: '.game-card-name { font-weight: 800; }' }
      ] }
    ]
  },

  // ======================= Juegos =======================
  {
    id: 'pins', group: 'games', title: 'Fijados', icon: 'pin', master: 'pinned.enabled', load: ['pins'],
    desc: 'Tus juegos a mano en el Inicio, el popup y PowerSearch, repartidos en carpetas.',
    cards: [
      { title: 'Opciones', icon: 'sliders', items: [
        { key: 'pinned.enabled', type: 'bool', default: true, label: 'Juegos fijados', help: 'Botón "Fijar" en la página de cada juego.' },
        { key: 'pinned.folders', type: 'bool', default: true, label: 'Carpetas' },
        { key: 'pinned.sort', type: 'select', default: 'manual', label: 'Orden', options: [['manual', 'El tuyo (el de la lista de abajo)'], ['name', 'Por nombre'], ['recent', 'Jugados hace menos']] },
        { key: 'pinned.showOnHome', type: 'bool', default: true, label: 'Fila de fijados en el Inicio original', help: 'Solo cuando el Inicio rediseñado está apagado.' }
      ] },
      { panel: 'panel-pin-folders', parent: 'pinned.folders' },
      { panel: 'panel-pin-list' }
    ]
  },
  {
    id: 'servers', group: 'games', title: 'Servidores', icon: 'server', master: 'servers.enabled',
    desc: 'Panel en la página de cada juego para filtrar servidores, ver su región y hacer server hop.',
    cards: [
      { title: 'Lista de servidores', icon: 'list', items: [
        { key: 'servers.enabled', type: 'bool', default: true, label: 'Panel de servidores avanzado' },
        { key: 'servers.autoSearch', type: 'bool', default: false, label: 'Buscar en cuanto abres el juego' },
        { key: 'servers.defaultSort', type: 'select', default: 'few', label: 'Orden inicial', options: [['few', 'Menos jugadores'], ['many', 'Más jugadores'], ['ping', 'Menor ping'], ['random', 'Aleatorio']] },
        { key: 'servers.maxPages', type: 'range', default: 10, min: 1, max: 100, unit: 'pág.', label: 'Páginas a revisar', help: 'Cada página son 100 servidores.' },
        { key: 'servers.listMax', type: 'range', default: 100, min: 10, max: 200, step: 10, label: 'Servidores en la lista' },
        { key: 'servers.columns', type: 'multi', default: ['players', 'ping', 'fps', 'region'], label: 'Columnas', options: [['players', 'Jugadores', 'users'], ['ping', 'Ping', 'signal'], ['fps', 'FPS', 'gauge'], ['region', 'Región', 'globe']] },
        { key: 'servers.copyLink', type: 'bool', default: true, label: 'Botón para copiar el enlace de un servidor', help: 'Para que un amigo entre justo en ese.' },
        { key: 'servers.hideNative', type: 'bool', default: false, label: 'Ocultar la lista de servidores de Roblox' }
      ] },
      { title: 'Región', icon: 'globe', items: [
        { key: 'servers.regionLookup', type: 'bool', default: true, label: 'Detectar la región de los servidores', help: 'Se consulta ipinfo.io solo con la IP del servidor, nunca con datos tuyos.' },
        { key: 'servers.preferredRegion', type: 'select', default: '', parent: 'servers.regionLookup', label: 'Región preferida',
          options: [['', 'Cualquiera'], ['us-va', 'Virginia (EE. UU.)'], ['us-east', 'EE. UU. Este'], ['us-central', 'EE. UU. Centro'], ['us-west', 'EE. UU. Oeste'], ['de', 'Frankfurt (Alemania)'], ['eu', 'Europa (cualquiera)'], ['sg', 'Singapur'], ['asia', 'Asia (cualquiera)'], ['br', 'Brasil'], ['au', 'Australia']] },
        { key: 'servers.autoRegion', type: 'bool', default: false, parent: 'servers.regionLookup', label: 'Mostrar la región sin tener que pulsar "ver"' },
        { key: 'servers.regionChecks', type: 'range', default: 60, min: 10, max: 200, step: 10, parent: 'servers.regionLookup', label: 'Servidores a comprobar como máximo' }
      ] },
      { title: 'Server hop y aleatorio', icon: 'shuffle', items: [
        { key: 'servers.hopMode', type: 'seg', default: 'random', label: 'Al hacer hop, ir a', options: [['random', 'Uno al azar'], ['few', 'El más vacío'], ['many', 'El más lleno']] },
        { key: 'servers.minFree', type: 'range', default: 1, min: 1, max: 50, label: 'Huecos libres mínimos' },
        { key: 'servers.maxPing', type: 'range', default: 0, min: 0, max: 1000, step: 10, unit: 'ms', zero: 'Sin límite', label: 'Ping máximo' },
        { key: 'servers.avoidRecent', type: 'range', default: 10, min: 0, max: 100, zero: 'Puede repetir', label: 'No repetir los últimos servidores' },
        { key: 'servers.autoHopMinutes', type: 'range', default: 0, min: 0, max: 120, unit: 'min', zero: 'Preguntar', label: 'Auto-hop cada', help: 'Se arranca y se para desde el panel del juego.' }
      ] }
    ]
  },
  {
    id: 'badges', group: 'games', title: 'Insignias', icon: 'award', master: 'badges.compact',
    desc: 'Tabla compacta con la rareza de cada insignia del juego y las que ya tienes.',
    cards: [
      { title: 'Tabla', icon: 'list', items: [
        { key: 'badges.compact', type: 'bool', default: true, label: 'Tabla de insignias' },
        { key: 'badges.sort', type: 'select', default: 'default', label: 'Orden', options: [['default', 'El del juego'], ['hard', 'Más difíciles primero'], ['easy', 'Más fáciles primero'], ['missing', 'Las que te faltan primero'], ['owned', 'Las que tienes primero'], ['name', 'Por nombre']] },
        { key: 'badges.columns', type: 'multi', default: ['rarity', 'yesterday', 'total', 'owned'], label: 'Columnas', options: [['rarity', 'Rareza', 'gauge'], ['yesterday', 'Ayer', 'calendar'], ['total', 'Total', 'users'], ['owned', 'La tienes', 'checkCircle']] },
        { key: 'badges.hideOwned', type: 'bool', default: false, label: 'Ocultar las que ya tienes' },
        { key: 'badges.hideNative', type: 'bool', default: true, label: 'Ocultar la lista de insignias de Roblox' }
      ] }
    ]
  },
  {
    id: 'discover', group: 'games', title: 'Descubrir y ocultos', icon: 'filter', master: 'discover.enabled', load: ['notes'],
    desc: 'Filtra las listas de juegos y oculta los juegos o creadores que no quieres ver.',
    cards: [
      { title: 'Filtros', icon: 'filter', items: [
        { key: 'discover.enabled', type: 'bool', default: true, label: 'Filtros de juegos' },
        { key: 'discover.minRating', type: 'range', default: 0, min: 0, max: 100, step: 5, unit: '%', zero: 'Ninguna', label: 'Valoración mínima' },
        { key: 'discover.blockWords', type: 'tags', default: [], label: 'Ocultar juegos con estas palabras', placeholder: 'Escribe una palabra y pulsa Intro' },
        { key: 'discover.applyHome', type: 'bool', default: true, label: 'Aplicar también en el Inicio rediseñado' }
      ] },
      { title: 'Botones', icon: 'ban', items: [
        { key: 'discover.blockButton', type: 'bool', default: true, label: 'Ocultar un juego desde su tarjeta', help: 'Sale al pasar el ratón.' },
        { key: 'discover.creatorButton', type: 'bool', default: true, label: 'Ocultar todos los juegos de un creador', help: 'Botón en la página del juego.' }
      ] },
      { title: 'Anuncios', icon: 'eyeOff', always: true, items: [
        { key: 'ui.hideSponsored', type: 'bool', default: true, label: 'Ocultar juegos patrocinados y anuncios' }
      ] },
      { panel: 'panel-hidden-games' },
      { panel: 'panel-hidden-creators' }
    ]
  },

  // ======================= Personas =======================
  {
    id: 'profiles', group: 'people', title: 'Perfiles', icon: 'user',
    desc: 'Información extra en el perfil de cada persona.',
    cards: [
      { title: 'Panel en los perfiles', icon: 'user', items: [
        { key: 'profile.inventoryValue', type: 'bool', default: true, label: 'Valor del inventario', help: 'RAP y valor de Rolimons de sus limiteds, si el inventario es público.' },
        { key: 'profile.inventoryTop', type: 'range', default: 3, min: 0, max: 10, zero: 'Ninguno', parent: 'profile.inventoryValue', label: 'Objetos más valiosos a mostrar' },
        { key: 'profile.mutualFriends', type: 'bool', default: true, label: 'Amigos en común' },
        { key: 'profile.mutualMax', type: 'range', default: 12, min: 4, max: 40, parent: 'profile.mutualFriends', label: 'Avatares a mostrar' },
        { key: 'profile.nameHistory', type: 'bool', default: true, label: 'Nombres anteriores' },
        { key: 'profile.collapsed', type: 'bool', default: false, label: 'Empezar plegado', help: 'Solo se ven los botones; el resto se abre con un clic.' }
      ] },
      { title: 'Última conexión', icon: 'clock', items: [
        { key: 'lastOnline.enabled', type: 'bool', default: true, label: 'Mostrar cuándo se conectó por última vez', help: 'Roblox ya no lo enseña: RoCer0 lo reconstruye con lo que va viendo.' },
        { key: 'lastOnline.format', type: 'seg', default: 'both', parent: 'lastOnline.enabled', label: 'Formato', options: [['both', 'Fecha y hace cuánto'], ['date', 'Fecha'], ['relative', 'Hace cuánto']] }
      ] }
    ]
  },
  {
    id: 'friends', group: 'people', title: 'Amigos', icon: 'users',
    desc: 'Seguimiento de tus amigos para el Inicio, las estadísticas, el Wrapped y los avisos.',
    cards: [
      { title: 'Seguimiento', icon: 'eye', items: [
        { key: 'social.trackFriends', type: 'bool', default: true, label: 'Registrar a qué juegan tus amigos', help: 'Consulta su estado cada pocos minutos mientras el navegador está abierto.' },
        { type: 'action', action: 'pollNow', icon: 'refresh', label: 'Consultar ahora', parent: 'social.trackFriends' }
      ] },
      { title: 'Favoritos', icon: 'star', items: [
        { key: 'friends.favorites', type: 'tags', default: [], label: 'Amigos favoritos', help: 'Nombre de usuario o ID. Salen primero en el Inicio y puedes recibir avisos solo de ellos.', placeholder: 'Nombre o ID y pulsa Intro' }
      ] },
      { title: 'Relacionado', icon: 'link', links: [['notifications', 'Avisos de amigos'], ['stats', 'A qué juegan tus amigos'], ['general', 'Cada cuánto se consulta'], ['trash', 'Papelera de amigos']] }
    ]
  },
  {
    id: 'trash', group: 'people', title: 'Papelera de amigos', icon: 'trash', master: 'trash.enabled',
    desc: 'Un botón con una papelera en el borde derecho de tu página de Amigos. Al pulsarlo eliges a quién quitar (de uno en uno, o manteniendo pulsado el ratón y arrastrando para coger a varios) y, cuando lo confirmas, se eliminan todos.',
    keywords: 'papelera borrar eliminar quitar amigos limpiar seleccionar varios arrastrar',
    cards: [
      { title: 'Papelera', icon: 'trash', items: [
        { key: 'trash.enabled', type: 'bool', default: true, label: 'Botón de la papelera en tu página de Amigos', help: 'Solo sale en tu propia lista de amigos, en la pestaña Amigos. Nunca en la de otra persona ni en las solicitudes.' }
      ] },
      { title: 'Cómo se usa', icon: 'info', text: 'Pulsa la papelera del borde derecho para entrar en el modo borrar. Haz clic en cada amigo que quieras quitar, o mantén pulsado el ratón y arrastra para coger a varios a la vez (con Mayús coges todos los que hay entre dos). Luego pulsa Eliminar: te enseña la lista y solo se eliminan si lo confirmas. Esc o la propia papelera salen sin borrar nada.' },
      { title: 'Relacionado', icon: 'link', links: [['friends', 'Amigos']] }
    ]
  },
  {
    id: 'notes', group: 'people', title: 'Notas', icon: 'note', master: 'notes.enabled', load: ['notes'],
    desc: 'Notas y etiquetas personales en juegos y perfiles. Solo las ves tú.',
    cards: [
      { title: 'Dónde', icon: 'sliders', items: [
        { key: 'notes.enabled', type: 'bool', default: true, label: 'Notas y etiquetas' },
        { key: 'notes.onGames', type: 'bool', default: true, label: 'En la página de los juegos' },
        { key: 'notes.onProfiles', type: 'bool', default: true, label: 'En los perfiles' },
        { key: 'notes.expanded', type: 'bool', default: true, label: 'Mostrar la nota abierta', help: 'Si lo apagas, la nota se abre con el botón "Nota".' }
      ] },
      { panel: 'panel-notes' }
    ]
  },
  {
    id: 'accounts', group: 'people', title: 'Cuentas', icon: 'key', master: 'accounts.enabled', load: ['accounts'],
    desc: 'Cambia entre tus cuentas de Roblox con un clic. Las sesiones se quedan en este navegador.',
    cards: [
      { panel: 'panel-accounts' },
      { title: 'Opciones', icon: 'sliders', items: [
        { key: 'accounts.enabled', type: 'bool', default: true, label: 'Selector de cuentas' },
        { key: 'accounts.navButton', type: 'bool', default: true, label: 'Botón en la barra de Roblox' },
        { key: 'accounts.confirm', type: 'bool', default: false, label: 'Pedir confirmación antes de cambiar' },
        { key: 'accounts.reloadTabs', type: 'bool', default: true, label: 'Recargar las pestañas de Roblox al cambiar' }
      ] }
    ]
  },

  // ======================= Catálogo y Robux =======================
  {
    id: 'catalog', group: 'shop', title: 'Catálogo y avatar', icon: 'shirt',
    desc: 'Vista previa rápida, herramientas en los objetos, accesorios sin límite y trajes.',
    cards: [
      { title: 'Vista previa rápida', icon: 'eye', items: [
        { key: 'catalog.quickView', type: 'bool', default: true, label: 'Botón de vista previa en cada objeto del catálogo' },
        { key: 'catalog.quickTryOn', type: 'bool', default: true, parent: 'catalog.quickView', label: 'Probártelo al abrirla' }
      ] },
      { title: 'Página de un objeto', icon: 'box', items: [
        { key: 'items.buttons', type: 'bool', default: true, label: 'Botones de herramientas' },
        { key: 'items.buttonList', type: 'multi', default: ['explorer', 'content', 'download', 'owners'], parent: 'items.buttons', label: 'Botones',
          options: [['explorer', 'Explorador', 'compass'], ['content', 'Contenido', 'layers'], ['download', 'Descargar', 'download'], ['owners', 'Propietarios', 'users']] },
        { key: 'items.limitedOnly', type: 'bool', default: false, parent: 'items.buttons', label: 'Solo en objetos limitados' },
        { key: 'items.rolimonsLink', type: 'bool', default: true, label: 'Valor y enlace de Rolimons en los limitados' }
      ] },
      { title: 'Editor de avatar', icon: 'hat', items: [
        { key: 'avatar.unlimited', type: 'bool', default: true, label: 'Equipar accesorios sin el límite del editor', help: 'Roblox puede rechazar combinaciones que su servidor no permita.' }
      ] },
      { title: 'Trajes', icon: 'shirt', items: [
        { key: 'outfits.enabled', type: 'bool', default: true, label: 'Cambiador rápido de trajes en el popup' },
        { key: 'outfits.showRoblox', type: 'bool', default: true, parent: 'outfits.enabled', label: 'Tus trajes de Roblox' },
        { key: 'outfits.showLooks', type: 'bool', default: true, parent: 'outfits.enabled', label: 'Looks guardados con RoCer0' },
        { key: 'outfits.confirm', type: 'bool', default: false, parent: 'outfits.enabled', label: 'Confirmar antes de ponerte uno' }
      ] }
    ]
  },
  {
    id: 'wishlist', group: 'shop', title: 'Lista de deseos', icon: 'bookmark', master: 'wishlist.enabled', load: ['wishlist'],
    desc: 'Sigue el precio de objetos del catálogo y recibe un aviso cuando te interesa.',
    cards: [
      { panel: 'panel-wishlist' },
      { title: 'Avisos', icon: 'bell', items: [
        { key: 'wishlist.enabled', type: 'bool', default: true, label: 'Lista de deseos', help: 'Botón "Seguir precio" en cada objeto del catálogo.' },
        { key: 'wishlist.checkMinutes', type: 'range', default: 15, min: 5, max: 240, step: 5, unit: 'min', label: 'Comprobar precios cada' },
        { key: 'wishlist.alertDrop', type: 'bool', default: true, label: 'Cuando baja de precio' },
        { key: 'wishlist.minDrop', type: 'range', default: 0, min: 0, max: 90, step: 5, unit: '%', zero: 'Cualquier bajada', parent: 'wishlist.alertDrop', label: 'Bajada mínima' },
        { key: 'wishlist.alertTarget', type: 'bool', default: true, label: 'Cuando llega a tu precio objetivo' },
        { key: 'wishlist.alertBack', type: 'bool', default: true, label: 'Cuando vuelve a estar a la venta' }
      ] }
    ]
  },
  {
    id: 'trades', group: 'shop', title: 'Intercambios', icon: 'swap', master: 'trade.enabled', load: ['calc'],
    desc: 'Valores de Rolimons en tus intercambios, calculadora y avisos de trades nuevos.',
    keywords: 'calculadora trade rolimons valor rap demanda',
    cards: [
      { panel: 'panel-calc' },
      { title: 'En roblox.com', icon: 'swap', items: [
        { key: 'trade.enabled', type: 'bool', default: true, label: 'Herramientas de intercambio' },
        { key: 'trade.annotate', type: 'bool', default: true, label: 'Valor sobre cada objeto en los intercambios' },
        { key: 'trade.floatButton', type: 'bool', default: true, label: 'Botón flotante de la calculadora' }
      ] },
      { title: 'Valores', icon: 'trend', always: true, items: [
        { key: 'trade.useValue', type: 'seg', default: 'value', label: 'Calcular con', help: 'También para el valor del inventario en los perfiles.', options: [['value', 'Valor (o RAP)'], ['rap', 'RAP']] }
      ] },
      { title: 'Avisos de trades', icon: 'bell', always: true, items: [
        { key: 'trade.notifyInbound', type: 'bool', default: true, label: 'Avisar de los trades que te llegan', help: 'Con lo que ganas o pierdes ya calculado.' },
        { key: 'trade.notifyOnlyWins', type: 'bool', default: false, parent: 'trade.notifyInbound', label: 'Solo si te salen a cuenta' },
        { key: 'trade.notifyMinPct', type: 'range', default: 0, min: 0, max: 100, step: 5, unit: '%', zero: 'Cualquier ganancia', parent: 'trade.notifyOnlyWins', label: 'Ganancia mínima' }
      ] }
    ]
  },
  {
    id: 'money', group: 'shop', title: 'Robux y dinero', icon: 'money', master: 'money.enabled',
    desc: 'El precio en dinero real junto a los Robux, en cualquier moneda del mundo.',
    keywords: 'moneda euro dólar peso cambio devex precio',
    cards: [
      { title: 'Moneda', icon: 'money', items: [
        { key: 'money.enabled', type: 'bool', default: true, label: 'Precio en dinero real' },
        { key: 'money.currency', type: 'select', default: 'EUR', label: 'Moneda', options: rcCurrencyOptions },
        { key: 'money.symbol', type: 'text', default: '', max: 6, parent: ['money.currency', 'custom'], label: 'Símbolo de tu moneda' },
        { key: 'money.basis', type: 'seg', default: 'buy', label: 'Calcular con', options: [['buy', 'Precio de compra'], ['devex', 'DevEx']], help: 'Precio de compra: lo que cuestan los Robux. DevEx: lo que cobra un creador al cambiarlos.' },
        { key: 'money.per100', type: 'number', default: 0, min: 0, max: 100000000, step: 'any', empty: 'Automático', label: 'Valor de 100 R$ en tu moneda', help: 'Vacío: 400 R$ = 4,99 en dólares, euros o libras, y en otras monedas con el cambio del día.' }
      ] },
      { title: 'Cómo se ve', icon: 'eye', items: [
        { key: 'money.style', type: 'seg', default: 'approx', label: 'Formato', options: [['approx', '≈ 4,99 €'], ['paren', '(4,99 €)'], ['plain', '4,99 €']] },
        { key: 'money.decimals', type: 'seg', default: 'auto', label: 'Decimales', options: [['auto', 'Automático'], ['0', 'Ninguno'], ['2', 'Dos']] },
        { key: 'money.hover', type: 'bool', default: false, label: 'Mostrarlo solo al pasar el ratón' }
      ] },
      { title: 'Cambio de moneda', icon: 'refresh', items: [
        { type: 'action', action: 'fxRefresh', icon: 'refresh', label: 'Actualizar el cambio ahora', help: 'Se actualiza solo cada 12 horas (tipos de open.er-api.com).' }
      ] }
    ]
  },

  // ======================= Tu actividad =======================
  {
    id: 'challenges', group: 'activity', title: 'Retos', icon: 'target', master: 'fun.challenges', load: ['challenges'],
    desc: 'Retos diarios con rachas y medallas. Salen en el Inicio, en el popup y aquí.',
    cards: [
      { panel: 'panel-ch-today' },
      { title: 'Retos del día', icon: 'target', items: [
        { key: 'fun.challenges', type: 'bool', default: true, label: 'Retos diarios' },
        { key: 'challenges.count', type: 'seg', default: 3, label: 'Retos al día', options: [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']] },
        { key: 'challenges.difficulty', type: 'seg', default: 'normal', label: 'Dificultad', options: [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']] },
        { key: 'challenges.pool', type: 'multi', min: 1, label: 'Retos que pueden salir', help: 'Los cambios se aplican hoy si aún no has completado ninguno; si no, mañana.',
          default: RC_CHALLENGES.map(function (c) { return c.id; }), options: RC_CHALLENGES.map(function (c) { return [c.id, c.short]; }) },
        { type: 'action', action: 'reroll', icon: 'dice', label: 'Cambiar los retos de hoy', help: 'Una vez al día. Los que ya has completado se quedan.' }
      ] },
      { title: 'Avisos', icon: 'bell', items: [
        { key: 'challenges.notify', type: 'bool', default: true, label: 'Notificación al completar los del día' },
        { key: 'challenges.notifyMedals', type: 'bool', default: true, label: 'Notificación al ganar una medalla' }
      ] },
      { panel: 'panel-ch-medals' },
      { panel: 'panel-ch-calendar' }
    ]
  },
  {
    id: 'wrapped', group: 'activity', title: 'Wrapped', icon: 'gift', load: ['wrapped'],
    desc: 'Tu mes en Roblox y una tarjeta para compartir con los colores de tu tema.',
    cards: [
      { panel: 'panel-wrapped-head' },
      { panel: 'panel-wrapped-card' },
      { title: 'Personalizar la tarjeta', icon: 'brush', items: [
        { key: 'wrapped.format', type: 'seg', default: 'wide', label: 'Formato', options: [['wide', 'Horizontal'], ['square', 'Cuadrada'], ['story', 'Historia']] },
        { key: 'wrapped.title', type: 'text', default: 'RoCer0 Wrapped', max: 40, label: 'Título' },
        { key: 'wrapped.showName', type: 'bool', default: true, label: 'Tu nombre' },
        { key: 'wrapped.showAvatar', type: 'bool', default: true, label: 'Tu avatar' },
        { key: 'wrapped.stats', type: 'multi', max: 4, default: ['games', 'days', 'badges', 'challenges'], label: 'Datos de la tarjeta', help: 'Hasta cuatro.',
          options: [['games', 'Juegos distintos'], ['days', 'Días con partida'], ['badges', 'Insignias'], ['challenges', 'Retos completados'], ['newGames', 'Juegos nuevos'], ['perfect', 'Días perfectos'], ['site', 'Tiempo en roblox.com'], ['robux', 'Robux de diferencia']] },
        { key: 'wrapped.topGames', type: 'range', default: 3, min: 0, max: 5, zero: 'Ninguno', label: 'Juegos del mes en la tarjeta' },
        { key: 'wrapped.friend', type: 'bool', default: true, label: 'Con quién más jugaste' },
        { key: 'wrapped.colors', type: 'seg', default: 'theme', label: 'Colores', options: [['theme', 'Los del tema'], ['custom', 'Elegidos']] },
        { key: 'wrapped.color1', type: 'color', default: '#3b82f6', parent: ['wrapped.colors', 'custom'], label: 'Color principal' },
        { key: 'wrapped.color2', type: 'color', default: '#8b5cf6', parent: ['wrapped.colors', 'custom'], label: 'Color secundario' },
        { key: 'wrapped.footer', type: 'bool', default: true, label: 'Pie "Hecho con RoCer0"' }
      ] },
      { panel: 'panel-wrapped-body' }
    ]
  },
  {
    id: 'stats', group: 'activity', title: 'Estadísticas', icon: 'chart', load: ['stats'],
    desc: 'Tu tiempo en Roblox, tu saldo de Robux y a qué juegan tus amigos.',
    cards: [
      { panel: 'panel-stats-time' },
      { panel: 'panel-stats-robux' },
      { panel: 'panel-stats-games' },
      { panel: 'panel-stats-friends' },
      { panel: 'panel-stats-seen' },
      { title: 'Qué se registra', icon: 'save', items: [
        { key: 'home.trackPlaytime', type: 'bool', default: true, label: 'Tu tiempo en cada juego', help: 'Para el Inicio, los retos, los descansos y el Wrapped.' },
        { key: 'social.trackTime', type: 'bool', default: true, label: 'Tu tiempo en roblox.com' },
        { key: 'robux.track', type: 'bool', default: true, label: 'Tu saldo de Robux' },
        { key: 'robux.minutes', type: 'range', default: 30, min: 15, max: 240, step: 15, unit: 'min', parent: 'robux.track', label: 'Apuntar el saldo cada' }
      ] },
      { title: 'Gráficos', icon: 'chart', items: [
        { key: 'stats.days', type: 'seg', default: 14, label: 'Tiempo en roblox.com', options: [[7, '7 días'], [14, '14 días'], [30, '30 días']] },
        { key: 'stats.robuxDays', type: 'seg', default: 90, label: 'Saldo de Robux', options: [[30, '30 días'], [90, '90 días'], [365, '1 año'], [0, 'Todo']] },
        { key: 'stats.gamesDays', type: 'seg', default: 30, label: 'Tu tiempo de juego', options: [[7, '7 días'], [30, '30 días'], [90, '90 días'], [0, 'Todo']] },
        { key: 'stats.gamesCount', type: 'range', default: 15, min: 5, max: 50, step: 5, label: 'Juegos en tu lista' },
        { key: 'social.statsDays', type: 'seg', default: 7, label: 'Juegos de tus amigos', options: [[7, '7 días'], [14, '14 días'], [30, '30 días']] },
        { key: 'social.lastSeenCount', type: 'range', default: 50, min: 10, max: 200, step: 10, label: 'Amigos en "Última conexión"' }
      ] }
    ]
  },
  {
    id: 'wellbeing', group: 'activity', title: 'Descansos', icon: 'coffee',
    desc: 'Recordatorios para descansar y un límite de juego al día.',
    cards: [
      { title: 'Descansos', icon: 'coffee', items: [
        { key: 'wellbeing.breakMinutes', type: 'range', default: 0, min: 0, max: 240, step: 5, unit: 'min', zero: 'Nunca', label: 'Recordarme descansar tras jugar' },
        { key: 'wellbeing.repeat', type: 'bool', default: true, parent: 'wellbeing.breakMinutes', label: 'Repetirlo si sigo jugando' },
        { key: 'wellbeing.gap', type: 'range', default: 10, min: 5, max: 60, step: 5, unit: 'min', parent: 'wellbeing.breakMinutes', label: 'Pausa que cuenta como descanso', help: 'Si dejas de jugar este rato, la cuenta empieza de cero.' },
        { key: 'wellbeing.message', type: 'text', default: '', max: 140, parent: 'wellbeing.breakMinutes', label: 'Mensaje', placeholder: 'Levántate, estira un poco y bebe agua.' }
      ] },
      { title: 'Límite diario', icon: 'timer', items: [
        { key: 'wellbeing.dailyLimit', type: 'range', default: 0, min: 0, max: 720, step: 15, unit: 'min', zero: 'Sin límite', label: 'Avisarme al pasar de' }
      ] },
      { title: 'Cómo avisa', icon: 'bell', items: [
        { key: 'wellbeing.inPage', type: 'bool', default: true, label: 'Aviso también dentro de roblox.com', help: 'Además de la notificación del sistema.' }
      ] }
    ]
  },
  {
    id: 'fun', group: 'activity', title: 'Ruleta y confeti', icon: 'sparkles',
    desc: 'Una ruleta para cuando no sabes a qué jugar y confeti cuando pasa algo bueno.',
    cards: [
      { title: 'Ruleta de juegos', icon: 'roulette', items: [
        { key: 'fun.roulette', type: 'bool', default: true, label: 'Ruleta de juegos', help: 'En el Inicio y en el popup.' },
        { key: 'fun.rouletteSource', type: 'select', default: 'pins', parent: 'fun.roulette', label: 'Empezar con', options: [['pins', 'Tus fijados'], ['favs', 'Tus favoritos'], ['recent', 'Tus recientes'], ['popular', 'Populares']] },
        { key: 'fun.rouletteMax', type: 'range', default: 16, min: 4, max: 24, parent: 'fun.roulette', label: 'Juegos en la ruleta' },
        { key: 'fun.rouletteSpin', type: 'seg', default: 'normal', parent: 'fun.roulette', label: 'Giro', options: [['fast', 'Rápido'], ['normal', 'Normal'], ['slow', 'Lento']] },
        { key: 'fun.rouletteHidden', type: 'bool', default: true, parent: 'fun.roulette', label: 'Saltarse los juegos ocultos' },
        { key: 'fun.rouletteAutoPlay', type: 'bool', default: false, parent: 'fun.roulette', label: 'Entrar al juego en cuanto pare' }
      ] },
      { title: 'Confeti', icon: 'sparkles', items: [
        { key: 'fun.confetti', type: 'bool', default: true, label: 'Confeti' },
        { key: 'fun.confettiEvents', type: 'multi', default: ['badge', 'challenge', 'challenges', 'medal', 'trade', 'roulette'], parent: 'fun.confetti', label: 'Cuándo',
          options: [['badge', 'Insignia nueva', 'award'], ['challenge', 'Reto completado', 'target'], ['challenges', 'Todos los del día', 'trophy'], ['medal', 'Medalla nueva', 'medal'], ['trade', 'Buen trade', 'swap'], ['roulette', 'Ruleta', 'roulette']] },
        { key: 'fun.confettiAmount', type: 'range', default: 170, min: 40, max: 400, step: 10, parent: 'fun.confetti', label: 'Cantidad' },
        { key: 'fun.confettiDuration', type: 'range', default: 3.5, min: 1.5, max: 8, step: 0.5, unit: 's', parent: 'fun.confetti', label: 'Duración' },
        { key: 'fun.confettiColors', type: 'seg', default: 'theme', parent: 'fun.confetti', label: 'Colores', options: [['theme', 'Del tema'], ['rainbow', 'Arcoíris'], ['gold', 'Dorado']] },
        { type: 'action', action: 'confettiTest', icon: 'sparkles', label: 'Probar el confeti', parent: 'fun.confetti' }
      ] }
    ]
  },

  // ======================= Herramientas =======================
  {
    id: 'search', group: 'tools', title: 'PowerSearch', icon: 'search', master: 'powerSearch.enabled',
    desc: 'Buscador rápido de juegos, personas, objetos y grupos desde cualquier página de Roblox.',
    cards: [
      { title: 'Atajo', icon: 'key', items: [
        { key: 'powerSearch.enabled', type: 'bool', default: true, label: 'PowerSearch' },
        { key: 'powerSearch.hotkey', type: 'hotkey', default: 'Ctrl+K', label: 'Abrir con', help: 'También desde el botón de la lupa del popup.' }
      ] },
      { title: 'Qué busca', icon: 'search', items: [
        { type: 'flags', label: 'Buscar en', options: [['powerSearch.pins', 'Tus fijados', 'pin'], ['powerSearch.games', 'Juegos', 'gamepad'], ['powerSearch.users', 'Personas', 'users'], ['powerSearch.catalog', 'Catálogo', 'shirt'], ['powerSearch.groups', 'Grupos', 'flag']] },
        { key: 'powerSearch.pins', type: 'hidden', default: true },
        { key: 'powerSearch.games', type: 'hidden', default: true },
        { key: 'powerSearch.users', type: 'hidden', default: true },
        { key: 'powerSearch.catalog', type: 'hidden', default: true },
        { key: 'powerSearch.groups', type: 'hidden', default: false },
        { key: 'powerSearch.perGroup', type: 'range', default: 8, min: 3, max: 15, label: 'Resultados de cada tipo' }
      ] },
      { title: 'Resultados', icon: 'list', items: [
        { key: 'powerSearch.playButton', type: 'bool', default: true, label: 'Botón "Jugar" en los juegos' },
        { key: 'powerSearch.newTab', type: 'bool', default: false, label: 'Abrirlos en una pestaña nueva' },
        { key: 'powerSearch.history', type: 'bool', default: true, label: 'Recordar tus búsquedas recientes' },
        { type: 'action', action: 'clearSearchHistory', icon: 'trash', label: 'Borrar las búsquedas recientes', parent: 'powerSearch.history' }
      ] }
    ]
  },
  {
    id: 'ids', group: 'tools', title: 'Copiar IDs', icon: 'hash', master: 'ids.enabled',
    desc: 'Botones para copiar el ID de juegos, objetos, personas, grupos e insignias.',
    cards: [
      { title: 'Opciones', icon: 'hash', items: [
        { key: 'ids.enabled', type: 'bool', default: true, label: 'Botones para copiar IDs' },
        { key: 'ids.where', type: 'multi', default: ['games', 'profiles', 'items', 'groups', 'badges'], label: 'Dónde', options: [['games', 'Juegos', 'gamepad'], ['profiles', 'Perfiles', 'user'], ['items', 'Objetos', 'box'], ['groups', 'Grupos', 'flag'], ['badges', 'Insignias', 'award']] },
        { key: 'ids.copyAs', type: 'seg', default: 'id', label: 'Al pulsar, copiar', options: [['id', 'El número'], ['link', 'El enlace']] },
        { key: 'ids.extra', type: 'bool', default: true, label: 'Mostrar también el ID del juego y del creador', help: 'En la página de un juego, además del ID del lugar.' }
      ] }
    ]
  },
  {
    id: 'streamer', group: 'tools', title: 'Modo streamer', icon: 'video', master: 'streamer.enabled',
    desc: 'Oculta tu información privada cuando haces directo o grabas.',
    cards: [
      { title: 'Qué se oculta', icon: 'eyeOff', items: [
        { key: 'streamer.enabled', type: 'bool', default: false, label: 'Modo streamer' },
        { key: 'streamer.hideName', type: 'bool', default: true, label: 'Tu nombre' },
        { key: 'streamer.replacement', type: 'text', default: 'Streamer', max: 30, parent: 'streamer.hideName', label: 'Texto en su lugar' },
        { key: 'streamer.hideAvatar', type: 'bool', default: true, label: 'Tu avatar' },
        { key: 'streamer.hideRobux', type: 'bool', default: true, label: 'Tus Robux' },
        { key: 'streamer.hideFriends', type: 'bool', default: false, label: 'Nombres y avatares de tus amigos' },
        { key: 'streamer.hideMessages', type: 'bool', default: true, label: 'Chat y mensajes' }
      ] },
      { title: 'Cómo se ve', icon: 'eye', items: [
        { key: 'streamer.blur', type: 'range', default: 8, min: 2, max: 20, unit: 'px', label: 'Difuminado' },
        { key: 'streamer.badge', type: 'bool', default: true, label: 'Aviso "Modo streamer" en una esquina' }
      ] },
      { title: 'Atajo', icon: 'key', always: true, items: [
        { key: 'streamer.hotkey', type: 'hotkey', default: '', label: 'Encender y apagar con', help: 'En cualquier página de Roblox. Vacío: sin atajo.' }
      ] }
    ]
  },
  {
    id: 'perf', group: 'tools', title: 'FPS y ping', icon: 'gauge', master: 'perf.overlay',
    desc: 'Contador de FPS del navegador y ping hacia Roblox. Los FPS dentro del juego los mide Roblox (Shift+F5).',
    cards: [
      { title: 'Contador', icon: 'gauge', items: [
        { key: 'perf.overlay', type: 'bool', default: false, label: 'Contador de FPS y ping' },
        { key: 'perf.show', type: 'multi', min: 1, default: ['fps', 'ping'], label: 'Mostrar', options: [['fps', 'FPS', 'gauge'], ['ping', 'Ping', 'signal']] },
        { key: 'perf.position', type: 'select', default: 'bottom-right', label: 'Posición', options: [['top-left', 'Arriba a la izquierda'], ['top-right', 'Arriba a la derecha'], ['bottom-left', 'Abajo a la izquierda'], ['bottom-right', 'Abajo a la derecha']] },
        { key: 'perf.size', type: 'seg', default: 'normal', label: 'Tamaño', options: [['small', 'Pequeño'], ['normal', 'Normal'], ['big', 'Grande']] },
        { key: 'perf.opacity', type: 'range', default: 100, min: 30, max: 100, step: 5, unit: '%', label: 'Opacidad' },
        { key: 'perf.colors', type: 'bool', default: true, label: 'Color según el valor', help: 'Verde si va bien, amarillo regular, rojo mal.' },
        { key: 'perf.pingInterval', type: 'range', default: 5, min: 2, max: 60, unit: 's', label: 'Medir el ping cada' }
      ] }
    ]
  },
  {
    id: 'plugins', group: 'tools', title: 'Detector de plugins', icon: 'shield', master: 'plugins.enabled',
    desc: 'Revisa plugins y modelos de la tienda de creadores en busca de señales de malware.',
    cards: [
      { title: 'Análisis', icon: 'shield', items: [
        { key: 'plugins.enabled', type: 'bool', default: true, label: 'Detector de plugins falsos o inseguros' },
        { key: 'plugins.models', type: 'bool', default: true, label: 'Revisar también los modelos' },
        { key: 'plugins.scanCode', type: 'bool', default: true, label: 'Descargar y revisar el código', help: 'Busca require() ocultos, getfenv, loadstring y otros trucos típicos.' },
        { key: 'plugins.hideSafe', type: 'bool', default: false, label: 'No mostrar nada si parece seguro' }
      ] }
    ]
  },

  // ======================= RoCer0 =======================
  {
    id: 'notifications', group: 'app', title: 'Notificaciones', icon: 'bell', master: 'notify.all',
    desc: 'Los avisos de RoCer0 en un sitio, con horario de silencio.',
    cards: [
      { title: 'Amigos', icon: 'users', items: [
        { key: 'notify.all', type: 'bool', default: true, label: 'Notificaciones de RoCer0' },
        { key: 'notify.enabled', type: 'bool', default: false, label: 'Avisos de amigos' },
        { key: 'notify.friendOnline', type: 'bool', default: false, parent: 'notify.enabled', label: 'Cuando un amigo se conecta' },
        { key: 'notify.friendJoinsGame', type: 'bool', default: true, parent: 'notify.enabled', label: 'Cuando un amigo entra en un juego' },
        { key: 'notify.pinnedOnly', type: 'bool', default: false, parent: 'notify.friendJoinsGame', label: 'Solo si entra en uno de tus juegos fijados' },
        { key: 'notify.groupUp', type: 'range', default: 3, min: 0, max: 20, zero: 'Nunca', parent: 'notify.enabled', label: 'Cuando juegan juntos al menos', unit: 'amigos' },
        { key: 'notify.favoritesOnly', type: 'bool', default: false, parent: 'notify.enabled', label: 'Solo de tus amigos favoritos', help: 'Se eligen en Personas, Amigos.' }
      ] },
      { title: 'Más avisos', icon: 'bell', items: [
        { key: 'notify.badges', type: 'bool', default: false, label: 'Cuando consigues una insignia' }
      ] },
      { title: 'Avisos de otras secciones', icon: 'link', links: [['trades', 'Trades nuevos'], ['wishlist', 'Lista de deseos'], ['challenges', 'Retos'], ['wellbeing', 'Descansos']] },
      { title: 'Horario de silencio', icon: 'moon', items: [
        { key: 'notify.quiet', type: 'bool', default: false, label: 'No avisar a ciertas horas' },
        { key: 'notify.quietFrom', type: 'time', default: '23:00', parent: 'notify.quiet', label: 'Desde' },
        { key: 'notify.quietTo', type: 'time', default: '08:00', parent: 'notify.quiet', label: 'Hasta' }
      ] },
      { title: 'Prueba', icon: 'check', items: [
        { type: 'action', action: 'notifyTest', icon: 'bell', label: 'Enviar una notificación de prueba' }
      ] }
    ]
  },
  {
    id: 'popup', group: 'app', title: 'Popup', icon: 'menu',
    desc: 'El panel que se abre con el botón de RoCer0 en la barra del navegador.',
    cards: [
      { title: 'Tarjetas', icon: 'grid', items: [
        { key: 'popup.order', type: 'order', label: 'Orden y tarjetas visibles', help: 'Arrastra para ordenar y apaga las que no uses.',
          default: ['challenges', 'game', 'outfits', 'pins', 'theme', 'quick', 'accounts', 'links'],
          options: [
            ['challenges', 'Retos de hoy', 'target', 'popup.challenges'], ['game', 'Partida y server hop', 'gamepad', 'popup.game'],
            ['outfits', 'Trajes', 'shirt', 'popup.outfits'], ['pins', 'Juegos fijados', 'pin', 'popup.pins'],
            ['theme', 'Tema', 'palette', 'popup.theme'], ['quick', 'Interruptores rápidos', 'sliders', 'popup.quick'],
            ['accounts', 'Cuentas', 'key', 'popup.accounts'], ['links', 'Accesos directos', 'link', 'popup.links']
          ] },
        { key: 'popup.challenges', type: 'hidden', default: true },
        { key: 'popup.game', type: 'hidden', default: true },
        { key: 'popup.outfits', type: 'hidden', default: true },
        { key: 'popup.pins', type: 'hidden', default: true },
        { key: 'popup.theme', type: 'hidden', default: true },
        { key: 'popup.quick', type: 'hidden', default: true },
        { key: 'popup.accounts', type: 'hidden', default: true },
        { key: 'popup.links', type: 'hidden', default: true }
      ] },
      { title: 'Opciones', icon: 'sliders', items: [
        { key: 'popup.width', type: 'seg', default: 'normal', label: 'Ancho', options: [['narrow', 'Estrecho'], ['normal', 'Normal'], ['wide', 'Ancho']] },
        { key: 'popup.compact', type: 'bool', default: false, label: 'Tarjetas compactas' },
        { key: 'popup.pinsMax', type: 'range', default: 8, min: 3, max: 30, parent: 'popup.pins', label: 'Fijados a mostrar' },
        { key: 'popup.quickList', type: 'multi', default: ['streamer', 'perf'], parent: 'popup.quick', label: 'Interruptores',
          options: [['streamer', 'Modo streamer', 'video'], ['perf', 'FPS y ping', 'gauge'], ['theme', 'Tema en Roblox', 'palette'], ['home', 'Inicio rediseñado', 'home'], ['notify', 'Notificaciones', 'bell']] }
      ] }
    ]
  },
  {
    id: 'general', group: 'app', title: 'General', icon: 'sliders',
    desc: 'Cómo se abren estos ajustes y cada cuánto consulta RoCer0 a Roblox.',
    cards: [
      { title: 'Estos ajustes', icon: 'gear', items: [
        { key: 'nav.settingsTab', type: 'bool', default: true, label: 'Dentro de los Ajustes de Roblox', help: 'Pestaña RoCer0 en Ajustes de roblox.com y en el menú de la rueda dentada. Si lo apagas, se abren en una página aparte.' },
        { key: 'opts.start', type: 'select', default: 'last', label: 'Al abrirlos, ir a', options: function () { return [['last', 'La última sección que abriste']].concat(RX_SECTIONS.map(function (x) { return [x.id, x.title]; })); } },
        { key: 'opts.density', type: 'seg', default: 'comfortable', label: 'Densidad', options: [['comfortable', 'Cómoda'], ['compact', 'Compacta']] }
      ] },
      { title: 'Consultas a Roblox', icon: 'refresh', items: [
        { key: 'social.pollMinutes', type: 'range', default: 2, min: 1, max: 30, unit: 'min', label: 'Consultar cada', help: 'Para tus amigos, el tiempo de juego, los retos y los descansos. Con menos minutos, los datos van más al día.' }
      ] },
      { panel: 'panel-about' }
    ]
  },
  {
    id: 'data', group: 'app', title: 'Permisos y datos', icon: 'lock', load: ['data'],
    desc: 'Permisos, copia de seguridad y borrado de lo que RoCer0 guarda en este navegador.',
    keywords: 'exportar importar copia seguridad restablecer borrar permisos privacidad',
    cards: [{ panel: 'panel-perms' }, { panel: 'panel-backup' }, { panel: 'panel-erase' }]
  }
];

// Ajustes que no salen en ninguna sección (los gestiona su propia pantalla).
var RX_HIDDEN = [
  { key: 'rc.version', default: 100 },
  { key: 'theme.id', default: 'medianoche' },
  { key: 'theme.overrides', default: {} },
  { key: 'theme.custom', default: [] },
  { key: 'theme.auto', default: 'off' },
  { key: 'theme.dayTheme', default: 'claro' },
  { key: 'theme.nightTheme', default: 'medianoche' },
  { key: 'theme.dayStart', default: '08:00' },
  { key: 'theme.nightStart', default: '20:00' },
  { key: 'icons.style', default: 'theme' },
  { key: 'icons.scale', default: 100 },
  { key: 'icons.color', default: '' },
  { key: 'icons.roblox', default: true }
];

// Todas las opciones con clave (también las ocultas), con su sección y tarjeta.
function rxAllItems() {
  var out = [];
  RX_SECTIONS.forEach(function (sec) {
    (sec.cards || []).forEach(function (card) {
      (card.items || []).forEach(function (it) { if (it.key) out.push({ item: it, section: sec, card: card }); });
    });
  });
  RX_HIDDEN.forEach(function (it) { out.push({ item: { key: it.key, type: 'hidden', default: it.default }, section: null, card: null }); });
  return out;
}

var RX_DEFAULTS = (function () {
  var d = {};
  rxAllItems().forEach(function (x) { if (!(x.item.key in d)) d[x.item.key] = x.item.default; });
  return d;
})();

// Ajustes guardados por versiones anteriores a la 1.0.
var RX_VERSION = 100;
function rxMigrate(stored) {
  var s = Object.assign({}, stored);
  var v = Number(s['rc.version']) || 0;
  if (v < 100) {
    // Silencio: antes bastaba con rellenar las dos horas.
    if (!('notify.quiet' in s)) {
      var a = String(s['notify.quietFrom'] || '').trim(), b = String(s['notify.quietTo'] || '').trim();
      if (/^\d{1,2}:\d{2}$/.test(a) && /^\d{1,2}:\d{2}$/.test(b)) {
        s['notify.quiet'] = true;
        s['notify.quietFrom'] = a.padStart(5, '0');
        s['notify.quietTo'] = b.padStart(5, '0');
      } else { delete s['notify.quietFrom']; delete s['notify.quietTo']; }
    }
    // "Solo estos amigos" de los avisos pasa a ser la lista de amigos favoritos.
    if (!('friends.favorites' in s) && s['notify.favoriteFriends']) {
      var list = String(s['notify.favoriteFriends']).split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 200);
      if (list.length) { s['friends.favorites'] = list; s['notify.favoritesOnly'] = true; }
    }
    // Los patrocinados solo se ocultaban con los retoques de interfaz encendidos.
    if (s['ui.enabled'] === false) s['ui.hideSponsored'] = false;
  }
  s['rc.version'] = RX_VERSION;
  return s;
}

// Mezcla lo guardado con los valores por defecto (descarta claves desconocidas y tipos que no encajan).
// Clases de <html> que ocultan o difuminan partes de Roblox (interfaz y modo streamer).
// Las pone theme-boot.js al empezar a cargar (para que no se vean ni un instante) y las mantiene ui.js.
var RX_UI_HIDE_KEYS = ['chat', 'robux', 'create', 'notifications', 'age', 'footer'];
var RX_UI_SIDE_KEYS = ['profile', 'messages', 'friends', 'avatar', 'inventory', 'trades', 'groups', 'blog', 'store', 'giftcards', 'premium'];
function rxPageClasses(s) {
  var ui = !!s['ui.enabled'], st = !!s['streamer.enabled'];
  var hide = ui && Array.isArray(s['ui.hide']) ? s['ui.hide'] : [];
  var side = ui && Array.isArray(s['ui.hideSide']) ? s['ui.hideSide'] : [];
  var c = {
    'rx-ui-wide': ui && !!s['ui.wideLayout'],
    'rx-ui-compact': ui && !!s['ui.compactCards'],
    'rx-hide-sponsored': !!s['ui.hideSponsored'],
    'rx-streamer': st,
    'rx-streamer-avatar': st && !!s['streamer.hideAvatar'],
    'rx-streamer-robux': st && !!s['streamer.hideRobux'],
    'rx-streamer-friends': st && !!s['streamer.hideFriends'],
    'rx-streamer-messages': st && !!s['streamer.hideMessages']
  };
  RX_UI_HIDE_KEYS.forEach(function (k) { c['rx-hide-' + k] = hide.indexOf(k) >= 0; });
  RX_UI_SIDE_KEYS.forEach(function (k) { c['rx-hide-side-' + k] = side.indexOf(k) >= 0; });
  return c;
}
function rxStreamerBlur(s) { return Math.max(2, Math.min(20, Number(s['streamer.blur']) || 8)); }

function rxMergeSettings(stored) {
  var s = {};
  var copy = function (v) { return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; };
  for (var k in RX_DEFAULTS) s[k] = copy(RX_DEFAULTS[k]);
  if (!stored || typeof stored !== 'object') return s;
  stored = rxMigrate(stored);
  for (var k2 in stored) {
    if (!(k2 in RX_DEFAULTS)) continue;
    var def = RX_DEFAULTS[k2], val = stored[k2];
    if (Array.isArray(def) !== Array.isArray(val)) continue;
    if (typeof def === 'number' && (typeof val !== 'number' || !isFinite(val))) continue;
    if (typeof def !== typeof val && !(def === null || val === null)) continue;
    s[k2] = copy(val);
  }
  return s;
}
