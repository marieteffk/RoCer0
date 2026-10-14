// Fondo de la extensión: proxy de API de Roblox (con token CSRF), cambio de cuentas,
// regiones de servidores, valores de Rolimons, seguimiento social, notificaciones,
// trades, lista de deseos, saldo de Robux, retos diarios, descansos y trajes.

// Chrome, Edge, Brave y Opera cargan este archivo como service worker; Firefox carga antes los scripts del manifest.
if (typeof importScripts === 'function' && typeof rxMergeSettings === 'undefined') {
  importScripts('common/defaults.js', 'common/rbxm.js');
}

const B = globalThis.browser || globalThis.chrome;
const ROBLOX_URL = 'https://www.roblox.com';
const ALLOWED_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(roblox\.com|rbxcdn\.com|rolimons\.com|ipinfo\.io|open\.er-api\.com)\//i;

let csrfToken = '';

async function getSettings() {
  const { settings } = await B.storage.local.get('settings');
  return rxMergeSettings(settings);
}

async function local(key, fallback) {
  const r = await B.storage.local.get(key);
  return r[key] === undefined ? fallback : r[key];
}

function setLocal(obj) { return B.storage.local.set(obj); }

function today(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

// Marca de tiempo que nunca se repite: dos avisos seguidos (confeti, descansos) no se pisan aunque caigan en el mismo milisegundo.
let lastStamp = 0;
function stamp() {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

// Dónde se abren los ajustes: dentro de los de Roblox o en la página de la extensión.
function settingsUrl(s, section) {
  return s['nav.settingsTab'] ? ROBLOX_URL + '/my/account?rocer0=' + section : B.runtime.getURL('options/options.html#' + section);
}

// ---------- API ----------

async function api({ url, method = 'GET', body, headers = {}, raw = false }) {
  if (!ALLOWED_HOSTS.test(url)) throw new Error('Dominio no permitido: ' + url);
  const isRoblox = /(^|\.)roblox\.com$/i.test(new URL(url).hostname);
  const send = async () => {
    // Las cookies solo viajan a Roblox; al resto de servicios (Rolimons, ipinfo, cambio de moneda) no.
    const opts = { method, credentials: isRoblox ? 'include' : 'omit', headers: Object.assign({}, headers) };
    if (body !== undefined) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    }
    if (method !== 'GET' && csrfToken && isRoblox) opts.headers['x-csrf-token'] = csrfToken;
    // Si un servicio no contesta, a los 20 s se da por fallido (el Inicio no se queda cargando para siempre).
    if (!raw && typeof AbortSignal.timeout === 'function') opts.signal = AbortSignal.timeout(20000);
    return fetch(url, opts);
  };
  let r = await send();
  if (r.status === 403 && r.headers.get('x-csrf-token')) {
    csrfToken = r.headers.get('x-csrf-token');
    r = await send();
  }
  if (raw) return r;
  const text = await r.text();
  let data = text;
  try { data = JSON.parse(text); } catch (e) { /* texto plano */ }
  return { ok: r.ok, status: r.status, data };
}

// Ping a Roblox para el contador de la página, por si la pestaña no puede medirlo ella misma.
async function ping() {
  const t = performance.now();
  await fetch(ROBLOX_URL + '/robots.txt?rx=' + Date.now(), { method: 'HEAD', cache: 'no-store', credentials: 'omit' });
  return Math.round(performance.now() - t);
}

async function authUser() {
  const r = await api({ url: 'https://users.roblox.com/v1/users/authenticated' });
  return r.ok ? r.data : null;
}

// ---------- Rolimons ----------

async function rolimons(force) {
  const cache = await local('rolimonsCache', null);
  if (!force && cache && Date.now() - cache.t < 10 * 60 * 1000) return cache;
  const r = await api({ url: 'https://www.rolimons.com/itemapi/itemdetails' });
  if (!r.ok || !r.data || !r.data.items) {
    if (cache) return cache;
    throw new Error('Rolimons no respondió (' + r.status + ')');
  }
  const fresh = { t: Date.now(), items: r.data.items };
  await setLocal({ rolimonsCache: fresh });
  return fresh;
}

// ---------- Regiones de servidores ----------

async function geo(ip) {
  const prefix = ip.split('.').slice(0, 3).join('.');
  const cache = await local('geoCache', {});
  if (cache[prefix]) return cache[prefix];
  const r = await api({ url: 'https://ipinfo.io/' + ip + '/json' });
  if (!r.ok || !r.data) throw new Error('No se pudo localizar ' + ip);
  const loc = { country: r.data.country || '', region: r.data.region || '', city: r.data.city || '' };
  cache[prefix] = loc;
  await setLocal({ geoCache: cache });
  return loc;
}

async function serverRegion({ placeId, serverId }) {
  const known = await local('serverRegions', {});
  if (known[serverId]) return known[serverId];
  const r = await api({
    url: 'https://gamejoin.roblox.com/v1/join-game-instance',
    method: 'POST',
    body: { placeId: Number(placeId), isTeleport: false, gameId: serverId, gameJoinAttemptId: crypto.randomUUID() }
  });
  const js = r.data && r.data.joinScript;
  if (!js) return { error: (r.data && r.data.message) || 'Sin datos (' + r.status + ')' };
  const ip = (js.UdmuxEndpoints && js.UdmuxEndpoints[0] && js.UdmuxEndpoints[0].Address) || js.MachineAddress;
  if (!ip || /^10\./.test(ip)) return { error: 'IP privada' };
  const loc = await geo(ip);
  const out = Object.assign({ ip }, loc);
  const keys = Object.keys(known);
  if (keys.length > 3000) keys.slice(0, 1000).forEach(k => delete known[k]);
  known[serverId] = out;
  await setLocal({ serverRegions: known });
  return out;
}

async function recordJoin({ placeId, serverId }) {
  if (!serverId) return;
  const recent = await local('recentServers', []);
  recent.unshift({ placeId: String(placeId), serverId, t: Date.now() });
  await setLocal({ recentServers: recent.slice(0, 100) });
}

// ---------- Inspección de objetos ----------

async function assetInspect({ assetId }) {
  const loc = await api({ url: 'https://assetdelivery.roblox.com/v1/assetId/' + assetId });
  if (!loc.ok || !loc.data || !loc.data.location) {
    const msg = loc.data && loc.data.errors && loc.data.errors[0] && loc.data.errors[0].message;
    return { error: msg || 'Roblox no deja descargar este objeto (' + loc.status + ')' };
  }
  const r = await fetch(loc.data.location);
  if (!r.ok) return { error: 'Descarga fallida (' + r.status + ')' };
  const buf = await r.arrayBuffer();
  const res = RXRbxm.inspect(buf);
  res.location = loc.data.location;
  return res;
}

// ---------- Cuentas ----------

const COOKIE = '.ROBLOSECURITY';

async function currentCookie() {
  return B.cookies.get({ url: ROBLOX_URL, name: COOKIE });
}

async function accountsList() {
  const accounts = await local('accounts', []);
  const me = await authUser().catch(() => null);
  return {
    current: me ? me.id : null,
    accounts: accounts.map(a => ({ userId: a.userId, name: a.name, displayName: a.displayName, savedAt: a.savedAt }))
  };
}

async function saveCurrentAccount() {
  const me = await authUser();
  const c = await currentCookie();
  if (!me || !c) throw new Error('No hay ninguna sesión de Roblox iniciada.');
  const accounts = (await local('accounts', [])).filter(a => a.userId !== me.id);
  accounts.push({ userId: me.id, name: me.name, displayName: me.displayName, cookie: c.value, savedAt: Date.now() });
  await setLocal({ accounts });
  return me;
}

async function reloadRobloxTabs() {
  const tabs = await B.tabs.query({ url: '*://*.roblox.com/*' });
  tabs.forEach(t => B.tabs.reload(t.id));
  return tabs.length;
}

async function switchAccount({ userId }) {
  const current = await currentCookie();
  const me = await authUser().catch(() => null);
  const accounts = await local('accounts', []);
  // Antes de cambiar, refrescamos la cookie guardada de la cuenta actual (Roblox la rota a veces).
  if (me && current) {
    const mine = accounts.find(a => a.userId === me.id);
    if (mine) { mine.cookie = current.value; await setLocal({ accounts }); }
  }
  const target = accounts.find(a => a.userId === userId);
  if (!target) throw new Error('Cuenta no encontrada.');
  await B.cookies.set({
    url: ROBLOX_URL, name: COOKIE, value: target.cookie, domain: '.roblox.com', path: '/',
    secure: true, httpOnly: true, expirationDate: Math.floor(Date.now() / 1000) + 365 * 24 * 3600
  });
  csrfToken = '';
  const check = await authUser().catch(() => null);
  if (!check || check.id !== userId) throw new Error('La sesión guardada de ' + target.name + ' ha caducado. Inicia sesión otra vez y guárdala de nuevo.');
  const s = await getSettings();
  const reloaded = s['accounts.reloadTabs'] ? await reloadRobloxTabs() : 0;
  return { id: check.id, name: check.name, displayName: check.displayName, reloadTabs: !!s['accounts.reloadTabs'], reloaded };
}

async function addNewAccount() {
  try { await saveCurrentAccount(); } catch (e) { /* no había sesión */ }
  // No llamamos a "cerrar sesión" de Roblox porque eso invalidaría la cookie guardada.
  await B.cookies.remove({ url: ROBLOX_URL, name: COOKIE });
  csrfToken = '';
  await B.tabs.create({ url: ROBLOX_URL + '/login' });
}

async function removeAccount({ userId }) {
  const accounts = (await local('accounts', [])).filter(a => a.userId !== userId);
  await setLocal({ accounts });
}

// ---------- Tiempo en el sitio ----------

async function heartbeat() {
  const s = await getSettings();
  if (!s['social.trackTime']) return;
  const now = Date.now();
  const last = await local('lastBeat', 0);
  let delta = (now - last) / 1000;
  if (delta > 40 || delta < 0) delta = 30;
  if (delta < 5) return;
  const log = await local('timeLog', {});
  const d = today();
  log[d] = (log[d] || 0) + delta;
  const days = Object.keys(log).sort();
  while (days.length > 90) delete log[days.shift()];
  await setLocal({ timeLog: log, lastBeat: now });
}

// ---------- Amigos, presencia y notificaciones ----------

async function friendIds(userId) {
  const ids = [];
  let cursor = '';
  for (let i = 0; i < 10; i++) {
    const r = await api({ url: `https://friends.roblox.com/v1/users/${userId}/friends/find?limit=50${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}` });
    if (!r.ok) break;
    (r.data.PageItems || []).forEach(p => ids.push(p.id));
    cursor = r.data.NextCursor;
    if (!cursor) break;
  }
  if (!ids.length) {
    const r = await api({ url: `https://friends.roblox.com/v1/users/${userId}/friends` });
    if (r.ok && r.data.data) r.data.data.forEach(f => ids.push(f.id));
  }
  return ids;
}

// Nombres de tus amigos (para los avisos, los favoritos y las estadísticas). Se renuevan cada semana por si alguien se cambia el nombre.
async function userNames(ids) {
  const cache = await local('nameCache', {});
  const now = Date.now();
  const stale = ids.filter(id => !cache[id] || !(now - (cache[id].t || 0) < 7 * 864e5));
  for (let i = 0; i < stale.length; i += 100) {
    const r = await api({ url: 'https://users.roblox.com/v1/users', method: 'POST', body: { userIds: stale.slice(i, i + 100), excludeBannedUsers: false } });
    if (r.ok && r.data && r.data.data) r.data.data.forEach(u => { cache[u.id] = { name: u.name, displayName: u.displayName, t: now }; });
  }
  if (stale.length) await setLocal({ nameCache: cache });
  return cache;
}

async function presence(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api({ url: 'https://presence.roblox.com/v1/presence/users', method: 'POST', body: { userIds: ids.slice(i, i + 50) } });
    if (r.ok && r.data.userPresences) out.push(...r.data.userPresences);
  }
  return out;
}

