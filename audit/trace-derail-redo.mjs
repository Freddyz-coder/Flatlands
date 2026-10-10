import { buildCore } from './core.mjs';

const T = await buildCore();
for (let x = 5; x <= 60; x++) T.place('railway', x, 10);
const t = T.place('train', 5, 10);
for (let i = 0; i < 30; i++) T.updateTrain(t, 0.05, i / 20); // still near tile 5-6
console.log('train near tile', T.w2t(t.pos.x), 'pos', t.pos.x.toFixed(2));

// delete a WIDE gap AHEAD (x=10..30) so the moving train must either stop at the edge
// of the gap or tunnel through the deleted zone
for (let x = 10; x <= 30; x++) {
  const r = T.groundMap.get(T.key(x, 10));
  if (r) T.removeRec(r);
}

let worst = 0, minAtGap = Infinity;
for (let i = 0; i < 1200; i++) {
  T.updateTrain(t, 0.05, i / 20);
  worst = Math.max(worst, Math.abs(t.pos.z - T.t2w(10)));
  // did it actually cross into the gap? (gap spans world x of tile 10..30)
  const gapStart = T.t2w(10) - 1, gapEnd = T.t2w(30) + 1;
  if (t.pos.x > gapStart + 0.5 && t.pos.x < gapEnd - 0.5) minAtGap = Math.min(minAtGap, t.pos.x);
}
console.log('max |z-rail| =', worst.toFixed(3));
console.log('train deepest x inside deleted gap:', (minAtGap === Infinity ? 'never entered' : minAtGap.toFixed(2)));
console.log('final tile:', T.w2t(t.pos.x), T.w2t(t.pos.z), 'paused:', t.paused, 'pos:', t.pos.x.toFixed(2));
console.log('gap start tile x=10 center world =', T.t2w(10));
