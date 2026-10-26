// Renders the 1200x630 Open Graph images into public/og/ with headless Chrome:
// one for the home and one per file in content/servicos.
// Run locally after adding or changing a service: `node scripts/og.mjs`
// (set CHROME_PATH if Chrome is not in the default Windows location).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = join(root, 'public/og');
const img = (p) => pathToFileURL(join(root, 'public', p)).href;
mkdirSync(outDir, { recursive: true });

const base = (inner) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600&family=Geist+Mono&family=Instrument+Serif:ital@1&display=block">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { background: #F5F2ED; color: #111; font-family: 'Geist', sans-serif; padding: 64px 72px; position: relative; }
  .brand { font-weight: 600; font-size: 26px; letter-spacing: -0.01em; }
  .mono { font-family: 'Geist Mono', monospace; font-size: 18px; text-transform: uppercase; letter-spacing: .08em; color: #6B6862; }
  .serif { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; color: #E0321F; }
</style></head><body>${inner}</body></html>`;

const homeHtml = base(`
  <div class="brand">Diogo Abílio</div>
  <h1 style="position:absolute;left:72px;top:150px;width:640px;font-size:68px;line-height:1.04;letter-spacing:-0.04em;font-weight:600">Seu negócio é bom.<br>Sua <span class="serif" style="text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:10px">comunicação</span><br>mostra isso?</h1>
  <img src="${img('img/foto-diogo-800.webp')}" style="position:absolute;right:72px;top:64px;width:400px;height:502px;object-fit:cover;border-radius:24px">
`);

const serviceHtml = (s) => {
  const media = s.cardImage
    ? `<div style="position:absolute;right:72px;top:156px;width:600px;height:318px;border-radius:20px;overflow:hidden"><img src="${img(s.cardImage.src.replace(/^\//, '').replace('-800', '-1400'))}" style="width:100%;height:100%;object-fit:cover"></div>`
    : `<div style="position:absolute;right:72px;top:64px;width:520px;height:502px;display:grid;place-items:center;background:#fff;border:2px dashed #C9C2B7;border-radius:20px" class="mono">Trabalho novo chegando</div>`;
  return base(`
  <div class="brand">Diogo Abílio</div>
  <h1 style="position:absolute;left:72px;top:186px;width:${s.cardImage ? 400 : 470}px;font-size:72px;line-height:1.02;letter-spacing:-0.03em;font-weight:600">${s.name}</h1>
  <div class="mono" style="position:absolute;left:72px;bottom:64px;color:#111">${s.price}</div>
  ${media}
`);
};

const render = (name, html) => {
  const dir = mkdtempSync(join(tmpdir(), 'og-'));
  const file = join(dir, 'og.html');
  writeFileSync(file, html);
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=5000',
    '--window-size=1200,630', `--screenshot=${join(outDir, name + '.png')}`, pathToFileURL(file).href,
  ], { stdio: 'ignore' });
  rmSync(dir, { recursive: true, force: true });
  console.log(`og/${name}.png`);
};

render('home', homeHtml);
for (const f of readdirSync(join(root, 'content/servicos')).filter((f) => f.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(join(root, 'content/servicos', f), 'utf8'));
  render(s.slug, serviceHtml(s));
}
