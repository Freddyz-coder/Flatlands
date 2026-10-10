// Master audit test suite — runs the ACTUAL game logic extracted from the shipped HTML.
import { buildCore } from './core.mjs';

const results = [];
let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS', name, detail || ''); }
  else { fail++; console.log('  FAIL', name, detail || ''); results.push(name); }
}
function eq(a, b, name) { ok(a === b, name, `expected ${b}, got ${a}`); }

// ------------------------------------------------------------------ bootstrap
const C = buildCore();
const { place, removeRec, restoreRec, canPlace, groundMap, objMap, objects, entities, key, t2w, w2t } = C;

console.log('== 1. placement guard matrix (canPlace) ==');
{
  const d = C.DEFS;
  // ground layer
  ok(canPlace(d.railway, 40, 40), 'rail on empty tile'); 
  ok(canPlace(d.railway, 0, 0), 'rail at corner (0,0)');
  ok(!canPlace(d.railway, C.GRID, 40), 'rail outside grid rejected (tx=GRID)');
  ok(!canPlace(d.railway, 40, -1), 'rail outside grid rejected (tz=-1)');
  ok(!canPlace(d.railway, -5, 40), 'rail negative tile rejected');
  const r = place('railway', 40, 40);
  ok(!canPlace(d.railway, 40, 40), 'rail rejected where rail already exists');
  ok(!canPlace(d.cottage, 40, 40), 'cottage on rail tile rejected');
  ok(canPlace(d.tunnel, 40, 40), 'tunnel allowed on rail tile (onRail)');
  // obj layer
  ok(canPlace(d.house || d.cottage, 40, 41), 'house on empty tile ok');
  const h = place('cottage', 40, 41);
  ok(!canPlace(d.tree, 40, 41), 'tree overlaps house rejected');
  ok(!canPlace(d.trashbin, 40, 41), 'trashbin overlaps house rejected');
  // life layer = obj layer occupancy
  ok(!canPlace(d.human, 40, 41), 'human cannot be placed where a static object exists');
  // train needs rail
  ok(!canPlace(d.train, 40, 45), 'train on bare ground rejected');
  // API-level guard: callers outside the UI cannot bypass train placement rules.
  const offRailBefore = C.objects.length;
  const bad = C.place('train', 10, 12); // bare ground
  ok(bad === null, 'place() rejects a train on bare ground');
  eq(C.entities.filter(e => e.defId === 'train').length, 0, 'off-rail train does not register an entity');
  eq(C.objects.length, offRailBefore, 'off-rail train leaves the object registry unchanged');
  ok(!!C.place('train', 40, 40), 'train placed on a rail succeeds');
  const beforeInvalid = C.objects.length;
  ok(C.place('tree', NaN, 10) === null, 'place() rejects NaN tile coordinates');
  ok(C.place('tree', Infinity, 10) === null, 'place() rejects infinite tile coordinates');
  ok(C.place('tree', 10.5, 10) === null, 'place() rejects fractional tile coordinates');
  ok(C.place('tree', 10, 10, Infinity) === null, 'place() rejects non-finite rotation');
  eq(C.objects.length, beforeInvalid, 'invalid placement inputs leave the registry unchanged');
}
console.log('== 2. object limit ==');
{
  // overflow the world with grass patches (safe, single-tile, cheap)
  let placed = 0;
  for (let x = 0; x < C.GRID && placed < 2000; x++)
    for (let z = 0; z < C.GRID && placed < 2000; z++)
      if (!groundMap.has(key(x, z))) {
        const r = place('grass', x, z);
        if (r) placed++;
      }
  const overAttempts = (() => {
    let attempts = 0;
    for (let x = 0; x < C.GRID; x++) for (let z = 0; z < C.GRID; z++) {
      const k = key(x, z);
      if (!groundMap.has(k)) {
        place('grass', x, z);
        attempts++;
      }
    }
    return attempts;
  })();
  eq(objects.length, C.MAXO, 'object count exactly at MAXO after saturation');
  ok(overAttempts > 0, 'overflow attempts occurred beyond cap');
  ok(objects.length === C.MAXO, 'cap NOT exceeded after overflow attempts');
  // delete one grass, verify count drops, place again
  const first = objects.find(o => o.defId === 'grass');
  removeRec(first);
  eq(objects.length, C.MAXO - 1, 'count decremented after delete');
  let refilled = null;
  for (let x = 0; x < C.GRID && !refilled; x++)
    for (let z = 0; z < C.GRID && !refilled; z++)
      if (!groundMap.has(key(x, z))) refilled = place('grass', x, z);
  ok(!!refilled, 'can place again after a deletion frees a slot');
  eq(objects.length, C.MAXO, 'cap restored after refill');
}
console.log('== 3. rail graph recompute on delete/restore ==');
{
  // fresh core for a clean world
  const T = await buildCore();
  // L-shaped rail: straight pieces at y=0: (5,5)-(6,5),(6,6)-(6,7)
  T.place('railway', 5, 5); T.place('railway', 6, 5); T.place('railway', 6, 6); T.place('railway', 6, 7);
  eq(T.railConns(6, 5).length, 2, 'straight-corner rail is 2-connected before delete');
  const del = T.groundMap.get(T.key(6, 6));
  T.removeRec(del);
  eq(T.railConns(6, 5).filter(d => d.z !== 0).length, 0, 'railConns excludes removed neighbour');
  eq(T.railConns(6, 7).length, 0, 'cut endpoint (6,7) has NO rail neighbours after the cut');
  eq(T.railConns(6, 5).length, 1, 'remaining (6,5) keeps exactly its one live rail neighbour (5,5)');
  T.restoreRec(del);
  eq(T.railConns(6, 6).length, 2, 'railConns after restore re-links both neighbours');
}
console.log('== 4. train: direction, dead-end reversal, pause/resume, invalid tiles ==');
{
  const T = await buildCore();
  // single lone rail in the middle of nowhere
  const lone = T.place('railway', 10, 10);
  const loneTrain = T.place('train', 10, 10);
  // after reaching the centre waypoint, the train should become paused (nothing beyond edge)
  for (let i = 0; i < 300 && !loneTrain.paused; i++) T.updateTrain(loneTrain, 0.05, i / 20);
  ok(loneTrain.paused, 'train pauses without a valid next tile (dead-end track)');
  // build track beyond the dead-end; the paused train retries every ~0.7 s and should resume
  T.place('railway', 11, 10);
  let resumed = false;
  for (let i = 0; i < 60 && !resumed; i++) { T.updateTrain(loneTrain, 0.05, i / 20); if (!loneTrain.paused) resumed = true; }
  ok(resumed, 'train resumes once the track is rebuilt');
  // run for 20 simulated seconds;.assert no NaN, no off-map teleport
  let bad = false, offmap = false;
  for (let i = 0; i < 1200; i++) {
    T.updateTrain(loneTrain, 0.05, i / 20);
    if (!isFinite(loneTrain.pos.x) || !isFinite(loneTrain.pos.z)) bad = true;
    if (Math.abs(loneTrain.pos.x) > T.HALF + 4 || Math.abs(loneTrain.pos.z) > T.HALF + 4) offmap = true;
  }
  ok(!bad, 'no NaN train coords over 60s');
  ok(!offmap, 'train never leaves the map bounds');
  // dead-end reversal: track only extends to the west; the train should shuttle back
  const T2 = await buildCore();
  T2.place('railway', 20, 20); T2.place('railway', 21, 20); T2.place('railway', 22, 20);
  const tTrain = T2.place('train', 22, 20);
  T2.updateTrain(tTrain, 0.05, 0);
  ok(tTrain.dirx === -1 || tTrain.dirx === 1 || tTrain.dirx === 0, 'train initial step is finite');
  for (let i = 0; i < 4000; i++) T2.updateTrain(tTrain, 0.05, i / 20);
  ok(isFinite(tTrain.pos.x) && isFinite(tTrain.pos.z), 'shuttling train coords stay finite');
  ok(tTrain.pos.x > T2.t2w(19).valueOf() - 0.001, 'shuttle train x stays within extended track');
}
console.log('== 5. history (pushCmd/undo/redo) simulated ==');
{
  // the browser history lives in a non-exported section; simulate its semantics using place/remove/restore
  const T = await buildCore();
  const recs = [];
  // place 5 cottages, delete them all, then undo-delete them all (restore)
  for (let i = 0; i < 5; i++) recs.push(T.place('cottage', 30, 30 + i));
  eq(T.objects.length, 5, '5 objects placed');
  recs.forEach(r => T.removeRec(r));
  eq(T.objects.length, 0, 'all removed');
  [...recs].reverse().forEach(r => T.restoreRec(r));
  eq(T.objects.length, 5, 'all restored in reverse order (undo-delete)');
  eq(T.groundMap.size, T.objects.filter(o => o.def.layer === 'ground').length, 'groundMap synced to restored objects');
  eq(T.objMap.size, T.objects.filter(o => o.def.layer !== 'ground' && o.kind === 'static').length, 'objMap synced');
}
console.log('== 6. wanderers: blockage, boundary, certainty ==');
{
  const T = await buildCore();
  // pen a human into a sealed 1-tile box of cottages (center empty)
  const center = { x: 15, z: 15 };
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]])
    T.place('cottage', center.x + dx, center.z + dz);
  const h = T.place('human', center.x, center.z);
  let escapes = 0;
  for (let i = 0; i < 3600; i++) { // 60s simulated
    T.updateWander(h, 0.016, i / 60);
    const tx = T.w2t(h.pos.x), tz = T.w2t(h.pos.z);
    if (tx !== center.x || tz !== center.z) escapes++;
  }
  eq(escapes, 0, 'human cannot walk through solid objects (no clipping)');
  ok(isFinite(h.pos.x) && isFinite(h.pos.z), 'penned human coords stay finite (no NaN)');
  // entity removed mid-update must not break anything
  const T2 = await buildCore();
  const h2 = T2.place('human', 15, 15);
  for (let i = 0; i < 60; i++) T2.updateWander(h2, 0.016, i / 60);
  T2.removeRec(h2);
  T2.updateWander(h2, 0.016, 60); // defensive no-throw probe
  ok(!T2.objects.includes(h2) && !T2.entities.includes(h2), 'removed entity has no active registry references');
}
console.log('== 7. litter: fill bin at close range, bbox sanity ==');
{
  // Exercise the real bin interaction deterministically rather than treating a
  // random long-running simulation as a pass regardless of outcome.
  const T = await buildCore();
  T.place('pathway', 25, 25);
  T.place('trashbin', 25, 25);
  const h = T.place('human', 26, 25);
  h.pos = { x: T.t2w(25) + 0.5, z: T.t2w(25) };
  h.ai.mode = 'walk';
  T.binTick(h);
  ok(h.binCd > 0 && h.ai.mode === 'idle', 'nearby walking human uses the trash bin');
}
console.log('== 8. tunnel snapping to straight rails ==');
{
  const T = await buildCore();
  T.place('railway', 50, 10); T.place('railway', 51, 10); T.place('railway', 52, 10);
  const tun = T.place('tunnel', 51, 10);
  eq(tun.rot % Math.PI, 0, 'tunnel snapped to horizontal rail (rot 0 or PI)');
  const tun2 = T.place('tunnel', 53, 10);
  ok(tun2 !== null, 'second tunnel placed adjacent to straight rail');
}
console.log('== 9. rapid place/delete cycles (allocation sanity: 2000 cycles) ==');
{
  const T = await buildCore();
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 1000; i++) {
    const g = T.place('railway', i % C.GRID, 70 + (i / C.GRID | 0));
    T.removeRec(g);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log('  1000 place/remove rail cycles took', ms.toFixed(1), 'ms');
  ok(ms < 5000, 'place/remove cycle stays fast');
  eq(T.objects.length, 0, 'no leaked objects after 1000 cycles');
  eq(T.groundMap.size, 0, 'no leaked ground map entries');
  let puffs = 0;
  for (let i = 0; i < 400; i++) C.updatePuffs(0.02);
  const T2 = await buildCore();
  T2.place('railway', 10, 10); T2.place('railway', 11, 10);
  const t = T2.place('train', 10, 10);
  for (let i = 0; i < 2000; i++) T2.updateTrain(t, 0.05, i / 20);
  ok(isFinite(t.pos.x), 'train still finite after 100s + 400 puff updates');
}
console.log('== 10. same-tile human vs. static object dedupe ==');
{
  const T = await buildCore();
  T.place('bench', 60, 60);
  const h = T.place('human', 60, 60);
  ok(h === null, 'human placement on an occupied tile is rejected');
  eq(T.objects.length, 1, 'rejected life placement leaves the registry unchanged');
  eq(T.objMap.get(T.key(60, 60)).defId, 'bench', 'rejected life placement preserves the existing object map entry');
}

console.log('\n=================================================');
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (results.length) { console.log('FAILURES:'); results.forEach(r => console.log(' -', r)); process.exit(1); }
