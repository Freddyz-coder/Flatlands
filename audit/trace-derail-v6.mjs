import { buildCore } from './core.mjs';

const T = await buildCore();
for (let x = 5; x <= 60; x++) T.place('railway', x, 10);
const t = T.place('train', 55, 10);
for (let i = 0; i < 50; i++) T.updateTrain(t, 0.05, i / 20);

// gap x=40..48 removed (west of train at 59..51)
for (let x = 40; x <= 48; x++) { const r = T.groundMap.get(T.key(x, 10)); if (r) T.removeRec(r); }

let positions = [];
for (let i = 0; i < 1600; i++) {
  T.updateTrain(t, 0.05, i / 20);
  positions.push(t.pos.x);
}
// west-most direction the train traveled
const minPos = Math.min(...positions).toFixed(2);
const tileAtMin = T.w2t(Math.min(...positions));
console.log('min x reached:', minPos, 'tile', tileAtMin);
console.log('tile 49 centre world:', T.t2w(49), '(gap starts at tile 48 → world', T.t2w(48) + 1, ')');
console.log('paused:', t.paused);
