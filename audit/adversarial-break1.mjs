// FLATLANDS adversarial break-test part 1: weather×time, trains, NPCs.
import { buildCore } from './core.mjs';
let pass = 0, fail = 0;
const bad = [];
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log('  PASS', name, detail); }
  else { fail++; console.error('  FAIL', name, detail); bad.push(name); }
}
console.log('== A. weather x time rapid switching ==');
{
  const C = buildCore();
  const seq = ['rain', 'fog', 'cloudy', 'clear', 'rain', 'clear', 'fog', 'rain'];
  const times = [5.9, 6.1, 12, 17.6, 18.9, 0, 23.5, 8];
  let threw = false;
  try {
    for (let i = 0; i < seq.length; i++) {
      C.worldTime.hours = times[i];
      C.setWeather(seq[i]);
      C.updateWorldLighting(true);
      C.worldTime.auto = false; C.updateWorldLighting();
      C.worldTime.auto = true; C.updateWorldLighting();
    }
    const before = C.weather.type;
    C.setWeather('hurricane');
    ok(C.weather.type === before, 'invalid weather rejected', before);
    ok(!C.scene.fog || C.scene.fog.near < C.scene.fog.far, 'fog near<far after chaos',
      C.scene.fog ? `${C.scene.fog.near}/${C.scene.fog.far}` : 'harness-skipped');
  } catch (e) { threw = true; console.error('  THREW', e); }
  ok(!threw, 'no exception during weather x time chaos');
}
console.log('== B. trains + track sabotage while running ==');
{
  const C = buildCore();
  for (let x = 20; x <= 40; x++) C.place('railway', x, 30);
  C.place('railway', 40, 31); C.place('railway', 40, 32);
  const t = C.place('train', 22, 30);
  ok(!!t, 'train placed on line');
  ok(t.cars && t.cars.length === 2, 'train has 2 wagons');
  let threw = false, nan = false;
  try {
    for (let i = 0; i < 600; i++) {
      C.updateTrain(t, 0.016, i / 60);
      if (!Number.isFinite(t.pos.x + t.pos.z)) { nan = true; break; }
      if (i === 150) { const v = C.groundMap.get(C.key(30, 30)); if (v) C.removeRec(v); }
      if (i === 200) { if (!C.groundMap.has(C.key(30, 30))) C.place('railway', 30, 30); }
      if (i === 300) { const v2 = C.groundMap.get(C.key(25, 30)); if (v2) { C.removeRec(v2); C.restoreRec(v2); } }
    }
  } catch (e) { threw = true; console.error('  THREW', e && e.stack || e); }
  ok(!threw, 'no exception during track sabotage');
  ok(!nan, 'train stays finite after removal/restore');
  const d0 = Math.hypot(t.cars[0].position.x - t.pos.x, t.cars[0].position.z - t.pos.z);
  const d1 = Math.hypot(t.cars[1].position.x - t.pos.x, t.cars[1].position.z - t.pos.z);
  ok(d0 > 0.5 && d0 < 12 && d1 > d0 && d1 < 16, 'wagon spacing sane', `${d0.toFixed(2)}/${d1.toFixed(2)}`);
}
console.log('== C. NPC target removal mid-approach ==');
{
  const C = buildCore();
  C.setWeather('rain');
  const shelter = C.place('station', 30, 30);
  const fountain = C.place('fountain', 32, 30);
  const h = C.place('human', 25, 30);
  C.place('dog', 26, 31); C.place('duck', 27, 30);
  C.pickTargetW(h);
  C.removeRec(shelter); C.removeRec(fountain);
  const humans = C.entities.filter(e => e.defId === 'human');
  if (humans.length) C.removeRec(humans[0]);
  let threw = false, badCoord = false;
  try {
    for (let i = 0; i < 1200; i++) {
      for (const e of [...C.entities]) {
        if (e.defId === 'train') continue;
        C.updateWander(e, 0.016, i / 60);
        if (!Number.isFinite(e.pos.x + e.pos.z)) badCoord = true;
        if (Math.abs(e.pos.x) > C.HB + 1e-6 || Math.abs(e.pos.z) > C.HB + 1e-6) badCoord = true;
      }
      if (i === 600) C.pickTargetW(h);
    }
  } catch (e) { threw = true; console.error('  THREW', e && e.stack || e); }
  ok(!threw, 'no exception after NPC targets deleted');
  ok(!badCoord, 'NPC coords finite and clamped');
}
console.log('== D. NPC boundary + crowd cost ==');
{
  const C = buildCore();
  const agents = [];
  for (let i = 0; i < 60; i++) {
    const a = C.place(['human', 'dog', 'duck', 'cat'][i % 4], (i * 3) % C.GRID, (i * 5 + 1) % C.GRID);
    if (a) agents.push(a);
  }
  agents.slice(0, 8).forEach((a, i) => { a.pos.x = (i % 2 ? C.HB : -C.HB); a.pos.z = C.HB; });
  let threw = false, escaped = 0;
  const t0 = Date.now();
  try {
    for (let f = 0; f < 600; f++) for (const a of agents) {
      C.updateWander(a, 0.016, f / 60);
      if (Math.abs(a.pos.x) > C.HB + 1e-9 || Math.abs(a.pos.z) > C.HB + 1e-9) escaped++;
    }
  } catch (e) { threw = true; console.error('  THREW', e); }
  ok(!threw, 'no exception at boundary');
  ok(escaped === 0, 'boundary clamp holds', `escapes=${escaped}`);
  console.log(`  cost: ${Date.now() - t0}ms for 600 frames x ${agents.length} agents`);
}
console.log(`\nPART1: ${pass} passed, ${fail} failed`);
if (bad.length) console.log('FAILURES:\n - ' + bad.join('\n - '));
process.exit(fail ? 1 : 0);
