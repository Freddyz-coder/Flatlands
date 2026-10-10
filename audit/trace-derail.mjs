import { buildCore } from './core.mjs';

const T = await buildCore();
// build a long straight track x=5..60 at z=10
for (let x = 5; x <= 60; x++) T.place('railway', x, 10);
const t = T.place('train', 5, 10);
// let it get moving
for (let i = 0; i < 60; i++) T.updateTrain(t, 0.05, i / 20);
console.log('train at', t.pos.x.toFixed(2), t.pos.z.toFixed(2), 'tile', T.w2t(t.pos.x));

// delete the rail tiles behind & ahead of its tile with the train mid-span:
// simulate user sweeping away everything from x=8..15
for (let x = 8; x <= 15; x++) {
  const r = T.groundMap.get(T.key(x, 10));
  if (r) T.removeRec(r);
}
console.log('deleted rails x=8..15 while train is mid-span');

// step the train
let seenPos = [];
for (let i = 0; i < 600; i++) {
  T.updateTrain(t, 0.05, i / 20);
  seenPos.push([t.pos.x, t.pos.z]);
}
// Was the train ever outside the track corridor (|z - z10| > 0.6) or off map?
let derail = false, worst = 0;
for (const [x, z] of seenPos) {
  const dz = Math.abs(z - T.t2w(10));
  worst = Math.max(worst, dz);
  if (dz > 0.6 || !isFinite(x) || !isFinite(z)) derail = true;
}
console.log('max |z - rail z| =', worst.toFixed(3));
console.log('final tile:', T.w2t(t.pos.x), T.w2t(t.pos.z), 'paused:', t.paused);
console.log(derail ? 'FAIL: train left the track corridor' : 'PASS: stayed on corridor (paused correctly?)');
