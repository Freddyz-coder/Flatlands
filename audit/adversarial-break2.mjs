// FLATLANDS adversarial break-test part 2: placement/duplication, history, growth.
import { buildCore } from './core.mjs';
let pass = 0, fail = 0;
const bad = [];
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log('  PASS', name, detail); }
  else { fail++; console.error('  FAIL', name, detail); bad.push(name); }
}
console.log('== E. placement churn near cap ==');
{
  const C = buildCore();
  outer: for (let x = 0; x < C.GRID; x++) for (let z = 0; z < C.GRID; z++) {
    if (C.objects.length >= C.MAXO - 5) break outer;
    if (!C.groundMap.has(C.key(x, z))) C.place('grass', x, z);
  }
  ok(C.objects.length === C.MAXO - 5, 'prefilled to MAXO-5', String(C.objects.length));
  const freeSpot = (() => {
    for (let x = 0; x < C.GRID; x++) for (let z = 0; z < C.GRID; z++)
      if (!C.groundMap.has(C.key(x, z)) && !C.objMap.has(C.key(x, z))) return [x, z];
    return null;
  })();
  ok(!!freeSpot, 'free tile exists below cap');
  const r1 = C.place('tree', freeSpot[0], freeSpot[1]);
  ok(!!r1, 'placement below cap succeeds');
  ok(C.place('tree', NaN, 5) === null, 'NaN tile rejected');
  ok(C.place('tree', 80, 80) === null, 'out-of-grid rejected');
  ok(C.place('cottage', freeSpot[0], freeSpot[1]) === null, 'overlap rejected');
  ok(C.place('train', freeSpot[0], freeSpot[1]) === null, 'train on non-rail rejected');
  const rec = r1;
  rec.rot = Math.PI / 2; rec.group.rotation.y = rec.rot;
  rec.scale = 1.9; rec.group.scale.setScalar(1.9);
  C.pushCmd({ t: 'tr', rec, b: { rot: 0, scale: 1 }, a: { rot: rec.rot, scale: rec.scale }, ts: 0 });
  C.undo();
  ok(rec.rot === 0 && rec.scale === 1, 'undo transform restores exactly');
  C.redo();
  ok(Math.abs(rec.rot - Math.PI / 2) < 1e-9 && rec.scale === 1.9, 'redo reapplies');
  const before = C.objects.length;
  ok(C.place('grass', -1, -1) === null && C.objects.length === before, 'invalid placement leaves registry');
  ok(C.objects.length <= C.MAXO, 'cap never exceeded', String(C.objects.length));
  const tmp = C.objects[0];
  C.removeRec(tmp); C.restoreRec(tmp);
  ok(C.objects.length <= C.MAXO, 'restoreRec respects cap');
}
console.log('== F. reset analogue + branch truncation ==');
{
  const C = buildCore();
  C.place('railway', 10, 10); C.place('railway', 11, 10);
  const tr = C.place('train', 10, 10);
  for (let i = 0; i < 120; i++) C.updateTrain(tr, 0.05, i / 20);
  [...C.objects].forEach(r => C.removeRec(r));
  C.history.length = 0;
  ok(C.objects.length === 0 && C.entities.length === 0, 'reset clears registries');
  ok(C.groundMap.size === 0 && C.objMap.size === 0, 'reset clears maps');
  let threw = false;
  try { C.updateTrain(tr, 0.016, 999); } catch (e) { threw = true; }
  ok(!threw, 'updateTrain on removed train does not throw');
  const a = C.place('tree', 5, 5); C.pushCmd({ t: 'multi', recs: [a] });
  const b = C.place('tree', 6, 5); C.pushCmd({ t: 'multi', recs: [b] });
  C.undo();
  const c = C.place('tree', 7, 5); C.pushCmd({ t: 'multi', recs: [c] });
  C.redo();
  ok(!C.objects.includes(b) && C.objects.includes(c), 'redo branch truncated after new edit');
}
console.log('== G. resource growth ==');
{
  const C = buildCore();
  const meshes = () => { let n = 0; C.scene.traverse(o => { if (o.isMesh) n++; }); return n; };
  const m0 = meshes();
  for (let i = 0; i < 200; i++) {
    const g = C.place('railway', 10 + (i % 20), 60 + ((i / 20) | 0));
    const h = C.place('railway', 11 + (i % 20), 60 + ((i / 20) | 0));
    if (h) C.removeRec(h);
    if (g) C.removeRec(g);
  }
  for (let i = 0; i < 300; i++) { C.updatePuffs(0.05); C.updateTweens(0.05); }
  ok(C.objects.length === 0, 'no leaked records after rail churn', String(C.objects.length));
  ok(C.groundMap.size === 0, 'no leaked ground entries', String(C.groundMap.size));
  ok(meshes() <= m0, 'no leaked scene meshes', `${m0} -> ${meshes()}`);
  for (let i = 0; i < 500; i++) C.spawnPuff(0, 1, 0, {});
  let sprites = 0;
  C.scene.traverse(o => { if (o.isSprite) sprites++; });
  ok(sprites <= 140, 'puff cap holds', String(sprites));
}
console.log(`\nPART2: ${pass} passed, ${fail} failed`);
if (bad.length) console.log('FAILURES:\n - ' + bad.join('\n - '));
process.exit(fail ? 1 : 0);