async function recordSeen(presences, names) {
  const seen = await local('lastSeen', {});
  const now = Date.now();
  presences.forEach(p => {
    if (p.userPresenceType > 0) {
      seen[p.userId] = { t: now, game: p.lastLocation || '', type: p.userPresenceType };
    } else if (p.lastOnline) {
      const lo = Date.parse(p.lastOnline);
      if (lo && lo > 946684800000 && (!seen[p.userId] || seen[p.userId].t < lo)) seen[p.userId] = { t: lo, game: '', type: 0, api: true };
    }
  });
  const meta = await local('lastSeenMeta', { since: now });
  await setLocal({ lastSeen: seen, lastSeenMeta: meta });
}

// Chrome (y Edge, Brave, Opera) da los errores en runtime.lastError; Firefox rechaza la promesa.
function createNotification(id, opts) {
  if (globalThis.browser) return B.notifications.create(id, opts);
  return new Promise((resolve, reject) => {
    try {
      B.notifications.create(id, opts, nid => {
        const err = B.runtime.lastError;
        if (err) reject(new Error(err.message)); else resolve(nid);
      });
    } catch (e) { reject(e); }
  });
}

// Única puerta de las notificaciones del sistema: respeta "notify.all" y el horario de silencio
// (salvo la de prueba, force = true). Devuelve true si se ha mostrado.
async function notify(title, message, url, iconUrl, force) {
  if (!B.notifications) return false;
  if (!force) {
    const s = await getSettings();
    if (!s['notify.all'] || rcInQuietHours(s)) return false;
  }
  const own = B.runtime.getURL('icons/icon-96.png');
  const id = 'rx|' + Date.now() + Math.random().toString(36).slice(2, 6) + '|' + (url || '');
  const opts = { type: 'basic', iconUrl: iconUrl || own, title: String(title || 'RoCer0'), message: String(message || '') };
  try {
    await createNotification(id, opts);
  } catch (e) {
    // Chromium no siempre acepta imágenes de fuera de la extensión: se repite una vez con el icono propio.
    try {
      if (opts.iconUrl === own) throw e;
      opts.iconUrl = own;
      await createNotification(id, opts);
    } catch (e2) {
      if (force) throw e2;
      console.warn('[RC] notify', e2);
      return false;
    }
  }
  return true;
}

// "A, B y C" (y "A, B, C y 2 más" si son muchos).
function listText(names, max) {
  max = max || 3;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return shown.join(', ') + ' y ' + rest + ' más';
  return shown.length > 1 ? shown.slice(0, -1).join(', ') + ' y ' + shown[shown.length - 1] : (shown[0] || '');
}

function fmtNum(n) { return Math.round(Number(n) || 0).toLocaleString('es-ES'); }

function fmtMinutes(m) {
  m = Math.round(m);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return h + ' h' + (r ? ' ' + r + ' min' : '');
}

function yesterday(day) {
  const x = new Date(day + 'T12:00:00');
  x.setDate(x.getDate() - 1);
  return today(x);
}

// Evita que dos tareas lean y escriban la misma clave a la vez.
const locks = {};
function locked(name, fn) {
  const prev = locks[name] || Promise.resolve();
  const p = prev.then(fn, fn);
  locks[name] = p.catch(() => {});
  return p;
}

// Confeti en la pestaña de Roblox que tengas delante (lo pinta content/fun.js), solo si toca para ese suceso
// ("fun.confetti" y "fun.confettiEvents"). kind: badge, challenge, challenges, medal o trade.
async function celebrate(kind, text, s) {
  s = s || await getSettings();
  if (!rcConfettiFor(s, kind)) return false;
  await setLocal({ celebrate: { t: stamp(), kind, text } });
  return true;
}

// Tu propio tiempo de juego por juego (para "Juegos recientes" del Inicio rediseñado y el Wrapped).
async function trackSelf(p, minutes) {
  if (!p || p.userPresenceType !== 2 || !p.universeId) return;
  const games = await local('myGames', {});
  const d = today();
  games[d] = games[d] || {};
  const g = games[d][p.universeId] = games[d][p.universeId] || { name: p.lastLocation || 'Juego', placeId: p.rootPlaceId || p.placeId || null, minutes: 0 };
  g.minutes += minutes;
  if (p.lastLocation) g.name = p.lastLocation;
  const days = Object.keys(games).sort();
  while (days.length > 400) delete games[days.shift()];
  const recent = (await local('myRecent', [])).filter(r => r.universeId !== p.universeId);
  recent.unshift({ universeId: p.universeId, placeId: p.rootPlaceId || p.placeId || null, name: p.lastLocation || g.name, t: Date.now() });
  await setLocal({ myGames: games, myRecent: recent.slice(0, 40) });
}

// ---------- Consulta periódica ----------

