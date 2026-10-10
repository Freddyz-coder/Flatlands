import { buildCore } from './core.mjs';

const T = await buildCore();
for (let x = 5; x <= 60; x++) T.place('railway', x, 10);
const t = T.place('train', 30, 10); // middle of the run

// give it speed
for (let i = 0; i < 70; i++) T.updateTrain(t, 0.05, i / 20);
console.log('pre-delete: pos', t.pos.x.toFixed(2), 'tile', T.w2t(t.pos.x), 'wp tile', t.wp, 'at:', t.at);

// now delete tiles AHEAD OF and INCLUDING the train's target tile (15..38)
for (let x = 15; x <= 38; x++) {
  const r = T.groundMap.get(T.key(x, 10));
  if (r) T.removeRec(r);
}
console.log('deleted x=15..38; train tile now:', T.w2t(t.pos.x), 'wp:', t.wp);

let worst = 0, gapEnter = false;
for (let i = 0; i < 1200; i++) {
  T.updateTrain(t, 0.05, i / 20);
  worst = Math.max(worst, Math.abs(t.pos.z - T.t2w(10)));
  // gap covers tile x 15..38 => world x from t2w(15)-1 to t2w(38)+1
  if (t.pos.x > T.t2w(14) + 0.5 && t.pos.x < T.t2w(39) - 0.5) gapEnter = true;
}
console.log('max |z-rail| =', worst.toFixed(3));
console.log('entered deleted gap:', gapEnter);
console.log('final pos:', t.pos.x.toFixed(2), 'paused:', t.paused, 'tile', T.w2t(t.pos.x));
console.log('expected: paused at tile 14/15 edge, never entered gap');
