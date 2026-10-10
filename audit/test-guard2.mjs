// The click at 640,576 lands at NDC y=-0.44, ray hits z≈+6.4 (tile z=43),
// inside genesis pre-plotted overlap; tree at (45,40) rejected -> ok guard works.
// Verify with a known-free tile: move pointer so ghost tile is (10,10) (far west-south).
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
await page.goto('http://localhost:8899/', { waitUntil: 'load' });
await page.waitForTimeout(4500);
await page.click('.item[data-def="tree"]');
await page.waitForTimeout(200);
// pan the camera FIRST: use WASD to drift the view, then re-hover
await page.keyboard.down('s'); // drift south
await page.waitForTimeout(1200);
await page.keyboard.up('s');
await page.waitForTimeout(200);
const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const px = box.x + box.width * 0.6, py = box.y + box.height * 0.75;
await page.mouse.move(px, py, { steps: 6 });
await page.waitForTimeout(200);
const tileProbe = await page.evaluate(() => ({ tile: placing && placing.tile, ok: placing && placing.tile ? canPlace(placing.def, placing.tile.x, placing.tile.z) : null }));
console.log('tile probe after camera drift:', tileProbe);
await page.mouse.click(px, py);
await page.waitForTimeout(500);
console.log('trees:', await page.evaluate(() => objects.filter(o => o.defId === 'tree').length), 'total:', await page.evaluate(() => objects.length), 'errors:', errors.length);
await browser.close(); server.close(); process.exit(0);