// Con las notificaciones apagadas ("notify.all") no se consulta nada que solo sirva para avisar.
function wantsFriendNotes(s) { return !!(s['notify.all'] && s['notify.enabled']); }
function wantsTrades(s) { return !!(s['notify.all'] && s['trade.notifyInbound']); }
function wantsBadges(s) { return !!(rcConfettiFor(s, 'badge') || s['fun.challenges'] || (s['notify.all'] && s['notify.badges'])); }

function wantsPoll(s) {
  return !!(s['social.trackFriends'] || wantsFriendNotes(s) || s['home.trackPlaytime'] || s['fun.challenges'] ||
    wantsBadges(s) || rcConfettiFor(s, 'trade') || wantsTrades(s) || s['wishlist.enabled'] || s['robux.track'] ||
    Number(s['wellbeing.breakMinutes']) > 0 || Number(s['wellbeing.dailyLimit']) > 0);
}

function wantsSelf(s) {
  return !!(s['home.trackPlaytime'] || s['fun.challenges'] || Number(s['wellbeing.breakMinutes']) > 0 || Number(s['wellbeing.dailyLimit']) > 0);
}

let polling = null;
function poll() {
  if (!polling) polling = doPoll().finally(() => { polling = null; });
  return polling;
}

async function doPoll() {
  const s = await getSettings();
  const me = await authUser();
  if (!me) return;
  const now = Date.now();
  const period = Math.max(1, Number(s['social.pollMinutes']) || 2);
  // Minutos reales desde la consulta anterior (si pulsas "Consultar ahora" no se cuentan de más).
  const lastPollAt = await local('lastPollAt', 0);
  const elapsed = lastPollAt && now > lastPollAt ? Math.min((now - lastPollAt) / 60000, period + 1) : period;
  await setLocal({ lastPollAt: now, me: { id: me.id, name: me.name, displayName: me.displayName } });

  const wantFriends = s['social.trackFriends'] || wantsFriendNotes(s);
  const ids = wantFriends ? await friendIds(me.id) : [];
  const all = wantsSelf(s) || ids.length ? await presence([me.id].concat(ids)) : [];
  const mine = all.find(p => p.userId === me.id) || null;
  const pres = all.filter(p => p.userId !== me.id);

  if (wantsSelf(s)) {
    try { await selfTick(s, me, mine, pres, elapsed, now); } catch (e) { console.warn('[RC] self', e); }
  }
  if (ids.length) {
    try { await friendsTick(s, pres, ids, elapsed); } catch (e) { console.warn('[RC] friends', e); }
  }
  await periodicTasks(s, me, now);
}

async function selfTick(s, me, p, friends, elapsed, now) {
  const inGame = !!(p && p.userPresenceType === 2);
  const d = today();
  if (s['home.trackPlaytime']) await trackSelf(p, elapsed);

  // Minutos jugados por día (retos, descansos y Wrapped).
  const playLog = await local('playLog', {});
  if (inGame) {
    playLog[d] = (playLog[d] || 0) + elapsed;
    const days = Object.keys(playLog).sort();
    while (days.length > 400) delete playLog[days.shift()];
    await setLocal({ playLog });
  }
  if (inGame && p.gameId) {
    await setLocal({ myServer: { placeId: p.placeId || p.rootPlaceId, rootPlaceId: p.rootPlaceId, gameId: p.gameId, universeId: p.universeId, name: p.lastLocation || '', t: now } });
  }
  await wellbeingTick(s, inGame, playLog[d] || 0, now, elapsed);

  // Amigos en tu mismo juego (para el Wrapped y el reto de coincidir).
  const sameGame = inGame ? friends.filter(f => f.userPresenceType === 2 &&
    ((p.universeId && f.universeId === p.universeId) || (p.rootPlaceId && f.rootPlaceId === p.rootPlaceId))) : [];
  if (sameGame.length) {
    const tg = await local('together', {});
    const mk = d.slice(0, 7);
    tg[mk] = tg[mk] || {};
    sameGame.forEach(f => { tg[mk][f.userId] = (tg[mk][f.userId] || 0) + elapsed; });
    const months = Object.keys(tg).sort();
    while (months.length > 14) delete tg[months.shift()];
    await setLocal({ together: tg });
  }

  if (!s['fun.challenges']) {
    await setLocal({ prevSelf: inGame ? { gameId: p.gameId || null, t: now } : null });
    return;
  }
  // ¿Te has unido al servidor en el que ya estaba un amigo?
  let joined = false;
  const prevSelf = await local('prevSelf', null);
  if (inGame && p.gameId && (!prevSelf || prevSelf.gameId !== p.gameId)) {
    const prev = await local('prevPresence', {});
    joined = friends.some(f => f.gameId === p.gameId && prev[f.userId] && prev[f.userId].gameId === p.gameId);
  }
  await setLocal({ prevSelf: inGame ? { gameId: p.gameId || null, t: now } : null });
  // ¿Juego nuevo para ti?
  let isNew = false;
  if (inGame && p.universeId) {
    await locked('played', async () => {
      const { played, fresh } = await loadPlayed();
      if (!played[p.universeId]) { played[p.universeId] = now; isNew = !fresh; }
      await setLocal({ playedEver: played });
    });
  }
  await challengeUpdate(c => {
    c.playMin = playLog[d] || 0;
    if (inGame && p.universeId && c.games.indexOf(p.universeId) < 0) c.games.push(p.universeId);
    if (sameGame.length > c.withFriends) c.withFriends = sameGame.length;
    if (joined) c.joinFriend = 1;
    if (isNew) c.newGame = 1;
  });
}

// Juegos que ya habías jugado (para el reto "prueba un juego nuevo").
async function loadPlayed() {
  const stored = await local('playedEver', null);
  if (stored) return { played: stored, fresh: false };
  const played = {};
  const games = await local('myGames', {});
  Object.keys(games).forEach(day => Object.keys(games[day]).forEach(u => { played[u] = 1; }));
  (await local('myRecent', [])).forEach(r => { if (r.universeId) played[r.universeId] = 1; });
  return { played, fresh: true };
}

function playedSeed({ universeIds }) {
  return locked('played', async () => {
    const { played } = await loadPlayed();
    (universeIds || []).forEach(id => { if (id && !played[id]) played[id] = 1; });
    await setLocal({ playedEver: played });
  });
}

async function wellbeingTick(s, inGame, todayMin, now, elapsed) {
  const breakMin = Math.max(0, Number(s['wellbeing.breakMinutes']) || 0);
  const limit = Math.max(0, Number(s['wellbeing.dailyLimit']) || 0);
  if (!breakMin && !limit) return;
  const w = await local('wellbeing', {});
  if (inGame) {
    // Una pausa de "wellbeing.gap" minutos empieza una sesión nueva. Dos consultas seguidas jugando
    // nunca cuentan como pausa, aunque se consulte cada más minutos que esa pausa.
    const gap = Math.max(1, Number(s['wellbeing.gap']) || 10) * 60000;
    const pause = w.lastInGame ? now - w.lastInGame : Infinity;
    if (!w.sessionStart || pause > Math.max(gap, (elapsed + 1) * 60000)) {
      w.sessionStart = now - elapsed * 60000;
      w.remindedAt = 0;
    }
    w.lastInGame = now;
    // Sin "wellbeing.repeat", un solo recordatorio por sesión.
    if (breakMin && (s['wellbeing.repeat'] || !w.remindedAt) && now >= (w.remindedAt || w.sessionStart) + breakMin * 60000) {
      w.remindedAt = now;
      const custom = String(s['wellbeing.message'] || '').trim();
      await wellbeingAlert(s, 'break', 'Hora de un descanso',
        'Llevas ' + fmtMinutes((now - w.sessionStart) / 60000) + ' jugando seguido. ' + (custom || 'Levántate, estira un poco y bebe agua.'));
    }
    if (limit && todayMin >= limit && w.dailyNotified !== today()) {
      w.dailyNotified = today();
      await wellbeingAlert(s, 'limit', 'Límite diario', 'Hoy ya llevas ' + fmtMinutes(todayMin) + ' jugando, por encima de tu límite de ' + fmtMinutes(limit) + '.');
    }
  }
  await setLocal({ wellbeing: w });
}

// Notificación del sistema y, con "wellbeing.inPage", también el aviso dentro de roblox.com
// (storage.local "wellbeingAlert", que pinta un content script aunque las notificaciones estén apagadas).
async function wellbeingAlert(s, kind, title, text) {
  if (s['wellbeing.inPage']) await setLocal({ wellbeingAlert: { t: stamp(), kind, title, text } });
  await notify(title, text);
}

