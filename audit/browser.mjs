// Shared, deterministic browser-test support.  Browser suites serve the shipped
// HTML with the repository's pinned three.js copy and a minimal Lucide adapter;
// they never depend on a live CDN or a machine-specific browser path.
import { createRequire } from 'module';
import fs from 'fs';
import http from 'http';
import pw from 'playwright-core';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(new URL('../3dsandbox.html', import.meta.url), 'utf8');
const three = fs.readFileSync(require.resolve('three/build/three.min.js'));
const lucide = 'window.lucide={createIcons(){}};';
const appHtml = html
  // Fonts are cosmetic; remove their live requests from the test fixture so an
  // offline browser run tests application behavior rather than CDN availability.
  .replace(/<link[^>]+fonts\.gstatic[^>]*>\s*/g, '')
  .replace(/<link[^>]+fonts\.googleapis[^>]*>\s*/g, '')
  .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="/vendor/three.min.js"></script>')
  .replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', '<script src="/vendor/lucide.js"></script>');

export async function startAppServer(){
  const server = http.createServer((req,res)=>{
    const path = new URL(req.url, 'http://localhost').pathname;
    if(path==='/vendor/three.min.js')return res.writeHead(200,{'content-type':'text/javascript'}).end(three);
    if(path==='/vendor/lucide.js')return res.writeHead(200,{'content-type':'text/javascript'}).end(lucide);
    if(path==='/'||path==='/3dsandbox.html')return res.writeHead(200,{'content-type':'text/html'}).end(appHtml);
    res.writeHead(404,{'content-type':'text/plain'}).end('not found');
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  return { server, url:`http://127.0.0.1:${port}/` };
}

export async function launchFirefox(){
  // playwright-core uses its configured browser cache when no executable is set.
  // An override supports CI without making a developer-home path part of the test.
  const executablePath=process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE;
  return pw.firefox.launch({
    headless:true,
    ...(executablePath?{executablePath}:{}),
    firefoxUserPrefs:{
      'webgl.disabled':false,
      'gfx.webrender.software':true,
      'layers.acceleration.force':true,
    },
  });
}

export async function openReadyPage(browser,url,events){
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',error=>events.pageErrors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')events.consoleErrors.push(message.text());});
  page.on('requestfailed',request=>events.failedRequests.push(request.url()));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:10000});
  await page.waitForFunction(() =>
    typeof THREE!=='undefined' &&
    document.getElementById('scene') &&
    objects.length===STARTER.length &&
    /^\d+ fps$/.test(document.getElementById('statFps').textContent),
    undefined,{timeout:12000});
  return page;
}

export function assertNoCriticalBrowserErrors(events,assert){
  assert(events.pageErrors.length===0,'no uncaught page errors',events.pageErrors.join('\n'));
  assert(events.consoleErrors.length===0,'no console errors',events.consoleErrors.join('\n'));
  assert(events.failedRequests.length===0,'no failed network requests',events.failedRequests.join('\n'));
}

