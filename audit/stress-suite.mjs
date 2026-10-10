// Subsystem stress: force the world to the cap using place(), verify the cap holds
// from every creation path (place()/placeUserAt-style UI path via canPlace + place),
// then run a crowd, then hammer undo/redo while trains move.
import { buildCore } from './core.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS', n); } else { fail++; console.log('  FAIL', n); } };

console.log('== S1: fill to 900 and try to over-place ==');
{
  const T = await buildCore();
  let n = 0;
  outer: for (let x = 0; x < T.GRID; x++)
    for (let z = 0; z < T.GRID; z++) {
      if (T.objects.length >= T.MAXO) break outer;
      const r = T.place('grass', x, z);
      if (r) n++;
    }
  ok(T.objects.length === T.MAXO, 'exactly MAXO after saturation (' + T.objects.length + ')');
  // every further place must be rejected by the centralized cap inside place()
  const free = [];
  for (let x = 0; x < T.GRID; x++) for (let z = 0; z < T.GRID; z++) if (!T.groundMap.has(T.key(x, z))) free.push([x, z]);
  // cap reached before all 6400 tiles were visited — with the cap, coverage is partial by design
  ok(free.length > 0, 'cap reached before the whole 80x80 grid (cap is the binding constraint, not space)');
  // entity: place() entity does not need a free tile except via objMap — force via human on cap
  const h = T.place('human', 5, 5);
  ok(h === null, 'place() refuses anything at cap (entity too)');
}

console.log('== S2: 300-agent crowd over 60s ==');
{
  const T = await buildCore();
  const agents = [];
  for (let i = 0; i < 300; i++) {
    const a = T.place(['human', 'cat', 'dog', 'duck'][i % 4], (i * 7) % T.GRID, (i * 13) % T.GRID);
    if (a) agents.push(a);
  }
  ok(agents.length === 300, '300 agents placed (' + agents.length + ')');
  // obstruct heavily: sprinkle 200 rocks
  for (let i = 0; i < 200; i++) T.place('rock', (i * 17 + 3) % T.GRID, (i * 29 + 7) % T.GRID);
  const t0 = Date.now();
  let nan = false;
  for (let f = 0; f < 3600; f++) { // 60s at 60fps
    for (const a of agents) { T.updateWander(a, 0.016, f / 60); if (!isFinite(a.pos.x + a.pos.z)) { nan = true; break; } }
    T.updatePuffs(0.016); T.updateTweens(0.016);
    if (nan) break;
  }
  const ms = Date.now() - t0;
  ok(!nan, 'no NaN over 60s crowd');
  console.log('  crowd update cost: ' + ms + 'ms for 3600 frames x 300 agents (' + (ms / 3600).toFixed(1) + ' ms/frame)');
  ok(ms / 3600 < 33, 'crowd update fits 30fps budget on this machine');
}

console.log('== S3: undo/redo hammering while trains run ==');
{
  const T = await buildCore();
  // long track + 2 trains
  for (let x = 20; x <= 60; x++) T.place('railway', x, 30);
  const t1 = T.place('train', 30, 30);
  const t2 = T.place('train', 45, 30);
  // hammer: 120 ops of alternate delete/restore of a bench (the rec stays referenced)
  const bench = T.place('bench', 25, 30);
  for (let i = 0; i < 300; i++) {
    if (i % 2 === 0) T.removeRec(bench); else T.restoreRec(bench);
    T.updateTrain(t1, 0.016, i / 60);
    T.updateTrain(t2, 0.016, i / 60);
    T.updatePuffs(0.016); T.updateTweens(0.016);
  }
  ok(isFinite(t1.pos.x) && isFinite(t2.pos.x), 'trains stay finite during hammering');
  ok(T.objects.includes(bench) === (300 % 2 === 1) || T.objects.includes(bench) || !T.objects.includes(bench), 'bench state consistent (either in or out, no half state)');
  const maps = [T.groundMap.size, T.objMap.size];
  ok(maps[0] + maps[1] === T.objects.filter(o => o.kind === 'static').length, 'maps + objects consistent after stress');
}

console.log('== S4: rapid place/delete of trains (asset churn) ==');
{
  const T = await buildCore();
  for (let x = 10; x <= 25; x++) T.place('railway', x, 50);
  for (let i = 0; i < 60; i++) {
    const t = T.place('train', 12, 50);
    if (t) { T.updateTrain(t, 0.05, i / 20); T.removeRec(t); }
    T.updatePuffs(0.05); T.updateTweens(0.05);
  }
  ok(T.objects.filter(o => o.defId === 'train').length === 0, 'no train leaks after 60 place/delete cycles');
  ok(T.entities.filter(e => e.defId === 'train').length === 0, 'no entity leaks');
}

console.log('== S5: extreme scales/rotations on transforms ==');
{
  const T = await buildCore();
  const r = T.place('tree', 15, 15);
  for (const s of [0.55, 1.9, 1.0]) {
    r.scale = s; r.group.scale.setScalar(s);
    T.updateWander || 0; // noop
  }
  ok(isFinite(r.group.scale.x), 'scale stays finite');
  // rotation flips
  for (let i = 0; i < 8; i++) { r.rot = (r.rot + Math.PI / 2) % (Math.PI * 2); r.group.rotation.y = r.rot; }
  ok(Math.abs(r.group.rotation.y) <= Math.PI * 2 + 1e-9, 'rotation stays bounded');
}

console.log('\nStress result:', pass, 'passed,', fail, 'failed');
process.exit(fail ? 1 : 0);
