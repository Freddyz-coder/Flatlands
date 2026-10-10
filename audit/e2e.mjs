// Browser E2E: verifies real startup and user input against the shipped page.
import { assertNoCriticalBrowserErrors, launchFirefox, openReadyPage, startAppServer } from './browser.mjs';

let pass=0,fail=0,browser,server;
const events={pageErrors:[],consoleErrors:[],failedRequests:[]};
function test(condition,name,detail=''){
  if(condition){pass++;console.log(`  PASS: ${name}${detail?` (${detail})`:''}`);}
  else{fail++;console.error(`  FAIL: ${name}${detail?` (${detail})`:''}`);}
}
async function pickPlaceablePoint(page){
  const canvas=await page.$('#scene');
  const box=await canvas.boundingBox();
  for(const [x,y] of [[.50,.72],[.18,.74],[.78,.72],[.20,.35],[.74,.35]]){
    const point={x:box.x+box.width*x,y:box.y+box.height*y};
    await page.mouse.move(point.x,point.y);
    const valid=await page.evaluate(()=>!!(placing&&placing.tile&&canPlace(placing.def,placing.tile.x,placing.tile.z)));
    if(valid)return point;
  }
  return null;
}

try{
  const fixture=await startAppServer(); server=fixture.server;
  browser=await launchFirefox();
  const page=await openReadyPage(browser,fixture.url,events);

  const startup=await page.evaluate(()=>({
    three:typeof THREE!=='undefined', count:objects.length, expected:STARTER.length,
    max:MAXO, counter:document.getElementById('statThings').textContent,
    fps:document.getElementById('statFps').textContent,
  }));
  test(startup.three,'Three.js initializes from the local fixture');
  test(startup.count===startup.expected,'Genesis reaches its complete starter state',`${startup.count}/${startup.expected}`);
  test(startup.counter===`${startup.expected} / ${startup.max} things`,'HUD object counter matches registry',startup.counter);
  test(/^\d+ fps$/.test(startup.fps),'HUD reports a numeric frame rate',startup.fps);

  await page.click('.item[data-def="tree"]');
  await page.waitForFunction(()=>placing&&placing.defId==='tree',undefined,{timeout:2000});
  const treePoint=await pickPlaceablePoint(page);
  test(!!treePoint,'A valid UI placement point can be previewed for a tree');
  if(treePoint){
    const before=await page.evaluate(()=>objects.length);
    await page.mouse.click(treePoint.x,treePoint.y);
    await page.waitForFunction(expected=>objects.length===expected,before+1,{timeout:2000});
    const after=await page.evaluate(()=>objects.length);
    test(after===before+1,'Clicking the canvas places one tree through the UI',`${before} -> ${after}`);

    await page.keyboard.press('Control+z');
    await page.waitForFunction(expected=>objects.length===expected,before,{timeout:2000});
    test(await page.evaluate(expected=>objects.length===expected,before),'Ctrl+Z removes the UI placement');
  }else{
    test(false,'Clicking the canvas places one tree through the UI','no valid preview point');
    test(false,'Ctrl+Z removes the UI placement','tree was not placed');
  }

  await page.click('.item[data-def="railway"]');
  await page.waitForFunction(()=>placing&&placing.defId==='railway',undefined,{timeout:2000});
  const railPoint=await pickPlaceablePoint(page);
  test(!!railPoint,'A valid UI placement point can be previewed for a railway');
  if(railPoint){
    const initialRails=await page.evaluate(()=>objects.filter(o=>o.defId==='railway').length);
    await page.mouse.move(railPoint.x,railPoint.y);
    await page.mouse.down();
    await page.mouse.move(railPoint.x+100,railPoint.y,{steps:12});
    await page.mouse.up();
    await page.waitForFunction(before=>objects.filter(o=>o.defId==='railway').length>before,initialRails,{timeout:2000});
    const rails=await page.evaluate(()=>objects.filter(o=>o.defId==='railway').length);
    test(rails>initialRails,'Dragging on the canvas paints railway tiles',`${initialRails} -> ${rails}`);
  }else test(false,'Dragging on the canvas paints railway tiles','no valid preview point');

  const clock=await page.evaluate(()=>({label:clockTime.textContent,phase:clockPhase.textContent}));
  test(/^\d{2}:\d{2}$/.test(clock.label)&&clock.phase,'HUD clock exposes simulated time and phase');
  await page.click('#gearBtn');
  await page.click('[data-set="autoTime"]');
  test(await page.evaluate(()=>worldTime.auto===false&&!prefs.autoTime),'Automatic time can be paused from Settings');
  await page.evaluate(()=>{const input=document.getElementById('timeRange');input.value='1080';input.dispatchEvent(new Event('input',{bubbles:true}));});
  test(await page.evaluate(()=>clockTime.textContent==='18:00'&&clockPhase.textContent==='DUSK'),'Scrubbing time updates the clock and dusk lighting phase');
  await page.click('#timeDawn');
  test(await page.evaluate(()=>clockTime.textContent==='06:00'&&worldTime.hours===6),'Dawn control resets simulated time');
  await page.evaluate(()=>{const input=document.getElementById('timeSpeed');input.value='0.12';input.dispatchEvent(new Event('input',{bubbles:true}));});
  test(await page.evaluate(()=>Math.abs(worldTime.speed-.12)<1e-9),'Cycle speed control updates simulated speed');
  const canvas=await page.$('#scene');
  const canvasBox=await canvas.boundingBox();
  await page.mouse.move(canvasBox.x+canvasBox.width*.5,canvasBox.y+canvasBox.height*.5);
  const zoomStart=await page.evaluate(()=>cam.targetDist);
  await page.mouse.wheel(0,-100);
  const zoomIn=await page.evaluate(()=>cam.targetDist);
  await page.mouse.wheel(0,100);
  const zoomOut=await page.evaluate(()=>cam.targetDist);
  test(zoomIn<zoomStart&&zoomOut>zoomIn,'Wheel up zooms in and wheel down zooms out');
  await page.click('[data-set="zoomReverse"]');
  await page.mouse.move(canvasBox.x+canvasBox.width*.5,canvasBox.y+canvasBox.height*.5);
  const reverseStart=await page.evaluate(()=>cam.targetDist);
  await page.mouse.wheel(0,-100);
  test(await page.evaluate(start=>cam.targetDist>start,reverseStart),'Reverse wheel zoom preference is applied');
  assertNoCriticalBrowserErrors(events,test);
  await page.close();
}catch(error){
  fail++; console.error('UNEXPECTED E2E ERROR:',error?.stack||error);
}finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
}
console.log(`E2E SUMMARY: ${pass} passed, ${fail} failed.`);
process.exitCode=fail?1:0;
