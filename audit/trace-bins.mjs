import { buildCore } from './core.mjs';

const T = await buildCore();
T.place('pathway', 25, 25);
const bin = T.place('trashbin', 25, 24);
const h = T.place('human', 25, 25);  // tile coords — place() converts to world
console.log('bin pos', bin.group.position.x, bin.group.position.z);
console.log('human pos', h.pos, 'binCd', h.binCd);

let closest = Infinity, modes = {};
for (let i = 0; i < 1800; i++) {
  T.updateWander(h, 0.016, i / 60);
  if (h.binCd > 0) { console.log('binTick at i=' + i, 'dist2='); break; }
  const d2 = (bin.group.position.x - h.pos.x) ** 2 + (bin.group.position.z - h.pos.z) ** 2;
  closest = Math.min(closest, d2);
  modes[h.ai.mode] = (modes[h.ai.mode] || 0) + 1;
}
console.log('closest approach d2:', closest?.toFixed(3), 'need < 1.3');
console.log('modes:', modes);
