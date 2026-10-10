// Debug E2E pointer plumbing: replay what the browser actually dispatches, and
// log the pointerup branch paths by monkey-patching placeUserAt to a console-logged wrapper.
import pw from 'playwright-core';
import http from 'http';
import fs from 'fs';

const HTML = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
let cdnThree = null;
try { const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', { signal: AbortSignal.timeout(8000) }); if (r.ok) cdnThree = await r.text(); } catch {}
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(cdnThree ? HTML.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script>' + cdnThree + '</script>').replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', '<script>window.lucide={createIcons(){}};</script>') : HTML);
}).listen(8899);

const browser = await pw.firefox.launch({ headless: true, executablePath: '/home/freddyz/.cache/ms-playwright/firefox-1543/firefox/firefox', firefoxUserPrefs: { 'dom.webgpu.enabled': true, 'webgl.disabled': false, 'gfx.webrender.software': true, 'layers.acceleration.force': true } });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.text().startsWith('[dbg]')) console.log(m.text()); });
await page.goto('http://localhost:8899/', { waitUntil: 'load' });
await page.waitForTimeout(4500);

await page.click('.item[data-def="tree"]');
await page.waitForTimeout(300);

// instrument placeUserAt + canvas listeners
await page.evaluate(() => {
  const orig = placeUserAt;
  window.placeUserAt = function (tx, tz, quiet) { console.log('[dbg] placeUserAt called', tx, tz, quiet); return orig(tx, tz, quiet); };
  const c = document.getElementById('scene');
  ['pointerdown','pointerup'].forEach(t => c.addEventListener(t, e => console.log('[dbg]', t, e.button, 'target===canvas:', e.target === c, 'x', e.clientX, 'y', e.clientY)));
});
await page.waitForTimeout(200);

const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const px = box.x + box.width * 0.5, py = box.y + box.height * 0.72;
await page.mouse.move(px, py, { steps: 8 });
await page.waitForTimeout(200);
await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up();
await page.waitForTimeout(500);
console.log('trees:', await page.evaluate(() => objects.filter(o => o.defId === 'tree').length), 'errors:', errors.length, errors.slice(0, 2));
await browser.close(); server.close(); process.exit(0);