async function friendsTick(s, pres, ids, elapsed) {
  const names = await userNames(ids);
  await recordSeen(pres, names);

  // Juegos de amigos: minutos estimados por juego y día.
  const tally = await local('friendGames', {});
  const d = today();
  tally[d] = tally[d] || {};
  pres.forEach(p => {
    if (p.userPresenceType !== 2) return;
    const key = p.universeId || p.rootPlaceId || p.lastLocation;
    if (!key) return;
    const g = tally[d][key] = tally[d][key] || { name: p.lastLocation || 'Juego', placeId: p.rootPlaceId || p.placeId || null, minutes: 0, friends: [] };
    g.minutes += elapsed;
    if (g.friends.indexOf(p.userId) < 0) g.friends.push(p.userId);
  });
  const days = Object.keys(tally).sort();
  while (days.length > 30) delete tally[days.shift()];
  await setLocal({ friendGames: tally });

  // Notificaciones comparando con la consulta anterior.
  const prev = await local('prevPresence', {});
  const next = {};
  pres.forEach(p => { next[p.userId] = { type: p.userPresenceType, game: p.lastLocation, placeId: p.rootPlaceId || p.placeId, gameId: p.gameId || null }; });
  await setLocal({ prevPresence: next });
  // "notify.enabled" es el interruptor de los avisos de amigos; notify() mira además "notify.all" y el silencio.
  if (!wantsFriendNotes(s) || !Object.keys(prev).length) return;

  // "notify.favoritesOnly": solo amigos de "friends.favorites" (nombres o IDs; los nombres salen de nameCache).
  const user = id => ({ id, name: names[id] && names[id].name, displayName: names[id] && names[id].displayName });
  const allowed = id => !s['notify.favoritesOnly'] || rcIsFavorite(s, user(id));
  const label = id => names[id] ? names[id].displayName + ' (@' + names[id].name + ')' : 'Un amigo';
  const short = id => names[id] ? names[id].displayName || names[id].name : 'Un amigo';
  const pinned = await local('pinned', []);
  const isPinned = p => pinned.some(x => (x.universeId && p.universeId && String(x.universeId) === String(p.universeId)) ||
    (x.placeId && (String(x.placeId) === String(p.rootPlaceId) || String(x.placeId) === String(p.placeId))));

  for (const p of pres) {
    const before = prev[p.userId];
    if (!before || !allowed(p.userId)) continue;
    if (s['notify.friendOnline'] && before.type === 0 && p.userPresenceType > 0) {
      await notify('Amigo conectado', label(p.userId) + ' se ha conectado.', ROBLOX_URL + '/users/' + p.userId + '/profile');
    }
    const place = String(p.rootPlaceId || p.placeId || '');
    if (s['notify.friendJoinsGame'] && p.userPresenceType === 2 && (before.type !== 2 || before.game !== p.lastLocation)) {
      if (!s['notify.pinnedOnly'] || isPinned(p)) {
        await notify('Amigo jugando', label(p.userId) + ' ha entrado en ' + (p.lastLocation || 'un juego') + '.', place ? ROBLOX_URL + '/games/' + place : ROBLOX_URL + '/users/' + p.userId + '/profile');
      }
    }
  }

  // "notify.groupUp": al menos N amigos en el mismo juego (0 = nunca), un aviso por juego cada 3 horas.
  const n = Math.max(0, Number(s['notify.groupUp']) || 0);
  if (n > 0) {
    const groups = {};
    pres.forEach(p => {
      if (p.userPresenceType !== 2 || !allowed(p.userId)) return;
      const key = p.universeId ? 'u' + p.universeId : p.rootPlaceId ? 'p' + p.rootPlaceId : p.lastLocation ? 'n' + p.lastLocation : '';
      if (key) (groups[key] = groups[key] || []).push(p);
    });
    const announced = await local('groupAnnounced', {});
    const now = Date.now();
    for (const k in announced) if (!(now - announced[k] < 3 * 3600 * 1000)) delete announced[k];
    for (const key in groups) {
      const g = groups[key];
      if (g.length < n || announced[key]) continue;
      const game = (g.find(p => p.lastLocation) || {}).lastLocation || 'el mismo juego';
      const place = g[0].rootPlaceId || g[0].placeId;
      const shown = await notify('Tus amigos se juntan', listText(g.map(p => short(p.userId))) + (g.length === 1 ? ' está' : ' están') + ' jugando a ' + game + '.',
        place ? ROBLOX_URL + '/games/' + place : ROBLOX_URL + '/home');
      if (shown) announced[key] = now;
    }
    await setLocal({ groupAnnounced: announced });
  }
}

// Tareas que no hace falta repetir en cada consulta.
async function periodicTasks(s, me, now) {
  const times = await local('taskTimes', {});
  const run = async (key, minutes, enabled, fn) => {
    if (!enabled || (times[key] && now - times[key] < minutes * 60000 - 15000)) return;
    times[key] = now;
    try { await fn(); } catch (e) { console.warn('[RC] ' + key, e); }
  };
  await run('trades', 1, wantsTrades(s), () => checkInboundTrades(s, me));
  await run('tradesDone', 10, !!rcConfettiFor(s, 'trade'), () => checkCompletedTrades(s, me));
  await run('badges', 5, wantsBadges(s), () => checkBadges(s, me));
  await run('wishlist', Math.max(5, Number(s['wishlist.checkMinutes']) || 15), s['wishlist.enabled'], () => checkWishlist(s));
  await run('robux', Math.max(15, Number(s['robux.minutes']) || 30), s['robux.track'], () => recordRobux(me));
  await setLocal({ taskTimes: times });
}

async function setupAlarm(force) {
  const s = await getSettings();
  const want = wantsPoll(s);
  const period = Math.max(1, Number(s['social.pollMinutes']) || 2);
  const existing = await B.alarms.get('poll');
  if (!force && ((want && existing && existing.periodInMinutes === period) || (!want && !existing))) return;
  await B.alarms.clear('poll');
  if (want) B.alarms.create('poll', { periodInMinutes: period, delayInMinutes: 0.2 });
}

// ---------- Trades ----------

function itemWorth(items, assetId, rapFallback, mode) {
  const it = items && items[assetId];
  const rap = it && Number(it[2]) > 0 ? Number(it[2]) : (Number(rapFallback) || 0);
  if (mode === 'rap') return rap;
  return it && Number(it[3]) > 0 ? Number(it[3]) : rap;
}

// Roblox ha cambiado el formato de los trades varias veces: se aceptan los dos.
function parseOffers(d) {
  let offers = d && d.offers;
  if (!offers && d && (d.participantAOffer || d.participantBOffer)) offers = [d.participantAOffer, d.participantBOffer].filter(Boolean);
  return (offers || []).map(o => {
    const u = o.user || {};
    return {
      userId: u.id || u.userId || null,
      name: u.name || u.username || '',
      displayName: u.displayName || u.name || '',
      robux: Number(o.robux) || 0,
      items: (o.userAssets || o.items || o.userItems || []).map(a => ({
        assetId: String(a.assetId || (a.itemTarget && a.itemTarget.targetId) || a.targetId || ''),
        name: a.name || a.itemName || '',
        rap: Number(a.recentAveragePrice) || 0
      }))
    };
  });
}

async function tradeSummary(tradeId, meId, s) {
  let r = await api({ url: 'https://trades.roblox.com/v1/trades/' + tradeId });
  let offers = r.ok ? parseOffers(r.data) : [];
  if (offers.length < 2) {
    r = await api({ url: 'https://trades.roblox.com/v2/trades/' + tradeId });
    offers = r.ok ? parseOffers(r.data) : [];
  }
  if (offers.length < 2) return null;
  const mine = offers.find(o => String(o.userId) === String(meId)) || offers[0];
  const theirs = offers.find(o => o !== mine);
  const rol = await rolimons().catch(() => null);
  const items = rol && rol.items;
  const mode = s['trade.useValue'];
  const sum = list => list.reduce((a, it) => a + itemWorth(items, it.assetId, it.rap, mode), 0);
  const give = sum(mine.items) + mine.robux;
  // De los Robux que te dan, Roblox se queda el 30%.
  const get = sum(theirs.items) + Math.floor(theirs.robux * 0.7);
  return { give, get, diff: get - give, pct: give > 0 ? Math.round((get - give) / give * 100) : null, partner: theirs, mine };
}

