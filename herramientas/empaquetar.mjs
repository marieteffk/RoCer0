// Crea los dos zips de RoCer0 a partir de la carpeta de la extensión:
//   rocer0-firefox-<versión>.zip   (Firefox: fondo con background.scripts)
//   rocer0-chromium-<versión>.zip  (Chrome, Brave, Edge y Opera: fondo con service_worker)
// Uso: node herramientas/empaquetar.mjs [carpeta de la extensión] [carpeta de salida]
// Necesita Node.js 18 o posterior y el comando zip.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const src = path.resolve(process.argv[2] || 'extension');
const out = path.resolve(process.argv[3] || 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
const version = manifest.version;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function build(name, adapt) {
  const dir = path.join(out, name);
  fs.cpSync(src, dir, { recursive: true, filter: f => !path.basename(f).startsWith('.') });
  const m = structuredClone(manifest);
  adapt(m);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  const zip = path.join(out, `rocer0-${name}-${version}.zip`);
  execFileSync('zip', ['-qrX', zip, '.'], { cwd: dir });
  console.log(path.relative(process.cwd(), zip));
}

build('firefox', m => {
  delete m.background.service_worker;
  delete m.minimum_chrome_version;
});
build('chromium', m => {
  m.background = { service_worker: m.background.service_worker || 'background.js' };
  delete m.browser_specific_settings;
  m.minimum_chrome_version = '111';
});
