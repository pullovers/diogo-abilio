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
  body {
    background: radial-gradient(45% 55% at 60% 38%, rgba(139, 61, 255, .45), transparent 70%), #0A0A0B;
    color: #F3F1ED; font-family: 'Geist', sans-serif; padding: 56px 72px; position: relative;
  }
  .brand { font-weight: 600; font-size: 24px; letter-spacing: -0.01em; }
  .mono { font-family: 'Geist Mono', monospace; font-size: 18px; text-transform: uppercase; letter-spacing: .08em; color: #9B978F; }
  .grad { background: linear-gradient(95deg, #CF97FF, #A970FF 45%, #8B3DFF); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .gold { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; color: #D4B872; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 8px; }
</style></head><body>${inner}</body></html>`;

const homeHtml = base(`
  <div class="brand" style="position:absolute;left:72px;top:48px">Diogo Abílio</div>
  <img src="${img('images/diogo-float-1200.webp')}" style="position:absolute;left:50%;top:40px;width:760px;margin-left:-380px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6))">
  <h1 style="position:absolute;left:0;right:0;bottom:56px;text-align:center;font-size:46px;line-height:1.1;letter-spacing:-0.035em;font-weight:600">Eu descubro onde sua empresa<br>está <span class="grad">perdendo venda</span>. Depois, <span class="gold">resolvo</span>.</h1>
`);

const serviceHtml = (s) => {
  const media = s.cardImage
    ? `<div style="position:absolute;right:72px;top:156px;width:600px;height:318px;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.16)"><img src="${img(s.cardImage.src.replace(/^\//, '').replace('-800', '-1400'))}" style="width:100%;height:100%;object-fit:cover"></div>`
    : '';
  const width = s.cardImage ? 420 : 900;
  return base(`
  <div class="brand">Diogo Abílio</div>
  <div class="mono" style="position:absolute;left:72px;top:150px">${s.label}</div>
  <h1 style="position:absolute;left:72px;top:196px;width:${width}px;font-size:${s.cardImage ? 52 : 76}px;line-height:1.04;letter-spacing:-0.03em;font-weight:600">${s.name}</h1>
  <div class="mono" style="position:absolute;left:72px;bottom:64px;color:#F3F1ED">${s.price}</div>
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