function tradeLine(t) {
  const names = t.partner.items.map(i => i.name).filter(Boolean);
  let offer = names.slice(0, 3).join(', ') + (names.length > 3 ? ' y ' + (names.length - 3) + ' más' : '');
  if (t.partner.robux) offer += (offer ? ' + ' : '') + fmtNum(t.partner.robux) + ' R$';
  const verdict = t.diff === 0 ? 'quedas igual' : (t.diff > 0 ? 'ganas ' : 'pierdes ') + fmtNum(Math.abs(t.diff)) + (t.pct !== null ? ' (' + (t.pct > 0 ? '+' : '') + t.pct + ' %)' : '');
  return (offer ? 'Te ofrece ' + offer + '.\n' : '') + 'Recibes ' + fmtNum(t.get) + ' y das ' + fmtNum(t.give) + ': ' + verdict + '.';
}

async function checkInboundTrades(s, me) {
  const r = await api({ url: 'https://trades.roblox.com/v1/trades/inbound?sortOrder=Desc&limit=10' });
  if (!r.ok || !r.data || !Array.isArray(r.data.data)) return;
  const list = r.data.data;
  const seen = await local('tradesSeen', null) || {};
  const ids = list.map(t => t.id);
  if (!seen.inbound) {
    // Primera vez: los trades que ya tenías no se avisan.
    seen.inbound = ids;
    await setLocal({ tradesSeen: seen });
    return;
  }
  const fresh = list.filter(t => seen.inbound.indexOf(t.id) < 0);
  seen.inbound = ids.concat(seen.inbound.filter(id => ids.indexOf(id) < 0)).slice(0, 300);
  await setLocal({ tradesSeen: seen });
  for (const t of fresh.slice(0, 5)) {
    const sum = await tradeSummary(t.id, me.id, s).catch(() => null);
    // Si no se ha podido calcular, se avisa igual (sin valores) para no perder un trade bueno.
    if (sum && s['trade.notifyOnlyWins'] && !tradeIsWin(sum, s)) continue;
    const who = (t.user && (t.user.displayName || t.user.name)) || (sum && sum.partner.displayName) || 'alguien';
    await notify('Trade nuevo de ' + who, sum ? tradeLine(sum) : 'Ábrelo para ver lo que te ofrece.', ROBLOX_URL + '/trades');
  }
}

// "Te sale a cuenta": ganas valor y al menos "trade.notifyMinPct" %. Si no das nada (pct null), cuenta como ganancia.
function tradeIsWin(sum, s) {
  if (!(sum.diff > 0)) return false;
  const min = Math.max(0, Number(s['trade.notifyMinPct']) || 0);
  return sum.pct === null || sum.pct >= min;
}

async function checkCompletedTrades(s, me) {
  const r = await api({ url: 'https://trades.roblox.com/v1/trades/completed?sortOrder=Desc&limit=10' });
  if (!r.ok || !r.data || !Array.isArray(r.data.data)) return;
  const ids = r.data.data.map(t => t.id);
  const seen = await local('tradesSeen', null) || {};
  if (!seen.completed) {
    seen.completed = ids;
    await setLocal({ tradesSeen: seen });
    return;
  }
  const fresh = r.data.data.filter(t => seen.completed.indexOf(t.id) < 0);
  seen.completed = ids.concat(seen.completed.filter(id => ids.indexOf(id) < 0)).slice(0, 300);
  await setLocal({ tradesSeen: seen });
  for (const t of fresh.slice(0, 3)) {
    const sum = await tradeSummary(t.id, me.id, s).catch(() => null);
    if (sum && sum.diff > 0) await celebrate('trade', '¡Buen trade! Has ganado ' + fmtNum(sum.diff) + ' de valor.', s);
  }
}

// ---------- Insignias ----------

// Insignias nuevas: confeti ("badge"), reto de insignias y, con "notify.badges", notificación del sistema.
async function checkBadges(s, me) {
  const r = await api({ url: `https://badges.roblox.com/v1/users/${me.id}/badges?limit=10&sortOrder=Desc` });
  if (!r.ok || !r.data || !Array.isArray(r.data.data)) return;
  const list = r.data.data;
  const all = await local('badgesSeen', {});
  const seen = all[me.id];
  const ids = list.map(b => b.id);
  all[me.id] = ids.concat((seen || []).filter(id => ids.indexOf(id) < 0)).slice(0, 200);
  await setLocal({ badgesSeen: all });
  if (!seen) return; // primera vez: solo se apuntan
  const fresh = list.filter(b => seen.indexOf(b.id) < 0);
  if (!fresh.length) return;
  const log = await local('badgesLog', {});
  const mk = today().slice(0, 7);
  log[mk] = (log[mk] || 0) + fresh.length;
  await setLocal({ badgesLog: log });
  await challengeUpdate(c => { c.badge += fresh.length; });
  const name = b => b.displayName || b.name || 'Insignia';
  await celebrate('badge', fresh.length === 1 ? '¡Insignia nueva: ' + name(fresh[0]) + '!' : '¡' + fresh.length + ' insignias nuevas!', s);
  if (s['notify.badges']) {
    if (fresh.length === 1) await notify('Insignia nueva', 'Has conseguido «' + name(fresh[0]) + '».', ROBLOX_URL + '/badges/' + fresh[0].id);
    else await notify(fresh.length + ' insignias nuevas', 'Has conseguido ' + listText(fresh.map(b => '«' + name(b) + '»')) + '.', ROBLOX_URL + '/users/' + me.id + '/inventory#!/badges');
  }
}

// ---------- Saldo de Robux ----------

async function recordRobux(me) {
  const r = await api({ url: `https://economy.roblox.com/v1/users/${me.id}/currency` });
  if (!r.ok || !r.data || typeof r.data.robux !== 'number') return null;
  const all = await local('robuxHistory', {});
  const list = all[me.id] = all[me.id] || [];
  const last = list[list.length - 1];
  const now = Date.now();
  if (!last || last.r !== r.data.robux || now - last.t > 6 * 3600000) list.push({ t: now, r: r.data.robux });
  if (list.length > 1500) list.splice(0, list.length - 1500);
  await setLocal({ robuxHistory: all });
  return r.data.robux;
}

async function robuxNow() {
  const me = await authUser();
  if (!me) throw new Error('Inicia sesión en Roblox.');
  const robux = await recordRobux(me);
  return { userId: me.id, robux };
}

// ---------- Lista de deseos ----------

function catalogUrl(it) { return ROBLOX_URL + (it.type === 'Bundle' ? '/bundles/' : '/catalog/') + it.id; }

function readPrice(d) {
  const resale = [d.lowestPrice, d.lowestResalePrice].filter(v => typeof v === 'number' && v > 0);
  const offSale = d.priceStatus === 'Off Sale' || d.isOffSale === true;
  if (resale.length) return { onSale: true, price: Math.min.apply(null, resale.concat(!offSale && d.price > 0 ? [d.price] : [])) };
  if (offSale || d.priceStatus === 'No Resellers') return { onSale: false, price: null };
  if (typeof d.price === 'number') return { onSale: true, price: d.price };
  if (d.priceStatus === 'Free') return { onSale: true, price: 0 };
  return { onSale: false, price: null };
}

async function catalogDetails(items) {
  const out = [];
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const r = await api({ url: 'https://catalog.roblox.com/v1/catalog/items/details', method: 'POST', body: { items: chunk.map(it => ({ itemType: it.type, id: Number(it.id) })) } });
    if (r.ok && r.data && Array.isArray(r.data.data)) out.push(...r.data.data);
  }
  return out;
}

async function catalogThumbs(items) {
  const res = {};
  const assets = items.filter(i => i.type !== 'Bundle').map(i => i.id);
  const bundles = items.filter(i => i.type === 'Bundle').map(i => i.id);
  if (assets.length) {
    const r = await api({ url: 'https://thumbnails.roblox.com/v1/assets?assetIds=' + assets.join(',') + '&size=150x150&format=Png&isCircular=false' });
    if (r.ok && r.data && r.data.data) r.data.data.forEach(t => { if (t.imageUrl) res['Asset:' + t.targetId] = t.imageUrl; });
  }
  if (bundles.length) {
    const r = await api({ url: 'https://thumbnails.roblox.com/v1/bundles/thumbnails?bundleIds=' + bundles.join(',') + '&size=150x150&format=Png&isCircular=false' });
    if (r.ok && r.data && r.data.data) r.data.data.forEach(t => { if (t.imageUrl) res['Bundle:' + t.targetId] = t.imageUrl; });
  }
  return res;
}

function sameItem(a, id, type) { return String(a.id) === String(id) && (a.type || 'Asset') === (type || 'Asset'); }

