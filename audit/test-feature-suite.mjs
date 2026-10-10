// Focused regression checks for the Flatlands feature expansion.
import fs from 'fs';
import { buildCore } from './core.mjs';

const html=fs.readFileSync(new URL('../3dsandbox.html',import.meta.url),'utf8');
let pass=0,fail=0;
function ok(value,name){
  if(value){pass++;console.log('  PASS',name);}
  else{fail++;console.log('  FAIL',name);}
}

const C=buildCore();
const newAssets=['shrub','flowerbed','fence','sign','crate','barrel','planter'];
newAssets.forEach((id,i)=>ok(C.DEFS[id]&&typeof C.DEFS[id].build==='function',`catalog defines ${id}`));
newAssets.forEach((id,i)=>ok(!!C.place(id,5+i,5),`${id} places on an empty tile`));

ok(Math.abs(C.trainYawFor({x:1,z:0})-Math.PI)<1e-9,'train faces forward on eastbound rail');
ok(Math.abs(C.trainYawFor({x:0,z:1})-Math.PI/2)<1e-9,'train faces forward on southbound rail');

ok(html.includes('id="worldClock"')&&html.includes('id="clockTime"'),'HUD clock markup is shipped');
ok(html.includes('function updateWorldLighting')&&html.includes('worldTime.auto'),'day-night state and lighting integration are shipped');
ok(html.includes('id="timeRange"')&&html.includes('id="timeSpeed"'),'time controls are shipped');
ok(html.includes('prefs.zoomReverse')&&html.includes('wheel-up'),'wheel direction preference is scoped to canvas zoom');

console.log(`FEATURE SUMMARY: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
