// Lector mínimo de modelos de Roblox (.rbxm binario y .rbxmx XML).
// Saca el árbol de instancias (clase + nombre), los IDs de contenido y busca patrones
// sospechosos en el código. Se usa en el detector de plugins y en el botón Explorador.

var RXRbxm = (function () {
  function lz4(src, outLen) {
    var dst = new Uint8Array(outLen), s = 0, d = 0;
    while (s < src.length) {
      var tok = src[s++], lit = tok >> 4, b;
      if (lit === 15) { do { b = src[s++]; lit += b; } while (b === 255); }
      for (var i = 0; i < lit; i++) dst[d++] = src[s++];
      if (s >= src.length) break;
      var off = src[s] | (src[s + 1] << 8); s += 2;
      var ml = tok & 15;
      if (ml === 15) { do { b = src[s++]; ml += b; } while (b === 255); }
      ml += 4;
      var p = d - off;
      for (var j = 0; j < ml; j++) dst[d++] = dst[p++];
    }
    return dst;
  }

  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function interleaved(b, o, n) {
    var out = new Array(n);
    for (var i = 0; i < n; i++) {
      var v = ((b[o + i] << 24) | (b[o + n + i] << 16) | (b[o + 2 * n + i] << 8) | b[o + 3 * n + i]) >>> 0;
      out[i] = (v >>> 1) ^ -(v & 1);
    }
    return out;
  }

  function refs(b, o, n) {
    var v = interleaved(b, o, n);
    for (var i = 1; i < n; i++) v[i] += v[i - 1];
    return v;
  }

  var utf8 = new TextDecoder('utf-8');
  var latin1 = new TextDecoder('latin1');

  function str(b, o) {
    var len = u32(b, o);
    return { s: utf8.decode(b.subarray(o + 4, o + 4 + len)), end: o + 4 + len };
  }

  function parseBinary(bytes) {
    var classes = {}, insts = {}, parents = null, textParts = [], unsupported = false;
    var o = 32;
    while (o + 16 <= bytes.length) {
      var name = latin1.decode(bytes.subarray(o, o + 4));
      var clen = u32(bytes, o + 4), len = u32(bytes, o + 8);
      o += 16;
      var data;
      if (clen === 0) { data = bytes.subarray(o, o + len); o += len; }
      else {
        var raw = bytes.subarray(o, o + clen); o += clen;
        if (raw[0] === 0x28 && raw[1] === 0xB5 && raw[2] === 0x2F && raw[3] === 0xFD) { unsupported = true; continue; }
        data = lz4(raw, len);
      }
      if (name === 'END\0') break;
      textParts.push(latin1.decode(data));
      try {
        if (name === 'INST') {
          var cid = u32(data, 0), cn = str(data, 4), p = cn.end + 1, count = u32(data, p);
          var r = refs(data, p + 4, count);
          classes[cid] = { name: cn.s, refs: r };
          r.forEach(function (ref) { insts[ref] = { cls: cn.s, name: cn.s, children: [] }; });
        } else if (name === 'PROP') {
          var cid2 = u32(data, 0), pn = str(data, 4), type = data[pn.end];
          if (pn.s === 'Name' && type === 0x01 && classes[cid2]) {
            var q = pn.end + 1;
            classes[cid2].refs.forEach(function (ref) { var sv = str(data, q); q = sv.end; if (insts[ref]) insts[ref].name = sv.s; });
          }
        } else if (name === 'PRNT') {
          var n = u32(data, 1);
          parents = { children: refs(data, 5, n), parents: refs(data, 5 + 4 * n, n) };
        }
      } catch (e) { /* chunk raro: se ignora */ }
    }
    var roots = [];
    if (parents) {
      for (var i = 0; i < parents.children.length; i++) {
        var c = insts[parents.children[i]], par = insts[parents.parents[i]];
        if (!c) continue;
        if (par) par.children.push(c); else roots.push(c);
      }
    } else {
      for (var k in insts) roots.push(insts[k]);
    }
    return { roots: roots, text: textParts.join('\n'), count: Object.keys(insts).length, unsupported: unsupported };
  }

  function parseXml(text) {
    var roots = [], stack = [], count = 0;
    var re = /<Item\s+class="([^"]+)"[^>]*>|<\/Item>|<string\s+name="Name">([^<]*)<\/string>/g, m;
    while ((m = re.exec(text))) {
      if (m[1]) {
        var node = { cls: m[1], name: m[1], children: [] }; count++;
        if (stack.length) stack[stack.length - 1].children.push(node); else roots.push(node);
        stack.push(node);
      } else if (m[0] === '</Item>') stack.pop();
      else if (stack.length && m[2] !== undefined) stack[stack.length - 1].name = m[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    return { roots: roots, text: text, count: count, unsupported: false };
  }

  var CHECKS = [
    { re: /require\s*\(\s*\d{6,}\s*\)/, level: 3, msg: 'Carga un módulo externo por ID con require(número): la forma más común de meter puertas traseras.' },
    { re: /discord(?:app)?\.com\/api\/webhooks/i, level: 3, msg: 'Envía datos a un webhook de Discord.' },
    { re: /(?:\\\d{2,3}){12,}/, level: 3, msg: 'Texto ofuscado con secuencias \\123\\456 (oculta lo que hace).' },
    { re: /getfenv|setfenv/, level: 2, msg: 'Usa getfenv/setfenv, típico de código ofuscado.' },
    { re: /loadstring/, level: 2, msg: 'Usa loadstring para ejecutar código generado.' },
    { re: /InsertService\s*:\s*LoadAsset/, level: 2, msg: 'Inserta modelos externos con InsertService:LoadAsset.' },
    { re: /string\.reverse|string\.char\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/, level: 1, msg: 'Construye texto con string.char/string.reverse (posible ofuscación).' },
    { re: /ServerScriptService[\s\S]{0,200}Instance\.new\s*\(\s*["']Script|Instance\.new\s*\(\s*["']Script["']\s*\)[\s\S]{0,200}ServerScriptService/, level: 2, msg: 'Crea scripts dentro de ServerScriptService de tu juego.' },
    { re: /HttpService[\s\S]{0,80}(?:PostAsync|RequestAsync)/, level: 1, msg: 'Envía peticiones HTTP a internet.' },
    { re: /MarketplaceService[\s\S]{0,80}Prompt\w*Purchase/, level: 1, msg: 'Puede abrir ventanas de compra.' }
  ];

  function scan(text) {
    var found = [];
    CHECKS.forEach(function (c) { if (c.re.test(text)) found.push({ level: c.level, msg: c.msg }); });
    if (/[^\n]{20000,}/.test(text)) found.push({ level: 2, msg: 'Tiene líneas de código enormes, señal de ofuscación.' });
    return found;
  }

  function contentIds(text) {
    var ids = {}, re = /(?:rbxassetid:\/\/|[?&]id=)(\d{3,})/g, m;
    while ((m = re.exec(text))) ids[m[1]] = true;
    return Object.keys(ids);
  }

  function slim(node, depth) {
    return { c: node.cls, n: node.name, k: depth > 12 ? [] : node.children.slice(0, 200).map(function (ch) { return slim(ch, depth + 1); }) };
  }

  function inspect(buffer) {
    var bytes = new Uint8Array(buffer);
    var head = latin1.decode(bytes.subarray(0, 16));
    var res;
    if (head.indexOf('<roblox!') === 0) res = parseBinary(bytes);
    else if (/<roblox/i.test(utf8.decode(bytes.subarray(0, 200)))) res = parseXml(utf8.decode(bytes));
    else return { format: 'other', size: bytes.length, tree: [], contentIds: [], findings: [], count: 0 };
    var scripts = (res.text.match(/\b(?:Script|LocalScript|ModuleScript)\b/g) || []).length;
    return {
      format: head.indexOf('<roblox!') === 0 ? 'rbxm' : 'rbxmx',
      size: bytes.length,
      count: res.count,
      unsupported: res.unsupported,
      tree: res.roots.slice(0, 200).map(function (r) { return slim(r, 0); }),
      contentIds: contentIds(res.text).slice(0, 300),
      findings: scan(res.text),
      scriptMentions: scripts
    };
  }

  return { inspect: inspect, scan: scan };
})();