// Ojo: "type" ya lo usa el mensaje, así que el tipo de objeto llega como "itemType".
function wishlistAdd({ id, itemType, name, target }) {
  const type = itemType === 'Bundle' ? 'Bundle' : 'Asset';
  return locked('wishlist', async () => {
    const list = await local('wishlist', []);
    let it = list.find(a => sameItem(a, id, type));
    if (!it) {
      it = { id: String(id), type, name: name || 'Objeto ' + id, price: null, onSale: false, target: Number(target) || 0, addedAt: Date.now(), lastCheck: 0, img: '' };
      const [d] = await catalogDetails([it]).catch(() => []);
      if (d) {
        Object.assign(it, readPrice(d));
        it.name = d.name || it.name;
        it.lowest = it.price;
        if (typeof it.price === 'number') it.ref = it.price;
      }
      const th = await catalogThumbs([it]).catch(() => ({}));
      it.img = th[type + ':' + id] || '';
      it.lastCheck = Date.now();
      list.unshift(it);
      await setLocal({ wishlist: list });
      challengeUpdate(c => { c.wish = 1; }).catch(() => {});
    }
    return it;
  });
}

function wishlistRemove({ id, itemType }) {
  return locked('wishlist', async () => {
    const list = (await local('wishlist', [])).filter(a => !sameItem(a, id, itemType || 'Asset'));
    await setLocal({ wishlist: list });
    return list;
  });
}

function wishlistUpdate({ id, itemType, target }) {
  return locked('wishlist', async () => {
    const list = await local('wishlist', []);
    const it = list.find(a => sameItem(a, id, itemType || 'Asset'));
    if (it) { it.target = Math.max(0, Number(target) || 0); it.targetHit = false; }
    await setLocal({ wishlist: list });
    return it;
  });
}

// Comprueba los precios. Un aviso como mucho por objeto: vuelta a la venta, precio objetivo o bajada.
// La bajada se mide contra "ref": el precio más alto visto desde el último aviso de ese objeto
// (o el último conocido), así varias bajadas pequeñas seguidas también llegan a "wishlist.minDrop".
function checkWishlist(s) {
  return locked('wishlist', async () => {
    s = s || await getSettings();
    const list = await local('wishlist', []);
    if (!list.length) return list;
    const details = await catalogDetails(list);
    const minDrop = Math.max(0, Number(s['wishlist.minDrop']) || 0);
    const alerts = [];
    details.forEach(d => {
      const it = list.find(a => sameItem(a, d.id, d.itemType === 'Bundle' ? 'Bundle' : 'Asset'));
      if (!it) return;
      const now = readPrice(d);
      const was = { price: it.price, onSale: it.onSale };
      if (d.name) it.name = d.name;
      it.lastCheck = Date.now();
      const priced = now.onSale && now.price !== null;
      const ref = typeof it.ref === 'number' ? it.ref : (typeof was.price === 'number' ? was.price : null);
      const target = Number(it.target) || 0;
      const atTarget = target > 0 && priced && now.price <= target;
      const dropPct = priced && ref > 0 && now.price < ref ? (ref - now.price) / ref * 100 : 0;
      const newTarget = atTarget && !it.targetHit && s['wishlist.alertTarget'];
      let alert = null;
      if (now.onSale && !was.onSale && s['wishlist.alertBack']) {
        alert = ['¡Vuelve a estar a la venta!', it.name + ' por ' + fmtNum(now.price) + ' R$' + (atTarget ? ' (tu objetivo: ' + fmtNum(target) + ').' : '.')];
      } else if (dropPct > 0 && dropPct + 1e-9 >= minDrop && s['wishlist.alertDrop']) {
        alert = ['Ha bajado de precio', it.name + ': ahora ' + fmtNum(now.price) + ' R$ (antes ' + fmtNum(ref) + ')' +
          (newTarget ? '. ¡Ya está a tu precio!' : ', un ' + Math.round(dropPct) + ' % menos.')];
      } else if (newTarget) {
        alert = ['Ya está a tu precio', it.name + ' cuesta ' + fmtNum(now.price) + ' R$ (tu objetivo: ' + fmtNum(target) + ').'];
      }
      if (alert) alerts.push([it].concat(alert));
      if (atTarget) it.targetHit = true;
      else if (target > 0 && (!now.onSale || now.price > target)) it.targetHit = false;
      if (priced) it.ref = alert || !s['wishlist.alertDrop'] || ref === null ? now.price : Math.max(ref, now.price);
      if (priced && now.price !== was.price) it.changedAt = Date.now();
      it.price = now.price;
      it.onSale = now.onSale;
      if (now.price !== null && (it.lowest == null || now.price < it.lowest)) it.lowest = now.price;
    });
    const missing = list.filter(i => !i.img);
    if (missing.length) {
      const th = await catalogThumbs(missing).catch(() => ({}));
      missing.forEach(i => { i.img = th[i.type + ':' + i.id] || ''; });
    }
    await setLocal({ wishlist: list });
    for (const a of alerts.slice(0, 5)) await notify(a[1], a[2], catalogUrl(a[0]), a[0].img || undefined);
    return list;
  });
}

// ---------- Retos diarios ----------

function freshCounters() {
  return { playMin: 0, games: [], joinFriend: 0, withFriends: 0, profiles: [], newGame: 0, badge: 0, roulette: 0, pin: 0, note: 0, wish: 0 };
}

const CH_VALUE = {
  play30: c => c.playMin, play60: c => c.playMin, threeGames: c => c.games.length,
  joinFriend: c => c.joinFriend, withFriends: c => c.withFriends, profiles: c => c.profiles.length,
  newGame: c => c.newGame, badge: c => c.badge, roulette: c => c.roulette, pin: c => c.pin, note: c => c.note, wish: c => c.wish
};

// Lo que lleva hoy el contador que mide ese reto.
function chValue(id, counters) {
  return Math.floor(Number((CH_VALUE[id] || (() => 0))(counters)) || 0);
}

// Reto nuevo con el objetivo de la dificultad elegida; con counters, empieza con lo que ya llevas hoy.
function newChallenge(id, s, counters) {
  const goal = rcChallengeGoal(id, s['challenges.difficulty']);
  return { id, goal, progress: counters ? Math.min(goal, chValue(id, counters)) : 0, done: false };
}

function rollChallenges(st, s) {
  const d = today();
  const sig = rcChallengeSig(s);
  if (st && st.day === d && Array.isArray(st.list) && st.counters) {
    // Has cambiado cuántos, la dificultad o cuáles pueden salir: si aún no has completado ninguno, se vuelven a sacar.
    if (st.sig !== sig && !st.list.some(c => c.done)) {
      st.list = rcPickChallenges(d, s).map(id => newChallenge(id, s, st.counters));
      st.sig = sig;
    }
    return st;
  }
  st = st || {};
  st.medals = st.medals || {};
  st.history = st.history || {};
  st.counts = st.counts || {};
  st.total = st.total || 0;
  st.best = st.best || 0;
  st.streak = st.streak || 0;
  st.day = d;
  st.sig = sig;
  st.counters = freshCounters();
  st.list = rcPickChallenges(d, s).map(id => newChallenge(id, s));
  if (st.lastComplete !== yesterday(d) && st.lastComplete !== d) st.streak = 0;
  [st.history, st.counts].forEach(map => {
    const days = Object.keys(map).sort();
    while (days.length > 400) delete map[days.shift()];
  });
  return st;
}

// "Cambiar los retos de hoy": una vez al día, los completados se quedan y los demás se cambian por otros
// que no estén ya en la lista (de la misma categoría si se puede). Si no hay bastantes, se quedan los de antes.
function rerollChallenges(st, s) {
  const d = st.day;
  if (st.rerolled === d) throw new Error('Ya has cambiado los retos de hoy.');
  if (!st.list.some(c => !c.done)) throw new Error('Ya has completado todos los retos de hoy.');
  const used = st.list.map(c => c.id);
  const wide = Object.assign({}, s, { 'challenges.count': 5 });
  const cands = [];
  for (let attempt = 1; attempt <= 12; attempt++) {
    rcPickChallenges(d, wide, 'r' + attempt).forEach(id => { if (used.indexOf(id) < 0 && cands.indexOf(id) < 0) cands.push(id); });
  }
  let changed = 0;
  st.list = st.list.map(c => {
    if (c.done || !cands.length) return c;
    const cat = (rcChallengeDef(c.id) || {}).cat;
    let i = cands.findIndex(id => (rcChallengeDef(id) || {}).cat === cat);
    if (i < 0) i = 0;
    changed++;
    return newChallenge(cands.splice(i, 1)[0], s, st.counters);
  });
  if (!changed) throw new Error('No hay otros retos que puedan salir hoy. Añade más en "Retos que pueden salir".');
  st.rerolled = d;
}

