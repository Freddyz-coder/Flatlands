// Debug E2E placement: patch the REAL lines with grep-exact anchors, confirming each patch hit.
import pw from 'playwright-core';
import http from 'http';
import fs from 'fs';

const HTML = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
let cdnThree = null;
try { const r = await fetch('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', { signal: AbortSignal.timeout(8000) }); if (r.ok) cdnThree = await r.text(); } catch {}

function patchOnce(hay, needle, repl) {
  if (!hay.includes(needle)) { console.error('PATCH MISS:', JSON.stringify(needle.slice(0, 60))); process.exit(1); }
  return hay.replace(needle, repl);
}
let patched = HTML
  .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script>' + cdnThree + '</script>')
  .replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', '<script>window.lucide={createIcons(){}};</script>');
patched = patchOnce(patched,
  "  if(wasPan){\n    const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y)>5;",
  "  if(wasPan){\n    console.log('[dbg] wasPan branch, moved would be', Math.hypot(e.clientX-d.x,e.clientY-d.y)>5, 'button', d.b);\n    const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y)>5;");
patched = patchOnce(patched,
  "  if(e.target!==canvas)return;\n  if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;",
  "  console.log('[dbg] post-pan: targetOk', e.target===canvas, 'dist', (Math.hypot(e.clientX-d.x,e.clientY-d.y)).toFixed(2), 'painting?', painting, 'painted', painted);\n  if(e.target!==canvas)return;\n  if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;");
patched = patchOnce(patched,
  "    if(placing){ if(!painted)placeUserAt(",
  "    if(placing){ console.log('[dbg] placing+placing branch, painted='+painted); if(!painted)placeUserAt(");
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(patched);
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
const canvas = await page.$('#scene');
const box = await canvas.boundingBox();
const px = box.x + box.width * 0.6, py = box.y + box.height * 0.75;
await page.mouse.move(px, py, { steps: 6 });
await page.waitForTimeout(150);
await page.mouse.click(px, py);
await page.waitForTimeout(500);
console.log('trees:', await page.evaluate(() => objects.filter(o => o.defId === 'tree').length), 'errors:', errors.length, errors.slice(0, 2));
await browser.close(); server.close(); process.exit(0);
