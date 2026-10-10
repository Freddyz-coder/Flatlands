import { buildCore } from './core.mjs';

const T = await buildCore();
for (let x = 5; x <= 60; x++) T.place('railway', x, 10);
const t = T.place('train', 55, 10); // near the east end; DIRS[0] = {1,0}, so travel is +x first
// after the +x edge there is nothing (x=56 missing) -> it should reverse and go west.
for (let i = 0; i < 50; i++) T.updateTrain(t, 0.05, i / 20);
console.log('after 2.5s: pos', t.pos.x.toFixed(2), 'tile', T.w2t(t.pos.x), 'dirx', t.dirx, 'at', t.at);

// Delete a gap ahead (x=40..48) — west. It will reverse-shuttle into it unless nextWaypoint handles it.
for (let x = 40; x <= 48; x++) {
  const r = T.groundMap.get(T.key(x, 10));
  if (r) T.removeRec(r);
}

let entered = false, maxDz = 0;
for (let i = 0; i < 1600; i++) {
  T.updateTrain(t, 0.05, i / 20);
  maxDz = Math.max(maxDz, Math.abs(t.pos.z - T.t2w(10)));
  if (t.pos.x < T.t2w(40) + 0.5) entered = true; // west of tile-40 centre = inside gap
}
console.log('entered gap:', entered, 'maxDz:', maxDz.toFixed(3));
console.log('final pos', t.pos.x.toFixed(2), 'tile', T.w2t(t.pos.x), 'paused', t.paused);