async function challengeReroll() {
  const s = await getSettings();
  if (!s['fun.challenges']) throw new Error('Los retos diarios están apagados.');
  return challengeUpdate(null, rerollChallenges);
}

// Aplica un cambio a los retos de hoy (prepare: a la lista; mutator: a los contadores) y comprueba lo completado.
function challengeUpdate(mutator, prepare) {
  return locked('challenges', async () => {
    const s = await getSettings();
    if (!s['fun.challenges']) return null;
    const st = rollChallenges(await local('challenges', null), s);
    if (prepare) prepare(st, s);
    if (mutator) mutator(st.counters);
    const done = [];
    st.list.forEach(c => {
      const v = Math.min(c.goal, chValue(c.id, st.counters));
      if (v > c.progress) c.progress = v;
      if (!c.done && c.progress >= c.goal) {
        c.done = true;
        st.total += 1;
        done.push(rcChallengeText(c.id, c.goal));
      }
    });
    st.history[st.day] = st.list.filter(c => c.done).length;
    st.counts = st.counts || {};
    st.counts[st.day] = st.list.length;
    const allDone = st.list.length > 0 && st.list.every(c => c.done);
    let finishedToday = false;
    if (allDone && st.lastComplete !== st.day) {
      st.streak = st.lastComplete === yesterday(st.day) ? st.streak + 1 : 1;
      st.best = Math.max(st.best, st.streak);
      st.lastComplete = st.day;
      finishedToday = true;
    }
    const medals = [];
    RC_MEDALS.forEach(m => {
      if (st.medals[m.id]) return;
      if ((m.streak && st.streak >= m.streak) || (m.total && st.total >= m.total)) { st.medals[m.id] = st.day; medals.push(m); }
    });
    await setLocal({ challenges: st });

    const one = st.list.length === 1;
    const doneText = '¡Reto completado! ' + done.join(' · ');
    if (finishedToday) {
      const txt = (one ? '¡Has completado el reto de hoy!' : '¡Has completado todos los retos de hoy!') + ' Racha: ' + st.streak + (st.streak === 1 ? ' día.' : ' días.');
      // Sin confeti para "todos los del día", al menos se celebra el último reto.
      if (!await celebrate('challenges', txt, s) && done.length) await celebrate('challenge', doneText, s);
      if (s['challenges.notify']) await notify(one ? 'Reto de hoy completado' : 'Retos de hoy completados', txt, ROBLOX_URL + '/home');
    } else if (done.length) {
      await celebrate('challenge', doneText, s);
    }
    for (const m of medals) {
      await celebrate('medal', '¡Medalla nueva: ' + m.name + '! ' + m.text + '.', s);
      if (s['challenges.notifyMedals']) await notify('Medalla nueva: ' + m.name, m.text + '.', settingsUrl(s, 'challenges'));
    }
    return st;
  });
}

async function challengeEvent({ kind, data }) {
  if (['joinFriend', 'roulette', 'pin', 'note', 'wish', 'profile'].indexOf(kind) < 0) return null;
  if (kind === 'profile') {
    const me = await local('me', null);
    if (!data || !data.userId || (me && String(me.id) === String(data.userId))) return null;
  }
  return challengeUpdate(c => {
    if (kind === 'profile') { if (c.profiles.indexOf(String(data.userId)) < 0) c.profiles.push(String(data.userId)); }
    else c[kind] = 1;
  });
}

// ---------- Robux a dinero real ----------

async function fxRates(force) {
  const cache = await local('fxCache', null);
  if (!force && cache && Date.now() - cache.t < 12 * 3600 * 1000) return cache;
  try {
    const r = await api({ url: 'https://open.er-api.com/v6/latest/USD' });
    if (r.ok && r.data && r.data.rates) {
      const fresh = { t: Date.now(), rates: r.data.rates, updated: r.data.time_last_update_unix ? r.data.time_last_update_unix * 1000 : Date.now() };
      await setLocal({ fxCache: fresh });
      return fresh;
    }
  } catch (e) { /* sin conexión */ }
  return cache;
}

// Cuánto vale 1 R$ en la moneda elegida.
async function moneyRate() {
  const s = await getSettings();
  const cur = s['money.currency'];
  const per100 = Number(s['money.per100']) || 0;
  const symbol = (s['money.symbol'] || '').trim();
  if (cur === 'custom') return per100 > 0 ? { perRobux: per100 / 100, currency: null, symbol: symbol || '¤', manual: true } : { error: 'Pon el valor de 100 R$ en Ajustes → Robux y dinero.' };
  if (per100 > 0) return { perRobux: per100 / 100, currency: cur, manual: true };
  const devex = s['money.basis'] === 'devex';
  if (!devex && (cur === 'USD' || cur === 'EUR' || cur === 'GBP')) return { perRobux: 4.99 / 400, currency: cur };
  const usd = devex ? 0.0038 : 4.99 / 400;
  if (cur === 'USD') return { perRobux: usd, currency: 'USD' };
  const fx = await fxRates();
  const rate = fx && fx.rates && fx.rates[cur];
  if (!rate) return { error: 'No hay tipo de cambio para ' + cur + ' ahora mismo.' };
  return { perRobux: usd * rate, currency: cur, approx: true, fxUpdated: fx.updated };
}

// ---------- Servidor actual ----------

function serverLink(placeId, gameId) {
  return ROBLOX_URL + '/games/start?placeId=' + encodeURIComponent(placeId) + '&gameInstanceId=' + encodeURIComponent(gameId);
}

async function myServerNow() {
  const me = await authUser();
  if (!me) throw new Error('Inicia sesión en Roblox.');
  const [p] = await presence([me.id]);
  if (!p || p.userPresenceType !== 2) throw new Error('Ahora mismo no estás en ningún juego.');
  const placeId = p.placeId || p.rootPlaceId;
  if (!p.gameId || !placeId) throw new Error('Roblox no dice en qué servidor estás (puede que tu privacidad lo oculte).');
  await setLocal({ myServer: { placeId, rootPlaceId: p.rootPlaceId, gameId: p.gameId, universeId: p.universeId, name: p.lastLocation || '', t: Date.now() } });
  return { placeId, gameId: p.gameId, name: p.lastLocation || '', url: serverLink(placeId, p.gameId) };
}

// ---------- Trajes ----------

const AVATAR = 'https://avatar.roblox.com';

// m.roblox === false: solo los looks guardados con RoCer0 (el popup con "outfits.showRoblox" apagado).
async function outfitsList(m) {
  if (m && m.roblox === false) return { outfits: [], looks: await local('looks', []) };
  const me = await authUser();
  if (!me) throw new Error('Inicia sesión en Roblox.');
  let r = await api({ url: `${AVATAR}/v1/users/${me.id}/outfits?page=1&itemsPerPage=50&isEditable=true` });
  let list = r.ok && r.data && Array.isArray(r.data.data) ? r.data.data : null;
  if (!list) {
    r = await api({ url: `${AVATAR}/v2/avatar/users/${me.id}/outfits?page=1&itemsPerPage=50&isEditable=true` });
    list = r.ok && r.data && Array.isArray(r.data.data) ? r.data.data : [];
  }
  list = list.filter(o => !o.outfitType || o.outfitType === 'Avatar' || o.outfitType === 1);
  const imgs = {};
  for (let i = 0; i < list.length; i += 50) {
    const ids = list.slice(i, i + 50).map(o => o.id).join(',');
    const t = await api({ url: 'https://thumbnails.roblox.com/v1/users/outfits?userOutfitIds=' + ids + '&size=150x150&format=Png&isCircular=false' });
    if (t.ok && t.data && t.data.data) t.data.data.forEach(x => { imgs[x.targetId] = x.imageUrl; });
  }
  const looks = await local('looks', []);
  return { outfits: list.map(o => ({ id: o.id, name: o.name, img: imgs[o.id] || '' })), looks };
}

