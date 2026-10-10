// Debug E2E placement: check whether the ghost tile at the click point is
// placeable, and probe what the click actually did (does any tree get placed?).
import pw from 'playwright-core';
import http from 'http';
import fs from 'fs';

const HTML = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
let cdnThree = null;
try {
  const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', { signal: AbortSignal.timeout(8000) });
  if (r.ok) cdnThree = await r.text();
} catch {}
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  const inlined = cdnThree
    ? HTML.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script>' + cdnThree + '</script>')
          .replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', '<script>window.lucide={createIcons(){}};</script>')
    : HTML;
  res.end(inlined);
}).listen(8899);

const browser = await pw.firefox.launch({
  headless: true,
  executablePath: '/home/freddyz/.cache/ms-playwright/firefox-1543/firefox/firefox',
  firefoxUserPrefs: { 'dom.webgpu.enabled': true, 'webgl.disabled': false, 'gfx.webrender.software': true, 'layers.acceleration.force': true },
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
await page.goto('http://localhost:8899/', { waitUntil: 'load' });
await page.waitForTimeout(4500);

await page.click('.item[data-def="tree"]');
await page.waitForTimeout(300);
const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const px = box.x + box.width * 0.5, py = box.y + box.height * 0.72;
await page.mouse.move(px, py, { steps: 8 });
await page.waitForTimeout(200);

// probe tile + canPlace for the tile before clicking
const probe = await page.evaluate(() => {
  try { const t = placing.tile; return { tile: t, ok: canPlace(placing.def, t.x, t.z), count: objects.length }; }
  catch(e) { return { err: String(e) }; }
});
console.log('pre-click probe:', probe);

// instrument placeUserAt: log when called
page.on('console', m => { if (m.text().startsWith('PROBE')) console.log(m.text()); });
await page.evaluate(() => { const orig = placeUserAt; window.__orig = orig; });
await page.mouse.click(px, py);
await page.waitForTimeout(400);
console.log('post click:', await page.evaluate(() => ({ total: objects.length, trees: objects.filter(o=>o.defId==='tree').length })), 'errors:', pageErrors.length);

await browser.close(); server.close(); process.exit(0);