// Pone en tu avatar los objetos, colores, escalas y tipo de cuerpo guardados.
async function applyAvatar(a) {
  const post = (path, body) => api({ url: AVATAR + path, method: 'POST', body });
  const warnings = [];
  if (a.playerAvatarType) {
    const r = await post('/v1/avatar/set-player-avatar-type', { playerAvatarType: a.playerAvatarType });
    if (!r.ok) warnings.push('tipo de cuerpo');
  }
  const sc = a.scale || a.scales;
  if (sc) {
    const r = await post('/v1/avatar/set-scales', { height: sc.height, width: sc.width, head: sc.head, depth: sc.depth, proportion: sc.proportion, bodyType: sc.bodyType });
    if (!r.ok) warnings.push('escalas');
  }
  if (a.bodyColor3s) {
    const r = await post('/v2/avatar/set-body-colors', a.bodyColor3s);
    if (!r.ok) warnings.push('colores');
  } else if (a.bodyColors) {
    const r = await post('/v1/avatar/set-body-colors', a.bodyColors);
    if (!r.ok) warnings.push('colores');
  }
  const assets = (a.assets || []).map(x => (x.meta ? { id: x.id, meta: x.meta } : { id: x.id }));
  let r = await post('/v2/avatar/set-wearing-assets', { assets });
  if (!r.ok) r = await post('/v1/avatar/set-wearing-assets', { assetIds: assets.map(x => x.id) });
  if (!r.ok) {
    const msg = r.data && r.data.errors && r.data.errors[0] && r.data.errors[0].message;
    throw new Error('Roblox no aceptó el traje' + (msg ? ': ' + msg : ' (' + r.status + ')') + '.');
  }
  const invalid = (r.data && (r.data.invalidAssetIds || r.data.invalidAssets)) || [];
  if (invalid.length) warnings.push(invalid.length + (invalid.length === 1 ? ' objeto que ya no tienes' : ' objetos que ya no tienes'));
  await post('/v1/avatar/redraw-thumbnail').catch(() => {});
  return { ok: true, warnings };
}

async function wearOutfit({ id }) {
  let d = await api({ url: `${AVATAR}/v3/outfits/${id}/details` });
  if (!d.ok || !d.data || !d.data.assets) d = await api({ url: `${AVATAR}/v1/outfits/${id}/details` });
  if (!d.ok || !d.data || !d.data.assets) throw new Error('Roblox no dejó leer el traje (' + d.status + ').');
  return applyAvatar(d.data);
}

async function currentAvatar() {
  let r = await api({ url: `${AVATAR}/v2/avatar/avatar` });
  if (!r.ok || !r.data || !r.data.assets) r = await api({ url: `${AVATAR}/v1/avatar` });
  if (!r.ok || !r.data || !r.data.assets) throw new Error('No se pudo leer tu avatar (' + r.status + ').');
  const a = r.data;
  const out = { playerAvatarType: a.playerAvatarType, scale: a.scales || a.scale, assets: a.assets.map(x => (x.meta ? { id: x.id, meta: x.meta } : { id: x.id })) };
  if (a.bodyColor3s) out.bodyColor3s = a.bodyColor3s;
  else if (a.bodyColors) out.bodyColors = a.bodyColors;
  return out;
}

function lookSave({ name }) {
  return locked('looks', async () => {
    const me = await authUser();
    if (!me) throw new Error('Inicia sesión en Roblox.');
    const avatar = await currentAvatar();
    let img = '';
    const t = await api({ url: 'https://thumbnails.roblox.com/v1/users/avatar?userIds=' + me.id + '&size=150x150&format=Png&isCircular=false' });
    if (t.ok && t.data && t.data.data && t.data.data[0]) img = t.data.data[0].imageUrl || '';
    const looks = await local('looks', []);
    const look = { id: 'l' + Date.now().toString(36), name: (name || '').trim().slice(0, 40) || 'Look ' + (looks.length + 1), t: Date.now(), userId: me.id, avatar, img };
    looks.unshift(look);
    await setLocal({ looks: looks.slice(0, 60) });
    return look;
  });
}

async function lookWear({ id }) {
  const look = (await local('looks', [])).find(l => l.id === id);
  if (!look) throw new Error('Ese look ya no existe.');
  return applyAvatar(look.avatar);
}

function lookDelete({ id }) {
  return locked('looks', async () => {
    const looks = (await local('looks', [])).filter(l => l.id !== id);
    await setLocal({ looks });
    return looks;
  });
}

// ---------- Abrir los ajustes ----------

// Los ajustes viven en una pestaña "RoCer0" dentro de los Ajustes de Roblox; si está apagada, en la página aparte.
// tab: id de una sección de RX_SECTIONS, o "start" (la página de ajustes lo cambia por la sección de inicio que elegiste).
async function openSettings(m) {
  const s = await getSettings();
  const tab = String((m && m.tab) || 'start').replace(/[^a-z-]/gi, '') || 'start';
  if (!s['nav.settingsTab']) return B.tabs.create({ url: B.runtime.getURL('options/options.html#' + tab) });
  const url = ROBLOX_URL + '/my/account?rocer0=' + tab;
  const open = await B.tabs.query({ url: '*://www.roblox.com/my/account*' }).catch(() => []);
  if (open && open[0]) {
    await B.tabs.update(open[0].id, { url, active: true });
    if (open[0].windowId !== undefined && B.windows) B.windows.update(open[0].windowId, { focused: true }).catch(() => {});
    return true;
  }
  return B.tabs.create({ url });
}

// ---------- Eventos ----------

B.alarms.onAlarm.addListener(a => { if (a.name === 'poll') poll().catch(e => console.warn('[RC] poll', e)); });

B.notifications && B.notifications.onClicked.addListener(id => {
  const url = id.split('|').slice(2).join('|');
  if (url) B.tabs.create({ url });
  B.notifications.clear(id);
});

B.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) setupAlarm();
});

// En la 0.2 las imágenes de fondo iban todas juntas en "themeImages"; ahora cada tema tiene su clave (rkImg:<tema>).
async function migrateThemeImages() {
  const { themeImages } = await B.storage.local.get('themeImages');
  if (!themeImages || typeof themeImages !== 'object') return;
  const ids = Object.keys(themeImages).filter(id => typeof themeImages[id] === 'string');
  const have = ids.length ? await B.storage.local.get(ids.map(id => 'rkImg:' + id)) : {};
  const set = {};
  ids.forEach(id => { if (!have['rkImg:' + id]) set['rkImg:' + id] = themeImages[id]; });
  if (Object.keys(set).length) await B.storage.local.set(set);
  await B.storage.local.remove('themeImages');
}

B.runtime.onInstalled.addListener(details => {
  setupAlarm(true);
  migrateThemeImages().catch(e => console.warn('[RC] migrate', e));
  if (details.reason === 'install') B.runtime.openOptionsPage();
});
B.runtime.onStartup && B.runtime.onStartup.addListener(() => {
  setupAlarm(true);
  migrateThemeImages().catch(e => console.warn('[RC] migrate', e));
});

// ---------- Mensajes ----------

const handlers = {
  api,
  ping,
  rolimons: m => rolimons(m.force),
  serverRegion,
  recordJoin,
  assetInspect,
  heartbeat,
  'accounts:list': accountsList,
  'accounts:save': saveCurrentAccount,
  'accounts:switch': switchAccount,
  'accounts:add': addNewAccount,
  'accounts:remove': removeAccount,
  'social:poll': poll,
  // La de prueba sale siempre: sin mirar "notify.all" ni el horario de silencio.
  'notify:test': () => notify('Prueba', 'Las notificaciones funcionan.', ROBLOX_URL + '/home', null, true),
  'challenges:get': () => challengeUpdate(null),
  'challenges:reroll': challengeReroll,
  'challenge:event': challengeEvent,
  'played:seed': playedSeed,
  'wishlist:add': wishlistAdd,
  'wishlist:remove': wishlistRemove,
  'wishlist:update': wishlistUpdate,
  'wishlist:check': () => checkWishlist(),
  'outfits:list': outfitsList,
  'outfit:wear': wearOutfit,
  'look:save': lookSave,
  'look:wear': lookWear,
  'look:delete': lookDelete,
  'myServer:get': myServerNow,
  'robux:now': robuxNow,
  moneyRate,
  'fx:refresh': () => fxRates(true),
  openTab: m => B.tabs.create({ url: m.url }),
  openOptions: m => (m && m.hash ? B.tabs.create({ url: B.runtime.getURL('options/options.html#' + m.hash) }) : B.runtime.openOptionsPage()),
  openSettings: openSettings
};

B.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const h = msg && handlers[msg.type];
  if (!h) return false;
  Promise.resolve().then(() => h(msg)).then(
    result => sendResponse({ result }),
    error => sendResponse({ error: String(error && error.message || error) })
  );
  return true;
});
